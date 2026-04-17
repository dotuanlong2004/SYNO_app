'use strict';

require('dotenv').config();

const { getPool } = require('../src/config/database');

async function main() {
  const schoolId = process.env.SEED_SCHOOL_ID || 'default_school';
  const pool = getPool();

  await pool.query(`
    INSERT INTO students (school_id, student_code, full_name, class_name, link_code)
    VALUES
      ($1, 'HS001', 'Nguyen Van A', '12A1', 'LK-HS001'),
      ($1, 'HS002', 'Tran Thi B', '12A1', 'LK-HS002')
    ON CONFLICT (student_code)
    DO UPDATE SET
      school_id = EXCLUDED.school_id,
      full_name = EXCLUDED.full_name,
      class_name = EXCLUDED.class_name,
      link_code = EXCLUDED.link_code,
      updated_at = NOW()
  `, [schoolId]);

  await pool.query(`
    INSERT INTO attendance_logs (school_id, student_id, scanned_at, log_type, status_detail, late_minutes)
    SELECT
      $1,
      s.id,
      NOW() - (g.n || ' minutes')::interval,
      CASE WHEN g.n % 2 = 0 THEN 'check_in' ELSE 'check_out' END,
      CASE
        WHEN g.n IN (5, 15) THEN 'late'
        WHEN g.n = 35 THEN 'leave'
        ELSE 'on_time'
      END,
      CASE WHEN g.n IN (5, 15) THEN g.n ELSE NULL END
    FROM students s
    CROSS JOIN (VALUES (5), (15), (25), (35)) AS g(n)
    WHERE s.student_code IN ('HS001', 'HS002')
      AND s.school_id = $1
  `, [schoolId]);

  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM attendance_logs'
  );
  console.log('Seeded attendance logs. Total rows:', rows[0].total);

  await pool.end();
}

main().catch((error) => {
  console.error('seed-attendance failed:', error.message);
  process.exit(1);
});
