# Schema Migration Execution Checklist

**Migration File**: `20251001000001_fix_schema_mismatches.sql`
**Track**: 2 - Database Schema Agent
**Status**: Ready for Execution

---

## Pre-Migration Checklist

- [ ] **Backup Database** (if production)
  ```sql
  -- In Supabase Dashboard, create a backup snapshot
  -- Settings → Database → Create Backup
  ```

- [ ] **Review Migration File**
  - File location: `/Volumes/Storage/Development/LeadFlip/supabase/migrations/20251001000001_fix_schema_mismatches.sql`
  - File size: 271 lines
  - No syntax errors detected

- [ ] **Verify Dependencies**
  - Initial schema migration (`20250930000000_initial_schema.sql`) has been applied
  - Check: Tables `businesses`, `leads`, `matches`, `calls` exist

---

## Migration Execution

### Step 1: Open Supabase SQL Editor

1. Navigate to: https://plmnuogbbkgsatfmkyxm.supabase.co
2. Go to **SQL Editor**
3. Create new query

### Step 2: Copy Migration SQL

```bash
# Copy the migration file contents
cat /Volumes/Storage/Development/LeadFlip/supabase/migrations/20251001000001_fix_schema_mismatches.sql
```

### Step 3: Execute Migration

1. Paste SQL into editor
2. Click **RUN**
3. Wait for completion (should take <5 seconds)
4. Check for errors

**Expected Output**:
```
Success. 45 rows returned.
```

### Step 4: Verify Changes

Run these verification queries one by one:

#### Verify businesses table columns:
```sql
SELECT column_name, data_type, is_nullable, column_default
FROM information_schema.columns
WHERE table_name = 'businesses'
ORDER BY ordinal_position;
```

**Expected**: Should see 25+ columns including:
- `name` (not business_name)
- `phone_number` (not phone)
- `location` (not location_point)
- `years_in_business`
- `completed_jobs`
- `rating`
- `address`, `city`, `state`, `zip_code`

#### Verify leads table columns:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'leads'
AND column_name IN ('contact_phone', 'contact_email');
```

**Expected**: Should return 2 rows

#### Verify matches table columns:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'matches'
AND column_name = 'response_message';
```

**Expected**: Should return 1 row

#### Verify calls table columns:
```sql
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_name = 'calls'
AND column_name IN ('consumer_id', 'call_type', 'system_prompt', 'scheduled_time');
```

**Expected**: Should return 4 rows

#### Verify indexes:
```sql
SELECT indexname, indexdef
FROM pg_indexes
WHERE tablename = 'businesses'
ORDER BY indexname;
```

**Expected**: Should see:
- `idx_businesses_location` (on location, not location_point)
- `idx_businesses_price_tier`
- `idx_businesses_is_active`
- `idx_businesses_offers_emergency`

#### Verify constraints:
```sql
SELECT conname, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE conrelid = 'businesses'::regclass
ORDER BY conname;
```

**Expected**: Should see:
- `businesses_price_tier_check`
- `businesses_rating_check`
- `businesses_rating_avg_check`
- `businesses_years_in_business_check`
- `businesses_completed_jobs_check`

---

## Post-Migration Testing

### Test 1: Check Existing Data
```sql
-- Verify no data was lost
SELECT COUNT(*) FROM businesses;
SELECT COUNT(*) FROM leads;
SELECT COUNT(*) FROM matches;
SELECT COUNT(*) FROM calls;
```

**Expected**: Same counts as before migration

### Test 2: Test Insert (businesses)
```sql
-- Test that new columns work
INSERT INTO businesses (
  id,
  user_id,
  name,
  phone_number,
  email,
  location,
  location_zip,
  location_city,
  location_state,
  service_categories,
  address,
  city,
  state,
  zip_code,
  price_tier,
  is_active,
  years_in_business,
  completed_jobs,
  rating
) VALUES (
  uuid_generate_v4(),
  uuid_generate_v4(), -- Replace with real user_id
  'Test Business',
  '+1234567890',
  'test@example.com',
  ST_SetSRID(ST_MakePoint(-86.15, 39.77), 4326),
  '46032',
  'Carmel',
  'IN',
  ARRAY['plumbing'],
  '123 Test St',
  'Carmel',
  'IN',
  '46032',
  'standard',
  true,
  5,
  100,
  4.5
) RETURNING id, name, phone_number, years_in_business;
```

**Expected**: Returns new record with all fields populated

