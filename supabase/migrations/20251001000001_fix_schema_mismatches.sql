-- Migration: Fix Schema Mismatches Between Code and Database
-- Created: October 1, 2025
-- Track: 2 (Database Schema Agent)
-- Purpose: Align database schema with application code expectations

-- ============================================================================
-- PART 1: Fix Column Name Mismatches in businesses table
-- ============================================================================

-- Fix: business_name → name
-- Code expects: input.name → INSERT businesses(name)
-- Schema has: business_name
ALTER TABLE businesses RENAME COLUMN business_name TO name;

-- Fix: phone → phone_number
-- Code expects: input.phoneNumber → INSERT businesses(phone_number)
-- Schema has: phone
ALTER TABLE businesses RENAME COLUMN phone TO phone_number;

-- Fix: location_point → location
-- Code expects: location: `POINT(${lng} ${lat})`
-- Schema has: location_point
ALTER TABLE businesses RENAME COLUMN location_point TO location;

-- ============================================================================
-- PART 2: Add Missing Columns in businesses table
-- ============================================================================

-- Add: address (used in business registration)
-- Required by: src/server/routers/business.ts line 55
ALTER TABLE businesses ADD COLUMN address VARCHAR(500);

-- Add: city (separate from location_city which is for coordinates)
-- Required by: src/server/routers/business.ts line 56
ALTER TABLE businesses ADD COLUMN city VARCHAR(100);

-- Add: state (separate from location_state)
-- Required by: src/server/routers/business.ts line 57
ALTER TABLE businesses ADD COLUMN state VARCHAR(2);

-- Add: zip_code (for business address, separate from location_zip)
-- Required by: src/server/routers/business.ts line 58
ALTER TABLE businesses ADD COLUMN zip_code VARCHAR(10);

-- Add: description (optional business description)
-- Required by: src/server/routers/business.ts line 60
ALTER TABLE businesses ADD COLUMN description TEXT;

-- Add: price_tier (budget/standard/premium)
-- Required by: src/server/routers/business.ts line 61
ALTER TABLE businesses ADD COLUMN price_tier VARCHAR(50) DEFAULT 'standard';

-- Add: offers_emergency_service (boolean flag)
-- Required by: src/server/routers/business.ts line 62
ALTER TABLE businesses ADD COLUMN offers_emergency_service BOOLEAN DEFAULT false;

-- Add: is_licensed (boolean flag)
-- Required by: src/server/routers/business.ts line 63
ALTER TABLE businesses ADD COLUMN is_licensed BOOLEAN DEFAULT false;

-- Add: is_insured (boolean flag)
-- Required by: src/server/routers/business.ts line 64
ALTER TABLE businesses ADD COLUMN is_insured BOOLEAN DEFAULT false;

-- Add: is_active (status flag)
-- Required by: src/server/routers/business.ts line 65
ALTER TABLE businesses ADD COLUMN is_active BOOLEAN DEFAULT true;

-- Add: years_in_business (experience metric)
-- Required by: src/lib/agents/main-orchestrator.ts line 274
-- Required by: src/server/routers/lead.ts line 107 (in SELECT query)
ALTER TABLE businesses ADD COLUMN years_in_business INTEGER;

-- Add: completed_jobs (track record metric)
-- Required by: src/lib/agents/main-orchestrator.ts line 276
-- Required by: src/lib/agents/response-generator.ts line 135
ALTER TABLE businesses ADD COLUMN completed_jobs INTEGER DEFAULT 0;

-- Add: rating (business rating, separate from rating_avg)
-- Required by: src/server/routers/lead.ts line 105 (in SELECT query)
-- Note: Schema has rating_avg, code expects rating
ALTER TABLE businesses ADD COLUMN rating DECIMAL(3,2);

-- Add: max_monthly_leads (capacity management)
-- Required by: src/server/routers/business.ts line 251 (updateCapacity)
ALTER TABLE businesses ADD COLUMN max_monthly_leads INTEGER;

