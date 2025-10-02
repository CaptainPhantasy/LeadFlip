# Database Migration Guide

## ⚠️ Manual Migration Required

The automated migration script encountered connection issues. Please follow these steps to complete the database setup manually.

---

## Step 1: Access Supabase SQL Editor

1. Go to: **https://plmnuogbbkgsatfmkyxm.supabase.co**
2. Sign in to your Supabase account
3. Click on **"SQL Editor"** in the left sidebar
4. Click **"New Query"** button (top right)

---

## Step 2: Copy Migration SQL

Open this file in your editor:
```
/Volumes/Storage/Development/LegacyCall/supabase/migrations/20250930000000_initial_schema.sql
```

**Or copy from below:**

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "postgis";

-- Users table (synced from Clerk via JWT)
CREATE TABLE users (
  id UUID PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  full_name VARCHAR(255),
  role VARCHAR(50) DEFAULT 'consumer', -- 'consumer', 'business', 'admin'
  subscription_tier VARCHAR(50) DEFAULT 'free',
  account_status VARCHAR(50) DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Leads table
CREATE TABLE leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  problem_text TEXT NOT NULL,
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

-- Businesses table
CREATE TABLE businesses (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  business_name VARCHAR(255) NOT NULL,
  service_categories VARCHAR(100)[],
  location_zip VARCHAR(10) NOT NULL,
  location_city VARCHAR(100) NOT NULL,
  location_state VARCHAR(2) NOT NULL,
  location_point GEOGRAPHY(POINT, 4326) NOT NULL,
  phone VARCHAR(20) NOT NULL,
  email VARCHAR(255) NOT NULL,
  rating_avg DECIMAL(3,2),
  response_rate DECIMAL(5,2),
  subscription_tier VARCHAR(50) DEFAULT 'free',
  subscription_status VARCHAR(50) DEFAULT 'active',
  notifications_paused BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Matches table
CREATE TABLE matches (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  confidence_score DECIMAL(3,2) NOT NULL,
  distance_miles DECIMAL(6,2),
  status VARCHAR(50) NOT NULL DEFAULT 'pending',
  notified_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(lead_id, business_id)
);

-- Calls table
CREATE TABLE calls (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES leads(id) ON DELETE SET NULL,
  business_id UUID REFERENCES businesses(id) ON DELETE SET NULL,
  initiator_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_phone VARCHAR(20) NOT NULL,
  call_objective TEXT NOT NULL,
  status VARCHAR(50) NOT NULL DEFAULT 'queued',
  scheduled_for TIMESTAMPTZ,
  started_at TIMESTAMPTZ,
  ended_at TIMESTAMPTZ,
  duration_seconds INTEGER,
  transcript JSONB,
  summary TEXT,
  outcome VARCHAR(100),
  recording_url TEXT,
  estimated_cost_usd DECIMAL(10,4),
  actual_cost_usd DECIMAL(10,4),
  cost_breakdown JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Conversions table (for learning/analytics)
CREATE TABLE conversions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID NOT NULL REFERENCES leads(id) ON DELETE CASCADE,
  business_id UUID NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  match_id UUID NOT NULL REFERENCES matches(id) ON DELETE CASCADE,
  converted_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  job_value_usd DECIMAL(10,2),
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_leads_user_id ON leads(user_id);
CREATE INDEX idx_leads_status ON leads(status);
CREATE INDEX idx_leads_location ON leads USING GIST(location_point);
CREATE INDEX idx_leads_service_category ON leads(service_category);
CREATE INDEX idx_leads_created_at ON leads(created_at DESC);

CREATE INDEX idx_businesses_user_id ON businesses(user_id);
CREATE INDEX idx_businesses_location ON businesses USING GIST(location_point);
CREATE INDEX idx_businesses_service_categories ON businesses USING GIN(service_categories);
CREATE INDEX idx_businesses_subscription ON businesses(subscription_status) WHERE subscription_status = 'active';

CREATE INDEX idx_matches_lead_id ON matches(lead_id);
CREATE INDEX idx_matches_business_id ON matches(business_id);
CREATE INDEX idx_matches_status ON matches(status);

CREATE INDEX idx_calls_lead_id ON calls(lead_id);
CREATE INDEX idx_calls_business_id ON calls(business_id);
CREATE INDEX idx_calls_initiator_id ON calls(initiator_id);
CREATE INDEX idx_calls_status ON calls(status);
CREATE INDEX idx_calls_created_at ON calls(created_at DESC);

CREATE INDEX idx_conversions_lead_id ON conversions(lead_id);
CREATE INDEX idx_conversions_business_id ON conversions(business_id);

-- Enable Row Level Security
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE businesses ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
ALTER TABLE conversions ENABLE ROW LEVEL SECURITY;

-- RLS Policies for Users
CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

-- RLS Policies for Leads (Consumers)
CREATE POLICY "Users can view own leads" ON leads FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own leads" ON leads FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own leads" ON leads FOR UPDATE USING (auth.uid() = user_id);

-- RLS Policies for Businesses
CREATE POLICY "Businesses can view own profile" ON businesses FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Businesses can update own profile" ON businesses FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Businesses can view matched leads" ON leads FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM matches
    WHERE matches.lead_id = leads.id
      AND matches.business_id IN (SELECT id FROM businesses WHERE user_id = auth.uid())
      AND matches.status != 'declined'
  )
);

-- RLS Policies for Matches
CREATE POLICY "Consumers can view own lead matches" ON matches FOR SELECT USING (
  EXISTS (SELECT 1 FROM leads WHERE leads.id = matches.lead_id AND leads.user_id = auth.uid())
);
CREATE POLICY "Businesses can view own matches" ON matches FOR SELECT USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = matches.business_id AND businesses.user_id = auth.uid())
);
CREATE POLICY "Businesses can update own matches" ON matches FOR UPDATE USING (
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = matches.business_id AND businesses.user_id = auth.uid())
);

