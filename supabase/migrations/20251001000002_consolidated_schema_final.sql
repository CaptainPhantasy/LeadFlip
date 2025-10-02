-- ============================================================================
-- CONSOLIDATED SCHEMA MIGRATION - FINAL
-- Created: October 1, 2025, 9:00 PM EDT
-- Agent: Database Migration Agent
-- Purpose: Single consolidated migration that brings schema to final state
--
-- This migration consolidates:
--   - 20250930000000_initial_schema.sql
--   - 20250930000001_database_functions.sql
--   - 20250930000002_fix_schema_and_rls.sql
--   - 20250930000003_fix_user_id_type_final.sql
--   - 20250930000002_prospective_businesses.sql
--   - 20251001000001_fix_schema_mismatches.sql
--
-- Run this ONLY if starting fresh or after verifying no other migrations applied
-- ============================================================================

-- ============================================================================
-- PART 1: EXTENSIONS
-- ============================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- ============================================================================
-- PART 2: CORE TABLES
-- ============================================================================

-- Users table (synced from Clerk via JWT)
-- Note: Clerk uses TEXT IDs (user_xxxxx), not UUIDs
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,  -- Clerk user ID format: user_xxxxx
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'consumer', -- 'consumer', 'business', 'admin'
  subscription_tier VARCHAR(50) DEFAULT 'free',
  account_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN users.id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';

-- Leads table
CREATE TABLE IF NOT EXISTS leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_text TEXT NOT NULL,
  contact_phone VARCHAR(20),  -- Consumer's phone number
  contact_email VARCHAR(255), -- Consumer's email address
  service_category VARCHAR(100),
  urgency VARCHAR(50),
  budget_min INTEGER,
  budget_max INTEGER,
  location_zip VARCHAR(10),
  location_city VARCHAR(100),
  location_state VARCHAR(2),
  location_point GEOGRAPHY(POINT, 4326),
  key_requirements TEXT[],
  sentiment VARCHAR(50),
  quality_score DECIMAL(3,1),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  classified_data JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN leads.user_id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';
COMMENT ON COLUMN leads.contact_phone IS 'Consumer phone number for AI calling';
COMMENT ON COLUMN leads.contact_email IS 'Consumer email for notifications';

-- Businesses table
CREATE TABLE IF NOT EXISTS businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Basic Info
  name VARCHAR(255) NOT NULL,  -- Renamed from business_name
  phone_number VARCHAR(20) NOT NULL,  -- Renamed from phone
  email VARCHAR(255) NOT NULL,
  description TEXT,

  -- Address
  address VARCHAR(500),
  city VARCHAR(100) NOT NULL,
  state VARCHAR(2) NOT NULL,
  zip_code VARCHAR(10) NOT NULL,
  location GEOGRAPHY(POINT, 4326) NOT NULL,  -- Renamed from location_point

  -- Service Details
  service_categories VARCHAR(100)[],
  price_tier VARCHAR(50) DEFAULT 'standard',
  offers_emergency_service BOOLEAN DEFAULT false,
  is_licensed BOOLEAN DEFAULT false,
  is_insured BOOLEAN DEFAULT false,

  -- Metrics
  rating DECIMAL(3,2) DEFAULT 0,
  years_in_business INTEGER DEFAULT 0,
  completed_jobs INTEGER DEFAULT 0,
  avg_response_hours INTEGER DEFAULT 24,
  avg_job_price DECIMAL(10,2),
  tags TEXT[],

  -- Capacity Management
  max_monthly_leads INTEGER DEFAULT 100,
  current_month_leads INTEGER DEFAULT 0,
  notifications_paused BOOLEAN DEFAULT false,

  -- Status
  is_active BOOLEAN DEFAULT true,
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT businesses_price_tier_check CHECK (price_tier IN ('budget', 'standard', 'premium')),
  CONSTRAINT businesses_rating_check CHECK (rating >= 0 AND rating <= 5),
  CONSTRAINT businesses_years_in_business_check CHECK (years_in_business >= 0 AND years_in_business <= 150),
  CONSTRAINT businesses_completed_jobs_check CHECK (completed_jobs >= 0)
);

