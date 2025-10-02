# LeadFlip Database Schema Diagram

**Schema Version:** 1.0 (Consolidated)
**Last Updated:** October 1, 2025, 9:30 PM EDT
**Total Tables:** 7

---

## Entity Relationship Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LEADFLIP DATABASE SCHEMA                     │
└─────────────────────────────────────────────────────────────────────┘

                            ┌──────────────┐
                            │    USERS     │ (Clerk Auth)
                            ├──────────────┤
                            │ id (TEXT PK) │ ← Clerk ID: user_xxxxx
                            │ email        │
                            │ full_name    │
                            │ role         │ (consumer/business/admin)
                            │ created_at   │
                            └──────────────┘
                                    │
                    ┌───────────────┼───────────────┐
                    │               │               │
                    ▼               ▼               ▼
            ┌──────────────┐ ┌──────────────┐ ┌──────────────┐
            │    LEADS     │ │  BUSINESSES  │ │    CALLS     │
            ├──────────────┤ ├──────────────┤ ├──────────────┤
            │ id (UUID PK) │ │ id (UUID PK) │ │ id (UUID PK) │
            │ user_id (FK) │ │ user_id (FK) │ │ initiator_id │
            │ problem_text │ │ name         │ │ consumer_id  │
            │ contact_phone│ │ phone_number │ │ target_phone │
            │ contact_email│ │ location     │ │ call_type    │
            │ category     │ │  (PostGIS)   │ │ system_prompt│
            │ urgency      │ │ categories[] │ │ transcript   │
            │ budget_max   │ │ rating       │ │ outcome      │
            │ quality_score│ │ is_active    │ │ recording_url│
            │ status       │ │ ...          │ │ duration     │
            └──────────────┘ └──────────────┘ └──────────────┘
                    │               │               │
                    └───────┬───────┘               │
                            ▼                       │
                    ┌──────────────┐                │
                    │   MATCHES    │                │
                    ├──────────────┤                │
                    │ id (UUID PK) │                │
                    │ lead_id (FK) │◄───────────────┘
                    │ business_id  │◄───────────────┐
                    │ confidence   │                │
                    │ distance_mi  │                │
                    │ status       │                │
                    │ response_msg │                │
                    └──────────────┘                │
                            │                       │
                            ▼                       │
                    ┌──────────────┐                │
                    │ CONVERSIONS  │                │
                    ├──────────────┤                │
                    │ id (UUID PK) │                │
                    │ lead_id (FK) │                │
                    │ business_id  │────────────────┘
                    │ match_id (FK)│
                    │ job_value    │
                    │ converted_at │
                    └──────────────┘

                 ┌──────────────────────────┐
                 │  PROSPECTIVE_BUSINESSES  │ (Discovery System)
                 ├──────────────────────────┤
                 │ id (UUID PK)             │
                 │ google_place_id          │
                 │ name                     │
                 │ location (PostGIS)       │
                 │ rating                   │
                 │ invitation_status        │
                 │ activated_business_id FK │───┐
                 └──────────────────────────┘   │
                                                │
                                        (Links to BUSINESSES
                                         when activated)
