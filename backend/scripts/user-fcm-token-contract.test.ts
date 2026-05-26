import assert from 'node:assert/strict';

import { saveUserFcmToken, validateFcmToken } from '../src/services/userNotificationTokens';

function test(name: string, fn: () => void | Promise<void>) {
  Promise.resolve()
    .then(fn)
    .then(() => console.log(`[user-fcm-ok] ${name}`))
    .catch((error) => {
      console.error(`[user-fcm-fail] ${name}`);
      throw error;
    });
}

function createSupabaseUpdateStub(result: { error: null | { message: string } }) {
  const calls: Array<{ table: string; payload: Record<string, unknown>; column: string; value: string }> = [];

  return {
    calls,
    client: {
      from(table: string) {
        return {
          update(payload: Record<string, unknown>) {
            return {
              async eq(column: string, value: string) {
                calls.push({ table, payload, column, value });
                return result;
              },
            };
          },
        };
      },
    },
  };
}

test('validateFcmToken trims token and rejects missing values', () => {
  assert.equal(validateFcmToken(' token-123 '), 'token-123');
  assert.throws(() => validateFcmToken('   '), /fcm_token required/);
});

test('validateFcmToken rejects oversized token payloads', () => {
  assert.throws(() => validateFcmToken('x'.repeat(4097)), /fcm_token too long/);
});

test('saveUserFcmToken updates only the authenticated user profile', async () => {
  const stub = createSupabaseUpdateStub({ error: null });

  await saveUserFcmToken({
    supabase: stub.client,
    userId: 'user-1',
    token: 'device-token',
    now: () => '2026-05-26T00:00:00.000Z',
  });

  assert.deepEqual(stub.calls, [
    {
      table: 'user_profiles',
      payload: {
        fcm_token: 'device-token',
        updated_at: '2026-05-26T00:00:00.000Z',
      },
      column: 'id',
      value: 'user-1',
    },
  ]);
});

test('saveUserFcmToken surfaces Supabase update failures', async () => {
  const stub = createSupabaseUpdateStub({ error: { message: 'RLS denied update' } });

  await assert.rejects(
    () =>
      saveUserFcmToken({
        supabase: stub.client,
        userId: 'user-1',
        token: 'device-token',
        now: () => '2026-05-26T00:00:00.000Z',
      }),
    /RLS denied update/,
  );
});
