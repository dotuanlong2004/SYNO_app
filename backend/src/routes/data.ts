'use strict';

/**
 * Data Routes - Supabase edition
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { mobileAuth } = require('../middleware/mobileAuth');
const {
  attachStudentCodesToChatMessages,
  findChatStudentByCode,
} = require('../services/adminWebChatMessages');

const router = express.Router();
const VN_TIME_ZONE = 'Asia/Ho_Chi_Minh';

function getRequestOrigin(req) {
  const forwardedProto = String(req.get('x-forwarded-proto') || '').split(',')[0].trim();
  const proto = forwardedProto || req.protocol || 'http';
  return `${proto}://${req.get('host')}`;
}

function normalizeBackendAssetUrl(req, value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  let parsed;
  const cleanedRaw = raw.replace('/api/v1/uploads/', '/uploads/');
  try {
    parsed = new URL(cleanedRaw, getRequestOrigin(req));
  } catch (_) {
    return raw;
  }

  const path = parsed.pathname.replace('/api/v1/uploads/', '/uploads/');
  if (parsed.hostname === '127.0.0.1' || parsed.hostname === 'localhost' || path !== parsed.pathname) {
    return `${getRequestOrigin(req)}${path}${parsed.search}`;
  }

  return parsed.toString();
}

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

router.get('/attendance', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? '1');
  const userRole = String(req.user?.role ?? '').toLowerCase();
  const studentCode = String(req.user?.student_code ?? '').trim();
  const requested = Number(req.query.limit || 100);
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(Math.trunc(requested), 500))
    : 100;

  const supabase = getSupabase();

  try {
    // Tính mốc 6AM VN (UTC+7) của ngày hôm nay → UTC
    const nowVN = new Date(Date.now() + 7 * 60 * 60 * 1000);
    const todayVN = new Date(Date.UTC(nowVN.getUTCFullYear(), nowVN.getUTCMonth(), nowVN.getUTCDate(), 0, 0, 0));
    const resetHourUTC = 6 - 7; // 6AM VN = 23:00 UTC previous day → -1h
    const dayResetUTC = new Date(todayVN.getTime() + resetHourUTC * 60 * 60 * 1000);

    let query = supabase
      .from('attendance_logs')
      .select('scanned_at, status_detail, late_minutes, log_type, students!inner(student_code)')
      .eq('school_id', schoolId)
      .gte('scanned_at', dayResetUTC.toISOString())
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

    return res.status(200).json({
      ok: true,
      count: rows.length,
      data: rows.map((row) => {
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
      }),
    });
  } catch (error) {
    console.error('Failed to fetch attendance data', error);
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

    return res.status(200).json({
      ok: true,
      count: rows.length,
      data: rows.map((row) => ({
        id: row.id,
        class_id: row.class_id,
        subject_name: row.subject_name,
        day_of_week: row.day_of_week,
        period: row.period,
        start_time: String(row.start_time).slice(0, 5),
        end_time: String(row.end_time).slice(0, 5),
        room: row.room,
        teacher_name: row.teacher_name,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch timetable data', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
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
    console.error('Failed to fetch fee notices', error);
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
    console.error('Failed to fetch announcements', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/events', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? '1');
  try {
    const { data, error } = await getSupabase()
      .from('school_events')
      .select('id, title, content, image_url, event_date, published_at')
      .eq('school_id', schoolId)
      .order('published_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return res.status(200).json({
      ok: true,
      count: data.length,
      data: (data || []).map((event) => ({
        ...event,
        image_url: normalizeBackendAssetUrl(req, event.image_url),
      })),
    });
  } catch (error) {
    console.error('Failed to fetch events', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/events/:eventId/comments', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? '1');
  const eventId = Number(req.params.eventId);
  if (!Number.isFinite(eventId)) {
    return res.status(400).json({ ok: false, error: 'eventId is invalid' });
  }
  try {
    const { data, error } = await getSupabase()
      .from('school_event_comments')
      .select('id, event_id, parent_id, comment_text, created_at')
      .eq('school_id', schoolId)
      .eq('event_id', eventId)
      .order('created_at', { ascending: false })
      .limit(100);
    if (error) throw error;
    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch event comments', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/events/:eventId/comments', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? '1');
  const eventId = Number(req.params.eventId);
  const commentText = String(req.body?.comment_text || '').trim();
  if (!Number.isFinite(eventId) || !commentText) {
    return res.status(400).json({ ok: false, error: 'eventId and comment_text are required' });
  }

  try {
    const supabase = getSupabase();
    const { data: eventRow, error: eventError } = await supabase
      .from('school_events')
      .select('id')
      .eq('id', eventId)
      .eq('school_id', schoolId)
      .maybeSingle();
    if (eventError) throw eventError;
    if (!eventRow) {
      return res.status(404).json({ ok: false, error: 'Event not found' });
    }

    const { data, error } = await supabase
      .from('school_event_comments')
      .insert({
        event_id: eventId,
        school_id: schoolId,
        parent_id: req.user.id,
        comment_text: commentText,
      })
      .select('id, event_id, parent_id, comment_text, created_at')
      .single();
    if (error) throw error;
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to create event comment', error);
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
    console.error('Failed to fetch grades', error);
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
      .select('id, school_id, student_id, sender_role, sender_name, message_text, created_at')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: true })
      .limit(200);
    if (userRole === 'parent') {
      if (!studentCode) {
        return res.status(400).json({ ok: false, error: 'Parent account is not linked to any student_code' });
      }
      const student = await findChatStudentByCode({ supabase, schoolId, studentCode });
      if (!student) {
        return res.status(200).json({ ok: true, count: 0, data: [] });
      }
      query = query.eq('student_id', student.id);
    }
    const { data, error } = await query;
    if (error) throw error;
    const rows = await attachStudentCodesToChatMessages({ supabase, schoolId, rows: data || [] });
    return res.status(200).json({ ok: true, count: rows.length, data: rows });
  } catch (error) {
    console.error('Failed to fetch chat messages', error);
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
  if (userRole === 'parent' && studentCode != fallbackStudentCode) {
    return res.status(403).json({ ok: false, error: 'Parent can only send for linked student_code' });
  }
  try {
    const supabase = getSupabase();
    const student = await findChatStudentByCode({ supabase, schoolId, studentCode });
    if (!student) {
      return res.status(404).json({ ok: false, error: `student_code ${studentCode} was not found in school ${schoolId}` });
    }

    const { data, error } = await supabase
      .from('chat_messages')
      .insert({
        school_id: schoolId,
        student_id: student.id,
        sender_role: userRole || 'parent',
        sender_id: req.user.id,
        sender_name: req.user.full_name || req.user.email || 'Unknown',
        message_text: messageText,
      })
      .select('id, school_id, student_id, sender_role, sender_name, message_text, created_at')
      .single();
    if (error) throw error;
    return res.status(201).json({ ok: true, data: { ...data, student_code: studentCode } });
  } catch (error) {
    console.error('Failed to send chat message', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = { dataRouter: router };
