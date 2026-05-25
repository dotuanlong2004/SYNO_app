import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const sql = fs.readFileSync(
    path.resolve(__dirname, '..', '..', 'supabase', 'migrations', '202605220003_super_admin_platform_scope.sql'),
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
      "select id, full_name, role, school_id, is_active from public.user_profiles where role = 'super_admin' order by updated_at desc",
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
