'use strict';

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { getPool } = require('./config/database');
const { getRedis, quitRedis } = require('./config/redis');
const { mobileRouter } = require('./routes/mobile');
const { authRouter } = require('./routes/auth');
const { adminRouter } = require('./routes/admin');
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
  const checks = { ok: true, postgres: 'unknown', redis: 'unknown' };

  try {
    await getPool().query('SELECT 1');
    checks.postgres = 'up';
  } catch (e) {
    checks.ok = false;
    checks.postgres = 'down';
  }

  try {
    await getRedis().ping();
    checks.redis = 'up';
  } catch (e) {
    checks.ok = false;
    checks.redis = 'down';
  }

  res.status(checks.ok ? 200 : 503).json(checks);
});

app.use('/api/v1/auth', authRouter);
app.use('/api/v1/mobile', mobileRouter);
app.use('/api/v1/admin', adminRouter);
app.use('/api/v1', studentsRouter);
app.use('/api/v1/users', usersRouter);

const hardwareEnabled = process.env.ENABLE_HARDWARE_ROUTE !== 'false';
if (hardwareEnabled) {
  const { hardwareRouter } = require('./routes/hardware');
  app.use('/api/v1/hardware', hardwareRouter);
}

const queueEnabled = process.env.ENABLE_ATTENDANCE_QUEUE !== 'false';
let attendanceQueue = null;
let worker = null;
if (queueEnabled) {
  const queueModule = require('./queues/attendanceQueue');
  const workerModule = require('./workers/attendanceWorker');
  attendanceQueue = queueModule.attendanceQueue;
  worker = workerModule.createAttendanceWorker();
}

const server = app.listen(port, () => {
  console.log(`Attendance API listening on port ${port}`);
  console.log('Auth: POST /api/v1/auth/login | /refresh | /logout');
  if (hardwareEnabled) {
    console.log('Hardware scan: POST /api/v1/hardware/scan');
  }
  console.log('Mobile logs: GET /api/v1/mobile/attendance/logs?limit=50');
  console.log('Mobile logs alias: GET /api/v1/mobile/attendance-logs?limit=50');
  console.log('Timetable: GET /api/v1/mobile/timetable');
  console.log('Students (teacher/admin): GET /api/v1/students');
  console.log('Provision parent (teacher/admin): POST /api/v1/admin/provision-parent');
  console.log('Users FCM: POST /api/v1/users/fcm-token');
  if (!queueEnabled) {
    console.log('Attendance queue disabled (ENABLE_ATTENDANCE_QUEUE=false)');
  }
});

let shuttingDown = false;

async function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal}: shutting down...`);

  server.close(() => {});

  if (worker) {
    try {
      await worker.close();
    } catch (e) {
      console.error('Worker close error', e);
    }
  }

  if (attendanceQueue) {
    try {
      await attendanceQueue.close();
    } catch (e) {
      console.error('Queue close error', e);
    }
  }

  try {
    await quitRedis();
  } catch (e) {
    console.error('Redis quit error', e);
  }

  try {
    await getPool().end();
  } catch (e) {
    console.error('Pool end error', e);
  }

  process.exit(0);
}

process.once('SIGINT', () => shutdown('SIGINT'));
process.once('SIGTERM', () => shutdown('SIGTERM'));
