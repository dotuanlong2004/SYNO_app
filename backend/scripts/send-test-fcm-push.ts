'use strict';

require('dotenv').config();

const { getSupabase } = require('../src/config/supabase');
const { sendPushNotification } = require('../src/config/firebaseAdmin');
const { buildFcmTestPayload, getFcmTargetFilter, requirePushReadyProfile } = require('../src/services/fcmTestPush');

function getArgValue(name: string): string {
  const prefix = `--${name}=`;
  const raw = process.argv.find((arg) => arg.startsWith(prefix));
  return raw ? raw.slice(prefix.length).trim() : '';
}

async function main() {
  const target = getFcmTargetFilter({
    email: getArgValue('email'),
    userId: getArgValue('user-id'),
  });

  const title = getArgValue('title') || undefined;
  const body = getArgValue('body') || undefined;

  const { data, error } = await getSupabase()
    .from('user_profiles')
    .select('id, email, full_name, fcm_token')
    .eq(target.column, target.value)
    .maybeSingle();

  if (error) {
    throw new Error(error.message || 'Failed to load user profile');
  }

  const profile = requirePushReadyProfile(data);
  const result = await sendPushNotification(
    buildFcmTestPayload({
      token: profile.fcm_token,
      title,
      body,
    }),
  );

  console.log(
    JSON.stringify(
      {
        ok: true,
        target: {
          id: profile.id,
          email: profile.email,
          full_name: profile.full_name || null,
        },
        firebase: result,
      },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(`[fcm-test-fail] ${error.message}`);
  process.exit(1);
});
