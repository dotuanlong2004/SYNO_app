// @ts-nocheck
/**
 * Ronald Jack AI-X1 Collector (Node.js)
 * Migration từ MITA Pro → SDK Tự Chủ
 * 
 * Thiết bị: Ronald Jack AI-X1 (IP: 10.1.1.119)
 * Windows Server: 10.1.0.233
 * VPS PostgreSQL: 63.250.53.83
 * SDK: zkemkeeper.dll (TCP protocol)
 * Logic trigger: Node.js tái hiện từ trg_Insert_CheckInOut
 */

const ZKLib = require('zkteco-js');
const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

// ==================== CONFIG ====================
const CONFIG = {
  deviceIp: process.env.ZK_DEVICE_IP || '192.168.0.225',
  devicePort: parseInt(process.env.ZK_DEVICE_PORT) || 4370,
  
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  
  schoolId: process.env.SCHOOL_ID || '1',
  
  // Logic trigger MITA
  debounceMinutes: 10,        // Chặn quẹt < 10 phút
  pollIntervalMs: 5000,       // Poll mỗi 5 giây
  timezone: 'Asia/Ho_Chi_Minh'
};

// ==================== SUPABASE ====================
if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
  console.error('[FATAL] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

// ==================== LOGIC TRIGGER MITA ====================

/**
 * Logic trigger: Xác định Vào/Ra + chặn quẹt liên tiếp
 * Tái hiện từ: trg_Insert_CheckInOut_To_NhanVienChamCong
 */
class MitaTriggerLogic {
  constructor() {
    this.lastScans = new Map(); // Cache lần quẹt cuối
  }

  /**
   * 1. JOIN với students để lấy thông tin
   * 2. Xác định Vào/Ra
   * 3. Chặn nếu < 10 phút
   */
  async processScan(maChamCong, scannedAt) {
    // 1. JOIN với students (MaChamCong = EnrollNumber trên máy)
    const student = await this.getStudentByMaChamCong(maChamCong);
    if (!student) {
      return { ok: false, reason: 'Student not found', studentCode: maChamCong };
    }

    // 2. Chặn quẹt liên tiếp < 10 phút
    const lastScan = this.lastScans.get(maChamCong);
    const now = new Date(scannedAt);
    if (lastScan) {
      const diffMinutes = (now - lastScan) / 60000;
      if (diffMinutes < CONFIG.debounceMinutes) {
        return { 
          ok: false, 
          reason: `Debounced: ${diffMinutes.toFixed(1)}min < ${CONFIG.debounceMinutes}min`,
          studentCode: student.student_code
        };
      }
    }
    this.lastScans.set(maChamCong, now);

    // 3. Xác định Vào/Ra
    const logType = await this.determineInOut(student.id, scannedAt);

    return {
      ok: true,
      studentId: student.id,
      studentCode: student.student_code,
      studentName: student.full_name,
      className: student.class_name,
      logType: logType,
      scannedAt: scannedAt
    };
  }

  async getStudentByMaChamCong(maChamCong) {
    try {
      // Trước tiên thử tìm theo ma_cham_cong
      const { data, error } = await supabase
        .from('students')
        .select('id, student_code, full_name, class_name, ma_cham_cong')
        .eq('ma_cham_cong', String(maChamCong))
        .eq('school_id', CONFIG.schoolId)
        .maybeSingle();
      
      if (error) throw error;
      if (data) return data;

      // Nếu không có, thử tìm theo student_code (fallback)
      const { data: data2, error: error2 } = await supabase
        .from('students')
        .select('id, student_code, full_name, class_name, ma_cham_cong')
        .eq('student_code', String(maChamCong))
        .eq('school_id', CONFIG.schoolId)
        .maybeSingle();
      
      if (error2) throw error2;
      return data2 || null;
    } catch (err) {
      console.error('[DB] getStudent error:', err.message);
      return null;
    }
  }

  /**
   * Logic xác định Vào/Ra:
   * - Nếu chưa có bản ghi nào trong ngày → 'Vào' (check_in)
   * - Nếu bản ghi cuối là 'Vào' → 'Ra' (check_out)
   * - Nếu bản ghi cuối là 'Ra' → 'Vào'
   */
  async determineInOut(studentId, scannedAt) {
    try {
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
      
      if (error) throw error;
      if (!data) return 'check_in';  // Lần đầu trong ngày
      
      // Đảo chiều
      return data.log_type === 'check_in' ? 'check_out' : 'check_in';
    } catch (err) {
      console.error('[DB] determineInOut error:', err.message);
      return 'check_in';  // Default fallback
    }
  }
}

// ==================== COLLECTOR SERVICE ====================
class RonaldJackCollector {
  constructor() {
    this.zk = null;
    this.trigger = new MitaTriggerLogic();
    this.processed = new Set();
    this.stats = { total: 0, success: 0, skipped: 0, errors: 0 };
  }

  async start() {
    console.log('\n========================================');
    console.log('RONALD JACK AI-X1 COLLECTOR');
    console.log('MITA Pro → SDK Tự Chủ (Node.js)');
    console.log('========================================\n');
    console.log(`Device: ${CONFIG.deviceIp}:${CONFIG.devicePort}`);
    console.log(`Debounce: ${CONFIG.debounceMinutes} minutes`);
    console.log('Logic trigger: Vào/Ra + 10min chặn\n');

    // Kết nối
    if (!await this.connect()) {
      console.log('[RETRY] Connection failed, retrying in 10s...');
      setTimeout(() => this.start(), 10000);
      return;
    }

    // Bắt đầu polling
    this.pollLoop();
    setInterval(() => this.pollLoop(), CONFIG.pollIntervalMs);

    // Stats mỗi 30s
    setInterval(() => this.printStats(), 30000);

    console.log('[READY] Waiting for scans...\n');
  }

  async connect() {
    console.log(`[CONNECT] Trying ${CONFIG.deviceIp}:${CONFIG.devicePort}...`);
    
    this.zk = new ZKLib({
      ip: CONFIG.deviceIp,
      port: CONFIG.devicePort,
      timeout: 10000,
      inport: 5200
    });

    try {
      await this.zk.connect();
      console.log('[CONNECT] Ronald Jack AI-X1 connected');
      return true;
    } catch (err) {
      console.error('[CONNECT ERROR]', err.message || err);
      this.zk = null;
      return false;
    }
  }

  async pollLoop() {
    try {
      // Đọc log từ máy
      const logs = await this.zk.getAttendances();
      
      if (!logs?.data?.length) return;

      // Sắp xếp mới nhất trước
      const sorted = logs.data
        .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
        .slice(0, 20);  // Xử lý tối đa 20 log mới nhất

      for (const log of sorted) {
        const uid = `${log.userId}-${log.timestamp}`;
        if (this.processed.has(uid)) continue;
        this.processed.add(uid);

        // Giới hạn cache
        if (this.processed.size > 5000) {
          const first = this.processed.values().next().value;
          this.processed.delete(first);
        }

        // Bỏ qua log hệ thống
        if (!log.userId || log.userId === '0') continue;

        this.stats.total++;

        // Xử lý qua trigger logic
        const result = await this.trigger.processScan(
          log.userId, 
          new Date(log.timestamp)
        );

        if (!result.ok) {
          this.stats.skipped++;
          if (!result.reason?.includes('Debounced')) {
            console.log(`[SKIP] ${log.userId}: ${result.reason}`);
          }
          continue;
        }

        // Insert vào attendance_logs
        const inserted = await this.insertToSupabase(result);
        
        if (inserted) {
          this.stats.success++;
          console.log(`[OK] ${result.studentCode} ${result.studentName} → ${result.logType === 'check_in' ? 'VÀO' : 'RA'}`);
        } else {
          this.stats.errors++;
        }
      }
    } catch (err) {
      console.error('[POLL]', err.message);
      try { await this.zk.disconnect(); } catch (_) {}
      await this.connect();  // Reconnect
    }
  }

  async insertToSupabase(result) {
    try {
      const { error } = await supabase
        .from('attendance_logs')
        .insert({
          school_id: CONFIG.schoolId,
          student_id: result.studentId,
          scanned_at: result.scannedAt.toISOString(),
          log_type: result.logType,
          status_detail: 'on_time',  // TODO: Tính late_minutes
          created_at: new Date().toISOString()
        });

      if (error) {
        // Có thể là duplicate
        if (error.code === '23505') return true;  // Unique violation = đã có
        throw error;
      }
      return true;
    } catch (err) {
      console.error('[INSERT]', err.message);
      return false;
    }
  }

  printStats() {
    console.log(`\n[STATS] Total: ${this.stats.total} | Success: ${this.stats.success} | Skip: ${this.stats.skipped} | Error: ${this.stats.errors}`);
  }
}

// ==================== MAIN ====================
const collector = new RonaldJackCollector();
collector.start().catch(console.error);

process.on('SIGINT', async () => {
  console.log('\n[SHUTDOWN] Stopping collector...');
  process.exit(0);
});
