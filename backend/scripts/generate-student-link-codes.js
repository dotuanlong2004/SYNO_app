'use strict';

require('dotenv').config();

const fs = require('fs');
const path = require('path');
const { getPool } = require('../src/config/database');

async function main() {
  const migrationPath = path.join(
    __dirname,
    '..',
    'db',
    'migrations',
    '004_generate_student_link_codes.sql'
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');
  const pool = getPool();
  await pool.query(sql);

  const { rows } = await pool.query(
    `SELECT COUNT(*)::int AS total,
            COUNT(link_code)::int AS with_code
     FROM students`
  );
  console.log('Student link code generation complete:', rows[0]);
  await pool.end();
}

main().catch((error) => {
  console.error('generate-student-link-codes failed:', error.message);
  process.exit(1);
});
