'use strict';

/**
 * One-time migration script:
 * 1. Create fee_notices table
 * 2. Add student_code / school_id / updated_at to grades if missing
 * 3. Create grade_records view
 * 4. Add parent_id to students if missing
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌  Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

async function sql(query, label) {
  const { error } = await supabase.rpc('exec_sql', { query }).catch(() => ({ error: null }));
  // exec_sql may not exist; fall through to direct REST if needed
  if (!error) { console.log(`✅  ${label}`); return; }

  // Fallback: use postgrest rpc or direct SQL via management API
  // Since exec_sql might not be available, use the Supabase REST /rest/v1/rpc/exec_sql
  // We'll use fetch directly against Supabase Management API
  const resp = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_SERVICE_ROLE_KEY,
      'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
    },
    body: JSON.stringify({ query }),
  });

  if (!resp.ok) {
    const body = await resp.text();
    console.warn(`⚠️  ${label}: ${body.slice(0, 200)}`);
  } else {
    console.log(`✅  ${label}`);
  }
}

async function run() {
  console.log('🚀 Running migrations via Supabase JS...\n');

  const steps = [
    {
      label: 'Create fee_notices table',
      query: `
        CREATE TABLE IF NOT EXISTS public.fee_notices (
          id BIGSERIAL PRIMARY KEY,
          school_id VARCHAR(64) NOT NULL DEFAULT '1',
          student_id BIGINT REFERENCES public.students(id) ON DELETE SET NULL,
          student_code VARCHAR(50) NOT NULL,
          class_id VARCHAR(50),
          subject_fees JSONB DEFAULT '{}'::jsonb,
          other_fees JSONB DEFAULT '{}'::jsonb,
          total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
          payment_status VARCHAR(20) NOT NULL DEFAULT 'unpaid'
            CHECK (payment_status IN ('unpaid', 'partial', 'paid')),
          payment_method VARCHAR(20)
            CHECK (payment_method IN ('online', 'cash') OR payment_method IS NULL),
          paid_at TIMESTAMPTZ,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        );
      `,
    },
    {
      label: 'Indexes on fee_notices',
      query: `
        CREATE INDEX IF NOT EXISTS idx_fee_notices_school ON public.fee_notices(school_id);
        CREATE INDEX IF NOT EXISTS idx_fee_notices_student_code ON public.fee_notices(student_code);
        CREATE INDEX IF NOT EXISTS idx_fee_notices_status ON public.fee_notices(payment_status);
      `,
    },
    {
      label: 'RLS on fee_notices',
      query: `
        ALTER TABLE public.fee_notices ENABLE ROW LEVEL SECURITY;
        DROP POLICY IF EXISTS "Allow all fee_notices" ON public.fee_notices;
        CREATE POLICY "Allow all fee_notices" ON public.fee_notices USING (true) WITH CHECK (true);
      `,
    },
    {
      label: 'Add student_code to grades (if missing)',
      query: `ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS student_code VARCHAR(50);`,
    },
    {
      label: 'Add school_id to grades (if missing)',
      query: `ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS school_id VARCHAR(64) NOT NULL DEFAULT '1';`,
    },
    {
      label: 'Add updated_at to grades (if missing)',
      query: `ALTER TABLE public.grades ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW();`,
    },
    {
      label: 'Create grade_records view',
      query: `
        CREATE OR REPLACE VIEW public.grade_records AS
        SELECT
          g.id,
          g.school_id,
          g.student_code,
          g.subject_name,
          g.midterm_score,
          g.final_score,
          g.average_score,
          g.semester,
          g.academic_year,
          g.created_at,
          g.updated_at,
          s.full_name,
          s.class_name
        FROM public.grades g
        LEFT JOIN public.students s
          ON g.student_code = s.student_code AND g.school_id = s.school_id;
      `,
    },
    {
      label: 'Add parent_id to students (if missing)',
      query: `ALTER TABLE public.students ADD COLUMN IF NOT EXISTS parent_id BIGINT;`,
    },
    {
      label: 'Index parent_id on students',
      query: `CREATE INDEX IF NOT EXISTS idx_students_parent_id ON public.students(parent_id);`,
    },
  ];

  // Use supabase-js .rpc or direct pg via postgrest
  // Supabase JS doesn't support raw SQL directly; use the pg endpoint
  const baseUrl = SUPABASE_URL;
  const anonKey = SUPABASE_SERVICE_ROLE_KEY;

  for (const step of steps) {
    try {
      const resp = await fetch(`${baseUrl}/rest/v1/rpc/exec_sql`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': anonKey,
          'Authorization': `Bearer ${anonKey}`,
          'Prefer': 'return=minimal',
        },
        body: JSON.stringify({ query: step.query.trim() }),
      });

      if (!resp.ok) {
        const body = await resp.text();
        // exec_sql rpc doesn't exist by default - that's expected
        if (body.includes('exec_sql') || body.includes('42883')) {
          console.log(`ℹ️   ${step.label}: exec_sql RPC not available, skipping auto-run`);
          console.log(`    ▶ Run manually:\n${step.query.trim().split('\n').map(l => '    ' + l).join('\n')}\n`);
        } else {
          console.warn(`⚠️  ${step.label} failed: ${body.slice(0, 300)}`);
        }
      } else {
        console.log(`✅  ${step.label}`);
      }
    } catch (e) {
      console.warn(`⚠️  ${step.label}: ${e.message}`);
    }
  }

  console.log('\n📋 If any step above shows "exec_sql not available", run the SQL manually in Supabase SQL Editor.');
  console.log('📋 See: backend/scripts/migrate_fee_notices.sql for the full SQL to paste.\n');
}

run().catch(console.error);
