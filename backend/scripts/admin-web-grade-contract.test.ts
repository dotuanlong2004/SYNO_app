import assert from 'node:assert/strict';

import { buildGradePayload, normalizeScore } from '../src/services/adminWebGrades';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[admin-grade-ok] ${name}`);
  } catch (error) {
    console.error(`[admin-grade-fail] ${name}`);
    throw error;
  }
}

test('normalizeScore accepts numeric scores from 0 to 10', () => {
  assert.equal(normalizeScore('0'), 0);
  assert.equal(normalizeScore('8.25'), 8.25);
  assert.equal(normalizeScore(10), 10);
});

test('normalizeScore rejects non-numeric and out-of-range scores', () => {
  assert.throws(() => normalizeScore('abc'), /score must be a number from 0 to 10/);
  assert.throws(() => normalizeScore(-1), /score must be a number from 0 to 10/);
  assert.throws(() => normalizeScore(10.1), /score must be a number from 0 to 10/);
});

test('buildGradePayload requires a resolved school-scoped student id', () => {
  assert.throws(
    () => buildGradePayload({
      row: { student_code: 'HS001', subject_name: 'Toan', midterm_score: 8, final_score: 9 },
      schoolId: '1',
      studentId: null,
    }),
    /student_id is required/,
  );
});

test('buildGradePayload creates a school-scoped grade payload with weighted average', () => {
  const payload = buildGradePayload({
    row: {
      student_code: ' HS001 ',
      subject_name: ' Toan ',
      midterm_score: '8',
      final_score: '9',
      semester: '2',
      academic_year: '2025-2026',
    },
    schoolId: '1',
    studentId: 123,
  });

  assert.deepEqual(payload, {
    school_id: '1',
    student_id: 123,
    student_code: 'HS001',
    subject_name: 'Toan',
    midterm_score: 8,
    final_score: 9,
    average_score: 8.7,
    semester: '2',
    academic_year: '2025-2026',
  });
});
