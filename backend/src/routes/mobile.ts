'use strict';

/**
 * Mobile Routes - Supabase edition
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { mobileAuth } = require('../middleware/mobileAuth');
const { initializeFirebaseAdmin } = require('../config/firebaseAdmin');
const { saveUserFcmToken, validateFcmToken } = require('../services/userNotificationTokens');

const router = express.Router();

const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function toVietnamParts(input) {
  const date = input instanceof Date ? input : new Date(input);
  const formatter = new Intl.DateTimeFormat('vi-VN', {
    timeZone: VN_TIME_ZONE,
    hour12: false,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });

  const parts = formatter.formatToParts(date);
  const pick = (type) => parts.find((part) => part.type === type)?.value ?? '';
  const day = pick('day');
  const month = pick('month');
  const year = pick('year');
  const hour = pick('hour');
  const minute = pick('minute');
  const second = pick('second');

  return {
    date_vn: `${day}/${month}/${year}`,
    time_vn: `${hour}:${minute}:${second}`,
    timestamp_vn: `${day}/${month}/${year} ${hour}:${minute}:${second}`,
  };
}

async function getAttendanceLogs(req, res) {
  const schoolId = String(req.user?.school_id ?? '1');
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

    const data = rows.map((row) => {
      const ts = new Date(row.scanned_at);
      const vn = toVietnamParts(ts);
      return {
        student_id: row.students?.student_code,
        timestamp: ts.toISOString(),
        timestamp_vn: vn.timestamp_vn,
        date_vn: vn.date_vn,
        time_vn: vn.time_vn,
        timezone: VN_TIME_ZONE,
        status: row.status_detail,
        late_minutes: row.late_minutes,
        log_type: row.log_type,
      };
    });

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

// GET /api/v1/mobile/parent/linked-students
router.get('/parent/linked-students', mobileAuth, async (req, res) => {
  const supabase = getSupabase();
  const userId = req.user.id;
  const schoolId = String(req.user.school_id ?? '1');

  try {
    const { data, error } = await supabase
      .from('students')
      .select('id, student_code, full_name, class_name')
      .eq('parent_id', userId)
      .eq('school_id', schoolId)
      .order('id', { ascending: true });

    if (error) throw error;

    // Chỉ trả về học sinh thực sự liên kết với parent này
    return res.json({
      ok: true,
      data: (data || []).map((s) =>({
        id: s.id,
        student_code: s.student_code,
        full_name: s.full_name,
        class_name: s.class_name,
        link_code: '',
        linked: true, // Tất cả học sinh trả về đều đã liên kết thật
        parent_name: req.user.full_name || '',
      })),
    });
  } catch (err) {
    console.error('Failed to fetch linked students', err);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/timetable', mobileAuth, async (req, res) => {
  const classId = String(req.user?.class_id ?? '').trim();
  const schoolId = String(req.user?.school_id ?? '1');
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
  const schoolId = String(req.user?.school_id ?? '1');
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
  const schoolId = String(req.user?.school_id ?? '1');
  try {
    const { data, error } = await getSupabase()
      .from('announcements')
      .select('id, title, content, priority, is_general, published_at')
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
  const schoolId = String(req.user?.school_id ?? '1');
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
  const schoolId = String(req.user?.school_id ?? '1');
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
  const schoolId = String(req.user?.school_id ?? '1');
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
  let token;
  try {
    token = validateFcmToken(req.body?.fcm_token ?? req.body?.fcmToken);

    await saveUserFcmToken({ supabase: getSupabase(), userId: req.user.id, token });

    return res.json({
      ok: true,
      message: 'FCM token đã được cập nhật',
    });
  } catch (error) {
    if (String(error?.message || '').startsWith('fcm_token')) {
      return res.status(400).json({
        ok: false,
        error: error.message,
      });
    }

    console.error('Failed to update FCM token:', error);
    return res.status(500).json({
      ok: false,
      error: 'Không thể cập nhật FCM token',
    });
  }
});

module.exports = { mobileRouter: router };
