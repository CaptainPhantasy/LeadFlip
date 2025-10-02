#!/usr/bin/env node

/**
 * Run database migration directly using PostgreSQL connection
 * This script executes the initial schema migration
 */

const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env.local') });

async function runMigration() {
  const { Client } = require('pg');

  const databaseUrl = process.env.DATABASE_URL;

  if (!databaseUrl) {
    console.error('❌ Missing DATABASE_URL in .env.local');
    console.log('\n📋 Please execute the migration manually via Supabase Dashboard:');
    console.log('1. Go to: https://plmnuogbbkgsatfmkyxm.supabase.co');
    console.log('2. Navigate to SQL Editor');
    console.log('3. Copy contents of: supabase/migrations/20250930000000_initial_schema.sql');
    console.log('4. Paste and click Run\n');
    process.exit(1);
  }

  console.log('📦 Connecting to PostgreSQL...');
  const client = new Client({ connectionString: databaseUrl });

  try {
    await client.connect();
    console.log('✅ Connected successfully');

    // Read migration file
    const migrationPath = path.join(__dirname, '../supabase/migrations/20250930000000_initial_schema.sql');
    console.log('📄 Reading migration file:', migrationPath);
    const sql = fs.readFileSync(migrationPath, 'utf8');

    console.log('🚀 Executing migration...\n');

    // Execute the migration
    await client.query(sql);

    console.log('✅ Migration executed successfully!');
    console.log('\n📊 Tables created:');
    console.log('   - users');
    console.log('   - leads');
    console.log('   - businesses');
    console.log('   - matches');
    console.log('   - calls');
    console.log('   - conversions');
    console.log('\n🔒 RLS policies enabled for all tables');
    console.log('📍 PostGIS extension enabled for geographic queries\n');

    await client.end();
  } catch (error) {
    console.error('❌ Migration failed:', error.message);
    await client.end();
    throw error;
  }
}

runMigration().catch(error => {
  console.error('❌ Migration failed:', error.message);
  console.log('\n📋 Manual migration instructions:');
  console.log('1. Go to: https://plmnuogbbkgsatfmkyxm.supabase.co');
  console.log('2. Navigate to SQL Editor');
  console.log('3. Copy contents of: supabase/migrations/20250930000000_initial_schema.sql');
  console.log('4. Paste and click Run\n');
  process.exit(1);
});
