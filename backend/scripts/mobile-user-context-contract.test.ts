import assert from 'node:assert/strict';

import { resolveMobileUserContext } from '../src/services/mobileUserContext';

function test(name: string, fn: () => Promise<void>) {
  fn()
    .then(() => console.log(`[mobile-context-ok] ${name}`))
    .catch((error) => {
      console.error(`[mobile-context-fail] ${name}`);
      throw error;
    });
}

test('parent context prefers linked student class over stale profile class_id', async () => {
  const calls: Array<{ table: string; filters: Record<string, unknown> }> = [];
  const supabase = {
    from(table: string) {
      const filters: Record<string, unknown> = {};
      const builder = {
        select() {
          return builder;
        },
        eq(column: string, value: unknown) {
          filters[column] = value;
          return builder;
        },
        order() {
          return builder;
        },
        limit() {
          return builder;
        },
        async maybeSingle() {
          calls.push({ table, filters: { ...filters } });
          return {
            data: {
              student_code: 'HS0085',
              class_name: '10C2',
            },
            error: null,
          };
        },
      };
      return builder;
    },
  };

  const resolved = await resolveMobileUserContext({
    supabase,
    userId: 'parent-user-id',
    profile: {
      role: 'parent',
      class_id: '12A1',
      student_code: 'HS0085',
      school_id: '1',
      full_name: 'Long',
    },
    userMetadata: {
      role: 'parent',
      class_id: '12A1',
      student_code: 'HS0085',
      school_id: '1',
    },
  });

  assert.equal(resolved.class_id, '10C2');
  assert.equal(resolved.student_code, 'HS0085');
  assert.equal(resolved.school_id, '1');
  assert.equal(calls[0].table, 'students');
  assert.deepEqual(calls[0].filters, {
    parent_id: 'parent-user-id',
    school_id: '1',
  });
});
