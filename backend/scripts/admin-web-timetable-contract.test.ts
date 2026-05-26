import assert from 'node:assert/strict';

import { buildTimetablePayload, normalizeDayOfWeek, normalizeTime } from '../src/services/adminWebTimetables';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[admin-timetable-ok] ${name}`);
  } catch (error) {
    console.error(`[admin-timetable-fail] ${name}`);
    throw error;
  }
}

test('normalizeDayOfWeek accepts days 1 to 7', () => {
  assert.equal(normalizeDayOfWeek('1'), 1);
  assert.equal(normalizeDayOfWeek(5), 5);
  assert.equal(normalizeDayOfWeek('7'), 7);
});

test('normalizeDayOfWeek rejects invalid days', () => {
  assert.throws(() => normalizeDayOfWeek(0), /day_of_week must be an integer from 1 to 7/);
  assert.throws(() => normalizeDayOfWeek(8), /day_of_week must be an integer from 1 to 7/);
  assert.throws(() => normalizeDayOfWeek('abc'), /day_of_week must be an integer from 1 to 7/);
});

test('normalizeTime accepts HH:mm time values', () => {
  assert.equal(normalizeTime('07:30'), '07:30');
  assert.equal(normalizeTime('23:59'), '23:59');
});

test('normalizeTime rejects invalid time values', () => {
  assert.throws(() => normalizeTime('7:30'), /time must use HH:mm format/);
  assert.throws(() => normalizeTime('24:00'), /time must use HH:mm format/);
  assert.throws(() => normalizeTime('09:60'), /time must use HH:mm format/);
});

test('buildTimetablePayload creates a school-scoped timetable payload', () => {
  const payload = buildTimetablePayload({
    row: {
      class_id: ' 10A1 ',
      subject_name: ' Toan ',
      day_of_week: '2',
      start_time: '07:30',
      end_time: '08:15',
      room: ' P101 ',
      teacher_name: ' Co Lan ',
      period: '1',
    },
    schoolId: '1',
  });

  assert.deepEqual(payload, {
    school_id: '1',
    class_id: '10A1',
    subject_name: 'Toan',
    day_of_week: 2,
    start_time: '07:30',
    end_time: '08:15',
    room: 'P101',
    teacher_name: 'Co Lan',
    period: '1',
  });
});
