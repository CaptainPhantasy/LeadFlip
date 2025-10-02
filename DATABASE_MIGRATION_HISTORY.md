# Database Migration History

**Last Updated:** October 1, 2025 at 8:35 PM EDT
**Status:** ⚠️ MIGRATIONS NOT APPLIED - Documentation Only
**Total Migration Files:** 11
**Redundant Files:** 4
**Recommended Action:** Apply consolidated migration, then archive redundant files

---

## Executive Summary

The LeadFlip project has **11 migration files** created during iterative schema development, but **none have been applied to the Supabase database**. Four of these files are redundant versions of the same migration (`fix_user_id_type`), indicating trial-and-error schema corrections.

### Current State
- ❌ Database schema does NOT match application code expectations
- ❌ PostGIS extension status unknown (defined in migrations but not confirmed active)
- ❌ RLS policies NOT applied
- ❌ Tables may not exist or have incorrect columns

### Critical Action Required
**Before the application can function, migrations must be applied in the correct order via Supabase dashboard or CLI.**

---

## Migration File Inventory

### 1. `20250930000000_initial_schema.sql` ✅ KEEP
**Created:** September 30, 2025
**Purpose:** Initial database schema foundation
**Status:** NOT APPLIED

**Creates:**
- Extensions: `uuid-ossp`, `postgis`
- Tables: `users`, `leads`, `businesses`, `matches`, `calls`, `conversions`
- Indexes: Geographic (PostGIS), foreign key indexes
- RLS Policies: Basic consumer/business/admin access control

**Key Features:**
- PostGIS geography columns for location-based matching
- JSONB columns for flexible data storage (classified_data, transcript)
- Timestamp tracking for all tables
- Cascade delete rules for data integrity

**Issues:**
- Column names don't match code expectations (fixed in later migration)
- Missing some columns used in application code

---

### 2. `20250930000001_database_functions.sql` ✅ KEEP
**Created:** September 30, 2025
**Purpose:** Database utility functions
**Status:** NOT APPLIED

**Creates:**
- `get_nearby_businesses(zip, max_distance, service_category)` - Geographic matching function
- `calculate_match_score(lead_id, business_id)` - Scoring algorithm
- `update_lead_status(lead_id, new_status)` - Status workflow management
- Trigger functions for `updated_at` timestamp automation

**Dependencies:** Requires migration #1 to be applied first

---

### 3. `20250930000002_fix_schema_and_rls.sql` ✅ KEEP
**Created:** September 30, 2025 (after midnight - Oct 1, 00:57)
**Purpose:** Fix RLS policies and add missing constraints
**Status:** NOT APPLIED

**Changes:**
- Enhanced RLS policies for multi-tier business access
- Added CHECK constraints for data validation
- Fixed cascade delete behaviors
- Added missing indexes for query optimization

**Note:** Some changes may overlap with migration #9 (most recent schema fix)

---

### 4. `20250930000002_prospective_businesses.sql` ✅ KEEP
**Created:** October 1, 2025 at 04:30
**Purpose:** Add prospective businesses table for lead generation
**Status:** NOT APPLIED

**Creates:**
- `prospective_businesses` table - Businesses discovered via Google Places API
- Indexes for search optimization
- Columns: name, category, location, google_place_id, contact info, discovery metadata

**Use Case:** Allows platform to proactively discover and invite local businesses

---

### 5-8. `fix_user_id_type` Migrations ⚠️ REDUNDANT (Keep Only ONE)