COMMENT ON COLUMN businesses.user_id IS 'Clerk user ID (string format like user_xxxxx, not UUID)';
COMMENT ON COLUMN businesses.name IS 'Business name (renamed from business_name)';
COMMENT ON COLUMN businesses.phone_number IS 'Business phone in E.164 format (renamed from phone)';
COMMENT ON COLUMN businesses.location IS 'Business geographic location (renamed from location_point)';
COMMENT ON COLUMN businesses.years_in_business IS 'Years in business (for response generator context)';
COMMENT ON COLUMN businesses.completed_jobs IS 'Total completed jobs (for trust signals)';

-- Matches table
CREATE TABLE IF NOT EXISTS matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3,2) NOT NULL,
  distance_miles DECIMAL(6,2),
  match_reasons JSONB,
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  response_message TEXT,  -- Business response when accepting/declining
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, business_id)
);

COMMENT ON COLUMN matches.response_message IS 'Business response message when accepting/declining';

-- Calls table
CREATE TABLE IF NOT EXISTS calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  consumer_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  initiator_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- Call Details
  target_phone VARCHAR(20) NOT NULL,
  call_type VARCHAR(100),
  call_objective TEXT NOT NULL,
  system_prompt TEXT,

  -- Timing
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  scheduled_time TIMESTAMPTZ,
  scheduled_for TIMESTAMPTZ,  -- Keep for backwards compatibility
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,

  -- Results
  transcript JSONB,
  summary TEXT,
  outcome VARCHAR(100),
  recording_url TEXT,

  -- Cost Tracking
  estimated_cost_usd DECIMAL(10,4),
  actual_cost_usd DECIMAL(10,4),
  cost_breakdown JSONB,

  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON COLUMN calls.consumer_id IS 'Consumer user involved in the call';
COMMENT ON COLUMN calls.initiator_id IS 'User who initiated the call request';
COMMENT ON COLUMN calls.call_type IS 'Type of call: business_to_consumer, consumer_callback, etc.';
COMMENT ON COLUMN calls.system_prompt IS 'Generated AI system prompt for this call';

-- Conversions table (for learning/analytics)
CREATE TABLE IF NOT EXISTS conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_value_usd DECIMAL(10,2),
  final_price DECIMAL(10,2),  -- For get_conversion_stats function
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Prospective Businesses table (for discovery system)
CREATE TABLE IF NOT EXISTS prospective_businesses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Places Data
  google_place_id TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  formatted_address TEXT,
  formatted_phone_number TEXT,
  international_phone_number TEXT,
  website TEXT,

  -- Location
  latitude DOUBLE PRECISION,
  longitude DOUBLE PRECISION,
  zip_code TEXT,
  city TEXT,
  state TEXT DEFAULT 'IN',
  location GEOGRAPHY(POINT, 4326),

  -- Business Quality Metrics
  rating NUMERIC(2,1),
  user_ratings_total INTEGER DEFAULT 0,
  price_level INTEGER,
  business_status TEXT,

  -- Service Categories
  service_category TEXT NOT NULL,
  service_types TEXT[],

  -- Discovery Metadata
  discovered_at TIMESTAMPTZ DEFAULT NOW(),
  discovery_source TEXT DEFAULT 'google_places',
  discovery_zip TEXT NOT NULL,
  distance_from_target NUMERIC(5,2),

  -- Invitation Status
  invitation_status TEXT DEFAULT 'pending',
  invitation_sent_at TIMESTAMPTZ,
  invitation_clicked_at TIMESTAMPTZ,
  follow_up_count INTEGER DEFAULT 0,
  last_follow_up_at TIMESTAMPTZ,

  -- Activation
  activated BOOLEAN DEFAULT false,
  activated_at TIMESTAMPTZ,
  activated_business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,

  -- Quality Flags
  qualified BOOLEAN DEFAULT true,
  disqualification_reason TEXT,

  -- Tracking
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- PART 2B: COLUMN GUARDS (Idempotent schema reconciliation)
-- ============================================================================
-- Ensures all expected columns exist even if table was created by older migration
-- This prevents compilation failures in functions that reference these columns

-- Ensure leads.contact_phone exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'contact_phone'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN contact_phone VARCHAR(20);
    COMMENT ON COLUMN public.leads.contact_phone IS 'Consumer phone number for AI calling';
  END IF;
END$$;

-- Ensure leads.contact_email exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'leads' AND column_name = 'contact_email'
  ) THEN
    ALTER TABLE public.leads ADD COLUMN contact_email VARCHAR(255);
    COMMENT ON COLUMN public.leads.contact_email IS 'Consumer email for notifications';
  END IF;
END$$;

-- ============================================================================
-- PART 3: INDEXES
-- ============================================================================

