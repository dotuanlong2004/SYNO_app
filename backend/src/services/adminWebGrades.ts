'use strict';

type GradeInput = {
  student_code?: unknown;
  subject_name?: unknown;
  midterm_score?: unknown;
  final_score?: unknown;
  semester?: unknown;
  academic_year?: unknown;
};

type BuildGradePayloadInput = {
  row: GradeInput;
  schoolId: string;
  studentId: number | string | null | undefined;
};

export function normalizeScore(value: unknown): number {
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 10) {
    throw new Error('score must be a number from 0 to 10');
  }
  return score;
}

export function buildGradePayload({ row, schoolId, studentId }: BuildGradePayloadInput) {
  if (!studentId) {
    throw new Error('student_id is required');
  }

  const studentCode = String(row.student_code || '').trim();
  const subjectName = String(row.subject_name || '').trim();
  if (!studentCode || !subjectName) {
    throw new Error('student_code and subject_name are required');
  }

  const midtermScore = normalizeScore(row.midterm_score ?? 0);
  const finalScore = normalizeScore(row.final_score ?? 0);

  return {
    school_id: schoolId,
    student_id: studentId,
    student_code: studentCode,
    subject_name: subjectName,
    midterm_score: midtermScore,
    final_score: finalScore,
    average_score: Math.round(((midtermScore + finalScore * 2) / 3) * 10) / 10,
    semester: String(row.semester || '1'),
    academic_year: String(row.academic_year || '2024-2025'),
  };
}
