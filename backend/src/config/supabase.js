'use strict';

/**
 * Supabase Client Configuration
 * Replaces PostgreSQL Pool + Redis with Supabase
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
    process.exit(1);
}

// Service role client - for backend operations (full access)
const supabaseServiceRole = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    },
    db: {
        schema: 'public'
    }
});

// Anon client - if needed for public operations
const supabaseAnon = process.env.SUPABASE_ANON_KEY 
    ? createClient(SUPABASE_URL, process.env.SUPABASE_ANON_KEY, {
        auth: {
            autoRefreshToken: false,
            persistSession: false
        }
    })
    : null;

/**
 * Get Supabase service role client (admin operations)
 * @returns {import('@supabase/supabase-js').SupabaseClient}
 */
function getSupabase() {
    return supabaseServiceRole;
}

/**
 * Get Supabase anon client (limited operations)
 * @returns {import('@supabase/supabase-js').SupabaseClient | null}
 */
function getSupabaseAnon() {
    return supabaseAnon;
}

/**
 * Health check function
 * @returns {Promise<{ok: boolean, supabase: string, error?: string}>}
 */
async function checkSupabaseHealth() {
    try {
        const { data, error } = await supabaseServiceRole
            .from('students')
            .select('id')
            .limit(1);
        
        if (error && error.code === '42P01') {
            // Table doesn't exist yet
            return { ok: true, supabase: 'connected', note: 'tables not created yet' };
        }
        
        if (error) {
            return { ok: false, supabase: 'error', error: error.message };
        }
        
        return { ok: true, supabase: 'up' };
    } catch (err) {
        return { ok: false, supabase: 'down', error: err.message };
    }
}

module.exports = {
    getSupabase,
    getSupabaseAnon,
    checkSupabaseHealth,
    supabaseServiceRole,
    supabaseAnon
};
