-- =====================================================================
-- Final Migration: Fix user_id UUID → TEXT for Clerk compatibility
-- Based on actual policy discovery
-- =====================================================================

-- Step 1: Drop all RLS policies that depend on user_id columns
DROP POLICY IF EXISTS "Allow authenticated business access" ON public.businesses;
DROP POLICY IF EXISTS "Users can view own calls" ON public.calls;
DROP POLICY IF EXISTS "Users can view own conversions" ON public.conversions;
DROP POLICY IF EXISTS "Businesses can view matched leads" ON public.leads;
DROP POLICY IF EXISTS "Users can create own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can update own leads" ON public.leads;
DROP POLICY IF EXISTS "Users can view own leads" ON public.leads;
DROP POLICY IF EXISTS "Businesses can update own matches" ON public.matches;
DROP POLICY IF EXISTS "Businesses can view own matches" ON public.matches;
DROP POLICY IF EXISTS "Consumers can view own lead matches" ON public.matches;
DROP POLICY IF EXISTS "Users can update own profile" ON public.users;
DROP POLICY IF EXISTS "Users can view own profile" ON public.users;

-- Step 2: Drop foreign key constraints
ALTER TABLE IF EXISTS public.businesses
  DROP CONSTRAINT IF EXISTS businesses_user_id_fkey;

ALTER TABLE IF EXISTS public.leads
  DROP CONSTRAINT IF EXISTS leads_user_id_fkey;

ALTER TABLE IF EXISTS public.calls
  DROP CONSTRAINT IF EXISTS calls_initiator_id_fkey;

-- Step 3: Alter column types from UUID to TEXT
ALTER TABLE public.users
  ALTER COLUMN id TYPE text USING id::text;

ALTER TABLE public.businesses
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.leads
  ALTER COLUMN user_id TYPE text USING user_id::text;

ALTER TABLE public.calls
  ALTER COLUMN initiator_id TYPE text USING initiator_id::text;

-- Step 4: Add comments
COMMENT ON COLUMN users.id IS 'Clerk user ID (text format: user_xxxxx)';
COMMENT ON COLUMN businesses.user_id IS 'Clerk user ID (text format: user_xxxxx)';
COMMENT ON COLUMN leads.user_id IS 'Clerk user ID (text format: user_xxxxx)';
COMMENT ON COLUMN calls.initiator_id IS 'Clerk user ID (text format: user_xxxxx)';

-- Step 5: Recreate foreign keys (now TEXT → TEXT)
ALTER TABLE public.businesses
  ADD CONSTRAINT businesses_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.leads
  ADD CONSTRAINT leads_user_id_fkey
  FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;

ALTER TABLE public.calls
  ADD CONSTRAINT calls_initiator_id_fkey
  FOREIGN KEY (initiator_id) REFERENCES public.users(id) ON DELETE SET NULL;

-- Step 6: Verification queries
-- Check column types
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    (table_name = 'users' AND column_name = 'id') OR
    (table_name = 'businesses' AND column_name = 'user_id') OR
    (table_name = 'leads' AND column_name = 'user_id') OR
    (table_name = 'calls' AND column_name = 'initiator_id')
  )
ORDER BY table_name, column_name;

-- Check recreated foreign keys
SELECT
  tc.table_name,
  tc.constraint_name,
  kcu.column_name,
  ccu.table_name AS foreign_table,
  ccu.column_name AS foreign_column
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
  AND tc.constraint_schema = kcu.constraint_schema
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
  AND ccu.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
  AND tc.table_name IN ('businesses','leads','calls')
ORDER BY tc.table_name, tc.constraint_name;
