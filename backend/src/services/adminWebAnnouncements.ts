'use strict';

type AnnouncementInput = {
  title?: unknown;
  content?: unknown;
  is_general?: unknown;
  send_notification?: unknown;
};

type BuildAnnouncementPayloadInput = {
  input: AnnouncementInput;
  schoolId: string;
};

type AnnouncementRecord = {
  id: number | string;
  title: string;
  content: string;
  school_id: string;
};

export function shouldSendAnnouncementPush(input: AnnouncementInput): boolean {
  return input?.send_notification === true || String(input?.send_notification || '').toLowerCase() === 'true';
}

export function buildAnnouncementPayload({ input, schoolId }: BuildAnnouncementPayloadInput) {
  const title = String(input?.title || '').trim();
  const content = String(input?.content || '').trim();
  if (!title || !content) {
    throw new Error('title and content are required');
  }

  return {
    title,
    content,
    is_general: input?.is_general !== undefined ? Boolean(input.is_general) : true,
    school_id: schoolId,
  };
}

export function buildAnnouncementPushPayload({
  token,
  announcement,
}: {
  token: string;
  announcement: AnnouncementRecord;
}) {
  return {
    token,
    title: announcement.title,
    body: announcement.content.slice(0, 120),
    data: {
      type: 'announcement',
      announcement_id: String(announcement.id),
      school_id: String(announcement.school_id),
    },
  };
}

export function summarizePushResults(results: Array<{ ok: boolean }>) {
  return {
    attempted: results.length,
    sent: results.filter((result) => result.ok).length,
    failed: results.filter((result) => !result.ok).length,
  };
}
