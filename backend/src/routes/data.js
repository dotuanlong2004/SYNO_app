'use strict';

/**
 * Data Routes - Supabase edition
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { mobileAuth } = require('../middleware/mobileAuth');

const router = express.Router();
function debugLog(runId, hypothesisId, location, message, data) {
  // #region agent log
  fetch('http://127.0.0.1:7700/ingest/a7bdf355-c458-4118-93ed-045b1b863a17',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd0f3d'},body:JSON.stringify({sessionId:'dd0f3d',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

router.get('/attendance', mobileAuth, async (req, res) => {
  const schoolId = String(req.user?.school_id ?? 'default_school');
  const userRole = String(req.user?.role ?? '').toLowerCase();
  const studentCode = String(req.user?.student_code ?? '').trim();
  const requested = Number(req.query.limit || 100);
  const limit = Number.isFinite(requested)
    ? Math.max(1, Math.min(Math.trunc(requested), 500))
    : 100;

  const supabase = getSupabase();

  try {
    debugLog('pre-fix', 'H5', 'src/routes/data.js:/attendance', 'Attendance endpoint start', {
      schoolId,
      requestedLimit: requested,
      effectiveLimit: limit,
      userRole: req.user?.role || null,
    });
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
    debugLog('pre-fix', 'H6', 'src/routes/data.js:/attendance', 'Attendance select result', {
      hasError: !!error,
      errorMessage: error?.message || null,
      rowCount: Array.isArray(rows) ? rows.length : null,
    });

    if (error) throw error;

    return res.status(200).json({
      ok: true,
      count: rows.length,
      data: rows.map((row) => ({
        student_id: row.students?.student_code,
        timestamp: new Date(row.scanned_at).toISOString(),
        status: row.status_detail,
        late_minutes: row.late_minutes,
        log_type: row.log_type,
      })),
    });
  } catch (error) {
    debugLog('pre-fix', 'H7', 'src/routes/data.js:/attendance', 'Attendance handler exception', {
      message: error?.message || 'unknown',
      name: error?.name || 'unknown',
      details: error?.details || null,
    });
    console.error('Failed to fetch attendance data', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

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
    console.error('Failed to fetch fee notices', error);
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
    console.error('Failed to fetch announcements', error);
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
    console.error('Failed to fetch grades', error);
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
    console.error('Failed to fetch chat messages', error);
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
  if (userRole === 'parent' && studentCode != fallbackStudentCode) {
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
    console.error('Failed to send chat message', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = { dataRouter: router };
