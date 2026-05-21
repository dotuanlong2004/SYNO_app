// @ts-nocheck
'use strict';

/**
 * ZK HTTP Server - Doi may cham cong push du lieu qua HTTP
 */

require('dotenv').config();

const express = require('express');
const path = require('path');
const axios = require('axios');
const sqlite3 = require('sqlite3').verbose();

// Config
const SERVER_IP = process.env.SERVER_IP || '192.168.0.111';
const SERVER_PORT = Number(process.env.SERVER_HTTP_PORT || 5006);

// Supabase config
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_KEY = process.env.SUPABASE_KEY || '';
const SUPABASE_TABLE = process.env.SUPABASE_TABLE || 'attendance_spam_logs';
const DB_FILE = process.env.SQLITE_FILE || path.join(__dirname, 'agent-buffer.sqlite');

// Express app
const app = express();
app.use(express.json());
app.use(express.text());
app.use(express.urlencoded({ extended: true }));

// SQLite
const db = new sqlite3.Database(DB_FILE);

// Logging
function logInfo(...args) {
  console.log(new Date().toISOString(), '[INFO]', ...args);
}

function logError(...args) {
  console.error(new Date().toISOString(), '[ERROR]', ...args);
}

// Init DB
db.run(`
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

// Push to Supabase
async function pushToSupabase(enrollNumber, timestamp, rawData, machineIp) {
  if (!SUPABASE_URL || !SUPABASE_KEY) {
    logError('Thieu SUPABASE_URL hoac SUPABASE_KEY');
    return false;
  }

  const url = `${SUPABASE_URL}/rest/v1/${SUPABASE_TABLE}`;
  const headers = {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${SUPABASE_KEY}`,
    'Prefer': 'return=minimal'
  };
  const payload = {
    student_code: enrollNumber,
    created_at: timestamp,
    source: 'zk-http',
    machine_ip: machineIp,
    raw_data: rawData
  };

  try {
    const response = await axios.post(url, payload, { headers, timeout: 15000 });
    logInfo(`✓ Gui thanh cong: ${enrollNumber}`);
    return true;
  } catch (err) {
    logError('Loi gui Supabase:', err.message);
    return false;
  }
}

// Routes
app.post('/iclock/cdata', (req, res) => {
  logInfo('Nhan du lieu tu /iclock/cdata');
  logInfo('Body:', req.body);
  res.json({ result: 'success' });
});

app.post('/cdata', (req, res) => {
  logInfo('Nhan du lieu tu /cdata');
  logInfo('Body:', req.body);
  
  // ZKTeco thuong gui: pin=xxx&time=xxx&status=xxx
  const data = typeof req.body === 'string' ? req.body : JSON.stringify(req.body);
  logInfo('Data:', data);
  
  // Parse
  const params = new URLSearchParams(data);
  const pin = params.get('pin') || params.get('PIN') || '';
  const time = params.get('time') || params.get('DateTime') || new Date().toISOString();
  
  if (pin) {
    logInfo(`✓ Phat hien: ${pin} @ ${time}`);
    pushToSupabase(pin, time, data, req.ip);
  }
  
  res.json({ result: 'success', count: 1 });
});

app.post('/getrequest', (req, res) => {
  logInfo('Nhan request tu /getrequest');
  res.json({ result: 'success' });
});

app.get('/devicecmd', (req, res) => {
  logInfo('Device query tu /devicecmd');
  res.json({ cmd: '' });
});

// Catch all
app.use((req, res) => {
  logInfo(`Request: ${req.method} ${req.path}`);
  logInfo('Headers:', JSON.stringify(req.headers));
  logInfo('Body:', req.body);
  res.json({ received: true });
});

// Start
app.listen(SERVER_PORT, SERVER_IP, () => {
  logInfo('========================================');
  logInfo('ZK HTTP Server');
  logInfo('========================================');
  logInfo(`Dang lang nghe: http://${SERVER_IP}:${SERVER_PORT}`);
  logInfo(`Supabase: ${SUPABASE_URL}`);
  logInfo('========================================');
  logInfo('Cac endpoint:');
  logInfo(`  POST http://${SERVER_IP}:${SERVER_PORT}/cdata`);
  logInfo(`  POST http://${SERVER_IP}:${SERVER_PORT}/iclock/cdata`);
  logInfo('========================================');
});