-- RLS Policies for Calls
CREATE POLICY "Users can view own calls" ON calls FOR SELECT USING (
  auth.uid() = initiator_id OR
  EXISTS (SELECT 1 FROM leads WHERE leads.id = calls.lead_id AND leads.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = calls.business_id AND businesses.user_id = auth.uid())
);

-- RLS Policies for Conversions
CREATE POLICY "Users can view own conversions" ON conversions FOR SELECT USING (
  EXISTS (SELECT 1 FROM leads WHERE leads.id = conversions.lead_id AND leads.user_id = auth.uid()) OR
  EXISTS (SELECT 1 FROM businesses WHERE businesses.id = conversions.business_id AND businesses.user_id = auth.uid())
);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers to automatically update updated_at
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
```

---

## Step 3: Execute Migration

1. **Paste** the entire SQL script into the Supabase SQL Editor
2. Click the **"Run"** button (bottom right corner)
3. Wait for confirmation: "Success. No rows returned"

---

## Step 4: Verify Tables Created

1. Click on **"Table Editor"** in left sidebar
2. You should see these tables:
   - ✅ `users`
   - ✅ `leads`
   - ✅ `businesses`
   - ✅ `matches`
   - ✅ `calls`
   - ✅ `conversions`

---

## Step 5: Create Database Function for Admin Queries

After running the main migration, run this additional SQL to enable admin queries:

```sql
-- Create function for getting audit events
CREATE OR REPLACE FUNCTION get_audit_events(
  event_type_filter TEXT DEFAULT NULL,
  user_id_filter UUID DEFAULT NULL,
  start_date TIMESTAMPTZ DEFAULT NULL,
  end_date TIMESTAMPTZ DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  event_type VARCHAR(100),
  user_id UUID,
  user_email VARCHAR(255),
  details JSONB,
  created_at TIMESTAMPTZ
) AS $$
BEGIN
  -- For now, return empty result (audit_events table will be added later)
  RETURN QUERY SELECT NULL::UUID, NULL::VARCHAR(100), NULL::UUID, NULL::VARCHAR(255), NULL::JSONB, NULL::TIMESTAMPTZ WHERE FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION get_audit_events TO authenticated;
```

---

## Step 6: Test Connection

Run this query in SQL Editor to verify everything works:

```sql
-- Test query
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('users', 'leads', 'businesses', 'matches', 'calls', 'conversions')
ORDER BY table_name;
```

Expected result: 6 rows showing each table with their column counts.

---

## ✅ Post-Migration Checklist

- [ ] All 6 tables created
- [ ] PostGIS extension enabled (check "Extensions" tab)
- [ ] Row Level Security enabled on all tables
- [ ] Indexes created for performance
- [ ] Triggers set up for `updated_at` columns
- [ ] Test query returns 6 rows

---

## 🚀 Next Steps After Migration

Once the migration is complete, you can:

### 1. Test Lead Submission
```bash
# Open in browser:
http://localhost:3002/consumer

# Submit a test lead and verify it appears in database
```

### 2. Create Test User in Supabase
```sql
-- Run in SQL Editor to create a test user
INSERT INTO users (id, email, full_name, role)
VALUES (
  'test-user-id-from-clerk',
  'test@example.com',
  'Test User',
  'consumer'
);
```

### 3. Create Test Business
```sql
-- Run in SQL Editor to create a test business
INSERT INTO users (id, email, full_name, role)
VALUES (
  'test-business-id-from-clerk',
  'business@example.com',
  'Test Business',
  'business'
);

INSERT INTO businesses (
  user_id,
  business_name,
  service_categories,
  location_zip,
  location_city,
  location_state,
  location_point,
  phone,
  email
)
VALUES (
  'test-business-id-from-clerk',
  'Acme Plumbing',
  ARRAY['plumbing', 'emergency'],
  '46032',
  'Carmel',
  'IN',
  ST_GeogFromText('POINT(-86.1180 39.9784)'),
  '+15551234567',
  'business@example.com'
);
```

### 4. Update Your Clerk User ID in Admin Config
```bash
# Edit src/lib/auth/admin.ts and replace with your Clerk user ID:

export const GOD_ADMINS = [
  'user_YOUR_ACTUAL_CLERK_ID', // Get from Clerk dashboard
];
```

---

## 🆘 Troubleshooting

### "Error: relation already exists"
- Tables were already created
- Run `DROP TABLE IF EXISTS users, leads, businesses, matches, calls, conversions CASCADE;` first
- Then re-run migration

### "Error: extension postgis does not exist"
- Go to Database → Extensions in Supabase
- Search for "postgis"
- Click "Enable"
- Re-run migration

### "Error: permission denied"
- Make sure you're signed into the correct Supabase project
- Verify you have Owner or Admin role

---

## 📞 Need Help?

If you encounter issues:
1. Check Supabase logs: Database → Logs
2. Verify extensions are enabled: Database → Extensions
3. Check RLS policies: Authentication → Policies
4. Review table structure: Table Editor → click table name

---

**Migration Status:** ⏳ Pending Manual Execution

Once complete, update this document with: ✅ Migration Complete - [Date]
