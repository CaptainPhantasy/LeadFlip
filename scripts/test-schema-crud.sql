-- ============================================================================
-- SCHEMA CRUD TEST SCRIPT
-- Purpose: Test basic CRUD operations on all core tables
-- Run this AFTER applying migrations to verify schema is functional
-- ============================================================================

-- Set transaction mode for safe testing
BEGIN;

-- ============================================================================
-- TEST 1: Users Table
-- ============================================================================
-- Insert test user
INSERT INTO users (id, email, full_name, role)
VALUES ('user_test_001', 'test@example.com', 'Test User', 'consumer');

-- Verify insert
SELECT * FROM users WHERE id = 'user_test_001';

-- Update test
UPDATE users SET full_name = 'Updated Test User' WHERE id = 'user_test_001';

-- Verify update
SELECT * FROM users WHERE id = 'user_test_001';

-- ============================================================================
-- TEST 2: Leads Table
-- ============================================================================
-- Insert test lead
INSERT INTO leads (
  user_id,
  problem_text,
  contact_phone,
  contact_email,
  service_category,
  urgency,
  budget_max,
  location_zip,
  quality_score,
  status
)
VALUES (
  'user_test_001',
  'Need plumber for water heater leak',
  '+13175551234',
  'test@example.com',
  'plumbing',
  'emergency',
  500,
  '46032',
  8.5,
  'pending'
);

-- Verify insert
SELECT id, user_id, problem_text, contact_phone, service_category, quality_score
FROM leads
WHERE user_id = 'user_test_001';

-- Store lead ID for later tests
DO $$
DECLARE
  test_lead_id UUID;
BEGIN
  SELECT id INTO test_lead_id FROM leads WHERE user_id = 'user_test_001' LIMIT 1;
  RAISE NOTICE 'Test lead ID: %', test_lead_id;
END $$;

-- ============================================================================
-- TEST 3: Businesses Table (with PostGIS location)
-- ============================================================================
-- Insert test business user
INSERT INTO users (id, email, full_name, role)
VALUES ('user_test_business', 'business@example.com', 'Test Business Owner', 'business');

-- Insert test business with PostGIS POINT
INSERT INTO businesses (
  user_id,
  name,
  phone_number,
  email,
  address,
  city,
  state,
  zip_code,
  location,  -- PostGIS POINT
  service_categories,
  price_tier,
  offers_emergency_service,
  is_licensed,
  is_insured,
  rating,
  years_in_business,
  completed_jobs,
  is_active
)
VALUES (
  'user_test_business',
  'Test Plumbing Co',
  '+13175555678',
  'business@example.com',
  '123 Main St',
  'Carmel',
  'IN',
  '46032',
  ST_SetSRID(ST_MakePoint(-86.1180, 40.0334), 4326)::geography,  -- Carmel, IN coordinates
  ARRAY['plumbing', 'hvac'],
  'standard',
  true,
  true,
  true,
  4.5,
  10,
  150,
  true
);

-- Verify insert
SELECT id, name, phone_number, city, state, zip_code, service_categories, rating
FROM businesses
WHERE user_id = 'user_test_business';

-- Test PostGIS distance calculation
SELECT
  b.name,
  ST_Distance(
    b.location::geography,
    ST_SetSRID(ST_MakePoint(-86.1180, 40.0334), 4326)::geography
  ) / 1609.34 AS distance_miles
FROM businesses b
WHERE user_id = 'user_test_business';

-- ============================================================================
-- TEST 4: Matches Table
-- ============================================================================
-- Insert test match
INSERT INTO matches (
  lead_id,
  business_id,
  confidence_score,
  distance_miles,
  status
)
SELECT
  l.id,
  b.id,
  0.85,
  2.5,
  'pending'
FROM leads l
CROSS JOIN businesses b
WHERE l.user_id = 'user_test_001'
  AND b.user_id = 'user_test_business'
LIMIT 1;

-- Verify insert
SELECT
  m.id,
  m.lead_id,
  m.business_id,
  m.confidence_score,
  m.distance_miles,
  m.status
FROM matches m
JOIN leads l ON l.id = m.lead_id
WHERE l.user_id = 'user_test_001';

-- Update match status
UPDATE matches m
SET status = 'accepted', response_message = 'We can help with this!'
FROM leads l
WHERE m.lead_id = l.id AND l.user_id = 'user_test_001';

-- Verify update
SELECT id, status, response_message FROM matches WHERE status = 'accepted';

