import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  matchesTextSearch,
  roleDetailLabel,
  schoolStatusLabel,
  statusBadgeClass,
  userStatusLabel,
} from './platformUi';
import synoLogoMark from './assets/brand/syno-logo-mark.png';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3000/api/v1';
const PLATFORM_API = `${API_BASE}/platform-admin`;
const AUTH_TOKEN_KEY = 'super_admin_web_token';
const AUTH_REFRESH_TOKEN_KEY = 'super_admin_web_refresh_token';
const AUTH_USER_KEY = 'super_admin_web_user';
const API_CONNECTION_ERROR = 'Không thể kết nối đến backend SYNO. Hãy kiểm tra API server đang chạy ở http://127.0.0.1:3000.';

type TabKey = 'overview' | 'schools' | 'users' | 'roles' | 'audit' | 'settings';

type AuthUser = {
  id: string;
  email: string;
  full_name?: string;
  role: string;
  school_id?: string | null;
};

type School = {
  id: string;
  name: string;
  code?: string | null;
  status: string;
  website_url?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  description?: string | null;
  education_levels?: string[];
  created_at?: string | null;
};

type AdminUser = {
  id: string;
  email?: string;
  full_name: string;
  role: 'teacher' | 'admin' | 'super_admin';
  school_id: string | null;
  is_active: boolean;
  created_at?: string | null;
  updated_at?: string | null;
};

type AuditLog = {
  id: string;
  actor_email?: string | null;
  actor_user_id?: string | null;
  action: string;
  target_type: string;
  target_id: string;
  school_id?: string | null;
  created_at: string;
};

const blankSchoolForm = {
  id: '',
  name: '',
  code: '',
  status: 'active',
  website_url: '',
  address: '',
  phone: '',
  email: '',
  description: '',
  education_levels: 'primary, secondary, high_school',
};

const blankUserForm = {
  email: '',
  full_name: '',
  role: 'admin',
  school_id: '',
  is_active: true,
  use_temporary_password: true,
  temporary_password: '',
};

async function requestJson(url: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(API_CONNECTION_ERROR);
  }
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) {
    const error = new Error(json?.error || `Request failed: HTTP ${response.status}`) as Error & { status?: number };
    error.status = response.status;
    throw error;
  }
  return json;
}

function formatDate(value?: string | null) {
  if (!value) return '-';
  return new Date(value).toLocaleString('vi-VN');
}

function schoolNameById(schools: School[], schoolId?: string | null) {
  if (!schoolId) return 'Nền tảng SYNO';
  return schools.find((school) => school.id === schoolId)?.name || schoolId;
}

function actionLabel(action: string) {
  const labels: Record<string, string> = {
    'admin_user.create': 'Tạo tài khoản',
    'admin_user.update': 'Sửa tài khoản',
    'admin_user.deactivate': 'Khóa tài khoản',
    'admin_user.activate': 'Mở khóa tài khoản',
    'admin_user.reset_password': 'Đặt lại mật khẩu',
    'school.create': 'Tạo trường học',
    'school.update': 'Sửa thông tin trường học',
  };
  return labels[action] || action;
}

function targetLabel(log: AuditLog) {
  const targetType = log.target_type === 'user_profile' || log.target_type === 'auth_user'
    ? 'Tài khoản'
    : log.target_type === 'school'
      ? 'Trường học'
      : log.target_type;
  return `${targetType}: ${log.target_id}`;
}

function BrandIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'justify-center gap-3'}`}>
      <span className={`${compact ? 'h-11 w-11' : 'h-14 w-14'} flex shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200`}>
        <img src={synoLogoMark} alt="" className="h-10 w-10 object-contain" />
      </span>
      <span className="text-left">
        <span className={`${compact ? 'text-xl' : 'text-3xl'} block font-black leading-none tracking-normal text-slate-950`}>SYNO</span>
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} block font-semibold uppercase tracking-normal text-slate-500`}>
          Kết nối - Đồng bộ - Phát triển
        </span>
      </span>
    </div>
  );
}

