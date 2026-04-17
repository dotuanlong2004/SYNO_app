'use strict';

/**
 * Hardware Routes - Supabase + pg-boss edition
 * Replaces Redis debounce with PostgreSQL-based debounce
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { attendanceQueue } = require('../queues/attendanceQueue');
const { hardwareApiKey } = require('../middleware/hardwareApiKey');

const router = express.Router();

const DEBOUNCE_TTL_SEC = 300; // 5 minutes

router.post('/scan', hardwareApiKey, async (req, res) => {
    const rawId = req.body?.student_id ?? req.body?.studentId;
    const timestamp = req.body?.timestamp ?? req.body?.time ?? req.body?.ts;

    if (rawId === undefined || rawId === null || String(rawId).trim() === '') {
        return res.status(400).json({ ok: false, error: 'student_id is required' });
    }

    const studentCode = String(rawId).trim();
    const schoolId = String(req.body?.school_id ?? req.get('x-school-id') ?? process.env.DEFAULT_SCHOOL_ID ?? 'default_school').trim();
    if (studentCode.length > 64) {
        return res.status(400).json({ ok: false, error: 'student_id too long' });
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
        await attendanceQueue.add(
            'scan',
            {
                studentCode,
                schoolId,
                scannedAtIso: scannedAt.toISOString(),
            },
            {}
        );
    } catch (err) {
        // Clear debounce on failure
        await getSupabase()
            .from('hardware_scan_debounce')
            .delete()
            .eq('school_id', schoolId)
            .eq('student_code', studentCode);
        console.error('Queue add failed:', err);
        return res.status(503).json({ ok: false, error: 'Queue unavailable' });
    }

    return res.status(200).json({
        ok: true,
        queued: true,
        student_id: studentCode,
        school_id: schoolId,
        timestamp: scannedAt.toISOString(),
    });
});

module.exports = { hardwareRouter: router };
