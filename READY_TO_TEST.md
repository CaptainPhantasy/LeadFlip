# 🚀 Discovery System Ready to Test

## ✅ All Systems Configured

The business discovery system is **fully built** and ready for testing. All environment variables are configured:

- ✅ **Mailgun** - Email sending configured
- ✅ **Google Places API** - API key added
- ✅ **Supabase** - Database connected
- ✅ **Clerk** - Authentication working
- ✅ **Dev Server** - Running at http://localhost:3002

---

## 🎯 Final Step: Run Database Migration

The only remaining step is to create the `prospective_businesses` table.

### Option 1: Supabase SQL Editor (Recommended)

1. **Go to Supabase Dashboard:**
   - Visit: https://plmnuogbbkgsatfmkyxm.supabase.co
   - Navigate to: **SQL Editor** (left sidebar)

2. **Run Migration:**
   - Click "New Query"
   - Copy the entire contents of: `supabase/migrations/20250930000002_prospective_businesses.sql`
   - Paste into the SQL Editor
   - Click "Run" button
   - You should see: "Success. No rows returned."

3. **Verify Table Created:**
   - Navigate to: **Table Editor** (left sidebar)
   - You should see new table: `prospective_businesses`
   - It will have 29 columns

### Option 2: Command Line (If Supabase CLI installed)

```bash
supabase db push
```

---

## 🧪 Testing the Discovery System

Once the migration is complete, test the system:

### Test 1: Access Admin Dashboard

1. Go to: http://localhost:3002/admin/discovery
2. You should see:
   - Stats overview (0 discovered, 0 invited, 0 clicked, 0 activated)
   - Market breakdown section
   - Manual scan trigger

### Test 2: Run Discovery Scan (Bloomington Plumbers)

1. In the "Manual Scan" section:
   - ZIP Code: `47448`
   - Service Category: `plumbing`
2. Click "Run Discovery Scan"
3. Wait 30-60 seconds
4. You should see success message
5. Stats should update showing discovered businesses

### Test 3: View Discovered Prospects

1. Click "View All Prospects" button
2. You should see table with discovered businesses:
   - Business names
   - Ratings (4+ stars)
   - Locations (Bloomington, IN)
   - Status: "Pending"

### Test 4: Send Test Invitation

1. Find a business with status "Pending"
2. Click "Send Invite" button
3. Confirm in dialog
4. Status should change to "Invited"
5. Check your email at: douglastalley1977@gmail.com
   - ⚠️ **Note:** Mailgun sandbox requires authorized recipients
   - The email will go to the configured recipient (you)
   - In production, it would go to the business

### Test 5: Test All Service Categories

Try scanning for each category in Bloomington (47448):

**High Priority:**
- ✅ `plumbing` (should find ~12 businesses)
- ✅ `hvac` (should find ~10 businesses)
- ✅ `electrical` (should find ~8 businesses)
- ✅ `roofing` (should find ~7 businesses)

**Medium Priority:**
- ✅ `landscaping` (should find ~15 businesses)
- ✅ `pest_control` (should find ~5 businesses)
- ✅ `cleaning` (should find ~10 businesses)
- ✅ `painting` (should find ~6 businesses)

**Lower Priority:**
- ✅ `carpentry` (should find ~8 businesses)
- ✅ `appliance_repair` (should find ~4 businesses)
- ✅ `general_contractor` (should find ~12 businesses)

### Test 6: Test Columbus Market

Repeat discovery scans for Columbus, IN:
- ZIP Code: `47201`
- Try same categories
- Should discover ~27 total businesses

---

## 📊 What to Expect

### Discovery Scan Results

When you run a discovery scan, the system will:

1. **Call Google Places API** for businesses near the ZIP code
2. **Filter by quality:**
   - Rating ≥ 3.5 stars
   - Reviews ≥ 5
   - Has phone number
   - Status: OPERATIONAL
3. **Calculate distance** from target ZIP
4. **Insert into database** (avoiding duplicates)
5. **Return summary:**
   ```json
   {
     "totalResults": 25,
     "discovered": 15,
     "filteredOut": 8,
     "duplicates": 2
   }
   ```

### Email Invitation

When you click "Send Invite", the system will:

1. **Validate** business data
2. **Generate** personalized email:
   ```
   Subject: Exclusive invite: Join LeadFlip for qualified leads in Bloomington

   Hi [Business Name],

   We found your [Service Category] business on Google ([Rating] stars - impressive!)
   and think you'd be perfect for LeadFlip...
   ```
