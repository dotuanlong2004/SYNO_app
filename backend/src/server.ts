'use strict';

/**
 * Attendance API Server - Supabase + pg-boss edition
 */

const { createApp } = require('./app');
const { attendanceQueue } = require('./queues/attendanceQueue');

require('dotenv').config();

const app = createApp();
const port = Number(process.env.PORT || 3000);

const hardwareEnabled = process.env.ENABLE_HARDWARE_ROUTE !== 'false';
const queueEnabled = process.env.ENABLE_ATTENDANCE_QUEUE !== 'false';
let worker = null;

async function startWorker() {
  if (!queueEnabled) {
    console.log('[server] Attendance queue disabled by ENABLE_ATTENDANCE_QUEUE=false');
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
