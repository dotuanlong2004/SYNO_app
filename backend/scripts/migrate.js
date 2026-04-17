#!/usr/bin/env node
'use strict';

/**
 * Supabase Schema Migration Script
 * Reads supabase_schema.sql and executes via Supabase REST API
 */

require('dotenv').config();
const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
    console.error('❌ Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
    process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

async function executeSql(sql) {
    // Use Supabase's pgexecute RPC or raw SQL via REST
    const { data, error } = await supabase.rpc('pgexecute', { query: sql });
    
    if (error) {
        // Fallback: Try direct SQL via POST /rest/v1/ with service role
        const response = await fetch(`${SUPABASE_URL}/rest/v1/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
                'apikey': SUPABASE_SERVICE_ROLE_KEY,
                'Prefer': 'tx=rollback' // Test mode
            },
            body: JSON.stringify({ query: sql })
        });
        
        if (!response.ok) {
            const text = await response.text();
            throw new Error(`SQL execution failed: ${text}`);
        }
    }
    
    return data;
}

async function runMigrations() {
    console.log('🚀 Starting Supabase Migration...');
    console.log(`🔗 URL: ${SUPABASE_URL}`);
    
    const schemaPath = path.join(__dirname, '..', 'supabase_schema.sql');
    
    if (!fs.existsSync(schemaPath)) {
        console.error(`❌ Schema file not found: ${schemaPath}`);
        process.exit(1);
    }
    
    const schemaSql = fs.readFileSync(schemaPath, 'utf8');
    
    // Split SQL into statements (rough split by semicolons, skipping functions)
    const statements = schemaSql
        .split(/;\s*$/gm)
        .map(s => s.trim())
        .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`📄 Found ${statements.length} SQL statements to execute`);
    
    // Alternative: Use direct PostgreSQL connection via connection string if available
    // This is more reliable for complex schema
    if (process.env.SUPABASE_DB_URL) {
        console.log('🔗 Using direct PostgreSQL connection...');
        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.SUPABASE_DB_URL,
            ssl: { rejectUnauthorized: false }
        });
        
        try {
            await client.connect();
            console.log('✅ Connected to Supabase PostgreSQL');
            
            await client.query(schemaSql);
            console.log('✅ Schema executed successfully');
            
            await client.end();
        } catch (err) {
            console.error('❌ Migration failed:', err.message);
            process.exit(1);
        }
    } else {
        console.log('⚠️  SUPABASE_DB_URL not found. Trying REST API method...');
        console.log('💡 Tip: Add SUPABASE_DB_URL=postgresql://postgres:[password]@db.[project].supabase.co:5432/postgres to .env for better reliability');
        
        // Execute via Supabase Management API or REST
        // This is limited - recommend using psql or direct connection for production
        console.log('📝 For production, run this SQL via Supabase Dashboard SQL Editor:');
        console.log(`   File: ${schemaPath}`);
        console.log('\n⏩ Or use psql command:');
        console.log(`   psql "${SUPABASE_URL.replace('https://', 'postgresql://postgres:password@db.').replace('.co', '.co:5432/postgres')}" -f ${schemaPath}`);
    }
    
    console.log('\n✅ Migration preparation complete!');
    console.log('\n🎯 Next steps:');
    console.log('   1. Open Supabase Dashboard: https://app.supabase.com');
    console.log('   2. Navigate to SQL Editor');
    console.log('   3. Copy contents of supabase_schema.sql and paste');
    console.log('   4. Run the SQL');
    console.log('   5. Enable pg_cron extension in Database > Extensions if not auto-enabled');
}

// Alternative: Direct SQL execution via service role
async function setupPgBoss() {
    console.log('\n📦 Setting up pg-boss tables...');
    
    const pgBossSchema = `
        CREATE SCHEMA IF NOT EXISTS pgboss;
        
        CREATE TABLE IF NOT EXISTS pgboss.job (
            id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
            name text NOT NULL,
            priority integer DEFAULT 0,
            data jsonb,
            state text DEFAULT 'created'::text,
            retryCount integer DEFAULT 0,
            retryLimit integer DEFAULT 0,
            retryDelay integer DEFAULT 0,
            retryBackoff boolean DEFAULT false,
            startAfter timestamptz DEFAULT now(),
            startedOn timestamptz,
            singletonKey text,
            singletonOn timestamptz,
            expireIn interval,
            createdOn timestamptz DEFAULT now(),
            completedOn timestamptz,
            keepUntil timestamptz DEFAULT now() + interval '14 days'
        );
        
        CREATE TABLE IF NOT EXISTS pgboss.archive (
            id uuid PRIMARY KEY,
            name text NOT NULL,
            priority integer,
            data jsonb,
            state text,
            retryCount integer,
            retryLimit integer,
            retryDelay integer,
            retryBackoff boolean,
            startAfter timestamptz,
            startedOn timestamptz,
            singletonKey text,
            singletonOn timestamptz,
            expireIn interval,
            createdOn timestamptz,
            completedOn timestamptz,
            keepUntil timestamptz
        );
        
        CREATE TABLE IF NOT EXISTS pgboss.schedule (
            name text PRIMARY KEY,
            cron text NOT NULL,
            timezone text,
            data jsonb,
            options jsonb,
            createdOn timestamptz DEFAULT now(),
            updatedOn timestamptz DEFAULT now()
        );
        
        CREATE INDEX IF NOT EXISTS job_fetch ON pgboss.job (priority desc, createdOn) 
        WHERE state < 'completed'::text;
        
        CREATE INDEX IF NOT EXISTS archive_completedOn ON pgboss.archive (completedOn);
    `;
    
    if (process.env.SUPABASE_DB_URL) {
        const { Client } = require('pg');
        const client = new Client({
            connectionString: process.env.SUPABASE_DB_URL,
            ssl: { rejectUnauthorized: false }
        });
        await client.connect();
        await client.query(pgBossSchema);
        await client.end();
        console.log('✅ pg-boss schema created');
    }
}

async function verifyConnection() {
    console.log('\n🔍 Verifying Supabase connection...');
    try {
        const { data, error } = await supabase.from('students').select('count').limit(1);
        if (error && !error.message.includes('does not exist')) {
            console.warn('⚠️  Connection warning:', error.message);
        } else {
            console.log('✅ Supabase connection verified');
        }
    } catch (err) {
        console.warn('⚠️  Could not verify connection:', err.message);
    }
}

if (require.main === module) {
    (async () => {
        await runMigrations();
        await setupPgBoss().catch(e => console.log('⚠️  pg-boss setup skipped:', e.message));
        await verifyConnection();
        console.log('\n🎉 Migration script completed!');
    })();
}

module.exports = { runMigrations, setupPgBoss };