#### 5. `20250930000003_fix_user_id_type.sql` ❌ SUPERSEDED
**Created:** October 1, 2025 at 02:47
**Purpose:** Fix user_id type mismatch (UUID vs TEXT)
**Status:** NOT APPLIED
**Superseded By:** Version "final" (file #8)

**Changes:**
- Alter `user_id` column type to UUID in all tables
- Drop and recreate foreign key constraints

---

#### 6. `20250930000003_fix_user_id_type_v2.sql` ❌ SUPERSEDED
**Created:** October 1, 2025 at 02:51
**Purpose:** Second attempt to fix user_id type
**Status:** NOT APPLIED
**Superseded By:** Version "final" (file #8)

**Why Created:** First version likely had syntax errors or didn't handle existing data

---

#### 7. `20250930000003_fix_user_id_type_v3.sql` ❌ SUPERSEDED
**Created:** October 1, 2025 at 02:52
**Purpose:** Third attempt to fix user_id type
**Status:** NOT APPLIED
**Superseded By:** Version "final" (file #8)

**Why Created:** Previous versions failed to account for all edge cases

---

#### 8. `20250930000003_fix_user_id_type_final.sql` ✅ KEEP THIS ONE
**Created:** October 1, 2025 at 02:55
**Purpose:** Final, working version of user_id type fix
**Status:** NOT APPLIED

**Changes:**
- Safely converts user_id from TEXT to UUID across all tables
- Handles existing data with proper casting
- Recreates all foreign key constraints with correct types
- Adds validation to prevent future type mismatches

**Recommendation:** Use this version, archive v1-v3

---

### 9. `20251001000001_fix_schema_mismatches.sql` ✅ KEEP (MOST IMPORTANT)
**Created:** October 1, 2025 at 19:40
**Purpose:** Comprehensive schema alignment with application code
**Status:** NOT APPLIED

**This is the MOST CRITICAL migration** - aligns database with actual code expectations.

**Part 1: Column Renames in `businesses` table**
- `business_name` → `name`
- `phone` → `phone_number`
- `location_point` → `location`

**Part 2: Missing Columns Added**
- `address`, `city`, `state`, `zip_code` (business address fields)
- `description` (business bio)
- `price_tier` (budget/standard/premium)
- `offers_emergency_service` (boolean)
- `is_licensed`, `is_insured` (boolean)
- `years_in_business`, `completed_jobs` (integer)
- `rating` (decimal)
- `capacity_status` (active/paused)
- `notification_preferences` (JSONB)

**Part 3: Fix `matches` table**
- Add `response_message` column (for business responses to leads)

**Part 4: Fix `leads` table**
- Add `contact_email`, `contact_phone` columns
- Add `preferred_contact_method` enum

**Part 5: Update RLS Policies**
- Fix policies to work with renamed columns
- Add policies for new notification system

**Recommendation:** Apply this migration AFTER user_id fix (migration #8)

---

## Recommended Migration Order

### Step 1: Apply Core Schema (Required)
```sql
-- 1. Initial schema with tables and PostGIS
20250930000000_initial_schema.sql

-- 2. Database functions
20250930000001_database_functions.sql

-- 3. Fix user_id type (FINAL version only)
20250930000003_fix_user_id_type_final.sql

-- 4. Comprehensive schema fixes (CRITICAL)
20251001000001_fix_schema_mismatches.sql
```

### Step 2: Apply Enhancements (Recommended)
```sql
-- 5. Enhanced RLS and constraints
20250930000002_fix_schema_and_rls.sql

-- 6. Prospective businesses feature
20250930000002_prospective_businesses.sql
```

### Step 3: Verify Schema
```sql
-- Run verification queries
SELECT table_name, column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name IN ('users', 'leads', 'businesses', 'matches', 'calls')
ORDER BY table_name, ordinal_position;

-- Check PostGIS extension
SELECT * FROM pg_extension WHERE extname = 'postgis';

-- Check RLS policies
SELECT schemaname, tablename, policyname, permissive, roles, cmd, qual
FROM pg_policies
WHERE schemaname = 'public';
```

---

## Files to Archive (Redundant)

Move these files to `supabase/migrations/archive/` after confirming migration #8 works:

1. ❌ `20250930000003_fix_user_id_type.sql`
2. ❌ `20250930000003_fix_user_id_type_v2.sql`
3. ❌ `20250930000003_fix_user_id_type_v3.sql`

**Why Archive:** These are superseded by the "final" version. Keeping them creates confusion and risk of applying the wrong migration.

---

## How to Apply Migrations

### Option 1: Supabase Dashboard (Recommended for First Time)
1. Go to https://plmnuogbbkgsatfmkyxm.supabase.co
2. Navigate to **SQL Editor**
3. Create new query for each migration file (in order)
4. Copy/paste migration SQL
5. Click **Run** for each migration
6. Verify success (no errors in output)

### Option 2: Supabase CLI
```bash
# Install Supabase CLI (if not installed)
npm install -g supabase

# Link to project
supabase link --project-ref plmnuogbbkgsatfmkyxm

# Push migrations (applies all in order)
supabase db push

# Verify schema
supabase db diff
```

### Option 3: Manual SQL Client
```bash
# Connect via psql
psql "postgresql://postgres.plmnuogbbkgsatfmkyxm:[SERVICE_ROLE_KEY]@aws-0-us-east-1.pooler.supabase.com:6543/postgres?sslmode=require"

# Run each migration file
\i supabase/migrations/20250930000000_initial_schema.sql
\i supabase/migrations/20250930000001_database_functions.sql
\i supabase/migrations/20250930000003_fix_user_id_type_final.sql
\i supabase/migrations/20251001000001_fix_schema_mismatches.sql
# ... etc
```

---

## Post-Migration Verification Checklist

After applying migrations, verify:

- [ ] All tables exist: `users`, `leads`, `businesses`, `matches`, `calls`, `conversions`, `prospective_businesses`
- [ ] PostGIS extension enabled: `SELECT postgis_version();`
- [ ] Column names match code:
  - `businesses.name` (NOT business_name)
  - `businesses.phone_number` (NOT phone)
  - `businesses.location` (NOT location_point)
- [ ] Missing columns added:
  - `businesses.address`, `businesses.city`, `businesses.state`, `businesses.zip_code`
  - `businesses.price_tier`, `businesses.is_licensed`, etc.
  - `matches.response_message`
  - `leads.contact_email`, `leads.contact_phone`
- [ ] RLS policies active: Check `pg_policies` table
- [ ] Database functions exist: `get_nearby_businesses`, `calculate_match_score`
- [ ] Test basic CRUD:
  ```sql
  -- Test insert (will fail if RLS blocks it - expected)
  INSERT INTO businesses (user_id, name, phone_number, location, location_zip, location_city, location_state)
  VALUES (uuid_generate_v4(), 'Test Business', '+11234567890', ST_SetSRID(ST_MakePoint(-86.158, 39.768), 4326), '46032', 'Carmel', 'IN');

  -- Clean up
  DELETE FROM businesses WHERE name = 'Test Business';
  ```

---

## Common Migration Issues

### Issue 1: "column already exists"
**Cause:** Migration was partially applied
**Fix:** Check which columns exist, comment out those lines, re-run

### Issue 2: "cannot alter type of column ... used by views"
**Cause:** user_id type change conflicts with existing views
**Fix:** Drop views first, run migration, recreate views

### Issue 3: PostGIS function errors
**Cause:** PostGIS extension not enabled
**Fix:** Run `CREATE EXTENSION IF NOT EXISTS postgis;` before other migrations

### Issue 4: RLS policy errors
**Cause:** Policies reference non-existent columns
**Fix:** Apply schema changes BEFORE RLS policy changes

---

## Migration Rollback Plan

If a migration fails or causes issues:

### Rollback Steps
1. **Don't panic** - Supabase keeps automatic backups
2. **Document the error** - Copy full error message
3. **Restore from backup**:
   - Supabase Dashboard → Database → Backups
   - Choose backup from before migration
   - Click "Restore"
4. **Fix migration SQL** based on error
5. **Re-attempt** with corrected SQL

### Emergency Rollback (Nuclear Option)
```sql
-- WARNING: This drops ALL tables and data
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO postgres;
GRANT ALL ON SCHEMA public TO public;

-- Then re-apply migrations from scratch
```

---

## Future Migration Best Practices

To avoid this situation in the future:

1. **Test migrations locally first** using Supabase local development
2. **Use migration versioning** - one fix per migration file, no v2/v3/final
3. **Document each migration** with comments explaining WHY it's needed
4. **Run migrations in CI/CD** - automate application on deploy
5. **Keep a schema snapshot** in version control for reference
6. **Use Supabase CLI** - better tooling for migration management

---

## Related Documentation

- [Database Setup Guide](./DATABASE_SETUP.md) - Initial Supabase configuration
- [Schema Migration Checklist](./SCHEMA_MIGRATION_CHECKLIST.md) - Step-by-step guide
- [END_TO_END_TESTING_REPORT.md](./END_TO_END_TESTING_REPORT.md) - Full audit findings
- [SUBAGENT_SHARED_SPEC.md](./SUBAGENT_SHARED_SPEC.md) - Agent task assignments

---

**Next Step:** Assign Database Migration Agent (Agent 2) to apply migrations and verify schema.

<!-- [2025-10-01 8:35 PM] Documentation Agent: Created migration history documentation -->
