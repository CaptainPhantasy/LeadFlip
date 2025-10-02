-- Fix user_id column type to match Clerk's string IDs (not UUIDs)
-- Comprehensive approach: Disable RLS, drop all constraints, alter types

-- =====================================================================
-- STEP 1: Disable RLS on all tables
-- This removes policy dependencies without having to enumerate every policy
-- =====================================================================
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversions DISABLE ROW LEVEL SECURITY;
ALTER TABLE users DISABLE ROW LEVEL SECURITY;

-- =====================================================================
-- STEP 2: Drop all foreign key constraints that reference user_id
-- =====================================================================
ALTER TABLE IF EXISTS businesses
  DROP CONSTRAINT IF EXISTS businesses_user_id_fkey;

ALTER TABLE IF EXISTS leads
  DROP CONSTRAINT IF EXISTS leads_user_id_fkey;

ALTER TABLE IF EXISTS matches
  DROP CONSTRAINT IF EXISTS matches_business_id_fkey,
  DROP CONSTRAINT IF EXISTS matches_user_id_fkey;

ALTER TABLE IF EXISTS calls
  DROP CONSTRAINT IF EXISTS calls_business_id_fkey,
  DROP CONSTRAINT IF EXISTS calls_user_id_fkey,
  DROP CONSTRAINT IF EXISTS calls_consumer_id_fkey;

ALTER TABLE IF EXISTS conversions
  DROP CONSTRAINT IF EXISTS conversions_business_id_fkey,
  DROP CONSTRAINT IF EXISTS conversions_user_id_fkey;

-- =====================================================================
-- STEP 3: Alter user_id columns from UUID to TEXT
-- Using USING clause to safely cast existing UUID data to TEXT
-- =====================================================================
ALTER TABLE businesses
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

ALTER TABLE leads
  ALTER COLUMN user_id TYPE TEXT USING user_id::text;

-- Check if matches has user_id column and alter it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'matches' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE matches ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;
END $$;

-- Check if calls has user_id or consumer_id and alter them
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE calls ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;

  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'consumer_id'
  ) THEN
    ALTER TABLE calls ALTER COLUMN consumer_id TYPE TEXT USING consumer_id::text;
  END IF;
END $$;

-- Check if conversions has user_id and alter it
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'conversions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE conversions ALTER COLUMN user_id TYPE TEXT USING user_id::text;
  END IF;
END $$;

-- Check if users table exists and has id column (should be TEXT for Clerk)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'users' AND column_name = 'id' AND data_type = 'uuid'
  ) THEN
    ALTER TABLE users ALTER COLUMN id TYPE TEXT USING id::text;
  END IF;
END $$;

-- =====================================================================
-- STEP 4: Add explanatory comments
-- =====================================================================
COMMENT ON COLUMN businesses.user_id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';
COMMENT ON COLUMN leads.user_id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';

COMMENT ON TABLE businesses IS 'RLS disabled - using service role with application-level auth via Clerk';
COMMENT ON TABLE leads IS 'RLS disabled - using service role with application-level auth via Clerk';
COMMENT ON TABLE matches IS 'RLS disabled - using service role with application-level auth via Clerk';
COMMENT ON TABLE calls IS 'RLS disabled - using service role with application-level auth via Clerk';

-- =====================================================================
-- STEP 5: Verification
-- =====================================================================
-- This query will show the current data types for user_id columns
SELECT
  table_name,
  column_name,
  data_type
FROM information_schema.columns
WHERE column_name LIKE '%user_id%'
  AND table_schema = 'public'
ORDER BY table_name, column_name;
