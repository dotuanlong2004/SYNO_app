'use strict';

const { Worker } = require('bullmq');
const { DateTime } = require('luxon');
const { createBullConnection } = require('../config/redis');
const { getPool } = require('../config/database');
const { classifyAttendance } = require('../services/attendanceLogic');
const { QUEUE_NAME } = require('../queues/attendanceQueue');
const { sendPushNotification, isUnregisteredTokenError } = require('../config/firebaseAdmin');

const TZ = process.env.ATTENDANCE_TIMEZONE || 'Asia/Ho_Chi_Minh';

function buildBody(studentCode, scannedAtIso, classification) {
  const localTime = DateTime.fromISO(scannedAtIso, { zone: 'utc' })
    .setZone(TZ)
    .toFormat('HH:mm');

  if (classification.log_type === 'check_out') {
    return `Học sinh ${studentCode} đã check-out lúc ${localTime}.`;
  }

  if (classification.status_detail === 'late') {
    return `Học sinh ${studentCode} đã check-in lúc ${localTime} (Đi muộn ${classification.late_minutes} phút).`;
  }

  return `Học sinh ${studentCode} đã check-in lúc ${localTime} (Đúng giờ).`;
}

async function clearInvalidFcmToken(userId) {
  await getPool().query(
    `UPDATE users
     SET fcm_token = NULL,
         updated_at = NOW()
     WHERE id = $1`,
    [userId]
  );
}

async function notifyUsers(studentCode, scannedAtIso, classification) {
  const { rows } = await getPool().query(
    `SELECT id, fcm_token
     FROM users
     WHERE is_active = TRUE
       AND student_code = $1
       AND fcm_token IS NOT NULL
       AND fcm_token <> ''`,
    [studentCode]
  );

  if (!rows.length) {
    return;
  }

  const title = 'Thông báo điểm danh';
  const body = buildBody(studentCode, scannedAtIso, classification);

  await Promise.all(
    rows.map(async (user) => {
      try {
        await sendPushNotification({
          token: user.fcm_token,
          title,
          body,
          data: {
            student_id: studentCode,
            log_type: classification.log_type,
            status: classification.status_detail,
            late_minutes: String(classification.late_minutes ?? 0),
            scanned_at: scannedAtIso,
          },
        });
      } catch (error) {
        if (isUnregisteredTokenError(error)) {
          await clearInvalidFcmToken(user.id);
          console.warn('[fcm] Cleared invalid token for user', user.id);
          return;
        }

        console.error('[fcm] send failed for user', user.id, error.message);
      }
    })
  );
}

/**
 * @param {import('bullmq').Job} job
 */
async function processScan(job) {
  const { studentCode, scannedAtIso } = job.data;
  if (!studentCode || !scannedAtIso) {
    throw new Error('Invalid job payload');
  }

  const scannedAt = new Date(scannedAtIso);
  const classification = classifyAttendance(scannedAt);
  if (!classification) {
    console.warn(
      `[worker] Scan outside attendance window (timezone ${TZ}):`,
      studentCode,
      scannedAtIso
    );
    return { skipped: true, reason: 'outside_window' };
  }

  const pool = getPool();
  const defaultLinkCode = `LK-${studentCode}`;

  const upsert = await pool.query(
    `INSERT INTO students (student_code, full_name, link_code)
     VALUES ($1, $2, $3)
     ON CONFLICT (student_code) DO UPDATE SET
       link_code = COALESCE(students.link_code, EXCLUDED.link_code),
       updated_at = NOW()
     RETURNING id`,
    [studentCode, 'Pending registration', defaultLinkCode]
  );
  const studentId = upsert.rows[0].id;

  await pool.query(
    `INSERT INTO attendance_logs (student_id, scanned_at, log_type, status_detail, late_minutes)
     VALUES ($1, $2::timestamptz, $3, $4, $5)`,
    [
      studentId,
      scannedAtIso,
      classification.log_type,
      classification.status_detail,
      classification.late_minutes,
    ]
  );

  await notifyUsers(studentCode, scannedAtIso, classification);

  return {
    skipped: false,
    studentId,
    ...classification,
  };
}

function createAttendanceWorker() {
  const connection = createBullConnection();

  const worker = new Worker(QUEUE_NAME, processScan, {
    connection,
    concurrency: Number(process.env.ATTENDANCE_WORKER_CONCURRENCY || 20),
  });

  worker.on('failed', (job, err) => {
    console.error('[worker] Job failed', job?.id, err.message);
  });

  return worker;
}

module.exports = { createAttendanceWorker, processScan };
