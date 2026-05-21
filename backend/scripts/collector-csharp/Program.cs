using System;
using System.Net.Http;
using System.Text;
using System.Threading;
using System.Threading.Tasks;
using Newtonsoft.Json;
using Newtonsoft.Json.Linq;

// Ronald Jack AI-X1 Collector using C# SDK
// Build: dotnet run

class Program
{
    static string DEVICE_IP = Environment.GetEnvironmentVariable("ZK_DEVICE_IP") ?? "192.168.0.225";
    static int DEVICE_PORT = int.Parse(Environment.GetEnvironmentVariable("ZK_DEVICE_PORT") ?? "4370");
    static string SUPABASE_URL = Environment.GetEnvironmentVariable("SUPABASE_URL") ?? "";
    static string SUPABASE_KEY = Environment.GetEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    static string SCHOOL_ID = Environment.GetEnvironmentVariable("SCHOOL_ID") ?? "1";
    
    static dynamic ax = null;
    static bool connected = false;
    static HttpClient httpClient = new HttpClient();
    
    static async Task Main(string[] args)
    {
        Console.WriteLine("========================================");
        Console.WriteLine("Ronald Jack AI-X1 Collector (C# SDK)");
        Console.WriteLine("========================================\n");
        
        if (string.IsNullOrEmpty(SUPABASE_KEY))
        {
            Console.WriteLine("[FATAL] Missing SUPABASE_SERVICE_ROLE_KEY");
            return;
        }
        
        // Load SDK
        try
        {
            var sdkType = Type.GetTypeFromProgID("zkemkeeper.ZKEM");
            if (sdkType == null)
            {
                Console.WriteLine("[ERROR] ZKEM SDK not registered. Please install SDK first.");
                Console.WriteLine("Run: regsvr32 C:\\Windows\\SysWOW64\\zkemkeeper.dll");
                return;
            }
            ax = Activator.CreateInstance(sdkType);
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[ERROR] Cannot load SDK: {ex.Message}");
            return;
        }
        
        // Connect
        if (!await ConnectAsync())
        {
            Console.WriteLine("[FATAL] Cannot connect to device");
            return;
        }
        
        Console.WriteLine("[READY] Waiting for scans...\n");
        
        // Poll loop
        while (true)
        {
            try
            {
                await PollAndPush();
                await Task.Delay(5000);
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[ERROR] {ex.Message}");
                await Task.Delay(10000);
            }
        }
    }
    
    static async Task<bool> ConnectAsync()
    {
        for (int i = 1; i <= 5; i++)
        {
            Console.WriteLine($"[CONNECT] Attempt {i}/5 to {DEVICE_IP}:{DEVICE_PORT}...");
            
            try
            {
                bool ok = ax.Connect_Net(DEVICE_IP, DEVICE_PORT);
                if (ok)
                {
                    connected = true;
                    Console.WriteLine("[CONNECT] Success!");
                    return true;
                }
                
                int err = 0;
                ax.GetLastError(ref err);
                Console.WriteLine($"[CONNECT] Failed. Error code: {err}");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"[CONNECT] Exception: {ex.Message}");
            }
            
            await Task.Delay(5000 * i);
        }
        
        return false;
    }
    
    static async Task PollAndPush()
    {
        if (!connected) return;
        
        try
        {
            ax.DisableDevice(1);
            
            bool hasData = ax.ReadGeneralLogData(1);
            if (!hasData) return;
            
            string uid;
            int v, io, y, m, d, h, mi, s, wc = 0;
            int count = 0;
            
            while (ax.SSR_GetGeneralLogData(1, out uid, out v, out io, out y, out m, out d, out h, out mi, out s, ref wc))
            {
                var localTime = new DateTime(y, m, d, h, mi, s);
                var utcTime = localTime.AddHours(-7); // VN to UTC
                
                Console.WriteLine($"[SCAN] User={uid} Time={localTime:HH:mm:ss}");
                
                // Push to Supabase via HTTP
                await PushToSupabase(uid, utcTime, io, v);
                count++;
            }
            
            if (count > 0)
                Console.WriteLine($"[POLL] Processed {count} logs");
        }
        finally
        {
            ax.EnableDevice(1);
        }
    }
    
    static async Task PushToSupabase(string userId, DateTime utcTime, int inOut, int verifyMode)
    {
        try
        {
            var payload = new
            {
                p_ma_cham_cong = userId,
                p_scanned_at = utcTime.ToString("O"),
                p_school_id = SCHOOL_ID,
                p_log_type = inOut == 0 ? "check_in" : "check_out",
                p_status_detail = "on_time"
            };
            
            var content = new StringContent(
                JsonConvert.SerializeObject(payload),
                Encoding.UTF8,
                "application/json"
            );
            
            httpClient.DefaultRequestHeaders.Authorization = 
                new System.Net.Http.Headers.AuthenticationHeaderValue("Bearer", SUPABASE_KEY);
            
            var response = await httpClient.PostAsync(
                $"{SUPABASE_URL}/rest/v1/rpc/insert_attendance_from_device",
                content
            );
            
            if (response.IsSuccessStatusCode)
            {
                var result = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[OK] Inserted: {userId}");
            }
            else
            {
                var error = await response.Content.ReadAsStringAsync();
                Console.WriteLine($"[FAIL] {userId}: {error}");
            }
        }
        catch (Exception ex)
        {
            Console.WriteLine($"[API ERROR] {ex.Message}");
        }
    }
}
