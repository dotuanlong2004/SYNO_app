import { type FormEvent, type ReactNode, useEffect, useMemo, useState } from 'react';
import {
  matchesTextSearch,
  roleLabel,
  schoolStatusLabel,
  statusBadgeClass,
  userStatusLabel,
} from './platformUi';
import synoLogo from './assets/brand/syno-logo-horizontal.png';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3000/api/v1';
const PLATFORM_API = `${API_BASE}/platform-admin`;
const AUTH_TOKEN_KEY = 'super_admin_web_token';
const AUTH_USER_KEY = 'super_admin_web_user';
const TEST_PASSWORD = '123456';
const API_CONNECTION_ERROR = 'Không thể kết nối đến backend SYNO. Hãy kiểm tra API server đang chạy ở http://127.0.0.1:3000.';

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
  education_levels?: string[];
};

type AdminUser = {
  id: string;
  full_name: string;
  role: 'teacher' | 'admin' | 'super_admin';
  school_id: string | null;
  is_active: boolean;
  updated_at?: string;
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

async function requestJson(url: string, options: RequestInit = {}) {
  let response: Response;
  try {
    response = await fetch(url, options);
  } catch {
    throw new Error(API_CONNECTION_ERROR);
  }
  const json = await response.json().catch(() => null);
  if (!response.ok || !json?.ok) {
    throw new Error(json?.error || `Request failed: HTTP ${response.status}`);
  }
  return json;
}

function LoginScreen({ onLogin }: { onLogin: (token: string, user: AuthUser) => void }) {
  const [email, setEmail] = useState('superadmin@syno.local');
  const [password, setPassword] = useState(TEST_PASSWORD);
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
        setError('Chỉ tài khoản super_admin được vào cổng này.');
        return;
      }
      localStorage.setItem(AUTH_TOKEN_KEY, json.access_token);
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
      <form onSubmit={handleSubmit} className="w-full max-w-sm rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
        <img src={synoLogo} alt="SYNO" className="mx-auto mb-4 h-14 w-auto" />
        <h1 className="text-center text-xl font-bold">Quản trị SYNO</h1>
        <p className="mb-5 mt-1 text-center text-sm text-slate-500">SYNO Super Admin</p>
        <label className="mb-3 block text-sm font-semibold">
          Email
          <input className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label className="mb-4 block text-sm font-semibold">
          Mật khẩu
          <input type="password" className="mt-1 w-full rounded-md border border-slate-300 px-3 py-2" value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error ? <div className="mb-3 rounded-md bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</div> : null}
        <button disabled={loading} className="w-full rounded-md bg-blue-600 px-4 py-2 font-semibold text-white disabled:bg-slate-400">
          {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </form>
    </main>
  );
}

