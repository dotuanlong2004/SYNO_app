/**
 * Ronald Jack AI-X1 - ADMS Server
 * Nhận dữ liệu chấm công theo chuẩn ZKTeco ADMS protocol
 *
 * Máy chấm công sẽ POST log lên: POST /iclock/cdata
 * Máy hỏi heartbeat: GET /iclock/getrequest
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const PORT     = Number(process.env.ADMS_PORT || 5005);
const SCHOOL_ID = process.env.SCHOOL_ID || '1';

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const recentInserts = new Map(); // debounce

// ============================================================
// GET STUDENT
// ============================================================
async function getStudent(enrollId) {
  const { data } = await supabase
    .from('students')
    .select('id, ho_ten, lop_id, school_id')
    .eq('ma_cham_cong', String(enrollId))
    .eq('school_id', SCHOOL_ID)
    .single();
  return data || null;
}

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
// PARSE ADMS cdata body
// Format: dòng mỗi record, tab-separated hoặc space-separated
// VD: "1\t2026-04-29 10:32:33\t8\t0\t1\t..."
// Hoặc JSON array
// ============================================================
function parseCdata(body) {
  const records = [];

  // Thử JSON trước
  try {
    const json = JSON.parse(body);
    if (Array.isArray(json)) return json;
    if (json.record) return json.record;
  } catch (_) {}

  // Parse text format: mỗi dòng là 1 record
  // Format: PIN\tDateTime\tStatus\tVerify\tWorkCode\t...
  const lines = body.trim().split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;

    // Bỏ qua header lines
    if (trimmed.startsWith('GET') || trimmed.startsWith('POST') ||
        trimmed.startsWith('Stamp=') || trimmed.startsWith('SN=') ||
        trimmed.startsWith('REPLY') || trimmed.startsWith('Table=')) {
      // Lấy giá trị SN nếu có
      continue;
    }

    const parts = trimmed.split('\t');
    if (parts.length >= 2) {
      records.push({
        enrollid: parts[0],
        time: parts[1],
        status: parts[2] || '',
        verify: parts[3] || '',
      });
    }
  }
  return records;
}

// ============================================================
// PROCESS RECORD
// ============================================================
async function processRecord(record) {
  const enrollId = String(record.enrollid || record.PIN || record.pin || '').trim();
  const timeStr  = String(record.time || record.Time || '').trim();

  if (!enrollId || !timeStr) return;

  const scanTime = new Date(timeStr.replace(/\//g, '-'));
  if (isNaN(scanTime.getTime())) {
    console.warn('[SKIP] Thời gian không hợp lệ:', timeStr);
    return;
  }

  // Debounce 1 phút
  const minuteKey = `${enrollId}_${scanTime.getFullYear()}${scanTime.getMonth()}${scanTime.getDate()}${scanTime.getHours()}${scanTime.getMinutes()}`;
  if (recentInserts.has(minuteKey)) {
    console.log(`[DEBOUNCE] ${enrollId} @ ${timeStr}`);
    return;
  }
  recentInserts.set(minuteKey, true);
  setTimeout(() => recentInserts.delete(minuteKey), 60000);

  const student = await getStudent(enrollId);
  if (!student) {
    console.warn(`[SKIP] Không tìm thấy student ma_cham_cong=${enrollId}`);
    return;
  }

  const lastType = await getLastAttendanceType(student.id);
  const loaiQuet = (lastType === 'check_in') ? 'check_out' : 'check_in';

  const { error } = await supabase.from('attendance_logs').insert({
    student_id:     student.id,
    school_id:      SCHOOL_ID,
    thoi_gian_quet: scanTime.toISOString(),
    loai_quet:      loaiQuet,
    phuong_thuc:    'face',
    ma_cham_cong:   enrollId,
  });

  if (error) {
    console.error(`[ERROR] Insert thất bại ${enrollId}:`, error.message);
  } else {
    console.log(`[OK] ${student.ho_ten} (${enrollId}) → ${loaiQuet} @ ${timeStr}`);
  }
}

// ============================================================
// HTTP SERVER
// ============================================================
const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  // Heartbeat - máy hỏi có lệnh gì không
  if (req.method === 'GET' && url === '/iclock/getrequest') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
    return;
  }

  // Máy gửi thông tin thiết bị
  if (req.method === 'POST' && url === '/iclock/deviceinfo') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', () => {
      console.log('[DEVICE INFO]', body.substring(0, 300));
      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');
    });
    return;
  }

  // Máy đẩy log chấm công
  if (req.method === 'POST' && url === '/iclock/cdata') {
    let body = '';
    req.on('data', c => body += c);
    req.on('end', async () => {
      console.log('[CDATA RAW]', body.substring(0, 500));

      res.writeHead(200, { 'Content-Type': 'text/plain' });
      res.end('OK');

      const records = parseCdata(body);
      console.log(`[CDATA] Nhận ${records.length} record`);
      for (const rec of records) {
        await processRecord(rec);
      }
    });
    return;
  }

  // Các request khác - log và trả OK để máy không retry vô hạn
  let body = '';
  req.on('data', c => body += c);
  req.on('end', () => {
    if (body) console.log('[UNKNOWN BODY]', body.substring(0, 300));
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    res.end('OK');
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log('='.repeat(50));
  console.log('  Ronald Jack AI-X1 - ADMS Server');
  console.log('='.repeat(50));
  console.log(`  Listening : http://0.0.0.0:${PORT}`);
  console.log(`  Supabase  : ${process.env.SUPABASE_URL}`);
  console.log(`  School    : ${SCHOOL_ID}`);
  console.log('='.repeat(50));
  console.log('  Cau hinh may cham cong:');
  console.log('    Menu → Comm → Cloud Server Setting');
  console.log(`    Server Address: http://192.168.0.106:${PORT}`);
  console.log('    Server Mode   : ADMS');
  console.log('='.repeat(50));
  console.log('Dang cho may cham cong ket noi...');
});

server.on('error', (err) => {
  console.error('[SERVER ERROR]', err.message);
  process.exit(1);
});
