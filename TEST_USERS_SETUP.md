# Test Users Setup Guide

## Navigation Behavior (Now Implemented ✅)

The navigation now adapts based on user role:

### Regular Consumer (No Business Profile)
**Sees:**
- Post a Problem
- Consumer Dashboard

**Does NOT see:**
- Business Dashboard
- Business Settings

### Business Owner (Has Business Profile)
**Sees:**
- Post a Problem
- Consumer Dashboard
- Business Dashboard ← NEW
- Business Settings ← NEW

**Why:** Business owners can also be consumers (a plumber might need a plumber!)

### Admin (God Mode)
**Sees:**
- All consumer links
- All business links (if has business profile)
- Admin Dashboard ← Admin only
- Users ← Admin only
- Audit Log ← Admin only

## Creating Test Users in Clerk

### Option 1: Create via Clerk Dashboard (Recommended)

**Step 1: Go to Clerk Dashboard**
1. Visit: https://dashboard.clerk.com
2. Select your application: "grateful-dragon-13"
3. Click **"Users"** in left sidebar

**Step 2: Create Test Consumer User**
1. Click **"Create User"**
2. Fill in:
   - **Email:** `test.consumer@leadflip.local`
   - **Password:** `TestConsumer123!`
   - **First Name:** Test
   - **Last Name:** Consumer
3. Click **"Create"**
4. **Do NOT** create a business profile for this user

**Step 3: Create Test Business User**
1. Click **"Create User"** again
2. Fill in:
   - **Email:** `test.business@leadflip.local`
   - **Password:** `TestBusiness123!`
   - **First Name:** Test
   - **Last Name:** Business
3. Click **"Create"**
4. Copy the User ID (looks like `user_xxxxxxxxxxxxx`)

**Step 4: Create Business Profile for Test Business User**
1. Sign in as test business user at http://localhost:3002/sign-in
2. Go to http://localhost:3002/business/settings
3. Fill out business profile form:
   - **Business Name:** Test Plumbing Co.
   - **Email:** test.business@leadflip.local
   - **Phone:** 555-123-4567
   - **Service Categories:** plumbing, hvac
   - **Address:** 123 Test St
   - **City:** Indianapolis
   - **State:** IN
   - **ZIP:** 46032
   - **Price Tier:** Standard
4. Enable:
   - Emergency Services: Yes
   - Licensed: Yes
   - Insured: Yes
5. Click **"Create Business Profile"**

---

### Option 2: Create via Sign-Up Flow

**Test Consumer User:**
1. Visit http://localhost:3002/sign-up
2. Register with:
   - Email: `consumer@example.com`
   - Password: `Consumer123!`
3. Verify email (check inbox or use Clerk's test mode)
4. **Done** - this user is consumer-only

**Test Business User:**
1. Visit http://localhost:3002/sign-up
2. Register with:
   - Email: `business@example.com`
   - Password: `Business123!`
3. Verify email
4. Navigate to `/business/settings`
5. Complete business profile form
6. **Done** - this user is consumer + business

---

## Test Account Credentials

### Your Admin Account (Current)
- **Email:** [Your actual email]
- **Role:** Admin
- **Business Profile:** ✅ "Reliable Comfort Heating, Air Conditioning, & Plumbing"
- **Navigation Shows:**
  - Consumer Dashboard
  - Business Dashboard
  - Business Settings
  - Admin Dashboard
  - Users
  - Audit Log

### Test Consumer User
- **Email:** `test.consumer@leadflip.local` or `consumer@example.com`
- **Password:** `TestConsumer123!` or `Consumer123!`
- **Role:** Consumer
- **Business Profile:** ❌ None
- **Navigation Shows:**
  - Consumer Dashboard
  - (No business links)

### Test Business User
- **Email:** `test.business@leadflip.local` or `business@example.com`
- **Password:** `TestBusiness123!` or `Business123!`
- **Role:** Consumer + Business
- **Business Profile:** ✅ "Test Plumbing Co."
- **Navigation Shows:**
  - Consumer Dashboard
  - Business Dashboard
  - Business Settings
  - (No admin links)

---

## Setting Admin Role in Clerk

To make any user an admin:

1. Go to Clerk Dashboard → Users
2. Click on the user
3. Scroll to **"Public metadata"**
4. Click **"Edit"**
5. Add JSON:
   ```json
   {
     "role": "admin"
   }
   ```
6. Click **"Save"**
7. User must sign out and sign in again for role to take effect

---

## Testing Navigation

### Test Scenario 1: Consumer-Only User
1. Sign in as `test.consumer@leadflip.local`
2. **Expected navigation:**
   - ✅ Post a Problem
   - ✅ Consumer Dashboard
   - ❌ Business Dashboard (hidden)
   - ❌ Business Settings (hidden)
   - ❌ Admin links (hidden)
3. Try visiting `/business/settings` directly → Should show "Create Business Profile" form

### Test Scenario 2: Business Owner User
1. Sign in as `test.business@leadflip.local`
2. **Expected navigation:**
   - ✅ Post a Problem
   - ✅ Consumer Dashboard
   - ✅ Business Dashboard (visible)
   - ✅ Business Settings (visible)
   - ❌ Admin links (hidden)
3. Visit `/business` → Should show business dashboard with leads
4. Visit `/consumer` → Should work (business owners can post problems too)

### Test Scenario 3: Admin User
1. Sign in as your admin account
2. **Expected navigation:**
   - ✅ All consumer links
   - ✅ All business links (you have a business profile)
   - ✅ Admin Dashboard (admin only)
   - ✅ Users (admin only)
   - ✅ Audit Log (admin only)
3. Can access all areas

---

## Quick SQL to Check User's Business Profile

Run in Supabase SQL Editor:

```sql
-- Find all business profiles
SELECT
  b.user_id,
  b.name AS business_name,
  b.email,
  b.service_categories,
  b.created_at
FROM businesses b
ORDER BY b.created_at DESC;

-- Check if specific user has business profile
SELECT * FROM businesses WHERE user_id = 'user_xxxxx'; -- Replace with Clerk user ID
```

---

## Troubleshooting

**Issue:** Business navigation not showing after creating profile
**Fix:** Hard refresh the page (Cmd+Shift+R or Ctrl+Shift+R) to refetch business profile

**Issue:** Admin links not showing
**Fix:** Check public metadata in Clerk dashboard, ensure `{"role": "admin"}` is set

**Issue:** Can't access `/business/settings`
**Fix:** Make sure you're signed in and Clerk middleware is allowing the route

---

## Database Queries for Testing

```sql
-- Count users by role
SELECT
  (SELECT COUNT(*) FROM businesses) AS business_count,
  (SELECT COUNT(DISTINCT user_id) FROM leads) AS consumer_count;

-- See recent business registrations
SELECT
  user_id,
  name,
  email,
  service_categories,
  created_at
FROM businesses
ORDER BY created_at DESC
LIMIT 10;

-- See recent consumer leads
SELECT
  user_id,
  problem_text,
  service_category,
  created_at
FROM leads
ORDER BY created_at DESC
LIMIT 10;
```
