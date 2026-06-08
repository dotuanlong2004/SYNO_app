'use strict';

const { DateTime } = require('luxon');

const TZ = process.env.ATTENDANCE_TIMEZONE || 'Asia/Ho_Chi_Minh';

export function formatLocalTime(isoOrDate: string | Date) {
  if (isoOrDate instanceof Date) {
    return DateTime.fromJSDate(isoOrDate).setZone(TZ).toFormat('HH:mm dd/MM/yyyy');
  }
  return DateTime.fromISO(String(isoOrDate), { zone: 'utc' }).setZone(TZ).toFormat('HH:mm dd/MM/yyyy');
}

function normalizeAttendanceLogType(logType: unknown) {
  return String(logType || '') === 'check_out' ? 'check_out' : 'check_in';
}

export function buildAttendanceNotificationKey({
  studentCode,
  logType,
  scannedAt,
}: {
  studentCode: string;
  logType: string;
  scannedAt: Date;
}) {
  return `attendance:${studentCode}:${normalizeAttendanceLogType(logType)}:${scannedAt.toISOString()}`;
}

export function buildAttendancePushPayload({
  token,
  student,
  studentCode,
  logType,
  scannedAt,
}: {
  token: string;
  student: { id: string | number; full_name?: string | null };
  studentCode: string;
  logType: string;
  scannedAt: Date;
}) {
  const normalizedLogType = normalizeAttendanceLogType(logType);
  const verb = normalizedLogType === 'check_in' ? 'vào' : 'ra';
  const localTime = formatLocalTime(scannedAt);
  const notificationKey = buildAttendanceNotificationKey({
    studentCode,
    logType: normalizedLogType,
    scannedAt,
  });

  return {
    token,
    title: 'Thông báo điểm danh',
    body: `${student.full_name || studentCode} đã điểm danh ${verb} lúc ${localTime}.`,
    data: {
      type: 'attendance',
      notification_key: notificationKey,
      student_id: String(student.id),
      student_code: studentCode,
      check_type: verb,
      log_type: normalizedLogType,
      check_time: scannedAt.toISOString(),
    },
    tag: notificationKey,
  };
}
