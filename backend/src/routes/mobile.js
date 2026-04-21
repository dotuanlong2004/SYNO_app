'use strict';

/**
 * Mobile Routes - Supabase edition
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { mobileAuth } = require('../middleware/mobileAuth');
const { initializeFirebaseAdmin } = require('../config/firebaseAdmin');

const router = express.Router();

async function getAttendanceLogs(req, res) {
  const schoolId = String(req.user?.school_id ?? 'default_school');
  const userRole = String(req.user?.role ?? '').toLowerCase();
  const studentCode = String(req.user?.student_code ?? '').trim();
  const requested = Number(req.query.limit || 50);
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(Math.trunc(requested), 200))
    : 50;

  const supabase = getSupabase();

  try {
    let query = supabase
      .from('attendance_logs')
      .select('scanned_at, status_detail, late_minutes, log_type, students!inner(student_code)')
      .eq('school_id', schoolId)
      .order('scanned_at', { ascending: false })
      .limit(limit);

    if (userRole === 'parent') {
      if (!studentCode) {
        return res.status(400).json({
          ok: false,
          error: 'Parent account is not linked to any student_code',
        });
      }
      query = query.eq('students.student_code', studentCode);
    }

    const { data: rows, error } = await query;

    if (error) throw error;

    const data = rows.map((row) => ({
      student_id: row.students?.student_code,
      timestamp: new Date(row.scanned_at).toISOString(),
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
  const schoolId = String(req.user?.school_id ?? 'default_school');
  const userRole = req.user?.role || 'parent';
  
  // Admin gets all timetables, parent gets only their class
  if (userRole !== 'admin' && !classId) {
    return res.status(400).json({
      ok: false,
      error: 'No class_id found for current user',
    });
  }

  const supabase = getSupabase();

  try {
    let query = supabase
      .from('timetables')
      .select('id, class_id, subject_name, day_of_week, start_time, end_time, room, teacher_name, period')
      .eq('school_id', schoolId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    
    // Only filter by class_id for non-admin users
    if (userRole !== 'admin' && classId) {
      query = query.eq('class_id', classId);
    }
    
    const { data: rows, error } = await query;

    if (error) throw error;

    const data = rows.map((row) => ({
      id: row.id,
      class_id: row.class_id,
      subject_name: row.subject_name,
      day_of_week: row.day_of_week,
      period: row.period,
      start_time: String(row.start_time).slice(0, 5),
      end_time: String(row.end_time).slice(0, 5),
      room: row.room,
      teacher_name: row.teacher_name,
    }));

    return res.status(200).json({
      ok: true,
      class_id: classId,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Failed to fetch timetable:', error.message, error.details || '');
    return res.status(500).json({
      ok: false,
      error: 'Failed to fetch timetable: ' + (error.message || 'Unknown error'),
    });
  }
});

router.get('/fees', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? 'default_school');
  const userRole = String(req.user?.role ?? '').toLowerCase();
  const studentCode = String(req.user?.student_code ?? '').trim();
  const supabase = getSupabase();

  try {
    let query = supabase
      .from('fee_notices')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (userRole === 'parent') {
      if (!studentCode) {
        return res.status(400).json({
          ok: false,
          error: 'Parent account is not linked to any student_code',
        });
      }
      query = query.eq('student_code', studentCode);
    }

    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json({
      ok: true,
      count: data.length,
      data,
    });
  } catch (error) {
    console.error('Failed to fetch mobile fee notices', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/announcements', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? 'default_school');
  try {
    const { data, error } = await getSupabase()
      .from('announcements')
      .select('id, title, content, is_general, published_at')
      .eq('school_id', schoolId)
      .order('published_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch mobile announcements', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/grades', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? 'default_school');
  const userRole = String(req.user?.role ?? '').toLowerCase();
  const studentCode = String(req.user?.student_code ?? '').trim();
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('grade_records')
      .select('*')
      .eq('school_id', schoolId)
      .order('updated_at', { ascending: false })
      .limit(200);
    if (userRole === 'parent') {
      if (!studentCode) {
        return res.status(400).json({ ok: false, error: 'Parent account is not linked to any student_code' });
      }
      query = query.eq('student_code', studentCode);
    }
    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch mobile grades', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/chat/messages', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? 'default_school');
  const userRole = String(req.user?.role ?? '').toLowerCase();
  const studentCode = String(req.user?.student_code ?? '').trim();
  const supabase = getSupabase();
  try {
    let query = supabase
      .from('chat_messages')
      .select('id, student_code, sender_role, sender_name, message_text, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (userRole === 'parent') {
      if (!studentCode) {
        return res.status(400).json({ ok: false, error: 'Parent account is not linked to any student_code' });
      }
      query = query.eq('student_code', studentCode);
    }
    const { data, error } = await query;
    if (error) throw error;
    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch mobile chat messages', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/chat/messages', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? 'default_school');
  const userRole = String(req.user?.role ?? '').toLowerCase();
  const fallbackStudentCode = String(req.user?.student_code ?? '').trim();
  const studentCode = String(req.body?.student_code ?? fallbackStudentCode).trim();
  const messageText = String(req.body?.message_text ?? '').trim();
  if (!studentCode || !messageText) {
    return res.status(400).json({ ok: false, error: 'student_code and message_text are required' });
  }
  if (userRole === 'parent' && studentCode !== fallbackStudentCode) {
    return res.status(403).json({ ok: false, error: 'Parent can only send for linked student_code' });
  }
  try {
    const { data, error } = await getSupabase()
      .from('chat_messages')
      .insert({
        school_id: schoolId,
        student_code: studentCode,
        sender_role: userRole || 'parent',
        sender_id: req.user.id,
        sender_name: req.user.full_name || req.user.email || 'Unknown',
        message_text: messageText,
      })
      .select('id, student_code, sender_role, sender_name, message_text, created_at')
      .single();
    if (error) throw error;
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to send mobile chat message', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

/**
 * Cập nhật FCM token cho user (để nhận push notification)
 * POST /api/mobile/fcm-token
 */
router.post('/fcm-token', mobileAuth, async (req, res) => {
  try {
    const { fcm_token } = req.body;

    if (!fcm_token || typeof fcm_token !== 'string') {
      return res.status(400).json({
        ok: false,
        error: 'fcm_token là bắt buộc và phải là string',
      });
    }

    const supabase = getSupabase();
    const { error: updateError } = await supabase
      .from('users')
      .update({ fcm_token })
      .eq('id', req.user.id);

    if (updateError) throw updateError;

    return res.json({
      ok: true,
      message: 'FCM token đã được cập nhật',
    });
  } catch (error) {
    console.error('Failed to update FCM token:', error);
    return res.status(500).json({
      ok: false,
      error: 'Không thể cập nhật FCM token',
    });
  }
});

module.exports = { mobileRouter: router };
