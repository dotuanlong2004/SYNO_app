import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const sql = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'supabase', 'migrations', '202605220001_allow_super_admin_role.sql'),
    'utf8',
  );
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    const result = await client.query(
      "select conname, pg_get_constraintdef(oid) as definition from pg_constraint where conname = 'user_profiles_role_check'",
    );
    console.log(JSON.stringify(result.rows, null, 2));
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
