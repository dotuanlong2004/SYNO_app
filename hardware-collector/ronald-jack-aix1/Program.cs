using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Reflection;
using System.Runtime.InteropServices;
using FPClockLib;

class Program
{
    // ─── Cấu hình ────────────────────────────────────────────────────────────
    const string DEVICE_IP       = "192.168.0.225";
    const int    DEVICE_PORT     = 4370;
    const int    MACHINE_NUMBER  = 1;
    const string SCHOOL_ID       = "default_school";
    const string BACKEND_URL     = "http://localhost:3000/api/v1/hardware/scan";
    const string SUPABASE_URL    = "https://bimepdqcwpsynjimvenn.supabase.co";
    const string SUPABASE_ANON   = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJpbWVwZHFjd3BzeW5qaW12ZW5uIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYzNTc0MDAsImV4cCI6MjA5MTkzMzQwMH0.RQ-ah70YpiAIDpEhaSqnY0bj2ShcMxwDUPLAdncLnGg";
    const int    POLL_MS         = 3000;
    // ─────────────────────────────────────────────────────────────────────────

    static readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

    [STAThread]
    static void Main()
    {
        Console.OutputEncoding = Encoding.UTF8;
        Console.WriteLine("════════════════════════════════════════════════════════");
        Console.WriteLine("  RONALD JACK AI-X1 — COM SDK Collector");
        Console.WriteLine($"  Thiết bị: {DEVICE_IP}:{DEVICE_PORT}  |  School: {SCHOOL_ID}");
        Console.WriteLine("════════════════════════════════════════════════════════");
        Console.WriteLine();

        try
        {
            // ── BƯỚC 1: Load bảng map ma_cham_cong → student_code từ Supabase ──
            Console.Write("[1] Tải danh sách học sinh từ Supabase... ");
            var studentMap = LoadStudentMap();  // enrollId(string) → student_code
            Console.WriteLine($"✓ {studentMap.Count} học sinh có mã chấm công");
            foreach (var kv in studentMap)
                Console.WriteLine($"    ma_cham_cong={kv.Key} → student_code={kv.Value}");
            Console.WriteLine();

            // ── BƯỚC 2: Kết nối máy chấm công ──────────────────────────────────
            var fp = new FP_CLOCKClass();
            string ip = DEVICE_IP;
            int port = DEVICE_PORT;
            int machineNumber = MACHINE_NUMBER;

            fp.SetIPAddress(ref ip, port, 0);
            Console.Write("[Kết nối] OpenCommPort ... ");
            bool connected = fp.OpenCommPort(machineNumber);
            Console.WriteLine(connected ? "✓ THÀNH CÔNG" : "✗ THẤT BẠI");
            if (!connected) { Marshal.ReleaseComObject(fp); return; }

            fp.EnableDevice(machineNumber, 1);

            string sn = "";
            fp.GetSerialNumber(machineNumber, ref sn);
            Console.WriteLine($"[2] Kết nối ✓  SN={sn}  MachineID={machineNumber}");
            Console.WriteLine();

            // ── BƯỚC 3: Đọc toàn bộ log lần đầu ──────────────────────────────
            Console.Write("[3] Đọc lịch sử log từ máy... ");
            var allLogs = ReadAllLogs(fp, machineNumber);
            Console.WriteLine($"✓ {allLogs.Count} bản ghi");

            // Hiện log hôm nay
            var today = DateTime.Today;
            var todayLogs = allLogs.Where(x => x.time.Date == today).OrderBy(x => x.time).ToList();
            if (todayLogs.Count > 0)
            {
                Console.WriteLine();
                Console.WriteLine($"  ─── Chấm công hôm nay {today:dd/MM/yyyy} ({todayLogs.Count} lần) ───");
                foreach (var r in todayLogs)
                {
                    studentMap.TryGetValue(r.enroll.ToString(), out var sc);
                    Console.WriteLine($"    {r.time:HH:mm:ss}  Mã CC #{r.enroll}" + (sc != null ? $" → {sc}" : " [chưa map]"));
                }
            }

            // Timestamp mới nhất đã biết
            var knownLatest = allLogs.Count > 0 ? allLogs.Max(x => x.time) : DateTime.MinValue;

            // ── BƯỚC 4: REAL-TIME POLLING + PUSH SUPABASE ─────────────────────
            Console.WriteLine();
            Console.WriteLine(new string('═', 62));
            Console.WriteLine("  REAL-TIME  — Polling 3s — Tự động đẩy Supabase");
            Console.WriteLine(new string('═', 62));
            Console.WriteLine($"  Theo dõi log sau: {knownLatest:dd/MM/yyyy HH:mm:ss}");
            Console.WriteLine();

            while (true)
            {
                Thread.Sleep(POLL_MS);

                var freshLogs = ReadAllLogs(fp, machineNumber);
                if (freshLogs == null)
                {
                    Console.Write($"\r  [{DateTime.Now:HH:mm:ss}] Mất kết nối — đang thử lại...   ");
                    continue;
                }

                var newRecords = freshLogs
                    .Where(r => r.time > knownLatest)
                    .OrderBy(r => r.time)
                    .ToList();

                if (newRecords.Count > 0)
                {
                    Console.WriteLine();
                    Console.WriteLine($"  [{DateTime.Now:HH:mm:ss}] ★ PHÁT HIỆN {newRecords.Count} LẦN CHẤM MỚI");
                    Console.WriteLine(new string('─', 62));

                    foreach (var r in newRecords)
                    {
                        // Map enrollId → student_code
                        string enrollKey = r.enroll.ToString();
                        if (!studentMap.TryGetValue(enrollKey, out string studentCode))
                        {
                            Console.WriteLine($"  ⚠ Mã CC #{r.enroll} chưa được map với học sinh nào trong hệ thống!");
                            Console.WriteLine($"    Thời gian: {r.time:dd/MM/yyyy HH:mm:ss}");
                            Console.WriteLine($"    → Vui lòng cập nhật cột ma_cham_cong = '{enrollKey}' cho học sinh tương ứng");
                            continue;
                        }

                        Console.Write($"  ✔ #{r.enroll} → {studentCode}  {r.time:dd/MM/yyyy HH:mm:ss}  → Push... ");
                        string result = PushToBackend(studentCode, r.time);
                        Console.WriteLine(result);
                    }

                    Console.WriteLine(new string('─', 62));
                    Console.WriteLine();
                    knownLatest = newRecords.Max(r => r.time);
                }
                else
                {
                    Console.Write($"\r  [{DateTime.Now:HH:mm:ss}] Đang theo dõi... ({freshLogs.Count} bản ghi)   ");
                }
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"\n✗ Lỗi nghiêm trọng: {ex.Message}");
            if (ex.InnerException != null) Console.WriteLine($"  Chi tiết: {ex.InnerException.Message}");
        }

        Console.WriteLine("\nNhấn phím bất kỳ để thoát...");
        Console.ReadKey();
    }

