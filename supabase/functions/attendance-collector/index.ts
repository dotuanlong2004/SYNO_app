// Supabase Edge Function: attendance-collector
// Nhận log từ ZKCollector C# Service và xử lý logic Vào/Ra + chặn 10 phút

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface AttendanceLog {
  enrollNumber: string;
  timeUtc: string;
  inOutMode: number;  // 0=Check In (Vào), 1=Check Out (Ra)
  verifyMode: number;
}

interface RequestBody {
  logs: AttendanceLog[];
  device_ip: string;
  timestamp: string;
  school_id?: string;
}

serve(async (req: Request) => {
  // CORS headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Parse request
    const { logs, device_ip, school_id }: RequestBody = await req.json();
    const schoolId = (school_id ?? "1").trim();

    if (!logs || logs.length === 0) {
      return new Response(
        JSON.stringify({ inserted: 0, skipped: 0 }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
    const supabase = createClient(supabaseUrl, supabaseKey);

    let inserted = 0;
    let skipped = 0;

    for (const log of logs) {
      const maChamCong = log.enrollNumber;  // Keep as string (matches existing schema)
      const checkTime = new Date(log.timeUtc);

      // Find student by school_id + ma_cham_cong.
      // ma_cham_cong/device enroll IDs can repeat between schools.
      const { data: students, error: studentError } = await supabase
        .from("students")
        .select("id, school_id, student_code, full_name")
        .eq("school_id", schoolId)
        .eq("ma_cham_cong", maChamCong)
        .limit(1);

      if (studentError || !students || students.length === 0) {
        console.log(`Student not found for school_id=${schoolId}, ma_cham_cong=${maChamCong}`);
        skipped++;
        continue;
      }

      const student = students[0];

      // Determine log_type based on inOutMode from device
      // 0 = Check In (Vào), 1 = Check Out (Ra)
      const logType = log.inOutMode === 1 ? 'check_out' : 'check_in';

        // Kiểm tra chặn 10 phút
      const shouldBlock = await checkDebounce(supabase, student.id, checkTime);
      if (shouldBlock) {
        console.log(`Chặn: ${maChamCong} trong vòng 10 phút`);
        skipped++;
        continue;
      }

      // Insert attendance log (using existing schema)
      const { error: insertError } = await supabase
        .from("attendance_logs")
        .insert({
          school_id: student.school_id ?? "1",
          student_id: student.id,
          scanned_at: checkTime.toISOString(),
          log_type: logType,
          status_detail: "on_time", // Default, can be updated later
          created_by: null // System insert
        });

      if (insertError) {
        console.log(`Insert error: ${insertError.message}`);
        skipped++;
      } else {
        inserted++;
        console.log(`Inserted: ${maChamCong} (${student.full_name}) - ${logType}`);
      }
    }

    // collector_state table may not exist on current schema -> skip to avoid runtime failure
    console.log(`Collector heartbeat: ${device_ip}`);
    return new Response(
      JSON.stringify({ inserted, skipped, total: logs.length }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error:", error);
    return new Response(
      JSON.stringify({ error: error?.message ?? "Unknown error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" }, status: 500 }
    );
  }
});

async function checkDebounce(supabase: any, studentId: number, checkTime: Date): Promise<boolean> {
  // Kiểm tra có log trong 10 phút gần nhất không
  const tenMinutesAgo = new Date(checkTime.getTime() - 10 * 60 * 1000);
  
  const { data: recentLogs, error } = await supabase
    .from("attendance_logs")
    .select("id, scanned_at")
    .eq("student_id", studentId)
    .gte("scanned_at", tenMinutesAgo.toISOString())
    .lte("scanned_at", checkTime.toISOString())
    .limit(1);

  if (error) {
    console.error("Lỗi kiểm tra debounce:", error);
    return false;
  }

  return recentLogs && recentLogs.length > 0;
}
