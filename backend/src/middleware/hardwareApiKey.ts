'use strict';

const { getSupabase } = require('../config/supabase');

/**
 * Require matching X-Hardware-Api-Key header.
 * Checks both environment variable (legacy/global) and database (per-school).
 */
async function hardwareApiKey(req, res, next) {
  const providedKey = req.get('x-hardware-api-key');
  if (!providedKey) {
    return res.status(401).json({ ok: false, error: 'API Key is required' });
  }

  // 1. Check global key from environment
  const globalKey = process.env.HARDWARE_API_KEY;
  if (globalKey && providedKey === globalKey) {
    return next();
  }

  // 2. Check per-school key from database
  // Note: We need school_id to verify per-school keys. 
  // If not provided in body/header, we can't verify per-school key here.
  const schoolId = req.body?.school_id ?? req.get('x-school-id');
  
  if (schoolId) {
    const { data: keyData, error } = await getSupabase()
      .from('api_keys')
      .select('id')
      .eq('school_id', schoolId)
      .eq('key_hash', providedKey) // In production, this should be a hash check
      .eq('is_active', true)
      .maybeSingle();

    if (keyData) {
      // Update last used timestamp asynchronously
      getSupabase()
        .from('api_keys')
        .update({ last_used_at: new Date().toISOString() })
        .eq('id', keyData.id)
        .then(() => {});
        
      return next();
    }
  }

  return res.status(401).json({ ok: false, error: 'Invalid API Key' });
}

module.exports = { hardwareApiKey };
