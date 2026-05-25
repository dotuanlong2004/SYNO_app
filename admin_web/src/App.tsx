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
import synoLogo from './assets/brand/syno-logo-horizontal.png';

// Use Vite environment variables (VITE_ prefix required)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3000/api/v1';
const DEFAULT_SCHOOL_ID = import.meta.env.VITE_DEFAULT_SCHOOL_ID || '1';
const ADMIN_WEB_API = `${API_BASE}/admin-web`;
const AUTH_TOKEN_KEY = 'admin_web_token';
const AUTH_USER_KEY  = 'admin_web_user';
const API_CONNECTION_ERROR = 'Không thể kết nối đến backend SYNO. Hãy kiểm tra API server đang chạy ở http://127.0.0.1:3000.';

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
      justifyContent: 'center', background: '#f1f5f9',
    }}>
      <div style={{
        background: '#fff', borderRadius: 16, boxShadow: '0 4px 32px rgba(0,0,0,0.10)',
        padding: '2.5rem 2rem', width: 380, maxWidth: '95vw',
      }}>
        <div style={{ textAlign: 'center', marginBottom: '1.5rem' }}>
          <img
            src={synoLogo}
            alt="SYNO"
            style={{ width: 220, maxWidth: '100%', margin: '0 auto 12px', display: 'block' }}
          />
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

