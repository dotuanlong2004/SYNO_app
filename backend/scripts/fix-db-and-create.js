#!/usr/bin/env node
/**
 * Fix database trigger and create users
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

async function fixDatabase() {
  console.log('🔧 Fixing database trigger...\n');
  
  // Xóa trigger lỗi
  const { error: dropError } = await supabase.rpc('exec_sql', {
    sql: `
      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      DROP FUNCTION IF EXISTS handle_new_user();
    `
  });
  
  if (dropError) {
    console.log('⚠️ Could not drop trigger (may not exist):', dropError.message);
  } else {
    console.log('✅ Dropped old trigger');
  }
  
  // Tạo trigger mới đúng
  const { error: createError } = await supabase.rpc('exec_sql', {
    sql: `
      CREATE OR REPLACE FUNCTION handle_new_user()
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.user_profiles (id, full_name, role, school_id, email)
        VALUES (
          NEW.id, 
          COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
          COALESCE(NEW.raw_user_meta_data->>'role', 'parent'),
          COALESCE(NEW.raw_user_meta_data->>'school_id', 'default_school'),
          NEW.email
        )
        ON CONFLICT (id) DO NOTHING;
        RETURN NEW;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT ON auth.users
        FOR EACH ROW
        EXECUTE FUNCTION handle_new_user();
    `
  });
  
  if (createError) {
    console.log('❌ Could not create trigger:', createError.message);
    return false;
  }
  
  console.log('✅ Fixed trigger\n');
  return true;
}

async function createUserDirect(email, password, metadata) {
  try {
    console.log(`📝 Creating ${email}...`);
    
    // Tạo qua admin API
    const { data, error } = await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: metadata
    });
    
    if (error) {
      console.log(`   ❌ ${error.message}`);
      return null;
    }
    
    console.log(`   ✅ Created: ${data.user.id}`);
    return data.user.id;
  } catch (err) {
    console.log(`   ❌ Error: ${err.message}`);
    return null;
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
    return false;
  }
}

async function main() {
  console.log('='.repeat(60));
  console.log('🔧 SỬA DATABASE VÀ TẠO USER');
  console.log('='.repeat(60));
  
  // Step 1: Fix trigger
  await fixDatabase();
  
  // Step 2: Create users
  const adminId = await createUserDirect('admin@school.edu', 'admin123', {
    full_name: 'Admin School',
    role: 'admin',
    school_id: 'default_school'
  });
  
  const parentId = await createUserDirect('parent@test.com', 'parent123', {
    full_name: 'Phu Huynh Test',
    role: 'parent', 
    school_id: 'default_school',
    student_code: 'TEST001'
  });
  
  // Step 3: Test
  console.log('\n🧪 Testing...');
  const adminOk = await testLogin('admin@school.edu', 'admin123');
  const parentOk = await testLogin('parent@test.com', 'parent123');
  
  console.log('\n' + '='.repeat(60));
  if (adminOk && parentOk) {
    console.log('✅ THÀNH CÔNG!');
    console.log('   Admin: ✓');
    console.log('   Parent: ✓');
    console.log('\n🎯 Hãy đăng nhập trên Flutter app!');
  } else {
    console.log('❌ VẪN LỖI');
    console.log('   Admin:', adminOk ? '✓' : '✗');
    console.log('   Parent:', parentOk ? '✓' : '✗');
    console.log('\n💡 Cách cuối: Tạo trực tiếp trong Dashboard');
  }
  console.log('='.repeat(60));
}

main().catch(console.error);
