# LeadFlip - Indiana Launch Plan
## Target Markets: Bloomington (47448) + Columbus (47201)

---

## 🎯 Phase 1: Initial Discovery (Week 1)

### Target Service Categories

**High Priority (Launch First):**
1. **Plumbing** - Emergency services = high urgency = willing to pay
2. **HVAC** - Year-round demand (heating in winter, AC in summer)
3. **Electrical** - Safety concerns = good conversion
4. **Roofing** - High ticket, seasonal (spring/fall)

**Medium Priority (Month 2):**
5. Landscaping/Lawn Care - Seasonal but recurring
6. Pest Control - Recurring revenue model
7. Cleaning Services - Regular clients
8. Painting - Project-based

**Lower Priority (Expand Later):**
9. Carpentry/Handyman
10. Appliance Repair
11. General Contractors

---

## 📈 Expected Discovery Results

### Bloomington, IN (47448)
**Estimated Google Places Results:**

| Category | Est. Total | 4+ Stars | 10+ Reviews | Qualified |
|----------|-----------|----------|-------------|-----------|
| Plumbing | 35 | 22 | 15 | ~12 |
| HVAC | 28 | 18 | 12 | ~10 |
| Electrical | 25 | 16 | 10 | ~8 |
| Roofing | 20 | 14 | 9 | ~7 |
| **TOTAL** | **108** | **70** | **46** | **~37** |

### Columbus, IN (47201)
**Estimated Google Places Results:**

| Category | Est. Total | 4+ Stars | 10+ Reviews | Qualified |
|----------|-----------|----------|-------------|-----------|
| Plumbing | 22 | 15 | 11 | ~9 |
| HVAC | 18 | 12 | 8 | ~7 |
| Electrical | 16 | 11 | 7 | ~6 |
| Roofing | 14 | 10 | 6 | ~5 |
| **TOTAL** | **70** | **48** | **32** | **~27** |

**Combined Launch Pool: ~64 qualified businesses**

---

## 🤖 Automated Discovery Configuration

### Discovery Agent Settings

```typescript
// config/discovery.ts
export const LAUNCH_CONFIG = {
  targetMarkets: [
    {
      name: 'Bloomington, IN',
      zipCode: '47448',
      radius: 15, // miles
      priority: 'high',
      coordinates: {
        lat: 39.1653,
        lng: -86.5264
      }
    },
    {
      name: 'Columbus, IN',
      zipCode: '47201',
      radius: 15, // miles
      priority: 'high',
      coordinates: {
        lat: 39.2014,
        lng: -85.9214
      }
    }
  ],

  serviceCategories: [
    'plumber',
    'hvac_contractor',
    'electrician',
    'roofing_contractor'
  ],

  qualityFilters: {
    minRating: 4.0,
    minReviewCount: 10,
    requirePhone: true,
    requireActiveHours: true
  },

  schedule: {
    discoveryFrequency: 'weekly', // Re-scan for new businesses
    invitationBatchSize: 10, // Send 10 invites per day
    followUpDays: [3, 7, 14]
  }
}
```

### Google Places API Query

```typescript
// What the automated agent will run daily
async function discoverBloomingtonBusinesses() {
  const results = [];

  for (const category of ['plumber', 'hvac', 'electrician', 'roofing']) {
    const response = await googlePlaces.nearbySearch({
      location: { lat: 39.1653, lng: -86.5264 },
      radius: 24140, // 15 miles in meters
      type: category,
      keyword: category
    });

    // Auto-filter quality
    const qualified = response.results.filter(place =>
      place.rating >= 4.0 &&
      place.user_ratings_total >= 10 &&
      place.business_status === 'OPERATIONAL'
    );

    results.push(...qualified);
  }

  // Store in prospective_businesses table
  await storeProspectiveBusinesses(results);

  return {
    discovered: results.length,
    nextAction: 'automated_invitation'
  };
}
```

---

## 📧 Automated Outreach Timeline

### Week 1: Discovery + First Batch
- **Day 1-2:** Run automated discovery (both cities)
- **Day 3:** Auto-send first 10 invitations (highest rated)
- **Day 4:** Auto-send next 10 invitations
- **Day 5:** Auto-send next 10 invitations
- **Day 6-7:** Monitor responses

### Week 2: Follow-ups + New Batch
- **Day 8:** Continue daily batches (10/day)
- **Day 10:** Automated follow-up #1 (3 days after invite)
- **Day 14:** All 64 qualified businesses invited

### Week 3-4: Conversion Phase
- **Automated follow-ups** at 7 days and 14 days
- **Track metrics**: Click rate, activation rate
- **Manual outreach** for high-value prospects (5-star, 50+ reviews)

---

## 🎯 Success Metrics - 30 Day Goal

### Conservative Projections

