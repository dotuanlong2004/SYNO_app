'use strict';

type TimetableInput = {
  class_id?: unknown;
  subject_name?: unknown;
  day_of_week?: unknown;
  start_time?: unknown;
  end_time?: unknown;
  room?: unknown;
  teacher_name?: unknown;
  period?: unknown;
};

type BuildTimetablePayloadInput = {
  row: TimetableInput;
  schoolId: string;
};

export function normalizeDayOfWeek(value: unknown): number {
  const day = Number(value);
  if (!Number.isInteger(day) || day < 1 || day > 7) {
    throw new Error('day_of_week must be an integer from 1 to 7');
  }
  return day;
}

export function normalizeTime(value: unknown): string {
  const time = String(value || '').trim();
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(time);
  if (!match) {
    throw new Error('time must use HH:mm format');
  }
  return time;
}

export function buildTimetablePayload({ row, schoolId }: BuildTimetablePayloadInput) {
  const classId = String(row.class_id || '').trim();
  const subjectName = String(row.subject_name || '').trim();
  if (!classId || !subjectName) {
    throw new Error('class_id and subject_name are required');
  }

  const startTime = normalizeTime(row.start_time || '07:30');
  const endTime = normalizeTime(row.end_time || '08:15');
  if (startTime >= endTime) {
    throw new Error('start_time must be before end_time');
  }

  return {
    school_id: schoolId,
    class_id: classId,
    subject_name: subjectName,
    day_of_week: normalizeDayOfWeek(row.day_of_week || 1),
    start_time: startTime,
    end_time: endTime,
    room: String(row.room || '').trim() || null,
    teacher_name: String(row.teacher_name || '').trim() || null,
    period: String(row.period || '').trim() || null,
  };
}