function AppShell({ token, user, onLogout }: { token: string; user: AuthUser; onLogout: () => void }) {
  const [tab, setTab] = useState<'schools' | 'users' | 'audit'>('schools');
  const [schools, setSchools] = useState<School[]>([]);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [schoolSearch, setSchoolSearch] = useState('');
  const [userSearch, setUserSearch] = useState('');
  const [auditSearch, setAuditSearch] = useState('');
  const [editingSchoolId, setEditingSchoolId] = useState<string | null>(null);
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [schoolForm, setSchoolForm] = useState({
    id: '',
    name: '',
    code: '',
    status: 'active',
    website_url: '',
    education_levels: 'primary, secondary, high_school',
  });
  const [userForm, setUserForm] = useState({
    email: '',
    password: TEST_PASSWORD,
    full_name: '',
    role: 'admin',
    school_id: '',
    is_active: true,
  });
  const [resetForm, setResetForm] = useState({ user_id: '', password: TEST_PASSWORD });

  const headers = useMemo(() => ({
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  }), [token]);

  const stats = useMemo(() => ({
    schools: schools.length,
    activeSchools: schools.filter((school) => school.status !== 'inactive').length,
    tenantUsers: adminUsers.filter((item) => item.role !== 'super_admin').length,
    platformUsers: adminUsers.filter((item) => item.role === 'super_admin').length,
  }), [schools, adminUsers]);

  const filteredSchools = useMemo(() => {
    return schools.filter((school) =>
      matchesTextSearch(school as unknown as Record<string, unknown>, schoolSearch, ['id', 'name', 'code', 'status', 'website_url'])
    );
  }, [schools, schoolSearch]);

  const filteredAdminUsers = useMemo(() => {
    return adminUsers.filter((item) =>
      matchesTextSearch(item as unknown as Record<string, unknown>, userSearch, ['full_name', 'role', 'school_id'])
    );
  }, [adminUsers, userSearch]);

  const filteredAuditLogs = useMemo(() => {
    return auditLogs.filter((item) =>
      matchesTextSearch(item as unknown as Record<string, unknown>, auditSearch, ['actor_email', 'action', 'target_type', 'target_id', 'school_id'])
    );
  }, [auditLogs, auditSearch]);

  async function loadData() {
    setLoading(true);
    setMessage('');
    try {
      const [schoolJson, userJson, auditJson] = await Promise.all([
        requestJson(`${PLATFORM_API}/schools`, { headers }),
        requestJson(`${PLATFORM_API}/admin-users`, { headers }),
        requestJson(`${PLATFORM_API}/audit-logs`, { headers }),
      ]);
      const nextSchools = schoolJson.data || [];
      setSchools(nextSchools);
      setAdminUsers(userJson.data || []);
      setAuditLogs(auditJson.data || []);
      if (!userForm.school_id && nextSchools[0]?.id) {
        setUserForm((prev) => ({ ...prev, school_id: nextSchools[0].id }));
      }
    } catch (error: any) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadData();
  }, [headers]);

  async function saveSchool(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      const payload = {
        ...schoolForm,
        education_levels: schoolForm.education_levels.split(',').map((item) => item.trim()).filter(Boolean),
      };
      await requestJson(`${PLATFORM_API}/schools${editingSchoolId ? `/${editingSchoolId}` : ''}`, {
        method: editingSchoolId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(payload),
      });
      setSchoolForm({ id: '', name: '', code: '', status: 'active', website_url: '', education_levels: 'primary, secondary, high_school' });
      setEditingSchoolId(null);
      await loadData();
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  function editSchool(school: School) {
    setEditingSchoolId(school.id);
    setSchoolForm({
      id: school.id,
      name: school.name || '',
      code: school.code || '',
      status: school.status || 'active',
      website_url: school.website_url || '',
      education_levels: Array.isArray(school.education_levels) ? school.education_levels.join(', ') : '',
    });
    setTab('schools');
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    try {
      const role = userForm.role;
      const payload = {
        full_name: userForm.full_name,
        role,
        school_id: role === 'super_admin' ? null : userForm.school_id,
        is_active: userForm.is_active,
      };
      await requestJson(`${PLATFORM_API}/admin-users${editingUserId ? `/${editingUserId}` : ''}`, {
        method: editingUserId ? 'PUT' : 'POST',
        headers,
        body: JSON.stringify(editingUserId ? payload : { ...payload, email: userForm.email, password: userForm.password || TEST_PASSWORD }),
      });
      setEditingUserId(null);
      setUserForm({ email: '', password: TEST_PASSWORD, full_name: '', role: 'admin', school_id: schools[0]?.id || '', is_active: true });
      await loadData();
    } catch (error: any) {
      setMessage(error.message);
    }
  }

  function editUser(item: AdminUser) {
    setEditingUserId(item.id);
    setUserForm({
      email: '',
      password: TEST_PASSWORD,
      full_name: item.full_name || '',
      role: item.role || 'admin',
      school_id: item.role === 'super_admin' ? '' : (item.school_id || schools[0]?.id || ''),
      is_active: item.is_active !== false,
    });
    setResetForm({ user_id: item.id, password: TEST_PASSWORD });
    setTab('users');
  }

  async function toggleUser(item: AdminUser) {
    await requestJson(`${PLATFORM_API}/admin-users/${item.id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ is_active: item.is_active === false }),
    });
    await loadData();
  }

  async function resetPassword(event: FormEvent) {
    event.preventDefault();
    await requestJson(`${PLATFORM_API}/admin-users/${resetForm.user_id}/password`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ password: resetForm.password || TEST_PASSWORD }),
    });
    setMessage('Đã đặt lại mật khẩu tài khoản.');
    setResetForm({ user_id: '', password: TEST_PASSWORD });
    await loadData();
  }

  return (
    <div className="min-h-screen">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
          <img src={synoLogo} alt="SYNO" className="h-12 w-auto" />
          <div>
            <h1 className="text-xl font-bold">Quản trị SYNO</h1>
            <p className="text-xs font-medium text-slate-500">SYNO Super Admin</p>
          </div>
          <button onClick={loadData} className="rounded-md bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700">
            {loading ? 'Đang tải...' : 'Tải lại'}
          </button>
          <div className="ml-auto flex items-center gap-3 text-sm text-slate-600">
            <strong>{user.full_name || user.email}</strong>
            <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-bold text-blue-700">{roleLabel(user.role)}</span>
            <button onClick={onLogout} className="rounded-md border border-slate-300 px-3 py-1.5 font-medium">Đăng xuất</button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-5">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          {[
            ['Trường', stats.schools],
            ['Đang hoạt động', stats.activeSchools],
            ['Admin/Giáo viên', stats.tenantUsers],
            ['Quản trị viên', stats.platformUsers],
          ].map(([label, value]) => (
            <div key={label} className="rounded-lg border border-slate-200 bg-white p-3">
              <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
              <div className="mt-1 text-2xl font-bold">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['schools', 'Trường'],
            ['users', 'Tài khoản admin'],
            ['audit', 'Audit log'],
          ].map(([value, label]) => (
            <button key={value} onClick={() => setTab(value as any)} className={`rounded-md px-4 py-2 text-sm font-semibold ${tab === value ? 'bg-blue-600 text-white' : 'bg-white text-slate-700 ring-1 ring-slate-200'}`}>
              {label}
            </button>
          ))}
        </div>

        {message ? <div className="mb-4 rounded-md bg-amber-50 px-4 py-3 text-sm text-amber-700">{message}</div> : null}

        {tab === 'schools' ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <form onSubmit={saveSchool} className="mb-5 grid gap-2 md:grid-cols-6">
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm disabled:bg-slate-100" placeholder="ID trường" value={schoolForm.id} disabled={Boolean(editingSchoolId)} onChange={(e) => setSchoolForm((prev) => ({ ...prev, id: e.target.value }))} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-2" placeholder="Tên trường" value={schoolForm.name} onChange={(e) => setSchoolForm((prev) => ({ ...prev, name: e.target.value }))} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Mã" value={schoolForm.code} onChange={(e) => setSchoolForm((prev) => ({ ...prev, code: e.target.value }))} />
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={schoolForm.status} onChange={(e) => setSchoolForm((prev) => ({ ...prev, status: e.target.value }))}>
                <option value="active">active</option>
                <option value="inactive">inactive</option>
                <option value="suspended">suspended</option>
              </select>
              <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">{editingSchoolId ? 'Cập nhật' : 'Tạo trường'}</button>
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-3" placeholder="Website" value={schoolForm.website_url} onChange={(e) => setSchoolForm((prev) => ({ ...prev, website_url: e.target.value }))} />
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm md:col-span-3" placeholder="Cấp học, cách nhau bằng dấu phẩy" value={schoolForm.education_levels} onChange={(e) => setSchoolForm((prev) => ({ ...prev, education_levels: e.target.value }))} />
            </form>
            <ModuleSearch
              value={schoolSearch}
              onChange={setSchoolSearch}
              placeholder="Tìm theo tên trường, mã, trạng thái, website..."
              count={filteredSchools.length}
              total={schools.length}
            />
            <DataTable headers={['ID', 'Tên trường', 'Mã', 'Trạng thái', 'Website', 'Thao tác']}>
              {filteredSchools.map((school) => (
                <tr key={school.id} className="border-b">
                  <td className="py-2">{school.id}</td>
                  <td className="py-2">{school.name}</td>
                  <td className="py-2">{school.code || '-'}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${statusBadgeClass(school.status)}`}>
                      {schoolStatusLabel(school.status)}
                    </span>
                  </td>
                  <td className="py-2">{school.website_url || '-'}</td>
                  <td className="py-2"><button onClick={() => editSchool(school)} className="rounded bg-amber-100 px-2 py-1 text-amber-700">Sửa</button></td>
                </tr>
              ))}
            </DataTable>
            {filteredSchools.length === 0 ? <EmptyState message="Chưa có trường phù hợp với bộ lọc." /> : null}
          </section>
        ) : null}

        {tab === 'users' ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <form onSubmit={saveUser} className="mb-5 grid gap-2 md:grid-cols-6">
              {!editingUserId ? <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Email" value={userForm.email} onChange={(e) => setUserForm((prev) => ({ ...prev, email: e.target.value }))} /> : null}
              {!editingUserId ? <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Mật khẩu" value={userForm.password} onChange={(e) => setUserForm((prev) => ({ ...prev, password: e.target.value }))} /> : null}
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" placeholder="Họ tên" value={userForm.full_name} onChange={(e) => setUserForm((prev) => ({ ...prev, full_name: e.target.value }))} />
              <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={userForm.role} onChange={(e) => setUserForm((prev) => ({ ...prev, role: e.target.value, school_id: e.target.value === 'super_admin' ? '' : (prev.school_id || schools[0]?.id || '') }))}>
                <option value="admin">Admin trường</option>
                <option value="teacher">Giáo viên</option>
                <option value="super_admin">Quản trị viên</option>
              </select>
              {userForm.role === 'super_admin' ? (
                <div className="rounded-md border border-slate-300 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-600">Phạm vi nền tảng</div>
              ) : (
                <select className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={userForm.school_id} onChange={(e) => setUserForm((prev) => ({ ...prev, school_id: e.target.value }))}>
                  {schools.map((school) => <option key={school.id} value={school.id}>{school.name} ({school.id})</option>)}
                </select>
              )}
              <button className="rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white">{editingUserId ? 'Cập nhật' : 'Tạo tài khoản'}</button>
            </form>

            <form onSubmit={resetPassword} className="mb-5 flex flex-wrap items-center gap-2 rounded-md bg-slate-50 p-3">
              <select className="min-w-64 rounded-md border border-slate-300 px-3 py-2 text-sm" value={resetForm.user_id} onChange={(e) => setResetForm((prev) => ({ ...prev, user_id: e.target.value }))}>
                <option value="">Chọn tài khoản reset mật khẩu</option>
                {adminUsers.map((item) => <option key={item.id} value={item.id}>{item.full_name} - {roleLabel(item.role)}</option>)}
              </select>
              <input className="rounded-md border border-slate-300 px-3 py-2 text-sm" value={resetForm.password} onChange={(e) => setResetForm((prev) => ({ ...prev, password: e.target.value }))} />
              <button disabled={!resetForm.user_id || resetForm.password.length < 6} className="rounded-md bg-amber-600 px-3 py-2 text-sm font-semibold text-white disabled:bg-slate-400">Reset mật khẩu</button>
            </form>

            <ModuleSearch
              value={userSearch}
              onChange={setUserSearch}
              placeholder="Tìm theo họ tên, vai trò hoặc trường..."
              count={filteredAdminUsers.length}
              total={adminUsers.length}
            />
            <DataTable headers={['Họ tên', 'Role', 'School', 'Active', 'Thao tác']}>
              {filteredAdminUsers.map((item) => (
                <tr key={item.id} className="border-b">
                  <td className="py-2">{item.full_name}</td>
                  <td className="py-2">{roleLabel(item.role)}</td>
                  <td className="py-2">{item.role === 'super_admin' ? 'Nền tảng' : item.school_id}</td>
                  <td className="py-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${item.is_active ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}`}>
                      {userStatusLabel(item.is_active)}
                    </span>
                  </td>
                  <td className="py-2">
                    <button onClick={() => editUser(item)} className="mr-2 rounded bg-amber-100 px-2 py-1 text-amber-700">Sửa</button>
                    <button onClick={() => toggleUser(item)} className={`rounded px-2 py-1 ${item.is_active ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}`}>{item.is_active ? 'Khóa' : 'Mở'}</button>
                  </td>
                </tr>
              ))}
            </DataTable>
            {filteredAdminUsers.length === 0 ? <EmptyState message="Chưa có tài khoản phù hợp với bộ lọc." /> : null}
          </section>
        ) : null}

        {tab === 'audit' ? (
          <section className="rounded-lg border border-slate-200 bg-white p-4">
            <ModuleSearch
              value={auditSearch}
              onChange={setAuditSearch}
              placeholder="Tìm theo người thao tác, hành động, target hoặc trường..."
              count={filteredAuditLogs.length}
              total={auditLogs.length}
            />
            <DataTable headers={['Thời gian', 'Người thao tác', 'Hành động', 'Target', 'School']}>
              {filteredAuditLogs.map((log) => (
                <tr key={log.id} className="border-b">
                  <td className="py-2">{new Date(log.created_at).toLocaleString('vi-VN')}</td>
                  <td className="py-2">{log.actor_email || log.actor_user_id || '-'}</td>
                  <td className="py-2">{log.action}</td>
                  <td className="py-2">{log.target_type}:{log.target_id}</td>
                  <td className="py-2">{log.school_id || '-'}</td>
                </tr>
              ))}
            </DataTable>
            {filteredAuditLogs.length === 0 ? <EmptyState message="Chưa có audit log phù hợp với bộ lọc." /> : null}
          </section>
        ) : null}
      </main>
    </div>
  );
}