-- Users indexes
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Leads indexes
CREATE INDEX IF NOT EXISTS idx_leads_user_id ON leads(user_id);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_location ON leads USING GIST(location_point);
CREATE INDEX IF NOT EXISTS idx_leads_service_category ON leads(service_category);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_leads_quality_score ON leads(quality_score);
CREATE INDEX IF NOT EXISTS idx_leads_contact_phone ON leads(contact_phone);

-- Businesses indexes
CREATE INDEX IF NOT EXISTS idx_businesses_user_id ON businesses(user_id);
CREATE INDEX IF NOT EXISTS idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_businesses_service_categories ON businesses USING GIN(service_categories);
CREATE INDEX IF NOT EXISTS idx_businesses_subscription ON businesses(subscription_status) WHERE subscription_status = 'active';
CREATE INDEX IF NOT EXISTS idx_businesses_price_tier ON businesses(price_tier);
CREATE INDEX IF NOT EXISTS idx_businesses_is_active ON businesses(is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_businesses_offers_emergency ON businesses(offers_emergency_service) WHERE offers_emergency_service = true;

-- Matches indexes
CREATE INDEX IF NOT EXISTS idx_matches_lead_id ON matches(lead_id);
CREATE INDEX IF NOT EXISTS idx_matches_business_id ON matches(business_id);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);

-- Calls indexes
CREATE INDEX IF NOT EXISTS idx_calls_lead_id ON calls(lead_id);
CREATE INDEX IF NOT EXISTS idx_calls_business_id ON calls(business_id);
CREATE INDEX IF NOT EXISTS idx_calls_consumer_id ON calls(consumer_id);
CREATE INDEX IF NOT EXISTS idx_calls_initiator_id ON calls(initiator_id);
CREATE INDEX IF NOT EXISTS idx_calls_status ON calls(status);
CREATE INDEX IF NOT EXISTS idx_calls_created_at ON calls(created_at DESC);

-- Conversions indexes
CREATE INDEX IF NOT EXISTS idx_conversions_lead_id ON conversions(lead_id);
CREATE INDEX IF NOT EXISTS idx_conversions_business_id ON conversions(business_id);

-- Prospective Businesses indexes
CREATE INDEX IF NOT EXISTS idx_prospective_businesses_service_category ON prospective_businesses(service_category);
CREATE INDEX IF NOT EXISTS idx_prospective_businesses_invitation_status ON prospective_businesses(invitation_status);
CREATE INDEX IF NOT EXISTS idx_prospective_businesses_zip_code ON prospective_businesses(zip_code);
CREATE INDEX IF NOT EXISTS idx_prospective_businesses_rating ON prospective_businesses(rating);
CREATE INDEX IF NOT EXISTS idx_prospective_businesses_location ON prospective_businesses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_prospective_businesses_discovery_zip ON prospective_businesses(discovery_zip);

