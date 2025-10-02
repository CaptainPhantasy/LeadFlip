-- Business Discovery System: Prospective Businesses Table
-- Stores businesses discovered via Google Places API before invitation

CREATE TABLE IF NOT EXISTS prospective_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Places Data
  google_place_id text UNIQUE NOT NULL,
  name text NOT NULL,
  formatted_address text,
  formatted_phone_number text,
  international_phone_number text,
  website text,

  -- Location
  latitude double precision,
  longitude double precision,
  zip_code text,
  city text,
  state text DEFAULT 'IN',
  location geography(Point, 4326), -- PostGIS for distance queries

  -- Business Quality Metrics
  rating numeric(2,1),
  user_ratings_total integer DEFAULT 0,
  price_level integer, -- 0-4 scale from Google
  business_status text, -- OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY

  -- Service Categories
  service_category text NOT NULL, -- plumbing, hvac, electrical, etc.
  service_types text[], -- Array of related service types

  -- Discovery Metadata
  discovered_at timestamptz DEFAULT now(),
  discovery_source text DEFAULT 'google_places',
  discovery_zip text NOT NULL, -- Which ZIP search found this
  distance_from_target numeric(5,2), -- Miles from target ZIP

  -- Invitation Status
  invitation_status text DEFAULT 'pending', -- pending, invited, clicked, activated, declined, bounced
  invitation_sent_at timestamptz,
  invitation_clicked_at timestamptz,
  follow_up_count integer DEFAULT 0,
  last_follow_up_at timestamptz,

  -- Activation
  activated boolean DEFAULT false,
  activated_at timestamptz,
  activated_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,

  -- Quality Flags
  qualified boolean DEFAULT true, -- Meets quality filters
  disqualification_reason text,

  -- Tracking
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_prospective_businesses_service_category ON prospective_businesses(service_category);
CREATE INDEX idx_prospective_businesses_invitation_status ON prospective_businesses(invitation_status);
CREATE INDEX idx_prospective_businesses_zip_code ON prospective_businesses(zip_code);
CREATE INDEX idx_prospective_businesses_rating ON prospective_businesses(rating);
CREATE INDEX idx_prospective_businesses_location ON prospective_businesses USING GIST(location);
CREATE INDEX idx_prospective_businesses_discovery_zip ON prospective_businesses(discovery_zip);

-- Updated at trigger
CREATE TRIGGER update_prospective_businesses_updated_at
  BEFORE UPDATE ON prospective_businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
