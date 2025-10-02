# Database Setup Guide

## Quick Start

The database isn't set up yet. You need to run the migrations in Supabase.

### Option 1: Supabase Dashboard (Recommended)

1. Go to https://plmnuogbbkgsatfmkyxm.supabase.co
2. Click **SQL Editor** in the left sidebar
3. Run the following migrations **in order**:

#### Migration 1: Initial Schema
```bash
# Copy and paste the contents of:
supabase/migrations/20250930000000_initial_schema.sql
```

#### Migration 2: Database Functions
```bash
# Copy and paste the contents of:
supabase/migrations/20250930000001_database_functions.sql
```

#### Migration 3: Fix Schema and RLS
```bash
# Copy and paste the contents of:
supabase/migrations/20250930000002_fix_schema_and_rls.sql
```

4. Click **Run** for each migration
5. Verify tables exist by clicking **Table Editor**

### Option 2: Supabase CLI (If Installed)

```bash
# If you have Supabase CLI installed:
supabase db push
```

## What These Migrations Do

### Migration 1 (`20250930000000_initial_schema.sql`)
Creates all core tables:
- `users` - User accounts (synced from Clerk)
- `leads` - Consumer problem submissions
- `businesses` - Business profiles
- `matches` - Lead-to-business matching records
- `calls` - AI call records with transcripts
- `conversions` - Closed deals for analytics

### Migration 2 (`20250930000001_database_functions.sql`)
Creates helper functions:
- Distance calculations (PostGIS)
- Lead quality scoring
- Business matching algorithms

### Migration 3 (`20250930000002_fix_schema_and_rls.sql`)
- Fixes column naming to match API expectations
- **Disables RLS** (since we're using service role key + Clerk auth)
- Adds missing columns needed by business settings

## Verify Setup

After running migrations, test the app:

1. **Business Settings** - Visit http://localhost:3002/business/settings
   - Should load empty form (if no profile exists)
   - Fill out form and click "Create Business Profile"
   - Should save successfully

2. **Consumer Dashboard** - Visit http://localhost:3002/consumer/dashboard
   - Should show "No leads yet" (if no leads submitted)
   - No error messages

3. **Submit a Lead** - Visit http://localhost:3002/consumer
   - Fill out problem submission form
   - Should see success message
   - Check consumer dashboard - lead should appear

## Troubleshooting

### Error: "Failed to fetch leads"
- Migrations not run yet
- Run migrations in Supabase dashboard

### Error: "relation 'businesses' does not exist"
- Initial schema migration not run
- Run migration 1 first

### Business settings won't save
- Check browser console for errors
- Verify `SUPABASE_SERVICE_ROLE_KEY` is in `.env.local`
- Restart dev server: `npm run dev`

### Consumer dashboard shows empty even after submitting leads
- Check if lead submission succeeded (look for success toast)
- Verify Clerk user ID matches `user_id` in leads table
- Check Supabase logs in dashboard

## Next Steps

Once migrations are run and verified:
1. Test business profile creation
2. Submit a test consumer lead
3. Verify lead appears in consumer dashboard
4. (Future) Set up AI agents for lead classification
