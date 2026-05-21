// @ts-nocheck
'use strict';

/**
 * ZK Agent - Dung PowerShell + SDK Windows de doc du lieu tu may cham cong
 * Va gui truc tiep len Supabase
 */

require('dotenv').config();

const path = require('path');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const { spawn } = require('child_process');
const fs = require('fs').promises;

// Config
const MACHINE_IP = process.env.MACHINE_IP || '192.168.0.225';
const MACHINE_PORT = Number(process.env.MACHINE_PORT || 4370);

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'attendance_spam_logs';

const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 5000);
const SYNC_INTERVAL_MS = Number(process.env.SYNC_INTERVAL_MS || 10000);
const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'agent-buffer.sqlite');
const PS_SCRIPT = path.join(__dirname, 'zk-reader.ps1');
const TEMP_JSON = path.join(__dirname, 'zk-temp.json');

// SQLite
const db = new sqlite3.Database(DB_FILE);
let isPolling = false;
let isSyncing = false;
let lastSeenTs = 0;

// Logging
function logInfo(...args) {
  console.log(new Date().toISOString(), '[INFO]', ...args);
}

function logWarn(...args) {
  console.warn(new Date().toISOString(), '[WARN]', ...args);
}

function logError(...args) {
  console.error(new Date().toISOString(), '[ERROR]', ...args);
}

// SQLite helpers
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

// Khoi tao DB
async function initDb() {
  logInfo('[1/5] Dang khoi tao SQLite database...');
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
    `SELECT timestamp FROM local_logs ORDER BY timestamp DESC LIMIT 1`
  );
  if (latestRows.length > 0) {
    const latest = new Date(latestRows[0].timestamp).getTime();
    if (!Number.isNaN(latest)) {
      lastSeenTs = latest;
    }
  }
  logInfo('[1/5] SQLite initialized at', DB_FILE);
}

// Chay PowerShell script de doc du lieu tu may cham cong
async function readFromDevice() {
  return new Promise((resolve, reject) => {
    logInfo(`[2/5] Dang chay PowerShell SDK de doc du lieu tu ${MACHINE_IP}:${MACHINE_PORT}...`);
    
    const args = [
      '-ExecutionPolicy', 'Bypass',
      '-File', PS_SCRIPT,
      '-ip', MACHINE_IP,
      '-port', MACHINE_PORT.toString(),
      '-outputFile', TEMP_JSON
    ];
    
    // Dung PowerShell 32-bit de load 32-bit COM DLL
    const psPath = 'C:\\Windows\\SysWOW64\\WindowsPowerShell\\v1.0\\powershell.exe';
    logInfo('[2/5] Command:', psPath, args.join(' '));
    
    const ps = spawn(psPath, args, {
      windowsHide: true,
      timeout: 60000 // 60 giay timeout
    });
    
    let stdout = '';
    let stderr = '';
    
    ps.stdout.on('data', (data) => {
      stdout += data.toString();
      // In real-time de debug
      process.stdout.write(data);
    });
    
    ps.stderr.on('data', (data) => {
      stderr += data.toString();
      process.stderr.write(data);
    });
    
    ps.on('close', async (code) => {
      logInfo(`[2/5] PowerShell exit code: ${code}`);
      
      if (code !== 0) {
        return reject(new Error(`PowerShell failed with code ${code}. stderr: ${stderr}`));
      }
      
      try {
        // Doc ket qua tu file JSON
        const data = await fs.readFile(TEMP_JSON, 'utf8');
        const result = JSON.parse(data);
        
        if (!result.success) {
          return reject(new Error(`SDK error: ${result.error}`));
        }
        
        resolve(result.logs || []);
      } catch (err) {
        reject(new Error(`Failed to read output: ${err.message}`));
      }
    });
    
    ps.on('error', (err) => {
      reject(new Error(`Failed to spawn PowerShell: ${err.message}`));
    });
  });
}

// Gui len Supabase
async function pushToCloud(enrollNumber, timestamp, rawPayload) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logError('[4/5] ✗ Thieu SUPABASE_URL hoac SUPABASE_KEY trong .env');
    throw new Error('Missing Supabase configuration');
  }

  const supabaseEndpoint = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`;

  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'return=minimal'
  };

  const payload = {
    student_code: enrollNumber,
    created_at: timestamp,
    source: 'zk-agent',
    machine_ip: MACHINE_IP,
    raw_data: rawPayload,
  };

  logInfo(`[4/5] Dang gui len Supabase: ${supabaseEndpoint}`);

  try {
    const response = await axios.post(supabaseEndpoint, payload, {
      timeout: 15000,
      headers,
    });
    logInfo(`[4/5] ✓ Gui thanh cong len Supabase! Status: ${response.status}`);
    return response;
  } catch (err) {
    logError('[4/5] ✗ Loi gui Supabase:', err.message);
    if (err.response) {
      logError('[4/5] Response status:', err.response.status);
      logError('[4/5] Response data:', JSON.stringify(err.response.data));
    }
    throw err;
  }
}

// Luu local
async function saveLogLocally(enrollNumber, timestamp, rawPayload) {
  await run(
    `INSERT OR IGNORE INTO local_logs (enroll_number, timestamp, is_synced, payload, machine_ip)
     VALUES (?, ?, 0, ?, ?)`,
    [enrollNumber, timestamp, rawPayload, MACHINE_IP]
  );
}

// Danh dau da sync
async function markSynced(id) {
  await run(
    `UPDATE local_logs SET is_synced = 1, synced_at = datetime('now') WHERE id = ?`,
    [id]
  );
}

// Sync tu SQLite len Supabase
async function syncUnsyncedLogs() {
  if (isSyncing) {
    logInfo('[5/5] Dang dong bo - bo qua');
    return;
  }
  isSyncing = true;

  try {
    logInfo('[5/5] Dang dong bo tu SQLite len Supabase...');
    const pending = await all(
      `SELECT id, enroll_number, timestamp, payload FROM local_logs
       WHERE is_synced = 0 ORDER BY timestamp ASC LIMIT 100`
    );

    logInfo(`[5/5] Tim thay ${pending.length} ban ghi can dong bo`);

    for (const row of pending) {
      try {
        logInfo(`[5/5] Dang dong bo log #${row.id} - ${row.enroll_number}`);
        await pushToCloud(row.enroll_number, row.timestamp, row.payload);
        await markSynced(row.id);
        logInfo(`[5/5] ✓ Da dong bo log #${row.id}`);
      } catch (error) {
        logError(`[5/5] ✗ Loi dong bo log #${row.id}:`, error.message);
      }
    }
  } finally {
    isSyncing = false;
    logInfo('[5/5] Hoan tat dong bo');
  }
}

