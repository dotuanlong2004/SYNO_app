'use strict';

/**
 * Express app factory shared by production server and smoke tests.
 */

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { checkSupabaseHealth } = require('./config/supabase');
const { mobileRouter } = require('./routes/mobile');
const { authRouter } = require('./routes/auth');
const { adminRouter } = require('./routes/admin');
const { attendanceRouter } = require('./routes/attendance');
const { dataRouter } = require('./routes/data');
const { studentsRouter } = require('./routes/students');
const { usersRouter } = require('./routes/users');
const { initializeFirebaseAdmin } = require('./config/firebaseAdmin');

require('dotenv').config();

function createApp() {
  initializeFirebaseAdmin();

  const app = express();

  app.use(helmet());
  app.use(cors());
  app.use(express.json());

  app.get('/health', async (req, res) => {
    const checks: { ok: boolean; supabase: string; queue: string; error?: string } = {
      ok: true,
      supabase: 'unknown',
      queue: 'unknown',
    };

    const supabaseHealth = await checkSupabaseHealth();
    checks.supabase = supabaseHealth.supabase;
    if (!supabaseHealth.ok) {
      checks.ok = false;
      checks.error = supabaseHealth.error || 'Supabase health check failed';
    }

    try {
      const queueEnabled = process.env.ENABLE_ATTENDANCE_QUEUE !== 'false';
      const queueRequired = process.env.REQUIRE_ATTENDANCE_QUEUE === 'true';
      if (!queueEnabled) {
        checks.queue = 'disabled (ENABLE_ATTENDANCE_QUEUE=false)';
        if (queueRequired) {
          checks.ok = false;
          checks.error = checks.error || 'Attendance queue is required but disabled';
        }
      } else if (process.env.SUPABASE_DB_URL) {
        checks.queue = 'enabled';
      } else {
        checks.queue = 'disabled (SUPABASE_DB_URL not set)';
        if (queueRequired) {
          checks.ok = false;
          checks.error = checks.error || 'Attendance queue is required but SUPABASE_DB_URL is missing';
        }
      }
    } catch (error: any) {
      checks.ok = false;
      checks.queue = 'error';
      checks.error = checks.error || error.message || 'Queue health check failed';
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

  const adminWebRouter = require('./routes/adminWeb');
  app.use('/api/v1/admin-web', adminWebRouter);

  const platformAdminRouter = require('./routes/platformAdmin');
  app.use('/api/v1/platform-admin', platformAdminRouter);

  const hardwareEnabled = process.env.ENABLE_HARDWARE_ROUTE !== 'false';
  if (hardwareEnabled) {
    const { hardwareRouter } = require('./routes/hardware');
    app.use('/api/v1/hardware', hardwareRouter);
  }

  return app;
}

module.exports = { createApp };
