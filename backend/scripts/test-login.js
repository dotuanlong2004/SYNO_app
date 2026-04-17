#!/usr/bin/env node
/**
 * Test login API directly
 */

const axios = require('axios');
require('dotenv').config();

const API_BASE = 'http://127.0.0.1:3000/api/v1';

async function testLogin(email, password) {
  try {
    console.log(`\n🔍 Testing login: ${email}`);
    const response = await axios.post(`${API_BASE}/auth/login`, {
      email,
      password
    });
    
    if (response.data.ok) {
      console.log('✅ LOGIN SUCCESS');
      console.log('   Token:', response.data.access_token?.substring(0, 30) + '...');
      console.log('   User:', response.data.user?.full_name);
      console.log('   Role:', response.data.user?.role);
      return true;
    }
  } catch (error) {
    console.log('❌ LOGIN FAILED:', error.response?.data?.error || error.message);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing API Login...\n');

  const adminEmail = process.env.TEST_ADMIN_EMAIL || 'admin@school.edu';
  const adminPassword = process.env.TEST_ADMIN_PASSWORD || 'admin123';
  const parentEmail = process.env.TEST_PARENT_EMAIL || 'parent@test.com';
  const parentPassword = process.env.TEST_PARENT_PASSWORD || 'parent123';

  // Test both accounts
  const adminOk = await testLogin(adminEmail, adminPassword);
  const parentOk = await testLogin(parentEmail, parentPassword);
  
  console.log('\n' + '='.repeat(40));
  if (adminOk && parentOk) {
    console.log('✅ All tests passed!');
    console.log('The issue is in Flutter app, not backend.');
  } else {
    console.log('❌ API login failed');
    console.log('Likely corrupted auth rows for those emails (not just password hash).');
    console.log('Tip: set TEST_* env vars to switch to newly created accounts without changing this file.');
    
    // Show SQL to fix
    console.log('\n📝 Run this in Supabase SQL Editor:');
    console.log(`
BEGIN;
DELETE FROM auth.identities
WHERE user_id IN (
  SELECT id FROM auth.users WHERE email IN ('admin@school.edu', 'parent@test.com')
);

DELETE FROM public.user_profiles
WHERE id IN (
  SELECT id FROM auth.users WHERE email IN ('admin@school.edu', 'parent@test.com')
);

DELETE FROM auth.users
WHERE email IN ('admin@school.edu', 'parent@test.com');
COMMIT;

-- Then run:
-- node scripts/create-test-users.js
    `);
  }
}

main().catch(console.error);
