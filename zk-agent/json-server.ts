// @ts-nocheck
'use strict';

/**
 * TCP Server nhan du lieu JSON tu may cham cong ZKTeco
 * May cham cong se tu dong ket noi va gui du lieu khi co nguoi cham cong
 */

require('dotenv').config();
const net = require('net');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const SERVER_PORT = Number(process.env.SERVER_PORT || 5005);
const MACHINE_IP = process.env.MACHINE_IP || '192.168.0.225';
const CLOUD_API_URL = process.env.CLOUD_API_URL || 'http://localhost:3000/api/v1/hardware/scan';
const CLOUD_API_KEY = process.env.CLOUD_API_KEY || '';
const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'agent-buffer.sqlite');

const db = new sqlite3.Database(DB_FILE);

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
    source: 'zk-agent-json-server',
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

// Parse du lieu JSON tu may cham cong
function parseAttendanceData(data) {
  try {
    // Thu parse JSON
    const json = JSON.parse(data);
    logInfo('Received JSON:', JSON.stringify(json, null, 2));
    
    // Cac format JSON pho bien tu may ZKTeco
    // Format 1: { userId: "123", timestamp: "2024-01-01 08:00:00" }
    // Format 2: { id: "123", time: "2024-01-01T08:00:00" }
    // Format 3: { enrollNumber: "123", recordTime: "2024-01-01 08:00:00" }
    
    const enrollNumber = json.userId || json.id || json.enrollNumber || json.user_id || json.uid || '';
    const timestamp = json.timestamp || json.time || json.recordTime || new Date().toISOString();
    
    if (!enrollNumber) {
      logWarn('Cannot extract enrollNumber from:', data);
      return null;
    }
    
    return {
      enrollNumber: String(enrollNumber).trim(),
      timestamp: String(timestamp),
      raw: data
    };
  } catch (e) {
    // Khong phai JSON, co the la format khac
    logWarn('Not valid JSON, raw data:', data);
    return null;
  }
}

// Xu ly ket noi tu may cham cong
async function handleConnection(socket) {
  const clientIp = socket.remoteAddress;
  const clientPort = socket.remotePort;
  logInfo('==========================================');
  logInfo('✓ DEVICE CONNECTED!');
  logInfo('  From:', clientIp + ':' + clientPort);
  logInfo('==========================================');

  let buffer = '';

  socket.on('data', async (data) => {
    buffer += data.toString();
    logInfo('Raw data received:', buffer);
    
    // Thu parse tung dong
    const lines = buffer.split('\n');
    buffer = lines.pop(); // Giua lai phan chua hoan chinh
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const parsed = parseAttendanceData(line.trim());
      if (!parsed) continue;
      
      logInfo('Parsed attendance:', parsed.enrollNumber, '@', parsed.timestamp);
      
      // Luu local
      await saveLogLocally(parsed.enrollNumber, parsed.timestamp, parsed.raw);
      
      // Push ngay len cloud
      const synced = await pushToCloud(parsed.enrollNumber, parsed.timestamp, parsed.raw);
      
      if (synced) {
        logInfo('Synced immediately:', parsed.enrollNumber);
      } else {
        logWarn('Queued for retry:', parsed.enrollNumber);
      }
    }
  });

  socket.on('end', () => {
    logInfo('Device disconnected:', clientIp);
  });

  socket.on('error', (err) => {
    logError('Socket error:', err.message);
  });
}

// Tao TCP server
function startServer() {
  const server = net.createServer(handleConnection);
  
  server.listen(SERVER_PORT, '0.0.0.0', () => {
    logInfo('==========================================');
    logInfo('   ZK JSON Server started');
    logInfo('==========================================');
    logInfo(`Listening on port: ${SERVER_PORT}`);
    logInfo(`Waiting for device: ${MACHINE_IP}`);
    logInfo('Ready to receive attendance data...');
    logInfo('==========================================');
  });

  server.on('error', (err) => {
    logError('Server error:', err.message);
    if (err.code === 'EADDRINUSE') {
      logError(`Port ${SERVER_PORT} is already in use!`);
      process.exit(1);
    }
  });

  // Sync unsynced logs dinh ky
  setInterval(async () => {
    try {
      const pending = await run(
        `SELECT id, enroll_number, timestamp, payload FROM local_logs 
         WHERE is_synced = 0 ORDER BY timestamp ASC LIMIT 100`
      );
      
      // SQLite3 khong tra ve Promise nhu vay, can dung all()
      db.all(
        `SELECT id, enroll_number, timestamp, payload FROM local_logs 
         WHERE is_synced = 0 ORDER BY timestamp ASC LIMIT 100`,
        [],
        async (err, rows) => {
          if (err || !rows || rows.length === 0) return;
          
          for (const row of rows) {
            const synced = await pushToCloud(row.enroll_number, row.timestamp, row.payload);
            if (synced) {
              await run(
                `UPDATE local_logs SET is_synced = 1, synced_at = datetime('now') WHERE id = ?`,
                [row.id]
              );
              logInfo('Synced from queue:', row.enroll_number);
            }
          }
        }
      );
    } catch (e) {
      // Silent fail
    }
  }, 30000); // 30 giay
}

// Main
async function main() {
  await initDb();
  startServer();
}

main().catch(err => {
  logError('Fatal error:', err);
  process.exit(1);
});
