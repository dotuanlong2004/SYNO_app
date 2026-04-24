import { useEffect, useMemo, useState } from 'react';

// Use Vite environment variables (VITE_ prefix required)
const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:3000/api/v1';
const DEFAULT_SCHOOL_ID = import.meta.env.VITE_DEFAULT_SCHOOL_ID || 'default_school';
const ADMIN_WEB_API = `${API_BASE}/admin-web`; // No auth required

function App() {
  const [tab, setTab] = useState('students');
  // Admin web không cần token - bypass authentication
  const [schoolId, setSchoolId] = useState(DEFAULT_SCHOOL_ID);
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

  // Load data khi mount component (không cần token)
  useEffect(() => {
    setLoading(true);
    setMessage('');
    
    Promise.all([
      requestJson(`${ADMIN_WEB_API}/students`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/timetables`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/fees`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/announcements`, { headers: adminHeaders }),
      requestJson(`${ADMIN_WEB_API}/grades`, { headers: adminHeaders })
    ])
      .then(([studentsJson, timetablesJson, feesJson, announcementsJson, gradesJson]) => {
        setStudents(studentsJson.data || []);
        setTimetables(timetablesJson.data || []);
        setFees(feesJson.data || []);
        setAnnouncements(announcementsJson.data || []);
        setGrades(gradesJson.data || []);
      })
      .catch((error) => {
        setMessage(error.message);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [schoolId]);

  const adminHeaders = useMemo(
    () => ({
      'Content-Type': 'application/json',
      'x-school-id': schoolId,
    }),
    [schoolId],
  );

  async function requestJson(url, options = {}) {
    const response = await fetch(url, options);
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

  function ensureToken() {
    // Admin web bypass authentication - full access
    return true;
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
    setMessage('');
    try {
      const json = await requestJson(`${ADMIN_WEB_API}/mock-scan`, {
        method: 'POST',
        headers: adminHeaders,
        body: JSON.stringify({ student_code: studentCode }),
      });
      setMessage(`Giả lập quẹt thẻ thành công: ${json.student_code} -> ${json.log_type}`);
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
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-4 py-4">
          <h1 className="mr-3 text-xl font-bold">Danh sách học sinh</h1>
          <button
            onClick={loadStudents}
            className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Tải danh sách học sinh
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-6">
        <div className="mb-4 flex gap-2">
          {[
            ['students', 'Quản lý Học sinh'],
            ['provision', 'Cấp tài khoản Phụ huynh'],
            ['parents', `Danh sách Phụ huynh (${parents.length})`],
            ['timetable', 'Thời khóa biểu (Mon-Sat)'],
            ['fees', 'Học phí & Thu phí'],
            ['announcements', 'Thông báo'],
            ['grades', 'Bảng điểm'],
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

            {loading ? <p>Đang tải dữ liệu...</p> : null}
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
                  {students.map((student) => (
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
          </section>
        ) : null}

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
                  {timetables.map((t) => (
                    <tr key={t.id} className="border-b">
                      <td className="py-2">{t.class_id}</td>
                      <td className="py-2">{t.subject_name}</td>
                      <td className="py-2">{`Thứ ${Number(t.day_of_week) + 1}`}</td>
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
            <div className="space-y-2">
              {fees.map((f) => (
                <div key={f.id} className="rounded-lg border border-slate-200 p-3 text-sm">
                  <div className="flex items-center justify-between">
                    <div>
                      <strong>{f.student_code}</strong> • {f.class_id || '-'} •{' '}
                      <span>{Number(f.total_amount).toLocaleString('vi-VN')} đ</span>
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
                  <div className="text-slate-600">
                    Trạng thái: {f.payment_status} | Phương thức: {f.payment_method || '-'} | Thời gian: {f.paid_at || '-'}
                  </div>
                </div>
              ))}
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
            <div className="space-y-2">
              {announcements.map((item) => (
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
            <div className="space-y-2">
              {grades.map((item) => (
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
          </section>
        ) : null}

        {tab === 'device' ? (
          <section className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <h2 className="mb-3 text-lg font-semibold">Giả lập thiết bị quẹt thẻ</h2>
            <p className="mb-3 text-sm text-slate-500">
              Nhấn nút để giả lập quẹt thẻ điểm danh cho học sinh HS001.
            </p>
            <button
              onClick={() => mockScan('HS001')}
              className="rounded-lg bg-purple-600 px-4 py-2 text-sm font-semibold text-white"
            >
              Giả lập quẹt thẻ Học sinh A (HS001)
            </button>
          </section>
        ) : null}
      </main>
    </div>
  );
}

export default App;

// Push test
