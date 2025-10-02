# God-Level Admin Setup Guide

## 🔐 How to Grant Yourself Admin Access

Follow these steps to become a god-level admin with full system access.

---

## Step 1: Create Your Account

1. **Start the dev server** (if not already running):
   ```bash
   npm run dev
   ```

2. **Navigate to sign-up**:
   ```
   http://localhost:3002/sign-up
   ```

3. **Create your account** with Clerk:
   - Enter your email address
   - Set a password
   - Complete verification if required

---

## Step 2: Get Your Clerk User ID

### Option A: From Clerk Dashboard (Recommended)

1. Go to [Clerk Dashboard](https://dashboard.clerk.com)
2. Select your application (LeadFlip)
3. Click **Users** in the sidebar
4. Find your newly created user
5. Click on the user to view details
6. Copy the **User ID** (starts with `user_`)

### Option B: From Browser Console

1. Sign in to your account at `http://localhost:3002`
2. Open browser DevTools (F12)
3. Go to **Console** tab
4. Run this command:
   ```javascript
   // If using Clerk's UserButton component
   window.__clerk_user_id

   // Or check localStorage
   JSON.parse(localStorage.getItem('__clerk_client')).sessions[0].user.id
   ```
5. Copy the User ID

### Option C: From Network Tab

1. Sign in to your account
2. Open DevTools → **Network** tab
3. Filter by `trpc`
4. Look at any tRPC request headers or response
5. Find `userId` in the context

---

## Step 3: Add Yourself as God Admin

1. **Open the admin configuration file**:
   ```bash
   open src/lib/auth/admin.ts
   ```

2. **Add your User ID** to the `GOD_ADMINS` array:
   ```typescript
   export const GOD_ADMINS = [
     'user_YOUR_CLERK_ID_HERE', // ← Replace with your actual ID
     // Add more admin user IDs here
   ];
   ```

3. **Example**:
   ```typescript
   export const GOD_ADMINS = [
     'user_2qwertyuiopasdfghjkl',  // John Doe (you)
     'user_2abcdefghijklmnopqrst',  // Jane Smith (co-admin)
   ];
   ```

4. **Save the file** - The dev server will hot-reload automatically

---

## Step 4: Verify Admin Access

1. **Navigate to the admin dashboard**:
   ```
   http://localhost:3002/admin
   ```

2. **You should see**:
   - ✅ Green "God-Level Admin Access" banner with your email
   - ✅ Platform statistics (leads, businesses, matches, calls)
   - ✅ System health status
   - ✅ Recent leads table
   - ✅ Quick actions panel

3. **If you see "Access Denied"**:
   - Double-check your User ID in `src/lib/auth/admin.ts`
   - Ensure you copied the full ID (starts with `user_`)
   - Refresh the page (Cmd+R / Ctrl+R)
   - Check browser console for errors

---

## Admin Capabilities

### God-Level Permissions

As a god admin, you can:

- ✅ **View all platform data** - leads, businesses, matches, calls
- ✅ **Manage users** - grant/revoke admin roles to other users
- ✅ **Flag content** - mark leads as spam, suspend businesses
- ✅ **Access audit logs** - view system activity and changes
- ✅ **Trigger manual jobs** - run lead quality audits on demand
- ✅ **System monitoring** - check health of database, agents, Twilio, workers
- ✅ **Override RLS policies** - bypass Row-Level Security when needed
- ✅ **Impersonate users** - debug issues from user perspective (future)

### API Endpoints Available

All admin tRPC endpoints:

```typescript
// Statistics
trpc.admin.getStats.useQuery()
trpc.admin.getRecentLeads.useQuery({ limit: 10 })
trpc.admin.getSystemHealth.useQuery()

// Lead Management
trpc.admin.getAllLeads.useQuery({ status: 'pending', minQualityScore: 7 })
trpc.admin.flagLead.useMutation()

// Business Management
trpc.admin.getAllBusinesses.useQuery({ isActive: true, minRating: 4.0 })
trpc.admin.updateBusinessStatus.useMutation()

// Audit & Reports
trpc.admin.getAuditReports.useQuery()
trpc.admin.triggerAudit.useMutation()
```

---

## Granting Admin to Other Users

### Option 1: Add to GOD_ADMINS (Recommended for Core Team)

```typescript
// src/lib/auth/admin.ts
export const GOD_ADMINS = [
  'user_YOUR_ID',           // You
  'user_TEAMMATE_ID',       // Your co-founder
  'user_CTO_ID',            // Your CTO
];
```

**Pros:**
- Instant access on code deploy
- Cannot be revoked by accident
- Hardcoded security

**Cons:**
- Requires code change + deploy
- Less flexible

### Option 2: Grant via Database (Better for Temporary Admins)

```typescript
// In admin dashboard or API
import { grantAdminRole } from '@/lib/auth/admin';

await grantAdminRole('user_TARGET_ID', 'user_YOUR_GOD_ID');
```

**Pros:**
- No code changes needed
- Can be revoked easily
- Audit trail in database

**Cons:**
- Requires database migration first
- Can be accidentally revoked

### Comparison Table

| Feature | God Admin | Database Admin |
|---------|-----------|----------------|
| Access Level | Unrestricted | Full admin features |
| Can Grant Roles | ✅ Yes | ❌ No |
| Revocable | ❌ No (hardcoded) | ✅ Yes |
| Audit Trail | ❌ No (in code) | ✅ Yes (DB logs) |
| Setup Time | Instant | Requires migration |

---

## Security Best Practices

### 1. Limit God Admins

- Only add **2-3 core team members** to `GOD_ADMINS`
- Use database admins for everyone else
- Rotate god admins quarterly

### 2. Monitor Admin Actions

- All admin API calls are logged
- Review audit logs weekly
- Alert on suspicious activity (future)

### 3. Production Environment

**For production, use environment variables:**

```typescript
// src/lib/auth/admin.ts
export const GOD_ADMINS = (process.env.GOD_ADMIN_IDS || '').split(',').filter(Boolean);
```

**In Vercel/Railway:**
```bash
GOD_ADMIN_IDS=user_abc123,user_def456,user_ghi789
```

**Benefits:**
- No hardcoded IDs in code
- Different admins per environment (staging vs prod)
- Easier to rotate

### 4. Two-Factor Authentication

**Enable 2FA in Clerk:**
1. Go to Clerk Dashboard → **User & Authentication**
2. Enable **Multi-factor authentication**
3. Require 2FA for all admin users

---

## Troubleshooting

### "Access Denied" Error

**Possible causes:**
1. User ID not in `GOD_ADMINS` array
2. Typo in User ID
3. Not signed in
4. Code not saved/reloaded

**Solution:**
```bash
# 1. Verify your User ID
cat src/lib/auth/admin.ts | grep "user_"

# 2. Check if you're signed in
# Visit /admin and check network tab for userId in context

# 3. Force reload
# Cmd+Shift+R (Mac) or Ctrl+Shift+R (Windows)

# 4. Restart dev server
npm run dev
```

### Cannot See Admin Dashboard

**Check:**
- Route is `/admin` not `/admin/`
- Server is running on correct port (3002)
- No JavaScript errors in console

### Database Query Fails

**Reason:** Migration not run yet

**Solution:**
```sql
-- Run in Supabase SQL Editor
-- supabase/migrations/20250930000000_initial_schema.sql
```

---

## Example: Complete Setup Flow

```bash
# 1. Start dev server
npm run dev

# 2. Sign up at http://localhost:3002/sign-up
# Use email: admin@yourcompany.com

# 3. Get User ID from Clerk Dashboard
# Copy: user_2qwertyuiopasdfghjkl

# 4. Edit admin config
code src/lib/auth/admin.ts

# Add your ID:
export const GOD_ADMINS = [
  'user_2qwertyuiopasdfghjkl',  # ← Your ID
];

# 5. Visit admin dashboard
open http://localhost:3002/admin

# 6. Verify you see the green banner
# "God-Level Admin Access"
# "Logged in as: admin@yourcompany.com"

# ✅ Success! You are now a god-level admin
```

---

## Next Steps

1. **Run Database Migration** - Create users/leads/businesses tables
2. **Invite Team Members** - Add co-admins to `GOD_ADMINS`
3. **Test Admin Endpoints** - Try flagging a lead, viewing stats
4. **Set Up Monitoring** - Configure alerts for admin actions
5. **Enable 2FA** - Require multi-factor auth for all admins

---

**🎉 You now have god-level admin access to LeadFlip!**

*For production deployment, remember to use environment variables instead of hardcoded IDs.*
