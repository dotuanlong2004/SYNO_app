'use strict';

type EventInput = {
  title?: unknown;
  content?: unknown;
  image_url?: unknown;
  event_date?: unknown;
  published_at?: unknown;
};

type BuildEventPayloadInput = {
  input: EventInput;
  schoolId: string;
  userId?: string;
};

type EventRecord = {
  id: number | string;
  title: string;
  content: string;
  image_url?: string | null;
  event_date?: string | null;
  published_at?: string | null;
  school_id: string;
};

export function buildEventPayload({ input, schoolId, userId }: BuildEventPayloadInput) {
  const title = String(input?.title || '').trim();
  const content = String(input?.content || '').trim();
  
  if (!title || !content) {
    throw new Error('title and content are required');
  }

  return {
    title,
    content,
    image_url: input?.image_url ? String(input.image_url).trim() : null,
    event_date: input?.event_date ? String(input.event_date).trim() : null,
    published_at: input?.published_at ? String(input.published_at).trim() : null,
    school_id: schoolId,
    created_by: userId || null,
  };
}

export function buildEventUpdatePayload(input: Partial<EventInput>) {
  const updates: any = {};
  
  if (input.title !== undefined) updates.title = String(input.title).trim();
  if (input.content !== undefined) updates.content = String(input.content).trim();
  if (input.image_url !== undefined) updates.image_url = input.image_url ? String(input.image_url).trim() : null;
  if (input.event_date !== undefined) updates.event_date = input.event_date ? String(input.event_date).trim() : null;
  if (input.published_at !== undefined) updates.published_at = input.published_at ? String(input.published_at).trim() : null;
  
  return updates;
}