function DataTable({ headers, children }: { headers: string[]; children: ReactNode }) {
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full text-left text-sm">
        <thead>
          <tr className="border-b text-slate-500">
            {headers.map((header) => <th key={header} className="py-2 pr-4">{header}</th>)}
          </tr>
        </thead>
        <tbody>{children}</tbody>
      </table>
    </div>
  );
}

function ModuleSearch({ value, onChange, placeholder, count, total }: { value: string; onChange: (value: string) => void; placeholder: string; count: number; total: number }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input
        className="min-w-64 flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button type="button" onClick={() => onChange('')} className="rounded-md bg-slate-200 px-3 py-2 text-sm font-medium text-slate-700">
          Xóa lọc
        </button>
      ) : null}
      <span className="rounded-md bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500">{count}/{total}</span>
    </div>
  );
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="mt-3 rounded-md border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

export default function App() {
  const [token, setToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || '');
  const [user, setUser] = useState<AuthUser | null>(() => {
    const raw = localStorage.getItem(AUTH_USER_KEY);
    return raw ? JSON.parse(raw) : null;
  });

  function handleLogin(nextToken: string, nextUser: AuthUser) {
    setToken(nextToken);
    setUser(nextUser);
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setToken('');
    setUser(null);
  }

  if (!token || !user) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AppShell token={token} user={user} onLogout={handleLogout} />;
}
