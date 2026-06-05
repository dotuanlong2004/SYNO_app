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

  const supabase = getSupabase();
  let profileId = target.value;
  if (target.column === 'email') {
    const { data: usersPage, error: usersError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (usersError) {
      throw new Error(usersError.message || 'Failed to load auth users');
    }

    const authUser = usersPage.users.find(
      (user) => String(user.email || '').trim().toLowerCase() === target.value,
    );
    if (!authUser) {
      throw new Error(`No auth user found for email ${target.value}`);
    }
    profileId = authUser.id;
  }

  const { data, error } = await supabase
    .from('user_profiles')
    .select('id, full_name, fcm_token')
    .eq('id', profileId)
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
          email: target.column === 'email' ? target.value : undefined,
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
