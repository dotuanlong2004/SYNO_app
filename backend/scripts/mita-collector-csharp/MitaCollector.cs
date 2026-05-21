using System;
using System.Data;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Npgsql; // PostgreSQL

namespace MitaCollector
{
    class Program
    {
        // Config - giống MITA Pro
        static string DEVICE_IP = Environment.GetEnvironmentVariable("ZK_DEVICE_IP") ?? "192.168.0.225";
        static int DEVICE_PORT = int.Parse(Environment.GetEnvironmentVariable("ZK_DEVICE_PORT") ?? "4370");
        
        // VPS PostgreSQL (thay vì SQL Server local)
        static string PG_CONN = Environment.GetEnvironmentVariable("POSTGRES_URL") 
            ?? "Host=63.250.53.83;Database=attendance_db;Username=postgres;Password=your-password";
        
        static string SCHOOL_ID = Environment.GetEnvironmentVariable("SCHOOL_ID") ?? "1";
        
        // ZKEM SDK
        static dynamic ax = null;
        static bool connected = false;
        static HttpClient http = new HttpClient();
        
        static async Task Main(string[] args)
        {
            Console.WriteLine("========================================");
            Console.WriteLine("MITA Pro Collector - PostgreSQL Edition");
            Console.WriteLine("Ronald Jack AI-X1 → VPS PostgreSQL");
            Console.WriteLine("========================================\n");
            
            // 1. Load ZKEM SDK
            if (!LoadSDK()) return;
            
            // 2. Connect to device (giống MITA)
            if (!await ConnectDeviceAsync()) return;
            
            // 3. Setup real-time events
            SetupRealtimeEvents();
            
            // 4. Start polling (backup)
            _ = Task.Run(PollLoopAsync);
            
            Console.WriteLine("[READY] Waiting for scans... Press Ctrl+C to exit\n");
            
            // Keep alive
            await Task.Delay(-1);
        }
        
        static bool LoadSDK()
        {
            try
            {
                var sdkType = Type.GetTypeFromProgID("zkemkeeper.ZKEM");
                if (sdkType == null)
                {
                    Console.WriteLine("[ERROR] zkemkeeper.ZKEM not registered");
                    Console.WriteLine("Run: regsvr32 C:\\Windows\\SysWOW64\\zkemkeeper.dll");
                    return false;
                }
                ax = Activator.CreateInstance(sdkType);
                Console.WriteLine("[SDK] ZKEM loaded successfully");
                return true;
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] Cannot load SDK: {ex.Message}");
                return false;
            }
        }
        