function LoginScreen({ onLogin }: { onLogin: (token: string, user: AuthUser) => void }) {
  const [email, setEmail] = useState('superadmin@syno.local');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    try {
      const json = await requestJson(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const role = String(json.user?.role || '').toLowerCase();
      if (role !== 'super_admin') {
        setError('Chỉ tài khoản SYNO Super Admin được vào cổng quản trị nền tảng.');
        return;
      }
      localStorage.setItem(AUTH_TOKEN_KEY, json.access_token);
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, json.refresh_token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(json.user));
      onLogin(json.access_token, json.user);
    } catch (error: any) {
      setError(error.message || 'Không thể đăng nhập.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center bg-slate-100 px-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <BrandIdentity />
        <h1 className="mt-5 text-center text-xl font-bold">Quản trị nền tảng SYNO</h1>
        <p className="mb-5 mt-1 text-center text-sm text-slate-500">Dành riêng cho SYNO Super Admin.</p>
        <label className="mb-3 block text-sm font-semibold">
          Email
          <input className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={email} onChange={(event) => setEmail(event.target.value)} />
        </label>
        <label className="mb-4 block text-sm font-semibold">
          Mật khẩu
          <input type="password" className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2" value={password} onChange={(event) => setPassword(event.target.value)} />
        </label>
        {error ? <div className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        <button disabled={loading} className="w-full rounded-lg bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-400">
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}

function AppShell({
  token,
  user,
  onLogout,
  onSessionRefresh,
}: {
  token: string;
  user: AuthUser;
  onLogout: () => void;
  onSessionRefresh: (token: string, user: AuthUser) => void;
}) {
  const [tab, setTab] = useState<TabKey>('overview');
  const [schools, setSchools] = useState<School[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [schoolModalOpen, setSchoolModalOpen] = useState(false);
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [userModalMode, setUserModalMode] = useState<'create' | 'edit' | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [resetUser, setResetUser] = useState<AdminUser | null>(null);
  const [resetPasswordValue, setResetPasswordValue] = useState('');
  const [schoolForm, setSchoolForm] = useState(blankSchoolForm);
  const [userForm, setUserForm] = useState(blankUserForm);

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  async function refreshSession() {
    const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      onLogout();
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    const json = await requestJson(`${API_BASE}/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    const role = String(json.user?.role || '').toLowerCase();
    if (role !== 'super_admin') {
      onLogout();
      throw new Error('Tài khoản này không còn quyền truy cập cổng quản trị nền tảng.');
    }

    localStorage.setItem(AUTH_TOKEN_KEY, json.access_token);
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, json.refresh_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(json.user));
    onSessionRefresh(json.access_token, json.user);
    return json.access_token;
  }

  async function authedRequestJson(url: string, options: RequestInit = {}) {
    try {
      return await requestJson(url, options);
    } catch (error: any) {
      if (error.status !== 401) throw error;
      const nextToken = await refreshSession();
      const retryHeaders = new Headers(options.headers);
      retryHeaders.set('Authorization', `Bearer ${nextToken}`);
      return requestJson(url, { ...options, headers: retryHeaders });
    }
  }

  async function loadData() {
    setLoading(true);
    setMessage('');
    try {
      const [schoolJson, userJson, auditJson] = await Promise.all([
        authedRequestJson(`${PLATFORM_API}/schools`, { headers }),
        authedRequestJson(`${PLATFORM_API}/admin-users`, { headers }),
        authedRequestJson(`${PLATFORM_API}/audit-logs`, { headers }),
      ]);
      const nextSchools = schoolJson.data || [];
      setSchools(nextSchools);
      setAdminUsers(userJson.data || []);
      setAuditLogs(auditJson.data || []);
      if (!userForm.school_id && nextSchools[0]?.id) {
        setUserForm((prev) => ({ ...prev, school_id: nextSchools[0].id }));
      }
    } catch (error: any) {
      setMessage(error.message || 'Không thể tải dữ liệu quản trị nền tảng.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [headers]);

  const schoolAccountCounts = useMemo(() => {
    const counts = new Map<string, number>();
    adminUsers.forEach((item) => {
      if (item.school_id) counts.set(item.school_id, (counts.get(item.school_id) || 0) + 1);
    });
    return counts;
  }, [adminUsers]);

  const stats = useMemo(() => ({
    schools: schools.length,
    activeSchools: schools.filter((school) => school.status === 'active').length,
    accounts: adminUsers.length,
    lockedAccounts: adminUsers.filter((item) => item.is_active === false).length,
    platformAdmins: adminUsers.filter((item) => item.role === 'super_admin').length,
    tenantUsers: adminUsers.filter((item) => item.role !== 'super_admin').length,
  }), [schools, adminUsers]);

  const filteredSchools = useMemo(() => {
    return schools.filter((school) =>
      matchesTextSearch(school as unknown as Record<string, unknown>, schoolSearch, ['id', 'name', 'code', 'status', 'website_url'])
    );
  }, [schools, schoolSearch]);

  const filteredAdminUsers = useMemo(() => {
    return adminUsers.filter((item) =>
      matchesTextSearch(
        {
          ...item,
          school_name: schoolNameById(schools, item.school_id),
          role_label: roleDetailLabel(item.role),
        },
        userSearch,
        ['full_name', 'email', 'role', 'role_label', 'school_id', 'school_name'],
      )
    );
  }, [adminUsers, userSearch, schools]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((item) =>
      matchesTextSearch(
        { ...item, action_label: actionLabel(item.action), target_label: targetLabel(item) },
        auditSearch,
        ['actor_email', 'action', 'action_label', 'target_type', 'target_id', 'target_label', 'school_id'],
      )
    );
  }, [auditLogs, auditSearch]);

  function openCreateSchool() {
    setEditingSchoolId(null);
    setSchoolForm(blankSchoolForm);
    setSchoolModalOpen(true);
  }

  function openEditSchool(school: School) {
    setEditingSchoolId(school.id);
    setSchoolForm({
      id: school.id,
      name: school.name || '',
      code: school.code || '',
      status: school.status || 'active',
      website_url: school.website_url || '',
      address: school.address || '',
      phone: school.phone || '',
      email: school.email || '',
      description: school.description || '',
      education_levels: Array.isArray(school.education_levels) ? school.education_levels.join(', ') : '',
    });
    setSchoolModalOpen(true);
  }

  function openCreateUser() {
    setEditingUserId(null);
    setUserForm({ ...blankUserForm, school_id: schools[0]?.id || '' });
    setUserModalMode('create');
  }

  function openEditUser(item: AdminUser) {
    setEditingUserId(item.id);
    setUserForm({
      ...blankUserForm,
      email: item.email || '',
      full_name: item.full_name || '',
      role: item.role || 'admin',
      school_id: item.role === 'super_admin' ? '' : (item.school_id || schools[0]?.id || ''),
      is_active: item.is_active !== false,
      use_temporary_password: false,
      temporary_password: '',
    });
    setUserModalMode('edit');
  }

  async function saveSchool(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      const payload = {
        ...schoolForm,
        education_levels: schoolForm.education_levels.split(',').map((item) => item.trim()).filter(Boolean),
      };
      await authedRequestJson(`${PLATFORM_API}/schools${editingSchoolId ? `/${editingSchoolId}` : ''}`, {
        method: editingSchoolId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      setSchoolModalOpen(false);
      setEditingSchoolId(null);
      setSchoolForm(blankSchoolForm);
      setMessage(editingSchoolId ? 'Đã cập nhật thông tin trường học.' : 'Đã tạo trường học.');
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'Không thể lưu trường học.');
    }
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    if (userModalMode === 'create' && (!userForm.use_temporary_password || userForm.temporary_password.length < 6)) {
      setMessage('Vui lòng nhập mật khẩu tạm tối thiểu 6 ký tự cho tài khoản mới.');
      return;
    }
    try {
      const role = userForm.role;
      const payload = {
        full_name: userForm.full_name,
        role,
        school_id: role === 'super_admin' ? null : userForm.school_id,
        is_active: userForm.is_active,
      };
      await authedRequestJson(`${PLATFORM_API}/admin-users${editingUserId ? `/${editingUserId}` : ''}`, {
        method: editingUserId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(
          editingUserId
            ? payload
            : { ...payload, email: userForm.email, password: userForm.temporary_password },
        ),
      });
      setUserModalMode(null);
      setEditingUserId(null);
      setUserForm({ ...blankUserForm, school_id: schools[0]?.id || '' });
      setMessage(editingUserId ? 'Đã cập nhật tài khoản.' : 'Đã tạo tài khoản. Tài khoản cần đổi mật khẩu trong lần đăng nhập đầu tiên.');
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'Không thể lưu tài khoản.');
    }
  }

  async function toggleUser(item: AdminUser) {
    const nextActive = item.is_active === false;
    const action = nextActive ? 'mở khóa' : 'khóa';
    if (!window.confirm(`Xác nhận ${action} tài khoản "${item.full_name || item.email}"?`)) return;
    setMessage('');
    try {
      await authedRequestJson(`${PLATFORM_API}/admin-users/${item.id}/status`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ is_active: nextActive }),
      });
      setMessage(nextActive ? 'Đã mở khóa tài khoản.' : 'Đã khóa tài khoản.');
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'Không thể cập nhật trạng thái tài khoản.');
    }
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    if (!resetUser || resetPasswordValue.length < 6) {
      setMessage('Mật khẩu tạm phải có tối thiểu 6 ký tự.');
      return;
    }
    setMessage('');
    try {
      await authedRequestJson(`${PLATFORM_API}/admin-users/${resetUser.id}/password`, {
        method: 'PATCH',
        headers,
        body: JSON.stringify({ password: resetPasswordValue }),
      });
      setMessage('Đã đặt lại mật khẩu. Tài khoản cần đổi mật khẩu trong lần đăng nhập đầu tiên.');
      setResetUser(null);
      setResetPasswordValue('');
      await loadData();
    } catch (error: any) {
      setMessage(error.message || 'Không thể đặt lại mật khẩu.');
    }
  }

  const sidebarItems: Array<[TabKey, string, string]> = [
    ['overview', 'Tổng quan', 'Chỉ số vận hành nền tảng'],
    ['schools', 'Trường học', 'Quản lý tenant trường'],
    ['users', 'Tài khoản người dùng', 'Super Admin và tài khoản nhà trường'],
    ['roles', 'Vai trò & phân quyền', 'Mô tả phạm vi truy cập'],
    ['audit', 'Nhật ký hệ thống', 'Theo dõi thao tác quan trọng'],
    ['settings', 'Cấu hình', 'Thiết lập nền tảng'],
  ];

  const activeTitle = sidebarItems.find(([key]) => key === tab)?.[1] || 'Tổng quan';
  const activeDescription = sidebarItems.find(([key]) => key === tab)?.[2] || '';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-950">
      <div className="flex min-h-screen">
        <aside className="w-72 shrink-0 border-r border-slate-200 bg-white/95 p-4 shadow-sm">
          <BrandIdentity compact />
          <div className="mt-5 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
            Cổng quản trị nền tảng
          </div>
          <nav className="mt-5 space-y-1">
            {sidebarItems.map(([key, label, description]) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`w-full rounded-xl px-3 py-3 text-left transition ${
                  tab === key ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                <span className="block text-sm font-bold">{label}</span>
                <span className={`mt-0.5 block text-xs ${tab === key ? 'text-blue-100' : 'text-slate-500'}`}>{description}</span>
              </button>
            ))}
          </nav>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-xl font-bold">{activeTitle}</h1>
                <p className="text-sm text-slate-500">{activeDescription}</p>
              </div>
              <button type="button" onClick={loadData} className="ml-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white">
                {loading ? 'Đang tải...' : 'Làm mới'}
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-right">
                  <div className="text-sm font-bold">{user.full_name || user.email}</div>
                  <div className="text-xs text-slate-500">{roleDetailLabel(user.role)}</div>
                </div>
                <button type="button" onClick={onLogout} className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-700">
                  Đăng xuất
                </button>
              </div>
            </div>
          </header>

          <main className="w-full px-5 py-5">
            {message ? <div className="mb-4 rounded-xl bg-amber-50 px-4 py-3 text-sm font-medium text-amber-800 ring-1 ring-amber-200">{message}</div> : null}
            {loading ? <div className="mb-4 rounded-xl bg-blue-50 px-4 py-3 text-sm font-medium text-blue-800 ring-1 ring-blue-200">Đang tải dữ liệu quản trị nền tảng...</div> : null}

            {tab === 'overview' ? (
              <OverviewPage
                stats={stats}
                onOpenSchools={(filter) => {
                  setSchoolSearch(filter);
                  setTab('schools');
                }}
                onOpenUsers={(filter) => {
                  setUserSearch(filter);
                  setTab('users');
                }}
              />
            ) : null}

            {tab === 'schools' ? (
              <SchoolsPage
                schools={filteredSchools}
                total={schools.length}
                search={schoolSearch}
                onSearch={setSchoolSearch}
                schoolAccountCounts={schoolAccountCounts}
                onCreate={openCreateSchool}
                onEdit={openEditSchool}
              />
            ) : null}

            {tab === 'users' ? (
              <UsersPage
                users={filteredAdminUsers}
                total={adminUsers.length}
                schools={schools}
                search={userSearch}
                onSearch={setUserSearch}
                onCreate={openCreateUser}
                onEdit={openEditUser}
                onToggle={toggleUser}
                onReset={(item) => {
                  setResetUser(item);
                  setResetPasswordValue('');
                }}
              />
            ) : null}

            {tab === 'roles' ? <RolesPage /> : null}

            {tab === 'audit' ? (
              <AuditPage
                logs={filteredAuditLogs}
                total={auditLogs.length}
                search={auditSearch}
                onSearch={setAuditSearch}
              />
            ) : null}

            {tab === 'settings' ? <SettingsPage /> : null}
          </main>
        </div>
      </div>

      {schoolModalOpen ? (
        <Modal title={editingSchoolId ? 'Sửa thông tin trường học' : 'Tạo trường học'} onClose={() => setSchoolModalOpen(false)}>
          <form onSubmit={saveSchool} className="grid gap-3">
            <Field label="ID trường học">
              <input className="field-input disabled:bg-slate-100" value={schoolForm.id} disabled={Boolean(editingSchoolId)} onChange={(event) => setSchoolForm((prev) => ({ ...prev, id: event.target.value }))} />
            </Field>
            <Field label="Tên trường học">
              <input className="field-input" value={schoolForm.name} onChange={(event) => setSchoolForm((prev) => ({ ...prev, name: event.target.value }))} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Mã trường">
                <input className="field-input" value={schoolForm.code} onChange={(event) => setSchoolForm((prev) => ({ ...prev, code: event.target.value }))} />
              </Field>
              <Field label="Trạng thái">
                <select className="field-input" value={schoolForm.status} onChange={(event) => setSchoolForm((prev) => ({ ...prev, status: event.target.value }))}>
                  <option value="active">Đang hoạt động</option>
                  <option value="inactive">Tạm ngưng</option>
                  <option value="suspended">Bị khóa</option>
                </select>
              </Field>
            </div>
            <Field label="Website">
              <input className="field-input" value={schoolForm.website_url} onChange={(event) => setSchoolForm((prev) => ({ ...prev, website_url: event.target.value }))} />
            </Field>
            <Field label="Địa chỉ trường học">
              <input className="field-input" value={schoolForm.address} onChange={(event) => setSchoolForm((prev) => ({ ...prev, address: event.target.value }))} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Số điện thoại liên hệ">
                <input className="field-input" value={schoolForm.phone} onChange={(event) => setSchoolForm((prev) => ({ ...prev, phone: event.target.value }))} />
              </Field>
              <Field label="Email liên hệ">
                <input className="field-input" value={schoolForm.email} onChange={(event) => setSchoolForm((prev) => ({ ...prev, email: event.target.value }))} />
              </Field>
            </div>
            <Field label="Mô tả hiển thị trên app phụ huynh">
              <textarea className="field-input min-h-24" value={schoolForm.description} onChange={(event) => setSchoolForm((prev) => ({ ...prev, description: event.target.value }))} />
            </Field>
            <Field label="Cấp học">
              <input className="field-input" value={schoolForm.education_levels} onChange={(event) => setSchoolForm((prev) => ({ ...prev, education_levels: event.target.value }))} />
            </Field>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setSchoolModalOpen(false)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{editingSchoolId ? 'Cập nhật' : 'Tạo trường học'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {userModalMode ? (
        <Modal title={userModalMode === 'create' ? 'Tạo tài khoản' : 'Sửa tài khoản'} onClose={() => setUserModalMode(null)}>
          <form onSubmit={saveUser} className="grid gap-3">
            {userModalMode === 'create' ? (
              <Field label="Email">
                <input type="email" className="field-input" value={userForm.email} onChange={(event) => setUserForm((prev) => ({ ...prev, email: event.target.value }))} />
              </Field>
            ) : (
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-600">
                Email: <strong>{userForm.email || 'Chưa có dữ liệu email từ Auth'}</strong>
              </div>
            )}
            <Field label="Họ tên">
              <input className="field-input" value={userForm.full_name} onChange={(event) => setUserForm((prev) => ({ ...prev, full_name: event.target.value }))} />
            </Field>
            <div className="grid gap-3 md:grid-cols-2">
              <Field label="Vai trò">
                <select
                  className="field-input"
                  value={userForm.role}
                  onChange={(event) => setUserForm((prev) => ({
                    ...prev,
                    role: event.target.value,
                    school_id: event.target.value === 'super_admin' ? '' : (prev.school_id || schools[0]?.id || ''),
                  }))}
                >
                  <option value="admin">Admin trường</option>
                  <option value="teacher">Giáo viên</option>
                  <option value="super_admin">SYNO Super Admin</option>
                </select>
              </Field>
              <Field label="Trạng thái">
                <select className="field-input" value={userForm.is_active ? 'active' : 'locked'} onChange={(event) => setUserForm((prev) => ({ ...prev, is_active: event.target.value === 'active' }))}>
                  <option value="active">Đang hoạt động</option>
                  <option value="locked">Đã khóa</option>
                </select>
              </Field>
            </div>
            {userForm.role === 'super_admin' ? (
              <div className="rounded-lg bg-blue-50 px-3 py-2 text-sm font-semibold text-blue-800">Tài khoản này thuộc phạm vi nền tảng, không gắn với trường học.</div>
            ) : (
              <Field label="Trường học trực thuộc">
                <select className="field-input" value={userForm.school_id} onChange={(event) => setUserForm((prev) => ({ ...prev, school_id: event.target.value }))}>
                  {schools.map((school) => <option key={school.id} value={school.id}>{school.name} ({school.id})</option>)}
                </select>
              </Field>
            )}
            {userModalMode === 'create' ? (
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <label className="flex items-center gap-2 text-sm font-semibold">
                  <input
                    type="checkbox"
                    checked={userForm.use_temporary_password}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, use_temporary_password: event.target.checked }))}
                  />
                  Tạo mật khẩu tạm
                </label>
                {userForm.use_temporary_password ? (
                  <input
                    type="password"
                    className="field-input mt-3"
                    placeholder="Nhập mật khẩu tạm tối thiểu 6 ký tự"
                    value={userForm.temporary_password}
                    onChange={(event) => setUserForm((prev) => ({ ...prev, temporary_password: event.target.value }))}
                  />
                ) : null}
                <p className="mt-2 text-xs font-medium text-slate-600">Tài khoản cần đổi mật khẩu trong lần đăng nhập đầu tiên.</p>
              </div>
            ) : null}
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setUserModalMode(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
              <button className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{userModalMode === 'create' ? 'Tạo tài khoản' : 'Cập nhật'}</button>
            </div>
          </form>
        </Modal>
      ) : null}

      {resetUser ? (
        <Modal title="Đặt lại mật khẩu" onClose={() => setResetUser(null)}>
          <form onSubmit={resetPassword} className="grid gap-3">
            <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
              <div className="font-semibold">{resetUser.full_name}</div>
              <div className="text-slate-500">{resetUser.email || resetUser.id}</div>
            </div>
            <Field label="Mật khẩu tạm mới">
              <input type="password" className="field-input" value={resetPasswordValue} onChange={(event) => setResetPasswordValue(event.target.value)} />
            </Field>
            <p className="text-sm font-medium text-slate-600">Tài khoản cần đổi mật khẩu trong lần đăng nhập đầu tiên.</p>
            <div className="flex justify-end gap-2 pt-2">
              <button type="button" onClick={() => setResetUser(null)} className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-semibold text-slate-700">Hủy</button>
              <button className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white">Đặt lại mật khẩu</button>
            </div>
          </form>
        </Modal>
      ) : null}
    </div>
  );
}

function OverviewPage({
  stats,
  onOpenSchools,
  onOpenUsers,
}: {
  stats: Record<string, number>;
  onOpenSchools: (filter: string) => void;
  onOpenUsers: (filter: string) => void;
}) {
  const cards = [
    ['Tổng số trường', stats.schools, () => onOpenSchools('')],
    ['Trường học đang hoạt động', stats.activeSchools, () => onOpenSchools('active')],
    ['Tổng số tài khoản', stats.accounts, () => onOpenUsers('')],
    ['Tài khoản bị khóa', stats.lockedAccounts, () => onOpenUsers('Đã khóa')],
    ['Quản trị hệ thống', stats.platformAdmins, () => onOpenUsers('super_admin')],
    ['Tài khoản nhà trường', stats.tenantUsers, () => onOpenUsers('Tài khoản nhà trường')],
  ] as const;

  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
        {cards.map(([label, value, onClick]) => (
          <button key={label} type="button" onClick={onClick} className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-200 hover:bg-blue-50">
            <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
            <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
          </button>
        ))}
      </div>
    </section>
  );
}

function SchoolsPage({
  schools,
  total,
  search,
  onSearch,
  schoolAccountCounts,
  onCreate,
  onEdit,
}: {
  schools: School[];
  total: number;
  search: string;
  onSearch: (value: string) => void;
  schoolAccountCounts: Map<string, number>;
  onCreate: () => void;
  onEdit: (school: School) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <SectionHeader title="Danh sách trường học" actionLabel="Tạo trường học" onAction={onCreate} />
      <ModuleSearch value={search} onChange={onSearch} placeholder="Tìm theo tên trường học, mã trường, trạng thái..." count={schools.length} total={total} />
      <DataTable headers={['Tên trường', 'Mã trường', 'Liên hệ', 'Số tài khoản', 'Trạng thái', 'Ngày tạo', 'Thao tác']}>
        {schools.map((school) => (
          <tr key={school.id} className="border-b border-slate-100">
            <td className="py-3 pr-4">
              <div className="font-semibold">{school.name}</div>
              <div className="text-xs text-slate-500">{school.address || school.id}</div>
            </td>
            <td className="py-3 pr-4">{school.code || '-'}</td>
            <td className="py-3 pr-4">
              <div>{school.phone || '-'}</div>
              <div className="text-xs text-slate-500">{school.email || school.website_url || '-'}</div>
            </td>
            <td className="py-3 pr-4">{schoolAccountCounts.get(school.id) || 0}</td>
            <td className="py-3 pr-4"><StatusBadge className={statusBadgeClass(school.status)} label={schoolStatusLabel(school.status)} /></td>
            <td className="py-3 pr-4">{formatDate(school.created_at)}</td>
            <td className="py-3 pr-4"><ActionButton onClick={() => onEdit(school)}>Sửa</ActionButton></td>
          </tr>
        ))}
      </DataTable>
      {schools.length === 0 ? <EmptyState message="Chưa có trường học phù hợp với bộ lọc." /> : null}
    </section>
  );
}

function UsersPage({
  users,
  total,
  schools,
  search,
  onSearch,
  onCreate,
  onEdit,
  onToggle,
  onReset,
}: {
  users: AdminUser[];
  total: number;
  schools: School[];
  search: string;
  onSearch: (value: string) => void;
  onCreate: () => void;
  onEdit: (user: AdminUser) => void;
  onToggle: (user: AdminUser) => void;
  onReset: (user: AdminUser) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <SectionHeader title="Tài khoản người dùng" actionLabel="Tạo tài khoản" onAction={onCreate} />
      <ModuleSearch value={search} onChange={onSearch} placeholder="Tìm theo họ tên, email, vai trò hoặc trường học..." count={users.length} total={total} />
      <DataTable headers={['Họ tên', 'Email', 'Vai trò', 'Trường học', 'Trạng thái', 'Ngày tạo', 'Thao tác']}>
        {users.map((item) => (
          <tr key={item.id} className="border-b border-slate-100">
            <td className="py-3 pr-4 font-semibold">{item.full_name || '-'}</td>
            <td className="py-3 pr-4">{item.email || '-'}</td>
            <td className="py-3 pr-4">{roleDetailLabel(item.role)}</td>
            <td className="py-3 pr-4">{item.role === 'super_admin' ? 'Nền tảng SYNO' : schoolNameById(schools, item.school_id)}</td>
            <td className="py-3 pr-4">
              <StatusBadge className={item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'} label={userStatusLabel(item.is_active)} />
            </td>
            <td className="py-3 pr-4">{formatDate(item.created_at)}</td>
            <td className="py-3 pr-4">
              <div className="flex flex-wrap gap-2">
                <ActionButton onClick={() => onEdit(item)}>Sửa</ActionButton>
                <ActionButton tone={item.is_active ? 'danger' : 'success'} onClick={() => onToggle(item)}>{item.is_active ? 'Khóa' : 'Mở khóa'}</ActionButton>
                <ActionButton tone="warning" onClick={() => onReset(item)}>Đặt lại mật khẩu</ActionButton>
              </div>
            </td>
          </tr>
        ))}
      </DataTable>
      {users.length === 0 ? <EmptyState message="Chưa có tài khoản phù hợp với bộ lọc." /> : null}
    </section>
  );
}

function RolesPage() {
  const roles = [
    ['SYNO Super Admin', 'Quản trị toàn nền tảng SYNO: trường học, tài khoản hệ thống, phân quyền và nhật ký hệ thống. Không gắn tenant trường học.'],
    ['Admin trường', 'Quản lý dữ liệu trong phạm vi trường trực thuộc: học sinh, thời khóa biểu, học phí, bảng điểm, thông báo và tin nhắn phụ huynh.'],
    ['Giáo viên', 'Truy cập nghiệp vụ được trường phân công trong phạm vi trường học, không có quyền xem/sửa dữ liệu toàn hệ thống.'],
    ['Quản trị hệ thống', 'Nhóm vận hành nền tảng có quyền kỹ thuật được kiểm soát. Không cấp quyền hệ thống cho người dùng thường.'],
  ];
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-bold">Vai trò & phân quyền</h2>
      <p className="mt-1 text-sm text-slate-500">Mỗi vai trò phải được giới hạn theo đúng phạm vi nền tảng hoặc trường học.</p>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {roles.map(([title, description]) => (
          <div key={title} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
            <div className="font-bold">{title}</div>
            <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function AuditPage({
  logs,
  total,
  search,
  onSearch,
}: {
  logs: AuditLog[];
  total: number;
  search: string;
  onSearch: (value: string) => void;
}) {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="mb-3 text-lg font-bold">Nhật ký hệ thống</h2>
      <ModuleSearch value={search} onChange={onSearch} placeholder="Tìm theo người thao tác, hành động hoặc đối tượng..." count={logs.length} total={total} />
      <DataTable headers={['Thời gian', 'Người thao tác', 'Hành động', 'Đối tượng', 'Kết quả']}>
        {logs.map((log) => (
          <tr key={log.id} className="border-b border-slate-100">
            <td className="py-3 pr-4">{formatDate(log.created_at)}</td>
            <td className="py-3 pr-4">{log.actor_email || log.actor_user_id || '-'}</td>
            <td className="py-3 pr-4">{actionLabel(log.action)}</td>
            <td className="py-3 pr-4">{targetLabel(log)}</td>
            <td className="py-3 pr-4"><StatusBadge className="bg-emerald-100 text-emerald-700" label="Thành công" /></td>
          </tr>
        ))}
      </DataTable>
      {logs.length === 0 ? <EmptyState message="Chưa có nhật ký hệ thống phù hợp với bộ lọc." /> : null}
    </section>
  );
}

function SettingsPage() {
  return (
    <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-lg font-bold">Cấu hình nền tảng</h2>
      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-semibold">API nền tảng</div>
          <p className="mt-2 text-sm text-slate-600">Các thao tác quản trị dùng namespace riêng `/api/v1/platform-admin/*` và yêu cầu vai trò `super_admin`.</p>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
          <div className="font-semibold">Phân tách tenant</div>
          <p className="mt-2 text-sm text-slate-600">Tài khoản nhà trường luôn gắn `school_id`; SYNO Super Admin có `school_id = null` và không bị gán vào trường học.</p>
        </div>
      </div>
    </section>
  );
}

function SectionHeader({ title, actionLabel, onAction }: { title: string; actionLabel: string; onAction: () => void }) {
  return (
    <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
      <h2 className="text-lg font-bold">{title}</h2>
      <button type="button" onClick={onAction} className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white">{actionLabel}</button>
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200">
      <table className="min-w-full text-left text-sm">
        <thead className="bg-slate-50">
          <tr className="border-b border-slate-200 text-slate-500">
            {headers.map((header) => <th key={header} className="px-3 py-3 pr-4 font-bold">{header}</th>)}
          </tr>
        </thead>
        <tbody className="bg-white">{children}</tbody>
      </table>
    </div>
  );
}

function ModuleSearch({ value, onChange, placeholder, count, total }: { value: string; onChange: (value: string) => void; placeholder: string; count: number; total: number }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input
        className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
          Xóa lọc
        </button>
      ) : null}
      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500">{count}/{total}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function StatusBadge({ label, className }: { label: string; className: string }) {
  return <span className={`inline-flex rounded-full px-2.5 py-1 text-xs font-bold ${className}`}>{label}</span>;
}

function ActionButton({ children, onClick, tone = 'neutral' }: { children: ReactNode; onClick: () => void; tone?: 'neutral' | 'danger' | 'success' | 'warning' }) {
  const classes = {
    neutral: 'bg-slate-100 text-slate-700',
    danger: 'bg-rose-100 text-rose-700',
    success: 'bg-emerald-100 text-emerald-700',
    warning: 'bg-amber-100 text-amber-700',
  };
  return <button type="button" onClick={onClick} className={`rounded-lg px-2.5 py-1.5 text-xs font-bold ${classes[tone]}`}>{children}</button>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-semibold text-slate-700">
      {label}
      <div className="mt-1">{children}</div>
    </label>
  );
}

function Modal({ title, children, onClose }: { title: string; children: ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 px-4 py-6">
      <div className="max-h-[92vh] w-full max-w-xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-bold">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-lg bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-700">Đóng</button>
        </div>
        {children}
      </div>
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY) || '';
    const savedRefreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) || '';
    if (savedToken && !savedRefreshToken) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return '';
    }
    return savedToken;
  });
  const [user, setUser] = useState<AuthUser | null>(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) return null;
    const raw = localStorage.getItem(AUTH_USER_KEY);
    try {
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  function handleLogin(nextToken: string, nextUser: AuthUser) {
    setToken(nextToken);
    setUser(nextUser);
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken('');
    setUser(null);
  }

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppShell
      token={token}
      user={user}
      onLogout={handleLogout}
      onSessionRefresh={handleLogin}
    />
  );
}
