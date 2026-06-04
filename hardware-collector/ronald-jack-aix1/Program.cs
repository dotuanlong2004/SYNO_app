using System;
using System.Collections.Generic;
using System.Linq;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Web.Script.Serialization;
using System.Reflection;
using System.Runtime.InteropServices;
using System.IO;
using FPClockLib;

class Program
{
    // ─── Cấu hình ────────────────────────────────────────────────────────────
    static readonly CollectorConfig Config = CollectorConfig.Load();
    // ─────────────────────────────────────────────────────────────────────────

    static readonly HttpClient http = new HttpClient { Timeout = TimeSpan.FromSeconds(10) };

    [STAThread]
    static void Main()
    {
        Console.OutputEncoding = Encoding.UTF8;
        Config.Validate();
        Console.WriteLine("════════════════════════════════════════════════════════");
        Console.WriteLine("  RONALD JACK AI-X1 — COM SDK Collector");
        Console.WriteLine($"  Thiết bị: {Config.DeviceIp}:{Config.DevicePort}  |  School: {Config.SchoolId}");
        Console.WriteLine($"  Backend: {Config.BackendUrl}");
        Console.WriteLine($"  Hardware API key: {(string.IsNullOrWhiteSpace(Config.HardwareApiKey) ? "not set" : "set")}");
        Console.WriteLine("════════════════════════════════════════════════════════");
        Console.WriteLine();

        try
        {
            // ── BƯỚC 1: Backend sẽ resolve ma_cham_cong theo school_id ───────
            Console.WriteLine("[1] Backend sẽ resolve mã chấm công theo school_id");
            Console.WriteLine("    Collector không đọc trực tiếp Supabase bằng anon key.");
            Console.WriteLine();

            // ── BƯỚC 2: Kết nối máy chấm công ──────────────────────────────────
            var fp = new FP_CLOCKClass();
            string ip = Config.DeviceIp;
            int port = Config.DevicePort;
            int machineNumber = Config.MachineNumber;

            fp.SetIPAddress(ref ip, port, Config.CommPassword);
            Console.Write("[Kết nối] OpenCommPort ... ");
            bool connected = fp.OpenCommPort(machineNumber);
            Console.WriteLine(connected ? "✓ THÀNH CÔNG" : "✗ THẤT BẠI");

            if (!connected)
            {
                int sdkErr = GetSdkLastErrorSafe(fp);
                if (sdkErr != -1)
                    Console.WriteLine($"    SDK LastError={sdkErr}");

                Console.WriteLine();
                Console.WriteLine("Nguyên nhân thường gặp:");
                Console.WriteLine("  1) Đang có collector khác giữ kết nối tới máy chấm công.");
                Console.WriteLine("  2) Máy/SDK chưa giải phóng socket sau lần chạy trước; chờ 10-30 giây rồi chạy lại.");
                Console.WriteLine("  3) IP/port hoặc COM key trên máy không khớp.");
                Marshal.ReleaseComObject(fp);
                return;
            }

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
            var todayLogs = allLogs.Where(x => x.time.Date == today).OrderByDescending(x => x.time).ToList();
            if (todayLogs.Count > 0)
            {
                Console.WriteLine();
                Console.WriteLine($"  ─── Chấm công hôm nay {today:dd/MM/yyyy} ({todayLogs.Count} lần) ───");
                foreach (var r in todayLogs)
                {
                    Console.WriteLine($"    {r.time:HH:mm:ss}  Mã CC #{r.enroll}");
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
                Thread.Sleep(Config.PollMs);

                var freshLogs = ReadAllLogs(fp, machineNumber);
                if (freshLogs == null)
                {
                    Console.Write($"\r  [{DateTime.Now:HH:mm:ss}] Mất kết nối — đang thử lại...   ");
                    continue;
                }

                var newRecords = freshLogs
                    .Where(r => r.time > knownLatest)
                    .OrderByDescending(r => r.time)
                    .ToList();

                if (newRecords.Count > 0)
                {
                    Console.WriteLine();
                    Console.WriteLine($"  [{DateTime.Now:HH:mm:ss}] ★ PHÁT HIỆN {newRecords.Count} LẦN CHẤM MỚI");
                    Console.WriteLine(new string('─', 62));

                    foreach (var r in newRecords)
                    {
                        string enrollKey = r.enroll.ToString();
                        Console.Write($"  ✔ Mã CC #{r.enroll}  {r.time:dd/MM/yyyy HH:mm:ss}  → Push... ");
                        string result = PushToBackend(enrollKey, r.time);
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

    // ─── Lấy mã lỗi SDK an toàn (nếu COM expose GetLastError) ───────────────
    static int GetSdkLastErrorSafe(FP_CLOCKClass fp)
    {
        try
        {
            var t = fp.GetType();
            var m = t.GetMethod("GetLastError");
            if (m == null) return -1;

            object[] args = new object[] { 0 };
            var okObj = m.Invoke(fp, args);
            var ok = okObj is bool b && b;
            if (!ok) return -1;

            if (args.Length > 0 && args[0] is int err) return err;
            return -1;
        }
        catch
        {
            return -1;
        }
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

    // ─── Đẩy dữ liệu quét lên Backend → Supabase ─────────────────────────────
    static string PushToBackend(string maChamCong, DateTime scannedAt)
    {
        try
        {
            var ser = new JavaScriptSerializer();
            var bodyObj = new
            {
                ma_cham_cong = maChamCong,
                school_id = Config.SchoolId,
                timestamp = scannedAt.ToString("yyyy-MM-ddTHH:mm:ss.000+07:00")
            };
            var body = ser.Serialize(bodyObj);

            var req = new HttpRequestMessage(HttpMethod.Post, Config.BackendUrl);
            req.Content = new StringContent(body, Encoding.UTF8, "application/json");
            if (!string.IsNullOrWhiteSpace(Config.HardwareApiKey))
                req.Headers.Add("x-hardware-api-key", Config.HardwareApiKey);

            var resp = http.SendAsync(req).Result;
            var json = resp.Content.ReadAsStringAsync().Result;

            if (resp.IsSuccessStatusCode)
            {
                bool dup = false;
                try
                {
                    var result = ser.DeserializeObject(json) as Dictionary<string, object>;
                    dup = result != null && result.ContainsKey("duplicate") && result["duplicate"] is bool b && b;
                }
                catch { }

                var brief = json.Length > 160 ? json.Substring(0, 160) + "..." : json;
                return dup
                    ? $"⏩ Bỏ qua (trùng lặp) | API={(int)resp.StatusCode} | resp={brief}"
                    : $"✅ Đã lưu Supabase! | API={(int)resp.StatusCode} | resp={brief}";
            }

            var err = json.Length > 200 ? json.Substring(0, 200) + "..." : json;
            return $"✗ Backend lỗi {(int)resp.StatusCode} ({resp.ReasonPhrase}) | body={err}";
        }
        catch (Exception ex)
        {
            var msg = ex.Message.Length > 120 ? ex.Message.Substring(0, 120) + "..." : ex.Message;
            return $"✗ Lỗi mạng khi push: {msg}";
        }
    }
}

class CollectorConfig
{
    public string DeviceIp { get; private set; }
    public int DevicePort { get; private set; }
    public int MachineNumber { get; private set; }
    public int CommPassword { get; private set; }
    public string SchoolId { get; private set; }
    public string BackendUrl { get; private set; }
    public string HardwareApiKey { get; private set; }
    public int PollMs { get; private set; }
    public bool RequireHardwareApiKey { get; private set; }

    public static CollectorConfig Load()
    {
        var fileValues = LoadConfigFile();
        var defaults = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase)
        {
            ["AI_X1_DEVICE_IP"] = "10.160.45.225",
            ["AI_X1_DEVICE_PORT"] = "4370",
            ["AI_X1_MACHINE_NUMBER"] = "1",
            ["AI_X1_COMM_PASSWORD"] = "0",
            ["SCHOOL_ID"] = "1",
            ["BACKEND_HARDWARE_SCAN_URL"] = "http://localhost:3000/api/v1/hardware/scan",
            ["HARDWARE_API_KEY"] = "",
            ["AI_X1_POLL_MS"] = "3000",
            ["COLLECTOR_REQUIRE_HARDWARE_API_KEY"] = "true"
        };

        return new CollectorConfig
        {
            DeviceIp = GetSetting("AI_X1_DEVICE_IP", defaults, fileValues),
            DevicePort = GetIntSetting("AI_X1_DEVICE_PORT", defaults, fileValues),
            MachineNumber = GetIntSetting("AI_X1_MACHINE_NUMBER", defaults, fileValues),
            CommPassword = GetIntSetting("AI_X1_COMM_PASSWORD", defaults, fileValues),
            SchoolId = GetSetting("SCHOOL_ID", defaults, fileValues),
            BackendUrl = GetSetting("BACKEND_HARDWARE_SCAN_URL", defaults, fileValues),
            HardwareApiKey = GetSetting("HARDWARE_API_KEY", defaults, fileValues),
            PollMs = GetIntSetting("AI_X1_POLL_MS", defaults, fileValues),
            RequireHardwareApiKey = GetBoolSetting("COLLECTOR_REQUIRE_HARDWARE_API_KEY", defaults, fileValues)
        };
    }

    public void Validate()
    {
        if (string.IsNullOrWhiteSpace(DeviceIp))
            throw new InvalidOperationException("AI_X1_DEVICE_IP is required.");
        if (DevicePort <= 0 || DevicePort > 65535)
            throw new InvalidOperationException("AI_X1_DEVICE_PORT must be between 1 and 65535.");
        if (MachineNumber <= 0)
            throw new InvalidOperationException("AI_X1_MACHINE_NUMBER must be greater than 0.");
        if (string.IsNullOrWhiteSpace(SchoolId))
            throw new InvalidOperationException("SCHOOL_ID is required.");
        if (!Uri.IsWellFormedUriString(BackendUrl, UriKind.Absolute))
            throw new InvalidOperationException("BACKEND_HARDWARE_SCAN_URL must be an absolute URL.");
        if (PollMs < 1000)
            throw new InvalidOperationException("AI_X1_POLL_MS must be at least 1000.");
        if (RequireHardwareApiKey && string.IsNullOrWhiteSpace(HardwareApiKey))
            throw new InvalidOperationException("HARDWARE_API_KEY is required when COLLECTOR_REQUIRE_HARDWARE_API_KEY=true.");
    }

    static Dictionary<string, string> LoadConfigFile()
    {
        var configuredPath = Environment.GetEnvironmentVariable("COLLECTOR_CONFIG_PATH");
        var candidates = new List<string>();
        if (!string.IsNullOrWhiteSpace(configuredPath))
            candidates.Add(configuredPath.Trim());

        candidates.Add(Path.Combine(AppDomain.CurrentDomain.BaseDirectory, "collector-config.json"));
        candidates.Add(Path.Combine(Directory.GetCurrentDirectory(), "collector-config.json"));

        foreach (var path in candidates.Distinct(StringComparer.OrdinalIgnoreCase))
        {
            if (!File.Exists(path)) continue;
            var json = File.ReadAllText(path, Encoding.UTF8);
            var serializer = new JavaScriptSerializer();
            var raw = serializer.DeserializeObject(json) as Dictionary<string, object>;
            var values = new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
            if (raw == null) return values;

            foreach (var pair in raw)
            {
                if (pair.Value == null) continue;
                values[pair.Key] = Convert.ToString(pair.Value).Trim();
            }
            return values;
        }

        return new Dictionary<string, string>(StringComparer.OrdinalIgnoreCase);
    }

    static string GetSetting(
        string name,
        Dictionary<string, string> defaults,
        Dictionary<string, string> fileValues)
    {
        var value = Environment.GetEnvironmentVariable(name);
        if (!string.IsNullOrWhiteSpace(value)) return value.Trim();

        string fileValue;
        if (fileValues.TryGetValue(name, out fileValue) && !string.IsNullOrWhiteSpace(fileValue))
            return fileValue.Trim();

        return defaults[name];
    }

    static int GetIntSetting(
        string name,
        Dictionary<string, string> defaults,
        Dictionary<string, string> fileValues)
    {
        var value = GetSetting(name, defaults, fileValues);
        int parsed;
        return int.TryParse(value, out parsed) ? parsed : int.Parse(defaults[name]);
    }

    static bool GetBoolSetting(
        string name,
        Dictionary<string, string> defaults,
        Dictionary<string, string> fileValues)
    {
        var value = GetSetting(name, defaults, fileValues);
        return value.Equals("true", StringComparison.OrdinalIgnoreCase) ||
               value.Equals("1", StringComparison.OrdinalIgnoreCase) ||
               value.Equals("yes", StringComparison.OrdinalIgnoreCase);
    }
}