-- ============================================================================
-- PART 3: Add Missing Columns in matches table
-- ============================================================================

-- Add: response_message (business response text)
-- Required by: src/server/routers/business.ts line 182 (respondToLead)
ALTER TABLE matches ADD COLUMN response_message TEXT;

-- ============================================================================
-- PART 3A: Add Missing Columns in leads table
-- ============================================================================

-- Add: contact_phone (consumer's phone number)
-- Required by: src/server/routers/lead.ts line 30, src/lib/agents/main-orchestrator.ts line 173
ALTER TABLE leads ADD COLUMN contact_phone VARCHAR(20);

-- Add: contact_email (consumer's email address)
-- Required by: src/server/routers/lead.ts line 31, src/lib/agents/main-orchestrator.ts line 174
ALTER TABLE leads ADD COLUMN contact_email VARCHAR(255);

-- ============================================================================
-- PART 3B: Add Missing Columns in calls table
-- ============================================================================

-- Add: consumer_id (who the call is for/from)
-- Required by: src/server/routers/call.ts line 93 (insert), line 149 (permission check)
ALTER TABLE calls ADD COLUMN consumer_id UUID REFERENCES users(id) ON DELETE SET NULL;

-- Add: call_type (type of call being made)
-- Required by: src/server/routers/call.ts line 94 (insert)
ALTER TABLE calls ADD COLUMN call_type VARCHAR(100);

-- Add: system_prompt (generated prompt for the call)
-- Required by: src/server/routers/call.ts line 97 (insert)
ALTER TABLE calls ADD COLUMN system_prompt TEXT;

-- Add: scheduled_time (when call should be made)
-- Required by: src/server/routers/call.ts line 98 (insert)
ALTER TABLE calls ADD COLUMN scheduled_time TIMESTAMPTZ;

-- Note: initiator_id was renamed from the old schema
-- Verify this column exists, if not create it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'calls' AND column_name = 'initiator_id'
  ) THEN
    -- Rename or create initiator_id if needed
    -- This is the user who initiated the call request
    ALTER TABLE calls ADD COLUMN initiator_id UUID REFERENCES users(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ============================================================================
-- PART 4: Update Indexes for New/Renamed Columns
-- ============================================================================

-- Update index for renamed location column
-- Drop old index on location_point
DROP INDEX IF EXISTS idx_businesses_location;

-- Create new index on location
CREATE INDEX idx_businesses_location ON businesses USING GIST(location);

-- Add index on new columns that will be queried frequently
CREATE INDEX idx_businesses_price_tier ON businesses(price_tier);
CREATE INDEX idx_businesses_is_active ON businesses(is_active) WHERE is_active = true;
CREATE INDEX idx_businesses_offers_emergency ON businesses(offers_emergency_service) WHERE offers_emergency_service = true;

-- ============================================================================
-- PART 5: Data Migration (Copy existing data to new columns)
-- ============================================================================

-- Copy location_city to city (if they should be the same)
-- Only update if city is NULL to avoid overwriting explicit values
UPDATE businesses SET city = location_city WHERE city IS NULL;

-- Copy location_state to state
UPDATE businesses SET state = location_state WHERE state IS NULL;

-- Copy location_zip to zip_code
UPDATE businesses SET zip_code = location_zip WHERE zip_code IS NULL;

-- Copy rating_avg to rating (if they represent the same metric)
UPDATE businesses SET rating = rating_avg WHERE rating IS NULL;

-- ============================================================================
-- PART 6: Add Constraints
-- ============================================================================

-- Add check constraint for price_tier
ALTER TABLE businesses ADD CONSTRAINT businesses_price_tier_check
  CHECK (price_tier IN ('budget', 'standard', 'premium'));

-- Add check constraint for rating range (0.00 to 5.00)
ALTER TABLE businesses ADD CONSTRAINT businesses_rating_check
  CHECK (rating >= 0 AND rating <= 5);

-- Add check constraint for rating_avg range (0.00 to 5.00)
ALTER TABLE businesses ADD CONSTRAINT businesses_rating_avg_check
  CHECK (rating_avg IS NULL OR (rating_avg >= 0 AND rating_avg <= 5));

-- Add check constraint for years_in_business (reasonable range)
ALTER TABLE businesses ADD CONSTRAINT businesses_years_in_business_check
  CHECK (years_in_business IS NULL OR (years_in_business >= 0 AND years_in_business <= 150));

-- Add check constraint for completed_jobs (non-negative)
ALTER TABLE businesses ADD CONSTRAINT businesses_completed_jobs_check
  CHECK (completed_jobs >= 0);

-- ============================================================================
-- PART 7: Update Comments for Documentation
-- ============================================================================

COMMENT ON COLUMN businesses.name IS 'Business name (renamed from business_name)';
COMMENT ON COLUMN businesses.phone_number IS 'Business phone in E.164 format (renamed from phone)';
COMMENT ON COLUMN businesses.location IS 'Business geographic location (renamed from location_point)';
COMMENT ON COLUMN businesses.years_in_business IS 'Years in business (for response generator context)';
COMMENT ON COLUMN businesses.completed_jobs IS 'Total completed jobs (for trust signals)';
COMMENT ON COLUMN businesses.rating IS 'Current business rating 0-5 (used by matching algorithm)';
COMMENT ON COLUMN businesses.rating_avg IS 'Average historical rating (for analytics)';
COMMENT ON COLUMN businesses.price_tier IS 'Pricing tier: budget, standard, or premium';
COMMENT ON COLUMN businesses.offers_emergency_service IS 'Whether business offers 24/7 emergency service';
COMMENT ON COLUMN businesses.is_licensed IS 'Whether business is licensed';
COMMENT ON COLUMN businesses.is_insured IS 'Whether business is insured';
COMMENT ON COLUMN businesses.is_active IS 'Whether business profile is active';
COMMENT ON COLUMN businesses.max_monthly_leads IS 'Maximum leads per month (capacity management)';

COMMENT ON COLUMN matches.response_message IS 'Business response message when accepting/declining';

-- ============================================================================
-- VERIFICATION QUERIES (Commented out - run manually to verify)
-- ============================================================================

-- Verify all expected columns exist
-- SELECT column_name, data_type, is_nullable, column_default
-- FROM information_schema.columns
-- WHERE table_name = 'businesses'
-- ORDER BY ordinal_position;

-- Verify indexes
-- SELECT indexname, indexdef
-- FROM pg_indexes
-- WHERE tablename = 'businesses';

-- Verify constraints
-- SELECT conname, pg_get_constraintdef(oid)
-- FROM pg_constraint
-- WHERE conrelid = 'businesses'::regclass;

-- ============================================================================
-- ROLLBACK PLAN (If needed - run these in reverse order)
-- ============================================================================

-- To rollback this migration, run:
--
-- -- Remove new columns
-- ALTER TABLE businesses DROP COLUMN IF EXISTS max_monthly_leads;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS rating;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS completed_jobs;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS years_in_business;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS is_active;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS is_insured;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS is_licensed;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS offers_emergency_service;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS price_tier;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS description;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS zip_code;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS state;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS city;
-- ALTER TABLE businesses DROP COLUMN IF EXISTS address;
--
-- -- Rename columns back
-- ALTER TABLE businesses RENAME COLUMN location TO location_point;
-- ALTER TABLE businesses RENAME COLUMN phone_number TO phone;
-- ALTER TABLE businesses RENAME COLUMN name TO business_name;
--
-- -- Remove match column
-- ALTER TABLE matches DROP COLUMN IF EXISTS response_message;

-- ============================================================================
-- END OF MIGRATION
-- ============================================================================
