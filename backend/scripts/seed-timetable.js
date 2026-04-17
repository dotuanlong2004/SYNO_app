'use strict';

require('dotenv').config();

const { getPool } = require('../src/config/database');

async function main() {
  const schoolId = process.env.SEED_SCHOOL_ID || 'default_school';
  const classId = process.env.SEED_USER_CLASS_ID || '12A1';
  const pool = getPool();

  await pool.query('DELETE FROM timetables WHERE school_id = $1 AND class_id = $2', [schoolId, classId]);

  await pool.query(
    `INSERT INTO timetables (school_id, class_id, subject_name, day_of_week, start_time, end_time, room)
     VALUES
      ($1, $2, 'Toán', 1, '07:30', '08:15', 'A101'),
      ($1, $2, 'Ngữ văn', 1, '08:25', '09:10', 'A102'),
      ($1, $2, 'Tiếng Anh', 1, '09:25', '10:10', 'A103'),
      ($1, $2, 'Vật lý', 2, '07:30', '08:15', 'B201'),
      ($1, $2, 'Hóa học', 2, '08:25', '09:10', 'B202'),
      ($1, $2, 'Tin học', 2, '09:25', '10:10', 'Phòng máy 1'),
      ($1, $2, 'Lịch sử', 3, '07:30', '08:15', 'A201'),
      ($1, $2, 'Địa lý', 3, '08:25', '09:10', 'A202'),
      ($1, $2, 'Giáo dục công dân', 3, '09:25', '10:10', 'A203'),
      ($1, $2, 'Sinh học', 4, '07:30', '08:15', 'B301'),
      ($1, $2, 'Công nghệ', 4, '08:25', '09:10', 'Xưởng 1'),
      ($1, $2, 'Thể dục', 4, '09:25', '10:10', 'Sân trường'),
      ($1, $2, 'Toán', 5, '07:30', '08:15', 'A101'),
      ($1, $2, 'Tiếng Anh', 5, '08:25', '09:10', 'A103'),
      ($1, $2, 'Ngữ văn', 5, '09:25', '10:10', 'A102'),
      ($1, $2, 'Chuyên đề', 6, '07:30', '08:15', 'Phòng hội thảo'),
      ($1, $2, 'Sinh hoạt lớp', 6, '08:25', '09:10', 'Phòng chủ nhiệm')`,
    [schoolId, classId]
  );

  const { rows } = await pool.query(
    'SELECT COUNT(*)::int AS total FROM timetables WHERE school_id = $1 AND class_id = $2',
    [schoolId, classId]
  );
  console.log('Seeded timetable rows for school/class', schoolId, classId, ':', rows[0].total);
  await pool.end();
}

main().catch((error) => {
  console.error('seed-timetable failed:', error.message);
  process.exit(1);
});
