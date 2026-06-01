'use strict';

const { getSupabase } = require('../config/supabase');
const { resolveMobileUserContext } = require('../services/mobileUserContext');

async function mobileAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const bearer = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  console.log(`[Auth] ${req.method} ${req.path} - Auth header: ${authorization ? 'present' : 'missing'}`);

  if (!bearer) {
    console.log('[Auth] ❌ Missing bearer token');
    return res.status(401).json({ ok: false, error: 'Unauthorized', message: 'Missing bearer token' });
  }

  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(bearer);

    if (error) {
      console.log('[Auth] ❌ Supabase error:', error.message);
      return res.status(401).json({ ok: false, error: 'Unauthorized', message: 'Invalid or expired token' });
    }
    
    if (!user) {
      console.log('[Auth] ❌ No user found');
      return res.status(401).json({ ok: false, error: 'Unauthorized', message: 'Invalid or expired token' });
    }
    
    console.log(`[Auth] ✅ User: ${user.email}`);

    // Get user profile for additional data
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('role, class_id, student_code, school_id, full_name, is_active')
      .eq('id', user.id)
      .single();

    const resolved = await resolveMobileUserContext({
      supabase,
      userId: user.id,
      profile,
      userMetadata: user.user_metadata || {},
    });

    if (profile && profile.is_active === false) {
      return res.status(403).json({ ok: false, error: 'Forbidden', message: 'User account is inactive' });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: resolved.role,
      full_name: resolved.full_name,
      class_id: resolved.class_id,
      student_code: resolved.student_code,
      school_id: resolved.school_id,
    };
    return next();
  } catch (err) {
    console.error('Auth error:', err);
    return res.status(401).json({ ok: false, error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

module.exports = { mobileAuth };
