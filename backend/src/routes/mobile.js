'use strict';

const express = require('express');
const { getPool } = require('../config/database');
const { mobileAuth } = require('../middleware/mobileAuth');

const router = express.Router();

async function getAttendanceLogs(req, res) {
  const requested = Number(req.query.limit || 50);
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(Math.trunc(requested), 200))
    : 50;

  try {
    const { rows } = await getPool().query(
      `SELECT s.student_code AS student_id,
              a.scanned_at  AS timestamp,
              a.status_detail,
              a.late_minutes,
              a.log_type
       FROM attendance_logs a
       JOIN students s ON s.id = a.student_id
       ORDER BY a.scanned_at DESC
       LIMIT $1`,
      [limit]
    );

    const data = rows.map((row) => ({
      student_id: row.student_id,
      timestamp: new Date(row.timestamp).toISOString(),
      status: row.status_detail,
      late_minutes: row.late_minutes,
      log_type: row.log_type,
    }));

    return res.status(200).json({
      ok: true,
      count: data.length,
      user: req.user,
      data,
    });
  } catch (error) {
    console.error('Failed to fetch attendance logs', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
}

router.get('/attendance/logs', mobileAuth, getAttendanceLogs);
router.get('/attendance-logs', mobileAuth, getAttendanceLogs);

router.get('/timetable', mobileAuth, async (req, res) => {
  const classId = String(req.user?.class_id ?? '').trim();
  if (!classId) {
    return res.status(400).json({
      ok: false,
      error: 'No class_id found for current user',
    });
  }

  try {
    const { rows } = await getPool().query(
      `SELECT id, class_id, subject_name, day_of_week, start_time, end_time, room
       FROM timetables
       WHERE class_id = $1
       ORDER BY day_of_week ASC, start_time ASC`,
      [classId]
    );

    const data = rows.map((row) => ({
      id: row.id,
      class_id: row.class_id,
      subject_name: row.subject_name,
      day_of_week: row.day_of_week,
      start_time: String(row.start_time).slice(0, 5),
      end_time: String(row.end_time).slice(0, 5),
      room: row.room,
    }));

    return res.status(200).json({
      ok: true,
      class_id: classId,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Failed to fetch timetable', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/students', mobileAuth, async (req, res) => {
  if (!['teacher', 'admin'].includes(String(req.user?.role ?? ''))) {
    return res.status(403).json({
      ok: false,
      error: 'Only teacher/admin accounts can access student list',
    });
  }

  try {
    const { rows } = await getPool().query(
      `SELECT s.id,
              s.student_code,
              s.full_name,
              s.class_name,
              s.link_code,
              s.parent_id,
              u.full_name AS parent_name
       FROM students s
       LEFT JOIN users u ON u.id = s.parent_id
       ORDER BY s.student_code ASC`
    );

    const data = rows.map((row) => ({
      id: row.id,
      student_code: row.student_code,
      full_name: row.full_name,
      class_name: row.class_name,
      link_code: row.link_code,
      parent_id: row.parent_id,
      parent_name: row.parent_name,
      linked: row.parent_id != null,
    }));

    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch students list', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = { mobileRouter: router };
