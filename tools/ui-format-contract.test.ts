import assert from 'node:assert/strict';
import {
  attendanceStatusLabel,
  dayLabel,
  formatCurrency,
  matchesTextSearch as adminMatchesTextSearch,
  paymentStatusLabel,
  roleLabel as adminRoleLabel,
} from '../admin_web/src/adminUi';
import {
  roleLabel as platformRoleLabel,
  schoolStatusLabel,
  statusBadgeClass,
  userStatusLabel,
} from '../super_admin_web/src/platformUi';

assert.equal(adminRoleLabel('admin'), 'Quản trị trường');
assert.equal(adminRoleLabel('teacher'), 'Giáo viên');
assert.equal(paymentStatusLabel('paid'), 'Đã thanh toán');
assert.equal(paymentStatusLabel('unpaid'), 'Chưa thanh toán');
assert.equal(attendanceStatusLabel('late'), 'Đi muộn');
assert.equal(dayLabel(1), 'Thứ 2');
assert.equal(dayLabel(6), 'Thứ 7');
assert.equal(formatCurrency(500000), '500.000 ₫');
assert.equal(adminMatchesTextSearch({ full_name: 'Nguyễn Văn A', class_name: '10A1' }, '10a', ['full_name', 'class_name']), true);

assert.equal(platformRoleLabel('super_admin'), 'Quản trị viên');
assert.equal(platformRoleLabel('admin'), 'Admin trường');
assert.equal(schoolStatusLabel('active'), 'Đang hoạt động');
assert.equal(statusBadgeClass('suspended'), 'bg-rose-100 text-rose-700');
assert.equal(userStatusLabel(false), 'Đã khóa');

console.log('[ui-format-ok] labels, status text, currency, and search helpers are stable');
