'use strict';

type StudentInput = {
  student_code?: unknown;
  full_name?: unknown;
  class_name?: unknown;
};

type BuildStudentPayloadInput = {
  row: StudentInput;
  schoolId: string;
};

type BuildStudentBulkPayloadInput = {
  rows: StudentInput[];
  schoolId: string;
};

export function buildStudentPayload({ row, schoolId }: BuildStudentPayloadInput) {
  const studentCode = String(row.student_code || '').trim();
  const fullName = String(row.full_name || '').trim();
  const className = String(row.class_name || '').trim();

  if (!studentCode || !fullName) {
    throw new Error('student_code and full_name are required');
  }

  return {
    student_code: studentCode,
    full_name: fullName,
    class_name: className || null,
    school_id: schoolId,
  };
}

export function buildStudentBulkPayload({ rows, schoolId }: BuildStudentBulkPayloadInput) {
  const sanitised = [];
  const invalid = [];
  const seenCodes = new Map<string, number>();

  for (let i = 0; i < rows.length; i++) {
    try {
      const payload = buildStudentPayload({ row: rows[i], schoolId });
      const previousRow = seenCodes.get(payload.student_code);
      if (previousRow !== undefined) {
        throw new Error(`duplicate student_code ${payload.student_code} at rows ${previousRow} and ${i + 1}`);
      }
      seenCodes.set(payload.student_code, i + 1);
      sanitised.push(payload);
    } catch (error) {
      if (String(error?.message || '').startsWith('duplicate student_code')) {
        throw error;
      }
      invalid.push({
        row: i + 1,
        reason: 'student_code and full_name are required',
        data: rows[i],
      });
    }
  }

  return { sanitised, invalid };
}
