'use strict';

const express = require('express');
const { getPool } = require('../config/database');
const { mobileAuth } = require('../middleware/mobileAuth');

const router = express.Router();

router.post('/fcm-token', mobileAuth, async (req, res) => {
  const token = String(req.body?.fcm_token ?? req.body?.fcmToken ?? '').trim();

  if (!token) {
    return res.status(400).json({ ok: false, error: 'fcm_token is required' });
  }

  if (token.length > 4096) {
    return res.status(400).json({ ok: false, error: 'fcm_token too long' });
  }

  try {
    await getPool().query(
      `UPDATE users
       SET fcm_token = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [token, req.user.id]
    );

    return res.status(200).json({ ok: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('Failed to save FCM token', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.put('/student-code', mobileAuth, async (req, res) => {
  const studentCode = String(
    req.body?.student_code ?? req.body?.studentCode ?? ''
  ).trim();

  if (!studentCode) {
    return res.status(400).json({ ok: false, error: 'student_code is required' });
  }

  if (studentCode.length > 64) {
    return res.status(400).json({ ok: false, error: 'student_code too long' });
  }

  try {
    // Ensure student exists so linking is deterministic.
    await getPool().query(
      `INSERT INTO students (student_code, full_name)
       VALUES ($1, $2)
       ON CONFLICT (student_code) DO UPDATE SET updated_at = NOW()`,
      [studentCode, 'Pending registration']
    );

    await getPool().query(
      `UPDATE users
       SET student_code = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [studentCode, req.user.id]
    );

    return res.status(200).json({
      ok: true,
      message: 'Linked account to student code',
      student_code: studentCode,
    });
  } catch (error) {
    console.error('Failed to link student code', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = { usersRouter: router };
