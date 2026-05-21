'use strict';

const { DateTime } = require('luxon');

const TZ = process.env.ATTENDANCE_TIMEZONE || 'Asia/Ho_Chi_Minh';

/**
 * School-day windows (local wall clock in ATTENDANCE_TIMEZONE):
 * - 06:00–07:00: check-in on-time
 * - 07:01–10:29: check-in late (late_minutes from 07:00)
 * - 10:30–11:30: check-out
 *
 * @param {Date|string|number} scannedAt
 * @returns {{ log_type: 'check_in'|'check_out', status_detail: 'on_time'|'late'|'leave', late_minutes: number|null } | null}
 */
function classifyAttendance(scannedAt) {
  const raw = scannedAt instanceof Date ? scannedAt : new Date(scannedAt);
  if (Number.isNaN(raw.getTime())) {
    return null;
  }

  const dt = DateTime.fromJSDate(raw, { zone: 'utc' }).setZone(TZ);
  if (!dt.isValid) {
    return null;
  }

  const day = dt.startOf('day');
  const windowOpen = day.set({ hour: 6, minute: 0, second: 0, millisecond: 0 });
  const onTimeEndExclusive = day.set({ hour: 7, minute: 1, second: 0, millisecond: 0 });
  const lateEnd = day.set({ hour: 10, minute: 29, second: 59, millisecond: 999 });
  const checkoutStart = day.set({ hour: 10, minute: 30, second: 0, millisecond: 0 });
  const windowClose = day.set({ hour: 11, minute: 30, second: 59, millisecond: 999 });
  const sevenAm = day.set({ hour: 7, minute: 0, second: 0, millisecond: 0 });

  if (dt < windowOpen || dt > windowClose) {
    return null;
  }

  if (dt >= windowOpen && dt < onTimeEndExclusive) {
    return { log_type: 'check_in', status_detail: 'on_time', late_minutes: null };
  }

  if (dt >= onTimeEndExclusive && dt <= lateEnd) {
    const late_minutes = Math.max(1, Math.floor(dt.diff(sevenAm, 'minutes').minutes));
    return { log_type: 'check_in', status_detail: 'late', late_minutes };
  }

  if (dt >= checkoutStart && dt <= windowClose) {
    return { log_type: 'check_out', status_detail: 'leave', late_minutes: null };
  }

  return null;
}

module.exports = { classifyAttendance, ATTENDANCE_TIMEZONE: TZ };
