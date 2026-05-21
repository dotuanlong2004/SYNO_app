'use strict';

/**
 * Admin Web Routes - No Authentication Required
 * Chỉ dùng trong mạng nội bộ, không expose ra internet
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');

const router = express.Router();

// Middleware để set school_id từ header
function setSchoolId(req, res, next) {
  req.schoolId = req.get('x-school-id') || '1';
  next();
}

router.use(setSchoolId);

// GET /admin-web/students
router.get('/students', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('school_id', req.schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// GET /admin-web/timetables
router.get('/timetables', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('timetables')
    .select('*')
    .eq('school_id', req.schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// GET /admin-web/fees
router.get('/fees', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('fee_notices')
    .select('*')
    .eq('school_id', req.schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// GET /admin-web/announcements
router.get('/announcements', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('announcements')
    .select('*')
    .eq('school_id', req.schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// GET /admin-web/grades
router.get('/grades', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('grades')
    .select('*')
    .eq('school_id', req.schoolId)
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// POST /admin-web/students/bulk  — Excel import (upsert by student_code)
router.post('/students/bulk', async (req, res) => {
  const supabase = getSupabase();
  const { rows } = req.body;

  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ ok: false, error: 'rows must be a non-empty array' });
  }

  // Validate and sanitise each row
  const sanitised = [];
  const invalid = [];
  for (let i = 0; i < rows.length; i++) {
    const r = rows[i];
    const student_code = String(r.student_code || '').trim();
    const full_name = String(r.full_name || '').trim();
    const class_name = String(r.class_name || '').trim();

    if (!student_code || !full_name) {
      invalid.push({ row: i + 1, reason: 'student_code và full_name không được để trống', data: r });
      continue;
    }

    sanitised.push({ student_code, full_name, class_name: class_name || null, school_id: req.schoolId });
  }

  if (sanitised.length === 0) {
    return res.status(400).json({ ok: false, error: 'Không có dòng hợp lệ để import', invalid });
  }

  try {
    const { data, error } = await supabase
      .from('students')
      .upsert(sanitised, { onConflict: 'student_code', ignoreDuplicates: false })
      .select('id, student_code, full_name, class_name');

    if (error) {
      console.error('[students/bulk] Supabase upsert error:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.status(200).json({
      ok: true,
      inserted: data.length,
      invalid: invalid.length > 0 ? invalid : undefined,
      data,
    });
  } catch (e) {
    console.error('[students/bulk] Unexpected error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /admin-web/students
router.post('/students', async (req, res) => {
  const supabase = getSupabase();
  const { student_code, full_name, class_name } = req.body;

  const { data, error } = await supabase
    .from('students')
    .insert({
      student_code,
      full_name,
      class_name,
      school_id: req.schoolId,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.status(201).json({ ok: true, data });
});

// PUT /admin-web/students/:id
router.put('/students/:id', async (req, res) => {
  const supabase = getSupabase();
  const { full_name, class_name } = req.body;

  const { data, error } = await supabase
    .from('students')
    .update({ full_name, class_name })
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// DELETE /admin-web/students/:id
router.delete('/students/:id', async (req, res) => {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true });
});

// POST /admin-web/timetables
router.post('/timetables', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('timetables')
    .insert({ ...req.body, school_id: req.schoolId })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.status(201).json({ ok: true, data });
});

// PUT /admin-web/timetables/:id
router.put('/timetables/:id', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('timetables')
    .update(req.body)
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// DELETE /admin-web/timetables/:id
router.delete('/timetables/:id', async (req, res) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('timetables')
    .delete()
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true });
});

// POST /admin-web/provision-parent
router.post('/provision-parent', async (req, res) => {
  const supabase = getSupabase();
  const { student_id, parent_name, parent_email, parent_phone, password } = req.body;

  console.log('[provision-parent] Request:', { student_id, parent_email });

  try {
    // Get student
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_code, full_name')
      .eq('id', student_id)
      .eq('school_id', req.schoolId)
      .single();

    if (studentError || !student) {
      console.log('[provision-parent] Student not found:', studentError);
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    // Use provided values or generate defaults
    const finalParentName = parent_name || `Phụ huynh ${student.full_name}`;
    const finalParentEmail = parent_email || `parent.${student.student_code}@school.local`;
    const finalPassword = password || `Parent@${student.student_code}`;

    console.log('[provision-parent] Final email:', finalParentEmail);

    // Check if user already exists by email
    let existingUser = null;
    try {
      const { data: listResult } = await supabase.auth.admin.listUsers();
      console.log('[provision-parent] List users count:', listResult?.users?.length);
      if (listResult?.users) {
        existingUser = listResult.users.find(u => u.email?.toLowerCase() === finalParentEmail.toLowerCase());
      }
    } catch (e) {
      console.log('[provision-parent] List users error:', e.message);
    }
    
    console.log('[provision-parent] Existing user:', existingUser ? 'YES' : 'NO');

    let authUserId;
    let isExisting = false;

    if (existingUser) {
      // User exists - update metadata
      console.log('[provision-parent] Updating existing user:', existingUser.id);
      const { error: updateError } = await supabase.auth.admin.updateUserById(
        existingUser.id,
        {
          user_metadata: {
            full_name: finalParentName,
            phone: parent_phone || '',
            role: 'parent',
            school_id: req.schoolId,
            student_code: student.student_code
          }
        }
      );
      
      if (updateError) {
        console.log('[provision-parent] Update error:', updateError);
        return res.status(500).json({ ok: false, error: updateError.message });
      }
      
      authUserId = existingUser.id;
      isExisting = true;
    } else {
      // Try to create new user
      console.log('[provision-parent] Creating new user');
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: finalParentEmail,
        password: finalPassword,
        email_confirm: true,
        user_metadata: {
          full_name: finalParentName,
          phone: parent_phone || '',
          role: 'parent',
          school_id: req.schoolId,
          student_code: student.student_code
        }
      });

      if (authError) {
        // If user already exists, find and update them
        if (authError.message?.includes('already been registered') || authError.code === 'email_exists') {
          console.log('[provision-parent] User exists (from error), finding...');
          const { data: listResult2 } = await supabase.auth.admin.listUsers();
          const foundUser = listResult2?.users?.find(u => u.email?.toLowerCase() === finalParentEmail.toLowerCase());
          
          if (foundUser) {
            console.log('[provision-parent] Found existing user:', foundUser.id);
            const { error: updateError2 } = await supabase.auth.admin.updateUserById(
              foundUser.id,
              {
                user_metadata: {
                  full_name: finalParentName,
                  phone: parent_phone || '',
                  role: 'parent',
                  school_id: req.schoolId,
                  student_code: student.student_code
                }
              }
            );
            
            if (updateError2) {
              return res.status(500).json({ ok: false, error: updateError2.message });
            }
            
            authUserId = foundUser.id;
            isExisting = true;
          } else {
            return res.status(500).json({ ok: false, error: 'User exists but could not be found' });
          }
        } else {
          console.log('[provision-parent] Create error:', authError);
          return res.status(500).json({ ok: false, error: authError.message });
        }
      } else {
        authUserId = authUser.user.id;
      }
    }

    // Update student with parent_id
    await supabase
      .from('students')
      .update({ parent_id: authUserId })
      .eq('id', student_id);

    console.log('[provision-parent] Success, parent_id:', authUserId);

    return res.json({
      ok: true,
      message: isExisting ? 'Cập nhật tài khoản phụ huynh thành công' : 'Tạo tài khoản phụ huynh thành công',
      data: {
        parent_id: authUserId,
        parent_email: finalParentEmail,
        parent_name: finalParentName,
        password: isExisting ? '(giữ nguyên)' : finalPassword,
        student_code: student.student_code,
        is_existing: isExisting
      }
    });
  } catch (e) {
    console.log('[provision-parent] Exception:', e.message);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// POST /admin-web/announcements
router.post('/announcements', async (req, res) => {
  const supabase = getSupabase();
  const { title, content, is_general } = req.body;

  if (!title || !content) {
    return res.status(400).json({ ok: false, error: 'Tiêu đề và nội dung không được để trống' });
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert({
      title,
      content,
      is_general: is_general !== undefined ? Boolean(is_general) : true,
      school_id: req.schoolId,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.status(201).json({ ok: true, data });
});

// DELETE /admin-web/announcements/:id
router.delete('/announcements/:id', async (req, res) => {
  const supabase = getSupabase();

  const { error } = await supabase
    .from('announcements')
    .delete()
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true });
});

// POST /admin-web/fees
router.post('/fees', async (req, res) => {
  const supabase = getSupabase();
  const studentCode = String(req.body.student_code || '').trim();
  if (!studentCode) {
    return res.status(400).json({ ok: false, error: 'student_code is required' });
  }
  // Look up student_id from student_code
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('student_code', studentCode)
    .eq('school_id', req.schoolId)
    .maybeSingle();

  const { data, error } = await supabase
    .from('fee_notices')
    .insert({
      school_id: req.schoolId,
      student_id: student?.id || null,
      student_code: studentCode,
      class_id: req.body.class_id || null,
      subject_fees: req.body.subject_fees || {},
      other_fees: req.body.other_fees || {},
      total_amount: Number(req.body.total_amount || 0),
      payment_status: req.body.payment_status || 'unpaid',
      payment_method: req.body.payment_method || null,
      paid_at: req.body.paid_at || null,
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.status(201).json({ ok: true, data });
});

// PUT /admin-web/fees/:id
router.put('/fees/:id', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('fee_notices')
    .update({
      student_code: req.body.student_code,
      class_id: req.body.class_id || null,
      subject_fees: req.body.subject_fees || {},
      other_fees: req.body.other_fees || {},
      total_amount: Number(req.body.total_amount || 0),
      payment_status: req.body.payment_status || 'unpaid',
      payment_method: req.body.payment_method || null,
      paid_at: req.body.paid_at || null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// DELETE /admin-web/fees/:id
router.delete('/fees/:id', async (req, res) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('fee_notices')
    .delete()
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true });
});

// POST /admin-web/grades
router.post('/grades', async (req, res) => {
  const supabase = getSupabase();
  const studentCode = String(req.body.student_code || '').trim();
  const subjectName = String(req.body.subject_name || '').trim();
  if (!studentCode || !subjectName) {
    return res.status(400).json({ ok: false, error: 'student_code and subject_name are required' });
  }
  // Look up student_id from student_code
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('student_code', studentCode)
    .eq('school_id', req.schoolId)
    .maybeSingle();

  if (!student) {
    return res.status(404).json({ ok: false, error: `Kh\u00f4ng t\u00ecm th\u1ea5y h\u1ecdc sinh v\u1edbi m\u00e3 ${studentCode}` });
  }

  const midterm = Number(req.body.midterm_score ?? 0);
  const final = Number(req.body.final_score ?? 0);
  const average = Math.round(((midterm * 1 + final * 2) / 3) * 10) / 10;

  const { data, error } = await supabase
    .from('grades')
    .insert({
      school_id: req.schoolId,
      student_id: student.id,
      student_code: studentCode,
      subject_name: subjectName,
      midterm_score: midterm,
      final_score: final,
      average_score: average,
      semester: req.body.semester || '1',
      academic_year: req.body.academic_year || '2024-2025',
    })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.status(201).json({ ok: true, data });
});

// DELETE /admin-web/grades/:id
router.delete('/grades/:id', async (req, res) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('grades')
    .delete()
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true });
});

// POST /admin-web/timetables/bulk
router.post('/timetables/bulk', async (req, res) => {
  const supabase = getSupabase();
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ ok: false, error: 'rows must be a non-empty array' });
  }
  const sanitised = rows
    .map((r) => ({
      school_id: req.schoolId,
      class_id: String(r.class_id || '').trim(),
      subject_name: String(r.subject_name || '').trim(),
      day_of_week: Number(r.day_of_week) || 1,
      start_time: String(r.start_time || '07:30').trim().slice(0, 5),
      end_time: String(r.end_time || '08:15').trim().slice(0, 5),
      room: String(r.room || '').trim() || null,
      teacher_name: String(r.teacher_name || '').trim() || null,
      period: String(r.period || '').trim() || null,
    }))
    .filter((r) => r.class_id && r.subject_name);

  if (sanitised.length === 0) {
    return res.status(400).json({ ok: false, error: 'Không có dòng hợp lệ (cần class_id và subject_name)' });
  }
  const { data, error } = await supabase.from('timetables').insert(sanitised).select('id');
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(201).json({ ok: true, inserted: data.length });
});

// POST /admin-web/fees/bulk
router.post('/fees/bulk', async (req, res) => {
  const supabase = getSupabase();
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ ok: false, error: 'rows must be a non-empty array' });
  }
  const valid = rows.filter((r) => String(r.student_code || '').trim());
  if (valid.length === 0) {
    return res.status(400).json({ ok: false, error: 'Không có dòng hợp lệ (cần student_code)' });
  }
  // Cache student IDs
  const cache = {};
  const toInsert = [];
  for (const r of valid) {
    const code = String(r.student_code).trim();
    if (cache[code] === undefined) {
      const { data: s } = await supabase.from('students').select('id').eq('student_code', code).eq('school_id', req.schoolId).maybeSingle();
      cache[code] = s?.id || null;
    }
    const status = ['unpaid', 'partial', 'paid'].includes(r.payment_status) ? r.payment_status : 'unpaid';
    const method = ['online', 'cash'].includes(r.payment_method) ? r.payment_method : null;
    toInsert.push({
      school_id: req.schoolId,
      student_id: cache[code],
      student_code: code,
      class_id: String(r.class_id || '').trim() || null,
      total_amount: Number(r.total_amount || 0),
      subject_fees: {},
      other_fees: {},
      payment_status: status,
      payment_method: method,
      paid_at: r.paid_at || null,
    });
  }
  const { data, error } = await supabase.from('fee_notices').insert(toInsert).select('id');
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(201).json({ ok: true, inserted: data.length });
});

// POST /admin-web/grades/bulk
router.post('/grades/bulk', async (req, res) => {
  const supabase = getSupabase();
  const { rows } = req.body;
  if (!Array.isArray(rows) || rows.length === 0) {
    return res.status(400).json({ ok: false, error: 'rows must be a non-empty array' });
  }
  const valid = rows.filter((r) => String(r.student_code || '').trim() && String(r.subject_name || '').trim());
  if (valid.length === 0) {
    return res.status(400).json({ ok: false, error: 'Không có dòng hợp lệ (cần student_code và subject_name)' });
  }
  const cache = {};
  const toInsert = [];
  for (const r of valid) {
    const code = String(r.student_code).trim();
    if (cache[code] === undefined) {
      const { data: s } = await supabase.from('students').select('id').eq('student_code', code).eq('school_id', req.schoolId).maybeSingle();
      cache[code] = s?.id || null;
    }
    if (!cache[code]) continue;
    const midterm = Number(r.midterm_score ?? 0);
    const final = Number(r.final_score ?? 0);
    toInsert.push({
      school_id: req.schoolId,
      student_id: cache[code],
      student_code: code,
      subject_name: String(r.subject_name).trim(),
      midterm_score: midterm,
      final_score: final,
      average_score: Math.round(((midterm + final * 2) / 3) * 10) / 10,
      semester: String(r.semester || '1'),
      academic_year: String(r.academic_year || '2024-2025'),
    });
  }
  if (toInsert.length === 0) {
    return res.status(400).json({ ok: false, error: 'Không tìm thấy học sinh hợp lệ trong hệ thống' });
  }
  const { data, error } = await supabase.from('grades').insert(toInsert).select('id');
  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.status(201).json({ ok: true, inserted: data.length });
});

// POST /admin-web/mock-scan
router.post('/mock-scan', async (req, res) => {
  const supabase = getSupabase();
  const { student_code } = req.body;

  if (!student_code) {
    return res.status(400).json({ ok: false, error: 'student_code is required' });
  }

  try {
    // Find student_id from student_code, scoped to school
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id, student_code, full_name')
      .eq('student_code', student_code)
      .eq('school_id', req.schoolId)
      .single();

    if (studentError || !student) {
      console.error('[mock-scan] Student lookup failed:', studentError?.message);
      return res.status(404).json({ ok: false, error: `Student '${student_code}' not found in school '${req.schoolId}'` });
    }

    const now = new Date().toISOString();

    // log_type must be 'check_in' | 'check_out' (DB CHECK constraint)
    // status_detail must be 'on_time' | 'late' | 'leave' (DB CHECK constraint)
    const { data, error } = await supabase
      .from('attendance_logs')
      .insert({
        student_id: student.id,
        log_type: 'check_in',
        scanned_at: now,
        school_id: req.schoolId,
        status_detail: 'on_time',
      })
      .select()
      .single();

    if (error) {
      console.error('[mock-scan] Insert attendance_logs failed:', error);
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({
      ok: true,
      student_code: student.student_code,
      student_name: student.full_name,
      log_type: data.log_type,
      scanned_at: data.scanned_at,
      data,
    });
  } catch (e) {
    console.error('[mock-scan] Unexpected error:', e);
    return res.status(500).json({ ok: false, error: e.message });
  }
});

// GET /admin-web/parents
router.get('/parents', async (req, res) => {
  const supabase = getSupabase();

  try {
    // Get all students with parent_id
    const { data: studentsData, error: studentsError } = await supabase
      .from('students')
      .select('id, student_code, full_name, parent_id')
      .not('parent_id', 'is', null)
      .eq('school_id', req.schoolId);

    if (studentsError) {
      return res.status(500).json({ ok: false, error: studentsError.message });
    }

    const parentIds = [...new Set(studentsData.map(s => s.parent_id))];
    if (parentIds.length === 0) {
      return res.json({ ok: true, data: [] });
    }

    console.log('[parents] parentIds found:', parentIds);
    
    // Get user info for each parent_id using getUserById
    const usersMap: Record<string, any> = {};
    for (const pid of parentIds) {
      try {
        console.log('[parents] Fetching user:', pid);
        const { data: userData } = await supabase.auth.admin.getUserById(String(pid));
        console.log('[parents] User data:', userData);
        if (userData?.user) {
          usersMap[String(pid)] = userData.user;
          console.log('[parents] Got user email:', userData.user.email);
        } else {
          console.log('[parents] No user data for:', pid);
        }
      } catch (e) {
        console.log('[parents] Failed to get user:', pid, e.message);
      }
    }
    
    console.log('[parents] usersMap:', Object.keys(usersMap));

    // Build parent list from students
    const parents = studentsData.map(s => {
      const user = usersMap[String(s.parent_id)];
      return {
        id: s.parent_id,
        email: user?.email || 'N/A',
        full_name: user?.user_metadata?.full_name || '',
        phone: user?.user_metadata?.phone || '',
        student_code: s.student_code,
        student_name: s.full_name,
        school_id: req.schoolId
      };
    });

    return res.json({ ok: true, data: parents });
  } catch (e) {
    return res.status(500).json({ ok: false, error: e.message });
  }
});

module.exports = router;
