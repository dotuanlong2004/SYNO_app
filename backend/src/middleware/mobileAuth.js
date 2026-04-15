'use strict';

const { verifyAccessToken } = require('../config/jwt');

function mobileAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const bearer = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  if (!bearer) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', message: 'Missing bearer token' });
  }

  try {
    const payload = verifyAccessToken(bearer);
    req.user = {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      full_name: payload.full_name,
      class_id: payload.class_id || null,
      student_code: payload.student_code || null,
    };
    return next();
  } catch (_err) {
    return res.status(401).json({ ok: false, error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

module.exports = { mobileAuth };
