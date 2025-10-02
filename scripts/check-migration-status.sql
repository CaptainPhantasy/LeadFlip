-- ============================================================================
-- DATABASE MIGRATION STATUS CHECK
-- Generated: October 1, 2025
-- Purpose: Verify current schema state and identify missing migrations
-- ============================================================================

-- Check if migration tracking table exists
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_name = 'schema_migrations'
) AS migration_table_exists;

-- Check for Supabase migration tracking
SELECT EXISTS (
  SELECT FROM information_schema.tables
  WHERE table_schema = 'supabase_migrations'
  AND table_name = 'schema_migrations'
) AS supabase_migrations_exists;

-- List all tables in public schema
SELECT table_name, table_type
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;

-- Check for PostGIS extension
SELECT EXISTS (
  SELECT FROM pg_extension WHERE extname = 'postgis'
) AS postgis_enabled;

-- Check users table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'users' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check leads table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'leads' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check businesses table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'businesses' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check matches table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'matches' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check calls table structure
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'calls' AND table_schema = 'public'
ORDER BY ordinal_position;

-- Check RLS status
SELECT schemaname, tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- Check all user_id related columns and their types
SELECT table_name, column_name, data_type, udt_name
FROM information_schema.columns
WHERE column_name LIKE '%user_id%' OR column_name = 'id'
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- Check indexes on critical tables
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND tablename IN ('users', 'leads', 'businesses', 'matches', 'calls')
ORDER BY tablename, indexname;

-- ============================================================================
-- END OF VERIFICATION SCRIPT
-- ============================================================================
