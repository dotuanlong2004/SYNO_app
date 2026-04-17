'use strict';

/**
 * Admin Routes - Supabase edition
 */

const express = require('express');
const { getSupabase, getSupabaseAnon } = require('../config/supabase');
const { mobileAuth } = require('../middleware/mobileAuth');

const router = express.Router();

function ensureAdminOrTeacher(req, res) {
  if (!['teacher', 'admin'].includes(String(req.user?.role ?? ''))) {
    res.status(403).json({
      ok: false,
      error: 'Only teacher/admin accounts can access this endpoint',
    });
    return false;
  }
  return true;
}

function ensureAdminOnly(req, res) {
  if (String(req.user?.role ?? '') !== 'admin') {
    res.status(403).json({
      ok: false,
      error: 'Only admin accounts can access this endpoint',
    });
    return false;
  }
  return true;
}

function generateDefaultPassword() {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `Aa@${suffix}`;
}

function schoolIdOf(req) {
  return String(req.user?.school_id ?? req.get('x-school-id') ?? 'default_school').trim();
}

function parseDayOfWeek(input) {
  const value = Number(input);
  if (!Number.isInteger(value) || value < 1 || value > 6) return null;
  return value;
}

function normalizeTime(value) {
  const text = String(value ?? '').trim();
  if (!/^\d{2}:\d{2}$/.test(text)) return null;
  return text;
}