        static async Task<bool> ConnectDeviceAsync()
        {
            // Thử các port phổ biến của Ronald Jack/ZKteco
            int[] ports = { 4370, 5005, 5055, 5020, 5010, 5050 };
            
            foreach (int port in ports)
            {
                Console.WriteLine($"[CONNECT] Trying port {port}...");
                
                for (int i = 1; i <= 3; i++)
                {
                    try
                    {
                        bool ok = ax.Connect_Net(DEVICE_IP, port);
                        if (ok)
                        {
                            connected = true;
                            Console.WriteLine($"[CONNECT] Device connected on port {port}!");
                            
                            // Sync time (giống MITA)
                            var now = DateTime.Now;
                            ax.SetDeviceTime2(1, now.Year, now.Month, now.Day, now.Hour, now.Minute, now.Second);
                            Console.WriteLine("[SYNC] Device time synchronized");
                            
                            return true;
                        }
                        
                        int err = 0;
                        ax.GetLastError(ref err);
                        Console.WriteLine($"[CONNECT] Port {port} attempt {i}/3: Error {err}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"[CONNECT] Port {port} exception: {ex.Message}");
                    }
                    
                    await Task.Delay(2000 * i);
                }
            }
            
            Console.WriteLine("[CONNECT] Failed to connect on all ports");
            return false;
        }
        
        static void SetupRealtimeEvents()
        {
            // Real-time events disabled - using polling only
            // (COM event handler requires SDK reference, using polling is simpler)
            Console.WriteLine("[REALTIME] Using polling mode (5 second interval)");
        }
        
        static async Task PollLoopAsync()
        {
            while (true)
            {
                try
                {
                    if (!connected) 
                    {
                        await Task.Delay(10000);
                        continue;
                    }
                    
                    ax.DisableDevice(1);
                    
                    bool hasData = ax.ReadGeneralLogData(1);
                    if (hasData)
                    {
                        string uid;
                        int v, io, y, m, d, h, mi, s, wc = 0;
                        int count = 0;
                        
                        while (ax.SSR_GetGeneralLogData(1, out uid, out v, out io, 
                            out y, out m, out d, out h, out mi, out s, ref wc))
                        {
                            var localTime = new DateTime(y, m, d, h, mi, s);
                            var utcTime = localTime.AddHours(-7);
                            
                            await ProcessScanAsync(uid, utcTime, io, v);
                            count++;
                        }
                        
                        if (count > 0)
                            Console.WriteLine($"[POLL] Processed {count} logs");
                    }
                    
                    ax.EnableDevice(1);
                }
                catch (Exception ex)
                {
                    Console.WriteLine($"[POLL ERROR] {ex.Message}");
                }
                
                await Task.Delay(5000); // Poll mỗi 5 giây
            }
        }
        
        static async Task ProcessScanAsync(string maChamCong, DateTime utcTime, int inOutMode, int verifyMode)
        {
            try
            {
                using var conn = new NpgsqlConnection(PG_CONN);
                await conn.OpenAsync();
                
                // 1. Tìm student (JOIN như MITA)
                var cmd = new NpgsqlCommand(@"
                    SELECT id, student_code, full_name, class_name 
                    FROM students 
                    WHERE (ma_cham_cong = @ma OR student_code = @ma) 
                    AND school_id = @school
                    LIMIT 1", conn);
                
                cmd.Parameters.AddWithValue("ma", maChamCong);
                cmd.Parameters.AddWithValue("school", SCHOOL_ID);
                
                using var reader = await cmd.ExecuteReaderAsync();
                if (!await reader.ReadAsync())
                {
                    Console.WriteLine($"[SKIP] Student not found: {maChamCong}");
                    return;
                }
                
                int studentId = reader.GetInt32(0);
                string studentCode = reader.GetString(1);
                string fullName = reader.GetString(2);
                string className = reader.IsDBNull(3) ? "" : reader.GetString(3);
                reader.Close();
                
                // 2. Chặn quẹt liên tiếp < 10 phút (logic MITA)
                var debounceCmd = new NpgsqlCommand(@"
                    SELECT scanned_at FROM attendance_logs 
                    WHERE student_id = @sid 
                    AND scanned_at > NOW() - INTERVAL '10 minutes'
                    ORDER BY scanned_at DESC 
                    LIMIT 1", conn);
                debounceCmd.Parameters.AddWithValue("sid", studentId);
                
                var lastScan = await debounceCmd.ExecuteScalarAsync();
                if (lastScan != null)
                {
                    Console.WriteLine($"[DEBOUNCE] {studentCode} - skipped (< 10 min)");
                    return;
                }
                
                // 3. Xác định Vào/Ra (logic MITA)
                var logType = await DetermineInOutAsync(conn, studentId, utcTime);
                
                // 4. Insert vào PostgreSQL
                var insertCmd = new NpgsqlCommand(@"
                    INSERT INTO attendance_logs 
                        (school_id, student_id, scanned_at, log_type, status_detail, created_at)
                    VALUES (@school, @sid, @scanned, @type, 'on_time', NOW())
                    ON CONFLICT DO NOTHING", conn);
                
                insertCmd.Parameters.AddWithValue("school", SCHOOL_ID);
                insertCmd.Parameters.AddWithValue("sid", studentId);
                insertCmd.Parameters.AddWithValue("scanned", utcTime);
                insertCmd.Parameters.AddWithValue("type", logType);
                
                int rows = await insertCmd.ExecuteNonQueryAsync();
                
                if (rows > 0)
                {
                    string action = logType == "check_in" ? "VÀO" : "RA";
                    Console.WriteLine($"[OK] {studentCode} {fullName} → {action}");
                }
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[PROCESS ERROR] {ex.Message}");
            }
        }
        
        static async Task<string> DetermineInOutAsync(NpgsqlConnection conn, int studentId, DateTime scannedAt)
        {
            var cmd = new NpgsqlCommand(@"
                SELECT log_type FROM attendance_logs 
                WHERE student_id = @sid 
                AND DATE(scanned_at AT TIME ZONE 'Asia/Ho_Chi_Minh') = DATE(@scanned AT TIME ZONE 'Asia/Ho_Chi_Minh')
                ORDER BY scanned_at DESC 
                LIMIT 1", conn);
            
            cmd.Parameters.AddWithValue("sid", studentId);
            cmd.Parameters.AddWithValue("scanned", scannedAt);
            
            var result = await cmd.ExecuteScalarAsync();
            if (result == null) return "check_in"; // Lần đầu
            
            string lastType = result.ToString();
            return lastType == "check_in" ? "check_out" : "check_in"; // Đảo chiều
        }
    }
}
