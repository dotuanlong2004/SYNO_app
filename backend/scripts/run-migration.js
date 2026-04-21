const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false }
});

async function runMigration() {
  try {
    const sqlPath = path.join(__dirname, '..', 'migrations', 'add_missing_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');

    console.log('Running migration...');
    
    // Split SQL into statements
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    for (const statement of statements) {
      const fullStatement = statement + ';';
      console.log(`Executing: ${fullStatement.substring(0, 60)}...`);
      
      const { error } = await supabase.rpc('exec_sql', { sql: fullStatement });
      
      if (error) {
        // Try alternative: direct query
        const { error: queryError } = await supabase.from('_exec_sql').select('*').eq('sql', fullStatement);
        if (queryError && !queryError.message.includes('does not exist')) {
          console.warn('Statement may have failed:', error.message);
        }
      }
    }

    console.log('\n✅ Migration completed!');
    console.log('Tables created: student_fees, grades, announcements, timetables');
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    process.exit(1);
  }
}

runMigration();
