import { type CSSProperties, useEffect, useMemo, useRef, useState } from 'react';
import * as XLSX from 'xlsx';
import {
  attendanceStatusLabel,
  dayLabel,
  formatCurrency,
  formatDateTime,
  matchesTextSearch,
  paymentStatusClass,
  paymentStatusLabel,
  roleLabel,
} from './adminUi';
import synoLogoMark from './assets/brand/syno-logo-mark.png';

// Use Vite environment variables (VITE_ prefix required)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3000/api/v1';
const HEALTH_API = API_BASE.replace(/\/api\/v1\/?$/, '/health');
const DEFAULT_SCHOOL_ID = import.meta.env.VITE_DEFAULT_SCHOOL_ID || '1';
const ADMIN_WEB_API = `${API_BASE}/admin-web`;
const AUTH_TOKEN_KEY = 'admin_web_token';
const AUTH_REFRESH_TOKEN_KEY = 'admin_web_refresh_token';
const AUTH_USER_KEY  = 'admin_web_user';
const API_CONNECTION_ERROR = 'Không thể kết nối đến máy chủ xử lý dữ liệu SYNO. Hãy kiểm tra dịch vụ đang chạy ở http://127.0.0.1:3000.';

// ─── Màn hình đăng nhập ─────────────────────────────────────────────────────
function LoginScreen({ onLogin }) {
  const [email, setEmail]       = useState('');
  const [password, setPassword] = useState('');
  const [error, setError]       = useState('');
  const [loading, setLoading]   = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    if (!email || !password) { setError('Vui lòng nhập email và mật khẩu.'); return; }
    setLoading(true);
    setError('');
    try {
      const res  = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        setError(json.error || `Đăng nhập thất bại (HTTP ${res.status})`);
        return;
      }
      const role = (json.user?.role || '').toLowerCase();
      if (role !== 'admin' && role !== 'teacher') {
        setError('Tài khoản này không có quyền truy cập trang quản trị.');
        return;
      }
      localStorage.setItem(AUTH_TOKEN_KEY, json.access_token);
      localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, json.refresh_token);
      localStorage.setItem(AUTH_USER_KEY, JSON.stringify(json.user));
      onLogin(json.access_token, json.user);
    } catch {
      setError(API_CONNECTION_ERROR);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at 20% 0%, rgba(30, 136, 255, 0.18), transparent 28rem), linear-gradient(135deg, #f8fbff 0%, #eef4ff 100%)',
      padding: '1rem',
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.9)', borderRadius: 22,
        boxShadow: '0 24px 70px rgba(15,23,42,0.14)',
        border: '1px solid rgba(148,163,184,0.26)',
        backdropFilter: 'blur(18px)',
        padding: '2.5rem 2rem', width: 400, maxWidth: '95vw',
        animation: 'syno-page-rise 360ms ease-out both',
      }}>
        <div style={{ marginBottom: '1.5rem' }}>
          <BrandIdentity />
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#0f172a', margin: 0 }}>Cổng quản trị SYNO</h1>
          <p style={{ color: '#64748b', fontSize: 13, marginTop: 4 }}>Nền tảng SaaS cho nhiều trường</p>
        </div>
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 14 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="admin@school.edu.vn" autoFocus
              style={inputStyle}
            />
          </div>
          <div style={{ marginBottom: 18 }}>
            <label style={{ display: 'block', fontSize: 13, fontWeight: 600, marginBottom: 4, color: '#374151' }}>Mật khẩu</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
              style={inputStyle}
            />
          </div>
          {error && (
            <div style={{
              background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
              borderRadius: 8, padding: '10px 14px', fontSize: 13, marginBottom: 14,
            }}>{error}</div>
          )}
          <button
            type="submit" disabled={loading}
            style={{
              width: '100%', padding: '11px 0', borderRadius: 10, border: 'none',
              background: loading ? '#94a3b8' : '#1E88FF', color: '#fff',
              fontWeight: 700, fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer',
              transition: 'background 0.2s',
            }}
          >
            {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
          </button>
        </form>
      </div>
    </div>
  );
}

const inputStyle: CSSProperties = {
  width: '100%', padding: '9px 12px', borderRadius: 8,
  border: '1.5px solid #e2e8f0', fontSize: 14, outline: 'none',
  boxSizing: 'border-box', color: '#1e293b',
};

function BrandIdentity({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`flex items-center ${compact ? 'gap-2' : 'justify-center gap-3'}`}>
      <span className={`${compact ? 'h-11 w-11' : 'h-14 w-14'} flex shrink-0 items-center justify-center rounded-xl bg-white shadow-sm ring-1 ring-slate-200`}>
        <img src={synoLogoMark} alt="" className="h-10 w-10 object-contain" />
      </span>
      <span className={compact ? 'text-left' : 'text-left'}>
        <span className={`${compact ? 'text-xl' : 'text-3xl'} block font-black leading-none tracking-normal text-slate-950`}>
          SYNO
        </span>
        <span className={`${compact ? 'text-[10px]' : 'text-xs'} block font-semibold uppercase tracking-normal text-slate-500`}>
          Kết nối - Đồng bộ - Phát triển
        </span>
      </span>
    </div>
  );
}

function ModuleSearch({ value, onChange, placeholder, count, total }) {
  return (
    <div className="mb-3 flex flex-wrap items-center gap-2">
      <input
        className="min-w-64 flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
        placeholder={placeholder}
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      {value ? (
        <button
          type="button"
          onClick={() => onChange('')}
          className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700"
        >
          Xóa lọc
        </button>
      ) : null}
      <span className="rounded-lg bg-slate-100 px-3 py-2 text-sm font-medium text-slate-500">
        {count}/{total}
      </span>
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="mt-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 px-4 py-6 text-center text-sm text-slate-500">
      {message}
    </div>
  );
}

function StatusBadge({ children, className = 'bg-slate-100 text-slate-700' }) {
  return <span className={`rounded-full px-2 py-1 text-xs font-semibold ${className}`}>{children}</span>;
}

function senderRoleLabel(value) {
  const role = String(value || '').toLowerCase();
  if (role === 'parent') return 'Phụ huynh';
  if (role === 'admin' || role === 'teacher' || role === 'staff') return 'Nhà trường';
  return 'Không rõ';
}

function SectionHeader({ title, description, actions = null }) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <h2 className="text-lg font-bold text-slate-950">{title}</h2>
        {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions}
    </div>
  );
}

function mapEntries(value) {
  if (!value || typeof value !== 'object') return [];
  return Object.entries(value).filter(([, amount]) => Number(amount || 0) > 0);
}

function feeSearchText(item) {
  return [
    item.student_code,
    item.class_id,
    item.payment_status,
    paymentStatusLabel(item.payment_status),
    item.payment_method,
    item.total_amount,
    ...mapEntries(item.subject_fees).flat(),
    ...mapEntries(item.other_fees).flat(),
  ].join(' ');
}

function timetableSearchText(item) {
  return [
    item.class_id,
    item.subject_name,
    dayLabel(item.day_of_week),
    item.day_of_week,
    item.period,
    item.start_time,
    item.end_time,
    item.teacher_name,
    item.room,
  ].join(' ');
}

function includesQuery(text, query) {
  const needle = String(query || '').trim().toLowerCase();
  if (!needle) return true;
  return String(text || '').toLowerCase().includes(needle);
}

function formatLooseCurrency(value) {
  return formatCurrency(String(value ?? 0));
}

function parseLooseAmount(value) {
  const raw = String(value || '').trim();
  if (!raw) return NaN;
  const numeric = raw
    .replace(/[^\d,.-]/g, '')
    .replace(/[.,](?=\d{3}(\D|$))/g, '')
    .replace(',', '.');
  return Number(numeric);
}

function parseFeeLines(text) {
  const result = {};
  String(text || '')
    .split(/\r?\n|,/)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      let label = '';
      let value = '';
      if (/[:=]/.test(line)) {
        const [rawLabel, ...rest] = line.split(/[:=]/);
        label = String(rawLabel || '').trim();
        value = rest.join(':').trim();
      } else {
        const match = line.match(/^(.+?)\s+([\d.,]+)\s*(?:d|đ|vnd)?$/i);
        label = String(match?.[1] || '').trim();
        value = String(match?.[2] || '').trim();
      }
      const amount = parseLooseAmount(value);
      if (label && Number.isFinite(amount) && amount > 0) {
        result[label] = amount;
      }
    });
  return result;
}

function feeMapToLines(value) {
  return mapEntries(value)
    .map(([label, amount]) => `${label}: ${Number(amount || 0)}`)
    .join('\n');
}

function periodSortValue(period) {
  const match = String(period || '').match(/\d+/);
  return match ? Number(match[0]) : 999;
}

function normalizePeriod(period) {
  const raw = String(period || '').trim();
  if (!raw) return '';
  const match = raw.match(/\d+/);
  return match ? `Tiết ${Number(match[0])}` : raw;
}

function defaultTimeForPeriod(period) {
  const slot = periodSortValue(period);
  const defaults = {
    1: ['07:30', '08:15'],
    2: ['08:20', '09:05'],
    3: ['09:20', '10:05'],
    4: ['10:10', '10:55'],
    5: ['11:00', '11:45'],
    6: ['13:30', '14:15'],
    7: ['14:20', '15:05'],
    8: ['15:20', '16:05'],
    9: ['16:10', '16:55'],
    10: ['17:00', '17:45'],
  };
  return defaults[slot] || ['07:30', '08:15'];
}

function normalizeSubjectName(subjectName) {
  const raw = String(subjectName || '').trim();
  const key = raw.toLowerCase();
  const aliases = {
    hoa: 'Hóa học',
    'hóa': 'Hóa học',
    'hoa hoc': 'Hóa học',
    'hóa hoc': 'Hóa học',
    van: 'Ngữ văn',
    'văn': 'Ngữ văn',
    anh: 'Tiếng Anh',
    'tieng anh': 'Tiếng Anh',
  };
  return aliases[key] || raw;
}

function openInputPicker(event) {
  try {
    event.currentTarget.showPicker?.();
  } catch {}
}

function FieldLabel({ children }) {
  return <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">{children}</label>;
}

const GRADE_LEVELS = Array.from({ length: 12 }, (_, index) => String(index + 1));

function getGradeLevel(className) {
  const match = String(className || '').match(/\d+/);
  if (!match) return '';
  const value = Number(match[0]);
  return value >= 1 && value <= 12 ? String(value) : '';
}

function firstGradeWithClasses(classes) {
  return GRADE_LEVELS.find((grade) => classes.some((className) => getGradeLevel(className) === grade)) || '';
}

function sortClassName(a, b) {
  const gradeDiff = Number(getGradeLevel(a) || 999) - Number(getGradeLevel(b) || 999);
  if (gradeDiff !== 0) return gradeDiff;
  return String(a || '').localeCompare(String(b || ''), 'vi', { numeric: true });
}

