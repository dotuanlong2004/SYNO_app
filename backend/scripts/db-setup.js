'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getPool } = require('../src/config/database');

async function main() {
  const pool = getPool();

  const schemaPath = path.join(__dirname, '..', 'db', 'schema.sql');
  const schemaSql = fs.readFileSync(schemaPath, 'utf8');
  await pool.query(schemaSql);
  console.log('Database schema applied:', schemaPath);

  const migrationsDir = path.join(__dirname, '..', 'db', 'migrations');
  if (fs.existsSync(migrationsDir)) {
    const migrationFiles = fs
      .readdirSync(migrationsDir)
      .filter((file) => file.endsWith('.sql'))
      .sort();
    for (const file of migrationFiles) {
      const migrationPath = path.join(migrationsDir, file);
      const migrationSql = fs.readFileSync(migrationPath, 'utf8');
      await pool.query(migrationSql);
      console.log('Migration applied:', migrationPath);
    }
  }

  await pool.end();
}

main().catch((err) => {
  console.error('db:setup failed:', err.message);
  process.exit(1);
});
