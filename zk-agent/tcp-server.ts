// @ts-nocheck
'use strict';

/**
 * ZK TCP Server - Doi may cham cong push du lieu den port 5005
 * Va gui truc tiep len Supabase
 */

require('dotenv').config();

const net = require('net');
const path = require('path');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

// Config
const SERVER_IP = process.env.SERVER_IP || '0.0.0.0';
const SERVER_PORT = Number(process.env.SERVER_PORT || 5005);

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'attendance_spam_logs';

const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'agent-buffer.sqlite');

// SQLite
const db = new sqlite3.Database(DB_FILE);
let isSyncing = false;

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

// Khoi tao DB
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
  logInfo('SQLite initialized');
}

// Gui len Supabase
async function pushToCloud(enrollNumber, timestamp, rawPayload, machineIp) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logError('Thieu SUPABASE_URL hoac SUPABASE_KEY');
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
    source: 'zk-tcp-server',
    machine_ip: machineIp,
    raw_data: rawPayload,
  };

  try {
    const response = await axios.post(supabaseEndpoint, payload, {
      timeout: 15000,
      headers,
    });
    logInfo(`✓ Gui thanh cong len Supabase! Status: ${response.status}`);
    return response;
  } catch (err) {
    logError('Loi gui Supabase:', err.message);
    if (err.response) {
      logError('Response status:', err.response.status);
    }
    throw err;
  }
}

// Luu local
async function saveLogLocally(enrollNumber, timestamp, rawPayload, machineIp) {
  await run(
    `INSERT OR IGNORE INTO local_logs (enroll_number, timestamp, is_synced, payload, machine_ip)
     VALUES (?, ?, 0, ?, ?)`,
    [enrollNumber, timestamp, rawPayload, machineIp]
  );
}

// Parse ZKTeco JSON data
function parseZKData(data) {
  try {
    // Thu parse nhu JSON
    const json = JSON.parse(data);
    
    // ZKTeco format: { "user_id": "123", "timestamp": "2024-01-01 08:00:00", ... }
    // Hoac { "PIN": "123", "DateTime": "2024-01-01 08:00:00", ... }
    
    const enrollNumber = json.user_id || json.PIN || json.enroll_number || json.id || '';
    const timestamp = json.timestamp || json.DateTime || json.time || new Date().toISOString();
    
    return { enrollNumber, timestamp, raw: data };
  } catch (e) {
    // Khong phai JSON, thu parse nhu raw string
    logWarn('Khong phai JSON format:', data.substring(0, 100));
    return null;
  }
}

// Tao TCP server
function createServer() {
  const server = net.createServer((socket) => {
    const clientIp = socket.remoteAddress;
    const clientPort = socket.remotePort;
    logInfo(`May cham cong ket noi: ${clientIp}:${clientPort}`);

    let buffer = '';

    socket.on('data', async (data) => {
      const chunk = data.toString();
      logInfo(`Nhan du lieu (${data.length} bytes):`);
      logInfo(`  HEX : ${data.toString('hex').replace(/(.{2})/g, '$1 ').trim()}`);
      logInfo(`  TEXT: ${chunk.replace(/\r/g, '\\r').replace(/\n/g, '\\n').substring(0, 300)}`);

      // Kiem tra goi handshake ZKTeco (magic bytes a5 5a)
      if (data.length >= 2 && data[0] === 0xa5 && data[1] === 0x5a) {
        logInfo('  → Handshake ZKTeco, gui ACK...');
        // ACK: echo toan bo goi handshake nhung doi header a5 5a -> 5a a5
        const ack = Buffer.from(data);
        ack[0] = 0x5a;
        ack[1] = 0xa5;
        socket.write(ack);
        logInfo(`  → Da gui ACK (${ack.length} bytes): ${ack.toString('hex').replace(/(.{2})/g, '$1 ').trim()}`);
        return;
      }

      buffer += chunk;
      
      // Thu parse tung dong
      const lines = buffer.split('\n');
      buffer = lines.pop(); // Giu phan chua hoan thien
      
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        
        const parsed = parseZKData(trimmed);
        if (!parsed) continue;
        
        const { enrollNumber, timestamp, raw } = parsed;
        if (!enrollNumber) {
          logWarn('Bo qua - khong co enrollNumber');
          continue;
        }
        
        logInfo(`✓ Phat hien cham cong: ${enrollNumber} @ ${timestamp}`);
        
        // Luu SQLite
        try {
          await saveLogLocally(enrollNumber, timestamp, raw, clientIp);
          logInfo(`✓ Da luu vao SQLite`);
        } catch (err) {
          logError('Loi luu SQLite:', err.message);
        }
        
        // Gui Supabase
        try {
          await pushToCloud(enrollNumber, timestamp, raw, clientIp);
          logInfo(`✓ Da gui len Supabase`);
        } catch (err) {
          logError('Loi gui Supabase:', err.message);
        }
      }
    });

    socket.on('end', () => {
      logInfo(`May cham cong ngat ket noi: ${clientIp}:${clientPort}`);
    });

    socket.on('error', (err) => {
      logError(`Socket error: ${err.message}`);
    });
  });

  server.on('error', (err) => {
    logError('Server error:', err.message);
    if (err.code === 'EADDRINUSE') {
      logError(`Port ${SERVER_PORT} da duoc su dung!`);
    }
  });

  server.listen(SERVER_PORT, SERVER_IP, () => {
    logInfo('========================================');
    logInfo('ZK TCP Server - Doi may cham cong push');
    logInfo('========================================');
    logInfo(`Dang lang nghe tren: ${SERVER_IP}:${SERVER_PORT}`);
    logInfo(`Supabase URL: ${SUPABASE_URL}`);
    logInfo('========================================');
    logInfo('Dam bao may cham cong da cau hinh:');
    logInfo(`  IP Server: ${SERVER_IP}`);
    logInfo(`  Port Server: ${SERVER_PORT}`);
    logInfo('========================================');
  });

  return server;
}

// Xu ly loi
process.on('uncaughtException', (err) => {
  logError('Uncaught Exception:', err);
  process.exit(1);
});

// Start
async function start() {
  await initDb();
  createServer();
}

start().catch((err) => {
  logError('Fatal error:', err);
  process.exit(1);
});
