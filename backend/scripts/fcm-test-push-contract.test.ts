import assert from 'node:assert/strict';

import { buildFcmTestPayload, getFcmTargetFilter, requirePushReadyProfile } from '../src/services/fcmTestPush';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[fcm-test-ok] ${name}`);
  } catch (error) {
    console.error(`[fcm-test-fail] ${name}`);
    throw error;
  }
}

test('getFcmTargetFilter accepts exactly one target selector', () => {
  assert.deepEqual(getFcmTargetFilter({ email: ' Parent@School.edu ' }), {
    column: 'email',
    value: 'parent@school.edu',
  });
  assert.deepEqual(getFcmTargetFilter({ userId: ' user-1 ' }), {
    column: 'id',
    value: 'user-1',
  });
  assert.throws(() => getFcmTargetFilter({}), /Provide --email or --user-id/);
  assert.throws(() => getFcmTargetFilter({ email: 'a@b.test', userId: 'user-1' }), /Use only one target selector/);
});

test('requirePushReadyProfile rejects profiles without a stored token', () => {
  assert.throws(() => requirePushReadyProfile(null), /No user profile found/);
  assert.throws(() => requirePushReadyProfile({ email: 'parent@school.edu', fcm_token: '' }), /has no fcm_token/);
});

test('buildFcmTestPayload creates a safe synthetic notification payload', () => {
  const payload = buildFcmTestPayload({
    token: 'device-token',
    title: 'SYNO test',
    body: 'Ping',
    sentAt: '2026-05-26T10:00:00.000Z',
  });

  assert.deepEqual(payload, {
    token: 'device-token',
    title: 'SYNO test',
    body: 'Ping',
    data: {
      type: 'test_push',
      source: 'syno_backend_test',
      sent_at: '2026-05-26T10:00:00.000Z',
    },
  });
});
