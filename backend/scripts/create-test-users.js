#!/usr/bin/env node
/**
 * Create test users using Supabase Admin API
 * This is more reliable than direct SQL inserts
 */

const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

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

async function createUsers() {
  console.log('🚀 Creating test users...\n');
  let createdCount = 0;

  // Test users
  const users = [
    {
      email: 'admin@school.edu',
      password: 'admin123',
      user_metadata: {
        full_name: 'Admin School',
        role: 'admin',
        school_id: 'default_school'
      }
    },
    {
      email: 'parent@test.com',
      password: 'parent123',
      user_metadata: {
        full_name: 'Phu Huynh Test',
        role: 'parent',
        school_id: 'default_school',
        student_code: 'TEST001'
      }
    }
  ];

  for (const userData of users) {
    try {
      // Create user with Admin API (never insert directly into auth.users)
      const { data, error } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: userData.user_metadata
      });

      if (error) {
        if (error.message.includes('already') || error.message.includes('checking email')) {
          console.error(`❌ ${userData.email} is in a broken/duplicate state. Delete this email from auth.users + auth.identities first, then rerun.`);
        } else {
          console.error(`❌ Failed to create ${userData.email}:`, error.message);
        }
        continue;
      }

      // Upsert profile to ensure role/full_name are aligned for app queries
      await supabase
        .from('user_profiles')
        .upsert({
          id: data.user.id,
          full_name: userData.user_metadata.full_name,
          role: userData.user_metadata.role,
          school_id: userData.user_metadata.school_id,
          student_code: userData.user_metadata.student_code || null,
          is_active: true
        }, { onConflict: 'id' });

      console.log(`✅ Created user: ${userData.email}`);
      console.log(`   ID: ${data.user.id}`);
      console.log(`   Role: ${userData.user_metadata.role}`);
      console.log('');
      createdCount += 1;
    } catch (err) {
      console.error(`❌ Error creating ${userData.email}:`, err.message);
    }
  }

  if (createdCount === users.length) {
    console.log('\n🎉 Done! You can now login with:');
    console.log('   Admin: admin@school.edu / admin123');
    console.log('   Parent: parent@test.com / parent123');
  } else {
    console.log('\n⚠️ Some users were not created. Run the cleanup SQL from scripts/test-login.js output, then rerun this script.');
  }
}

createUsers().catch(console.error);
