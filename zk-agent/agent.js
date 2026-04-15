'use strict';

require('dotenv').config();

const path = require('path');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const ZKLib = require('node-zklib');

const MACHINE_IP = process.env.MACHINE_IP || '10.1.1.119';
const MACHINE_PORT = Number(process.env.MACHINE_PORT || 4370);
const MACHINE_TIMEOUT = Number(process.env.MACHINE_TIMEOUT_MS || 10000);
const MACHINE_INPORT_TIMEOUT = Number(process.env.MACHINE_INPORT_TIMEOUT_MS || 4000);
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 2000);
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 5000);
const CLOUD_API_URL =
  process.env.CLOUD_API_URL || 'http://63.250.53.83/api/v1/hardware/scan';
const CLOUD_API_KEY = process.env.CLOUD_API_KEY || '';
const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'agent-buffer.sqlite');

const db = new sqlite3.Database(DB_FILE);
let zk = null;
let isPolling = false;
let isSyncing = false;
let lastSeenTs = 0;

function logInfo(...args) {
  console.log(new Date().toISOString(), '[INFO]', ...args);
}

function logWarn(...args) {
  console.warn(new Date().toISOString(), '[WARN]', ...args);
}

function logError(...args) {
  console.error(new Date().toISOString(), '[ERROR]', ...args);
}

function run(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function onRun(err) {
      if (err) return reject(err);
      return resolve(this);
    });
  });
}

function all(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      return resolve(rows);
    });
  });
}

function normalizeDate(value) {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString();
}

function extractEnrollNumber(row) {
  return (
    row?.deviceUserId ??
    row?.uid ??
    row?.userId ??
    row?.userSN ??
    row?.id ??
    row?.enrollNumber ??
    row?.user_id ??
    ''
  )
    .toString()
    .trim();
}

function extractTimestamp(row) {
  const candidates = [row?.recordTime, row?.timestamp, row?.time, row?.date];
  for (const candidate of candidates) {
    const normalized = normalizeDate(candidate);
    if (normalized) return normalized;
  }
  return null;
}

function fingerprint(row) {
  const enrollNumber = extractEnrollNumber(row);
  const timestamp = extractTimestamp(row);
  if (!enrollNumber || !timestamp) return null;
  return {
    enrollNumber,
    timestamp,
    uid: `${enrollNumber}|${timestamp}`,
    raw: JSON.stringify(row),
  };
}

async function initDb() {
  await run(`
    CREATE TABLE IF NOT EXISTS local_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      enroll_number TEXT NOT NULL,
      timestamp TEXT NOT NULL,
      is_synced INTEGER NOT NULL DEFAULT 0,
      payload TEXT NOT NULL,
      machine_ip TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      synced_at TEXT,
      UNIQUE (enroll_number, timestamp, machine_ip)
    )
  `);

  const latestRows = await all(
    `
      SELECT timestamp
      FROM local_logs
      ORDER BY timestamp DESC
      LIMIT 1
    `
  );
  if (latestRows.length > 0) {
    const latest = new Date(latestRows[0].timestamp).getTime();
    if (!Number.isNaN(latest)) {
      lastSeenTs = latest;
    }
  }
  logInfo('SQLite initialized at', DB_FILE);
}

async function connectMachine() {
  if (zk) return zk;
  zk = new ZKLib(MACHINE_IP, MACHINE_PORT, MACHINE_TIMEOUT, MACHINE_INPORT_TIMEOUT);
  await zk.createSocket();
  logInfo(`Connected to ZKTeco ${MACHINE_IP}:${MACHINE_PORT}`);
  return zk;
}

async function disconnectMachine() {
  if (!zk) return;
  try {
    await zk.disconnect();
  } catch (error) {
    logWarn('Disconnect warning:', error.message);
  }
  zk = null;
}

