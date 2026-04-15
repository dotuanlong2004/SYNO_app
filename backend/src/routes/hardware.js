'use strict';

const express = require('express');
const { getRedis } = require('../config/redis');
const { attendanceQueue } = require('../queues/attendanceQueue');
const { hardwareApiKey } = require('../middleware/hardwareApiKey');

const router = express.Router();

const DEBOUNCE_TTL_SEC = 300;
const DEBOUNCE_PREFIX = 'attendance:debounce:';

router.post('/scan', hardwareApiKey, async (req, res) => {
  const rawId = req.body?.student_id ?? req.body?.studentId;
  const timestamp = req.body?.timestamp ?? req.body?.time ?? req.body?.ts;

  if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
    return res.status(400).json({ ok: false, error: 'student_id is required' });
  }

  const studentCode = String(rawId).trim();
  if (studentCode.length > 64) {
    return res.status(400).json({ ok: false, error: 'student_id too long' });
  }

  let scannedAt;
  if (timestamp !== undefined && timestamp !== null && String(timestamp) !== '') {
    scannedAt = new Date(timestamp);
    if (Number.isNaN(scannedAt.getTime())) {
      return res.status(400).json({ ok: false, error: 'Invalid timestamp' });
    }
  } else {
    scannedAt = new Date();
  }

  const redis = getRedis();
  const debounceKey = `${DEBOUNCE_PREFIX}${studentCode}`;

  const setResult = await redis.set(debounceKey, '1', 'EX', DEBOUNCE_TTL_SEC, 'NX');
  if (setResult !== 'OK') {
    return res.status(200).json({
      ok: true,
      duplicate: true,
      debounced: true,
      message: 'Ignored: duplicate scan within debounce window',
    });
  }

  try {
    await attendanceQueue.add(
      'scan',
      {
        studentCode,
        scannedAtIso: scannedAt.toISOString(),
      },
      {}
    );
  } catch (err) {
    await redis.del(debounceKey);
    console.error('Queue add failed:', err);
    return res.status(503).json({ ok: false, error: 'Queue unavailable' });
  }

  return res.status(200).json({
    ok: true,
    queued: true,
    student_id: studentCode,
    timestamp: scannedAt.toISOString(),
  });
});

module.exports = { hardwareRouter: router };