// ─── AppShell: Toàn bộ Admin UI (chỉ render khi đã đăng nhập) ──────────────
function AppShell({ authToken, authUser, onLogout }) {
  const [tab, setTab] = useState('students');
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
    password: ''
  });
  const [timetables, setTimetables] = useState([]);
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
  const [feeForm, setFeeForm] = useState({
    student_code: '',
    class_id: '',
    subject_fees_text: '{"toan": 300000}',
    other_fees_text: '{"ban_tru": 200000}',
    total_amount: '500000',
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
    is_general: true,
  });
  const [grades, setGrades] = useState([]);
  const [gradeForm, setGradeForm] = useState({
    student_code: '',
    subject_name: '',
    midterm_score: '0',
    final_score: '0',
  });
  const [attendanceLogs, setAttendanceLogs] = useState([]);
  const [attendanceFilters, setAttendanceFilters] = useState({
    student_code: '',
    date_from: '',
    date_to: '',
  });
  // Student search
  const [studentSearch, setStudentSearch] = useState('');
  const [timetableSearch, setTimetableSearch] = useState('');
  const [feeSearch, setFeeSearch] = useState('');
  const [announcementSearch, setAnnouncementSearch] = useState('');
  const [gradeSearch, setGradeSearch] = useState('');

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
      requestJson(`${ADMIN_WEB_API}/grades`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/attendance-logs`, { headers: adminHeaders })
    ])
      .then(([studentsJson, timetablesJson, feesJson, announcementsJson, gradesJson, attendanceJson]) => {
        setStudents(studentsJson.data || []);
        setTimetables(timetablesJson.data || []);
        setFees(feesJson.data || []);
        setAnnouncements(announcementsJson.data || []);
        setGrades(gradesJson.data || []);
        setAttendanceLogs(attendanceJson.data || []);
      })
      .catch((error) => {
        setMessage(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [adminHeaders]);

  async function requestJson(url, options = {}) {
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
        `API ${url} trả về không đúng định dạng JSON (HTTP ${response.status}). Hãy kiểm tra backend có đang chạy.`,
      );
    }

    let json;
    try {
      json = JSON.parse(text);
    } catch {
      throw new Error(`Phản hồi JSON không hợp lệ từ ${url} (HTTP ${response.status}).`);
    }

    if (!response.ok) {
      throw new Error(json.error || `Lỗi từ ${url} (HTTP ${response.status})`);
    }
    return json;
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

  async function loadAttendanceLogs() {
    try {
      const params = new URLSearchParams();
      if (attendanceFilters.student_code) params.set('student_code', attendanceFilters.student_code);
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
    return timetables.filter((item) =>
      matchesTextSearch(item, timetableSearch, ['class_id', 'subject_name', 'teacher_name', 'room', 'period'])
    );
  }, [timetables, timetableSearch]);

  const filteredFees = useMemo(() => {
    return fees.filter((item) =>
      matchesTextSearch(item, feeSearch, ['student_code', 'class_id', 'payment_status', 'payment_method'])
    );
  }, [fees, feeSearch]);

  const filteredAnnouncements = useMemo(() => {
    return announcements.filter((item) =>
      matchesTextSearch(item, announcementSearch, ['title', 'content'])
    );
  }, [announcements, announcementSearch]);

  const filteredGrades = useMemo(() => {
    return grades.filter((item) =>
      matchesTextSearch(item, gradeSearch, ['student_code', 'subject_name', 'semester', 'school_year'])
    );
  }, [grades, gradeSearch]);

  const adminStats = useMemo(() => {
    const paidFees = fees.filter((item) => String(item.payment_status || '').toLowerCase() === 'paid').length;
    const latestAttendance = attendanceLogs[0]?.scanned_at ? formatDateTime(attendanceLogs[0].scanned_at) : 'Chưa có';
    return [
      ['Học sinh', students.length],
      ['TKB', timetables.length],
      ['Khoản phí đã thu', `${paidFees}/${fees.length}`],
      ['Điểm danh mới nhất', latestAttendance],
    ];
  }, [students.length, timetables.length, fees, attendanceLogs]);

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
      showTtToast('success', `✅ Import thành công ${json.inserted} tiết học.`);
      setTtImportPreview([]);
      await loadTimetables();
    } catch (err) {
      showTtToast('error', `Import thất bại: ${err.message}`);
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
      showFeeToast('success', `✅ Import thành công ${json.inserted} thông báo học phí.`);
      setFeeImportPreview([]);
      await loadFees();
    } catch (err) {
      showFeeToast('error', `Import thất bại: ${err.message}`);
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
      showGradeToast('success', `✅ Import thành công ${json.inserted} bản ghi điểm.`);
      setGradeImportPreview([]);
      await loadGrades();
    } catch (err) {
      showGradeToast('error', `Import thất bại: ${err.message}`);
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

      let msg = `✅ Import thành công ${json.inserted} học sinh.`;
      if (json.invalid && json.invalid.length > 0) {
        msg += ` ⚠️ ${json.invalid.length} dòng bị bỏ qua (thiếu mã/tên).`;
      }
      showImportToast('success', msg);
      setImportPreview([]);
      await loadStudents();
    } catch (error) {
      showImportToast('error', `Import thất bại: ${error.message}`);
    } finally {
      setImportLoading(false);
    }
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
          full_name: studentForm.full_name,
          class_name: studentForm.class_name,
        }),
      });
      setEditingStudentId(null);
      setStudentForm({ student_code: '', full_name: '', class_name: '' });
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
      setParentForm({ parent_name: '', parent_email: '', parent_phone: '', password: '' });
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
      setMessage(`✅ Giả lập quẹt thẻ thành công: ${json.student_code} (${json.student_name}) -> ${json.log_type} lúc ${new Date(json.scanned_at).toLocaleTimeString('vi-VN')}`);
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
          day_of_week: Number(timetableForm.day_of_week),
        }),
      });
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
          day_of_week: Number(timetableForm.day_of_week),
        }),
      });
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
      class_id: '',
      subject_name: '',
      day_of_week: 1,
      start_time: '07:30',
      end_time: '08:15',
      room: '',
      teacher_name: '',
      period: '',
    });
  }

  async function deleteTimetable(id) {
    if (!window.confirm('Xác nhận xóa thời khóa biểu?')) return;
    try {
      await requestJson(`${ADMIN_WEB_API}/timetables/${id}`, {
        method: 'DELETE',
        headers: adminHeaders,
      });
      await loadTimetables();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function createFee(event) {
    event.preventDefault();
    setMessage('');
    try {
      const subjectFees = JSON.parse(feeForm.subject_fees_text || '{}');
      const otherFees = JSON.parse(feeForm.other_fees_text || '{}');
      await requestJson(`${ADMIN_WEB_API}/fees`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          student_code: feeForm.student_code,
          class_id: feeForm.class_id || null,
          subject_fees: subjectFees,
          other_fees: otherFees,
          total_amount: Number(feeForm.total_amount || 0),
          payment_status: feeForm.payment_status,
          payment_method: feeForm.payment_method || null,
          paid_at: feeForm.paid_at || null,
        }),
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
    try {
      const subjectFees = JSON.parse(feeForm.subject_fees_text || '{}');
      const otherFees = JSON.parse(feeForm.other_fees_text || '{}');
      await requestJson(`${ADMIN_WEB_API}/fees/${editingFeeId}`, {
        method: 'PUT',
        headers: adminHeaders,
        body: JSON.stringify({
          student_code: feeForm.student_code,
          class_id: feeForm.class_id || null,
          subject_fees: subjectFees,
          other_fees: otherFees,
          total_amount: Number(feeForm.total_amount || 0),
          payment_status: feeForm.payment_status,
          payment_method: feeForm.payment_method || null,
          paid_at: feeForm.paid_at || null,
        }),
      });
      setEditingFeeId(null);
      setFeeForm({
        student_code: '',
        class_id: '',
        subject_fees_text: '{"toan": 300000}',
        other_fees_text: '{"ban_tru": 200000}',
        total_amount: '500000',
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
    setEditingFeeId(item.id);
    setFeeForm({
      student_code: item.student_code || '',
      class_id: item.class_id || '',
      subject_fees_text: JSON.stringify(item.subject_fees || {}, null, 0),
      other_fees_text: JSON.stringify(item.other_fees || {}, null, 0),
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
      subject_fees_text: '{"toan": 300000}',
      other_fees_text: '{"ban_tru": 200000}',
      total_amount: '500000',
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
      setAnnouncementForm({ title: '', content: '', is_general: true });
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

  async function createGrade(event) {
    event.preventDefault();
    setMessage('');
    try {
      await requestJson(`${ADMIN_WEB_API}/grades`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({
          student_code: gradeForm.student_code,
          subject_name: gradeForm.subject_name,
          midterm_score: Number(gradeForm.midterm_score || 0),
          final_score: Number(gradeForm.final_score || 0),
        }),
      });
      setGradeForm({
        student_code: '',
        subject_name: '',
        midterm_score: '0',
        final_score: '0',
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

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <header className="border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-3">
          <div className="mr-3 flex items-center gap-3">
            <img src={synoLogo} alt="SYNO" className="h-12 w-auto" />
            <div>
              <h1 className="text-xl font-bold text-slate-950">SYNO Admin</h1>
              <p className="text-xs font-medium text-slate-500">Kết nối - Đồng bộ - Phát triển</p>
            </div>
          </div>
          <button
            onClick={loadStudents}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Tải danh sách học sinh
          </button>
          <span className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-medium text-slate-600">
            Trường {schoolId}
          </span>
          <div className="ml-auto flex items-center gap-3">
            <span className="text-sm text-slate-500">
              👤 <strong>{authUser.full_name || authUser.email}</strong>
              <span className="ml-2 rounded-full bg-blue-100 px-2 py-0.5 text-xs font-semibold text-blue-700">{roleLabel(authUser.role)}</span>
            </span>
            <button
              onClick={onLogout}
              className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100"
            >
              Đăng xuất
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 grid gap-3 md:grid-cols-4">
          {adminStats.map(([label, value]) => (
            <div key={label} className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
              <div className="text-xs font-semibold uppercase text-slate-500">{label}</div>
              <div className="mt-1 text-xl font-bold text-slate-950">{value}</div>
            </div>
          ))}
        </div>

        <div className="mb-4 flex flex-wrap gap-2">
          {[
            ['students', 'Quản lý Học sinh'],
            ['provision', 'Cấp tài khoản Phụ huynh'],
            ['parents', `Danh sách Phụ huynh (${parents.length})`],
            ['timetable', 'Thời khóa biểu (Mon-Sat)'],
            ['fees', 'Học phí & Thu phí'],
            ['announcements', 'Thông báo'],
            ['grades', 'Bảng điểm'],
            ['attendance', 'Điểm danh'],
            ['device', 'Giả lập Quẹt thẻ'],
          ].map(([value, label]) => (
            <button
              key={value}
              onClick={() => setTab(value)}
              className={`rounded-lg px-4 py-2 text-sm font-medium ${
                tab === value
                  ? 'bg-blue-600 text-white'
                  : 'bg-white text-slate-700 ring-1 ring-slate-200'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {message ? (
          <div className="mb-4 rounded-lg bg-amber-50 px-4 py-3 text-sm text-amber-700">
            {message}
          </div>
        ) : null}


        {tab === 'students' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Danh sách học sinh</h2>
            <form onSubmit={editingStudentId ? updateStudent : createStudent} className="mb-4 grid gap-2 md:grid-cols-4">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mã học sinh"
                value={studentForm.student_code}
                disabled={Boolean(editingStudentId)}
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
              <p className="mb-2 text-sm font-semibold text-blue-800">📥 Import từ Excel</p>
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
                    {importLoading ? '⏳ Đang import...' : `⬆️ Import ${importPreview.length} học sinh`}
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

            {/* ── Tìm kiếm học sinh ── */}
            <div className="mb-3 flex items-center gap-2">
              <input
                className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="🔍 Tìm theo mã, họ tên hoặc lớp..."
                value={studentSearch}
                onChange={(e) => setStudentSearch(e.target.value)}
              />
              {studentSearch && (
                <button
                  type="button"
                  onClick={() => setStudentSearch('')}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm text-slate-600"
                >
                  Xóa
                </button>
              )}
              <span className="text-sm text-slate-400">
                {filteredStudents.length}/{students.length}
              </span>
            </div>

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
                  {filteredStudents.map((student) => (
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
            {!loading && filteredStudents.length === 0 ? <EmptyState message="Chưa có học sinh phù hợp với bộ lọc." /> : null}
          </section>
        ) : null}

        {tab === 'timetable' && (
          <div className="mt-4 rounded-lg border border-dashed border-emerald-300 bg-emerald-50 p-4">
            <p className="mb-2 text-sm font-semibold text-emerald-800">📥 Import TKB từ Excel</p>
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
                  {ttImportLoading ? '⏳ Đang import...' : `⬆️ Import ${ttImportPreview.length} tiết`}
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
        )}

        {tab === 'provision' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Tạo tài khoản phụ huynh</h2>
            
            <div className="mb-3 grid gap-2 md:grid-cols-2">
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={selectedStudentId}
                onChange={(e) => setSelectedStudentId(e.target.value)}
              >
                <option value="">Chọn học sinh</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.student_code} - {student.full_name}
                  </option>
                ))}
              </select>
              
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Họ tên phụ huynh (tùy chọn)"
                value={parentForm.parent_name}
                onChange={(e) => setParentForm(prev => ({ ...prev, parent_name: e.target.value }))}
              />
              
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Email (tùy chọn, mặc định: parent.{student_code}@school.local)"
                type="email"
                value={parentForm.parent_email}
                onChange={(e) => setParentForm(prev => ({ ...prev, parent_email: e.target.value }))}
              />
              
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Số điện thoại (tùy chọn)"
                value={parentForm.parent_phone}
                onChange={(e) => setParentForm(prev => ({ ...prev, parent_phone: e.target.value }))}
              />
              
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mật khẩu (tùy chọn, mặc định: Parent@{student_code})"
                type="password"
                value={parentForm.password}
                onChange={(e) => setParentForm(prev => ({ ...prev, password: e.target.value }))}
              />
            </div>
            
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
              </div>
            ) : null}
          </section>
        ) : null}

        {tab === 'parents' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Danh sách tài khoản phụ huynh</h2>
            <button
              onClick={loadParents}
              className="mb-3 rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Tải danh sách
            </button>
            
            {parents.length === 0 ? (
              <p className="text-slate-500">Chưa có tài khoản phụ huynh nào.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead>
                    <tr className="border-b text-slate-500">
                      <th className="py-2">Họ tên</th>
                      <th className="py-2">Email</th>
                      <th className="py-2">Số điện thoại</th>
                      <th className="py-2">Học sinh liên kết</th>
                    </tr>
                  </thead>
                  <tbody>
                    {parents.map((parent) => (
                      <tr key={parent.id} className="border-b">
                        <td className="py-2">{parent.full_name || '-'}</td>
                        <td className="py-2">{parent.email}</td>
                        <td className="py-2">{parent.phone || '-'}</td>
                        <td className="py-2">{parent.student_name} ({parent.student_code})</td>
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
            <h2 className="mb-3 text-lg font-semibold">Quản lý thời khóa biểu (Thứ 2 - Thứ 7)</h2>
            <form onSubmit={editingTimetableId ? updateTimetable : createTimetable} className="mb-4 grid gap-2 md:grid-cols-4">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Lớp (VD: 10A1)"
                value={timetableForm.class_id}
                onChange={(e) =>
                  setTimetableForm((prev) => ({ ...prev, class_id: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Môn học"
                value={timetableForm.subject_name}
                onChange={(e) =>
                  setTimetableForm((prev) => ({ ...prev, subject_name: e.target.value }))
                }
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={timetableForm.day_of_week}
                onChange={(e) =>
                  setTimetableForm((prev) => ({ ...prev, day_of_week: Number(e.target.value) }))
                }
              >
                {[1, 2, 3, 4, 5, 6].map((d) => (
                  <option key={d} value={d}>{`Thứ ${d + 1}`}</option>
                ))}
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tiết học (VD: Tiết 1)"
                value={timetableForm.period}
                onChange={(e) =>
                  setTimetableForm((prev) => ({ ...prev, period: e.target.value }))
                }
              />
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
                {editingTimetableId ? 'Cập nhật thời khóa biểu' : 'Thêm thời khóa biểu'}
              </button>
              {editingTimetableId ? (
                <button
                  type="button"
                  onClick={cancelEditTimetable}
                  className="rounded-lg bg-slate-200 px-3 py-2 text-sm font-semibold text-slate-700"
                >
                  Hủy sửa
                </button>
              ) : null}
            </form>
            <ModuleSearch
              value={timetableSearch}
              onChange={setTimetableSearch}
              placeholder="Tìm theo lớp, môn học, giáo viên, phòng..."
              count={filteredTimetables.length}
              total={timetables.length}
            />
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-slate-500">
                    <th className="py-2">Lớp</th>
                    <th className="py-2">Môn</th>
                    <th className="py-2">Thứ</th>
                    <th className="py-2">Tiết</th>
                    <th className="py-2">Giờ</th>
                    <th className="py-2">GV/Phòng</th>
                    <th className="py-2">Thao tác</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredTimetables.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2">{t.class_id}</td>
                      <td className="py-2">{t.subject_name}</td>
                      <td className="py-2">{dayLabel(t.day_of_week)}</td>
                      <td className="py-2">{t.period || '-'}</td>
                      <td className="py-2">{`${String(t.start_time).slice(0, 5)}-${String(t.end_time).slice(0, 5)}`}</td>
                      <td className="py-2">{`${t.teacher_name || '-'} / ${t.room || '-'}`}</td>
                      <td className="py-2">
                        <div className="flex gap-2">
                          <button
                            onClick={() => startEditTimetable(t)}
                            className="rounded bg-amber-100 px-2 py-1 text-amber-700"
                          >
                            Sửa
                          </button>
                          <button
                            onClick={() => deleteTimetable(t.id)}
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
            {filteredTimetables.length === 0 ? <EmptyState message="Chưa có tiết học phù hợp với bộ lọc." /> : null}
          </section>
        ) : null}

        {tab === 'fees' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Quản lý học phí / khoản thu</h2>
            <form onSubmit={editingFeeId ? updateFee : createFee} className="mb-4 grid gap-2 md:grid-cols-3">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mã học sinh"
                value={feeForm.student_code}
                onChange={(e) =>
                  setFeeForm((prev) => ({ ...prev, student_code: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Lớp"
                value={feeForm.class_id}
                onChange={(e) =>
                  setFeeForm((prev) => ({ ...prev, class_id: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tổng tiền"
                value={feeForm.total_amount}
                onChange={(e) =>
                  setFeeForm((prev) => ({ ...prev, total_amount: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-3"
                placeholder='Subject fees JSON, vd {"toan":300000,"anh":200000}'
                value={feeForm.subject_fees_text}
                onChange={(e) =>
                  setFeeForm((prev) => ({ ...prev, subject_fees_text: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm md:col-span-3"
                placeholder='Other fees JSON, vd {"ban_tru":200000}'
                value={feeForm.other_fees_text}
                onChange={(e) =>
                  setFeeForm((prev) => ({ ...prev, other_fees_text: e.target.value }))
                }
              />
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={feeForm.payment_status}
                onChange={(e) =>
                  setFeeForm((prev) => ({ ...prev, payment_status: e.target.value }))
                }
              >
                <option value="unpaid">Chưa thanh toán</option>
                <option value="partial">Thanh toán một phần</option>
                <option value="paid">Đã thanh toán</option>
              </select>
              <select
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                value={feeForm.payment_method}
                onChange={(e) =>
                  setFeeForm((prev) => ({ ...prev, payment_method: e.target.value }))
                }
              >
                <option value="">-- Phương thức --</option>
                <option value="online">Online</option>
                <option value="cash">Cash</option>
              </select>
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                type="datetime-local"
                value={feeForm.paid_at}
                onChange={(e) =>
                  setFeeForm((prev) => ({ ...prev, paid_at: e.target.value }))
                }
              />
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
            <ModuleSearch
              value={feeSearch}
              onChange={setFeeSearch}
              placeholder="Tìm theo mã học sinh, lớp, trạng thái, phương thức..."
              count={filteredFees.length}
              total={fees.length}
            />
            <div className="space-y-2">
              {filteredFees.map((f) => (
                <div key={f.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{f.student_code}</strong> • {f.class_id || '-'} •{' '}
                      <span>{formatCurrency(f.total_amount)}</span>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => startEditFee(f)}
                        className="rounded bg-amber-100 px-2 py-1 text-amber-700"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => deleteFee(f.id)}
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
                </div>
              ))}
            </div>
            {filteredFees.length === 0 ? <EmptyState message="Chưa có khoản phí phù hợp với bộ lọc." /> : null}

            {/* ── Excel Import fees ── */}
            <div className="mt-4 rounded-lg border border-dashed border-orange-300 bg-orange-50 p-4">
              <p className="mb-2 text-sm font-semibold text-orange-800">📥 Import học phí từ Excel</p>
              <p className="mb-3 text-xs text-orange-700">
                Cần cột: <strong>mã học sinh</strong>, <strong>tổng tiền</strong>, <strong>trạng thái</strong> (unpaid/partial/paid), phương thức (online/cash)
              </p>
              <div className="flex flex-wrap items-center gap-3">
                <input ref={feeFileRef} type="file" accept=".xlsx,.xls,.csv" className="hidden" onChange={handleFeesExcelFile} />
                <button type="button" onClick={() => feeFileRef.current?.click()}
                  className="rounded-lg bg-orange-600 px-4 py-2 text-sm font-semibold text-white">📂 Chọn file Excel</button>
                {feeImportPreview.length > 0 && (
                  <button type="button" onClick={submitFeesImport} disabled={feeImportLoading}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-semibold text-white disabled:bg-slate-400">
                    {feeImportLoading ? '⏳ Đang import...' : `⬆️ Import ${feeImportPreview.length} khoản phí`}
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
            <h2 className="mb-3 text-lg font-semibold">Thông báo trường học</h2>
            <form onSubmit={createAnnouncement} className="mb-4 grid gap-2">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Tiêu đề thông báo"
                value={announcementForm.title}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({ ...prev, title: e.target.value }))
                }
              />
              <textarea
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Nội dung thông báo"
                rows={4}
                value={announcementForm.content}
                onChange={(e) =>
                  setAnnouncementForm((prev) => ({ ...prev, content: e.target.value }))
                }
              />
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={announcementForm.is_general}
                  onChange={(e) =>
                    setAnnouncementForm((prev) => ({ ...prev, is_general: e.target.checked }))
                  }
                />
                Thông báo chung toàn trường
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
                    <strong>{item.title}</strong>
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

        {tab === 'grades' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Bảng điểm học sinh</h2>
            <form onSubmit={createGrade} className="mb-4 grid gap-2 md:grid-cols-4">
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Mã học sinh"
                value={gradeForm.student_code}
                onChange={(e) =>
                  setGradeForm((prev) => ({ ...prev, student_code: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Môn học"
                value={gradeForm.subject_name}
                onChange={(e) =>
                  setGradeForm((prev) => ({ ...prev, subject_name: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Giữa kỳ"
                value={gradeForm.midterm_score}
                onChange={(e) =>
                  setGradeForm((prev) => ({ ...prev, midterm_score: e.target.value }))
                }
              />
              <input
                className="rounded-lg border border-slate-300 px-3 py-2 text-sm"
                placeholder="Cuối kỳ"
                value={gradeForm.final_score}
                onChange={(e) =>
                  setGradeForm((prev) => ({ ...prev, final_score: e.target.value }))
                }
              />
              <button className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold text-white">
                Thêm điểm
              </button>
            </form>
            <ModuleSearch
              value={gradeSearch}
              onChange={setGradeSearch}
              placeholder="Tìm theo mã học sinh, môn học, học kỳ..."
              count={filteredGrades.length}
              total={grades.length}
            />
            <div className="space-y-2">
              {filteredGrades.map((item) => (
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
            {filteredGrades.length === 0 ? <EmptyState message="Chưa có bảng điểm phù hợp với bộ lọc." /> : null}

            {/* ── Excel Import grades ── */}
            <div className="mt-4 rounded-lg border border-dashed border-indigo-300 bg-indigo-50 p-4">
              <p className="mb-2 text-sm font-semibold text-indigo-800">📥 Import bảng điểm từ Excel</p>
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
                    {gradeImportLoading ? '⏳ Đang import...' : `⬆️ Import ${gradeImportPreview.length} bản ghi`}
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

        {tab === 'attendance' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-4 flex flex-wrap items-end gap-3">
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
                  {attendanceLogs.map((log) => (
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

        {tab === 'device' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Giả lập thiết bị quẹt thẻ</h2>
            <p className="mb-3 text-sm text-slate-500">
              Chọn học sinh và nhấn nút để giả lập quẹt thẻ check_in vào hệ thống.
            </p>
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
                Giả lập quẹt thẻ
              </button>
            </div>
          </section>
        ) : null}
      </main>
    </div>
  );
}

// ─── App: Auth Gate ──────────────────────────────────────────────────────────
function App() {
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_KEY) || null);
  const [authUser, setAuthUser]   = useState(() => {
    try { return JSON.parse(localStorage.getItem(AUTH_USER_KEY) || 'null'); } catch { return null; }
  });

  function handleLogin(token, user) {
    setAuthToken(token);
    setAuthUser(user);
  }

  function handleLogout() {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    localStorage.removeItem(AUTH_USER_KEY);
    setAuthToken(null);
    setAuthUser(null);
  }

  if (!authToken || !authUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return <AppShell authToken={authToken} authUser={authUser} onLogout={handleLogout} />;
}

export default App;
