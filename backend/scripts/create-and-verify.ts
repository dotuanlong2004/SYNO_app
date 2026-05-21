#!/usr/bin/env node
/**
 * Create users and verify - runs until success
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(
  process.env.SUPABASE_URL, 
  process.env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const API_BASE = 'http://127.0.0.1:3000/api/v1';

const TEST_USERS = [
  { email: 'admin@school.edu', password: 'admin123', role: 'admin', full_name: 'Admin School' },
  { email: 'parent@test.com', password: 'parent123', role: 'parent', full_name: 'Phu Huynh Test', student_code: 'TEST001' }
];

async function createUser(userData) {
  try {
    console.log(`\n📝 Creating ${userData.email}...`);
    
    // 1. Create auth user
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: userData.email,
      password: userData.password,
      email_confirm: true,
      user_metadata: {
        full_name: userData.full_name,
        role: userData.role,
        school_id: '1',
        ...(userData.student_code && { student_code: userData.student_code })
      }
    });

    if (authError) {
      if (authError.message.includes('already been registered')) {
        console.log(`   ⚠️ User exists, skipping creation`);
        // Get existing user ID
        const { data: existing } = await supabase.auth.admin.listUsers();
        const user = existing.users.find(u => u.email === userData.email);
        return user?.id;
      }
      console.log(`   ❌ Auth error: ${authError.message}`);
      return null;
    }

    console.log(`   ✅ Auth user created: ${authData.user.id}`);
    return authData.user.id;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return null;
  }
}

async function createProfile(userId, userData) {
  try {
    console.log(`   📝 Creating profile...`);
    
    const { error } = await supabase
      .from('user_profiles')
      .upsert({
        id: userId,
        full_name: userData.full_name,
        role: userData.role,
        school_id: '1',
        email: userData.email,
        student_code: userData.student_code || null
      }, { onConflict: 'id' });

    if (error) {
      console.log(`   ❌ Profile error: ${error.message}`);
      return false;
    }

    console.log(`   ✅ Profile created`);
    return true;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return false;
  }
}

async function testLogin(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { 
      email, 
      password 
    }, { timeout: 5000 });
    
    return response.data.ok;
  } catch (error) {
    console.log(`   ❌ Login test failed: ${error.response?.data?.error || error.message}`);
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🚀 TẠO USER VÀ TEST - Chạy đến khi thành công');
  console.log('='.repeat(60));

  let allSuccess = false;
  let attempts = 0;
  const maxAttempts = 3;

  while (!allSuccess && attempts < maxAttempts) {
    attempts++;
    console.log(`\n📦 Lần thử thứ ${attempts}/${maxAttempts}`);
    console.log('-'.repeat(60));

    allSuccess = true;

    for (const user of TEST_USERS) {
      // Create user
      const userId = await createUser(user);
      if (!userId) {
        allSuccess = false;
        continue;
      }

      // Create profile
      const profileOk = await createProfile(userId, user);
      if (!profileOk) {
        allSuccess = false;
        continue;
      }

      // Test login
      console.log(`   🧪 Testing login...`);
      const loginOk = await testLogin(user.email, user.password);
      
      if (loginOk) {
        console.log(`   ✅ LOGIN WORKS!`);
      } else {
        console.log(`   ❌ Login failed`);
        allSuccess = false;
      }
    }

    if (allSuccess) break;
    
    if (attempts < maxAttempts) {
      console.log('\n⏳ Đợi 2 giây trước khi thử lại...');
      await new Promise(r => setTimeout(r, 2000));
    }
  }

  console.log('\n' + '='.repeat(60));
  if (allSuccess) {
    console.log('✅ THÀNH CÔNG! Tất cả user đã tạo và test OK');
    console.log('\n📋 Tài khoản test:');
    console.log('   Admin:  admin@school.edu / admin123');
    console.log('   Parent: parent@test.com / parent123');
    console.log('\n🎯 Giờ có thể đăng nhập trên Flutter app!');
  } else {
    console.log('❌ THẤT BẠI sau 3 lần thử');
    console.log('💡 Cách khác: Tạo user trực tiếp trong Supabase Dashboard');
    console.log('   https://app.supabase.com/project/bimepdqcwpsynjimvenn/auth/users');
  }
  console.log('='.repeat(60));
}

main().catch(err => {
  console.error('💥 Lỗi nghiêm trọng:', err);
  process.exit(1);
});