async function pushToCloud(enrollNumber, timestamp, rawPayload) {
  const headers = { 'Content-Type': 'application/json' };
  if (CLOUD_API_KEY) {
    headers.authorization = `Bearer ${CLOUD_API_KEY}`;
  }

  const payload = {
    student_id: enrollNumber,
    scanned_at: timestamp,
    source: 'zk-agent',
    machine_ip: MACHINE_IP,
    raw: rawPayload,
  };

  await axios.post(CLOUD_API_URL, payload, {
    timeout: 10000,
    headers,
  });
}

async function saveLogLocally(item) {
  await run(
    `
      INSERT OR IGNORE INTO local_logs (
        enroll_number,
        timestamp,
        is_synced,
        payload,
        machine_ip
      ) VALUES (?, ?, 0, ?, ?)
    `,
    [item.enrollNumber, item.timestamp, item.raw, MACHINE_IP]
  );
}

async function markSynced(id) {
  await run(
    `
      UPDATE local_logs
      SET is_synced = 1,
          synced_at = datetime('now')
      WHERE id = ?
    `,
    [id]
  );
}

async function syncUnsyncedLogs() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const pending = await all(
      `
        SELECT id, enroll_number, timestamp, payload
        FROM local_logs
        WHERE is_synced = 0
        ORDER BY timestamp ASC
        LIMIT 100
      `
    );

    for (const row of pending) {
      try {
        await pushToCloud(row.enroll_number, row.timestamp, row.payload);
        await markSynced(row.id);
        logInfo(`Synced log #${row.id} (${row.enroll_number} @ ${row.timestamp})`);
      } catch (error) {
        logWarn(
          `Cloud sync failed for #${row.id}:`,
          error?.response?.status || error.message
        );
      }
    }
  } finally {
    isSyncing = false;
  }
}

async function pollDevice() {
  if (isPolling) return;
  isPolling = true;
  try {
    const machine = await connectMachine();
    const attendances = await machine.getAttendances();
    const rows = Array.isArray(attendances?.data)
      ? attendances.data
      : Array.isArray(attendances)
      ? attendances
      : [];

    for (const row of rows) {
      const item = fingerprint(row);
      if (!item) continue;
      const ts = new Date(item.timestamp).getTime();
      if (Number.isNaN(ts) || ts <= lastSeenTs) continue;

      await saveLogLocally(item);
      logInfo(`Captured log ${item.enrollNumber} @ ${item.timestamp}`);
      lastSeenTs = Math.max(lastSeenTs, ts);

      try {
        await pushToCloud(item.enrollNumber, item.timestamp, item.raw);
        await run(
          `
            UPDATE local_logs
            SET is_synced = 1,
                synced_at = datetime('now')
            WHERE enroll_number = ?
              AND timestamp = ?
              AND machine_ip = ?
          `,
          [item.enrollNumber, item.timestamp, MACHINE_IP]
        );
        logInfo(`Immediate sync OK for ${item.enrollNumber} @ ${item.timestamp}`);
      } catch (error) {
        logWarn(
          `Immediate sync failed for ${item.enrollNumber}:`,
          error?.response?.status || error.message
        );
      }
    }
  } catch (error) {
    logWarn('Machine polling failed, reconnecting...', error.message);
    await disconnectMachine();
  } finally {
    isPolling = false;
  }
}

async function start() {
  await initDb();
  await pollDevice();
  await syncUnsyncedLogs();

  setInterval(() => {
    pollDevice().catch((error) => logError('Polling loop error', error.message));
  }, POLL_INTERVAL_MS);

  setInterval(() => {
    syncUnsyncedLogs().catch((error) => logError('Sync loop error', error.message));
  }, SYNC_INTERVAL_MS);

  logInfo('Agent started.');
}

async function shutdown(signal) {
  logInfo(`Received ${signal}. Shutting down...`);
  try {
    await disconnectMachine();
  } finally {
    db.close(() => {
      logInfo('SQLite closed. Bye.');
      process.exit(0);
    });
  }
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

start().catch((error) => {
  logError('Fatal startup error:', error);
  process.exit(1);
});