router.post('/provision-parent', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();

  const studentId = Number(req.body?.student_id);
  const inputParentName = String(req.body?.parent_name ?? '').trim();
  const inputParentEmail = String(req.body?.parent_email ?? '').trim().toLowerCase();

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ ok: false, error: 'student_id is required' });
  }

  try {
    // Get student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_code, full_name, class_name, parent_id')
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    if (student.parent_id) {
      return res.status(409).json({ ok: false, error: 'Student already linked to a parent account' });
    }

    const parentName = inputParentName || `Phụ huynh ${student.full_name}`;
    const parentEmail = inputParentEmail || `parent.${String(student.student_code).toLowerCase()}@school.local`;
    const defaultPassword = generateDefaultPassword();

    // Create Supabase Auth user using admin API
    const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
      email: parentEmail,
      password: defaultPassword,
      email_confirm: true,
      user_metadata: {
        full_name: parentName,
        role: 'parent',
        school_id: schoolId,
        student_code: student.student_code
      }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        return res.status(409).json({ ok: false, error: 'Email already exists' });
      }
      console.error('Auth user creation failed:', authError);
      return res.status(500).json({ ok: false, error: 'Failed to create auth user' });
    }

    // Update profile with class_id
    await supabase
      .from('user_profiles')
      .update({ class_id: student.class_name })
      .eq('id', authUser.user.id);

    // Link student to parent
    await supabase
      .from('students')
      .update({ parent_id: authUser.user.id, updated_at: new Date().toISOString() })
      .eq('id', student.id);

    return res.status(201).json({
      ok: true,
      message: 'Provisioned parent account successfully',
      student: {
        id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
      },
      parent: {
        id: authUser.user.id,
        full_name: parentName,
        email: parentEmail,
        role: 'parent',
      },
      credentials: {
        email: parentEmail,
        password: defaultPassword,
      },
    });
  } catch (error) {
    console.error('Provision parent failed', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/mock-scan', mobileAuth, async (req, res) => {
  if (!ensureAdminOrTeacher(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const studentCode = String(req.body?.student_code ?? '').trim();
  if (!studentCode) {
    return res.status(400).json({ ok: false, error: 'student_code is required' });
  }

  try {
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('student_code', studentCode)
      .eq('school_id', schoolId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    const { data: latest } = await supabase
      .from('attendance_logs')
      .select('log_type')
      .eq('school_id', schoolId)
      .eq('student_id', student.id)
      .order('scanned_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextLogType = latest?.log_type === 'check_in' ? 'check_out' : 'check_in';
    const statusDetail = nextLogType === 'check_in' ? 'on_time' : 'leave';

    await supabase
      .from('attendance_logs')
      .insert({
        school_id: schoolId,
        student_id: student.id,
        scanned_at: new Date().toISOString(),
        log_type: nextLogType,
        status_detail: statusDetail,
        late_minutes: null
      });

    return res.status(201).json({
      ok: true,
      message: 'Mock scan recorded',
      student_code: studentCode,
      log_type: nextLogType,
    });
  } catch (error) {
    console.error('Mock scan failed', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/timetables', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('timetables')
      .select('id, class_id, subject_name, day_of_week, start_time, end_time, room, teacher_name, period')
      .eq('school_id', schoolId)
      .order('day_of_week', { ascending: true })
      .order('start_time', { ascending: true });
    if (error) throw error;
    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch timetables', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/timetables', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const classId = String(req.body?.class_id ?? '').trim();
  const subjectName = String(req.body?.subject_name ?? '').trim();
  const dayOfWeek = parseDayOfWeek(req.body?.day_of_week);
  const startTime = normalizeTime(req.body?.start_time);
  const endTime = normalizeTime(req.body?.end_time);
  const room = String(req.body?.room ?? '').trim() || null;
  const teacherName = String(req.body?.teacher_name ?? '').trim() || null;
  const period = String(req.body?.period ?? '').trim() || null;
  if (!classId || !subjectName || dayOfWeek == null || !startTime || !endTime) {
    return res.status(400).json({
      ok: false,
      error: 'class_id, subject_name, day_of_week(1-6), start_time(HH:mm), end_time(HH:mm) are required',
    });
  }
  if (startTime >= endTime) {
    return res.status(400).json({ ok: false, error: 'start_time must be earlier than end_time' });
  }
  try {
    const { data, error } = await supabase
      .from('timetables')
      .insert({
        school_id: schoolId,
        class_id: classId,
        subject_name: subjectName,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room: room,
        teacher_name: teacherName,
        period: period,
      })
      .select('id, class_id, subject_name, day_of_week, start_time, end_time, room, teacher_name, period')
      .single();
    if (error) throw error;
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to create timetable', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.put('/timetables/:id', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid timetable id' });
  }
  const classId = String(req.body?.class_id ?? '').trim();
  const subjectName = String(req.body?.subject_name ?? '').trim();
  const dayOfWeek = parseDayOfWeek(req.body?.day_of_week);
  const startTime = normalizeTime(req.body?.start_time);
  const endTime = normalizeTime(req.body?.end_time);
  const room = String(req.body?.room ?? '').trim() || null;
  const teacherName = String(req.body?.teacher_name ?? '').trim() || null;
  const period = String(req.body?.period ?? '').trim() || null;
  if (!classId || !subjectName || dayOfWeek == null || !startTime || !endTime) {
    return res.status(400).json({
      ok: false,
      error: 'class_id, subject_name, day_of_week(1-6), start_time(HH:mm), end_time(HH:mm) are required',
    });
  }
  if (startTime >= endTime) {
    return res.status(400).json({ ok: false, error: 'start_time must be earlier than end_time' });
  }
  try {
    const { data, error } = await supabase
      .from('timetables')
      .update({
        class_id: classId,
        subject_name: subjectName,
        day_of_week: dayOfWeek,
        start_time: startTime,
        end_time: endTime,
        room: room,
        teacher_name: teacherName,
        period: period,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .eq('school_id', schoolId)
      .select('id, class_id, subject_name, day_of_week, start_time, end_time, room, teacher_name, period')
      .single();
    if (error || !data) {
      return res.status(404).json({ ok: false, error: 'Timetable entry not found' });
    }
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to update timetable', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.delete('/timetables/:id', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid timetable id' });
  }
  try {
    const { error } = await supabase
      .from('timetables')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to delete timetable', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/fees', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  try {
    const { data, error } = await supabase
      .from('fee_notices')
      .select('*')
      .eq('school_id', schoolId)
      .order('created_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch fees', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/fees', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const studentCode = String(req.body?.student_code ?? '').trim();
  const classId = String(req.body?.class_id ?? '').trim() || null;
  const subjectFees = req.body?.subject_fees ?? {};
  const otherFees = req.body?.other_fees ?? {};
  const totalAmount = Number(req.body?.total_amount ?? 0);
  const paymentStatus = String(req.body?.payment_status ?? 'unpaid').trim().toLowerCase();
  const paymentMethod = String(req.body?.payment_method ?? '').trim().toLowerCase() || null;
  const paidAtInput = req.body?.paid_at ? new Date(req.body.paid_at) : null;
  if (!studentCode || !Number.isFinite(totalAmount) || totalAmount < 0) {
    return res.status(400).json({
      ok: false,
      error: 'student_code and total_amount (>=0) are required',
    });
  }
  if (!['unpaid', 'partial', 'paid'].includes(paymentStatus)) {
    return res.status(400).json({ ok: false, error: 'payment_status must be unpaid|partial|paid' });
  }
  if (paymentMethod && !['online', 'cash'].includes(paymentMethod)) {
    return res.status(400).json({ ok: false, error: 'payment_method must be online|cash' });
  }
  if (paidAtInput && Number.isNaN(paidAtInput.getTime())) {
    return res.status(400).json({ ok: false, error: 'Invalid paid_at timestamp' });
  }
  try {
    const { data, error } = await supabase
      .from('fee_notices')
      .insert({
        school_id: schoolId,
        student_code: studentCode,
        class_id: classId,
        subject_fees: subjectFees,
        other_fees: otherFees,
        total_amount: totalAmount,
        payment_status: paymentStatus,
        payment_method: paymentMethod,
        paid_at: paidAtInput ? paidAtInput.toISOString() : null,
      })
      .select('*')
      .single();
    if (error) throw error;
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to create fee notice', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.put('/fees/:id', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid fee id' });
  }
  const payload = {};
  if (req.body?.student_code != null) payload.student_code = String(req.body.student_code).trim();
  if (req.body?.class_id != null) payload.class_id = String(req.body.class_id).trim() || null;
  if (req.body?.subject_fees != null) payload.subject_fees = req.body.subject_fees;
  if (req.body?.other_fees != null) payload.other_fees = req.body.other_fees;
  if (req.body?.total_amount != null) {
    const totalAmount = Number(req.body.total_amount);
    if (!Number.isFinite(totalAmount) || totalAmount < 0) {
      return res.status(400).json({ ok: false, error: 'total_amount must be >= 0' });
    }
    payload.total_amount = totalAmount;
  }
  if (req.body?.payment_status != null) {
    const paymentStatus = String(req.body.payment_status).trim().toLowerCase();
    if (!['unpaid', 'partial', 'paid'].includes(paymentStatus)) {
      return res.status(400).json({ ok: false, error: 'payment_status must be unpaid|partial|paid' });
    }
    payload.payment_status = paymentStatus;
  }
  if (req.body?.payment_method !== undefined) {
    const paymentMethod = req.body.payment_method == null
      ? null
      : String(req.body.payment_method).trim().toLowerCase();
    if (paymentMethod && !['online', 'cash'].includes(paymentMethod)) {
      return res.status(400).json({ ok: false, error: 'payment_method must be online|cash' });
    }
    payload.payment_method = paymentMethod;
  }
  if (req.body?.paid_at !== undefined) {
    if (req.body.paid_at == null || req.body.paid_at === '') {
      payload.paid_at = null;
    } else {
      const paidAt = new Date(req.body.paid_at);
      if (Number.isNaN(paidAt.getTime())) {
        return res.status(400).json({ ok: false, error: 'Invalid paid_at timestamp' });
      }
      payload.paid_at = paidAt.toISOString();
    }
  }
  payload.updated_at = new Date().toISOString();
  try {
    const { data, error } = await supabase
      .from('fee_notices')
      .update(payload)
      .eq('id', id)
      .eq('school_id', schoolId)
      .select('*')
      .single();
    if (error || !data) return res.status(404).json({ ok: false, error: 'Fee notice not found' });
    return res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to update fee notice', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.delete('/fees/:id', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid fee id' });
  }
  try {
    const { error } = await supabase
      .from('fee_notices')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to delete fee notice', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/announcements', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  try {
    const { data, error } = await getSupabase()
      .from('announcements')
      .select('*')
      .eq('school_id', schoolId)
      .order('published_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch announcements', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/announcements', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const title = String(req.body?.title ?? '').trim();
  const content = String(req.body?.content ?? '').trim();
  const isGeneral = Boolean(req.body?.is_general ?? true);
  if (!title || !content) {
    return res.status(400).json({ ok: false, error: 'title and content are required' });
  }
  try {
    const { data, error } = await getSupabase()
      .from('announcements')
      .insert({
        school_id: schoolId,
        title,
        content,
        is_general: isGeneral,
        published_at: new Date().toISOString(),
        created_by: req.user.id,
      })
      .select('*')
      .single();
    if (error) throw error;
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to create announcement', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.delete('/announcements/:id', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid announcement id' });
  }
  try {
    const { error } = await getSupabase()
      .from('announcements')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to delete announcement', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.get('/grades', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  try {
    const { data, error } = await getSupabase()
      .from('grade_records')
      .select('*')
      .eq('school_id', schoolId)
      .order('updated_at', { ascending: false });
    if (error) throw error;
    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch grades', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/grades', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const studentCode = String(req.body?.student_code ?? '').trim();
  const subjectName = String(req.body?.subject_name ?? '').trim();
  const midtermScore = Number(req.body?.midterm_score ?? 0);
  const finalScore = Number(req.body?.final_score ?? 0);
  if (!studentCode || !subjectName) {
    return res.status(400).json({ ok: false, error: 'student_code and subject_name are required' });
  }
  if (!Number.isFinite(midtermScore) || !Number.isFinite(finalScore)) {
    return res.status(400).json({ ok: false, error: 'Scores must be numeric' });
  }
  try {
    const { data, error } = await getSupabase()
      .from('grade_records')
      .insert({
        school_id: schoolId,
        student_code: studentCode,
        subject_name: subjectName,
        midterm_score: midtermScore,
        final_score: finalScore,
      })
      .select('*')
      .single();
    if (error) throw error;
    return res.status(201).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to create grade', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.delete('/grades/:id', mobileAuth, async (req, res) => {
  if (!ensureAdminOnly(req, res)) return;
  const schoolId = schoolIdOf(req);
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid grade id' });
  }
  try {
    const { error } = await getSupabase()
      .from('grade_records')
      .delete()
      .eq('id', id)
      .eq('school_id', schoolId);
    if (error) throw error;
    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to delete grade', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = { adminRouter: router };