    // ─── Đọc toàn bộ log từ máy chấm công ───────────────────────────────────
    static List<(int enroll, DateTime time, int verify)> ReadAllLogs(FP_CLOCKClass fp, int machineNumber)
    {
        var logs = new List<(int enroll, DateTime time, int verify)>();
        try
        {
            if (!fp.ReadAllGLogData(machineNumber)) return logs;
            int tm = 0, en = 0, em = 0, ver = 0, yr = 0, mo = 0, dy = 0, hr = 0, mn = 0;
            while (fp.GetAllGLogData(machineNumber, ref tm, ref en, ref em, ref ver, ref yr, ref mo, ref dy, ref hr, ref mn))
            {
                try { logs.Add((en, new DateTime(yr, mo, dy, hr, mn, 0), ver)); }
                catch { }
            }
        }
        catch { return null; }
        return logs;
    }

    // ─── Load danh sách học sinh từ Supabase REST API ────────────────────────
    static Dictionary<string, string> LoadStudentMap()
    {
        var map = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
        try
        {
            var url = $"{SUPABASE_URL}/rest/v1/students?select=student_code,ma_cham_cong&ma_cham_cong=not.is.null";
            var req = new HttpRequestMessage(HttpMethod.Get, url);
            req.Headers.Add("apikey", SUPABASE_ANON);
            req.Headers.Add("Authorization", $"Bearer {SUPABASE_ANON}");

            var resp = http.SendAsync(req).Result;
            var json = resp.Content.ReadAsStringAsync().Result;

            var ser = new JavaScriptSerializer();
            var rows = ser.Deserialize<List<Dictionary<string, object>>>(json);
            foreach (var row in rows ?? new List<Dictionary<string, object>>())
            {
                var maCC    = row.ContainsKey("ma_cham_cong") ? row["ma_cham_cong"]?.ToString() : null;
                var stuCode = row.ContainsKey("student_code") ? row["student_code"]?.ToString() : null;
                if (!string.IsNullOrEmpty(maCC) && !string.IsNullOrEmpty(stuCode))
                    map[maCC] = stuCode;
            }
        }
        catch (Exception ex) { Console.WriteLine($"[Supabase] Load thất bại: {ex.Message}"); }
        return map;
    }

    // ─── Đẩy dữ liệu quét lên Backend → Supabase ─────────────────────────────
    static string PushToBackend(string studentCode, DateTime scannedAt)
    {
        try
        {
            var ser = new JavaScriptSerializer();
            var body = ser.Serialize(new {
                student_id = studentCode,
                school_id  = SCHOOL_ID,
                timestamp  = scannedAt.ToString("yyyy-MM-ddTHH:mm:ss.000+07:00")
            });

            var content = new StringContent(body, Encoding.UTF8, "application/json");
            var resp = http.PostAsync(BACKEND_URL, content).Result;
            var json = resp.Content.ReadAsStringAsync().Result;

            dynamic result = ser.DeserializeObject(json);
            if (resp.IsSuccessStatusCode)
            {
                var resDict = result as Dictionary<string, object>;
                bool dup = resDict != null && resDict.ContainsKey("duplicate") && (bool)resDict["duplicate"];
                return dup ? "⏩ Bỏ qua (trùng lặp)" : "✅ Đã lưu Supabase!";
            }
            return $"✗ Backend lỗi {(int)resp.StatusCode}: {json.Substring(0, Math.Min(80, json.Length))}";
        }
        catch (Exception ex) { return $"✗ Lỗi mạng: {ex.Message.Substring(0, Math.Min(60, ex.Message.Length))}"; }
    }
}
