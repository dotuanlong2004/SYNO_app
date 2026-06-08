import assert from 'node:assert/strict';

import { buildAttendancePushPayload } from '../src/services/attendanceNotifications';

function test(name: string, fn: () => void) {
  try {
    fn();
    console.log(`[attendance-notification-ok] ${name}`);
  } catch (error) {
    console.error(`[attendance-notification-fail] ${name}`);
    throw error;
  }
}

test('buildAttendancePushPayload creates Vietnamese attendance copy and stable key', () => {
  const payload = buildAttendancePushPayload({
    token: 'device-token',
    student: { id: 85, full_name: 'Long' },
    studentCode: 'HS0085',
    logType: 'check_in',
    scannedAt: new Date('2026-06-08T09:00:00.000Z'),
  });

  assert.equal(payload.title, 'Thông báo điểm danh');
  assert.match(payload.body, /Long đã điểm danh vào lúc/);
  assert.equal(
    payload.data.notification_key,
    'attendance:HS0085:check_in:2026-06-08T09:00:00.000Z',
  );
  assert.equal(payload.tag, payload.data.notification_key);
});

test('buildAttendancePushPayload normalizes check_out copy', () => {
  const payload = buildAttendancePushPayload({
    token: 'device-token',
    student: { id: 86, full_name: 'Hoa' },
    studentCode: 'HS0086',
    logType: 'check_out',
    scannedAt: new Date('2026-06-08T10:00:00.000Z'),
  });

  assert.match(payload.body, /Hoa đã điểm danh ra lúc/);
  assert.equal(payload.data.check_type, 'ra');
  assert.equal(payload.data.log_type, 'check_out');
});
