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

type StaffChatMessageRecord = {
  id: number | string;
  school_id: string;
  student_code: string;
  sender_name: string;
  message_text: string;
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

export async function findChatStudentByCode({
  supabase,
  schoolId,
  studentCode,
}: {
  supabase: any;
  schoolId: string;
  studentCode: string;
}) {
  const { data, error } = await supabase
    .from('students')
    .select('id, student_code, parent_id')
    .eq('school_id', schoolId)
    .eq('student_code', studentCode)
    .maybeSingle();

  if (error) {
    throw error;
  }
  return data || null;
}

export async function attachStudentCodesToChatMessages({
  supabase,
  schoolId,
  rows,
}: {
  supabase: any;
  schoolId: string;
  rows: Array<Record<string, any>>;
}) {
  const studentIds = [
    ...new Set(
      rows
        .map((row) => row.student_id)
        .filter((value) => value !== null && value !== undefined),
    ),
  ];

  if (studentIds.length === 0) {
    return rows.map((row) => ({ ...row, student_code: '' }));
  }

  const { data: students, error } = await supabase
    .from('students')
    .select('id, student_code')
    .eq('school_id', schoolId)
    .in('id', studentIds);

  if (error) {
    throw error;
  }

  const codeById = new Map(
    (students || []).map((student) => [String(student.id), student.student_code || '']),
  );

  return rows.map((row) => ({
    ...row,
    student_code: row.student_id == null ? '' : codeById.get(String(row.student_id)) || '',
  }));
}

export function buildStaffChatPushPayload({
  token,
  message,
}: {
  token: string;
  message: StaffChatMessageRecord;
}) {
  return {
    token,
    title: 'Tin nhắn mới từ SYNO',
    body: message.message_text.slice(0, 120),
    data: {
      type: 'chat_message',
      chat_message_id: String(message.id),
      student_code: String(message.student_code),
      school_id: String(message.school_id),
    },
  };
}
