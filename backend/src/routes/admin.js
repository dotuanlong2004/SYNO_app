'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const { mobileAuth } = require('../middleware/mobileAuth');

const router = express.Router();

function ensureAdminOrTeacher(req, res) {
  if (!['teacher', 'admin'].includes(String(req.user?.role ?? ''))) {
    res.status(403).json({
      ok: false,
      error: 'Only teacher/admin accounts can access this endpoint',
    });
    return false;
  }
  return true;
}

function generateDefaultPassword() {
  const suffix = Math.floor(100000 + Math.random() * 900000);
  return `Aa@${suffix}`;
}

router.post('/provision-parent', mobileAuth, async (req, res) => {
  if (!ensureAdminOrTeacher(req, res)) return;

  const studentId = Number(req.body?.student_id);
  const parentName = String(req.body?.parent_name ?? '').trim();
  const parentIdentifier = String(req.body?.parent_email_or_phone ?? '').trim();

  if (!Number.isInteger(studentId) || studentId <= 0) {
    return res.status(400).json({ ok: false, error: 'student_id is required' });
  }
  if (!parentName) {
    return res.status(400).json({ ok: false, error: 'parent_name is required' });
  }
  if (!parentIdentifier) {
    return res
      .status(400)
      .json({ ok: false, error: 'parent_email_or_phone is required' });
  }

  const normalizedIdentifier = parentIdentifier.includes('@')
    ? parentIdentifier.toLowerCase()
    : parentIdentifier;
  const defaultPassword = generateDefaultPassword();
  const passwordHash = await bcrypt.hash(defaultPassword, 12);

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const studentResult = await client.query(
      `SELECT id, student_code, full_name, class_name, parent_id
       FROM students
       WHERE id = $1
       LIMIT 1`,
      [studentId]
    );
    const student = studentResult.rows[0];
    if (!student) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'Student not found' });
    }
    if (student.parent_id) {
      await client.query('ROLLBACK');
      return res
        .status(409)
        .json({ ok: false, error: 'Student already linked to a parent account' });
    }

    const userInsert = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, class_id, student_code)
       VALUES ($1, $2, $3, 'parent', $4, $5)
       RETURNING id, email, full_name, role`,
      [
        normalizedIdentifier,
        passwordHash,
        parentName,
        student.class_name ?? null,
        student.student_code,
      ]
    );
    const parent = userInsert.rows[0];

    await client.query(
      `UPDATE students
       SET parent_id = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [parent.id, student.id]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      message: 'Provisioned parent account successfully',
      student: {
        id: student.id,
        student_code: student.student_code,
        full_name: student.full_name,
      },
      parent: {
        id: parent.id,
        full_name: parent.full_name,
        email_or_phone: parent.email,
        role: parent.role,
      },
      credentials: {
        email_or_phone: parent.email,
        password: defaultPassword,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (String(error?.code) === '23505') {
      return res
        .status(409)
        .json({ ok: false, error: 'parent_email_or_phone already exists' });
    }
    console.error('Provision parent failed', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  } finally {
    client.release();
  }
});

module.exports = { adminRouter: router };