// Doc du lieu tu may cham cong
async function pollDevice() {
  if (isPolling) {
    logInfo('[3/5] Dang doc du lieu - bo qua');
    return;
  }
  isPolling = true;

  try {
    logInfo('[3/5] Dang doc du lieu tu may cham cong (qua PowerShell SDK)...');
    
    const logs = await readFromDevice();
    logInfo(`[3/5] Doc duoc ${logs.length} ban ghi tu may cham cong`);

    for (const row of logs) {
      const enrollNumber = row.enrollNumber || '';
      const timestamp = row.timestamp || '';

      if (!enrollNumber || !timestamp) {
        logWarn('[3/5] Bo qua ban ghi - thieu du lieu:', JSON.stringify(row));
        continue;
      }

      const ts = new Date(timestamp).getTime();
      if (Number.isNaN(ts) || ts <= lastSeenTs) {
        logInfo(`[3/5] Bo qua ban ghi cu: ${enrollNumber}`);
        continue;
      }

      const rawPayload = JSON.stringify(row);

      logInfo(`[3/5] ✓ Phat hien cham cong moi: ${enrollNumber} @ ${timestamp}`);

      // Luu SQLite
      await saveLogLocally(enrollNumber, timestamp, rawPayload);
      logInfo(`[3/5] ✓ Da luu vao SQLite: ${enrollNumber}`);

      lastSeenTs = Math.max(lastSeenTs, ts);

      // Gui ngay len Supabase
      try {
        await pushToCloud(enrollNumber, timestamp, rawPayload);
        await run(
          `UPDATE local_logs SET is_synced = 1, synced_at = datetime('now')
           WHERE enroll_number = ? AND timestamp = ? AND machine_ip = ?`,
          [enrollNumber, timestamp, MACHINE_IP]
        );
        logInfo(`[3/5] ✓ Gui thanh cong len Supabase: ${enrollNumber}`);
      } catch (error) {
        logError(`[3/5] ✗ Loi gui Supabase cho ${enrollNumber}:`, error.message);
      }
    }
  } catch (error) {
    logError('[3/5] ✗ Loi doc du lieu may cham cong:', error.message);
    logError('[3/5] Stack:', error.stack);
  } finally {
    isPolling = false;
  }
}

// Main
async function start() {
  logInfo('========================================');
  logInfo('ZK Agent - PowerShell SDK');
  logInfo('========================================');
  logInfo(`May cham cong: ${MACHINE_IP}:${MACHINE_PORT}`);
  logInfo(`PowerShell Script: ${PS_SCRIPT}`);

  if (!SUPABASE_URL || SUPABASE_URL.includes('your-project')) {
    logError('⚠️ CHUA CAU HINH SUPABASE!');
    process.exit(1);
  }

  logInfo(`Supabase URL: ${SUPABASE_URL}`);
  logInfo(`Supabase Table: ${SUPABASE_TABLE}`);
  logInfo('========================================');

  // Kiem tra PowerShell script ton tai
  try {
    await fs.access(PS_SCRIPT);
    logInfo('✓ PowerShell script ton tai');
  } catch {
    logError(`✗ Khong tim thay PowerShell script: ${PS_SCRIPT}`);
    process.exit(1);
  }

  await initDb();

  // Chay 1 lan ngay lap tuc
  await pollDevice();
  await syncUnsyncedLogs();

  // Lap lai dinh ky
  setInterval(() => {
    pollDevice().catch((error) => logError('Polling error', error.message));
  }, POLL_INTERVAL_MS);

  setInterval(() => {
    syncUnsyncedLogs().catch((error) => logError('Sync error', error.message));
  }, SYNC_INTERVAL_MS);

  logInfo('========================================');
  logInfo('Agent dang chay... Nhan Ctrl+C de dung');
  logInfo('========================================');
}

// Xu ly loi
process.on('uncaughtException', (err) => {
  logError('Uncaught Exception:', err);
  process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
  logError('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start
start().catch((err) => {
  logError('Fatal error:', err);
  process.exit(1);
});