| Metric | Target | Notes |
|--------|--------|-------|
| Businesses Discovered | 64 | Both cities, 4 categories |
| Invitation Sent | 64 | 100% of qualified |
| Click Rate | 15% | ~10 businesses click link |
| Activation Rate | 25% | ~3 activate (of clickers) |
| **Active Businesses** | **3-5** | Launch goal |

### Optimistic Projections

| Metric | Target | Notes |
|--------|--------|-------|
| Businesses Discovered | 70 | Include borderline (3.8 stars) |
| Invitation Sent | 70 | |
| Click Rate | 20% | Better email copy |
| Activation Rate | 30% | Pre-filled profiles help |
| **Active Businesses** | **5-8** | Strong launch |

**Real Goal:** 5+ active businesses per city = viable marketplace

---

## 💰 Cost Analysis

### Google Places API Costs
- **Free tier:** 25,000 requests/month
- **Our usage:** ~200 requests/month (weekly scans)
- **Cost:** $0 (well within free tier)

### Email/SMS Outreach Costs
- **SendGrid Free:** 100 emails/day
- **Our usage:** 10-20 emails/day
- **Cost:** $0 for first month

**Total automation cost: $0** ✅

---

## 🚀 Launch Sequence (Automated)

### Setup (One-Time, 2 hours)
1. ✅ Create `prospective_businesses` table
2. ✅ Setup Google Places API credentials
3. ✅ Configure BullMQ discovery job
4. ✅ Setup email templates (SendGrid)
5. ✅ Build invitation tracking system
6. ✅ Create pre-filled signup flow

### Daily Automation (Zero manual work)
**2:00 AM** - Discovery agent runs
  - Scans 47448 + 47201
  - Filters for quality
  - Stores new businesses

**9:00 AM** - Invitation agent runs
  - Sends 10 invitations
  - Tracks deliveries
  - Updates status

**5:00 PM** - Follow-up agent runs
  - Checks businesses invited 3/7/14 days ago
  - Sends automated follow-ups
  - Removes non-responders after 14 days

**Weekly** - Coverage expansion check
  - If leads come in from new ZIP → auto-discover there
  - Example: Lead from 47403 → auto-scan Bloomington suburbs

---

## 📍 Geographic Expansion Strategy

### Tier 1: Launch Markets (Now)
- 47448 (Bloomington)
- 47201 (Columbus)
- **Goal:** Prove model works

### Tier 2: Nearby Markets (Month 2)
- 47403 (Bloomington suburbs)
- 47403 (Ellettsville)
- 47229 (Edinburgh)
- **Trigger:** 10+ leads from these ZIPs

### Tier 3: Indianapolis Metro (Month 3-6)
- 46032 (Carmel) - Wealthy suburb
- 46038 (Fishers) - Growing suburb
- 46240 (Indianapolis North)
- **Trigger:** 20+ active businesses in Tier 1+2

### Tier 4: Indiana Statewide (Month 6+)
- Fort Wayne (46805)
- Evansville (47715)
- South Bend (46601)
- **Trigger:** Demand-driven expansion

---

## 🎨 Example: What Admin Sees

### Admin Dashboard `/admin/discovery`

```
┌─────────────────────────────────────────────────────────┐
│ Business Discovery - Indiana Launch                     │
│─────────────────────────────────────────────────────────│
│                                                          │
│ 📊 Last Scan: 2 hours ago                               │
│                                                          │
│ Bloomington (47448)                                      │
│ ├─ Discovered: 37 businesses                            │
│ ├─ Invited: 30                                          │
│ ├─ Clicked: 6                                           │
│ └─ Activated: 2 ✅                                       │
│                                                          │
│ Columbus (47201)                                         │
│ ├─ Discovered: 27 businesses                            │
│ ├─ Invited: 27                                          │
│ ├─ Clicked: 4                                           │
│ └─ Activated: 1 ✅                                       │
│                                                          │
│ 🎯 Next Actions:                                        │
│ • 10 invitations scheduled for 9 AM tomorrow            │
│ • 8 follow-ups scheduled for today                      │
│ • 3 businesses clicked but haven't activated (nudge?)   │
│                                                          │
│ [View All Prospects] [Run Discovery Now] [Settings]     │
└─────────────────────────────────────────────────────────┘
```

---

## 🏁 Ready to Build?

I can implement this automated system with:

1. **Google Places Discovery Agent** - Scans 47448 + 47201 weekly
2. **Quality Filter** - Only 4+ stars, 10+ reviews
3. **Automated Invitations** - 10/day, personalized emails
4. **Click Tracking** - Know who's interested
5. **Pre-filled Signup** - Reduce friction
6. **Follow-up Sequences** - 3, 7, 14 day automated emails
7. **Admin Dashboard** - Monitor progress

**Target: 5-8 active businesses in 30 days, zero manual work.**

Should I start building this?
