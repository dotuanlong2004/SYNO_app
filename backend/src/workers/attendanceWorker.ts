'use strict';

/**
 * Attendance Worker - pg-boss + Supabase edition
 * Replaces BullMQ Worker with pg-boss work queue
 */

const { DateTime } = require('luxon');
const { getSupabase } = require('../config/supabase');
const { classifyAttendance } = require('../services/attendanceLogic');
const { subscribeToQueue } = require('../queues/attendanceQueue');
const { sendPushNotification, isUnregisteredTokenError } = require('../config/firebaseAdmin');

const TZ = process.env.ATTENDANCE_TIMEZONE || 'Asia/Ho_Chi_Minh';

function buildBody(studentCode, scannedAtIso, classification) {
    const localTime = DateTime.fromISO(scannedAtIso, { zone: 'utc' })
        .setZone(TZ)
        .toFormat('HH:mm');

    if (classification.log_type === 'check_out') {
        return `Học sinh ${studentCode} đã check-out lúc ${localTime}.`;
    }

    if (classification.status_detail === 'late') {
        return `Học sinh ${studentCode} đã check-in lúc ${localTime} (Đi muộn ${classification.late_minutes} phút).`;
    }

    return `Học sinh ${studentCode} đã check-in lúc ${localTime} (Đúng giờ).`;
}

async function clearInvalidFcmToken(userId) {
    const supabase = getSupabase();
    await supabase
        .from('user_profiles')
        .update({ fcm_token: null, updated_at: new Date().toISOString() })
        .eq('id', userId);
}

async function notifyUsers(studentCode, scannedAtIso, classification, schoolId) {
    const supabase = getSupabase();

    // Use RPC function or direct query
    const { data: users, error } = await supabase
        .from('user_profiles')
        .select('id, fcm_token')
        .eq('is_active', true)
        .eq('school_id', schoolId)
        .eq('student_code', studentCode)
        .not('fcm_token', 'is', null);

    if (error || !users?.length) {
        return;
    }

    const title = 'Thông báo điểm danh';
    const body = buildBody(studentCode, scannedAtIso, classification);

    await Promise.all(
        users.map(async (user) => {
            if (!user.fcm_token) return;
            try {
                await sendPushNotification({
                    token: user.fcm_token,
                    title,
                    body,
                    data: {
                        student_id: studentCode,
                        log_type: classification.log_type,
                        status: classification.status_detail,
                        late_minutes: String(classification.late_minutes ?? 0),
                        scanned_at: scannedAtIso,
                    },
                });
            } catch (error) {
                if (isUnregisteredTokenError(error)) {
                    await clearInvalidFcmToken(user.id);
                    console.warn('[fcm] Cleared invalid token for user', user.id);
                    return;
                }
                console.error('[fcm] send failed for user', user.id, error.message);
            }
        })
    );
}

/**
 * Process scan job from pg-boss
 * @param {Object} job - pg-boss job object
 */
async function processScan(job) {
    const { studentCode, scannedAtIso, schoolId: incomingSchoolId } = job.data;
    if (!studentCode || !scannedAtIso) {
        throw new Error('Invalid job payload');
    }

    const scannedAt = new Date(scannedAtIso);
    const classification = classifyAttendance(scannedAt);
    if (!classification) {
        console.warn(
            `[worker] Scan outside attendance window (timezone ${TZ}):`,
            studentCode,
            scannedAtIso
        );
        return { skipped: true, reason: 'outside_window' };
    }

    const supabase = getSupabase();
    const schoolId = String(incomingSchoolId || process.env.DEFAULT_SCHOOL_ID || '1');
    const defaultLinkCode = `LK-${studentCode}`;

    // Upsert student using RPC or direct query
    const { data: student, error: studentError } = await supabase
        .rpc('upsert_student_from_scan', {
            p_school_id: schoolId,
            p_student_code: studentCode,
            p_full_name: 'Pending registration'
        });

    if (studentError) {
        // Fallback: manual upsert
        const { data: existing } = await supabase
            .from('students')
            .select('id, link_code')
            .eq('student_code', studentCode)
            .maybeSingle();

        let studentId;
        if (existing) {
            studentId = existing.id;
            if (!existing.link_code) {
                await supabase
                    .from('students')
                    .update({ link_code: defaultLinkCode, updated_at: new Date().toISOString() })
                    .eq('id', studentId);
            }
        } else {
            const { data: inserted } = await supabase
                .from('students')
                .insert({
                    school_id: schoolId,
                    student_code: studentCode,
                    full_name: 'Pending registration',
                    link_code: defaultLinkCode
                })
                .select('id')
                .single();
            studentId = inserted.id;
        }

        // Insert attendance log
        await supabase
            .from('attendance_logs')
            .insert({
                school_id: schoolId,
                student_id: studentId,
                scanned_at: scannedAtIso,
                log_type: classification.log_type,
                status_detail: classification.status_detail,
                late_minutes: classification.late_minutes
            });

        await notifyUsers(studentCode, scannedAtIso, classification, schoolId);

        return {
            skipped: false,
            studentId,
            ...classification,
        };
    }

    // RPC succeeded
    const studentId = student?.student_id;

    // Insert attendance log
    await supabase
        .from('attendance_logs')
        .insert({
            school_id: schoolId,
            student_id: studentId,
            scanned_at: scannedAtIso,
            log_type: classification.log_type,
            status_detail: classification.status_detail,
            late_minutes: classification.late_minutes
        });

    await notifyUsers(studentCode, scannedAtIso, classification, schoolId);

    return {
        skipped: false,
        studentId,
        ...classification,
    };
}

/**
 * Create and start attendance worker with pg-boss
 * @returns {Promise<Object>} - worker handle with close() method
 */
async function createAttendanceWorker() {
    console.log('[worker] Starting pg-boss worker...');

    await subscribeToQueue(processScan);

    return {
        async close() {
            // pg-boss handles cleanup via boss.stop() in queue module
            console.log('[worker] Worker shutting down...');
        }
    };
}

module.exports = { createAttendanceWorker, processScan };
