'use strict';

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { mobileAuth } = require('../middleware/mobileAuth');
const { saveUserFcmToken, validateFcmToken } = require('../services/userNotificationTokens');

const router = express.Router();

// Update FCM token in user_profiles
router.post('/fcm-token', mobileAuth, async (req, res) => {
  let token;
  try {
    token = validateFcmToken(req.body?.fcm_token ?? req.body?.fcmToken);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  try {
    await saveUserFcmToken({ supabase: getSupabase(), userId: req.user.id, token });
    return res.status(200).json({ ok: true, message: 'FCM token saved' });
  } catch (error) {
    console.error('Failed to save FCM token', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

// Link user to student code
router.put('/student-code', mobileAuth, async (req, res) => {
  const studentCode = String(req.body?.student_code ?? '').trim();
  if (!studentCode) return res.status(400).json({ ok: false, error: 'student_code required' });

  try {
    await getSupabase()
      .from('user_profiles')
      .update({ student_code: studentCode, updated_at: new Date().toISOString() })
      .eq('id', req.user.id);
    return res.status(200).json({ ok: true, message: 'Linked to student code', student_code: studentCode });
  } catch (error) {
    console.error('Failed to link student code', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = { usersRouter: router };
