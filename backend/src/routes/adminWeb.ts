'use strict';

/**
 * Admin Web Routes - No Authentication Required
 * Chỉ dùng trong mạng nội bộ, không expose ra internet
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { sendPushNotification } = require('../config/firebaseAdmin');
const { mobileAuth } = require('../middleware/mobileAuth');
const {
  buildAnnouncementPayload,
  buildAnnouncementPushPayload,
  shouldSendAnnouncementPush,
  summarizePushResults,
} = require('../services/adminWebAnnouncements');
const {
  buildStaffChatMessagePayload,
  buildStaffChatPushPayload,
} = require('../services/adminWebChatMessages');
const { buildFeeNoticePayload } = require('../services/adminWebFeeNotices');
const { buildGradePayload } = require('../services/adminWebGrades');
const { buildEventPayload, buildEventUpdatePayload } = require('../services/adminWebEvents');
const { buildStudentBulkPayload, buildStudentPayload } = require('../services/adminWebStudents');
const { buildTimetablePayload } = require('../services/adminWebTimetables');
const { emitSyncEvent } = require('../services/eventBus');
const { adminWebApiKeyRouter } = require('./adminWebApiKey');

const router = express.Router();

// Middleware tự động emit sự kiện sync cho client khi admin thay đổi dữ liệu thành công
function autoSyncEmitterMiddleware(req, res, next) {
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(req.method)) {
    const originalJson = res.json;
    res.json = function (body) {
      const result = originalJson.call(this, body);
      const isSuccess = (res.statusCode >= 200 && res.statusCode < 300) || (body && body.ok);
      if (isSuccess && req.schoolId) {
        const url = req.originalUrl || (req.baseUrl + req.path);
        let dataType = null;
        if (url.includes('/timetables')) dataType = 'timetable';
        else if (url.includes('/fees')) dataType = 'fee';
        else if (url.includes('/grades')) dataType = 'grade';
        else if (url.includes('/announcements')) dataType = 'announcement';
        else if (url.includes('/events')) dataType = 'event';
        else if (url.includes('/chat')) dataType = 'chat';
        else if (url.includes('/students')) dataType = 'student';

        if (dataType) {
          let action = 'update';
          if (req.method === 'POST') {
            action = url.includes('/bulk') ? 'bulk_create' : 'create';
          } else if (req.method === 'DELETE') {
            action = 'delete';
          }
          
          process.nextTick(() => {
            emitSyncEvent(req.schoolId, dataType, action);
          });
        }
      }
      return result;
    };
  }
  next();
}

function requireAdminWebRole(req, res, next) {
  const role = String(req.user?.role || '').toLowerCase();
  if (!['teacher', 'admin'].includes(role)) {
    return res.status(403).json({
      ok: false,
      error: 'Only teacher/admin accounts can access school admin web',
    });
  }
  return next();
}

function setSchoolId(req, res, next) {
  const schoolId = String(req.user?.school_id || '').trim();
  if (!schoolId) {
    return res.status(403).json({
      ok: false,
      error: 'School admin account is missing school_id',
    });
  }

  req.schoolId = schoolId;
  return next();
}

router.use(mobileAuth, requireAdminWebRole, setSchoolId, autoSyncEmitterMiddleware);

// API Key & Data Sync Integration
router.use('/api-key', adminWebApiKeyRouter(getSupabase()));

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

// GET /admin-web/events
router.get('/events', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('school_events')
    .select('*')
    .eq('school_id', req.schoolId)
    .order('published_at', { ascending: false });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// POST /admin-web/events
router.post('/events', async (req, res) => {
  const supabase = getSupabase();
  let payload;
  try {
    payload = buildEventPayload({
      input: req.body,
      schoolId: req.schoolId,
      userId: req.user?.id,
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  const { data, error } = await supabase
    .from('school_events')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.status(201).json({ ok: true, data });
});

// PUT /admin-web/events/:id
router.put('/events/:id', async (req, res) => {
  const supabase = getSupabase();
  const payload = buildEventUpdatePayload(req.body);
  
  if (Object.keys(payload).length === 0) {
    return res.status(400).json({ ok: false, error: 'No valid fields provided for update' });
  }

  const { data, error } = await supabase
    .from('school_events')
    .update({ ...payload, updated_at: new Date().toISOString() })
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
});

// DELETE /admin-web/events/:id
router.delete('/events/:id', async (req, res) => {
  const supabase = getSupabase();
  const { error } = await supabase
    .from('school_events')
    .delete()
    .eq('id', req.params.id)
    .eq('school_id', req.schoolId);

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true });
});

// GET /admin-web/attendance-logs
router.get('/attendance-logs', async (req, res) => {
  const supabase = getSupabase();
  const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 500));
  const studentCode = String(req.query.student_code || '').trim();
  const dateFrom = String(req.query.date_from || '').trim();
  const dateTo = String(req.query.date_to || '').trim();

  let query = supabase
    .from('attendance_logs')
    .select('id, scanned_at, log_type, status_detail, late_minutes, students!inner(student_code, full_name, class_name)')
    .eq('school_id', req.schoolId)
    .order('scanned_at', { ascending: false })
    .limit(limit);

  if (studentCode) {
    query = query.eq('students.student_code', studentCode);
  }
  if (dateFrom) {
    query = query.gte('scanned_at', `${dateFrom}T00:00:00.000Z`);
  }
  if (dateTo) {
    query = query.lte('scanned_at', `${dateTo}T23:59:59.999Z`);
  }

  const { data, error } = await query;
  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  return res.json({
    ok: true,
    data: (data || []).map((row) => ({
      id: row.id,
      scanned_at: row.scanned_at,
      log_type: row.log_type,
      status_detail: row.status_detail,
      late_minutes: row.late_minutes,
      student_code: row.students?.student_code || '',
      student_name: row.students?.full_name || '',
      class_name: row.students?.class_name || '',
    })),
  });
});

// GET /admin-web/chat/messages
router.get('/chat/messages', async (req, res) => {
  const supabase = getSupabase();
  const studentCode = String(req.query.student_code || '').trim();

  let query = supabase
    .from('chat_messages')
    .select('id, student_code, sender_role, sender_name, message_text, created_at')
    .eq('school_id', req.schoolId)
    .order('created_at', { ascending: true })
    .limit(300);

  if (studentCode) {
    query = query.eq('student_code', studentCode);
  }

  const { data, error } = await query;
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

  let payload;
  try {
    payload = buildStudentBulkPayload({ rows, schoolId: req.schoolId });
  } catch (studentError) {
    return res.status(400).json({ ok: false, error: studentError.message });
  }
  const { sanitised, invalid } = payload;
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
  let payload;
  try {
    payload = buildStudentPayload({ row: req.body, schoolId: req.schoolId });
  } catch (studentError) {
    return res.status(400).json({ ok: false, error: studentError.message });
  }

  const { data, error } = await supabase
    .from('students')
    .insert(payload)
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
  let payload;
  try {
    payload = buildTimetablePayload({ row: req.body, schoolId: req.schoolId });
  } catch (timetableError) {
    return res.status(400).json({ ok: false, error: timetableError.message });
  }

  const { data, error } = await supabase
    .from('timetables')
    .insert(payload)
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
  let payload;
  try {
    payload = buildTimetablePayload({ row: req.body, schoolId: req.schoolId });
  } catch (timetableError) {
    return res.status(400).json({ ok: false, error: timetableError.message });
  }

  const { data, error } = await supabase
    .from('timetables')
    .update(payload)
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
  let payload;

  try {
    payload = buildAnnouncementPayload({
      input: req.body,
      schoolId: req.schoolId,
    });
  } catch (error) {
    return res.status(400).json({ ok: false, error: 'Tiêu đề và nội dung không được để trống' });
  }

  const { data, error } = await supabase
    .from('announcements')
    .insert(payload)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  if (!shouldSendAnnouncementPush(req.body)) {
    return res.status(201).json({ ok: true, data });
  }

  const { data: parentProfiles, error: tokenError } = await supabase
    .from('user_profiles')
    .select('id, email, fcm_token')
    .eq('school_id', req.schoolId)
    .eq('role', 'parent')
    .not('fcm_token', 'is', null);

  if (tokenError) {
    console.warn('[admin-announcements] Failed to load parent FCM tokens:', tokenError.message);
    return res.status(201).json({
      ok: true,
      data,
      notification: {
        attempted: 0,
        sent: 0,
        failed: 0,
        error: tokenError.message,
      },
    });
  }

  const pushResults = await Promise.all(
    (parentProfiles || []).map(async (profile) => {
      try {
        await sendPushNotification(buildAnnouncementPushPayload({
          token: profile.fcm_token,
          announcement: data,
        }));
        return { ok: true };
      } catch (pushError) {
        console.warn('[admin-announcements] FCM send failed:', pushError.message);
        return { ok: false };
      }
    }),
  );

  return res.status(201).json({
    ok: true,
    data,
    notification: summarizePushResults(pushResults),
  });
});

// POST /admin-web/chat/messages
router.post('/chat/messages', async (req, res) => {
  const supabase = getSupabase();
  let payload;

  try {
    payload = buildStaffChatMessagePayload({
      row: req.body,
      schoolId: req.schoolId,
      sender: req.user || {},
    });
  } catch (chatError) {
    return res.status(400).json({ ok: false, error: chatError.message });
  }

  const { data: student } = await supabase
    .from('students')
    .select('id, parent_id')
    .eq('school_id', req.schoolId)
    .eq('student_code', payload.student_code)
    .maybeSingle();

  if (!student) {
    return res.status(404).json({ ok: false, error: `student_code ${payload.student_code} was not found in school ${req.schoolId}` });
  }

  const { data, error } = await supabase
    .from('chat_messages')
    .insert(payload)
    .select('id, school_id, student_code, sender_role, sender_name, message_text, created_at')
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }

  if (!student.parent_id) {
    return res.status(201).json({
      ok: true,
      data,
      notification: { attempted: 0, sent: 0, failed: 0 },
    });
  }

  const { data: parentProfile, error: parentError } = await supabase
    .from('user_profiles')
    .select('id, fcm_token')
    .eq('id', student.parent_id)
    .eq('school_id', req.schoolId)
    .eq('role', 'parent')
    .maybeSingle();

  if (parentError) {
    console.warn('[admin-chat] Failed to load parent FCM token:', parentError.message);
    return res.status(201).json({
      ok: true,
      data,
      notification: {
        attempted: 0,
        sent: 0,
        failed: 0,
        error: parentError.message,
      },
    });
  }

  if (!parentProfile?.fcm_token) {
    return res.status(201).json({
      ok: true,
      data,
      notification: { attempted: 0, sent: 0, failed: 0 },
    });
  }

  try {
    await sendPushNotification(buildStaffChatPushPayload({
      token: parentProfile.fcm_token,
      message: data,
    }));

    return res.status(201).json({
      ok: true,
      data,
      notification: summarizePushResults([{ ok: true }]),
    });
  } catch (pushError) {
    console.warn('[admin-chat] FCM send failed:', pushError.message);
    return res.status(201).json({
      ok: true,
      data,
      notification: summarizePushResults([{ ok: false }]),
    });
  }
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

  if (!student) {
    return res.status(404).json({ ok: false, error: `student_code ${studentCode} was not found in school ${req.schoolId}` });
  }

  const { data, error } = await supabase
    .from('fee_notices')
    .insert(buildFeeNoticePayload({ row: req.body, schoolId: req.schoolId, studentId: student.id }))
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
  const studentCode = String(req.body.student_code || '').trim();
  if (!studentCode) {
    return res.status(400).json({ ok: false, error: 'student_code is required' });
  }
  const { data: student } = await supabase
    .from('students')
    .select('id')
    .eq('student_code', studentCode)
    .eq('school_id', req.schoolId)
    .maybeSingle();

  if (!student) {
    return res.status(404).json({ ok: false, error: `student_code ${studentCode} was not found in school ${req.schoolId}` });
  }

  const payload = {
    ...buildFeeNoticePayload({ row: req.body, schoolId: req.schoolId, studentId: student.id }),
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await supabase
    .from('fee_notices')
    .update(payload)
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

  let payload;
  try {
    payload = buildGradePayload({
      row: req.body,
      schoolId: req.schoolId,
      studentId: student.id,
    });
  } catch (gradeError) {
    return res.status(400).json({ ok: false, error: gradeError.message });
  }

  const { data, error } = await supabase
    .from('grades')
    .insert(payload)
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
  const sanitised = [];
  for (const row of rows) {
    try {
      sanitised.push(buildTimetablePayload({ row, schoolId: req.schoolId }));
    } catch (timetableError) {
      return res.status(400).json({ ok: false, error: timetableError.message });
    }
  }

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
    if (!cache[code]) {
      return res.status(404).json({ ok: false, error: `student_code ${code} was not found in school ${req.schoolId}` });
    }
    toInsert.push(buildFeeNoticePayload({ row: r, schoolId: req.schoolId, studentId: cache[code] }));
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
    if (!cache[code]) {
      return res.status(404).json({ ok: false, error: `student_code ${code} was not found in school ${req.schoolId}` });
    }
    try {
      toInsert.push(buildGradePayload({
        row: r,
        schoolId: req.schoolId,
        studentId: cache[code],
      }));
    } catch (gradeError) {
      return res.status(400).json({ ok: false, error: gradeError.message });
    }
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
