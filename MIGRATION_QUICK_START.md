# Database Migration - Quick Start Guide

**Status:** ⏳ Ready to Execute
**Time Required:** 5 minutes
**Risk Level:** Low (safe execution with IF NOT EXISTS clauses)

---

## TL;DR - Execute These Steps

### Step 1: Apply Migration (2 minutes)

1. Go to: https://plmnuogbbkgsatfmkyxm.supabase.co
2. Click: SQL Editor (left sidebar)
3. Open file: `supabase/migrations/20251001000002_consolidated_schema_final.sql`
4. Copy all contents (Cmd+A, Cmd+C)
5. Paste into SQL Editor
6. Click: "Run" button
7. Wait for: "Success. No rows returned"

### Step 2: Verify Migration (1 minute)

Run this query in SQL Editor:
```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
```

**Expected Output (7 tables):**
```
businesses
calls
conversions
leads
matches
prospective_businesses
users
```

### Step 3: Test CRUD Operations (2 minutes)

1. Open file: `scripts/test-schema-crud.sql`
2. Copy all contents
3. Paste into SQL Editor
4. Click: "Run"
5. Verify last output: `remaining_test_users = 0`

✅ **Done!** Schema is ready for application use.

---

## What This Migration Does

### Creates 7 Tables
- ✅ `users` - Clerk authentication (TEXT IDs)
- ✅ `leads` - Consumer problems
- ✅ `businesses` - Service providers
- ✅ `matches` - Lead-to-business matches
- ✅ `calls` - AI call records
- ✅ `conversions` - Closed deals
- ✅ `prospective_businesses` - Discovery system

### Enables PostGIS
- ✅ Geographic distance calculations
- ✅ GEOGRAPHY(POINT, 4326) columns
- ✅ GIST indexes for performance

### Creates 6 Database Functions
- ✅ `get_nearby_businesses()` - Find businesses within radius
- ✅ `calculate_response_rate()` - Business performance
- ✅ `get_conversion_stats()` - Analytics
- ✅ `detect_spam_patterns()` - Quality control
- ✅ `get_business_performance()` - Audit reports
- ✅ `update_updated_at_column()` - Auto timestamps

### Configures Security
- ⚠️ RLS disabled (using Clerk app-level auth)
- ✅ Application enforces user permissions
- 📝 Re-enable RLS when Clerk JWT configured

---

## Troubleshooting

### Error: "relation already exists"
**Solution:** Migration uses `IF NOT EXISTS`, this is safe to ignore

### Error: "extension postgis does not exist"
**Solution:** Run this first:
```sql
CREATE EXTENSION IF NOT EXISTS "postgis";
```

### Error: "column does not exist"
**Solution:** Some migrations may have partially applied. Run consolidated migration anyway - it will skip existing objects.

### CRUD Tests Fail
**Solution:** Check migration output for errors. Verify all tables created in Table Editor.

---

## Files Reference

**Main Migration:**
```
/Volumes/Storage/Development/LeadFlip/supabase/migrations/20251001000002_consolidated_schema_final.sql
```

**Test Script:**
```
/Volumes/Storage/Development/LeadFlip/scripts/test-schema-crud.sql
```

**Full Documentation:**
```
/Volumes/Storage/Development/LeadFlip/DATABASE_MIGRATION_STATUS.md
```

---

## After Migration

### Update Application
1. ✅ Schema matches code expectations
2. ✅ Run `npm run build` to verify no errors
3. ✅ Test lead submission endpoint
4. ✅ Test business registration endpoint

### Verify Functionality
```bash
# Test tRPC endpoints
npm run dev

# In another terminal
curl http://localhost:3000/api/trpc/lead.submit
```

---

**Last Updated:** October 1, 2025, 9:20 PM EDT
**Agent:** Database Migration Agent
