'use strict';

/**
 * Students Routes - Supabase edition
 */

const express = require('express');
const { getSupabase } = require('../config/supabase');
const { mobileAuth } = require('../middleware/mobileAuth');

const router = express.Router();

function schoolIdOf(req) {
  return String(req.user?.school_id ?? req.get('x-school-id') ?? '1').trim();
}

function ensureTeacherOrAdmin(req, res) {
  if (!['teacher', 'admin'].includes(String(req.user?.role ?? ''))) {
    res.status(403).json({ ok: false, error: 'Only teacher/admin accounts can access this endpoint' });
    return false;
  }
  return true;
}

router.get('/students', mobileAuth, async (req, res) => {
  if (!ensureTeacherOrAdmin(req, res)) return;
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();

  try {
    const { data: rows, error } = await supabase
      .from('students')
      .select('id, student_code, full_name, class_name, link_code, parent_id')
      .eq('school_id', schoolId)
      .order('student_code', { ascending: true });

    if (error) throw error;

    const parentIds = [...new Set((rows || []).map((row) => row.parent_id).filter(Boolean))];
    let parentNameById = {};
    if (parentIds.length > 0) {
      const { data: parentProfiles, error: parentError } = await supabase
        .from('user_profiles')
        .select('id, full_name')
        .in('id', parentIds);
      if (parentError) throw parentError;
      parentNameById = Object.fromEntries((parentProfiles || []).map((p) => [p.id, p.full_name]));
    }

    return res.status(200).json({
      ok: true,
      count: rows.length,
      data: rows.map((row) => ({
        id: row.id,
        student_code: row.student_code,
        full_name: row.full_name,
        class_name: row.class_name,
        link_code: row.link_code,
        parent_id: row.parent_id,
        parent_name: row.parent_id ? (parentNameById[row.parent_id] || null) : null,
        linked: row.parent_id != null,
      })),
    });
  } catch (error) {
    console.error('Failed to fetch students list', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/students', mobileAuth, async (req, res) => {
  if (!ensureTeacherOrAdmin(req, res)) return;

  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const studentCode = String(req.body?.student_code ?? '').trim();
  const fullName = String(req.body?.full_name ?? '').trim();
  const className = String(req.body?.class_name ?? '').trim();

  if (!studentCode || !fullName) {
    return res.status(400).json({ ok: false, error: 'student_code and full_name are required' });
  }

  try {
    const { data, error } = await supabase
      .from('students')
      .insert({
        school_id: schoolId,
        student_code: studentCode,
        full_name: fullName,
        class_name: className || null
      })
      .select('id, student_code, full_name, class_name, link_code, parent_id')
      .single();

    if (error) {
      if (String(error.code) === '23505') {
        return res.status(409).json({ ok: false, error: 'student_code already exists' });
      }
      throw error;
    }

    return res.status(201).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to create student', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.put('/students/:id', mobileAuth, async (req, res) => {
  if (!ensureTeacherOrAdmin(req, res)) return;

  const studentId = Number(req.params.id);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid student id' });
  }

  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();
  const fullName = String(req.body?.full_name ?? '').trim();
  const className = String(req.body?.class_name ?? '').trim();
  if (!fullName) {
    return res.status(400).json({ ok: false, error: 'full_name is required' });
  }

  try {
    const { data, error } = await supabase
      .from('students')
      .update({
        full_name: fullName,
        class_name: className || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', studentId)
      .eq('school_id', schoolId)
      .select('id, student_code, full_name, class_name, link_code, parent_id')
      .single();

    if (error || !data) {
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    return res.status(200).json({ ok: true, data });
  } catch (error) {
    console.error('Failed to update student', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.delete('/students/:id', mobileAuth, async (req, res) => {
  if (!ensureTeacherOrAdmin(req, res)) return;

  const studentId = Number(req.params.id);
  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ ok: false, error: 'Invalid student id' });
  }
  const schoolId = schoolIdOf(req);
  const supabase = getSupabase();

  try {
    const { error, count } = await supabase
      .from('students')
      .delete()
      .eq('id', studentId)
      .eq('school_id', schoolId);

    if (error || count === 0) {
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }

    return res.status(200).json({ ok: true });
  } catch (error) {
    console.error('Failed to delete student', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = { studentsRouter: router };
