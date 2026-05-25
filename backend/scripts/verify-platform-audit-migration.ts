import path from 'node:path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const client = new Client({
    connectionString: process.env.SUPABASE_DB_URL,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    const table = await client.query(
      "select relname, relrowsecurity from pg_class where relname = 'platform_audit_logs'",
    );
    const policies = await client.query(
      "select policyname from pg_policies where schemaname = 'public' and tablename = 'platform_audit_logs' order by policyname",
    );

    if (table.rowCount !== 1 || table.rows[0].relrowsecurity !== true) {
      throw new Error('platform_audit_logs table or RLS is missing');
    }
    if (!policies.rows.some((row) => row.policyname === 'super admins can read platform audit logs')) {
      throw new Error('platform audit select policy is missing');
    }

    console.log('[migration-verify-ok] platform_audit_logs table, RLS, and policy exist');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[migration-verify-fail] ${error.message}`);
  process.exitCode = 1;
});
