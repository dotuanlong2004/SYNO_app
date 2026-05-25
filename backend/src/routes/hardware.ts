'use strict';

/**
 * Hardware Routes - Supabase + pg-boss edition
 * Replaces Redis debounce with PostgreSQL-based debounce
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { hardwareApiKey } = require('../middleware/hardwareApiKey');
const { recordAttendanceCore } = require('./attendance');

const router = express.Router();

const DEBOUNCE_TTL_SEC = 300; // 5 minutes

router.post('/scan', hardwareApiKey, async (req, res) => {
    const rawAttendanceCode =
        req.body?.ma_cham_cong ??
        req.body?.attendance_code ??
        req.body?.enroll_id ??
        req.body?.enrollId ??
        req.body?.enrollNumber;
    const rawStudentCode =
        req.body?.student_code ??
        req.body?.student_id ??
        req.body?.studentId;
    const timestamp = req.body?.timestamp ?? req.body?.time ?? req.body?.ts;
    const schoolId = String(req.body?.school_id ?? req.get('x-school-id') ?? process.env.DEFAULT_SCHOOL_ID ?? '1').trim();

    if (
        (rawAttendanceCode === undefined || rawAttendanceCode === null || String(rawAttendanceCode).trim() === '') &&
        (rawStudentCode === undefined || rawStudentCode === null || String(rawStudentCode).trim() === '')
    ) {
        return res.status(400).json({ ok: false, error: 'ma_cham_cong or student_code is required' });
    }

    let studentCode = rawStudentCode === undefined || rawStudentCode === null ? '' : String(rawStudentCode).trim();
    const maChamCong = rawAttendanceCode === undefined || rawAttendanceCode === null ? '' : String(rawAttendanceCode).trim();

    if (maChamCong) {
        if (maChamCong.length > 64) {
            return res.status(400).json({ ok: false, error: 'ma_cham_cong too long' });
        }

        const { data: mappedStudent, error: mapError } = await getSupabase()
            .from('students')
            .select('student_code')
            .eq('school_id', schoolId)
            .eq('ma_cham_cong', maChamCong)
            .maybeSingle();

        if (mapError || !mappedStudent?.student_code) {
            return res.status(404).json({
                ok: false,
                error: 'Student attendance code is not mapped in this school',
                school_id: schoolId,
                ma_cham_cong: maChamCong,
            });
        }

        studentCode = String(mappedStudent.student_code).trim();
    }

    if (studentCode.length > 64) {
        return res.status(400).json({ ok: false, error: 'student_code too long' });
    }

    let scannedAt;
    if (timestamp !== undefined && timestamp !== null && String(timestamp) !== '') {
        scannedAt = new Date(timestamp);
        if (Number.isNaN(scannedAt.getTime())) {
            return res.status(400).json({ ok: false, error: 'Invalid timestamp' });
        }
    } else {
        scannedAt = new Date();
    }

    // Check PostgreSQL-based debounce (5 min TTL)
    const { data: debounceCheck } = await getSupabase()
        .from('hardware_scan_debounce')
        .select('id')
        .eq('school_id', schoolId)
        .eq('student_code', studentCode)
        .gt('expires_at', new Date().toISOString())
        .maybeSingle();
    
    if (debounceCheck) {
        return res.status(200).json({
            ok: true,
            duplicate: true,
            debounced: true,
            message: 'Ignored: duplicate scan within debounce window',
        });
    }

    // Set debounce before queueing (5 min = 300000ms)
    await getSupabase()
        .from('hardware_scan_debounce')
        .upsert({
            school_id: schoolId,
            student_code: studentCode,
            expires_at: new Date(Date.now() + 300000).toISOString()
        }, { onConflict: 'school_id,student_code' });

    try {
        // Write attendance directly to guarantee persistence even if worker is not running.
        const result = await recordAttendanceCore({
            studentCode,
            schoolId,
            scannedAt,
        });

        return res.status(200).json({
            ok: true,
            queued: false,
            queue_warning: null,
            persisted: !result.blocked,
            duplicate: result.blocked,
            student_id: studentCode,
            student_code: studentCode,
            ma_cham_cong: maChamCong || null,
            school_id: schoolId,
            timestamp: scannedAt.toISOString(),
            attendance: result,
        });
    } catch (directError) {
        // Clear debounce on complete failure so operator can retry.
        await getSupabase()
            .from('hardware_scan_debounce')
            .delete()
            .eq('school_id', schoolId)
            .eq('student_code', studentCode);
        console.error('Direct attendance write failed:', directError);
        return res.status(503).json({ ok: false, error: directError.message || 'Attendance write failed' });
    }
});

module.exports = { hardwareRouter: router };
