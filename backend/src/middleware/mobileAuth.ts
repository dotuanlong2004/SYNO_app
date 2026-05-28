'use strict';

const { getSupabase } = require('../config/supabase');
const { resolveMobileUserContext } = require('../services/mobileUserContext');

function debugLog(runId, hypothesisId, location, message, data) {
  // #region agent log
  fetch('http://127.0.0.1:7700/ingest/a7bdf355-c458-4118-93ed-045b1b863a17',{method:'POST',headers:{'Content-Type':'application/json','X-Debug-Session-Id':'dd0f3d'},body:JSON.stringify({sessionId:'dd0f3d',runId,hypothesisId,location,message,data,timestamp:Date.now()})}).catch(()=>{});
  // #endregion
}

async function mobileAuth(req, res, next) {
  const authorization = req.get('authorization') || '';
  const bearer = authorization.toLowerCase().startsWith('bearer ')
    ? authorization.slice(7).trim()
    : '';

  console.log(`[Auth] ${req.method} ${req.path} - Auth header: ${authorization ? 'present' : 'missing'}`);

  if (!bearer) {
    debugLog('pre-fix', 'H1', 'src/middleware/mobileAuth.js:mobileAuth', 'Missing bearer token', {
      method: req.method,
      path: req.path,
      authHeaderPresent: !!authorization,
    });
    console.log('[Auth] ❌ Missing bearer token');
    return res.status(401).json({ ok: false, error: 'Unauthorized', message: 'Missing bearer token' });
  }

  try {
    const supabase = getSupabase();
    const { data: { user }, error } = await supabase.auth.getUser(bearer);
    debugLog('pre-fix', 'H2', 'src/middleware/mobileAuth.js:mobileAuth', 'Supabase getUser result', {
      hasError: !!error,
      errorMessage: error?.message || null,
      hasUser: !!user,
    });

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
    debugLog('pre-fix', 'H3', 'src/middleware/mobileAuth.js:mobileAuth', 'Profile lookup result', {
      profileFound: !!profile,
      userIdPresent: !!user?.id,
    });

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
    debugLog('pre-fix', 'H4', 'src/middleware/mobileAuth.js:mobileAuth', 'Auth middleware exception', {
      message: err?.message || 'unknown',
      name: err?.name || 'unknown',
    });
    console.error('Auth error:', err);
    return res.status(401).json({ ok: false, error: 'Unauthorized', message: 'Invalid or expired token' });
  }
}

module.exports = { mobileAuth };
