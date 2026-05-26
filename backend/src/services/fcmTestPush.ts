'use strict';

type TargetInput = {
  email?: unknown;
  userId?: unknown;
};

type PushProfile = {
  id?: string;
  email?: string;
  full_name?: string | null;
  fcm_token?: string | null;
};

type BuildPayloadInput = {
  token: string;
  title?: string;
  body?: string;
  sentAt?: string;
};

export function getFcmTargetFilter(input: TargetInput): { column: 'email' | 'id'; value: string } {
  const email = String(input.email || '').trim().toLowerCase();
  const userId = String(input.userId || '').trim();

  if (email && userId) {
    throw new Error('Use only one target selector: --email or --user-id');
  }
  if (!email && !userId) {
    throw new Error('Provide --email or --user-id');
  }

  return email ? { column: 'email', value: email } : { column: 'id', value: userId };
}

export function requirePushReadyProfile(profile: PushProfile | null | undefined): PushProfile & { fcm_token: string } {
  if (!profile) {
    throw new Error('No user profile found for target');
  }

  const token = String(profile.fcm_token || '').trim();
  if (!token) {
    throw new Error(`User ${profile.email || profile.id || 'target'} has no fcm_token`);
  }

  return { ...profile, fcm_token: token };
}

export function buildFcmTestPayload({
  token,
  title = 'SYNO test notification',
  body = 'This is a SYNO Firebase Cloud Messaging test.',
  sentAt = new Date().toISOString(),
}: BuildPayloadInput) {
  return {
    token,
    title,
    body,
    data: {
      type: 'test_push',
      source: 'syno_backend_test',
      sent_at: sentAt,
    },
  };
}
