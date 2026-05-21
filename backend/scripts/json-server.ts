/**
 * Ronald Jack AI-X1 JSON Receiver
 * Máy chấm công push JSON đến đây
 * 
 * Cấu hình máy chấm công:
 * - IP Server: IP máy tính chạy script này
 * - Port Server: 5005
 * - Chức năng nối tiếp: Gửi JSON
 */

const http = require('http');
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const PORT = 5005;
const HOST = '0.0.0.0';

// Check env
if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

// Supabase
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const server = http.createServer((req, res) => {
  // Log tat ca request
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
  console.log('Headers:', JSON.stringify(req.headers));

  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  if (req.method !== 'POST') {
    res.writeHead(405, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: false, error: 'Method not allowed' }));
    return;
  }

  console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);

  let body = '';
  req.on('data', chunk => body += chunk);
  req.on('end', async () => {
    try {
      console.log(`[${new Date().toISOString()}] Raw body:`, body);
      
      const data = JSON.parse(body);
      console.log('Parsed:', data);

      const result = await processAttendance(data);

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, processed: result }));
    } catch (err) {
      console.error('[ERROR]', err.message);
      res.writeHead(400, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: err.message }));
    }
  });
});

async function processAttendance(data) {
  // Ronald Jack có thể gửi nhiều format khác nhau
  const maChamCong = data.enrollNumber || data.userId || data.id || data.pin;
  const timestamp = data.time || data.timestamp || data.scanTime || new Date().toISOString();
  
  if (!maChamCong) {
    console.log('[SKIP] Missing ID in data:', data);
    throw new Error('Missing enrollNumber/userId/pin');
  }

  console.log(`[PROCESS] ID=${maChamCong}, Time=${timestamp}`);

  // 1. Tìm student - thử nhiều cách
  let student = null;
  
  // Cách 1: Theo ma_cham_cong
  let result = await supabase
    .from('students')
    .select('id, student_code, full_name')
    .eq('ma_cham_cong', String(maChamCong))
    .eq('school_id', '1')
    .maybeSingle();
  
  if (result.data) student = result.data;
  
  // Cách 2: Theo student_code nếu không tìm thấy
  if (!student) {
    result = await supabase
      .from('students')
      .select('id, student_code, full_name')
      .eq('student_code', String(maChamCong))
      .eq('school_id', '1')
      .maybeSingle();
    
    if (result.data) student = result.data;
  }

  if (!student) {
    console.log(`[SKIP] Student not found: ${maChamCong}`);
    throw new Error(`Student not found: ${maChamCong}`);
  }

  console.log(`[FOUND] ${student.student_code} - ${student.full_name}`);

  // 2. Xác định Vào/Ra
  const logType = await determineInOut(student.id, timestamp);

  // 3. Insert
  const { error } = await supabase
    .from('attendance_logs')
    .insert({
      school_id: '1',
      student_id: student.id,
      scanned_at: timestamp,
      log_type: logType,
      status_detail: 'on_time'
    });

  if (error && error.code !== '23505') {
    throw new Error(error.message);
  }

  console.log(`[INSERTED] ${student.student_code} → ${logType}`);

  return {
    studentCode: student.student_code,
    studentName: student.full_name,
    logType: logType
  };
}

async function determineInOut(studentId, scannedAt) {
  const scanDate = new Date(scannedAt).toISOString().split('T')[0];
  
  const { data, error } = await supabase
    .from('attendance_logs')
    .select('log_type')
    .eq('student_id', studentId)
    .gte('scanned_at', `${scanDate}T00:00:00`)
    .lte('scanned_at', `${scanDate}T23:59:59`)
    .order('scanned_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (!data) return 'check_in';
  return data.log_type === 'check_in' ? 'check_out' : 'check_in';
}

server.listen(PORT, HOST, () => {
  console.log('========================================');
  console.log('Ronald Jack AI-X1 JSON Receiver');
  console.log('========================================');
  console.log(`Listening on http://${HOST}:${PORT}`);
  console.log('');
  console.log('Cấu hình máy chấm công:');
  console.log('  IP Server: 192.168.0.105 (IP máy này)');
  console.log('  Port Server: 5005');
  console.log('  Chức năng nối tiếp: Gửi JSON');
  console.log('========================================');
  console.log('Đợi data từ máy chấm công...');
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n[SHUTDOWN] Stopping server...');
  server.close(() => process.exit(0));
});
