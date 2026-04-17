'use strict';

/**
 * Attendance Routes - Supabase edition
 * Replaces Redis spam protection with PostgreSQL tables
 */

const express = require('express');
const { DateTime } = require('luxon');
const { getSupabase } = require('../config/supabase');
const { sendPushNotification, isUnregisteredTokenError } = require('../config/firebaseAdmin');

const router = express.Router();

const TZ = process.env.ATTENDANCE_TIMEZONE || 'Asia/Ho_Chi_Minh';

async function clearInvalidFcmToken(userId) {
    const supabase = getSupabase();
    await supabase
        .from('users')
        .update({ fcm_token: null, updated_at: new Date().toISOString() })
        .eq('id', userId);
}

function formatLocalTime(iso) {
    if (iso instanceof Date) {
        return DateTime.fromJSDate(iso).setZone(TZ).toFormat('HH:mm');
    }
    return DateTime.fromISO(String(iso), { zone: 'utc' }).setZone(TZ).toFormat('HH:mm');
}

router.post('/sync', async (req, res) => {
    const schoolId = String(
        req.body?.school_id ?? req.get('x-school-id') ?? 'default_school'
    ).trim();
    const studentCode = String(req.body?.student_code ?? '').trim();
    const rawTime = req.body?.check_time ?? req.body?.timestamp;
    const scannedAt = rawTime ? new Date(rawTime) : new Date();

    if (!studentCode) {
        return res.status(400).json({ ok: false, error: 'student_code is required' });
    }
    if (Number.isNaN(scannedAt.getTime())) {
        return res.status(400).json({ ok: false, error: 'Invalid check_time/timestamp' });
    }

    // Check PostgreSQL-based spam protection (10 min TTL)
    const { data: spamCheck } = await supabase
        .from('attendance_spam_logs')
        .select('id')
        .eq('school_id', schoolId)
        .eq('student_code', studentCode)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    
    if (spamCheck) {
        return res.status(200).json({
            ok: true,
            blocked: true,
            message: 'Spam blocked (< 10 minutes).',
        });
    }

    const supabase = getSupabase();

    try {
        // Use RPC function for atomic transaction
        const { data: rpcResult, error: rpcError } = await supabase
            .rpc('record_attendance_with_spam_check', {
                p_student_code: studentCode,
                p_school_id: schoolId,
                p_scanned_at: scannedAt.toISOString(),
                p_log_type: null, // Let function determine check_in/check_out
                p_status_detail: null,
                p_late_minutes: null
            });

        if (rpcError) {
            console.error('[attendance-sync] RPC error:', rpcError);
            // Fallback to manual logic
            return await handleAttendanceFallback(supabase, res, studentCode, schoolId, scannedAt);
        }

        if (rpcResult.blocked) {
            return res.status(200).json({
                ok: true,
                blocked: true,
                message: rpcResult.error_message,
            });
        }

        if (rpcResult.error_message) {
            return res.status(404).json({ ok: false, error: rpcResult.error_message });
        }

        // Get student info for FCM
        const { data: student } = await supabase
            .from('students')
            .select('id, full_name, parent_id, parent:fcm_token')
            .eq('id', rpcResult.student_id)
            .single();

        // Set spam block (10 min TTL)
        await supabase
            .from('attendance_spam_logs')
            .upsert({
                school_id: schoolId,
                student_code: studentCode,
                expires_at: new Date(Date.now() + 600000).toISOString()
            }, { onConflict: 'school_id,student_code' });

        // Send FCM notification
        if (student?.parent?.fcm_token) {
            const verb = rpcResult.log_type === 'check_in' ? 'Vào' : 'Ra';
            const localTime = formatLocalTime(scannedAt);
            try {
                await sendPushNotification({
                    token: student.parent.fcm_token,
                    title: 'Thông báo điểm danh',
                    body: `Học sinh ${student.full_name} đã điểm danh ${verb} lúc ${localTime}.`,
                    data: {
                        student_id: String(student.id),
                        student_code: studentCode,
                        check_type: verb,
                        log_type: rpcResult.log_type,
                        check_time: scannedAt.toISOString(),
                    },
                });
            } catch (error) {
                if (isUnregisteredTokenError(error)) {
                    await clearInvalidFcmToken(student.parent_id);
                } else {
                    console.error('[attendance-sync] FCM send failed:', error.message);
                }
            }
        }

        return res.status(200).json({
            ok: true,
            blocked: false,
            student_code: studentCode,
            check_type: rpcResult.log_type === 'check_in' ? 'Vào' : 'Ra',
            log_type: rpcResult.log_type,
            check_time: scannedAt.toISOString(),
        });

    } catch (error) {
        console.error('[attendance-sync] failed:', error);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
});

// Fallback function when RPC fails
async function handleAttendanceFallback(supabase, res, studentCode, schoolId, scannedAt) {
    try {
        // Manual transaction logic
        const { data: student, error: studentError } = await supabase
            .from('students')
            .select('id, full_name, parent_id')
            .eq('student_code', studentCode)
            .eq('school_id', schoolId)
            .single();

        if (studentError || !student) {
            return res.status(404).json({ ok: false, error: 'Student not found' });
        }

        // Determine check_in/check_out
        const startOfDay = DateTime.fromJSDate(scannedAt, { zone: TZ }).startOf('day');
        const { data: lastLog } = await supabase
            .from('attendance_logs')
            .select('log_type')
            .eq('student_id', student.id)
            .gte('scanned_at', startOfDay.toISO())
            .lt('scanned_at', startOfDay.plus({ days: 1 }).toISO())
            .order('scanned_at', { ascending: false })
            .limit(1)
            .maybeSingle();

        const nextLogType = lastLog?.log_type === 'check_in' ? 'check_out' : 'check_in';
        const statusDetail = nextLogType === 'check_in' ? 'on_time' : 'leave';

        // Insert attendance log
        const { data: inserted, error: insertError } = await supabase
            .from('attendance_logs')
            .insert({
                school_id: schoolId,
                student_id: student.id,
                scanned_at: scannedAt.toISOString(),
                log_type: nextLogType,
                status_detail: statusDetail,
                late_minutes: null
            })
            .select('id, scanned_at')
            .single();

        if (insertError) {
            throw insertError;
        }

        // Set spam block
        await supabase.from('attendance_spam_logs').upsert({school_id:schoolId,student_code:studentCode,expires_at:new Date(Date.now()+600000).toISOString()},{onConflict:'school_id,student_code'});

        return res.status(200).json({
            ok: true,
            blocked: false,
            student_code: studentCode,
            check_type: nextLogType === 'check_in' ? 'Vào' : 'Ra',
            log_type: nextLogType,
            check_time: inserted.scanned_at,
        });

    } catch (error) {
        console.error('[attendance-sync] fallback failed:', error);
        return res.status(500).json({ ok: false, error: 'Internal server error' });
    }
}

module.exports = { attendanceRouter: router };
