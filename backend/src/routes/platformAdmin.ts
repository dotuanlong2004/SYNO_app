'use strict';

/**
 * Platform Admin Routes
 * Dedicated super_admin API surface for managing schools and tenant admin
 * accounts. These routes are intentionally separate from school admin routes.
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { mobileAuth } = require('../middleware/mobileAuth');
const {
  buildAdminAccountPayload,
  buildAuditLog,
  buildSchoolPayload,
  buildUserProfileUpdatePayload,
  validateAdminAccountInput,
  validatePasswordResetInput,
  validateSchoolInput,
  validateUserStatusInput,
} = require('../services/adminWebAccounts');

const router = express.Router();

function requireSuperAdmin(req, res, next) {
  if (String(req.user?.role || '').toLowerCase() !== 'super_admin') {
    return res.status(403).json({
      ok: false,
      error: 'Only super_admin accounts can access platform admin',
    });
  }
  return next();
}

router.use(mobileAuth, requireSuperAdmin);

async function writePlatformAudit({ actor, action, targetType, targetId, schoolId = null, details = {} }) {
  const { error } = await getSupabase()
    .from('platform_audit_logs')
    .insert(buildAuditLog({
      actor,
      action,
      target_type: targetType,
      target_id: targetId,
      school_id: schoolId,
      details,
    }));

  if (error) {
    console.warn('[platform-audit] write failed:', error.message);
  }
}

async function assertSchoolExists(supabase, schoolId) {
  if (!schoolId) {
    return { ok: true };
  }

  const { data: school, error } = await supabase
    .from('schools')
    .select('id')
    .eq('id', schoolId)
    .maybeSingle();

  if (error) {
    return { ok: false, status: 500, error: error.message };
  }
  if (!school) {
    return { ok: false, status: 400, error: 'school_id does not exist' };
  }
  return { ok: true };
}

router.get('/schools', async (req, res) => {
  const { data, error } = await getSupabase()
    .from('schools')
    .select('id, name, code, status, website_url, education_levels, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, data: data || [] });
});

router.post('/schools', async (req, res) => {
  let schoolInput;
  try {
    schoolInput = validateSchoolInput(req.body);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  const { data, error } = await getSupabase()
    .from('schools')
    .insert(buildSchoolPayload(schoolInput))
    .select('id, name, code, status, website_url, education_levels, created_at, updated_at')
    .single();

  if (error) {
    const status = String(error.code) === '23505' ? 409 : 500;
    return res.status(status).json({ ok: false, error: error.message });
  }

  await writePlatformAudit({
    actor: req.user,
    action: 'school.create',
    targetType: 'school',
    targetId: data.id,
    schoolId: data.id,
    details: { name: data.name, status: data.status },
  });

  return res.status(201).json({ ok: true, data });
});

router.put('/schools/:id', async (req, res) => {
  const schoolId = String(req.params.id || '').trim();
  let schoolInput;
  try {
    schoolInput = validateSchoolInput({ ...req.body, id: schoolId });
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  const payload = buildSchoolPayload(schoolInput);
  const { data, error } = await getSupabase()
    .from('schools')
    .update({
      name: payload.name,
      code: payload.code,
      status: payload.status,
      website_url: payload.website_url,
      education_levels: payload.education_levels,
      updated_at: new Date().toISOString(),
    })
    .eq('id', schoolId)
    .select('id, name, code, status, website_url, education_levels, created_at, updated_at')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  await writePlatformAudit({
    actor: req.user,
    action: 'school.update',
    targetType: 'school',
    targetId: data.id,
    schoolId: data.id,
    details: { name: data.name, status: data.status },
  });

  return res.json({ ok: true, data });
});

router.get('/admin-users', async (req, res) => {
  const { data, error } = await getSupabase()
    .from('user_profiles')
    .select('id, full_name, role, school_id, is_active, updated_at')
    .in('role', ['teacher', 'admin', 'super_admin'])
    .order('updated_at', { ascending: false });

  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, data: data || [] });
});

router.post('/admin-users', async (req, res) => {
  let accountInput;
  try {
    accountInput = validateAdminAccountInput(req.body);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  const supabase = getSupabase();
  const schoolCheck = await assertSchoolExists(supabase, accountInput.school_id);
  if (!schoolCheck.ok) return res.status(schoolCheck.status).json({ ok: false, error: schoolCheck.error });

  const payload = buildAdminAccountPayload(accountInput);
  const { data: authUser, error: authError } = await supabase.auth.admin.createUser(payload.auth);

  if (authError) return res.status(500).json({ ok: false, error: authError.message });

  const { data, error } = await supabase
    .from('user_profiles')
    .upsert({
      id: authUser.user.id,
      ...payload.profile,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id, full_name, role, school_id, is_active, updated_at')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });
  await writePlatformAudit({
    actor: req.user,
    action: 'admin_user.create',
    targetType: 'user_profile',
    targetId: data.id,
    schoolId: data.school_id,
    details: { role: data.role, full_name: data.full_name },
  });
  return res.status(201).json({ ok: true, data });
});

router.put('/admin-users/:id', async (req, res) => {
  const userId = String(req.params.id || '').trim();
  let payload;
  try {
    payload = buildUserProfileUpdatePayload(req.body);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  const supabase = getSupabase();
  const schoolCheck = await assertSchoolExists(supabase, payload.school_id);
  if (!schoolCheck.ok) return res.status(schoolCheck.status).json({ ok: false, error: schoolCheck.error });

  const { error: authError } = await supabase.auth.admin.updateUserById(userId, {
    user_metadata: {
      full_name: payload.full_name,
      role: payload.role,
      school_id: payload.school_id,
    },
    app_metadata: {
      role: payload.role,
      school_id: payload.school_id,
    },
  });
  if (authError) return res.status(500).json({ ok: false, error: authError.message });

  const { data, error } = await supabase
    .from('user_profiles')
    .update(payload)
    .eq('id', userId)
    .select('id, full_name, role, school_id, is_active, updated_at')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  await writePlatformAudit({
    actor: req.user,
    action: 'admin_user.update',
    targetType: 'user_profile',
    targetId: data.id,
    schoolId: data.school_id,
    details: { role: data.role, is_active: data.is_active },
  });

  return res.json({ ok: true, data });
});

router.patch('/admin-users/:id/status', async (req, res) => {
  const userId = String(req.params.id || '').trim();
  let statusInput;
  try {
    statusInput = validateUserStatusInput(req.body);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  const { data, error } = await getSupabase()
    .from('user_profiles')
    .update({ is_active: statusInput.is_active, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('id, full_name, role, school_id, is_active, updated_at')
    .single();

  if (error) return res.status(500).json({ ok: false, error: error.message });

  await writePlatformAudit({
    actor: req.user,
    action: statusInput.is_active ? 'admin_user.activate' : 'admin_user.deactivate',
    targetType: 'user_profile',
    targetId: data.id,
    schoolId: data.school_id,
    details: { role: data.role },
  });

  return res.json({ ok: true, data });
});

router.patch('/admin-users/:id/password', async (req, res) => {
  const userId = String(req.params.id || '').trim();
  let input;
  try {
    input = validatePasswordResetInput(req.body);
  } catch (error) {
    return res.status(400).json({ ok: false, error: error.message });
  }

  const { error } = await getSupabase().auth.admin.updateUserById(userId, {
    password: input.password,
  });

  if (error) return res.status(500).json({ ok: false, error: error.message });

  await writePlatformAudit({
    actor: req.user,
    action: 'admin_user.reset_password',
    targetType: 'auth_user',
    targetId: userId,
    details: { password_changed: true },
  });

  return res.json({ ok: true, data: { id: userId } });
});

router.get('/audit-logs', async (req, res) => {
  const limit = Math.max(1, Math.min(Number(req.query.limit || 100), 500));
  const { data, error } = await getSupabase()
    .from('platform_audit_logs')
    .select('id, actor_user_id, actor_email, action, target_type, target_id, school_id, details, created_at')
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error) return res.status(500).json({ ok: false, error: error.message });
  return res.json({ ok: true, data: data || [] });
});

module.exports = router;
