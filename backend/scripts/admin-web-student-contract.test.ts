import assert from 'node:assert/strict';

import { buildStudentBulkPayload, buildStudentPayload } from '../src/services/adminWebStudents';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[admin-student-ok] ${name}`);
  } catch (error) {
    console.error(`[admin-student-fail] ${name}`);
    throw error;
  }
}

test('buildStudentPayload trims student fields and scopes by school', () => {
  assert.deepEqual(
    buildStudentPayload({
      row: { student_code: ' HS001 ', full_name: ' Nguyen Van A ', class_name: ' 1A ' },
      schoolId: '1',
    }),
    {
      student_code: 'HS001',
      full_name: 'Nguyen Van A',
      class_name: '1A',
      school_id: '1',
    },
  );
});

test('buildStudentPayload rejects missing student_code or full_name', () => {
  assert.throws(
    () => buildStudentPayload({ row: { student_code: '', full_name: 'Nguyen Van A' }, schoolId: '1' }),
    /student_code and full_name are required/,
  );
});

test('buildStudentBulkPayload reports invalid rows and keeps valid rows', () => {
  const result = buildStudentBulkPayload({
    rows: [
      { student_code: 'HS001', full_name: 'Nguyen Van A', class_name: '1A' },
      { student_code: '', full_name: 'No Code' },
    ],
    schoolId: '1',
  });

  assert.equal(result.sanitised.length, 1);
  assert.equal(result.invalid.length, 1);
  assert.equal(result.invalid[0].row, 2);
});

test('buildStudentBulkPayload rejects duplicate student codes in the same import file', () => {
  assert.throws(
    () => buildStudentBulkPayload({
      rows: [
        { student_code: 'HS001', full_name: 'Nguyen Van A' },
        { student_code: ' HS001 ', full_name: 'Nguyen Van B' },
      ],
      schoolId: '1',
    }),
    /duplicate student_code HS001/,
  );
});