```

---

## Table Details

### 1. USERS (Clerk Sync)
**Purpose:** User authentication and profile data
**Key Type:** TEXT (Clerk format: `user_xxxxx`)
**Rows:** ~100s to 1000s

| Column | Type | Description |
|--------|------|-------------|
| id | TEXT | Clerk user ID (PK) |
| email | VARCHAR(255) | User email (unique) |
| full_name | VARCHAR(255) | Display name |
| role | VARCHAR(50) | consumer/business/admin |
| subscription_tier | VARCHAR(50) | free/starter/professional |
| account_status | VARCHAR(50) | active/suspended/deleted |

**Relationships:**
- → leads (1:many)
- → businesses (1:many)
- → calls (1:many as initiator/consumer)

---

### 2. LEADS (Consumer Problems)
**Purpose:** Store consumer service requests
**Key Type:** UUID
**Rows:** ~1000s to 10,000s per month

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | Consumer user (FK → users) |
| problem_text | TEXT | Raw consumer input |
| contact_phone | VARCHAR(20) | Consumer phone (AI calling) |
| contact_email | VARCHAR(255) | Consumer email |
| service_category | VARCHAR(100) | plumbing/hvac/electrical/etc |
| urgency | VARCHAR(50) | emergency/urgent/standard |
| budget_max | INTEGER | Max budget in USD |
| location_zip | VARCHAR(10) | ZIP code |
| quality_score | DECIMAL(3,1) | 0-10 lead quality |
| status | VARCHAR(50) | pending/matched/converted |
| classified_data | JSONB | AI classifier output |

**Indexes:**
- user_id, status, service_category, quality_score, created_at
- PostGIS GIST on location_point

---

### 3. BUSINESSES (Service Providers)
**Purpose:** Business profiles and capabilities
**Key Type:** UUID
**Rows:** ~100s to 1000s

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | TEXT | Business owner (FK → users) |
| name | VARCHAR(255) | Business name |
| phone_number | VARCHAR(20) | Business phone (E.164) |
| email | VARCHAR(255) | Business email |
| address | VARCHAR(500) | Street address |
| city | VARCHAR(100) | City |
| state | VARCHAR(2) | State code |
| zip_code | VARCHAR(10) | ZIP code |
| **location** | **GEOGRAPHY(POINT)** | **PostGIS coordinates** |
| service_categories | VARCHAR(100)[] | Array of services |
| price_tier | VARCHAR(50) | budget/standard/premium |
| offers_emergency_service | BOOLEAN | 24/7 availability |
| is_licensed | BOOLEAN | Licensed professional |
| is_insured | BOOLEAN | Insured business |
| is_active | BOOLEAN | Profile active |
| rating | DECIMAL(3,2) | 0-5.00 rating |
| years_in_business | INTEGER | Experience years |
| completed_jobs | INTEGER | Job count |
| max_monthly_leads | INTEGER | Capacity limit |
| notifications_paused | BOOLEAN | Receiving leads |

**Indexes:**
- user_id, service_categories (GIN), price_tier, is_active
- **PostGIS GIST on location** (distance queries)

---

### 4. MATCHES (Lead-to-Business Matching)
**Purpose:** Track lead-business matches and responses
**Key Type:** UUID
**Rows:** ~10,000s to 100,000s per month

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| lead_id | UUID | Lead reference (FK) |
| business_id | UUID | Business reference (FK) |
| confidence_score | DECIMAL(3,2) | 0-1 match quality |
| distance_miles | DECIMAL(6,2) | Distance from lead |
| match_reasons | JSONB | Why matched |
| status | VARCHAR(50) | pending/accepted/declined |
| response_message | TEXT | Business response |
| notified_at | TIMESTAMPTZ | When notified |
| responded_at | TIMESTAMPTZ | When responded |

**Unique Constraint:** (lead_id, business_id)
**Indexes:** lead_id, business_id, status, created_at

---

### 5. CALLS (AI Voice Calls)
**Purpose:** Track AI-powered phone calls
**Key Type:** UUID
**Rows:** ~100s to 1000s per month

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| lead_id | UUID | Related lead (FK, nullable) |
| business_id | UUID | Related business (FK, nullable) |
| consumer_id | TEXT | Consumer user (FK → users) |
| initiator_id | TEXT | Who requested call (FK → users) |
| target_phone | VARCHAR(20) | Phone to call |
| call_type | VARCHAR(100) | business_to_consumer/etc |
| call_objective | TEXT | Purpose of call |
| system_prompt | TEXT | AI instructions |
| status | VARCHAR(50) | queued/in_progress/completed |
| transcript | JSONB | Call transcript |
| summary | TEXT | AI-generated summary |
| outcome | VARCHAR(100) | goal_achieved/voicemail/etc |
| recording_url | TEXT | Audio file URL |
| duration_seconds | INTEGER | Call length |

**Indexes:** lead_id, business_id, consumer_id, initiator_id, status, created_at

---

### 6. CONVERSIONS (Closed Deals)
**Purpose:** Track successful lead conversions for learning
**Key Type:** UUID
**Rows:** ~100s to 1000s per month

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| lead_id | UUID | Converted lead (FK) |
| business_id | UUID | Winning business (FK) |
| match_id | UUID | Original match (FK) |
| job_value_usd | DECIMAL(10,2) | Deal value |
| final_price | DECIMAL(10,2) | Actual price |
| notes | TEXT | Conversion details |
| converted_at | TIMESTAMPTZ | When closed |

**Indexes:** lead_id, business_id

---

### 7. PROSPECTIVE_BUSINESSES (Discovery System)
**Purpose:** Store discovered businesses before invitation
**Key Type:** UUID
**Rows:** ~1000s to 10,000s

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| google_place_id | TEXT | Google Places ID (unique) |
| name | TEXT | Business name |
| location | GEOGRAPHY(POINT) | PostGIS coordinates |
| rating | NUMERIC(2,1) | Google rating |
| service_category | TEXT | Primary service |
| invitation_status | TEXT | pending/invited/activated |
| invitation_sent_at | TIMESTAMPTZ | When invited |
| activated | BOOLEAN | Joined platform |
| activated_business_id | UUID | FK to businesses (when joined) |

**Indexes:** service_category, invitation_status, zip_code, rating
**PostGIS GIST:** location

---

## Database Functions

### 1. get_nearby_businesses()
**Purpose:** Find businesses within radius using PostGIS
**Parameters:**
- p_service_category (TEXT)
- p_latitude (DOUBLE PRECISION)
- p_longitude (DOUBLE PRECISION)
- p_max_distance_miles (DOUBLE PRECISION)
- p_min_rating (DOUBLE PRECISION)

**Returns:** Table of businesses with distance_miles

**Usage:**
```sql
SELECT * FROM get_nearby_businesses(
  'plumbing',
  40.0334,  -- Carmel, IN
  -86.1180,
  10.0,     -- within 10 miles
  3.5       -- min rating
);
```

### 2. calculate_response_rate()
**Purpose:** Calculate business performance metric
**Parameters:**
- p_business_id (UUID)
- p_days_back (INTEGER, default 90)

**Returns:** DOUBLE PRECISION (0-1)

### 3. get_conversion_stats()
**Purpose:** Analytics for AI learning
**Parameters:**
- p_days_back (INTEGER, default 30)

**Returns:** Table with service_category, conversion_rate, avg_quality_score

### 4. detect_spam_patterns()
**Purpose:** Identify spam/low-quality leads
**Parameters:**
- p_days_back (INTEGER, default 7)

**Returns:** Table with pattern, occurrences, spam_probability

### 5. get_business_performance()
**Purpose:** Audit reports for business quality
**Parameters:**
- p_days_back (INTEGER, default 30)

**Returns:** Table with total_matches, response_rate, conversion_rate

### 6. update_updated_at_column()
**Purpose:** Trigger function to auto-update timestamps
**Attached to:** All tables (BEFORE UPDATE trigger)

---

## PostGIS Configuration

### Extension
```sql
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Geography Columns
- **businesses.location:** GEOGRAPHY(POINT, 4326)
- **leads.location_point:** GEOGRAPHY(POINT, 4326)
- **prospective_businesses.location:** GEOGRAPHY(POINT, 4326)

