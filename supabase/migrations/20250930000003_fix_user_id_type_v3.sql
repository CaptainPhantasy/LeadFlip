-- Fix user_id column type to match Clerk's string IDs (not UUIDs)
-- Must drop ALL RLS policies first, then alter column

-- Step 1: Drop ALL RLS policies on all tables
-- (Easier than finding each one individually)

-- Leads table policies
DROP POLICY IF EXISTS "Businesses can view matched leads" ON leads;
DROP POLICY IF EXISTS "Consumers can view own leads" ON leads;
DROP POLICY IF EXISTS "Consumers can create leads" ON leads;

-- Businesses table policies
DROP POLICY IF EXISTS "Businesses can view their profile" ON businesses;
DROP POLICY IF EXISTS "Businesses can update their profile" ON businesses;

-- Matches table policies
DROP POLICY IF EXISTS "Businesses can view own matches" ON matches;
DROP POLICY IF EXISTS "Businesses can update match status" ON matches;

-- Calls table policies
DROP POLICY IF EXISTS "Businesses can view own calls" ON calls;
DROP POLICY IF EXISTS "Consumers can view own calls" ON calls;

-- Step 2: Drop foreign key constraints if they exist
ALTER TABLE IF EXISTS businesses
  DROP CONSTRAINT IF EXISTS businesses_user_id_fkey;

ALTER TABLE IF EXISTS leads
  DROP CONSTRAINT IF EXISTS leads_user_id_fkey;

ALTER TABLE IF EXISTS matches
  DROP CONSTRAINT IF EXISTS matches_business_id_fkey;

ALTER TABLE IF EXISTS calls
  DROP CONSTRAINT IF EXISTS calls_business_id_fkey;

-- Step 3: Change user_id from UUID to TEXT
ALTER TABLE businesses
  ALTER COLUMN user_id TYPE TEXT;

ALTER TABLE leads
  ALTER COLUMN user_id TYPE TEXT;

-- Step 4: Add comments explaining the user_id format
COMMENT ON COLUMN businesses.user_id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';
COMMENT ON COLUMN leads.user_id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';

-- Step 5: RLS is already disabled per migration 20250930000002
-- We're using service role key with application-level auth via Clerk
-- Policies are not needed since RLS is disabled
