'use strict';

require('dotenv').config();

const { Client } = require('pg');

const EXPECTED_SUPABASE_REF = process.env.EXPECTED_SUPABASE_REF || 'bimepdqcwpsynjimvenn';
const EXPECTED_SCHOOL_ID = process.env.EXPECTED_SCHOOL_ID || '1';
const strict = process.argv.includes('--strict');

const results = [];

function addCheck(name, ok, details) {
  results.push({ name, ok, details });
}

function getSupabaseRefFromUrl(rawUrl) {
  try {
    const url = new URL(rawUrl);
    const match = url.hostname.match(/^([^.]+)\.supabase\.co$/);
    return match?.[1] || null;
  } catch (error) {
    return null;
  }
}

function inspectDbUrl(rawUrl) {
  if (!rawUrl) {
    return { present: false };
  }

  try {
    const url = new URL(rawUrl);
    const directHostMatch = url.hostname.match(/^db\.([^.]+)\.supabase\.co$/);
    const poolerUserMatch = decodeURIComponent(url.username || '').match(/^postgres\.([a-z0-9]+)$/);

    return {
      present: true,
      host: url.hostname,
      username: decodeURIComponent(url.username || ''),
      directRef: directHostMatch?.[1] || null,
      poolerRef: poolerUserMatch?.[1] || null,
    };
  } catch (error) {
    return { present: true, invalid: true, error: error.message };
  }
}

async function canConnectPostgres(connectionString) {
  if (!connectionString) {
    return { ok: false, message: 'SUPABASE_DB_URL is missing' };
  }

  const client = new Client({
    connectionString,
    connectionTimeoutMillis: 7000,
    ssl: { rejectUnauthorized: false },
  });

  try {
    await client.connect();
    const result = await client.query('select current_database() as database_name, current_user as user_name');
    return {
      ok: true,
      database: result.rows[0]?.database_name || null,
      user: result.rows[0]?.user_name || null,
    };
  } catch (error) {
    return {
      ok: false,
      code: error.code || null,
      message: error.message || 'Postgres connection failed',
    };
  } finally {
    await client.end().catch(() => {});
  }
}

async function main() {
  const supabaseRef = getSupabaseRefFromUrl(process.env.SUPABASE_URL);
  addCheck(
    'SUPABASE_URL points to expected SYNO project',
    supabaseRef === EXPECTED_SUPABASE_REF,
    `expected=${EXPECTED_SUPABASE_REF}, actual=${supabaseRef || 'missing'}`
  );

  addCheck(
    'SUPABASE_SERVICE_ROLE_KEY is configured server-side',
    Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY),
    process.env.SUPABASE_SERVICE_ROLE_KEY ? 'present' : 'missing'
  );

  addCheck(
    'SUPABASE_ANON_KEY is configured',
    Boolean(process.env.SUPABASE_ANON_KEY),
    process.env.SUPABASE_ANON_KEY ? 'present' : 'missing'
  );

  const dbUrl = inspectDbUrl(process.env.SUPABASE_DB_URL);
  const dbUrlRef = dbUrl.directRef || dbUrl.poolerRef || null;
  addCheck(
    'SUPABASE_DB_URL points to expected SYNO database tenant',
    dbUrl.present && !dbUrl.invalid && dbUrlRef === EXPECTED_SUPABASE_REF,
    dbUrl.invalid
      ? `invalid: ${dbUrl.error}`
      : `expected=${EXPECTED_SUPABASE_REF}, actual=${dbUrlRef || 'missing'}, host=${dbUrl.host || 'missing'}, user=${dbUrl.username || 'missing'}`
  );

  const dbConnection = await canConnectPostgres(process.env.SUPABASE_DB_URL);
  addCheck(
    'SUPABASE_DB_URL accepts direct pg connection for pg-boss',
    dbConnection.ok,
    dbConnection.ok
      ? `database=${dbConnection.database}, user=${dbConnection.user}`
      : `code=${dbConnection.code || 'n/a'}, ${dbConnection.message}`
  );

  addCheck(
    'ENABLE_ATTENDANCE_QUEUE is enabled for production',
    process.env.ENABLE_ATTENDANCE_QUEUE === 'true',
    `actual=${process.env.ENABLE_ATTENDANCE_QUEUE || 'unset'}`
  );

  addCheck(
    'HARDWARE_API_KEY protects hardware ingestion',
    Boolean(process.env.HARDWARE_API_KEY),
    process.env.HARDWARE_API_KEY ? 'present' : 'missing'
  );

  addCheck(
    'Firebase Admin credentials are configured for real FCM push',
    Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || process.env.GOOGLE_APPLICATION_CREDENTIALS),
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON
      ? 'FIREBASE_SERVICE_ACCOUNT_JSON present'
      : process.env.GOOGLE_APPLICATION_CREDENTIALS
        ? 'GOOGLE_APPLICATION_CREDENTIALS present'
        : 'missing'
  );

  const configuredSchoolId = process.env.DEFAULT_SCHOOL_ID || process.env.SCHOOL_ID || '1';
  addCheck(
    'Default school tenant is HNS school_id=1',
    String(configuredSchoolId) === EXPECTED_SCHOOL_ID,
    `actual=${configuredSchoolId}`
  );

  let failed = false;
  for (const result of results) {
    const prefix = result.ok ? '[ready-ok]' : '[ready-fail]';
    console.log(`${prefix} ${result.name}: ${result.details}`);
    if (!result.ok) failed = true;
  }

  if (failed && strict) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(`[ready-error] ${error.message}`);
  process.exit(1);
});
