const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Read .env.local file manually
const envPath = path.join(__dirname, '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const envVars = {};
envContent.split('\n').forEach(line => {
  if (line && !line.startsWith('#') && line.includes('=')) {
    const [key, ...valueParts] = line.split('=');
    envVars[key.trim()] = valueParts.join('=').trim();
  }
});

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

console.log('Connecting to Supabase:', supabaseUrl);

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

async function runMigration() {
  console.log('\n=== LeadFlip Database Migration ===\n');
  console.log('Note: This uses Supabase Management API to execute SQL.');
  console.log('You can also run this migration manually via Supabase Dashboard > SQL Editor\n');

  const migrationPath = './supabase/migrations/20250930000000_initial_schema.sql';
  console.log(`Reading migration file: ${migrationPath}`);
  const sql = fs.readFileSync(migrationPath, 'utf8');

  console.log('\nAttempting to execute migration via Management API...\n');

  // Use Supabase Management API
  const projectRef = supabaseUrl.match(/https:\/\/(.+)\.supabase\.co/)[1];
  const managementUrl = `https://api.supabase.com/v1/projects/${projectRef}/database/query`;

  try {
    const response = await fetch(managementUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${supabaseKey}`
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error('Management API returned error:', errorData);
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    const result = await response.json();
    console.log('✅ Migration executed successfully via Management API\n');

  } catch (err) {
    console.error('❌ Management API failed:', err.message);
    console.log('\n--- MANUAL MIGRATION INSTRUCTIONS ---');
    console.log('1. Open Supabase Dashboard: ' + supabaseUrl);
    console.log('2. Go to SQL Editor (left sidebar)');
    console.log('3. Click "New Query"');
    console.log('4. Copy the contents of: ' + migrationPath);
    console.log('5. Paste into SQL Editor and click "Run"');
    console.log('6. Verify tables are created in Table Editor\n');
    process.exit(1);
  }

  // Verify tables were created
  console.log('Verifying tables...\n');
  const tableNames = ['users', 'leads', 'businesses', 'matches', 'calls', 'conversions'];
  let allTablesExist = true;

  for (const tableName of tableNames) {
    const { data, error } = await supabase.from(tableName).select('*').limit(0);
    if (error) {
      console.log(`❌ ${tableName}: NOT FOUND`);
      allTablesExist = false;
    } else {
      console.log(`✅ ${tableName}: EXISTS`);
    }
  }

  if (allTablesExist) {
    console.log('\n🎉 All 6 tables created successfully!\n');
    console.log('Next steps:');
    console.log('- Phase 1 complete (100%)');
    console.log('- Ready to start Phase 2: Agent Architecture');
    console.log('- Run: npm run dev\n');
  } else {
    console.log('\n⚠️ Some tables were not created. Please check the migration manually.\n');
  }
}

runMigration().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