-- ============================================================================
-- TEST 5: Calls Table
-- ============================================================================
-- Insert test call
INSERT INTO calls (
  lead_id,
  business_id,
  consumer_id,
  initiator_id,
  target_phone,
  call_type,
  call_objective,
  system_prompt,
  status
)
SELECT
  l.id,
  b.id,
  'user_test_001',
  'user_test_business',
  '+13175551234',
  'business_to_consumer',
  'Qualify lead for water heater repair',
  'You are an AI assistant calling on behalf of Test Plumbing Co...',
  'queued'
FROM leads l
CROSS JOIN businesses b
WHERE l.user_id = 'user_test_001'
  AND b.user_id = 'user_test_business'
LIMIT 1;

-- Verify insert
SELECT
  c.id,
  c.call_type,
  c.call_objective,
  c.target_phone,
  c.status
FROM calls c
WHERE c.initiator_id = 'user_test_business';

-- Update call status
UPDATE calls
SET status = 'completed',
    outcome = 'goal_achieved',
    duration_seconds = 180,
    summary = 'Consumer confirmed need for water heater repair. Scheduled appointment for tomorrow.'
WHERE initiator_id = 'user_test_business';

-- Verify update
SELECT id, status, outcome, duration_seconds, summary FROM calls WHERE status = 'completed';

-- ============================================================================
-- TEST 6: Conversions Table
-- ============================================================================
-- Insert test conversion
INSERT INTO conversions (
  lead_id,
  business_id,
  match_id,
  job_value_usd,
  final_price
)
SELECT
  l.id,
  b.id,
  m.id,
  450.00,
  450.00
FROM leads l
JOIN matches m ON m.lead_id = l.id
JOIN businesses b ON b.id = m.business_id
WHERE l.user_id = 'user_test_001'
LIMIT 1;

-- Verify insert
SELECT
  c.id,
  c.lead_id,
  c.business_id,
  c.job_value_usd,
  c.converted_at
FROM conversions c
JOIN leads l ON l.id = c.lead_id
WHERE l.user_id = 'user_test_001';

-- ============================================================================
-- TEST 7: Database Functions
-- ============================================================================

-- Test get_nearby_businesses function
SELECT * FROM get_nearby_businesses(
  'plumbing',          -- service_category
  40.0334,             -- latitude (Carmel, IN)
  -86.1180,            -- longitude
  10.0,                -- max_distance_miles
  3.5                  -- min_rating
);

-- Test calculate_response_rate function
SELECT calculate_response_rate(
  (SELECT id FROM businesses WHERE user_id = 'user_test_business' LIMIT 1),
  90  -- days_back
) AS response_rate;

-- Test get_conversion_stats function
SELECT * FROM get_conversion_stats(30);

-- Test detect_spam_patterns function
SELECT * FROM detect_spam_patterns(7);

-- Test get_business_performance function
SELECT * FROM get_business_performance(30);

-- ============================================================================
-- TEST 8: Cleanup (Delete in reverse order of dependencies)
-- ============================================================================

-- Delete conversions
DELETE FROM conversions WHERE lead_id IN (
  SELECT id FROM leads WHERE user_id = 'user_test_001'
);

-- Delete calls
DELETE FROM calls WHERE consumer_id = 'user_test_001';

-- Delete matches
DELETE FROM matches WHERE lead_id IN (
  SELECT id FROM leads WHERE user_id = 'user_test_001'
);

-- Delete businesses
DELETE FROM businesses WHERE user_id = 'user_test_business';

-- Delete leads
DELETE FROM leads WHERE user_id = 'user_test_001';

-- Delete users
DELETE FROM users WHERE id IN ('user_test_001', 'user_test_business');

-- Verify all test data deleted
SELECT COUNT(*) as remaining_test_users FROM users WHERE id LIKE 'user_test%';

-- ============================================================================
-- ROLLBACK OR COMMIT
-- ============================================================================

-- ROLLBACK;  -- Uncomment to undo all test changes
COMMIT;  -- Uncomment to keep test changes (for debugging)

-- ============================================================================
-- SUMMARY
-- ============================================================================

-- If all tests passed, you should see:
-- ✅ Users table: INSERT, SELECT, UPDATE successful
-- ✅ Leads table: INSERT, SELECT successful
-- ✅ Businesses table: INSERT, SELECT with PostGIS successful
-- ✅ Matches table: INSERT, UPDATE, SELECT successful
-- ✅ Calls table: INSERT, UPDATE, SELECT successful
-- ✅ Conversions table: INSERT, SELECT successful
-- ✅ All database functions return results
-- ✅ All test data cleaned up (0 remaining_test_users)

-- ============================================================================
-- END OF CRUD TEST
-- ============================================================================
