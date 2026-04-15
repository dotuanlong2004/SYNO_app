'use strict';

const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool } = require('../config/database');
const {
  signAccessToken,
  signRefreshToken,
  verifyRefreshToken,
  sha256,
} = require('../config/jwt');

const router = express.Router();

function accessPayload(user) {
  return {
    sub: String(user.id),
    email: user.email,
    role: user.role,
    full_name: user.full_name,
    class_id: user.class_id || null,
    student_code: user.student_code || null,
  };
}

router.post('/login', async (req, res) => {
  const identifier = String(req.body?.email ?? req.body?.username ?? '').trim().toLowerCase();
  const password = String(req.body?.password ?? '');

  if (!identifier || !password) {
    return res.status(400).json({ ok: false, error: 'email/username and password are required' });
  }

  try {
    const { rows } = await getPool().query(
      `SELECT id, email, password_hash, full_name, role, class_id, student_code, is_active
       FROM users
       WHERE email = $1`,
      [identifier]
    );

    const user = rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) {
      return res.status(401).json({ ok: false, error: 'Invalid credentials' });
    }

    const payload = accessPayload(user);
    const access_token = signAccessToken(payload);
    const refresh_token = signRefreshToken({ sub: String(user.id), type: 'refresh' });

    await getPool().query(
      `INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, sha256(refresh_token)]
    );

    return res.status(200).json({
      ok: true,
      access_token,
      refresh_token,
      user: {
        id: String(user.id),
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        class_id: user.class_id || null,
        student_code: user.student_code || null,
      },
    });
  } catch (error) {
    console.error('Login failed', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  }
});

router.post('/register-parent', async (req, res) => {
  const fullName = String(req.body?.full_name ?? req.body?.fullName ?? '').trim();
  const identifier = String(
    req.body?.email_or_phone ??
      req.body?.emailOrPhone ??
      req.body?.email ??
      req.body?.phone ??
      ''
  ).trim();
  const password = String(req.body?.password ?? '');
  const studentLinkCode = String(
    req.body?.link_code ??
      req.body?.linkCode ??
      req.body?.student_link_code ??
      req.body?.studentLinkCode ??
      ''
  ).trim();

  if (!fullName || !identifier || !password || !studentLinkCode) {
    return res.status(400).json({
      ok: false,
      error: 'full_name, email_or_phone, password, and link_code are required',
    });
  }

  if (password.length < 6) {
    return res.status(400).json({ ok: false, error: 'Password must be at least 6 characters' });
  }

  const normalizedIdentifier = identifier.includes('@')
    ? identifier.toLowerCase()
    : identifier;

  const client = await getPool().connect();
  try {
    await client.query('BEGIN');

    const studentResult = await client.query(
      `SELECT id, student_code, full_name, class_name, parent_id
       FROM students
       WHERE link_code = $1
       LIMIT 1`,
      [studentLinkCode]
    );

    const student = studentResult.rows[0];
    if (!student) {
      await client.query('ROLLBACK');
      return res.status(404).json({ ok: false, error: 'Invalid student link code' });
    }

    if (student.parent_id) {
      await client.query('ROLLBACK');
      return res.status(409).json({
        ok: false,
        error: 'This student has already been linked to a parent account',
      });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const userInsert = await client.query(
      `INSERT INTO users (email, password_hash, full_name, role, class_id, student_code)
       VALUES ($1, $2, $3, 'parent', $4, $5)
       RETURNING id, email, full_name, role, class_id, student_code`,
      [
        normalizedIdentifier,
        passwordHash,
        fullName,
        student.class_name ?? null,
        student.student_code,
      ]
    );

    const parentUser = userInsert.rows[0];

    await client.query(
      `UPDATE students
       SET parent_id = $1,
           updated_at = NOW()
       WHERE id = $2`,
      [parentUser.id, student.id]
    );

    const payload = accessPayload(parentUser);
    const access_token = signAccessToken(payload);
    const refresh_token = signRefreshToken({
      sub: String(parentUser.id),
      type: 'refresh',
    });

    await client.query(
      `INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [parentUser.id, sha256(refresh_token)]
    );

    await client.query('COMMIT');

    return res.status(201).json({
      ok: true,
      message: 'Parent account registered and linked successfully',
      access_token,
      refresh_token,
      student: {
        student_code: student.student_code,
        full_name: student.full_name,
        link_code: studentLinkCode,
      },
      user: {
        id: String(parentUser.id),
        email: parentUser.email,
        full_name: parentUser.full_name,
        role: parentUser.role,
        class_id: parentUser.class_id || null,
        student_code: parentUser.student_code,
      },
    });
  } catch (error) {
    await client.query('ROLLBACK');
    if (String(error?.code) === '23505') {
      return res.status(409).json({ ok: false, error: 'Email/phone already exists' });
    }
    console.error('Parent registration failed', error);
    return res.status(500).json({ ok: false, error: 'Internal server error' });
  } finally {
    client.release();
  }
});

router.post('/refresh', async (req, res) => {
  const refreshToken = String(req.body?.refresh_token ?? '').trim();
  if (!refreshToken) {
    return res.status(400).json({ ok: false, error: 'refresh_token is required' });
  }

  try {
    const payload = verifyRefreshToken(refreshToken);
    if (payload.type !== 'refresh' || !payload.sub) {
      return res.status(401).json({ ok: false, error: 'Invalid refresh token' });
    }

    const tokenHash = sha256(refreshToken);
    const tokenRow = await getPool().query(
      `SELECT id, user_id, expires_at, revoked_at
       FROM user_refresh_tokens
       WHERE token_hash = $1
       LIMIT 1`,
      [tokenHash]
    );

    const session = tokenRow.rows[0];
    if (!session || session.revoked_at || new Date(session.expires_at) <= new Date()) {
      return res.status(401).json({ ok: false, error: 'Refresh token expired or revoked' });
    }

    const userRow = await getPool().query(
      `SELECT id, email, full_name, role, class_id, student_code, is_active FROM users WHERE id = $1 LIMIT 1`,
      [session.user_id]
    );

    const user = userRow.rows[0];
    if (!user || !user.is_active) {
      return res.status(401).json({ ok: false, error: 'User inactive' });
    }

    const access_token = signAccessToken(accessPayload(user));
    const newRefreshToken = signRefreshToken({ sub: String(user.id), type: 'refresh' });

    await getPool().query(
      `UPDATE user_refresh_tokens
       SET revoked_at = NOW()
       WHERE id = $1`,
      [session.id]
    );

    await getPool().query(
      `INSERT INTO user_refresh_tokens (user_id, token_hash, expires_at)
       VALUES ($1, $2, NOW() + INTERVAL '7 days')`,
      [user.id, sha256(newRefreshToken)]
    );

    return res.status(200).json({
      ok: true,
      access_token,
      refresh_token: newRefreshToken,
    });
  } catch (_error) {
    return res.status(401).json({ ok: false, error: 'Invalid refresh token' });
  }
});

router.post('/logout', async (req, res) => {
  const refreshToken = String(req.body?.refresh_token ?? '').trim();
  if (refreshToken) {
    await getPool().query(
      `UPDATE user_refresh_tokens SET revoked_at = NOW() WHERE token_hash = $1`,
      [sha256(refreshToken)]
    );
  }
  return res.status(200).json({ ok: true });
});

module.exports = { authRouter: router };
