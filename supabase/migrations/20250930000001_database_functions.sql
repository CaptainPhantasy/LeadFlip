-- Database Functions for Business Matcher Subagent
-- These functions are called by the MCP Database Server

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
    -- Calculate distance in miles using PostGIS
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
    -- Service category match (exact or related)
    p_service_category = ANY(b.service_categories)
    -- Rating filter
    AND b.rating >= p_min_rating
    -- Distance filter
    AND ST_DWithin(
      b.location::geography,
      ST_SetSRID(ST_MakePoint(p_longitude, p_latitude), 4326)::geography,
      p_max_distance_miles * 1609.34 -- Convert miles to meters
    )
    -- Active businesses only
    AND b.is_active = true
  ORDER BY distance_miles ASC
  LIMIT 50; -- Max candidates to score
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
  -- Count total matches in time period
  SELECT COUNT(*) INTO total_matches
  FROM matches
  WHERE
    business_id = p_business_id
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL;

  -- Return default 50% if no history
  IF total_matches = 0 THEN
    RETURN 0.5;
  END IF;

  -- Count matches where business responded
  SELECT COUNT(*) INTO responded_matches
  FROM matches
  WHERE
    business_id = p_business_id
    AND created_at >= NOW() - (p_days_back || ' days')::INTERVAL
    AND status IN ('accepted', 'contacted', 'converted');

  -- Calculate rate
  response_rate := responded_matches::DOUBLE PRECISION / total_matches::DOUBLE PRECISION;

  RETURN response_rate;
END;
$$ LANGUAGE plpgsql;

-- Function: Update business monthly lead count (called after match)
CREATE OR REPLACE FUNCTION increment_business_lead_count(
  p_business_id UUID
)
RETURNS VOID AS $$
BEGIN
  UPDATE businesses
  SET current_month_leads = current_month_leads + 1
  WHERE id = p_business_id;
END;
$$ LANGUAGE plpgsql;

-- Function: Reset monthly lead counts (run via cron on 1st of month)
CREATE OR REPLACE FUNCTION reset_monthly_lead_counts()
RETURNS VOID AS $$
BEGIN
  UPDATE businesses
  SET current_month_leads = 0;
END;
$$ LANGUAGE plpgsql;

-- Function: Get lead conversion stats for memory learning
CREATE OR REPLACE FUNCTION get_conversion_stats(
  p_days_back INTEGER DEFAULT 30
)
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
CREATE OR REPLACE FUNCTION detect_spam_patterns(
  p_days_back INTEGER DEFAULT 7
)
RETURNS TABLE (
  pattern TEXT,
  occurrences INTEGER,
  spam_probability DOUBLE PRECISION
) AS $$
BEGIN
  RETURN QUERY
  -- Detect repeated problem text
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

  -- Detect repeated phone numbers
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
    WHERE
      created_at >= NOW() - (p_days_back || ' days')::INTERVAL
      AND contact_phone IS NOT NULL
    GROUP BY contact_phone
    HAVING COUNT(*) >= 5
  ) repeated_phones;
END;
$$ LANGUAGE plpgsql;

-- Function: Get business performance for audit
CREATE OR REPLACE FUNCTION get_business_performance(
  p_days_back INTEGER DEFAULT 30
)
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

-- Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_leads_service_category ON leads(service_category);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);
CREATE INDEX IF NOT EXISTS idx_leads_quality_score ON leads(quality_score);
CREATE INDEX IF NOT EXISTS idx_matches_business_id ON matches(business_id);
CREATE INDEX IF NOT EXISTS idx_matches_created_at ON matches(created_at);
CREATE INDEX IF NOT EXISTS idx_matches_status ON matches(status);
CREATE INDEX IF NOT EXISTS idx_businesses_location_gist ON businesses USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_businesses_service_categories ON businesses USING GIN(service_categories);

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION get_nearby_businesses TO anon, authenticated;
GRANT EXECUTE ON FUNCTION calculate_response_rate TO anon, authenticated;
GRANT EXECUTE ON FUNCTION increment_business_lead_count TO authenticated;
GRANT EXECUTE ON FUNCTION reset_monthly_lead_counts TO authenticated;
GRANT EXECUTE ON FUNCTION get_conversion_stats TO authenticated;
GRANT EXECUTE ON FUNCTION detect_spam_patterns TO authenticated;
GRANT EXECUTE ON FUNCTION get_business_performance TO authenticated;
