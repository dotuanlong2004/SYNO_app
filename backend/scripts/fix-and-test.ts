#!/usr/bin/env node
/**
 * Fix passwords and test login automatically
 */

const { createClient } = require('@supabase/supabase-js');
const axios = require('axios');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const API_BASE = 'http://127.0.0.1:3000/api/v1';

async function fixPassword(email, password) {
  try {
    // Use Supabase Auth Admin to update password
    const { data: user } = await supabase
      .from('auth')
      .select('id')
      .eq('email', email)
      .single();
    
    if (!user) {
      console.log(`❌ User ${email} not found`);
      return false;
    }
    
    // Update password via admin API
    const { error } = await supabase.auth.admin.updateUserById(
      user.id,
      { password: password }
    );
    
    if (error) {
      console.log(`❌ Failed to update ${email}:`, error.message);
      return false;
    }
    
    console.log(`✅ Fixed password for ${email}`);
    return true;
  } catch (err) {
    console.log(`❌ Error fixing ${email}:`, err.message);
    return false;
  }
}

async function testLogin(email, password) {
  try {
    const response = await axios.post(`${API_BASE}/auth/login`, { email, password });
    return response.data.ok;
  } catch (error) {
    return false;
  }
}

async function main() {
  console.log('🔧 Fixing passwords...\n');
  
  // Fix passwords
  await fixPassword('admin@school.edu', 'admin123');
  await fixPassword('parent@test.com', 'parent123');
  
  console.log('\n🧪 Testing login after fix...\n');
  
  // Test
  const adminOk = await testLogin('admin@school.edu', 'admin123');
  const parentOk = await testLogin('parent@test.com', 'parent123');
  
  console.log('='.repeat(50));
  if (adminOk && parentOk) {
    console.log('✅ TẤT CẢ ĐÃ XONG!');
    console.log('   - Passwords fixed');
    console.log('   - Login working');
    console.log('   - Có thể test trên Flutter app ngay bây giờ');
  } else {
    console.log('❌ Vẫn lỗi - cần tạo lại user');
    console.log('  Admin OK:', adminOk);
    console.log('  Parent OK:', parentOk);
  }
  console.log('='.repeat(50));
}

main().catch(console.error);
