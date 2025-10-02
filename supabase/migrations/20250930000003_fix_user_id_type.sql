-- Fix user_id column type to match Clerk's string IDs (not UUIDs)

-- Drop foreign key constraint if it exists
ALTER TABLE IF EXISTS businesses
  DROP CONSTRAINT IF EXISTS businesses_user_id_fkey;

ALTER TABLE IF EXISTS leads
  DROP CONSTRAINT IF EXISTS leads_user_id_fkey;

ALTER TABLE IF EXISTS matches
  DROP CONSTRAINT IF EXISTS matches_business_id_fkey;

ALTER TABLE IF EXISTS calls
  DROP CONSTRAINT IF EXISTS calls_business_id_fkey;

-- Change user_id from UUID to TEXT in businesses table
ALTER TABLE businesses
  ALTER COLUMN user_id TYPE TEXT;

-- Change user_id from UUID to TEXT in leads table
ALTER TABLE leads
  ALTER COLUMN user_id TYPE TEXT;

-- Change business_id from UUID to TEXT in matches table (references businesses.id)
-- Note: We'll keep businesses.id as UUID for internal use, only user_id changes to TEXT

-- Add comment explaining the user_id format
COMMENT ON COLUMN businesses.user_id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';
COMMENT ON COLUMN leads.user_id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';
