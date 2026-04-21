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
  req.schoolId = req.get('x-school-id') || 'default_school';
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
    .from('student_fees')
    .select('*')
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
    .order('created_at', { ascending: false });

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.json({ ok: true, data });
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

// POST /admin-web/fees
router.post('/fees', async (req, res) => {
  const supabase = getSupabase();
  const { data, error } = await supabase
    .from('student_fees')
    .insert({ ...req.body, school_id: req.schoolId })
    .select()
    .single();

  if (error) {
    return res.status(500).json({ ok: false, error: error.message });
  }
  return res.status(201).json({ ok: true, data });
});

// POST /admin-web/mock-scan
router.post('/mock-scan', async (req, res) => {
  const supabase = getSupabase();
  const { student_code } = req.body;

  try {
    // Find student_id from student_code
    const { data: student, error: studentError } = await supabase
      .from('students')
      .select('id')
      .eq('student_code', student_code)
      .eq('school_id', req.schoolId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    const log_type = 'in';
    const now = new Date().toISOString();

    const { data, error } = await supabase
      .from('attendance_logs')
      .insert({
        student_id: student.id,
        log_type,
        scanned_at: now,
        school_id: req.schoolId,
        status_detail: 'Đã quẹt thẻ',
      })
      .select()
      .single();

    if (error) {
      return res.status(500).json({ ok: false, error: error.message });
    }

    return res.json({ ok: true, data });
  } catch (e) {
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
    const usersMap = {};
    for (const pid of parentIds) {
      try {
        console.log('[parents] Fetching user:', pid);
        const { data: userData } = await supabase.auth.admin.getUserById(pid);
        console.log('[parents] User data:', userData);
        if (userData?.user) {
          usersMap[pid] = userData.user;
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
      const user = usersMap[s.parent_id];
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
