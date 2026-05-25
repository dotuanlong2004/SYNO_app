import path from 'node:path';
import { Client } from 'pg';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

const email = 'superadmin@syno.local';
const password = '123456';

async function findAuthUserIdByEmail() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const result = await client.query(
      'select id from auth.users where lower(email) = lower($1) limit 1',
      [email],
    );
    return result.rows[0]?.id || null;
  } finally {
    await client.end();
  }
}

async function main() {
  const supabase = createClient(
    process.env.SUPABASE_URL || '',
    process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let userId = await findAuthUserIdByEmail();
  if (userId) {
    const { error } = await supabase.auth.admin.updateUserById(userId, {
      password,
      user_metadata: {
        full_name: 'SYNO Super Admin',
        role: 'super_admin',
        school_id: null,
      },
      app_metadata: {
        role: 'super_admin',
        school_id: null,
      },
    });
    if (error) throw error;
  } else {
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: 'SYNO Super Admin',
        role: 'super_admin',
        school_id: null,
      },
      app_metadata: {
        role: 'super_admin',
        school_id: null,
      },
    });
    if (error) throw error;
    userId = data.user.id;
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .upsert({
      id: userId,
      full_name: 'SYNO Super Admin',
      role: 'super_admin',
      school_id: null,
      is_active: true,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'id' })
    .select('id, full_name, role, school_id, is_active')
    .single();

  if (profileError) throw profileError;
  console.log(JSON.stringify({ email, password, profile }, null, 2));
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
