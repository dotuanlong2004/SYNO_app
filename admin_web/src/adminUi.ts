export function roleLabel(role: string | null | undefined): string {
  switch (String(role || '').toLowerCase()) {
    case 'admin':
      return 'Nhà trường';
    case 'teacher':
      return 'Giáo viên';
    default:
      return 'Nhân sự';
  }
}

export function paymentStatusLabel(status: string | null | undefined): string {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'Đã thanh toán';
    case 'partial':
      return 'Thanh toán một phần';
    case 'overdue':
      return 'Quá hạn';
    case 'unpaid':
      return 'Chưa thanh toán';
    default:
      return 'Chưa cập nhật';
  }
}

export function paymentStatusClass(status: string | null | undefined): string {
  switch (String(status || '').toLowerCase()) {
    case 'paid':
      return 'bg-emerald-100 text-emerald-700';
    case 'partial':
      return 'bg-sky-100 text-sky-700';
    case 'overdue':
      return 'bg-rose-100 text-rose-700';
    case 'unpaid':
      return 'bg-amber-100 text-amber-700';
    default:
      return 'bg-slate-100 text-slate-600';
  }
}

export function attendanceStatusLabel(status: string | null | undefined): string {
  switch (String(status || '').toLowerCase()) {
    case 'on_time':
      return 'Đúng giờ';
    case 'late':
      return 'Muộn';
    case 'early':
      return 'Về sớm';
    case 'manual':
      return 'Thủ công';
    case 'leave':
      return 'Ra';
    default:
      return status ? 'Không xác định' : 'Không xác định';
  }
}

export function dayLabel(day: number | string | null | undefined): string {
  const value = Number(day);
  if (!Number.isFinite(value) || value < 1 || value > 6) {
    return 'Chưa chọn thứ';
  }
  return `Thứ ${value + 1}`;
}

export function formatCurrency(value: number | string | null | undefined): string {
  const amount = Number(value || 0);
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    maximumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return '-';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '-';
  return date.toLocaleString('vi-VN');
}

export function matchesTextSearch(item: Record<string, unknown>, query: string, fields: string[]): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return fields.some((field) => String(item[field] || '').toLowerCase().includes(keyword));
}
