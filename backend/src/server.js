'use strict';

/**
 * Attendance API Server - Supabase + pg-boss edition
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { checkSupabaseHealth } = require('./config/supabase');
const { attendanceQueue } = require('./queues/attendanceQueue');
const { mobileRouter } = require('./routes/mobile');
const { authRouter } = require('./routes/auth');
const { adminRouter } = require('./routes/admin');
const { attendanceRouter } = require('./routes/attendance');
const { dataRouter } = require('./routes/data');
const { studentsRouter } = require('./routes/students');
const { usersRouter } = require('./routes/users');
const { initializeFirebaseAdmin } = require('./config/firebaseAdmin');

require('dotenv').config();

initializeFirebaseAdmin();

const app = express();
const port = Number(process.env.PORT || 3000);

app.use(helmet());
app.use(cors());
app.use(express.json());

app.get('/health', async (req, res) => {
  const checks = { ok: true, supabase: 'unknown', queue: 'unknown' };

  const supabaseHealth = await checkSupabaseHealth();
  checks.supabase = supabaseHealth.supabase;
  if (!supabaseHealth.ok) {
    checks.ok = false;
  }

  // Check pg-boss queue status
  try {
    if (process.env.SUPABASE_DB_URL) {
      checks.queue = 'enabled';
    } else {
      checks.queue = 'disabled (SUPABASE_DB_URL not set)';
    }
  } catch (e) {
    checks.ok = false;
    checks.queue = 'error';
  }

  res.status(checks.ok ? 200 : 503).json(checks);
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/mobile', mobileRouter);
app.use('/api/v1', dataRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1/attendance', attendanceRouter);
app.use('/api/v1', studentsRouter);
app.use('/api/v1/users', usersRouter);

const hardwareEnabled = process.env.ENABLE_HARDWARE_ROUTE !== 'false';
if (hardwareEnabled) {
  const { hardwareRouter } = require('./routes/hardware');
  app.use('/api/v1/hardware', hardwareRouter);
}

// pg-boss worker setup
const queueEnabled = process.env.ENABLE_ATTENDANCE_QUEUE !== 'false';
let worker = null;

async function startWorker() {
  if (!queueEnabled) {
    console.log('[server] Attendance queue disabled');
    return;
  }
  
  if (!process.env.SUPABASE_DB_URL) {
    console.log('[server] Queue disabled: SUPABASE_DB_URL not set (required for pg-boss)');
    return;
  }

  try {
    const workerModule = require('./workers/attendanceWorker');
    worker = await workerModule.createAttendanceWorker();
    console.log('[server] pg-boss worker started');
  } catch (err) {
    console.error('[server] Failed to start worker:', err.message);
  }
}

const server = app.listen(port, async () => {
  console.log(`🚀 Attendance API listening on port ${port}`);
  console.log('📡 Auth: POST /api/v1/auth/login | /refresh | /logout');
  if (hardwareEnabled) {
    console.log('📟 Hardware scan: POST /api/v1/hardware/scan');
  }
  console.log('📝 Attendance sync: POST /api/v1/attendance/sync');
  console.log('📱 Mobile logs: GET /api/v1/mobile/attendance/logs?limit=50');
  console.log('📅 Timetable: GET /api/v1/mobile/timetable');
  console.log('👥 Students: GET /api/v1/students');
  
  // Start worker after server is ready
  await startWorker();
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`\n${signal}: shutting down...`);

  server.close(() => {});

  if (worker) {
    try {
      await worker.close();
      console.log('[server] Worker closed');
    } catch (e) {
      console.error('Worker close error', e);
    }
  }

  // Close pg-boss queue
  try {
    await attendanceQueue.close();
    console.log('[server] Queue closed');
  } catch (e) {
    // Ignore
  }

  console.log('[server] Shutdown complete');
  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
