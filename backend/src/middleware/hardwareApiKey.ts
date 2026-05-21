'use strict';

/**
 * When HARDWARE_API_KEY is set, require matching X-Hardware-Api-Key header.
 */
function hardwareApiKey(req, res, next) {
  const key = process.env.HARDWARE_API_KEY;
  if (!key) {
    return next();
  }
  if (req.get('x-hardware-api-key') === key) {
    return next();
  }
  return res.status(401).json({ ok: false, error: 'Unauthorized' });
}

module.exports = { hardwareApiKey };
