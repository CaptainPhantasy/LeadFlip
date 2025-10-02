-- ============================================================================
-- Seed Test Business Account
-- Purpose: Create a verified business for testing lead matching and AI calls
-- ============================================================================

-- STEP 1: Create test business user (if not exists)
-- Note: Replace 'user_test_business_123' with actual Clerk user ID if you have one
INSERT INTO users (id, email, full_name, role, subscription_tier, account_status)
VALUES (
  'user_test_business_123',
  'test-business@leadflip.local',
  'Test Business Owner',
  'business',
  'professional',
  'active'
)
ON CONFLICT (id) DO UPDATE SET
  role = 'business',
  subscription_tier = 'professional',
  account_status = 'active';

-- STEP 2: Create test business profile
-- Replace PHONE_NUMBER with actual phone number in E.164 format: +1XXXXXXXXXX
INSERT INTO businesses (
  id,
  user_id,
  name,
  phone_number,
  email,
  description,
  address,
  city,
  state,
  zip_code,
  location,
  service_categories,
  price_tier,
  offers_emergency_service,
  is_licensed,
  is_insured,
  rating,
  years_in_business,
  completed_jobs,
  avg_response_hours,
  avg_job_price,
  is_active,
  subscription_status,
  subscription_tier,
  notifications_paused,
  max_monthly_leads,
  current_month_leads,
  tags
)
VALUES (
  gen_random_uuid(),
  'user_test_business_123',
  'Doug''s Test Services',
  '+18123405761',
  'test-business@leadflip.local',
  'Full-service home repair and maintenance company for testing LeadFlip platform',
  '123 Test Street',
  'Carmel',
  'IN',
  '46032',
  ST_GeographyFromText('POINT(-86.1180 39.9784)'),  -- Carmel, IN coordinates
  ARRAY['plumbing', 'hvac', 'electrical', 'handyman', 'lawn_care', 'roofing'],
  'standard',
  true,  -- offers emergency service
  true,  -- licensed
  true,  -- insured
  4.8,
  10,
  250,
  2,  -- 2 hour avg response
  350.00,
  true,  -- is_active
  'active',
  'professional',
  false,  -- notifications NOT paused
  100,
  0,
  ARRAY['fast_response', 'veteran_owned', 'background_checked']
)
ON CONFLICT (user_id) DO UPDATE SET
  phone_number = EXCLUDED.phone_number,
  is_active = true,
  subscription_status = 'active',
  notifications_paused = false;

-- STEP 3: Verify business was created
SELECT
  id,
  name,
  phone_number,
  email,
  service_categories,
  subscription_tier,
  is_active,
  notifications_paused
FROM businesses
WHERE user_id = 'user_test_business_123';
