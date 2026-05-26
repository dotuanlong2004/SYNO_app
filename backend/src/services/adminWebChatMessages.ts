'use strict';

type ChatInput = {
  student_code?: unknown;
  message_text?: unknown;
};

type SenderInput = {
  id?: unknown;
  role?: unknown;
  full_name?: unknown;
  email?: unknown;
};

type BuildStaffChatMessagePayloadInput = {
  row: ChatInput;
  schoolId: string;
  sender: SenderInput;
};

export function normalizeChatMessageText(value: unknown): string {
  const text = String(value || '').trim();
  if (!text) {
    throw new Error('message_text is required');
  }
  if (text.length > 2000) {
    throw new Error('message_text is too long');
  }
  return text;
}

export function buildStaffChatMessagePayload({
  row,
  schoolId,
  sender,
}: BuildStaffChatMessagePayloadInput) {
  const studentCode = String(row.student_code || '').trim();
  if (!studentCode) {
    throw new Error('student_code is required');
  }

  const senderName = String(sender.full_name || sender.email || 'School staff').trim();

  return {
    school_id: schoolId,
    student_code: studentCode,
    sender_role: String(sender.role || 'teacher').toLowerCase(),
    sender_id: String(sender.id || ''),
    sender_name: senderName,
    message_text: normalizeChatMessageText(row.message_text),
  };
}