// ─── AppShell: Toàn bộ Admin UI (chỉ render khi đã đăng nhập) ──────────────
function AppShell({ authToken, authUser, onLogout, onSessionRefresh }) {
  const [tab, setTab] = useState('overview');
  const schoolId = String(authUser.school_id || DEFAULT_SCHOOL_ID);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [studentForm, setStudentForm] = useState({
    student_code: '',
    full_name: '',
    class_name: '',
  });
  const [editingStudentId, setEditingStudentId] = useState(null);
  const [selectedStudentId, setSelectedStudentId] = useState('');
  const [provisionResult, setProvisionResult] = useState(null);
  const [parentForm, setParentForm] = useState({
    parent_name: '',
    parent_email: '',
    parent_phone: '',
    relationship: 'mother',
    password: ''
  });
  const [timetables, setTimetables] = useState([]);
  const [selectedTimetable, setSelectedTimetable] = useState(null);
  const [selectedTimetableClass, setSelectedTimetableClass] = useState('');
  const [timetableForm, setTimetableForm] = useState({
    class_id: '',
    subject_name: '',
    day_of_week: 1,
    start_time: '07:30',
    end_time: '08:15',
    room: '',
    teacher_name: '',
    period: '',
  });
  const [editingTimetableId, setEditingTimetableId] = useState(null);
  const [fees, setFees] = useState([]);
  const [selectedFee, setSelectedFee] = useState(null);
  const [feeForm, setFeeForm] = useState({
    student_code: '',
    class_id: '',
    fee_name: '',
    apply_scope: 'student',
    subject_fees_text: '',
    other_fees_text: '',
    total_amount: '',
    payment_status: 'unpaid',
    payment_method: '',
    paid_at: '',
  });
  const [editingFeeId, setEditingFeeId] = useState(null);
  const [parents, setParents] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementForm, setAnnouncementForm] = useState({
    title: '',
    content: '',
    priority: 'normal',
    target_type: 'school',
    is_general: true,
    send_notification: false,
  });
  const [events, setEvents] = useState([]);
  const [eventForm, setEventForm] = useState({
    title: '',
    content: '',
    event_date: '',
    image_url: '',
    target_type: 'school',
    visible_on_parent_app: true,
  });
  const [editingEventId, setEditingEventId] = useState(null);
  const [eventImageLoading, setEventImageLoading] = useState(false);
  const eventImageFileRef = useRef(null);
  const [grades, setGrades] = useState([]);
  const [gradeForm, setGradeForm] = useState({
    student_code: '',
    subject_name: '',
    semester: 'Học kỳ 1',
    midterm_score: '',
    final_score: '',
    comment: '',
  });
  const [chatMessages, setChatMessages] = useState([]);
  const [chatForm, setChatForm] = useState({
    student_code: '',
    message_text: '',
  });
  const [systemHealth, setSystemHealth] = useState(null);
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceFilters, setAttendanceFilters] = useState({
    student_code: '',
    class_name: '',
    log_type: '',
    status_detail: '',
    date_from: '',
    date_to: '',
  });
  // Student search
  const [studentSearch, setStudentSearch] = useState('');
  const [studentGradeFilter, setStudentGradeFilter] = useState('');
  const [studentClassFilter, setStudentClassFilter] = useState('');
  const [timetableSearch, setTimetableSearch] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [feeGradeFilter, setFeeGradeFilter] = useState('');
  const [feeClassFilter, setFeeClassFilter] = useState('');
  const [feeStudentCodeFilter, setFeeStudentCodeFilter] = useState('');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [eventSearch, setEventSearch] = useState('');
  const [gradeSearch, setGradeSearch] = useState('');
  const [gradeGradeFilter, setGradeGradeFilter] = useState('');
  const [gradeClassFilter, setGradeClassFilter] = useState('');
  const [gradeStudentCodeFilter, setGradeStudentCodeFilter] = useState('');
  const [chatSearch, setChatSearch] = useState('');
  const [apiImportForms, setApiImportForms] = useState({
    students: { url: '', api_key: '' },
    timetables: { url: '', api_key: '' },
    fees: { url: '', api_key: '' },
    grades: { url: '', api_key: '' },
  });
  const [apiImportLoading, setApiImportLoading] = useState('');

  // Excel import state (students)
  const [importLoading, setImportLoading] = useState(false);
  const [importToast, setImportToast] = useState(null);
  const [importPreview, setImportPreview] = useState([]);
  const importFileRef = useRef(null);

  // Excel import state (timetable)
  const [ttImportLoading, setTtImportLoading] = useState(false);
  const [ttImportToast, setTtImportToast] = useState(null);
  const [ttImportPreview, setTtImportPreview] = useState([]);
  const ttFileRef = useRef(null);

  // Excel import state (fees)
  const [feeImportLoading, setFeeImportLoading] = useState(false);
  const [feeImportToast, setFeeImportToast] = useState(null);
  const [feeImportPreview, setFeeImportPreview] = useState([]);
  const feeFileRef = useRef(null);

  // Excel import state (grades)
  const [gradeImportLoading, setGradeImportLoading] = useState(false);
  const [gradeImportToast, setGradeImportToast] = useState(null);
  const [gradeImportPreview, setGradeImportPreview] = useState([]);
  const gradeFileRef = useRef(null);

  const adminHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      Authorization: `Bearer ${authToken}`,
    }),
    [authToken],
  );

  // Load data khi mount component (không cần token)
  useEffect(() => {
    setLoading(true);
    setMessage('');
    
    Promise.all([
      requestJson(`${ADMIN_WEB_API}/students`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/timetables`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/fees`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/announcements`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/events`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/grades`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/chat/messages`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/parents`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/attendance-logs`, { headers: adminHeaders })
    ])
      .then(([studentsJson, timetablesJson, feesJson, announcementsJson, eventsJson, gradesJson, chatJson, parentsJson, attendanceJson]) => {
        setStudents(studentsJson.data || []);
        setTimetables(timetablesJson.data || []);
        setFees(feesJson.data || []);
        setAnnouncements(announcementsJson.data || []);
        setEvents(eventsJson.data || []);
        setGrades(gradesJson.data || []);
        setChatMessages(chatJson.data || []);
        setParents(parentsJson.data || []);
        setAttendanceLogs(attendanceJson.data || []);
        loadSystemHealth().catch(() => {});
      })
      .catch((error) => {
        setMessage(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [adminHeaders]);

  async function refreshSession() {
    const refreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY);
    if (!refreshToken) {
      onLogout();
      throw new Error('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }

    let response;
    try {
      response = await fetch(`${API_BASE}/auth/refresh`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ refresh_token: refreshToken }),
      });
    } catch {
      throw new Error(API_CONNECTION_ERROR);
    }
    const json = await response.json().catch(() => null);
    if (!response.ok || !json?.ok) {
      onLogout();
      throw new Error(json?.error || 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.');
    }
    const role = String(json.user?.role || '').toLowerCase();
    if (role !== 'admin' && role !== 'teacher') {
      onLogout();
      throw new Error('Tài khoản này không còn quyền truy cập trang quản trị trường.');
    }
    localStorage.setItem(AUTH_TOKEN_KEY, json.access_token);
    localStorage.setItem(AUTH_REFRESH_TOKEN_KEY, json.refresh_token);
    localStorage.setItem(AUTH_USER_KEY, JSON.stringify(json.user));
    onSessionRefresh(json.access_token, json.user);
    return json.access_token;
  }

  async function requestJson(url: string, options: any = {}, retrying = false) {
    let response;
    try {
      response = await fetch(url, options);
    } catch {
      throw new Error(API_CONNECTION_ERROR);
    }
    const text = await response.text();
    const contentType = response.headers.get('content-type') || '';

    if (!contentType.includes('application/json')) {
      throw new Error(
        `Kết nối dữ liệu ${url} trả về không đúng định dạng JSON (HTTP ${response.status}). Hãy kiểm tra máy chủ xử lý dữ liệu có đang chạy.`,
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Phản hồi JSON không hợp lệ từ ${url} (HTTP ${response.status}).`);
    }

    if (response.status === 401 && !retrying && options?.headers?.Authorization) {
      const nextToken = await refreshSession();
      return requestJson(
        url,
        {
          ...options,
          headers: {
            ...options.headers,
            Authorization: `Bearer ${nextToken}`,
          },
        },
        true,
      );
    }

    if (!response.ok) {
      throw new Error(json.error || `Lỗi từ ${url} (HTTP ${response.status})`);
    }
    return json;
  }

  async function loadSystemHealth() {
    try {
      const json = await requestJson(HEALTH_API);
      setSystemHealth(json);
    } catch (error) {
      setSystemHealth({ ok: false, error: error.message || 'Không thể tải trạng thái máy chủ xử lý dữ liệu' });
    }
  }

  async function loadStudents() {
    setLoading(true);
    setMessage('');
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/students`, { headers: adminHeaders });
      setStudents(json.data || []);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setLoading(false);
    }
  }

  async function loadTimetables() {
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/timetables`, {
        headers: adminHeaders,
      });
      setTimetables(json.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadFees() {
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/fees`, {
        headers: adminHeaders,
      });
      setFees(json.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadParents() {
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/parents`, {
        headers: adminHeaders,
      });
      setParents(json.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function showParentDetail(parent) {
    setMessage('');
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/parents/${parent.id}`, {
        headers: adminHeaders,
      });
      const detail = json.data || {};
      const studentsText = (detail.linked_students || [])
        .map((student) => `${student.student_code} - ${student.full_name} - ${student.class_name || 'Chưa có lớp'}`)
        .join('; ');
      setMessage(
        `Phụ huynh: ${detail.full_name || detail.email || parent.email}. ` +
        `Email: ${detail.email || '-'}. ` +
        `SĐT: ${detail.phone || '-'}. ` +
        `Học sinh liên kết: ${studentsText || 'Chưa có học sinh'}.`,
      );
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function resetParentPassword(parent) {
    if (!window.confirm(`Đặt lại mật khẩu cho phụ huynh ${parent.full_name || parent.email}?`)) return;
    setMessage('');
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/parents/${parent.id}/reset-password`, {
        method: 'POST',
        headers: adminHeaders,
      });
      setMessage(
        `Đã đặt lại mật khẩu. Mật khẩu tạm: ${json.data?.temporary_password}. ` +
        `${json.data?.note || 'Tài khoản cần đổi mật khẩu trong lần đăng nhập đầu tiên.'}`,
      );
      await loadParents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function toggleParentActive(parent) {
    const nextActive = parent.is_active === false;
    const action = nextActive ? 'mở khóa' : 'khóa';
    if (!window.confirm(`Xác nhận ${action} tài khoản phụ huynh ${parent.full_name || parent.email}?`)) return;
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/parents/${parent.id}/toggle-active`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ is_active: nextActive }),
      });
      setMessage(nextActive ? 'Đã mở khóa tài khoản phụ huynh.' : 'Đã khóa tài khoản phụ huynh.');
      await loadParents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAnnouncements() {
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/announcements`, {
        headers: adminHeaders,
      });
      setAnnouncements(json.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadEvents() {
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/events`, {
        headers: adminHeaders,
      });
      setEvents(json.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadGrades() {
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/grades`, {
        headers: adminHeaders,
      });
      setGrades(json.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadChatMessages(studentCode = chatForm.student_code) {
    try {
      const params = new URLSearchParams();
      if (studentCode) params.set('student_code', studentCode);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const json = await requestJson(`${ADMIN_WEB_API}/chat/messages${suffix}`, {
        headers: adminHeaders,
      });
      setChatMessages(json.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function loadAttendanceLogs() {
    try {
      const params = new URLSearchParams();
      if (attendanceFilters.student_code) params.set('student_code', attendanceFilters.student_code);
      if (attendanceFilters.class_name) params.set('class_name', attendanceFilters.class_name);
      if (attendanceFilters.log_type) params.set('log_type', attendanceFilters.log_type);
      if (attendanceFilters.status_detail) params.set('status_detail', attendanceFilters.status_detail);
      if (attendanceFilters.date_from) params.set('date_from', attendanceFilters.date_from);
      if (attendanceFilters.date_to) params.set('date_to', attendanceFilters.date_to);
      const suffix = params.toString() ? `?${params.toString()}` : '';
      const json = await requestJson(`${ADMIN_WEB_API}/attendance-logs${suffix}`, {
        headers: adminHeaders,
      });
      setAttendanceLogs(json.data || []);
    } catch (error) {
      setMessage(error.message);
    }
  }

  function exportAttendanceExcel() {
    const rows = attendanceLogs.map((log) => ({
      'Mã học sinh': log.student_code,
      'Họ tên': log.student_name,
      Lớp: log.class_name,
      'Thời gian': new Date(log.scanned_at).toLocaleString('vi-VN'),
      'Loại': log.log_type === 'check_out' ? 'Ra' : 'Vào',
      'Trạng thái': log.status_detail,
      'Phút muộn': log.late_minutes ?? '',
    }));
    const sheet = XLSX.utils.json_to_sheet(rows);
    const book = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(book, sheet, 'Diem danh');
    XLSX.writeFile(book, `diem-danh-${new Date().toISOString().slice(0, 10)}.xlsx`);
  }


  const filteredStudents = useMemo(() => {
    return students.filter((student) =>
      matchesTextSearch(student, studentSearch, ['student_code', 'full_name', 'class_name', 'parent_name'])
    );
  }, [students, studentSearch]);

  const filteredTimetables = useMemo(() => {
    return timetables.filter((item) => includesQuery(timetableSearchText(item), timetableSearch));
  }, [timetables, timetableSearch]);

  const filteredFees = useMemo(() => {
    return fees.filter((item) => includesQuery(feeSearchText(item), feeSearch));
  }, [fees, feeSearch]);

  const classOptions = useMemo(() => {
    const values = new Set([
      ...students.map((student) => student.class_name),
      ...timetables.map((item) => item.class_id),
      ...fees.map((item) => item.class_id),
    ]);
    return Array.from(values).filter(Boolean).sort();
  }, [students, timetables, fees]);

  const studentCodeOptions = useMemo(() => {
    const values = new Set([
      ...students.map((student) => student.student_code),
      ...grades.map((item) => item.student_code),
      ...fees.map((item) => item.student_code),
    ]);
    return Array.from(values).filter(Boolean).sort();
  }, [students, grades, fees]);

  const timetableClassOptions = useMemo(() => {
    const values = new Set([
      ...timetables.map((item) => item.class_id),
      ...students.map((student) => student.class_name),
    ]);
    return Array.from(values).filter(Boolean).sort();
  }, [students, timetables]);

  const activeTimetableClass =
    selectedTimetableClass || timetableForm.class_id || timetableClassOptions[0] || '';

  const activeClassTimetables = useMemo(() => {
    if (!activeTimetableClass) return [];
    return timetables.filter((item) => item.class_id === activeTimetableClass);
  }, [timetables, activeTimetableClass]);

  const timetablePeriods = useMemo(() => {
    const values = new Set(Array.from({ length: 10 }, (_, index) => `Tiết ${index + 1}`));
    activeClassTimetables.forEach((item) => {
      const normalized = normalizePeriod(item.period);
      if (normalized) values.add(normalized);
    });
    return Array.from(values).sort((a, b) => periodSortValue(a) - periodSortValue(b));
  }, [activeClassTimetables]);

  const subjectOptions = useMemo(() => {
    const values = new Set([
      ...timetables.map((item) => normalizeSubjectName(item.subject_name)),
      ...grades.map((item) => normalizeSubjectName(item.subject_name)),
    ]);
    return Array.from(values).filter(Boolean).sort();
  }, [timetables, grades]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) =>
      matchesTextSearch(item, announcementSearch, ['title', 'content'])
    );
  }, [announcements, announcementSearch]);

  const filteredEvents = useMemo(() => {
    return events.filter((item) =>
      matchesTextSearch(item, eventSearch, ['title', 'content', 'image_url'])
    );
  }, [events, eventSearch]);

  const filteredGrades = useMemo(() => {
    return grades.filter((item) =>
      matchesTextSearch(item, gradeSearch, ['student_code', 'subject_name', 'semester', 'school_year'])
    );
  }, [grades, gradeSearch]);

  const studentByCode = useMemo(() => {
    const values = new Map();
    students.forEach((student) => {
      if (student.student_code) values.set(student.student_code, student);
    });
    return values;
  }, [students]);

  const studentClassOptions = useMemo(() => {
    const values = new Set(students.map((student) => student.class_name));
    return Array.from(values).filter(Boolean).sort(sortClassName);
  }, [students]);

  const feeClassOptions = useMemo(() => {
    const values = new Set([
      ...students.map((student) => student.class_name),
      ...fees.map((item) => item.class_id),
    ]);
    return Array.from(values).filter(Boolean).sort(sortClassName);
  }, [students, fees]);

  const gradeClassOptions = useMemo(() => {
    const values = new Set(students.map((student) => student.class_name));
    grades.forEach((item) => {
      const student = studentByCode.get(item.student_code);
      if (student?.class_name) values.add(student.class_name);
    });
    return Array.from(values).filter(Boolean).sort(sortClassName);
  }, [students, grades, studentByCode]);

  const activeStudentGrade = studentGradeFilter || firstGradeWithClasses(studentClassOptions);
  const studentClassesInGrade = useMemo(
    () => studentClassOptions.filter((className) => getGradeLevel(className) === activeStudentGrade),
    [studentClassOptions, activeStudentGrade],
  );
  const activeStudentClass =
    studentClassFilter && getGradeLevel(studentClassFilter) === activeStudentGrade
      ? studentClassFilter
      : studentClassesInGrade[0] || '';
  const displayedStudents = useMemo(() => {
    return filteredStudents.filter((student) => !activeStudentClass || student.class_name === activeStudentClass);
  }, [filteredStudents, activeStudentClass]);

  const activeFeeGrade = feeGradeFilter || firstGradeWithClasses(feeClassOptions);
  const feeClassesInGrade = useMemo(
    () => feeClassOptions.filter((className) => getGradeLevel(className) === activeFeeGrade),
    [feeClassOptions, activeFeeGrade],
  );
  const activeFeeClass =
    feeClassFilter && getGradeLevel(feeClassFilter) === activeFeeGrade ? feeClassFilter : feeClassesInGrade[0] || '';
  const feeStudentsInClass = useMemo(() => {
    const values = new Map();
    students
      .filter((student) => !activeFeeClass || student.class_name === activeFeeClass)
      .forEach((student) => {
        if (student.student_code) values.set(student.student_code, student);
      });
    fees
      .filter((item) => !activeFeeClass || item.class_id === activeFeeClass)
      .forEach((item) => {
        if (!item.student_code || values.has(item.student_code)) return;
        values.set(item.student_code, {
          student_code: item.student_code,
          full_name: '',
          class_name: item.class_id,
        });
      });
    return Array.from(values.values()).sort((a, b) =>
      String(a.student_code || '').localeCompare(String(b.student_code || ''), 'vi', { numeric: true }),
    );
  }, [students, fees, activeFeeClass]);
  const activeFeeStudentCode =
    feeStudentCodeFilter && feeStudentsInClass.some((student) => student.student_code === feeStudentCodeFilter)
      ? feeStudentCodeFilter
      : feeStudentsInClass[0]?.student_code || '';
  const displayedFees = useMemo(() => {
    return filteredFees.filter((item) => {
      const student = studentByCode.get(item.student_code);
      const className = item.class_id || student?.class_name || '';
      return (!activeFeeClass || className === activeFeeClass) && (!activeFeeStudentCode || item.student_code === activeFeeStudentCode);
    });
  }, [filteredFees, studentByCode, activeFeeClass, activeFeeStudentCode]);

  const activeGradeGrade = gradeGradeFilter || firstGradeWithClasses(gradeClassOptions);
  const gradeClassesInGrade = useMemo(
    () => gradeClassOptions.filter((className) => getGradeLevel(className) === activeGradeGrade),
    [gradeClassOptions, activeGradeGrade],
  );
  const activeGradeClass =
    gradeClassFilter && getGradeLevel(gradeClassFilter) === activeGradeGrade
      ? gradeClassFilter
      : gradeClassesInGrade[0] || '';
  const gradeStudentsInClass = useMemo(() => {
    const values = new Map();
    students
      .filter((student) => !activeGradeClass || student.class_name === activeGradeClass)
      .forEach((student) => {
        if (student.student_code) values.set(student.student_code, student);
      });
    grades.forEach((item) => {
      const student = studentByCode.get(item.student_code);
      if (!student || (activeGradeClass && student.class_name !== activeGradeClass) || values.has(item.student_code)) return;
      values.set(item.student_code, student);
    });
    return Array.from(values.values()).sort((a, b) =>
      String(a.student_code || '').localeCompare(String(b.student_code || ''), 'vi', { numeric: true }),
    );
  }, [students, grades, studentByCode, activeGradeClass]);
  const activeGradeStudentCode =
    gradeStudentCodeFilter && gradeStudentsInClass.some((student) => student.student_code === gradeStudentCodeFilter)
      ? gradeStudentCodeFilter
      : gradeStudentsInClass[0]?.student_code || '';
  const displayedGrades = useMemo(() => {
    return filteredGrades.filter((item) => !activeGradeStudentCode || item.student_code === activeGradeStudentCode);
  }, [filteredGrades, activeGradeStudentCode]);

  const filteredChatMessages = useMemo(() => {
    return chatMessages.filter((item) =>
      matchesTextSearch(item, chatSearch, ['student_code', 'sender_role', 'sender_name', 'message_text'])
    );
  }, [chatMessages, chatSearch]);

  const overviewStats = useMemo(() => {
    const today = new Date().toLocaleDateString('vi-VN');
    const attendanceToday = attendanceLogs.filter((item) =>
      item.scanned_at ? new Date(item.scanned_at).toLocaleDateString('vi-VN') === today : false
    ).length;
    const linkedParents = students.filter((student) => student.parent_name || student.parent_id).length;
    const unpaidFees = fees.filter((item) => String(item.payment_status || '').toLowerCase() !== 'paid').length;
    const needsReview = [
      students.length === 0,
      parents.length === 0,
      timetables.length === 0,
      fees.length === 0,
      grades.length === 0,
    ].filter(Boolean).length;
    return [
      ['Tổng số học sinh', students.length, 'students'],
      ['Phụ huynh đã liên kết', linkedParents, 'parents'],
      ['Điểm danh hôm nay', attendanceToday, 'attendance'],
      ['Thông báo đã gửi', announcements.length, 'announcements'],
      ['Khoản phí chưa thanh toán', unpaidFees, 'fees'],
      ['Dữ liệu cần kiểm tra', needsReview, 'system'],
    ];
  }, [students, parents.length, timetables.length, fees, grades.length, attendanceLogs, announcements.length]);

  const syncStatus = useMemo(() => {
    const latestAttendanceAt = attendanceLogs[0]?.scanned_at ? new Date(attendanceLogs[0].scanned_at) : null;
    const minutesSinceAttendance = latestAttendanceAt
      ? Math.floor((Date.now() - latestAttendanceAt.getTime()) / 60000)
      : null;

    return {
      backendOk: systemHealth?.ok === true,
      supabaseUp: systemHealth?.supabase === 'up',
      queueEnabled: systemHealth?.queue === 'enabled',
      latestAttendance: latestAttendanceAt ? formatDateTime(latestAttendanceAt.toISOString()) : 'Chưa có dữ liệu',
      minutesSinceAttendance,
      totalParents: parents.length,
      totalAnnouncements: announcements.length,
      totalChatMessages: chatMessages.length,
      error: systemHealth?.error || '',
    };
  }, [systemHealth, attendanceLogs, parents.length, announcements.length, chatMessages.length]);

  function showImportToast(type, message) {
    setImportToast({ type, message });
    setTimeout(() => setImportToast(null), 5000);
  }

  function showTtToast(type, message) {
    setTtImportToast({ type, message });
    setTimeout(() => setTtImportToast(null), 5000);
  }
  function showFeeToast(type, message) {
    setFeeImportToast({ type, message });
    setTimeout(() => setFeeImportToast(null), 5000);
  }
  function showGradeToast(type, message) {
    setGradeImportToast({ type, message });
    setTimeout(() => setGradeImportToast(null), 5000);
  }

  // ── Generic Excel reader ─────────────────────────────────────────────────
  function readExcelRows(event, columnMap, onParsed, onError, resetInput = true) {
    const file = event.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });
        if (rawRows.length === 0) { onError('File Excel không có dữ liệu.'); return; }
        function findValue(row, aliases) {
          const keys = Object.keys(row);
          for (const alias of aliases) {
            const found = keys.find((k) => k.trim().toLowerCase() === alias.toLowerCase());
            if (found !== undefined) return String(row[found] ?? '').trim();
          }
          return '';
        }
        const parsed = rawRows.map((row, idx) => {
          const result = { _row: idx + 2 };
          for (const [field, aliases] of Object.entries(columnMap)) {
            result[field] = findValue(row, aliases);
          }
          return result;
        });
        onParsed(parsed);
      } catch (err) {
        onError(`Lỗi đọc file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);
    if (resetInput) event.target.value = '';
  }

  function handleTimetableExcelFile(event) {
    readExcelRows(
      event,
      {
        class_id: ['class_id', 'lớp', 'lop', 'class'],
        subject_name: ['subject_name', 'môn học', 'mon hoc', 'môn', 'mon'],
        day_of_week: ['day_of_week', 'thứ', 'thu', 'ngày', 'day'],
        start_time: ['start_time', 'giờ bắt đầu', 'gio bat dau', 'bắt đầu'],
        end_time: ['end_time', 'giờ kết thúc', 'gio ket thuc', 'kết thúc'],
        period: ['period', 'tiết', 'tiet'],
        room: ['room', 'phòng', 'phong'],
        teacher_name: ['teacher_name', 'giáo viên', 'giao vien', 'gv'],
      },
      setTtImportPreview,
      (msg) => showTtToast('error', msg),
    );
  }

  async function submitTimetableImport() {
    if (ttImportPreview.length === 0) return;
    setTtImportLoading(true);
    setTtImportToast(null);
    try {
      const rows = ttImportPreview.map((r) => ({
        class_id: r.class_id,
        subject_name: r.subject_name,
        day_of_week: Number(r.day_of_week) || 1,
        start_time: r.start_time || '07:30',
        end_time: r.end_time || '08:15',
        period: r.period || null,
        room: r.room || null,
        teacher_name: r.teacher_name || null,
      }));
      const json = await requestJson(`${ADMIN_WEB_API}/timetables/bulk`, {
        method: 'POST', headers: adminHeaders, body: JSON.stringify({ rows }),
      });
      showTtToast('success', `Nhập thành công ${json.inserted} tiết học.`);
      setTtImportPreview([]);
      await loadTimetables();
    } catch (err) {
      showTtToast('error', `Nhập thất bại: ${err.message}`);
    } finally {
      setTtImportLoading(false);
    }
  }

  function handleFeesExcelFile(event) {
    readExcelRows(
      event,
      {
        student_code: ['student_code', 'mã học sinh', 'ma hoc sinh', 'mã hs', 'code'],
        total_amount: ['total_amount', 'tổng tiền', 'tong tien', 'số tiền', 'so tien'],
        payment_status: ['payment_status', 'trạng thái', 'trang thai', 'status'],
        payment_method: ['payment_method', 'phương thức', 'phuong thuc', 'method'],
        class_id: ['class_id', 'lớp', 'lop', 'class'],
      },
      setFeeImportPreview,
      (msg) => showFeeToast('error', msg),
    );
  }

  async function submitFeesImport() {
    if (feeImportPreview.length === 0) return;
    setFeeImportLoading(true);
    setFeeImportToast(null);
    try {
      const rows = feeImportPreview.map((r) => ({
        student_code: r.student_code,
        total_amount: Number(r.total_amount) || 0,
        payment_status: r.payment_status || 'unpaid',
        payment_method: r.payment_method || null,
        class_id: r.class_id || null,
      }));
      const json = await requestJson(`${ADMIN_WEB_API}/fees/bulk`, {
        method: 'POST', headers: adminHeaders, body: JSON.stringify({ rows }),
      });
      showFeeToast('success', `Nhập thành công ${json.inserted} thông báo học phí.`);
      setFeeImportPreview([]);
      await loadFees();
    } catch (err) {
      showFeeToast('error', `Nhập thất bại: ${err.message}`);
    } finally {
      setFeeImportLoading(false);
    }
  }

  function handleGradesExcelFile(event) {
    readExcelRows(
      event,
      {
        student_code: ['student_code', 'mã học sinh', 'ma hoc sinh', 'mã hs', 'code'],
        subject_name: ['subject_name', 'môn học', 'mon hoc', 'môn', 'mon'],
        midterm_score: ['midterm_score', 'giữa kỳ', 'giua ky', 'gk'],
        final_score: ['final_score', 'cuối kỳ', 'cuoi ky', 'ck'],
        semester: ['semester', 'học kỳ', 'hoc ky', 'hk'],
        academic_year: ['academic_year', 'năm học', 'nam hoc'],
      },
      setGradeImportPreview,
      (msg) => showGradeToast('error', msg),
    );
  }

  async function submitGradesImport() {
    if (gradeImportPreview.length === 0) return;
    setGradeImportLoading(true);
    setGradeImportToast(null);
    try {
      const rows = gradeImportPreview.map((r) => ({
        student_code: r.student_code,
        subject_name: r.subject_name,
        midterm_score: Number(r.midterm_score) || 0,
        final_score: Number(r.final_score) || 0,
        semester: r.semester || '1',
        academic_year: r.academic_year || '2024-2025',
      }));
      const json = await requestJson(`${ADMIN_WEB_API}/grades/bulk`, {
        method: 'POST', headers: adminHeaders, body: JSON.stringify({ rows }),
      });
      showGradeToast('success', `Nhập thành công ${json.inserted} bản ghi điểm.`);
      setGradeImportPreview([]);
      await loadGrades();
    } catch (err) {
      showGradeToast('error', `Nhập thất bại: ${err.message}`);
    } finally {
      setGradeImportLoading(false);
    }
  }

  function handleExcelFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setImportPreview([]);
    setImportToast(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const rawRows = XLSX.utils.sheet_to_json(sheet, { defval: '' });

        if (rawRows.length === 0) {
          showImportToast('error', 'File Excel không có dữ liệu.');
          return;
        }

        // Flexible column mapping (case-insensitive, support Vietnamese headers)
        const COLUMN_MAP = {
          student_code: ['student_code', 'mã học sinh', 'ma hoc sinh', 'studentcode', 'mã hs', 'ma hs', 'code'],
          full_name: ['full_name', 'họ và tên', 'ho va ten', 'fullname', 'tên', 'ten', 'name', 'họ tên', 'ho ten'],
          class_name: ['class_name', 'lớp', 'lop', 'classname', 'class', 'tên lớp', 'ten lop'],
        };

        function findValue(row, aliases) {
          const keys = Object.keys(row);
          for (const alias of aliases) {
            const found = keys.find((k) => k.trim().toLowerCase() === alias.toLowerCase());
            if (found !== undefined) return String(row[found] ?? '').trim();
          }
          return '';
        }

        const parsed = rawRows.map((row, idx) => ({
          _row: idx + 2,
          student_code: findValue(row, COLUMN_MAP.student_code),
          full_name: findValue(row, COLUMN_MAP.full_name),
          class_name: findValue(row, COLUMN_MAP.class_name),
        }));

        setImportPreview(parsed);
      } catch (err) {
        showImportToast('error', `Lỗi đọc file: ${err.message}`);
      }
    };
    reader.readAsArrayBuffer(file);

    // Reset input so same file can be re-selected
    event.target.value = '';
  }

  async function submitImport() {
    if (importPreview.length === 0) return;
    setImportLoading(true);
    setImportToast(null);
    try {
      const rows = importPreview.map(({ student_code, full_name, class_name }) => ({
        student_code,
        full_name,
        class_name,
      }));
      const json = await requestJson(`${ADMIN_WEB_API}/students/bulk`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ rows }),
      });

      let msg = `Nhập thành công ${json.inserted} học sinh.`;
      if (json.invalid && json.invalid.length > 0) {
        msg += ` ⚠️ ${json.invalid.length} dòng bị bỏ qua (thiếu mã/tên).`;
      }
      showImportToast('success', msg);
      setImportPreview([]);
      await loadStudents();
    } catch (error) {
      showImportToast('error', `Nhập thất bại: ${error.message}`);
    } finally {
      setImportLoading(false);
    }
  }

  async function submitApiImport(moduleName, reloadFn) {
    const form = apiImportForms[moduleName] || { url: '', api_key: '' };
    if (!form.url.trim()) {
      setMessage('Vui lòng nhập đường dẫn kết nối dữ liệu nguồn.');
      return;
    }
    setApiImportLoading(moduleName);
    setMessage('');
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/external-import/${moduleName}`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(form),
      });
      setMessage(`✅ Nhập qua kết nối dữ liệu thành công ${json.imported || 0} bản ghi.`);
      await reloadFn();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setApiImportLoading('');
    }
  }

  function renderApiImportPanel(moduleName, title, reloadFn) {
    const form = apiImportForms[moduleName] || { url: '', api_key: '' };
    const loading = apiImportLoading === moduleName;
    return (
      <div className="mt-4 rounded-lg border border-dashed border-sky-300 bg-sky-50 p-4">
        <p className="mb-2 text-sm font-semibold text-sky-900">{title}</p>
        <div className="grid gap-2 md:grid-cols-[1fr_260px_auto]">
          <input
            className="rounded-lg border border-sky-200 px-3 py-2 text-sm"
            placeholder="Đường dẫn kết nối dữ liệu của trường"
            value={form.url}
            onChange={(event) =>
              setApiImportForms((prev) => ({
                ...prev,
                [moduleName]: { ...prev[moduleName], url: event.target.value },
              }))
            }
          />
          <input
            className="rounded-lg border border-sky-200 px-3 py-2 text-sm"
            placeholder="Mã kết nối"
            value={form.api_key}
            onChange={(event) =>
              setApiImportForms((prev) => ({
                ...prev,
                [moduleName]: { ...prev[moduleName], api_key: event.target.value },
              }))
            }
          />
          <button
            type="button"
            onClick={() => submitApiImport(moduleName, reloadFn)}
            disabled={loading}
            className="rounded-lg bg-sky-700 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
          >
            {loading ? 'Đang nhập...' : 'Nhập qua kết nối dữ liệu'}
          </button>
        </div>
      </div>
    );
  }

  function renderHierarchyNavigator({
    title,
    grade,
    classes,
    activeClass,
    onGradeChange,
    onClassChange,
    studentsInClass = [],
    activeStudentCode = '',
    onStudentChange,
  }) {
    const classCountByGrade = classes.reduce((acc, className) => {
      const level = getGradeLevel(className);
      if (level) acc[level] = (acc[level] || 0) + 1;
      return acc;
    }, {});

    return (
      <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-3">
        <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
          <div className="text-sm font-semibold text-slate-900">{title}</div>
          <div className="text-xs text-slate-500">
            {activeClass ? `Đang xem lớp ${activeClass}` : 'Chưa có lớp để hiển thị'}
            {activeStudentCode ? ` • ${activeStudentCode}` : ''}
          </div>
        </div>
        <div className="mb-3">
          <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Khối</div>
          <div className="flex flex-wrap gap-2">
            {GRADE_LEVELS.map((level) => {
              const disabled = !classCountByGrade[level];
              const active = grade === level;
              return (
                <button
                  key={level}
                  type="button"
                  disabled={disabled}
                  onClick={() => onGradeChange(level)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    active
                      ? 'bg-blue-600 text-white shadow-sm'
                      : disabled
                        ? 'bg-white text-slate-300 ring-1 ring-slate-200'
                        : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-blue-50 hover:text-blue-700'
                  }`}
                >
                  Khối {level}
                </button>
              );
            })}
          </div>
        </div>
        <div>
          <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Lớp</div>
          <div className="flex flex-wrap gap-2">
            {classes
              .filter((className) => getGradeLevel(className) === grade)
              .map((className) => (
                <button
                  key={className}
                  type="button"
                  onClick={() => onClassChange(className)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${
                    activeClass === className
                      ? 'bg-slate-950 text-white'
                      : 'bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {className}
                </button>
              ))}
            {classes.filter((className) => getGradeLevel(className) === grade).length === 0 ? (
              <span className="rounded-lg bg-white px-3 py-2 text-sm text-slate-400 ring-1 ring-slate-200">
                Chưa có lớp trong khối này
              </span>
            ) : null}
          </div>
        </div>
        {onStudentChange ? (
          <div className="mt-3">
            <div className="mb-1 text-xs font-semibold uppercase text-slate-500">Học sinh</div>
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
              {studentsInClass.map((student) => (
                <button
                  key={student.student_code}
                  type="button"
                  onClick={() => onStudentChange(student)}
                  className={`rounded-lg border px-3 py-2 text-left text-sm transition ${
                    activeStudentCode === student.student_code
                      ? 'border-blue-500 bg-blue-50 text-blue-900'
                      : 'border-slate-200 bg-white text-slate-700 hover:border-blue-200 hover:bg-blue-50'
                  }`}
                >
                  <div className="font-semibold">{student.student_code}</div>
                  <div className="text-xs text-slate-500">{student.full_name || 'Chưa có tên học sinh'}</div>
                </button>
              ))}
            </div>
            {studentsInClass.length === 0 ? (
              <EmptyState message="Chưa có học sinh trong lớp đang chọn." />
            ) : null}
          </div>
        ) : null}
      </div>
    );
  }

  async function createStudent(event) {
    event.preventDefault();
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/students`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(studentForm),
      });
      setStudentForm({ student_code: '', full_name: '', class_name: '' });
      await loadStudents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateStudent(event) {
    event.preventDefault();
    if (!editingStudentId) return;
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/students/${editingStudentId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          student_code: studentForm.student_code,
          full_name: studentForm.full_name,
          class_name: studentForm.class_name,
        }),
      });
      setEditingStudentId(null);
      setStudentForm({ student_code: '', full_name: '', class_name: '' });
      setMessage('✅ Đã cập nhật học sinh.');
      await loadStudents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startEditStudent(student) {
    setEditingStudentId(student.id);
    setStudentForm({
      student_code: student.student_code || '',
      full_name: student.full_name || '',
      class_name: student.class_name || '',
    });
  }

  function cancelEditStudent() {
    setEditingStudentId(null);
    setStudentForm({ student_code: '', full_name: '', class_name: '' });
  }

  async function deleteStudent(studentId) {
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/students/${studentId}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      await loadStudents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function provisionParent() {
    setMessage('');
    setProvisionResult(null);
    try {
      const body = {
        student_id: Number(selectedStudentId),
        ...parentForm
      };
      // Remove empty fields to use defaults
      Object.keys(body).forEach(key => {
        if (body[key] === '') delete body[key];
      });
      
      const json = await requestJson(`${ADMIN_WEB_API}/provision-parent`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(body),
      });
      setProvisionResult(json);
      setParentForm({ parent_name: '', parent_email: '', parent_phone: '', relationship: 'mother', password: '' });
      // Don't reload students to keep the result visible
      // await loadStudents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function mockScan(studentCode) {
    if (!studentCode) {
      setMessage('Vui lòng chọn học sinh trước khi giả lập quẹt thẻ.');
      return;
    }
    setMessage('');
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/mock-scan`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ student_code: studentCode }),
      });
      setMessage(`Đã tạo dữ liệu kiểm thử điểm danh: ${json.student_code} (${json.student_name}) - ${json.log_type === 'check_out' ? 'Ra' : 'Vào'} lúc ${new Date(json.scanned_at).toLocaleTimeString('vi-VN')}`);
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createTimetable(event) {
    event.preventDefault();
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/timetables`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          ...timetableForm,
          subject_name: normalizeSubjectName(timetableForm.subject_name),
          day_of_week: Number(timetableForm.day_of_week),
        }),
      });
      setSelectedTimetableClass(timetableForm.class_id || activeTimetableClass);
      await loadTimetables();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateTimetable(event) {
    event.preventDefault();
    if (!editingTimetableId) return;
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/timetables/${editingTimetableId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          ...timetableForm,
          subject_name: normalizeSubjectName(timetableForm.subject_name),
          day_of_week: Number(timetableForm.day_of_week),
        }),
      });
      setSelectedTimetableClass(timetableForm.class_id || activeTimetableClass);
      setEditingTimetableId(null);
      setTimetableForm({
        class_id: '',
        subject_name: '',
        day_of_week: 1,
        start_time: '07:30',
        end_time: '08:15',
        room: '',
        teacher_name: '',
        period: '',
      });
      await loadTimetables();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startEditTimetable(item) {
    setSelectedTimetableClass(item.class_id || '');
    setSelectedTimetable(item);
    setEditingTimetableId(item.id);
    setTimetableForm({
      class_id: item.class_id || '',
      subject_name: item.subject_name || '',
      day_of_week: Number(item.day_of_week || 1),
      start_time: String(item.start_time || '07:30').slice(0, 5),
      end_time: String(item.end_time || '08:15').slice(0, 5),
      room: item.room || '',
      teacher_name: item.teacher_name || '',
      period: item.period || '',
    });
  }

  function cancelEditTimetable() {
    setEditingTimetableId(null);
    setTimetableForm({
      class_id: activeTimetableClass || '',
      subject_name: '',
      day_of_week: 1,
      start_time: '07:30',
      end_time: '08:15',
      room: '',
      teacher_name: '',
      period: '',
    });
  }

  function chooseTimetableClass(classId) {
    setSelectedTimetableClass(classId);
    setSelectedTimetable(null);
    setEditingTimetableId(null);
    setTimetableForm((prev) => ({
      ...prev,
      class_id: classId,
      subject_name: '',
      period: '',
    }));
  }

  function selectTimetableSlot(day, period) {
    if (!activeTimetableClass) return;
    const normalizedPeriod = normalizePeriod(period);
    const existing = activeClassTimetables.find(
      (item) =>
        Number(item.day_of_week) === Number(day) &&
        normalizePeriod(item.period) === normalizedPeriod,
    );

    if (existing) {
      startEditTimetable(existing);
      return;
    }

    const [startTime, endTime] = defaultTimeForPeriod(normalizedPeriod);
    setSelectedTimetable(null);
    setEditingTimetableId(null);
    setTimetableForm({
      class_id: activeTimetableClass,
      subject_name: '',
      day_of_week: Number(day),
      start_time: startTime,
      end_time: endTime,
      room: '',
      teacher_name: '',
      period: normalizedPeriod,
    });
  }

  function findTimetableSlot(day, period) {
    const normalizedPeriod = normalizePeriod(period);
    return activeClassTimetables.find(
      (item) =>
        Number(item.day_of_week) === Number(day) &&
        normalizePeriod(item.period) === normalizedPeriod,
    );
  }

  async function deleteTimetable(id) {
    if (!window.confirm('Xác nhận xóa thời khóa biểu?')) return;
    try {
      await requestJson(`${ADMIN_WEB_API}/timetables/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      if (selectedTimetable?.id === id) setSelectedTimetable(null);
      if (editingTimetableId === id) {
        setEditingTimetableId(null);
        setTimetableForm((prev) => ({
          ...prev,
          subject_name: '',
          room: '',
          teacher_name: '',
        }));
      }
      await loadTimetables();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createFee(event) {
    event.preventDefault();
    setMessage('');
    if (!feeForm.student_code.trim()) {
      setMessage('Vui lòng chọn hoặc nhập mã học sinh trước khi tạo học phí.');
      return;
    }
    try {
      const subjectFees = parseFeeLines(feeForm.subject_fees_text);
      if (feeForm.fee_name?.trim() && Object.keys(subjectFees).length === 0) {
        subjectFees[feeForm.fee_name.trim()] = Number(feeForm.total_amount || 0);
      }
      const otherFees = parseFeeLines(feeForm.other_fees_text);
      const computedTotal = [...Object.values(subjectFees), ...Object.values(otherFees)]
        .reduce((sum, amount) => sum + Number(amount || 0), 0);
      await requestJson(`${ADMIN_WEB_API}/fees`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          student_code: feeForm.student_code,
          class_id: feeForm.class_id || null,
          subject_fees: subjectFees,
          other_fees: otherFees,
          total_amount: Number(feeForm.total_amount || computedTotal || 0),
          payment_status: feeForm.payment_status,
          payment_method: feeForm.payment_method || null,
          paid_at: feeForm.paid_at || null,
        }),
      });
      setFeeForm({
        student_code: '',
        class_id: '',
        fee_name: '',
        apply_scope: 'student',
        subject_fees_text: '',
        other_fees_text: '',
        total_amount: '',
        payment_status: 'unpaid',
        payment_method: '',
        paid_at: '',
      });
      await loadFees();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function updateFee(event) {
    event.preventDefault();
    if (!editingFeeId) return;
    setMessage('');
    if (!feeForm.student_code.trim()) {
      setMessage('Vui lòng chọn hoặc nhập mã học sinh trước khi cập nhật học phí.');
      return;
    }
    try {
      const subjectFees = parseFeeLines(feeForm.subject_fees_text);
      if (feeForm.fee_name?.trim() && Object.keys(subjectFees).length === 0) {
        subjectFees[feeForm.fee_name.trim()] = Number(feeForm.total_amount || 0);
      }
      const otherFees = parseFeeLines(feeForm.other_fees_text);
      const computedTotal = [...Object.values(subjectFees), ...Object.values(otherFees)]
        .reduce((sum, amount) => sum + Number(amount || 0), 0);
      await requestJson(`${ADMIN_WEB_API}/fees/${editingFeeId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          student_code: feeForm.student_code,
          class_id: feeForm.class_id || null,
          subject_fees: subjectFees,
          other_fees: otherFees,
          total_amount: Number(feeForm.total_amount || computedTotal || 0),
          payment_status: feeForm.payment_status,
          payment_method: feeForm.payment_method || null,
          paid_at: feeForm.paid_at || null,
        }),
      });
      setEditingFeeId(null);
      setFeeForm({
        student_code: '',
        class_id: '',
        fee_name: '',
        apply_scope: 'student',
        subject_fees_text: '',
        other_fees_text: '',
        total_amount: '',
        payment_status: 'unpaid',
        payment_method: '',
        paid_at: '',
      });
      await loadFees();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startEditFee(item) {
    setMessage('');
    setSelectedFee(item);
    setEditingFeeId(item.id);
    setFeeForm({
      student_code: item.student_code || '',
      class_id: item.class_id || '',
      fee_name: '',
      apply_scope: 'student',
      subject_fees_text: feeMapToLines(item.subject_fees || {}),
      other_fees_text: feeMapToLines(item.other_fees || {}),
      total_amount: String(item.total_amount ?? ''),
      payment_status: item.payment_status || 'unpaid',
      payment_method: item.payment_method || '',
      paid_at: item.paid_at ? String(item.paid_at).slice(0, 16) : '',
    });
  }

  function cancelEditFee() {
    setEditingFeeId(null);
    setFeeForm({
      student_code: '',
      class_id: '',
      fee_name: '',
      apply_scope: 'student',
      subject_fees_text: '',
      other_fees_text: '',
      total_amount: '',
      payment_status: 'unpaid',
      payment_method: '',
      paid_at: '',
    });
  }

  async function deleteFee(id) {
    if (!window.confirm('Xác nhận xóa học phí?')) return;
    try {
      await requestJson(`${ADMIN_WEB_API}/fees/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      if (selectedFee?.id === id) setSelectedFee(null);
      await loadFees();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createAnnouncement(event) {
    event.preventDefault();
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/announcements`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(announcementForm),
      });
      setAnnouncementForm({ title: '', content: '', priority: 'normal', target_type: 'school', is_general: true, send_notification: false });
      await loadAnnouncements();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteAnnouncement(id) {
    if (!window.confirm('Xác nhận xóa thông báo?')) return;
    try {
      await requestJson(`${ADMIN_WEB_API}/announcements/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      await loadAnnouncements();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createEvent(event) {
    event.preventDefault();
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/events${editingEventId ? `/${editingEventId}` : ''}`, {
        method: editingEventId ? 'PUT' : 'POST',
        headers: adminHeaders,
        body: JSON.stringify(eventForm),
      });
      setEditingEventId(null);
      setEventForm({ title: '', content: '', event_date: '', image_url: '', target_type: 'school', visible_on_parent_app: true });
      await loadEvents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function startEditEvent(item) {
    setEditingEventId(item.id);
    setEventForm({
      title: item.title || '',
      content: item.content || '',
      event_date: item.event_date ? String(item.event_date).slice(0, 16) : '',
      image_url: item.image_url || '',
      target_type: item.target_type || 'school',
      visible_on_parent_app: item.visible_on_parent_app !== false,
    });
  }

  function cancelEditEvent() {
    setEditingEventId(null);
    setEventForm({ title: '', content: '', event_date: '', image_url: '', target_type: 'school', visible_on_parent_app: true });
  }

  function handleEventImageFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setMessage('Vui lòng chọn file ảnh.');
      event.target.value = '';
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setMessage('Ảnh tối đa 5MB.');
      event.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = async () => {
      setEventImageLoading(true);
      setMessage('');
      try {
        const json = await requestJson(`${ADMIN_WEB_API}/events/upload-image`, {
          method: 'POST',
          headers: adminHeaders,
          body: JSON.stringify({
            file_name: file.name,
            data_url: String(reader.result || ''),
          }),
        });
        const imageUrl = json.url?.startsWith('http')
          ? json.url
          : `${API_BASE.replace(/\/api\/v1\/?$/, '')}${json.url}`;
        setEventForm((prev) => ({ ...prev, image_url: imageUrl }));
      } catch (error) {
        setMessage(error.message);
      } finally {
        setEventImageLoading(false);
      }
    };
    reader.readAsDataURL(file);
    event.target.value = '';
  }

  async function deleteEvent(id) {
    if (!window.confirm('Xác nhận xóa sự kiện?')) return;
    try {
      await requestJson(`${ADMIN_WEB_API}/events/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      await loadEvents();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createGrade(event) {
    event.preventDefault();
    setMessage('');
    if (!gradeForm.student_code.trim() || !gradeForm.subject_name.trim()) {
      setMessage('Vui lòng chọn mã học sinh và môn học trước khi thêm điểm.');
      return;
    }
    try {
      await requestJson(`${ADMIN_WEB_API}/grades`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          student_code: gradeForm.student_code,
          subject_name: normalizeSubjectName(gradeForm.subject_name),
          semester: gradeForm.semester,
          midterm_score: Number(gradeForm.midterm_score || 0),
          final_score: Number(gradeForm.final_score || 0),
          comment: gradeForm.comment,
        }),
      });
      setGradeForm({
        student_code: '',
        subject_name: '',
        semester: 'Học kỳ 1',
        midterm_score: '',
        final_score: '',
        comment: '',
      });
      await loadGrades();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function deleteGrade(id) {
    if (!window.confirm('Xác nhận xóa điểm?')) return;
    try {
      await requestJson(`${ADMIN_WEB_API}/grades/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      await loadGrades();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function sendChatMessage(event) {
    event.preventDefault();
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/chat/messages`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify(chatForm),
      });
      setChatForm((prev) => ({ ...prev, message_text: '' }));
      await loadChatMessages(chatForm.student_code);
    } catch (error) {
      setMessage(error.message);
    }
  }

  const menuItems = [
    ['overview', 'Tổng quan'],
    ['students', 'Học sinh'],
    ['parents', 'Phụ huynh'],
    ['attendance', 'Điểm danh'],
    ['timetable', 'Thời khóa biểu'],
    ['fees', 'Học phí'],
    ['grades', 'Bảng điểm'],
    ['announcements', 'Thông báo'],
    ['chat', 'Tin nhắn'],
    ['events', 'Sự kiện'],
    ['system', 'Dữ liệu & đồng bộ'],
    ['settings', 'Cài đặt trường'],
    ['device', 'Kiểm thử điểm danh'],
  ];
  const activeMenuLabel = menuItems.find(([value]) => value === tab)?.[1] || 'Tổng quan';

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <div className="flex min-h-screen">
        <aside className="w-64 shrink-0 border-r border-slate-200 bg-white p-4 shadow-sm">
          <BrandIdentity compact />
          <div className="mt-4 rounded-xl bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
            Web Admin nhà trường
          </div>
          <nav className="mt-5 space-y-1">
            {menuItems.map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value)}
                className={`w-full rounded-xl px-3 py-2.5 text-left text-sm font-semibold ${
                  tab === value ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-700 hover:bg-slate-100'
                }`}
              >
                {label}
              </button>
            ))}
          </nav>
        </aside>

        <div className="min-w-0 flex-1">
          <header className="sticky top-0 z-20 border-b border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
            <div className="flex flex-wrap items-center gap-3">
              <div>
                <h1 className="text-xl font-bold">{activeMenuLabel}</h1>
                <p className="text-sm text-slate-500">Trường học {schoolId}</p>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadStudents();
                  loadParents();
                  loadTimetables();
                  loadFees();
                  loadAnnouncements();
                  loadEvents();
                  loadGrades();
                  loadAttendanceLogs();
                  loadSystemHealth();
                }}
                className="ml-auto rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                {loading ? 'Đang tải...' : 'Làm mới'}
              </button>
              <div className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-3 py-2">
                <div className="text-right">
                  <div className="text-sm font-bold">{authUser.full_name || authUser.email}</div>
                  <div className="text-xs text-slate-500">{roleLabel(authUser.role)}</div>
                </div>
                <button
                  onClick={onLogout}
                  className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Đăng xuất
                </button>
              </div>
            </div>
          </header>

          <main className="w-full px-5 py-5">

        {message ? (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {message}
          </div>
        ) : null}

        <datalist id="student-code-options">
          {studentCodeOptions.map((studentCode) => {
            const student = students.find((item) => item.student_code === studentCode);
            return (
              <option key={studentCode} value={studentCode}>
                {student ? `${student.full_name} - ${student.class_name}` : studentCode}
              </option>
            );
          })}
        </datalist>
        <datalist id="class-options">
          {classOptions.map((className) => (
            <option key={className} value={className} />
          ))}
        </datalist>
        <datalist id="subject-options">
          {subjectOptions.map((subjectName) => (
            <option key={subjectName} value={subjectName} />
          ))}
        </datalist>


        {tab === 'overview' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Tổng quan nhà trường"
              description="Các chỉ số chính để nhân viên trường học theo dõi nhanh trong ngày."
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {overviewStats.map(([label, value, target]) => (
                <button
                  key={label}
                  type="button"
                  onClick={() => setTab(target)}
                  className="rounded-xl border border-slate-200 bg-white p-4 text-left hover:border-blue-200 hover:bg-blue-50"
                >
                  <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
                  <div className="mt-2 text-3xl font-black text-slate-950">{value}</div>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {tab === 'students' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Quản lý học sinh"
              description="Thêm học sinh, nhập từ Excel và xem danh sách theo khối/lớp."
            />
            <h3 className="mb-2 text-sm font-bold text-slate-700">Thêm học sinh</h3>
            <form onSubmit={editingStudentId ? updateStudent : createStudent} className="mb-4 grid gap-2 md:grid-cols-4">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mã học sinh"
                value={studentForm.student_code}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, student_code: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Họ và tên"
                value={studentForm.full_name}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, full_name: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Lớp"
                value={studentForm.class_name}
                onChange={(e) =>
                  setStudentForm((prev) => ({ ...prev, class_name: e.target.value }))
                }
              />
              <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                {editingStudentId ? 'Cập nhật' : 'Tạo mới'}
              </button>
              {editingStudentId ? (
                <button
                  type="button"
                  onClick={cancelEditStudent}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Hủy sửa
                </button>
              ) : null}
            </form>

            {/* ── Excel Import ── */}
            <div className="mb-4 rounded-lg border border-dashed border-blue-300 bg-blue-50 p-4">
              <p className="mb-2 text-sm font-semibold text-blue-800">Nhập học sinh từ Excel</p>
              <p className="mb-3 text-xs text-blue-600">
                File Excel cần có các cột: <strong>student_code</strong> (hoặc "Mã học sinh"), <strong>full_name</strong> (hoặc "Họ và tên"), <strong>class_name</strong> (hoặc "Lớp"). Dữ liệu trùng mã sẽ được cập nhật (upsert).
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={importFileRef}
                  type="file"
                  accept=".xlsx,.xls,.csv"
                  className="hidden"
                  onChange={handleExcelFile}
                />
                <button
                  type="button"
                  onClick={() => importFileRef.current?.click()}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  📂 Chọn file Excel
                </button>
                {importPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={submitImport}
                    disabled={importLoading}
                    className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
                  >
                    {importLoading ? 'Đang nhập...' : `Nhập ${importPreview.length} học sinh`}
                  </button>
                )}
                {importPreview.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setImportPreview([])}
                    className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700"
                  >
                    Hủy
                  </button>
                )}
              </div>

              {importToast && (
                <div className={`mt-3 rounded-lg px-4 py-2 text-sm font-medium ${
                  importToast.type === 'success'
                    ? 'bg-green-100 text-green-800'
                    : 'bg-red-100 text-red-800'
                }`}>
                  {importToast.message}
                </div>
              )}

              {importPreview.length > 0 && (
                <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-blue-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-blue-50">
                      <tr>
                        <th className="px-3 py-1 text-slate-500">#</th>
                        <th className="px-3 py-1 text-slate-500">Mã HS</th>
                        <th className="px-3 py-1 text-slate-500">Họ tên</th>
                        <th className="px-3 py-1 text-slate-500">Lớp</th>
                      </tr>
                    </thead>
                    <tbody>
                      {importPreview.map((r) => (
                        <tr key={r._row} className={`border-t ${!r.student_code || !r.full_name ? 'bg-red-50' : ''}`}>
                          <td className="px-3 py-1 text-slate-400">{r._row}</td>
                          <td className="px-3 py-1">{r.student_code || <span className="text-red-500">trống</span>}</td>
                          <td className="px-3 py-1">{r.full_name || <span className="text-red-500">trống</span>}</td>
                          <td className="px-3 py-1">{r.class_name || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {renderHierarchyNavigator({
              title: 'Xem học sinh theo khối và lớp',
              grade: activeStudentGrade,
              classes: studentClassOptions,
              activeClass: activeStudentClass,
              onGradeChange: (level) => {
                setStudentGradeFilter(level);
                setStudentClassFilter('');
              },
              onClassChange: setStudentClassFilter,
            })}

            <ModuleSearch
              value={studentSearch}
              onChange={setStudentSearch}
              placeholder="Tìm trong lớp đang chọn theo mã, họ tên hoặc phụ huynh..."
              count={displayedStudents.length}
              total={students.length}
            />

            {loading ? <p className="rounded-lg bg-slate-50 px-3 py-2 text-sm text-slate-500">Đang tải dữ liệu...</p> : null}
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-2">Mã</th>
                    <th className="py-2">Họ tên</th>
                    <th className="py-2">Lớp</th>
                    <th className="py-2">Phụ huynh</th>
                    <th className="py-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedStudents.map((student) => (
                    <tr key={student.id} className="border-b">
                      <td className="py-2">{student.student_code}</td>
                      <td className="py-2">{student.full_name}</td>
                      <td className="py-2">{student.class_name}</td>
                      <td className="py-2">{student.parent_name || '-'}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditStudent(student)}
                            className="rounded bg-amber-100 px-2 py-1 text-amber-700"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => deleteStudent(student.id)}
                            className="rounded bg-rose-100 px-2 py-1 text-rose-700"
                          >
                            Xóa
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {!loading && displayedStudents.length === 0 ? <EmptyState message="Chưa có học sinh trong lớp hoặc bộ lọc hiện tại." /> : null}
          </section>
        ) : null}

        {tab === 'timetable' && (
          <>
          <div className="mt-4 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-4">
            <p className="mb-2 text-sm font-semibold text-emerald-800">Nhập thời khóa biểu từ Excel</p>
            <p className="mb-3 text-xs text-emerald-700">
              Cần cột: <strong>lớp</strong> (class_id), <strong>môn học</strong> (subject_name),
              <strong> thứ</strong> (day_of_week, 1=T2..6=T7), <strong>giờ bắt đầu</strong>,
              <strong> giờ kết thúc</strong>, tiết, phòng, giáo viên
            </p>
            <div className="flex flex-wrap items-center gap-3">
              <input ref={ttFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleTimetableExcelFile} />
              <button type="button" onClick={() => ttFileRef.current?.click()}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white">📂 Chọn file Excel</button>
              {ttImportPreview.length > 0 && (
                <button type="button" onClick={submitTimetableImport} disabled={ttImportLoading}
                  className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
                  {ttImportLoading ? 'Đang nhập...' : `Nhập ${ttImportPreview.length} tiết`}
                </button>
              )}
              {ttImportPreview.length > 0 && (
                <button type="button" onClick={() => setTtImportPreview([])}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700">Hủy</button>
              )}
            </div>
            {ttImportToast && (
              <div className={`mt-3 rounded-lg px-4 py-2 text-sm font-medium ${
                ttImportToast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
              }`}>{ttImportToast.message}</div>
            )}
            {ttImportPreview.length > 0 && (
              <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-emerald-200 bg-white">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-emerald-50"><tr>
                    <th className="px-2 py-1">#</th><th className="px-2 py-1">Lớp</th>
                    <th className="px-2 py-1">Môn</th><th className="px-2 py-1">Thứ</th>
                    <th className="px-2 py-1">Giờ</th>
                  </tr></thead>
                  <tbody>{ttImportPreview.map((r) => (
                    <tr key={r._row} className={`border-t ${!r.class_id || !r.subject_name ? 'bg-red-50' : ''}`}>
                      <td className="px-2 py-1 text-slate-400">{r._row}</td>
                      <td className="px-2 py-1">{r.class_id || <span className="text-red-500">trống</span>}</td>
                      <td className="px-2 py-1">{r.subject_name || <span className="text-red-500">trống</span>}</td>
                      <td className="px-2 py-1">T{Number(r.day_of_week) + 1}</td>
                      <td className="px-2 py-1">{r.start_time}-{r.end_time}</td>
                    </tr>
                  ))}</tbody>
                </table>
              </div>
            )}
          </div>
          </>
        )}

        {tab === 'provision' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Cấp tài khoản phụ huynh"
              description="Chọn học sinh, nhập thông tin phụ huynh rồi tạo tài khoản truy cập ứng dụng."
            />
            
            <div className="mb-3 grid gap-3 md:grid-cols-2">
              <div>
                <FieldLabel>1. Chọn học sinh</FieldLabel>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={selectedStudentId}
                  onChange={(e) => setSelectedStudentId(e.target.value)}
                >
                  <option value="">Chọn học sinh cần liên kết</option>
                  {students.map((student) => (
                    <option key={student.id} value={student.id}>
                      {student.student_code} - {student.full_name} - {student.class_name || 'Chưa có lớp'}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <FieldLabel>2. Quan hệ với học sinh</FieldLabel>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={parentForm.relationship}
                  onChange={(e) => setParentForm(prev => ({ ...prev, relationship: e.target.value }))}
                >
                  <option value="father">Bố</option>
                  <option value="mother">Mẹ</option>
                  <option value="guardian">Người giám hộ</option>
                </select>
              </div>
              <div>
                <FieldLabel>3. Họ tên phụ huynh</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Nhập họ tên phụ huynh"
                  value={parentForm.parent_name}
                  onChange={(e) => setParentForm(prev => ({ ...prev, parent_name: e.target.value }))}
                />
              </div>
              <div>
                <FieldLabel>4. Số điện thoại hoặc email</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Số điện thoại"
                  value={parentForm.parent_phone}
                  onChange={(e) => setParentForm(prev => ({ ...prev, parent_phone: e.target.value }))}
                />
              </div>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Email phụ huynh nếu có"
                type="email"
                value={parentForm.parent_email}
                onChange={(e) => setParentForm(prev => ({ ...prev, parent_email: e.target.value }))}
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mật khẩu tạm nếu cần"
                type="password"
                value={parentForm.password}
                onChange={(e) => setParentForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            {!selectedStudentId ? (
              <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
                Hãy chọn học sinh trước khi tạo tài khoản phụ huynh.
              </div>
            ) : null}
            
            <button
              onClick={provisionParent}
              disabled={!selectedStudentId}
              className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-gray-400"
            >
              Cấp tài khoản
            </button>

            {provisionResult && provisionResult.ok ? (
              <div className="mt-3 rounded-lg bg-green-50 p-3 text-sm">
                <p className="text-green-800 font-semibold">{provisionResult.message}</p>
                <hr className="my-2 border-green-200"/>
                <p><strong>Họ tên:</strong> {provisionResult.data?.parent_name}</p>
                <p><strong>Email:</strong> {provisionResult.data?.parent_email}</p>
                <p><strong>Số điện thoại:</strong> {provisionResult.data?.parent_phone || '-'}</p>
                <p><strong>Mật khẩu:</strong> {provisionResult.data?.password}</p>
                <p><strong>Mã HS:</strong> {provisionResult.data?.student_code}</p>
                <p className="mt-2 text-green-700">
                  Email và số điện thoại này là thông tin khôi phục khi phụ huynh quên mật khẩu.
                </p>
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === 'parents' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Phụ huynh"
              description="Theo dõi tài khoản phụ huynh và học sinh đã liên kết."
              actions={(
                <button
                  type="button"
                  onClick={() => setTab('provision')}
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
                >
                  Cấp tài khoản phụ huynh
                </button>
              )}
            />
            <button
              onClick={loadParents}
              className="mb-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Làm mới danh sách
            </button>
            
            {parents.length === 0 ? (
              <EmptyState message="Chưa có phụ huynh nào được liên kết. Hãy cấp tài khoản phụ huynh cho học sinh trước." />
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-2">Họ tên</th>
                      <th className="py-2">Liên hệ khôi phục</th>
                      <th className="py-2">Trạng thái</th>
                      <th className="py-2">Số học sinh liên kết</th>
                      <th className="py-2">Lần đăng nhập gần nhất</th>
                      <th className="py-2">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parents.map((parent) => (
                      <tr key={parent.id} className="border-b">
                        <td className="py-2">{parent.full_name || '-'}</td>
                        <td className="py-2">
                          <div className="font-medium text-slate-800">{parent.email || '-'}</div>
                          <div className="text-xs text-slate-500">SĐT: {parent.phone || 'Chưa cập nhật'}</div>
                          <div className="text-xs text-slate-400">Dùng để xác minh khi quên mật khẩu</div>
                        </td>
                        <td className="py-2"><StatusBadge className={parent.is_active === false ? 'bg-rose-100 text-rose-700' : 'bg-emerald-100 text-emerald-700'}>{parent.is_active === false ? 'Đã khóa' : 'Đang hoạt động'}</StatusBadge></td>
                        <td className="py-2">{parent.linked_students_count || (parent.student_code ? 1 : 0)}</td>
                        <td className="py-2">{formatDateTime(parent.last_sign_in_at)}</td>
                        <td className="py-2">
                          <div className="flex flex-wrap gap-2">
                            <button type="button" onClick={() => showParentDetail(parent)} className="rounded bg-slate-100 px-2 py-1 text-slate-700">Xem chi tiết</button>
                            <button type="button" onClick={() => resetParentPassword(parent)} className="rounded bg-amber-100 px-2 py-1 text-amber-700">Đặt lại mật khẩu</button>
                            <button type="button" onClick={() => toggleParentActive(parent)} className="rounded bg-rose-100 px-2 py-1 text-rose-700">
                              {parent.is_active === false ? 'Mở khóa' : 'Khóa'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {tab === 'timetable' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Thời khóa biểu theo lớp</h2>
                <p className="text-sm text-slate-500">
                  Chọn lớp rồi bấm trực tiếp vào ô tiết học để thêm mới hoặc sửa.
                </p>
              </div>
              <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200">
                {activeTimetableClass || 'Chưa chọn lớp'} • {activeClassTimetables.length} tiết
              </div>
            </div>

            <div className="mb-4 flex flex-wrap gap-2">
              {timetableClassOptions.map((classId) => (
                <button
                  key={classId}
                  type="button"
                  onClick={() => chooseTimetableClass(classId)}
                  className={`rounded-lg px-3 py-2 text-sm font-semibold ring-1 ${
                    activeTimetableClass === classId
                      ? 'bg-blue-600 text-white ring-blue-600'
                      : 'bg-white text-slate-700 ring-slate-200 hover:bg-blue-50'
                  }`}
                >
                  {classId}
                </button>
              ))}
              <input
                className="min-w-36 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nhập lớp mới"
                list="class-options"
                value={timetableForm.class_id}
                onChange={(e) => {
                  const classId = e.target.value;
                  setSelectedTimetableClass(classId);
                  setTimetableForm((prev) => ({ ...prev, class_id: classId }));
                }}
              />
            </div>

            <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
              <div className="overflow-x-auto rounded-xl border border-slate-200">
                {activeTimetableClass ? (
                  <table className="min-w-[920px] table-fixed text-left text-sm">
                    <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                      <tr>
                        <th className="w-24 border-b border-slate-200 px-3 py-3">Tiết</th>
                        {[1, 2, 3, 4, 5, 6].map((day) => (
                          <th key={day} className="border-b border-slate-200 px-3 py-3">
                            {dayLabel(day)}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {timetablePeriods.map((period) => (
                        <tr key={period} className="border-b border-slate-100 last:border-b-0">
                          <td className="bg-slate-50 px-3 py-3 align-top font-semibold text-slate-700">
                            {period}
                          </td>
                          {[1, 2, 3, 4, 5, 6].map((day) => {
                            const item = findTimetableSlot(day, period);
                            const selected = item?.id && selectedTimetable?.id === item.id;
                            return (
                              <td key={`${period}-${day}`} className="h-28 border-l border-slate-100 p-2 align-top">
                                <button
                                  type="button"
                                  onClick={() => selectTimetableSlot(day, period)}
                                  className={`h-full min-h-24 w-full rounded-lg border p-2 text-left transition ${
                                    item
                                      ? selected
                                        ? 'border-blue-500 bg-blue-50 shadow-sm'
                                        : 'border-slate-200 bg-white hover:border-blue-300 hover:bg-blue-50'
                                      : 'border-dashed border-slate-200 bg-slate-50 text-slate-400 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700'
                                  }`}
                                >
                                  {item ? (
                                    <span className="block">
                                      <span className="block truncate font-bold text-slate-950">{item.subject_name}</span>
                                      <span className="mt-1 block text-xs text-slate-500">
                                        {String(item.start_time).slice(0, 5)}-{String(item.end_time).slice(0, 5)}
                                      </span>
                                      <span className="mt-2 block line-clamp-2 text-xs text-slate-600">
                                        {item.teacher_name || 'Chưa có giáo viên'}
                                      </span>
                                      <span className="mt-1 block truncate text-xs text-slate-500">
                                        {item.room || 'Chưa có phòng'}
                                      </span>
                                    </span>
                                  ) : (
                                    <span className="flex h-full items-center justify-center text-xs font-semibold">
                                      + Thêm tiết
                                    </span>
                                  )}
                                </button>
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <EmptyState message="Chọn hoặc nhập một lớp để bắt đầu thêm thời khóa biểu." />
                )}
              </div>

              <form onSubmit={editingTimetableId ? updateTimetable : createTimetable} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="mb-3">
                  <h3 className="font-semibold text-slate-950">
                    {editingTimetableId ? 'Sửa tiết học' : 'Thêm tiết học'}
                  </h3>
                  <p className="text-xs text-slate-500">
                    Bấm vào ô trong bảng để tự điền lớp, thứ và tiết.
                  </p>
                </div>
                <div className="grid gap-3">
                  <div>
                    <FieldLabel>Lớp</FieldLabel>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="VD: 10A1"
                      list="class-options"
                      value={timetableForm.class_id}
                      onChange={(e) => {
                        const classId = e.target.value;
                        setSelectedTimetableClass(classId);
                        setTimetableForm((prev) => ({ ...prev, class_id: classId }));
                      }}
                    />
                  </div>
                  <div>
                    <FieldLabel>Môn học</FieldLabel>
                    <input
                      className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="VD: Toán"
                      list="subject-options"
                      value={timetableForm.subject_name}
                      onChange={(e) =>
                        setTimetableForm((prev) => ({ ...prev, subject_name: e.target.value }))
                      }
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <FieldLabel>Thứ</FieldLabel>
                      <select
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        value={timetableForm.day_of_week}
                        onChange={(e) =>
                          setTimetableForm((prev) => ({ ...prev, day_of_week: Number(e.target.value) }))
                        }
                      >
                        {[1, 2, 3, 4, 5, 6].map((d) => (
                          <option key={d} value={d}>{dayLabel(d)}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <FieldLabel>Tiết</FieldLabel>
                      <input
                        className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                        placeholder="Tiết 1"
                        value={timetableForm.period}
                        onChange={(e) =>
                          setTimetableForm((prev) => ({ ...prev, period: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      type="time"
                      value={timetableForm.start_time}
                      onChange={(e) =>
                        setTimetableForm((prev) => ({ ...prev, start_time: e.target.value }))
                      }
                    />
                    <input
                      className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      type="time"
                      value={timetableForm.end_time}
                      onChange={(e) =>
                        setTimetableForm((prev) => ({ ...prev, end_time: e.target.value }))
                      }
                    />
                  </div>
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Phòng"
                    value={timetableForm.room}
                    onChange={(e) =>
                      setTimetableForm((prev) => ({ ...prev, room: e.target.value }))
                    }
                  />
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Giáo viên"
                    value={timetableForm.teacher_name}
                    onChange={(e) =>
                      setTimetableForm((prev) => ({ ...prev, teacher_name: e.target.value }))
                    }
                  />
                  <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                    {editingTimetableId ? 'Cập nhật tiết học' : 'Thêm tiết học'}
                  </button>
                  {editingTimetableId ? (
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={cancelEditTimetable}
                        className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                      >
                        Hủy sửa
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteTimetable(editingTimetableId)}
                        className="rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-700"
                      >
                        Xóa tiết
                      </button>
                    </div>
                  ) : null}
                </div>
              </form>
            </div>
          </section>
        ) : null}

        {tab === 'fees' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Học phí & khoản thu"
              description="Tạo khoản thu cho toàn trường, khối, lớp hoặc học sinh cụ thể."
            />
            <form onSubmit={editingFeeId ? updateFee : createFee} className="mb-4 grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel>Tên khoản thu</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="VD: Học phí tháng 6"
                  value={feeForm.fee_name}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, fee_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Áp dụng cho</FieldLabel>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={feeForm.apply_scope}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, apply_scope: e.target.value }))
                  }
                >
                  <option value="school">Toàn trường</option>
                  <option value="grade">Khối</option>
                  <option value="class">Lớp</option>
                  <option value="student">Học sinh cụ thể</option>
                </select>
              </div>
              <div>
                <FieldLabel>Học sinh cụ thể</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="VD: HS0085"
                  list="student-code-options"
                  value={feeForm.student_code}
                  onFocus={openInputPicker}
                  onClick={openInputPicker}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, student_code: e.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Lớp</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="VD: 10C2"
                  list="class-options"
                  value={feeForm.class_id}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, class_id: e.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Số tiền</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="VD: 500000"
                  value={feeForm.total_amount}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, total_amount: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-3">
                <FieldLabel>Khoản thu chính</FieldLabel>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder={'Học phí tháng 6: 500000\nTiền ăn bán trú: 300000'}
                  value={feeForm.subject_fees_text}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, subject_fees_text: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-3">
                <FieldLabel>Khoản thu khác</FieldLabel>
                <textarea
                  rows={3}
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder={'Bán trú: 500000\nHoạt động ngoại khóa 150.000'}
                  value={feeForm.other_fees_text}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, other_fees_text: e.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Trạng thái</FieldLabel>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={feeForm.payment_status}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, payment_status: e.target.value }))
                  }
                >
                  <option value="unpaid">Chưa thanh toán</option>
                  <option value="partial">Thanh toán một phần</option>
                  <option value="paid">Đã thanh toán</option>
                </select>
              </div>
              <div>
                <FieldLabel>Phương thức thu</FieldLabel>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={feeForm.payment_method}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, payment_method: e.target.value }))
                  }
                >
                  <option value="">Chưa chọn</option>
                  <option value="online">Chuyển khoản</option>
                  <option value="cash">Tiền mặt</option>
                </select>
              </div>
              <div>
                <FieldLabel>Hạn thanh toán</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  type="datetime-local"
                  value={feeForm.paid_at}
                  onChange={(e) =>
                    setFeeForm((prev) => ({ ...prev, paid_at: e.target.value }))
                  }
                />
              </div>
              <div className="md:col-span-3 rounded-lg bg-sky-50 px-3 py-2 text-xs text-sky-800">
                Mẹo: nếu muốn thu theo toàn trường, khối hoặc lớp, chọn phạm vi trước rồi dùng danh sách bên dưới để chọn học sinh/lớp cần tạo khoản. Phần kết nối dữ liệu hàng loạt nằm ở mục Dữ liệu & đồng bộ.
              </div>
              <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                {editingFeeId ? 'Cập nhật thông báo phí' : 'Tạo thông báo phí'}
              </button>
              {editingFeeId ? (
                <button
                  type="button"
                  onClick={cancelEditFee}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Hủy sửa
                </button>
              ) : null}
            </form>
            {renderHierarchyNavigator({
              title: 'Xem khoản phí theo khối, lớp và học sinh',
              grade: activeFeeGrade,
              classes: feeClassOptions,
              activeClass: activeFeeClass,
              onGradeChange: (level) => {
                setFeeGradeFilter(level);
                setFeeClassFilter('');
                setFeeStudentCodeFilter('');
                setSelectedFee(null);
              },
              onClassChange: (className) => {
                setFeeClassFilter(className);
                setFeeStudentCodeFilter('');
                setSelectedFee(null);
                setFeeForm((prev) => ({ ...prev, class_id: className }));
              },
              studentsInClass: feeStudentsInClass,
              activeStudentCode: activeFeeStudentCode,
              onStudentChange: (student) => {
                setFeeStudentCodeFilter(student.student_code);
                setSelectedFee(null);
                setFeeForm((prev) => ({
                  ...prev,
                  student_code: student.student_code,
                  class_id: student.class_name || activeFeeClass,
                }));
              },
            })}
            <ModuleSearch
              value={feeSearch}
              onChange={setFeeSearch}
              placeholder="Tìm theo mã học sinh, lớp, trạng thái, phương thức, khoản thu, số tiền..."
              count={displayedFees.length}
              total={fees.length}
            />
            {selectedFee && (!activeFeeStudentCode || selectedFee.student_code === activeFeeStudentCode) ? (
              <div className="mb-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-slate-700">
                <div className="mb-2 flex items-start justify-between gap-3">
                  <div>
                    <div className="text-xs font-semibold uppercase text-emerald-700">Chi tiết khoản phí</div>
                    <div className="text-lg font-bold text-slate-950">
                      {selectedFee.student_code} - {formatCurrency(selectedFee.total_amount)}
                    </div>
                  </div>
                  <button type="button" onClick={() => setSelectedFee(null)} className="rounded-lg bg-white px-2 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200">
                    Đóng
                  </button>
                </div>
                <div className="grid gap-2 md:grid-cols-3">
                  <div><strong>Lớp:</strong> {selectedFee.class_id || '-'}</div>
                  <div><strong>Trạng thái:</strong> {paymentStatusLabel(selectedFee.payment_status)}</div>
                  <div><strong>Phương thức:</strong> {selectedFee.payment_method || '-'}</div>
                  <div><strong>Thời gian:</strong> {formatDateTime(selectedFee.paid_at)}</div>
                </div>
                <div className="mt-3 grid gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-white p-3 ring-1 ring-emerald-100">
                    <div className="mb-2 font-semibold text-slate-900">Khoản thu chính</div>
                    {mapEntries(selectedFee.subject_fees).length ? mapEntries(selectedFee.subject_fees).map(([label, amount]) => (
                      <div key={label} className="flex justify-between border-t border-slate-100 py-1">
                        <span>{label}</span>
                        <strong>{formatLooseCurrency(amount)}</strong>
                      </div>
                    )) : <span className="text-slate-500">Chưa có dữ liệu</span>}
                  </div>
                  <div className="rounded-lg bg-white p-3 ring-1 ring-emerald-100">
                    <div className="mb-2 font-semibold text-slate-900">Khoản thu khác</div>
                    {mapEntries(selectedFee.other_fees).length ? mapEntries(selectedFee.other_fees).map(([label, amount]) => (
                      <div key={label} className="flex justify-between border-t border-slate-100 py-1">
                        <span>{label}</span>
                        <strong>{formatLooseCurrency(amount)}</strong>
                      </div>
                    )) : <span className="text-slate-500">Chưa có dữ liệu</span>}
                  </div>
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              {displayedFees.map((f) => (
                <div
                  key={f.id}
                  onClick={() => setSelectedFee(f)}
                  className={`cursor-pointer rounded-lg border border-slate-200 p-3 text-sm hover:border-emerald-200 hover:bg-emerald-50 ${selectedFee?.id === f.id ? 'border-emerald-300 bg-emerald-50' : ''}`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{f.student_code}</strong> • {f.class_id || '-'} •{' '}
                      <span>{formatCurrency(f.total_amount)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          startEditFee(f);
                        }}
                        className="rounded bg-amber-100 px-2 py-1 text-amber-700"
                      >
                        Sửa
                      </button>
                      <button
                        type="button"
                        onClick={(event) => {
                          event.stopPropagation();
                          deleteFee(f.id);
                        }}
                        className="rounded bg-rose-100 px-2 py-1 text-rose-700"
                      >
                        Xóa
                      </button>
                    </div>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-slate-600">
                    <span className={`rounded-full px-2 py-1 text-xs font-semibold ${paymentStatusClass(f.payment_status)}`}>
                      {paymentStatusLabel(f.payment_status)}
                    </span>
                    <span>Phương thức: {f.payment_method || '-'}</span>
                    <span>Thời gian: {formatDateTime(f.paid_at)}</span>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-slate-600 md:grid-cols-2">
                    <span>Khoản thu chính: {mapEntries(f.subject_fees).map(([label, amount]) => `${label}: ${formatLooseCurrency(amount)}`).join(', ') || '-'}</span>
                    <span>Khoản khác: {mapEntries(f.other_fees).map(([label, amount]) => `${label}: ${formatLooseCurrency(amount)}`).join(', ') || '-'}</span>
                  </div>
                </div>
              ))}
            </div>
            {displayedFees.length === 0 ? <EmptyState message="Chưa có khoản phí cho học sinh hoặc bộ lọc hiện tại." /> : null}

            {/* ── Excel Import fees ── */}
            <div className="mt-4 rounded-lg border border-dashed border-orange-300 bg-orange-50 p-4">
              <p className="mb-2 text-sm font-semibold text-orange-800">Nhập học phí từ Excel</p>
              <p className="mb-3 text-xs text-orange-700">
                Cần cột: <strong>mã học sinh</strong>, <strong>tổng tiền</strong>, <strong>trạng thái</strong> (chưa thanh toán/thanh toán một phần/đã thanh toán), phương thức (chuyển khoản/tiền mặt)
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input ref={feeFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFeesExcelFile} />
                <button type="button" onClick={() => feeFileRef.current?.click()}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">📂 Chọn file Excel</button>
                {feeImportPreview.length > 0 && (
                  <button type="button" onClick={submitFeesImport} disabled={feeImportLoading}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
                    {feeImportLoading ? 'Đang nhập...' : `Nhập ${feeImportPreview.length} khoản phí`}
                  </button>
                )}
                {feeImportPreview.length > 0 && (
                  <button type="button" onClick={() => setFeeImportPreview([])}
                    className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700">Hủy</button>
                )}
              </div>
              {feeImportToast && (
                <div className={`mt-3 rounded-lg px-4 py-2 text-sm font-medium ${
                  feeImportToast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>{feeImportToast.message}</div>
              )}
              {feeImportPreview.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-orange-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-orange-50"><tr>
                      <th className="px-2 py-1">#</th><th className="px-2 py-1">Mã HS</th>
                      <th className="px-2 py-1">Số tiền</th><th className="px-2 py-1">Trạng thái</th>
                    </tr></thead>
                    <tbody>{feeImportPreview.map((r) => (
                      <tr key={r._row} className={`border-t ${!r.student_code ? 'bg-red-50' : ''}`}>
                        <td className="px-2 py-1 text-slate-400">{r._row}</td>
                        <td className="px-2 py-1">{r.student_code || <span className="text-red-500">trống</span>}</td>
                        <td className="px-2 py-1">{Number(r.total_amount || 0).toLocaleString('vi-VN')}đ</td>
                        <td className="px-2 py-1">{r.payment_status || 'unpaid'}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'announcements' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Thông báo trường học"
              description="Gửi thông báo tới phụ huynh theo toàn trường, khối, lớp hoặc học sinh cụ thể."
            />
            <form onSubmit={createAnnouncement} className="mb-4 grid gap-3 md:grid-cols-3">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-2"
                placeholder="Tiêu đề thông báo"
                value={announcementForm.title}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <textarea
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-3"
                placeholder="Nội dung thông báo"
                rows={4}
                value={announcementForm.content}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))
                }
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={announcementForm.target_type}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({
                    ...prev,
                    target_type: e.target.value,
                    is_general: e.target.value === 'school',
                  }))
                }
              >
                <option value="school">Toàn trường</option>
                <option value="grade">Theo khối</option>
                <option value="class">Theo lớp</option>
                <option value="student">Theo học sinh/phụ huynh cụ thể</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={announcementForm.priority}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({ ...prev, priority: e.target.value }))
                }
              >
                <option value="normal">Bình thường</option>
                <option value="high">Quan trọng</option>
                <option value="urgent">Khẩn cấp</option>
              </select>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={announcementForm.send_notification}
                  onChange={(e) =>
                    setAnnouncementForm((prev) => ({ ...prev, send_notification: e.target.checked }))
                  }
                />
                Hiển thị trên ứng dụng phụ huynh
              </label>
              <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                Đăng thông báo
              </button>
            </form>
            <ModuleSearch
              value={announcementSearch}
              onChange={setAnnouncementSearch}
              placeholder="Tìm theo tiêu đề hoặc nội dung thông báo..."
              count={filteredAnnouncements.length}
              total={announcements.length}
            />
            <div className="space-y-2">
              {filteredAnnouncements.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-wrap items-center gap-2">
                      <strong>{item.title}</strong>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                        item.priority === 'urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : item.priority === 'high'
                            ? 'bg-amber-100 text-amber-700'
                            : 'bg-blue-100 text-blue-700'
                      }`}>
                        {item.priority === 'urgent' ? 'Khẩn cấp' : item.priority === 'high' ? 'Quan trọng' : 'Bình thường'}
                      </span>
                    </div>
                    <button
                      onClick={() => deleteAnnouncement(item.id)}
                      className="rounded bg-rose-100 px-2 py-1 text-rose-700"
                    >
                      Xóa
                    </button>
                  </div>
                  <p className="mt-1 text-slate-600">{item.content}</p>
                </div>
              ))}
            </div>
            {filteredAnnouncements.length === 0 ? <EmptyState message="Chưa có thông báo phù hợp với bộ lọc." /> : null}
          </section>
        ) : null}

        {tab === 'events' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Sự kiện và hoạt động trường</h2>
                <p className="text-sm text-slate-500">
                  Đăng hoạt động có ngày diễn ra và ảnh minh họa để phụ huynh xem trong tab Sự kiện.
                </p>
              </div>
              <button
                type="button"
                onClick={loadEvents}
                className="rounded-lg bg-slate-900 px-3 py-2 text-sm font-semibold text-white"
              >
                Làm mới
              </button>
            </div>
            <form onSubmit={createEvent} className="mb-4 grid gap-3">
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Tiêu đề sự kiện</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Tiêu đề sự kiện"
                  value={eventForm.title}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, title: e.target.value }))}
                />
                </div>
                <div>
                  <FieldLabel>Thời gian</FieldLabel>
                <input
                  type="datetime-local"
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={eventForm.event_date}
                  onChange={(e) => setEventForm((prev) => ({ ...prev, event_date: e.target.value }))}
                />
                </div>
              </div>
              <div className="rounded-lg border border-slate-200 bg-slate-50 p-3">
                <FieldLabel>Ảnh minh họa</FieldLabel>
                <input
                  ref={eventImageFileRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  className="hidden"
                  onChange={handleEventImageFile}
                />
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={() => eventImageFileRef.current?.click()}
                    disabled={eventImageLoading}
                    className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
                  >
                    {eventImageLoading ? 'Đang tải ảnh...' : 'Chọn ảnh từ máy'}
                  </button>
                  {eventForm.image_url ? (
                    <span className="min-w-0 flex-1 truncate text-xs text-slate-600">
                      {eventForm.image_url}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">Ảnh minh họa là tùy chọn.</span>
                  )}
                </div>
                {eventForm.image_url ? (
                  <img
                    src={eventForm.image_url}
                    alt=""
                    className="mt-3 h-36 w-full rounded-lg object-cover"
                  />
                ) : null}
              </div>
              <textarea
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nội dung"
                rows={4}
                value={eventForm.content}
                onChange={(e) => setEventForm((prev) => ({ ...prev, content: e.target.value }))}
              />
              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <FieldLabel>Đối tượng nhận</FieldLabel>
                  <select
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    value={eventForm.target_type}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, target_type: e.target.value }))}
                  >
                    <option value="school">Toàn trường</option>
                    <option value="grade">Theo khối</option>
                    <option value="class">Theo lớp</option>
                    <option value="student">Theo học sinh/phụ huynh cụ thể</option>
                  </select>
                </div>
                <label className="mt-6 flex items-center gap-2 text-sm font-semibold text-slate-700">
                  <input
                    type="checkbox"
                    checked={eventForm.visible_on_parent_app}
                    onChange={(e) => setEventForm((prev) => ({ ...prev, visible_on_parent_app: e.target.checked }))}
                  />
                  Hiển thị trên ứng dụng phụ huynh
                </label>
              </div>
              <div className="flex flex-wrap gap-2">
                <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                  {editingEventId ? 'Cập nhật sự kiện' : 'Đăng sự kiện'}
                </button>
                {editingEventId ? (
                  <button
                    type="button"
                    onClick={cancelEditEvent}
                    className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                  >
                    Hủy sửa
                  </button>
                ) : null}
              </div>
            </form>
            <ModuleSearch
              value={eventSearch}
              onChange={setEventSearch}
              placeholder="Tìm theo tiêu đề, nội dung hoặc ảnh sự kiện..."
              count={filteredEvents.length}
              total={events.length}
            />
            <div className="grid gap-3 md:grid-cols-2">
              {filteredEvents.map((item) => (
                <div key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white text-sm shadow-sm">
                  {item.image_url ? (
                    <img src={item.image_url} alt="" className="h-40 w-full object-cover" />
                  ) : (
                    <div className="flex h-32 items-center justify-center bg-blue-50 text-blue-700">
                      Chưa có ảnh minh họa
                    </div>
                  )}
                  <div className="p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <strong className="text-slate-950">{item.title}</strong>
                        <div className="mt-1 text-xs text-slate-500">
                          {item.event_date ? new Date(item.event_date).toLocaleString('vi-VN') : 'Chưa đặt ngày diễn ra'}
                        </div>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <button
                          type="button"
                          onClick={() => startEditEvent(item)}
                          className="rounded bg-amber-100 px-2 py-1 text-amber-700"
                        >
                          Sửa
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteEvent(item.id)}
                          className="rounded bg-rose-100 px-2 py-1 text-rose-700"
                        >
                          Xóa
                        </button>
                      </div>
                    </div>
                    <p className="mt-2 line-clamp-3 text-slate-600">{item.content}</p>
                  </div>
                </div>
              ))}
            </div>
            {filteredEvents.length === 0 ? <EmptyState message="Chưa có sự kiện phù hợp với bộ lọc." /> : null}
          </section>
        ) : null}

        {tab === 'grades' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Bảng điểm học sinh"
              description="Nhập điểm theo học sinh, môn học và học kỳ."
            />
            <form onSubmit={createGrade} className="mb-4 grid gap-3 md:grid-cols-3">
              <div>
                <FieldLabel>Chọn học sinh</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Mã học sinh"
                  list="student-code-options"
                  value={gradeForm.student_code}
                  onFocus={openInputPicker}
                  onClick={openInputPicker}
                  onChange={(e) =>
                    setGradeForm((prev) => ({ ...prev, student_code: e.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Môn học</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Chọn hoặc nhập môn học"
                  list="subject-options"
                  value={gradeForm.subject_name}
                  onFocus={openInputPicker}
                  onClick={openInputPicker}
                  onChange={(e) =>
                    setGradeForm((prev) => ({ ...prev, subject_name: e.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Học kỳ</FieldLabel>
                <select
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={gradeForm.semester}
                  onChange={(e) => setGradeForm((prev) => ({ ...prev, semester: e.target.value }))}
                >
                  <option>Học kỳ 1</option>
                  <option>Học kỳ 2</option>
                  <option>Cả năm</option>
                </select>
              </div>
              <div>
                <FieldLabel>Điểm giữa kỳ</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="VD: 8.0"
                  value={gradeForm.midterm_score}
                  onChange={(e) =>
                    setGradeForm((prev) => ({ ...prev, midterm_score: e.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Điểm cuối kỳ</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="VD: 8.5"
                  value={gradeForm.final_score}
                  onChange={(e) =>
                    setGradeForm((prev) => ({ ...prev, final_score: e.target.value }))
                  }
                />
              </div>
              <div>
                <FieldLabel>Nhận xét</FieldLabel>
                <input
                  className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Nhận xét nếu cần"
                  value={gradeForm.comment}
                  onChange={(e) =>
                    setGradeForm((prev) => ({ ...prev, comment: e.target.value }))
                  }
                />
              </div>
              <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                Thêm điểm
              </button>
            </form>
            {renderHierarchyNavigator({
              title: 'Xem bảng điểm theo khối, lớp và học sinh',
              grade: activeGradeGrade,
              classes: gradeClassOptions,
              activeClass: activeGradeClass,
              onGradeChange: (level) => {
                setGradeGradeFilter(level);
                setGradeClassFilter('');
                setGradeStudentCodeFilter('');
              },
              onClassChange: (className) => {
                setGradeClassFilter(className);
                setGradeStudentCodeFilter('');
              },
              studentsInClass: gradeStudentsInClass,
              activeStudentCode: activeGradeStudentCode,
              onStudentChange: (student) => {
                setGradeStudentCodeFilter(student.student_code);
                setGradeForm((prev) => ({ ...prev, student_code: student.student_code }));
              },
            })}
            <ModuleSearch
              value={gradeSearch}
              onChange={setGradeSearch}
              placeholder="Tìm theo mã học sinh, môn học, học kỳ..."
              count={displayedGrades.length}
              total={grades.length}
            />
            <div className="space-y-2">
              {displayedGrades.map((item) => (
                <div key={item.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{item.student_code}</strong> - {item.subject_name}
                    </div>
                    <button
                      onClick={() => deleteGrade(item.id)}
                      className="rounded bg-rose-100 px-2 py-1 text-rose-700"
                    >
                      Xóa
                    </button>
                  </div>
                  <div className="text-slate-600">
                    Giữa kỳ: {item.midterm_score} | Cuối kỳ: {item.final_score}
                  </div>
                </div>
              ))}
            </div>
            {displayedGrades.length === 0 ? <EmptyState message="Chưa có bảng điểm cho học sinh hoặc bộ lọc hiện tại." /> : null}

            {/* ── Excel Import grades ── */}
            <div className="mt-4 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 p-4">
              <p className="mb-2 text-sm font-semibold text-indigo-800">Nhập bảng điểm từ Excel</p>
              <p className="mb-3 text-xs text-indigo-700">
                Cần cột: <strong>mã học sinh</strong>, <strong>môn học</strong>, <strong>giữa kỳ</strong>, <strong>cuối kỳ</strong>, học kỳ, năm học
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input ref={gradeFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleGradesExcelFile} />
                <button type="button" onClick={() => gradeFileRef.current?.click()}
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white">📂 Chọn file Excel</button>
                {gradeImportPreview.length > 0 && (
                  <button type="button" onClick={submitGradesImport} disabled={gradeImportLoading}
                    className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
                    {gradeImportLoading ? 'Đang nhập...' : `Nhập ${gradeImportPreview.length} bản ghi`}
                  </button>
                )}
                {gradeImportPreview.length > 0 && (
                  <button type="button" onClick={() => setGradeImportPreview([])}
                    className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-700">Hủy</button>
                )}
              </div>
              {gradeImportToast && (
                <div className={`mt-3 rounded-lg px-4 py-2 text-sm font-medium ${
                  gradeImportToast.type === 'success' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                }`}>{gradeImportToast.message}</div>
              )}
              {gradeImportPreview.length > 0 && (
                <div className="mt-3 max-h-40 overflow-y-auto rounded-lg border border-indigo-200 bg-white">
                  <table className="min-w-full text-left text-xs">
                    <thead className="bg-indigo-50"><tr>
                      <th className="px-2 py-1">#</th><th className="px-2 py-1">Mã HS</th>
                      <th className="px-2 py-1">Môn</th><th className="px-2 py-1">GK</th><th className="px-2 py-1">CK</th>
                    </tr></thead>
                    <tbody>{gradeImportPreview.map((r) => (
                      <tr key={r._row} className={`border-t ${!r.student_code || !r.subject_name ? 'bg-red-50' : ''}`}>
                        <td className="px-2 py-1 text-slate-400">{r._row}</td>
                        <td className="px-2 py-1">{r.student_code || <span className="text-red-500">trống</span>}</td>
                        <td className="px-2 py-1">{r.subject_name || <span className="text-red-500">trống</span>}</td>
                        <td className="px-2 py-1">{r.midterm_score}</td>
                        <td className="px-2 py-1">{r.final_score}</td>
                      </tr>
                    ))}</tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {tab === 'chat' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader title="Tin nhắn phụ huynh" description="Trao đổi với phụ huynh theo từng học sinh như hộp thư." />
            <div className="grid min-h-[520px] gap-4 lg:grid-cols-[300px_1fr]">
              <aside className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <input
                  className="mb-3 w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="Tìm phụ huynh hoặc học sinh..."
                  value={chatSearch}
                  onChange={(e) => setChatSearch(e.target.value)}
                />
                <div className="max-h-[430px] space-y-2 overflow-y-auto">
                  {students.map((student) => (
                    <button
                      key={student.id}
                      type="button"
                      onClick={() => {
                        setChatForm((prev) => ({ ...prev, student_code: student.student_code }));
                        loadChatMessages(student.student_code);
                      }}
                      className={`w-full rounded-lg border px-3 py-2 text-left text-sm ${chatForm.student_code === student.student_code ? 'border-blue-300 bg-blue-50' : 'border-slate-200 bg-white'}`}
                    >
                      <div className="font-semibold">{student.full_name}</div>
                      <div className="text-xs text-slate-500">{student.student_code} - {student.class_name || 'Chưa có lớp'}</div>
                    </button>
                  ))}
                </div>
              </aside>
              <div className="flex min-h-[520px] flex-col rounded-xl border border-slate-200 bg-white">
                <div className="border-b border-slate-200 px-4 py-3">
                  <div className="font-bold">{chatForm.student_code ? `Hội thoại với ${chatForm.student_code}` : 'Chọn học sinh để xem hội thoại'}</div>
                  <button
                    type="button"
                    onClick={() => loadChatMessages(chatForm.student_code)}
                    className="mt-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white"
                  >
                    Làm mới hội thoại
                  </button>
                </div>
                <div className="flex-1 space-y-3 overflow-y-auto p-4">
                  {filteredChatMessages.map((item) => {
                    const fromSchool = String(item.sender_role || '').toLowerCase() !== 'parent';
                    return (
                      <div key={item.id} className={`flex ${fromSchool ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[75%] rounded-xl px-3 py-2 text-sm ${fromSchool ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-800'}`}>
                          <div className={`mb-1 text-xs font-semibold ${fromSchool ? 'text-blue-100' : 'text-slate-500'}`}>
                            {senderRoleLabel(item.sender_role)} - {item.sender_name || 'Không rõ'} - {formatDateTime(item.created_at)}
                          </div>
                          <p className="whitespace-pre-wrap">{item.message_text}</p>
                        </div>
                      </div>
                    );
                  })}
                  {filteredChatMessages.length === 0 ? <EmptyState message="Chưa có tin nhắn trong hội thoại này." /> : null}
                </div>
                <form onSubmit={sendChatMessage} className="grid gap-2 border-t border-slate-200 p-3 md:grid-cols-[1fr_auto]">
                  <input
                    className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Nhập nội dung phản hồi cho phụ huynh"
                    value={chatForm.message_text}
                    onChange={(e) => setChatForm((prev) => ({ ...prev, message_text: e.target.value }))}
                    required
                  />
                  <button disabled={!chatForm.student_code} className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
                    Gửi phản hồi
                  </button>
                </form>
              </div>
            </div>
          </section>
        ) : null}

        {tab === 'attendance' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader title="Điểm danh" description="Lọc và theo dõi dữ liệu vào/ra của học sinh." />
            <div className="mb-4 flex flex-wrap items-end gap-3">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Lớp</label>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={attendanceFilters.class_name}
                  onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, class_name: e.target.value }))}
                >
                  <option value="">Tất cả lớp</option>
                  {classOptions.map((className) => (
                    <option key={className} value={className}>{className}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Học sinh</label>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={attendanceFilters.student_code}
                  onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, student_code: e.target.value }))}
                >
                  <option value="">Tất cả học sinh</option>
                  {students.map((s) => (
                    <option key={s.id} value={s.student_code}>
                      {s.student_code} - {s.full_name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Loại điểm danh</label>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={attendanceFilters.log_type}
                  onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, log_type: e.target.value }))}
                >
                  <option value="">Tất cả</option>
                  <option value="check_in">Vào</option>
                  <option value="check_out">Ra</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Trạng thái</label>
                <select
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={attendanceFilters.status_detail}
                  onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, status_detail: e.target.value }))}
                >
                  <option value="">Tất cả</option>
                  <option value="on_time">Đúng giờ</option>
                  <option value="late">Muộn</option>
                  <option value="unknown">Không xác định</option>
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Từ ngày</label>
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={attendanceFilters.date_from}
                  onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, date_from: e.target.value }))}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-500">Đến ngày</label>
                <input
                  type="date"
                  className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  value={attendanceFilters.date_to}
                  onChange={(e) => setAttendanceFilters((prev) => ({ ...prev, date_to: e.target.value }))}
                />
              </div>
              <button
                onClick={loadAttendanceLogs}
                className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
              >
                Lọc dữ liệu
              </button>
              <button
                onClick={exportAttendanceExcel}
                disabled={attendanceLogs.length === 0}
                className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
              >
                Xuất Excel
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-2">Thời gian</th>
                    <th className="py-2">Mã học sinh</th>
                    <th className="py-2">Họ tên</th>
                    <th className="py-2">Lớp</th>
                    <th className="py-2">Loại</th>
                    <th className="py-2">Trạng thái</th>
                    <th className="py-2">Phút muộn</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceLogs
                    .filter((log) => !attendanceFilters.class_name || log.class_name === attendanceFilters.class_name)
                    .filter((log) => !attendanceFilters.log_type || log.log_type === attendanceFilters.log_type)
                    .filter((log) => !attendanceFilters.status_detail || log.status_detail === attendanceFilters.status_detail)
                    .map((log) => (
                    <tr key={log.id} className="border-b">
                      <td className="py-2">{formatDateTime(log.scanned_at)}</td>
                      <td className="py-2">{log.student_code}</td>
                      <td className="py-2">{log.student_name}</td>
                      <td className="py-2">{log.class_name || '-'}</td>
                      <td className="py-2">{log.log_type === 'check_out' ? 'Ra' : 'Vào'}</td>
                      <td className="py-2">{attendanceStatusLabel(log.status_detail)}</td>
                      <td className="py-2">{log.late_minutes ?? '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {attendanceLogs.length === 0 ? <EmptyState message="Chưa có dữ liệu điểm danh theo bộ lọc hiện tại." /> : null}
          </section>
        ) : null}

        {tab === 'system' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-semibold">Trạng thái hệ thống</h2>
                <p className="text-sm text-slate-500">
                  Theo dõi kết nối dữ liệu và các thông tin vận hành chính.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  loadAttendanceLogs();
                  loadChatMessages(chatForm.student_code);
                  loadSystemHealth();
                }}
                className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold text-white"
              >
                Làm mới trạng thái
              </button>
            </div>
            <div className="grid gap-3 md:grid-cols-3">
              {[
                ['Kết nối dữ liệu', syncStatus.backendOk ? 'Đang hoạt động' : 'Cần kiểm tra', syncStatus.backendOk],
                ['Cơ sở dữ liệu', syncStatus.supabaseUp ? 'Đang hoạt động' : 'Cần kiểm tra', syncStatus.supabaseUp],
                ['Hàng đợi điểm danh', syncStatus.queueEnabled ? 'Đang bật' : 'Chưa bật', syncStatus.queueEnabled],
              ].map(([label, value, ok]) => (
                <div key={String(label)} className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
                  <div className={`mt-2 text-lg font-bold ${ok ? 'text-emerald-700' : 'text-amber-700'}`}>{value}</div>
                </div>
              ))}
            </div>
            <div className="mt-4 grid gap-3 md:grid-cols-4">
              {[
                ['Điểm danh mới nhất', syncStatus.latestAttendance],
                ['Từ lần điểm danh cuối', syncStatus.minutesSinceAttendance == null ? 'Chưa có' : `${syncStatus.minutesSinceAttendance} phút`],
                ['Phụ huynh liên kết', syncStatus.totalParents],
                ['Tin nhắn đang theo dõi', syncStatus.totalChatMessages],
              ].map(([label, value]) => (
                <div key={String(label)} className="rounded-xl border border-slate-200 p-4">
                  <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
                  <div className="mt-2 text-lg font-bold text-slate-950">{value}</div>
                </div>
              ))}
            </div>
            {syncStatus.error ? (
              <div className="mt-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-800">
                {syncStatus.error}
              </div>
            ) : null}
            <div className="mt-4 grid gap-3 md:grid-cols-2">
              {renderApiImportPanel('students', 'Kết nối danh sách học sinh từ hệ thống có sẵn', loadStudents)}
              {renderApiImportPanel('timetables', 'Kết nối thời khóa biểu từ hệ thống có sẵn', loadTimetables)}
              {renderApiImportPanel('fees', 'Kết nối học phí và khoản thu từ hệ thống có sẵn', loadFees)}
              {renderApiImportPanel('grades', 'Kết nối bảng điểm từ hệ thống có sẵn', loadGrades)}
            </div>
          </section>
        ) : null}

        {tab === 'settings' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Cài đặt trường"
              description="Thông tin cấu hình hiển thị cho tài khoản nhà trường."
            />
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase text-slate-500">Trường học</div>
                <div className="mt-2 text-lg font-bold">Trường học {schoolId}</div>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase text-slate-500">Tài khoản đang dùng</div>
                <div className="mt-2 text-lg font-bold">{authUser.full_name || authUser.email}</div>
                <div className="text-sm text-slate-500">{roleLabel(authUser.role)}</div>
              </div>
              <button
                type="button"
                onClick={() => setTab('system')}
                className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-left text-sky-800"
              >
                <div className="text-xs font-semibold uppercase">Dữ liệu & đồng bộ</div>
                <div className="mt-2 text-sm font-semibold">Mở trạng thái hệ thống và kết nối dữ liệu</div>
              </button>
            </div>
          </section>
        ) : null}

        {tab === 'device' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <SectionHeader
              title="Kiểm thử điểm danh"
              description="Tạo một lượt điểm danh thử để nhân viên kiểm tra luồng dữ liệu."
            />
            <div className="mb-3 rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">
              Chức năng này chỉ dùng để kiểm thử nội bộ, không thay thế dữ liệu điểm danh thực tế.
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">-- Chọn học sinh --</option>
                {students.map((s) => (
                  <option key={s.id} value={s.student_code}>
                    {s.student_code} - {s.full_name}
                  </option>
                ))}
              </select>
              <button
                onClick={() => mockScan(selectedStudentId)}
                disabled={!selectedStudentId}
                className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400"
              >
                Tạo lượt kiểm thử
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
    </div>
    </div>
  );
}

// ─── App: Auth Gate ──────────────────────────────────────────────────────────
function App() {
  const [authToken, setAuthToken] = useState(() => {
    const savedToken = localStorage.getItem(AUTH_TOKEN_KEY) || null;
    const savedRefreshToken = localStorage.getItem(AUTH_REFRESH_TOKEN_KEY) || null;
    if (savedToken && !savedRefreshToken) {
      localStorage.removeItem(AUTH_TOKEN_KEY);
      localStorage.removeItem(AUTH_USER_KEY);
      return null;
    }
    return savedToken;
  });
  const [authUser, setAuthUser]   = useState(() => {
    if (!localStorage.getItem(AUTH_TOKEN_KEY)) {
      return null;
    }
    try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null'); } catch { return null; }
  });

  function handleLogin(token, user) {
    setAuthToken(token);
    setAuthUser(user);
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_REFRESH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setAuthToken(null);
    setAuthUser(null);
  }

  useEffect(() => {
    if (!authToken) return;
    let cancelled = false;

    async function syncCurrentUser() {
      try {
        const response = await fetch(`${API_BASE}/auth/me`, {
          headers: { Authorization: `Bearer ${authToken}` },
        });
        const json = await response.json().catch(() => null);
        if (cancelled || !response.ok || !json?.ok || !json.user) return;
        const role = String(json.user.role || '').toLowerCase();
        if (role !== 'admin' && role !== 'teacher') return;
        localStorage.setItem(AUTH_USER_KEY, JSON.stringify(json.user));
        setAuthUser(json.user);
      } catch {
        // Keep the saved session; authenticated API calls still handle expiry.
      }
    }

    syncCurrentUser();
    return () => {
      cancelled = true;
    };
  }, [authToken]);

  if (!authToken || !authUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <AppShell
      authToken={authToken}
      authUser={authUser}
      onLogout={handleLogout}
      onSessionRefresh={handleLogin}
    />
  );
}

export default App;
