// @ts-nocheck
/**
 * Ronald Jack AI-X1 - API Poller
 * Poll trực tiếp API nội bộ máy chấm công, không cần SDK hay push mode
 *
 * API: POST http://<DEVICE_IP>/api
 * Body: { "password": "...", "cmd": "getRtLog", "index": <lastIndex> }
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

// ============================================================
// CONFIG
// ============================================================
const DEVICE_IP       = process.env.DEVICE_IP   || '192.168.0.225';
const DEVICE_PORT     = Number(process.env.DEVICE_PORT || 80);
const DEVICE_PASSWORD = process.env.DEVICE_PASSWORD || '';
const POLL_INTERVAL   = Number(process.env.POLL_INTERVAL_MS || 5000); // 5 giây
const SCHOOL_ID       = process.env.SCHOOL_ID   || '1';

if (!DEVICE_PASSWORD) {
  console.error('[FATAL] Missing DEVICE_PASSWORD in environment');
  process.exit(1);
}

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// ============================================================
// STATE
// ============================================================
let lastIndex = 0; // index cuoi da xu ly
const recentInserts = new Map(); // debounce: key = enrollId+minute

// ============================================================
// CALL DEVICE API
// ============================================================
function callDeviceApi(cmd, extra = {}) {
  return new Promise((resolve, reject) => {
    const body = JSON.stringify({ password: DEVICE_PASSWORD, cmd, ...extra });

    const options = {
      hostname: DEVICE_IP,
      port: DEVICE_PORT,
      path: '/api',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'Cookie': `pwd=${DEVICE_PASSWORD}; lang=Vietnamese`,
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `http://${DEVICE_IP}/rtlogview.html`,
      },
      timeout: 20000,
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(new Error('Invalid JSON response: ' + data.substring(0, 200)));
        }
      });
    });

    req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

// ============================================================
// GET STUDENT BY ENROLL NUMBER
// ============================================================
async function getStudent(enrollId) {
  const { data, error } = await supabase
    .from('students')
    .select('id, ho_ten, lop_id, school_id')
    .eq('ma_cham_cong', String(enrollId))
    .eq('school_id', SCHOOL_ID)
    .single();

  if (error || !data) return null;
  return data;
}

// ============================================================
// DETERMINE CHECK-IN / CHECK-OUT (MITA logic)
// ============================================================
async function getLastAttendanceType(studentId) {
  const { data } = await supabase
    .from('attendance_logs')
    .select('loai_quet')
    .eq('student_id', studentId)
    .eq('school_id', SCHOOL_ID)
    .order('thoi_gian_quet', { ascending: false })
    .limit(1)
    .single();

  return data ? data.loai_quet : null;
}

// ============================================================
// PROCESS MỘT RECORD TỪ THIẾT BỊ
// ============================================================
async function processRecord(record) {
  const enrollId = String(record.enrollid || '').trim();
  const timeStr  = record.time || '';

  if (!enrollId || !timeStr) {
    console.warn('[SKIP] Record thiếu enrollid hoặc time:', record);
    return;
  }

  // Parse thời gian: "2026-04-29 10:32:33" hoặc "2026/04/29 10:32:33"
  const scanTime = new Date(timeStr.replace(/\//g, '-'));
  if (isNaN(scanTime.getTime())) {
    console.warn('[SKIP] Time không hợp lệ:', timeStr);
    return;
  }

  // Debounce: bỏ qua nếu cùng người quét trong cùng 1 phút
  const minuteKey = `${enrollId}_${scanTime.getFullYear()}${scanTime.getMonth()}${scanTime.getDate()}${scanTime.getHours()}${scanTime.getMinutes()}`;
  if (recentInserts.has(minuteKey)) {
    console.log(`[DEBOUNCE] ${enrollId} @ ${timeStr} - bỏ qua`);
    return;
  }
  recentInserts.set(minuteKey, true);
  setTimeout(() => recentInserts.delete(minuteKey), 60000);

  // Tìm student
  const student = await getStudent(enrollId);
  if (!student) {
    console.warn(`[SKIP] Không tìm thấy student với ma_cham_cong=${enrollId}`);
    return;
  }

  // MITA logic: xác định check-in / check-out
  const lastType = await getLastAttendanceType(student.id);
  const loaiQuet = (lastType === 'check_in') ? 'check_out' : 'check_in';

  // Insert vào Supabase
  const { error } = await supabase.from('attendance_logs').insert({
    student_id:    student.id,
    school_id:     SCHOOL_ID,
    thoi_gian_quet: scanTime.toISOString(),
    loai_quet:     loaiQuet,
    phuong_thuc:   'face',
    ma_cham_cong:  enrollId,
  });

  if (error) {
    console.error(`[ERROR] Insert thất bại cho ${enrollId}:`, error.message);
  } else {
    console.log(`[OK] ${student.ho_ten} (${enrollId}) → ${loaiQuet} @ ${timeStr}`);
  }
}

// ============================================================
// POLL LOOP
// ============================================================
async function poll() {
  try {
    const res = await callDeviceApi('getrtlog', { index: lastIndex });

    if (!res || !res.result) {
      console.warn('[POLL] API trả kết quả lỗi:', res);
      return;
    }

    const records = res.record || [];
    const count   = Number(res.count || 0);
    const newTo   = Number(res.to || lastIndex);

    if (count > 0) {
      console.log(`[POLL] Nhận ${count} record mới (index ${lastIndex} → ${newTo})`);
      for (const rec of records) {
        await processRecord(rec);
      }
      lastIndex = newTo;
    }
  } catch (err) {
    console.error('[POLL ERROR]', err.message);
  }
}

// ============================================================
// MAIN
// ============================================================
async function main() {
  console.log('='.repeat(50));
  console.log('  Ronald Jack AI-X1 - API Poller');
  console.log('='.repeat(50));
  console.log(`  Device : http://${DEVICE_IP}:${DEVICE_PORT}/api`);
  console.log(`  Supabase: ${process.env.SUPABASE_URL}`);
  console.log(`  School : ${SCHOOL_ID}`);
  console.log(`  Interval: ${POLL_INTERVAL}ms`);
  console.log('='.repeat(50));

  // Test kết nối lần đầu
  try {
    const info = await callDeviceApi('getDeviceInfo', {});
    console.log('[CONNECT] Kết nối thành công:', info.sn || JSON.stringify(info));
  } catch (err) {
    console.error('[CONNECT] Không kết nối được device:', err.message);
    console.error('  Kiểm tra: IP đúng? Device đang bật?');
    process.exit(1);
  }

  // Lay index hien tai de bo qua log cu, chi lay log moi
  console.log('[INIT] Lay index hien tai de bo qua log cu...');
  try {
    const initRes = await callDeviceApi('getrtlog', { index: 0 });
    if (initRes && initRes.result !== false) {
      lastIndex = Number(initRes.to || 0);
      console.log(`[INIT] Bo qua ${lastIndex} log cu, chi lay log moi tu day.`);
    }
  } catch (e) {
    console.warn('[INIT] Khong lay duoc index hien tai, bat dau tu 0:', e.message);
  }

  console.log('[START] Bắt đầu poll...');
  setInterval(poll, POLL_INTERVAL);
}

main();
