import assert from 'node:assert/strict';

import {
  buildAdminAccountPayload,
  buildAuditLog,
  buildSchoolPayload,
  buildUserProfileUpdatePayload,
  validateAdminAccountInput,
  validatePasswordResetInput,
  validateSchoolInput,
  validateUserStatusInput,
} from '../src/services/adminWebAccounts';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[admin-account-ok] ${name}`);
  } catch (error) {
    console.error(`[admin-account-fail] ${name}`);
    throw error;
  }
}

test('super_admin is platform scoped and does not require school_id', () => {
  const input = validateAdminAccountInput({
    email: 'Boss@School.edu ',
    password: 'TempPass123!',
    full_name: 'Platform Boss',
    role: 'super_admin',
    school_id: '',
  });

  const payload = buildAdminAccountPayload(input);

  assert.equal(payload.profile.school_id, null);
  assert.equal(payload.auth.user_metadata.school_id, null);
  assert.equal(payload.auth.app_metadata.school_id, null);
  assert.equal(payload.auth.app_metadata.role, 'super_admin');
});

test('teacher and admin accounts require a real school_id', () => {
  assert.throws(
    () =>
      validateAdminAccountInput({
        email: 'teacher@school.edu',
        password: 'TempPass123!',
        full_name: 'Teacher',
        role: 'teacher',
        school_id: '',
      }),
    /school_id is required/,
  );
});

test('only staff roles accepted for admin account creation', () => {
  assert.throws(
    () =>
      validateAdminAccountInput({
        email: 'parent@school.edu',
        password: 'TempPass123!',
        full_name: 'Parent',
        role: 'parent',
        school_id: '1',
      }),
    /role must be teacher, admin, or super_admin/,
  );
});

test('school payload trims id, code, website and education levels', () => {
  const payload = buildSchoolPayload(
    validateSchoolInput({
      id: ' hns-2 ',
      name: ' Huu Nghi Campus 2 ',
      code: ' hns2 ',
      status: 'active',
      website_url: ' https://hns.edu.vn/campus-2 ',
      education_levels: [' primary ', 'secondary', '', 'primary'],
    }),
  );

  assert.deepEqual(payload, {
    id: 'hns-2',
    name: 'Huu Nghi Campus 2',
    code: 'HNS2',
    status: 'active',
    website_url: 'https://hns.edu.vn/campus-2',
    address: null,
    phone: null,
    email: null,
    description: null,
    education_levels: ['primary', 'secondary'],
  });
});

test('inactive schools are accepted but unknown school statuses are rejected', () => {
  assert.equal(validateSchoolInput({ id: '2', name: 'Second', status: 'inactive' }).status, 'inactive');
  assert.throws(
    () => validateSchoolInput({ id: '3', name: 'Third', status: 'deleted' }),
    /status must be active, inactive, or suspended/,
  );
});

test('profile update keeps staff accounts bound to a real school id', () => {
  const payload = buildUserProfileUpdatePayload({
    full_name: 'New Admin',
    role: 'admin',
    school_id: '2',
    is_active: false,
  });

  assert.deepEqual(payload, {
    full_name: 'New Admin',
    role: 'admin',
    school_id: '2',
    is_active: false,
    updated_at: payload.updated_at,
  });
  assert.match(payload.updated_at, /^\d{4}-\d{2}-\d{2}T/);
});

test('profile update allows super_admin to remain platform scoped', () => {
  const payload = buildUserProfileUpdatePayload({
    full_name: 'Platform Boss',
    role: 'super_admin',
    school_id: '',
    is_active: true,
  });

  assert.equal(payload.school_id, null);
  assert.equal(payload.role, 'super_admin');
});

test('user status input only accepts boolean active values', () => {
  assert.deepEqual(validateUserStatusInput({ is_active: true }), { is_active: true });
  assert.deepEqual(validateUserStatusInput({ is_active: false }), { is_active: false });
  assert.throws(() => validateUserStatusInput({ is_active: 'yes' }), /is_active must be boolean/);
});

test('password reset accepts the shared six-character test password', () => {
  assert.equal(validatePasswordResetInput({ password: '123456' }).password, '123456');
  assert.throws(() => validatePasswordResetInput({ password: 'short' }), /password must be at least 6 characters/);
});

test('audit log captures actor, action, target, school, and details', () => {
  const log = buildAuditLog({
    actor: { id: 'actor-1', email: 'boss@school.edu' },
    action: 'admin_user.update',
    target_type: 'user_profile',
    target_id: 'user-2',
    school_id: '1',
    details: { role: 'admin' },
  });

  assert.deepEqual(log, {
    actor_user_id: 'actor-1',
    actor_email: 'boss@school.edu',
    action: 'admin_user.update',
    target_type: 'user_profile',
    target_id: 'user-2',
    school_id: '1',
    details: { role: 'admin' },
  });
});
