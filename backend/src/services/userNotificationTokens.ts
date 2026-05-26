'use strict';

type SupabaseUpdateResult = {
  error?: null | { message?: string };
};

type SupabaseLike = {
  from(table: string): {
    update(payload: Record<string, unknown>): {
      eq(column: string, value: string): Promise<SupabaseUpdateResult>;
    };
  };
};

type SaveUserFcmTokenInput = {
  supabase: SupabaseLike;
  userId: string;
  token: unknown;
  now?: () => string;
};

export function validateFcmToken(value: unknown): string {
  const token = String(value ?? '').trim();
  if (!token) {
    throw new Error('fcm_token required');
  }
  if (token.length > 4096) {
    throw new Error('fcm_token too long');
  }
  return token;
}

export async function saveUserFcmToken({
  supabase,
  userId,
  token,
  now = () => new Date().toISOString(),
}: SaveUserFcmTokenInput): Promise<void> {
  const normalizedToken = validateFcmToken(token);
  const normalizedUserId = String(userId ?? '').trim();
  if (!normalizedUserId) {
    throw new Error('user_id required');
  }

  const { error } = await supabase
    .from('user_profiles')
    .update({ fcm_token: normalizedToken, updated_at: now() })
    .eq('id', normalizedUserId);

  if (error) {
    throw new Error(error.message || 'Failed to save FCM token');
  }
}