**Important**: Delete test record after:
```sql
DELETE FROM businesses WHERE name = 'Test Business';
```

### Test 3: Test Insert (leads)
```sql
-- Test contact fields
INSERT INTO leads (
  id,
  user_id,
  problem_text,
  contact_phone,
  contact_email
) VALUES (
  uuid_generate_v4(),
  uuid_generate_v4(), -- Replace with real user_id
  'Test problem',
  '+1234567890',
  'consumer@example.com'
) RETURNING id, contact_phone, contact_email;
```

**Expected**: Returns new record with contact info

**Important**: Delete test record after:
```sql
DELETE FROM leads WHERE problem_text = 'Test problem';
```

---

## Application Testing

After database migration succeeds, test the application:

### Test 4: Business Registration via UI/API
```bash
# Use the Next.js app or tRPC to register a business
# Navigate to: http://localhost:3000/business/register
# Fill out the form and submit
```

**Expected**:
- No "column does not exist" errors
- Business record created with all fields
- Page shows success message

### Test 5: Lead Submission via UI/API
```bash
# Submit a lead with phone number and email
# Navigate to: http://localhost:3000/consumer
# Fill out the lead form
```

**Expected**:
- Lead created successfully
- `contact_phone` and `contact_email` stored
- Can view lead in consumer dashboard

### Test 6: AI Call Request
```bash
# From business portal, request an AI call
# Navigate to: http://localhost:3000/business/leads
# Click on a lead and request call
```

**Expected**:
- Call record created in database
- All call fields populated (consumer_id, call_type, system_prompt, etc.)
- Job queued in BullMQ (if workers running)

---

## Rollback (If Needed)

If migration fails or causes issues:

### Step 1: Copy Rollback Script
Located at bottom of migration file:
```sql
-- Remove new columns
ALTER TABLE businesses DROP COLUMN IF EXISTS max_monthly_leads;
-- ... (see full rollback in migration file)
```

### Step 2: Execute Rollback
1. Paste rollback SQL into Supabase SQL Editor
2. Run
3. Verify original schema restored

### Step 3: Report Issues
Document what failed and why in `KNOWN_ISSUES.md`

---

## Success Criteria

Migration is **COMPLETE** when:

- [x] SQL executes without errors
- [ ] All verification queries pass
- [ ] Test inserts succeed
- [ ] Application tests pass (business registration, lead submission)
- [ ] No errors in application logs
- [ ] Track 3 can proceed with AI calling integration

---

## Post-Migration Actions

1. [ ] Update `CLAUDE.md` to reflect new schema status
2. [ ] Mark Track 2 as "Migration Applied" in `PROGRESS_TRACKER.md`
3. [ ] Notify Track 3 agent that schema is ready
4. [ ] Update `INTEGRATION_POINTS.md` if needed
5. [ ] Archive this checklist with completion notes

---

## Troubleshooting

### Issue: "relation already exists"
**Cause**: Migration already partially applied
**Solution**: Check which columns exist, apply missing parts manually

### Issue: "column already exists"
**Cause**: Column was added manually before migration
**Solution**: Comment out that specific ALTER TABLE line, run rest of migration

### Issue: "constraint already exists"
**Cause**: Constraint was added before
**Solution**: Comment out constraint, run rest of migration

### Issue: "foreign key violation"
**Cause**: Data inconsistency
**Solution**: Check data integrity, fix inconsistencies, retry

---

## Migration Log Template

Copy this and fill out during migration:

```
Migration Execution Log
=======================
Date: [YYYY-MM-DD HH:MM]
Executed By: [Your Name]
Environment: [Development/Staging/Production]

Pre-Migration Checks:
- [ ] Database backup created
- [ ] Dependencies verified
- [ ] Migration file reviewed

Execution:
- Start Time: [HH:MM]
- End Time: [HH:MM]
- Duration: [X seconds]
- Errors: [None / List errors]

Verification Results:
- [ ] Column verification passed
- [ ] Index verification passed
- [ ] Constraint verification passed
- [ ] Test inserts passed

Application Testing:
- [ ] Business registration: PASS / FAIL
- [ ] Lead submission: PASS / FAIL
- [ ] AI call queueing: PASS / FAIL

Status: SUCCESS / FAILED / ROLLED BACK
Notes: [Any observations or issues]
```

---

**Ready to Execute**: Yes ✅
**Estimated Time**: 5 minutes (including verification)
**Risk Level**: Low (additive changes, rollback available)

