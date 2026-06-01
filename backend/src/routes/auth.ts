'use strict';

/**
 * Auth Routes - Supabase Native Auth
 * Replaces custom JWT with Supabase Auth
 */

const express = require('express');
const { getSupabase, getSupabaseAnon } = require('../config/supabase');

const router = express.Router();
const LEGACY_TEST_LOGIN_ALIAS = {
  'admin@school.edu': 'admin2@school.edu',
  'parent@test.com': 'parent2@test.com',
  '0123456789': 'long.parent@test.com',
};

function formatUserResponse(authUser, profile) {
  return {
    id: authUser.id,
    email: authUser.email,
    full_name: profile?.full_name || authUser.user_metadata?.full_name || '',
    role: profile?.role || authUser.user_metadata?.role || 'parent',
    school_id: profile?.school_id ?? authUser.user_metadata?.school_id ?? null,
    class_id: profile?.class_id || null,
    student_code: profile?.student_code || null,
    fcm_token: profile?.fcm_token || null,
    is_active: profile?.is_active ?? true,
    email_confirmed: authUser.email_confirmed_at != null,
    last_sign_in: authUser.last_sign_in_at,
  };
}

router.post('/login', async (req, res) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!email || !password) {
    return res.status(400).json({ ok: false, error: 'email and password are required' });
  }

  const supabase = getSupabaseAnon() || getSupabase();

  try {
    let { data, error } = await supabase.auth.signInWithPassword({ email, password });

    const aliasEmail = LEGACY_TEST_LOGIN_ALIAS[email];
    if ((error || !data?.user) && aliasEmail) {
      const retry = await supabase.auth.signInWithPassword({ email: aliasEmail, password });
      data = retry.data;
      error = retry.error;
    }

    if (error || !data?.user) {
      return res.status(401).json({ ok: false, error: error?.message || 'Invalid credentials' });
    }

    const { data: profile } = await getSupabase()
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();

    let enrichedProfile = profile || null;
    const resolvedRole = profile?.role || data.user.user_metadata?.role || 'parent';
    if (resolvedRole === 'parent' && (!profile?.student_code || !profile?.class_id)) {
    const schoolId =
        profile?.school_id ?? data.user.user_metadata?.school_id ?? null;
      const { data: linkedStudent } = await getSupabase()
        .from('students')
        .select('student_code, class_name')
        .eq('parent_id', data.user.id)
        .eq('school_id', schoolId || '1')
        .order('id', { ascending: true })
        .limit(1)
        .maybeSingle();

      if (linkedStudent) {
        enrichedProfile = {
          ...(profile || {}),
          student_code: profile?.student_code || linkedStudent.student_code || null,
          class_id: profile?.class_id || linkedStudent.class_name || null,
          school_id: schoolId,
          role: resolvedRole,
        };
      }
    }

    return res.status(200).json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: formatUserResponse(data.user, enrichedProfile),
    });
  } catch (error) {
    console.error('Login failed', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/register-parent', async (req, res) => {
  const fullName = String(req.body?.full_name ?? '').trim();
  const email = String(req.body?.email ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');
  const studentLinkCode = String(req.body?.link_code ?? '').trim();
  const schoolId = String(req.body?.school_id ?? '1').trim();

  if (!fullName || !email || !password || !studentLinkCode) {
    return res.status(400).json({ ok: false, error: 'full_name, email, password, and link_code are required' });
  }

  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
  }

  const supabase = getSupabaseAnon() || getSupabase();

  try {
    const { data: student, error: studentError } = await getSupabase()
      .from('students')
      .select('id, student_code, full_name, class_name, parent_id')
      .eq('link_code', studentLinkCode)
      .eq('school_id', schoolId)
      .single();

    if (studentError || !student) {
      return res.status(404).json({ ok: false, error: 'Invalid student link code' });
    }

    if (student.parent_id) {
      return res.status(409).json({ ok: false, error: 'Student already linked to a parent account' });
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { full_name: fullName }
      }
    });

    if (authError) {
      if (authError.message.includes('already registered')) {
        return res.status(409).json({ ok: false, error: 'Email already registered' });
      }
      return res.status(400).json({ ok: false, error: authError.message });
    }

    await getSupabase()
      .from('user_profiles')
      .upsert({
        id: authData.user.id,
        full_name: fullName,
        role: 'parent',
        school_id: schoolId,
        class_id: student.class_name,
        student_code: student.student_code,
        is_active: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    await getSupabase()
      .from('students')
      .update({ parent_id: authData.user.id, updated_at: new Date().toISOString() })
      .eq('id', student.id);

    return res.status(201).json({
      ok: true,
      message: 'Parent registered successfully',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        full_name: fullName,
        role: 'parent',
        school_id: schoolId,
        student_code: student.student_code,
      },
      session: authData.session ? {
        access_token: authData.session.access_token,
        refresh_token: authData.session.refresh_token,
      } : null,
    });
  } catch (error) {
    console.error('Parent registration failed', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});
router.post('/refresh', async (req, res) => {
  const refreshToken = String(req.body?.refresh_token ?? '').trim();
  if (!refreshToken) {
    return res.status(400).json({ ok: false, error: 'refresh_token is required' });
  }
  const supabase = getSupabaseAnon() || getSupabase();
  try {
    const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
    if (error || !data.session) {
      return res.status(401).json({ ok: false, error: error?.message || 'Invalid refresh token' });
    }
    const { data: profile } = await getSupabase()
      .from('user_profiles')
      .select('*')
      .eq('id', data.user.id)
      .single();
    return res.status(200).json({
      ok: true,
      access_token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at,
      user: formatUserResponse(data.user, profile),
    });
  } catch (error) {
    console.error('Refresh failed', error);
    return res.status(401).json({ ok: false, error: 'Invalid refresh token' });
  }
});
router.post('/logout', async (req, res) => {
  try {
    const supabase = getSupabaseAnon() || getSupabase();
    await supabase.auth.signOut();
  } catch (e) {}
  return res.status(200).json({ ok: true });
});

module.exports = { authRouter: router };
