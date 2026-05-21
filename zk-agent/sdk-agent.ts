// @ts-nocheck
'use strict';

/**
 * ZK SDK Agent - Su dung zkemkeeper.dll de ket noi may cham cong
 * Can chay tren Windows voi SDK da duoc regsvr32
 */

require('dotenv').config();
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const MACHINE_IP = process.env.MACHINE_IP || '192.168.0.225';
const MACHINE_PORT = Number(process.env.MACHINE_PORT || 4370);
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'http://localhost:3000/api/v1/hardware/scan';
const CLOUD_API_KEY = process.env.CLOUD_API_KEY || '';
const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'agent-buffer.sqlite');
const POLL_INTERVAL_MS = Number(process.env.POLL_INTERVAL_MS || 3000);

const db = new sqlite3.Database(DB_FILE);

// Kiem tra va load ZK SDK
let zkemkeeper = null;
try {
  // Thu load ActiveX object
  zkemkeeper = new (require('win32com').ActiveXObject)('zkemkeeper.ZKEMKeeper');
  console.log('[INFO] ZK SDK loaded successfully');
} catch (e) {
  console.log('[WARN] Khong the load SDK truc tiep, thu dung child_process...');
}

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
  logInfo('SQLite initialized at', DB_FILE);
}

async function pushToCloud(studentCode, timestamp, rawPayload) {
  const headers = { 'Content-Type': 'application/json' };
  if (CLOUD_API_KEY) {
    headers.authorization = `Bearer ${CLOUD_API_KEY}`;
  }

  const payload = {
    student_id: studentCode,
    scanned_at: timestamp,
    source: 'zk-sdk-agent',
    machine_ip: MACHINE_IP,
    raw: rawPayload,
  };

  try {
    await axios.post(CLOUD_API_URL, payload, {
      timeout: 10000,
      headers,
    });
    return true;
  } catch (error) {
    logWarn('Cloud sync failed:', error?.response?.status || error.message);
    return false;
  }
}

async function saveLogLocally(enrollNumber, timestamp, rawPayload) {
  try {
    await run(
      `INSERT OR IGNORE INTO local_logs (
        enroll_number, timestamp, is_synced, payload, machine_ip
      ) VALUES (?, ?, 0, ?, ?)`,
      [enrollNumber, timestamp, rawPayload, MACHINE_IP]
    );
  } catch (err) {
    logError('Save to SQLite failed:', err.message);
  }
}

// ==== CACH 1: DUNG ZK SDK (NEU CO) ====
async function connectWithSDK() {
  if (!zkemkeeper) {
    throw new Error('ZK SDK not available');
  }
  
  // Connect to device
  const connected = zkemkeeper.Connect_Net(MACHINE_IP, MACHINE_PORT);
  if (!connected) {
    throw new Error(`Cannot connect to ${MACHINE_IP}:${MACHINE_PORT}`);
  }
  
  logInfo('Connected to device via SDK');
  
  // Read attendance logs
  const logs = [];
  let enrollNumber = '';
  let verifyMode = 0;
  let inOutMode = 0;
  let year = 0;
  let month = 0;
  let day = 0;
  let hour = 0;
  let minute = 0;
  let second = 0;
  let workCode = 0;
  
  zkemkeeper.ReadGeneralLogData(MACHINE_PORT);
  
  while (zkemkeeper.SSR_GetGeneralLogData(
    MACHINE_PORT, 
    enrollNumber, 
    verifyMode, 
    inOutMode, 
    year, month, day, hour, minute, second,
    workCode
  )) {
    const timestamp = `${year}-${String(month).padStart(2,'0')}-${String(day).padStart(2,'0')} ${String(hour).padStart(2,'0')}:${String(minute).padStart(2,'0')}:${String(second).padStart(2,'0')}`;
    
    logs.push({
      enrollNumber: enrollNumber.toString().trim(),
      timestamp,
      verifyMode,
      inOutMode
    });
  }
  
  zkemkeeper.Disconnect();
  return logs;
}

// ==== CACH 2: DUNG TCP (Fallback) ====
async function connectWithTCP() {
  const net = require('net');
  
  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    const logs = [];
    
    client.setTimeout(10000);
    
    client.on('connect', () => {
      logInfo('TCP connected to device');
      
      // Send command to get attendance (protocol ZKTeco)
      const cmd = Buffer.from([0x50, 0x50, 0x82, 0x7d, 0x08, 0x00, 0x00, 0x00]);
      client.write(cmd);
    });
    
    client.on('data', (data) => {
      logInfo('Received data:', data.toString('hex'));
      // Parse response... (simplified)
    });
    
    client.on('timeout', () => {
      client.destroy();
      reject(new Error('TCP timeout'));
    });
    
    client.on('error', (err) => {
      reject(err);
    });
    
    client.connect(MACHINE_PORT, MACHINE_IP);
  });
}

// ==== MAIN LOOP ====
async function pollDevice() {
  try {
    let logs = [];
    
    // Thu dung SDK truoc
    try {
      logs = await connectWithSDK();
      logInfo(`SDK: Read ${logs.length} logs`);
    } catch (sdkErr) {
      logWarn('SDK failed:', sdkErr.message);
      logWarn('Falling back to TCP...');
      
      // Thu dung TCP
      logs = await connectWithTCP();
    }
    
    // Xu ly logs
    for (const log of logs) {
      const payload = JSON.stringify(log);
      
      // Save local
      await saveLogLocally(log.enrollNumber, log.timestamp, payload);
      
      // Push cloud
      const synced = await pushToCloud(log.enrollNumber, log.timestamp, payload);
      
      if (synced) {
        logInfo('Synced:', log.enrollNumber);
      } else {
        logWarn('Queued:', log.enrollNumber);
      }
    }
    
  } catch (err) {
    logError('Poll failed:', err.message);
  }
}

// Sync unsynced logs dinh ky
async function syncUnsynced() {
  try {
    const pending = await all(
      `SELECT id, enroll_number, timestamp, payload FROM local_logs 
       WHERE is_synced = 0 ORDER BY timestamp ASC LIMIT 100`
    );
    
    for (const row of pending) {
      const synced = await pushToCloud(row.enroll_number, row.timestamp, row.payload);
      if (synced) {
        await run(
          `UPDATE local_logs SET is_synced = 1, synced_at = datetime('now') WHERE id = ?`,
          [row.id]
        );
        logInfo('Retry synced:', row.enroll_number);
      }
    }
  } catch (e) {
    // Silent fail
  }
}

// Main
async function main() {
  await initDb();
  
  logInfo('==========================================');
  logInfo('   ZK SDK Agent Started');
  logInfo('==========================================');
  logInfo(`Device: ${MACHINE_IP}:${MACHINE_PORT}`);
  logInfo('SDK Status:', zkemkeeper ? 'Available' : 'Not available (will use TCP)');
  logInfo('==========================================');
  
  // Poll immediately
  await pollDevice();
  
  // Schedule poll
  setInterval(pollDevice, POLL_INTERVAL_MS);
  
  // Schedule sync retry
  setInterval(syncUnsynced, 30000);
}

main().catch(err => {
  logError('Fatal error:', err);
  process.exit(1);
});