### GIST Indexes
```sql
CREATE INDEX idx_businesses_location ON businesses USING GIST(location);
CREATE INDEX idx_leads_location ON leads USING GIST(location_point);
CREATE INDEX idx_prospective_businesses_location ON prospective_businesses USING GIST(location);
```

### Distance Calculation
```sql
-- Calculate distance in miles
ST_Distance(
  b.location::geography,
  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography
) / 1609.34 AS distance_miles
```

---

## Row-Level Security (RLS)

### Current Status: DISABLED
**Reason:** Using service role with Clerk application-level auth

### When to Re-enable
1. Configure Clerk JWT in Supabase settings
2. Set up JWT secret from Clerk
3. Update auth.uid() to use Clerk user ID
4. Test policies with Clerk tokens
5. Enable RLS on all tables

### Policy Examples (for future)
```sql
-- Consumers view own leads
CREATE POLICY "consumers_own_leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);

-- Businesses view matched leads
CREATE POLICY "businesses_view_matches" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches m
      JOIN businesses b ON b.id = m.business_id
      WHERE m.lead_id = leads.id
        AND b.user_id = auth.uid()
    )
  );
```

---

## Migration Execution Flow

```
┌─────────────────────────────────────────────────────┐
│  MIGRATION EXECUTION FLOW                           │
└─────────────────────────────────────────────────────┘

1. Extensions
   ├── CREATE EXTENSION postgis
   └── CREATE EXTENSION uuid-ossp

2. Tables (in order)
   ├── users (no dependencies)
   ├── leads (FK → users)
   ├── businesses (FK → users)
   ├── matches (FK → leads, businesses)
   ├── calls (FK → users, leads, businesses)
   ├── conversions (FK → leads, businesses, matches)
   └── prospective_businesses (FK → businesses)

3. Indexes
   ├── Standard B-tree indexes
   ├── PostGIS GIST indexes
   ├── GIN indexes (arrays)
   └── Partial indexes (WHERE clauses)

4. Functions
   ├── update_updated_at_column()
   ├── get_nearby_businesses()
   ├── calculate_response_rate()
   ├── get_conversion_stats()
   ├── detect_spam_patterns()
   └── get_business_performance()

5. Triggers
   ├── update_users_updated_at
   ├── update_leads_updated_at
   ├── update_businesses_updated_at
   ├── update_matches_updated_at
   ├── update_calls_updated_at
   └── update_prospective_businesses_updated_at

6. RLS Configuration
   ├── DISABLE ROW LEVEL SECURITY (all tables)
   └── Add comments explaining why

7. Permissions
   └── GRANT EXECUTE on functions to anon, authenticated

8. Verification
   ├── Check PostGIS enabled
   ├── List all tables
   └── Verify user_id column types
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────┐
│  LEADFLIP DATA FLOW                                 │
└─────────────────────────────────────────────────────┘

1. CONSUMER SUBMITS LEAD
   │
   ├── Problem text entered in form
   ├── INSERT into leads table
   │   ├── user_id (from Clerk)
   │   ├── problem_text
   │   ├── contact_phone
   │   └── status = 'pending'
   │
   ├── AI Classifier processes
   │   └── Updates classified_data (JSONB)
   │
   └── Quality score calculated
       └── Updates quality_score (0-10)

2. BUSINESS MATCHING
   │
   ├── get_nearby_businesses() called
   │   ├── PostGIS distance calculation
   │   ├── Service category filter
   │   └── Rating filter (>3.5)
   │
   ├── Confidence scoring
   │   ├── Distance (closer = higher)
   │   ├── Rating (4+ stars = higher)
   │   └── Response rate (>70% = higher)
   │
   └── INSERT into matches table
       ├── lead_id, business_id
       ├── confidence_score
       ├── distance_miles
       └── status = 'pending'

3. NOTIFICATION SENT
   │
   ├── Email (SendGrid)
   ├── SMS (SignalWire)
   └── UPDATE matches.notified_at

4. BUSINESS RESPONDS
   │
   ├── UPDATE matches
   │   ├── status = 'accepted' or 'declined'
   │   ├── response_message
   │   └── responded_at = NOW()
   │
   └── If accepted:
       └── AI Call may be initiated

5. AI CALLING (Optional)
   │
   ├── INSERT into calls table
   │   ├── call_type = 'business_to_consumer'
   │   ├── system_prompt (generated)
   │   └── status = 'queued'
   │
   ├── BullMQ job queued
   ├── WebSocket server processes
   ├── SignalWire + OpenAI Realtime API
   │
   └── UPDATE calls
       ├── transcript (JSONB)
       ├── summary (AI generated)
       ├── outcome (goal_achieved, etc.)
       └── recording_url

6. CONVERSION (If successful)
   │
   └── INSERT into conversions table
       ├── lead_id, business_id, match_id
       ├── job_value_usd
       └── converted_at = NOW()

7. LEARNING / ANALYTICS
   │
   ├── get_conversion_stats() analyzes patterns
   ├── detect_spam_patterns() flags low quality
   ├── get_business_performance() ranks businesses
   │
   └── AI Agent memory updated (CLAUDE.md)
```

---

## Schema Version History

| Version | Date | Changes | Migration File |
|---------|------|---------|----------------|
| 0.1 | Sep 30, 2025 | Initial schema (UUID user_id) | 20250930000000_initial_schema.sql |
| 0.2 | Sep 30, 2025 | Database functions added | 20250930000001_database_functions.sql |
| 0.3 | Sep 30, 2025 | Fix column names, disable RLS | 20250930000002_fix_schema_and_rls.sql |
| 0.4 | Sep 30, 2025 | Fix user_id type (4 attempts) | 20250930000003_fix_user_id_type_*.sql |
| 0.5 | Oct 1, 2025 | Add missing columns | 20251001000001_fix_schema_mismatches.sql |
| **1.0** | **Oct 1, 2025** | **Consolidated final schema** | **20251001000002_consolidated_schema_final.sql** |

---

**Schema designed for:**
- ✅ Clerk authentication (TEXT user IDs)
- ✅ PostGIS geographic queries
- ✅ AI agent integration
- ✅ Scalability (100K+ leads/month)
- ✅ Learning/analytics for optimization

**Last Updated:** October 1, 2025, 9:30 PM EDT
**Maintained by:** Database Migration Agent