-- ============================================================================
-- PART 4: FUNCTIONS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Get nearby businesses using PostGIS
CREATE OR REPLACE FUNCTION get_nearby_businesses(
  p_service_category TEXT,
  p_latitude DOUBLE PRECISION,
  p_longitude DOUBLE PRECISION,
  p_max_distance_miles DOUBLE PRECISION,
  p_min_rating DOUBLE PRECISION DEFAULT 3.5
)
RETURNS TABLE (
  id UUID,
  name TEXT,
  service_categories TEXT[],
  rating DOUBLE PRECISION,
  distance_miles DOUBLE PRECISION,
  price_tier TEXT,
  offers_emergency_service BOOLEAN,
  avg_response_hours INTEGER,
  avg_job_price DOUBLE PRECISION,
  is_licensed BOOLEAN,
  is_insured BOOLEAN,
  tags TEXT[],
  notifications_paused BOOLEAN,
  max_monthly_leads INTEGER,
  current_month_leads INTEGER,
  years_in_business INTEGER,
  completed_jobs INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id,
    b.name,
    b.service_categories,
    b.rating,
    ST_Distance(
      b.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography
    ) / 1609.34 AS distance_miles,
    b.price_tier,
    b.offers_emergency_service,
    b.avg_response_hours,
    b.avg_job_price,
    b.is_licensed,
    b.is_insured,
    b.tags,
    b.notifications_paused,
    b.max_monthly_leads,
    b.current_month_leads,
    b.years_in_business,
    b.completed_jobs
  FROM businesses b
  WHERE
    p_service_category = ANY(b.service_categories)
    AND b.rating >= p_min_rating
    AND ST_DWithin(
      b.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_max_distance_miles * 1609.34
    )
    AND b.is_active = true
  ORDER BY distance_miles ASC
  LIMIT 50;
END;
$$ LANGUAGE plpgsql;

-- Function: Calculate business response rate
CREATE OR REPLACE FUNCTION calculate_response_rate(
  p_business_id UUID,
  p_days_back INTEGER DEFAULT 90
)
RETURNS DOUBLE PRECISION AS $$
DECLARE
  total_matches INTEGER;
  responded_matches INTEGER;
  response_rate DOUBLE PRECISION;
BEGIN
  SELECT COUNT(*) INTO total_matches
  FROM matches
  WHERE business_id = p_business_id
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;

  IF total_matches = 0 THEN
    RETURN 0.5;
  END IF;

  SELECT COUNT(*) INTO responded_matches
  FROM matches
  WHERE business_id = p_business_id
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND status IN ('accepted', 'contacted', 'converted');

  response_rate := responded_matches::DOUBLE PRECISION / total_matches::DOUBLE PRECISION;
  RETURN response_rate;
END;
$$ LANGUAGE plpgsql;

-- Function: Update business monthly lead count
CREATE OR REPLACE FUNCTION increment_business_lead_count(p_business_id UUID)
RETURNS VOID AS $$
BEGIN
  UPDATE businesses
  SET current_month_leads = current_month_leads + 1
  WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Reset monthly lead counts
CREATE OR REPLACE FUNCTION reset_monthly_lead_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE businesses SET current_month_leads = 0;
END;
$$ LANGUAGE plpgsql;

-- Function: Get conversion stats for memory learning
CREATE OR REPLACE FUNCTION get_conversion_stats(p_days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  service_category TEXT,
  total_leads INTEGER,
  converted_leads INTEGER,
  conversion_rate DOUBLE PRECISION,
  avg_quality_score DOUBLE PRECISION,
  avg_job_value DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    l.service_category,
    COUNT(*)::INTEGER AS total_leads,
    COUNT(c.id)::INTEGER AS converted_leads,
    (COUNT(c.id)::DOUBLE PRECISION / COUNT(*)::DOUBLE PRECISION) AS conversion_rate,
    AVG(l.quality_score) AS avg_quality_score,
    AVG(c.final_price) AS avg_job_value
  FROM leads l
  LEFT JOIN conversions c ON c.lead_id = l.id
  WHERE l.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY l.service_category
  ORDER BY conversion_rate DESC;
END;
$$ LANGUAGE plpgsql;

-- Function: Detect spam patterns
CREATE OR REPLACE FUNCTION detect_spam_patterns(p_days_back INTEGER DEFAULT 7)
RETURNS TABLE (
  pattern TEXT,
  occurrences INTEGER,
  spam_probability DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    'repeated_text' AS pattern,
    COUNT(*)::INTEGER AS occurrences,
    CASE
      WHEN COUNT(*) >= 5 THEN 0.9
      WHEN COUNT(*) >= 3 THEN 0.7
      ELSE 0.3
    END AS spam_probability
  FROM (
    SELECT problem_text, COUNT(*) as cnt
    FROM leads
    WHERE created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    GROUP BY problem_text
    HAVING COUNT(*) >= 3
  ) repeated

  UNION ALL

  SELECT
    'repeated_phone' AS pattern,
    COUNT(*)::INTEGER AS occurrences,
    CASE
      WHEN COUNT(*) >= 10 THEN 0.95
      WHEN COUNT(*) >= 5 THEN 0.8
      ELSE 0.5
    END AS spam_probability
  FROM (
    SELECT contact_phone, COUNT(*) as cnt
    FROM leads
    WHERE created_at >= NOW() - (p_days_back || ' days')::INTERVAL
      AND contact_phone IS NOT NULL
    GROUP BY contact_phone
    HAVING COUNT(*) >= 5
  ) repeated_phones;
END;
$$ LANGUAGE plpgsql;

-- Function: Get business performance for audit
CREATE OR REPLACE FUNCTION get_business_performance(p_days_back INTEGER DEFAULT 30)
RETURNS TABLE (
  business_id UUID,
  business_name TEXT,
  total_matches INTEGER,
  responses INTEGER,
  response_rate DOUBLE PRECISION,
  conversions INTEGER,
  conversion_rate DOUBLE PRECISION,
  avg_response_time_hours DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    b.id AS business_id,
    b.name AS business_name,
    COUNT(m.id)::INTEGER AS total_matches,
    COUNT(CASE WHEN m.status IN ('accepted', 'contacted', 'converted') THEN 1 END)::INTEGER AS responses,
    (COUNT(CASE WHEN m.status IN ('accepted', 'contacted', 'converted') THEN 1 END)::DOUBLE PRECISION /
     NULLIF(COUNT(m.id), 0)::DOUBLE PRECISION) AS response_rate,
    COUNT(c.id)::INTEGER AS conversions,
    (COUNT(c.id)::DOUBLE PRECISION / NULLIF(COUNT(m.id), 0)::DOUBLE PRECISION) AS conversion_rate,
    AVG(EXTRACT(EPOCH FROM (m.responded_at - m.created_at)) / 3600) AS avg_response_time_hours
  FROM businesses b
  LEFT JOIN matches m ON m.business_id = b.id AND m.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  LEFT JOIN conversions c ON c.business_id = b.id AND c.created_at >= NOW() - (p_days_back || ' days')::INTERVAL
  GROUP BY b.id, b.name
  HAVING COUNT(m.id) > 0
  ORDER BY conversion_rate DESC NULLS LAST;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- PART 5: TRIGGERS
-- ============================================================================

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_leads_updated_at BEFORE UPDATE ON leads
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_businesses_updated_at BEFORE UPDATE ON businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_matches_updated_at BEFORE UPDATE ON matches
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_calls_updated_at BEFORE UPDATE ON calls
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_prospective_businesses_updated_at BEFORE UPDATE ON prospective_businesses
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- PART 6: ROW LEVEL SECURITY (RLS)
-- ============================================================================

-- IMPORTANT: RLS is currently DISABLED because we're using service role
-- with application-level authentication via Clerk.
-- Re-enable RLS once Clerk JWT integration is configured in Supabase settings.

ALTER TABLE users DISABLE ROW LEVEL SECURITY;
ALTER TABLE leads DISABLE ROW LEVEL SECURITY;
ALTER TABLE businesses DISABLE ROW LEVEL SECURITY;
ALTER TABLE matches DISABLE ROW LEVEL SECURITY;
ALTER TABLE calls DISABLE ROW LEVEL SECURITY;
ALTER TABLE conversions DISABLE ROW LEVEL SECURITY;
ALTER TABLE prospective_businesses DISABLE ROW LEVEL SECURITY;

-- Add comments explaining RLS status
COMMENT ON TABLE users IS 'RLS disabled - using service role with application-level auth via Clerk. Re-enable once Clerk JWT integration configured.';
COMMENT ON TABLE leads IS 'RLS disabled - using service role with application-level auth via Clerk. Re-enable once Clerk JWT integration configured.';
COMMENT ON TABLE businesses IS 'RLS disabled - using service role with application-level auth via Clerk. Re-enable once Clerk JWT integration configured.';
COMMENT ON TABLE matches IS 'RLS disabled - using service role with application-level auth via Clerk. Re-enable once Clerk JWT integration configured.';
COMMENT ON TABLE calls IS 'RLS disabled - using service role with application-level auth via Clerk. Re-enable once Clerk JWT integration configured.';
COMMENT ON TABLE conversions IS 'RLS disabled - using service role with application-level auth via Clerk. Re-enable once Clerk JWT integration configured.';

-- ============================================================================
-- PART 7: GRANT PERMISSIONS
-- ============================================================================

GRANT EXECUTE ON FUNCTION get_nearby_businesses TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_response_rate TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_business_lead_count TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_lead_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_stats TO authenticated;
GRANT EXECUTE ON FUNCTION detect_spam_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_performance TO authenticated;

-- ============================================================================
-- PART 8: VERIFICATION
-- ============================================================================

-- Verify PostGIS is enabled
SELECT EXISTS (
  SELECT FROM pg_extension WHERE extname = 'postgis'
) AS postgis_enabled;

-- Verify all tables exist
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('users', 'leads', 'businesses', 'matches', 'calls', 'conversions', 'prospective_businesses')
ORDER BY table_name;

-- Verify user_id columns are TEXT
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE column_name LIKE '%user_id%' OR column_name = 'id'
  AND table_schema = 'public'
ORDER BY table_name, column_name;

-- ============================================================================
-- END OF CONSOLIDATED MIGRATION
-- ============================================================================
