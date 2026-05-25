'use strict';

const ADMIN_WEB_STAFF_ROLES = new Set(['teacher', 'admin', 'super_admin']);
const SCHOOL_STATUSES = new Set(['active', 'inactive', 'suspended']);

type AdminAccountInput = {
  email?: string;
  password?: string;
  full_name?: string;
  role?: string;
  school_id?: string;
};

type SchoolInput = {
  id?: string;
  name?: string;
  code?: string | null;
  status?: string;
  website_url?: string | null;
  education_levels?: string[] | string | null;
};

type NormalizedAdminAccountInput = {
  email: string;
  password: string;
  full_name: string;
  role: 'teacher' | 'admin' | 'super_admin';
  school_id: string | null;
};

export function validateAdminAccountInput(input: AdminAccountInput): NormalizedAdminAccountInput {
  const email = String(input?.email || '').trim().toLowerCase();
  const password = String(input?.password || '').trim();
  const fullName = String(input?.full_name || '').trim();
  const role = String(input?.role || '').trim().toLowerCase();
  const schoolId = String(input?.school_id || '').trim();

  if (!email || !password || !fullName || !role) {
    throw new Error('email, password, full_name, and role are required');
  }
  if (!ADMIN_WEB_STAFF_ROLES.has(role)) {
    throw new Error('role must be teacher, admin, or super_admin');
  }
  if (role !== 'super_admin' && !schoolId) {
    throw new Error('school_id is required for teacher/admin accounts');
  }

  return {
    email,
    password,
    full_name: fullName,
    role: role as NormalizedAdminAccountInput['role'],
    school_id: role === 'super_admin' ? null : schoolId,
  };
}

export function buildAdminAccountPayload(input: NormalizedAdminAccountInput) {
  return {
    auth: {
      email: input.email,
      password: input.password,
      email_confirm: true,
      user_metadata: {
        full_name: input.full_name,
        role: input.role,
        school_id: input.school_id,
      },
      app_metadata: {
        role: input.role,
        school_id: input.school_id,
      },
    },
    profile: {
      full_name: input.full_name,
      role: input.role,
      school_id: input.school_id,
      is_active: true,
    },
  };
}

function normalizeEducationLevels(value: SchoolInput['education_levels']): string[] {
  const rawLevels = Array.isArray(value)
    ? value
    : String(value || '')
      .split(',')
      .map((item) => item.trim());

  return [...new Set(rawLevels.map((item) => String(item).trim()).filter(Boolean))];
}

export function validateSchoolInput(input: SchoolInput) {
  const id = String(input?.id || '').trim();
  const name = String(input?.name || '').trim();
  const code = String(input?.code || '').trim().toUpperCase();
  const status = String(input?.status || 'active').trim().toLowerCase();
  const websiteUrl = String(input?.website_url || '').trim();

  if (!id || !name) {
    throw new Error('id and name are required');
  }
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(id)) {
    throw new Error('id must contain only letters, numbers, underscore, or dash');
  }
  if (!SCHOOL_STATUSES.has(status)) {
    throw new Error('status must be active, inactive, or suspended');
  }

  return {
    id,
    name,
    code,
    status: status as 'active' | 'inactive' | 'suspended',
    website_url: websiteUrl,
    education_levels: normalizeEducationLevels(input?.education_levels),
  };
}

export function buildSchoolPayload(input: ReturnType<typeof validateSchoolInput>) {
  return {
    id: input.id,
    name: input.name,
    code: input.code || null,
    status: input.status,
    website_url: input.website_url || null,
    education_levels: input.education_levels,
  };
}

export function buildUserProfileUpdatePayload(input: AdminAccountInput & { is_active?: boolean }) {
  const fullName = String(input?.full_name || '').trim();
  const role = String(input?.role || '').trim().toLowerCase();
  const schoolId = String(input?.school_id || '').trim();

  if (!fullName || !role) {
    throw new Error('full_name and role are required');
  }
  if (!ADMIN_WEB_STAFF_ROLES.has(role)) {
    throw new Error('role must be teacher, admin, or super_admin');
  }
  if (role !== 'super_admin' && !schoolId) {
    throw new Error('school_id is required for teacher/admin accounts');
  }

  return {
    full_name: fullName,
    role,
    school_id: role === 'super_admin' ? null : schoolId,
    is_active: input?.is_active === false ? false : true,
    updated_at: new Date().toISOString(),
  };
}

export function validateUserStatusInput(input: { is_active?: unknown }) {
  if (typeof input?.is_active !== 'boolean') {
    throw new Error('is_active must be boolean');
  }
  return { is_active: input.is_active };
}

export function validatePasswordResetInput(input: { password?: string }) {
  const password = String(input?.password || '').trim();
  if (password.length < 6) {
    throw new Error('password must be at least 6 characters');
  }
  return { password };
}

export function buildAuditLog(input: {
  actor?: { id?: string; email?: string };
  action: string;
  target_type: string;
  target_id: string;
  school_id?: string | null;
  details?: Record<string, unknown>;
}) {
  return {
    actor_user_id: input.actor?.id || null,
    actor_email: input.actor?.email || null,
    action: input.action,
    target_type: input.target_type,
    target_id: input.target_id,
    school_id: input.school_id || null,
    details: input.details || {},
  };
}

module.exports = {
  buildAdminAccountPayload,
  buildAuditLog,
  buildSchoolPayload,
  buildUserProfileUpdatePayload,
  validateAdminAccountInput,
  validatePasswordResetInput,
  validateSchoolInput,
  validateUserStatusInput,
};
