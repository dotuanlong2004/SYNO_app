import fs from 'node:fs';
import path from 'node:path';
import { Client } from 'pg';
import dotenv from 'dotenv';

dotenv.config({ path: path.join(__dirname, '..', '.env') });

async function main() {
  const dbUrl = process.env.SUPABASE_DB_URL;
  if (!dbUrl) {
    throw new Error('SUPABASE_DB_URL is required to apply platform audit migration');
  }

  const migrationPath = path.resolve(
    __dirname,
    '..',
    '..',
    'supabase',
    'migrations',
    '202605220002_platform_audit_logs.sql',
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const client = new Client({
    connectionString: dbUrl,
    ssl: { rejectUnauthorized: false },
  });

  await client.connect();
  try {
    await client.query(sql);
    console.log('[migration-ok] platform audit migration applied');
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(`[migration-fail] ${error.message}`);
  process.exitCode = 1;
});
