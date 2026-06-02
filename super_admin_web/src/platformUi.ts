export function roleLabel(role: string | null | undefined): string {
  switch (String(role || '').toLowerCase()) {
    case 'super_admin':
      return 'Quản trị hệ thống';
    case 'admin':
      return 'Tài khoản nhà trường';
    case 'teacher':
      return 'Tài khoản nhà trường';
    default:
      return 'Nhân sự';
  }
}

export function roleDetailLabel(role: string | null | undefined): string {
  switch (String(role || '').toLowerCase()) {
    case 'super_admin':
      return 'SYNO Super Admin';
    case 'admin':
      return 'Admin trường';
    case 'teacher':
      return 'Giáo viên';
    default:
      return 'Nhân sự';
  }
}

export function schoolStatusLabel(status: string | null | undefined): string {
  switch (String(status || '').toLowerCase()) {
    case 'active':
      return 'Đang hoạt động';
    case 'inactive':
      return 'Tạm ngưng';
    case 'suspended':
      return 'Bị khóa';
    default:
      return 'Chưa cập nhật';
  }
}

export function statusBadgeClass(status: string | null | undefined): string {
  switch (String(status || '').toLowerCase()) {
    case 'active':
      return 'bg-emerald-100 text-emerald-700';
    case 'inactive':
      return 'bg-slate-100 text-slate-600';
    case 'suspended':
      return 'bg-rose-100 text-rose-700';
    default:
      return 'bg-amber-100 text-amber-700';
  }
}

export function userStatusLabel(isActive: boolean): string {
  return isActive ? 'Đang hoạt động' : 'Đã khóa';
}

export function matchesTextSearch(item: Record<string, unknown>, query: string, fields: string[]): boolean {
  const keyword = query.trim().toLowerCase();
  if (!keyword) return true;
  return fields.some((field) => String(item[field] || '').toLowerCase().includes(keyword));
}
