'use strict';

require('dotenv').config();

const bcrypt = require('bcryptjs');
const { getPool } = require('../src/config/database');

async function main() {
  const email = (process.env.SEED_USER_EMAIL || 'teacher1@school.local').toLowerCase();
  const plainPassword = process.env.SEED_USER_PASSWORD || 'Password@123';
  const fullName = process.env.SEED_USER_FULL_NAME || 'Default Teacher';
  const role = process.env.SEED_USER_ROLE || 'teacher';
  const classId = process.env.SEED_USER_CLASS_ID || '12A1';
  const studentCode = process.env.SEED_USER_STUDENT_CODE || 'HS001';

  const passwordHash = await bcrypt.hash(plainPassword, 12);

  const pool = getPool();
  await pool.query(
    `INSERT INTO users (email, password_hash, full_name, role, class_id, student_code)
     VALUES ($1, $2, $3, $4, $5, $6)
     ON CONFLICT (email)
     DO UPDATE SET password_hash = EXCLUDED.password_hash,
                   full_name = EXCLUDED.full_name,
                   role = EXCLUDED.role,
                   class_id = EXCLUDED.class_id,
                   student_code = EXCLUDED.student_code,
                   updated_at = NOW()`,
    [email, passwordHash, fullName, role, classId, studentCode]
  );

  console.log('Seeded user:', {
    email,
    role,
    fullName,
    classId,
    studentCode,
    password: plainPassword,
  });
  await pool.end();
}

main().catch((err) => {
  console.error('db:seed-user failed:', err.message);
  process.exit(1);
});
