#!/usr/bin/env node
/**
 * Register users via API then promote to admin
 */

const axios = require('axios');

const API_BASE = 'http://localhost:3000/api/v1';

async function registerUser(email, password, fullName, linkCode) {
  try {
    const response = await axios.post(`${API_BASE}/auth/register-parent`, {
      email,
      password,
      full_name: fullName,
      link_code: linkCode,
      school_id: '1'
    });
    
    if (response.data.ok) {
      console.log(`✅ Registered: ${email}`);
      return response.data.user?.id;
    }
  } catch (error) {
    if (error.response?.data?.error?.includes('already')) {
      console.log(`⚠️  ${email} already exists`);
      return null;
    }
    console.error(`❌ Failed to register ${email}:`, error.response?.data?.error || error.message);
    return null;
  }
}

async function main() {
  console.log('🚀 Registering test users via API...\n');
  
  // Register parent (normal flow)
  await registerUser('parent@test.com', 'parent123', 'Phu Huynh Test', 'LINK123');
  
  // Register admin (as parent first, then manually change role in DB)
  const adminId = await registerUser('admin@school.edu', 'admin123', 'Admin School', 'LINK123');
  
  console.log('\n⚠️  NOTE: To make admin@school.edu an actual admin:');
  console.log('   Run this SQL in Supabase Dashboard:');
  console.log(`   UPDATE user_profiles SET role = 'admin' WHERE id = (SELECT id FROM auth.users WHERE email = 'admin@school.edu');`);
  console.log('\n🎉 Test users ready!');
  console.log('   parent@test.com / parent123 (parent role)');
  console.log('   admin@school.edu / admin123 (need manual role change to admin)');
}

main().catch(console.error);