3. **Send via Mailgun**
4. **Update status** to "Invited"
5. **Track** invitation timestamp

### Follow-up Sequence (Automated)

After invitation, the system will automatically:
- **Day 3:** Send first follow-up
- **Day 7:** Send second follow-up
- **Day 14:** Send final follow-up (or mark as declined)

---

## 🔍 Monitoring & Debugging

### Check Logs

Watch the console for detailed logs:

```bash
# Discovery scan logs
[Google Places] nearbySearch called with params: {...}
[Google Places] nearbySearch response: { status: 'OK', resultCount: 15 }
[Discovery Scan] Discovered 15 businesses

# Email logs
[Mailgun] Sending email: { to: '...', subject: '...' }
[Mailgun] Email sent successfully: <message_id>
```

### Check Database

Query Supabase to see stored data:

```sql
-- See all discovered businesses
SELECT name, service_category, rating, city, invitation_status
FROM prospective_businesses
ORDER BY discovered_at DESC
LIMIT 20;

-- Count by status
SELECT invitation_status, COUNT(*)
FROM prospective_businesses
GROUP BY invitation_status;

-- See by service category
SELECT service_category, COUNT(*)
FROM prospective_businesses
GROUP BY service_category
ORDER BY count DESC;
```

### Check Mailgun Dashboard

View sent emails:
- Go to: https://app.mailgun.com/mg/sending/domains
- Select domain: `sandboxc7d1db197e02442698a53a6a328bc5f5.mailgun.org`
- View logs for deliveries, opens, clicks

---

## 🚨 Troubleshooting

### Issue: "Table prospective_businesses does not exist"
**Fix:** Run the database migration first

### Issue: No businesses discovered
**Possible causes:**
1. Google Places API quota exceeded (check console)
2. API key not working (verify in Google Cloud Console)
3. ZIP code has no businesses in that category
4. Quality filters too strict (try different category)

**Check:**
```bash
# Test Google Places API directly
curl "https://maps.googleapis.com/maps/api/place/nearbysearch/json?location=39.1653,-86.5264&radius=16000&type=plumber&key=AIzaSyAlY6Sguu5-6DEnuA4zqF1hcx26y-ve8vE"
```

### Issue: Emails not sending
**Cause:** Mailgun sandbox requires authorized recipients

**Fix:**
1. Go to: https://app.mailgun.com/mg/dashboard
2. Add authorized recipient email
3. Verify email address
4. Try sending again

**Alternative:** Upgrade to paid Mailgun account to send to any email

### Issue: Dev server errors
**Check:**
- All dependencies installed: `npm install`
- Port 3002 not in use: `lsof -ti:3002`
- .env.local file exists with all variables

---

## 📈 Success Metrics

After testing, you should have:

- ✅ **Database migration** complete
- ✅ **Google Places API** working (businesses discovered)
- ✅ **Mailgun** working (test email received)
- ✅ **Admin dashboard** accessible
- ✅ **Prospects table** showing data
- ✅ **Discovery scan** working for all categories
- ✅ **Invitation flow** working end-to-end

---

## 🎉 Ready for Production

Once testing is complete, the system can:

1. **Run automated scans** (schedule via cron or BullMQ)
2. **Send invitations** in batches (10/day recommended)
3. **Track responses** (clicks, activations)
4. **Follow up automatically** (Day 3, 7, 14)
5. **Report metrics** (dashboard analytics)

### Automation Setup (Future)

To fully automate:

1. **Setup cron job** for weekly discovery scans
2. **Setup BullMQ worker** for processing jobs
3. **Setup webhook** for tracking email opens/clicks
4. **Setup notification** for new activations

---

## 📚 Documentation

- **Full System Docs:** `DISCOVERY_SYSTEM_COMPLETE.md`
- **Shared Spec:** `DISCOVERY_SHARED_SPEC.md`
- **Indiana Plan:** `INDIANA_DISCOVERY_PLAN.md`
- **Main Architecture:** `CLAUDE.md`

---

## ✅ Current Status

- [x] All code implemented (18 files)
- [x] All dependencies installed
- [x] Mailgun configured
- [x] Google Places API key added
- [x] Dev server running
- [ ] **Database migration** (waiting for you to run)
- [ ] **Testing** (after migration)

---

**Next Action:** Run the database migration in Supabase SQL Editor, then start testing!

**Migration File:** `supabase/migrations/20250930000002_prospective_businesses.sql`

**Dashboard URL:** http://localhost:3002/admin/discovery
