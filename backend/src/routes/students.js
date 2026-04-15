'use strict';

const express = require('express');
const { getPool } = require('../config/database');
const { mobileAuth } = require('../middleware/mobileAuth');

const router = express.Router();

router.get('/students', mobileAuth, async (req, res) => {
  if (!['teacher', 'admin'].includes(String(req.user?.role ?? ''))) {
    return res.status(403).json({
      ok: false,
      error: 'Only teacher/admin accounts can access student list',
    });
  }

  try {
    const { rows } = await getPool().query(
      `SELECT s.id,
              s.student_code,
              s.full_name,
              s.class_name,
              s.link_code,
              s.parent_id,
              u.full_name AS parent_name
       FROM students s
       LEFT JOIN users u ON u.id = s.parent_id
       ORDER BY s.student_code ASC`
    );

    const data = rows.map((row) => ({
      id: row.id,
      student_code: row.student_code,
      full_name: row.full_name,
      class_name: row.class_name,
      link_code: row.link_code,
      parent_id: row.parent_id,
      parent_name: row.parent_name,
      linked: row.parent_id != null,
    }));

    return res.status(200).json({ ok: true, count: data.length, data });
  } catch (error) {
    console.error('Failed to fetch students list', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

module.exports = { studentsRouter: router };
