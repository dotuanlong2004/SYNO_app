import assert from 'node:assert/strict';

import { buildStaffChatMessagePayload, normalizeChatMessageText } from '../src/services/adminWebChatMessages';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[admin-chat-ok] ${name}`);
  } catch (error) {
    console.error(`[admin-chat-fail] ${name}`);
    throw error;
  }
}

test('normalizeChatMessageText trims message text', () => {
  assert.equal(normalizeChatMessageText(' Xin chao phu huynh '), 'Xin chao phu huynh');
});

test('normalizeChatMessageText rejects empty or oversized message text', () => {
  assert.throws(() => normalizeChatMessageText(''), /message_text is required/);
  assert.throws(() => normalizeChatMessageText('a'.repeat(2001)), /message_text is too long/);
});

test('buildStaffChatMessagePayload creates school-scoped staff message payload', () => {
  assert.deepEqual(
    buildStaffChatMessagePayload({
      row: { student_code: ' HS001 ', message_text: ' Tra loi phu huynh ' },
      schoolId: '1',
      sender: { id: 'u-1', role: 'teacher', full_name: 'Co Lan', email: 'lan@syno.local' },
    }),
    {
      school_id: '1',
      student_code: 'HS001',
      sender_role: 'teacher',
      sender_id: 'u-1',
      sender_name: 'Co Lan',
      message_text: 'Tra loi phu huynh',
    },
  );
});

test('buildStaffChatMessagePayload requires student_code', () => {
  assert.throws(
    () => buildStaffChatMessagePayload({
      row: { student_code: '', message_text: 'Hello' },
      schoolId: '1',
      sender: { id: 'u-1', role: 'admin', email: 'admin@syno.local' },
    }),
    /student_code is required/,
  );
});
