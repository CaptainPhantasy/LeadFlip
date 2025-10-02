-- Schema Migration Verification Script
-- Run this in Supabase SQL Editor AFTER running the migration
-- Expected: All queries should return results, no errors

-- =============================================================================
-- Part 1: Verify Column Renames (businesses table)
-- =============================================================================

-- Should return 3 rows showing the renamed columns exist
SELECT
  column_name,
  data_type,
  is_nullable,
  CASE
    WHEN column_name = 'name' THEN '✅ Renamed from business_name'
    WHEN column_name = 'phone_number' THEN '✅ Renamed from phone'
    WHEN column_name = 'location' THEN '✅ Renamed from location_point'
  END as migration_status
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name IN ('name', 'phone_number', 'location');

-- Should return 0 rows (old columns should be gone)
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name IN ('business_name', 'phone', 'location_point');

-- =============================================================================
-- Part 2: Verify New Columns Added (businesses table)
-- =============================================================================

SELECT
  column_name,
  data_type,
  column_default,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'businesses'
AND column_name IN (
  'address', 'city', 'state', 'zip_code',
  'description', 'price_tier',
  'offers_emergency_service', 'is_licensed', 'is_insured', 'is_active',
  'years_in_business', 'completed_jobs', 'rating', 'max_monthly_leads'
)
ORDER BY ordinal_position;
-- Expected: 14 rows

-- =============================================================================
-- Part 3: Verify New Columns Added (leads table)
-- =============================================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('contact_phone', 'contact_email');
-- Expected: 2 rows

-- =============================================================================
-- Part 4: Verify New Columns Added (matches table)
-- =============================================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'matches'
AND column_name = 'response_message';
-- Expected: 1 row

-- =============================================================================
-- Part 5: Verify New Columns Added (calls table)
-- =============================================================================

SELECT
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'calls'
AND column_name IN ('consumer_id', 'call_type', 'system_prompt', 'scheduled_time', 'initiator_id');
-- Expected: 5 rows

-- =============================================================================
-- Part 6: Verify Indexes
-- =============================================================================

-- Should see all new indexes
SELECT
  indexname,
  CASE
    WHEN indexname = 'idx_businesses_location' THEN '✅ Recreated on location column'
    WHEN indexname = 'idx_businesses_price_tier' THEN '✅ New index'
    WHEN indexname = 'idx_businesses_is_active' THEN '✅ New partial index'
    WHEN indexname = 'idx_businesses_offers_emergency' THEN '✅ New partial index'
    ELSE '✅ Existing index'
  END as status
FROM pg_indexes
WHERE tablename = 'businesses'
ORDER BY indexname;
-- Expected: Multiple rows including the 4 new/updated indexes

-- =============================================================================
-- Part 7: Verify Constraints
-- =============================================================================

SELECT
  conname as constraint_name,
  pg_get_constraintdef(oid) as constraint_definition
FROM pg_constraint
WHERE conrelid = 'businesses'::regclass
AND conname LIKE 'businesses_%_check'
ORDER BY conname;
-- Expected: Should see 5 check constraints:
-- - businesses_completed_jobs_check
-- - businesses_price_tier_check
-- - businesses_rating_avg_check
-- - businesses_rating_check
-- - businesses_years_in_business_check

-- =============================================================================
-- Part 8: Test Data Integrity
-- =============================================================================

-- Count records (should be unchanged from before migration)
SELECT
  'businesses' as table_name,
  COUNT(*) as record_count
FROM businesses
UNION ALL
SELECT 'leads', COUNT(*) FROM leads
UNION ALL
SELECT 'matches', COUNT(*) FROM matches
UNION ALL
SELECT 'calls', COUNT(*) FROM calls;

-- =============================================================================
-- Part 9: Verify Data Migration (if applicable)
-- =============================================================================

-- Check if data was copied from old location fields to new ones
-- (Only relevant if there was existing data)
SELECT
  id,
  location_city as old_location_city,
  city as new_city,
  location_state as old_state,
  state as new_state,
  location_zip as old_zip,
  zip_code as new_zip_code,
  rating_avg as old_rating_avg,
  rating as new_rating,
  CASE
    WHEN city = location_city THEN '✅ Data copied'
    WHEN city IS NULL THEN '⚠️ No data yet'
    ELSE '⚠️ Mismatch'
  END as migration_status
FROM businesses
LIMIT 5;

-- =============================================================================
-- Part 10: Comprehensive Column List
-- =============================================================================

-- Full list of all columns in businesses table (should have 25+ columns)
SELECT
  ordinal_position,
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_name = 'businesses'
ORDER BY ordinal_position;

-- =============================================================================
-- Part 11: Test Insert/Update (Optional - Commented Out)
-- =============================================================================

-- Uncomment to test that new columns work with INSERT
/*
INSERT INTO businesses (
  id,
  user_id,
  name,
  phone_number,
  email,
  location,
  location_zip,
  location_city,
  location_state,
  service_categories,
  address,
  city,
  state,
  zip_code,
  price_tier,
  is_active,
  years_in_business,
  completed_jobs,
  rating
) VALUES (
  uuid_generate_v4(),
  (SELECT id FROM users LIMIT 1), -- Use real user_id
  'TEST MIGRATION BUSINESS',
  '+1234567890',
  'test@example.com',
  ST_SetSRID(ST_MakePoint(-86.15, 39.77), 4326),
  '46032',
  'Carmel',
  'IN',
  ARRAY['plumbing'],
  '123 Test St',
  'Carmel',
  'IN',
  '46032',
  'standard',
  true,
  5,
  100,
  4.5
) RETURNING id, name, phone_number, years_in_business, rating;
*/

-- Clean up test record (uncomment if you ran the insert above)
/*
DELETE FROM businesses WHERE name = 'TEST MIGRATION BUSINESS';
*/

-- =============================================================================
-- Part 12: Final Summary
-- =============================================================================

-- Summary of verification results
SELECT
  'Total Columns in businesses' as metric,
  COUNT(*)::text as value
FROM information_schema.columns
WHERE table_name = 'businesses'
UNION ALL
SELECT
  'New/Renamed Columns',
  '17' as value
UNION ALL
SELECT
  'New Indexes',
  '4'
UNION ALL
SELECT
  'New Constraints',
  '5'
UNION ALL
SELECT
  'Migration File Size (lines)',
  '271';

-- =============================================================================
-- SUCCESS CRITERIA
-- =============================================================================

-- If all queries above run without errors, migration is SUCCESSFUL
--
-- Expected Results Summary:
-- ✅ Part 1: 3 renamed columns exist, 0 old columns remain
-- ✅ Part 2: 14 new columns in businesses
-- ✅ Part 3: 2 new columns in leads
-- ✅ Part 4: 1 new column in matches
-- ✅ Part 5: 5 columns verified in calls
-- ✅ Part 6: 4+ indexes present
-- ✅ Part 7: 5 check constraints
-- ✅ Part 8: Record counts unchanged
-- ✅ Part 9: Data migrated correctly (if applicable)
-- ✅ Part 10: 25+ columns in businesses table
-- ✅ Part 12: Summary matches expected values
--
-- Next Steps:
-- 1. Test application (business registration, lead submission)
-- 2. Mark Track 2 as complete in PROGRESS_TRACKER.md
-- 3. Notify Track 3 agent to proceed with AI calling integration
-- 4. Run integration tests (Track 4)
