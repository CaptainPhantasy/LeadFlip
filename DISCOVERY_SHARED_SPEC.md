# Business Discovery System - Shared Specification
## For Subagent Fleet Implementation

---

## Service Categories Configuration

### All 11 Service Categories with Google Places Types

```typescript
export const SERVICE_CATEGORIES = {
  // High Priority (Launch First)
  plumbing: {
    googlePlacesType: 'plumber',
    displayName: 'Plumbing',
    keywords: ['plumber', 'plumbing service', 'emergency plumber'],
    priority: 'high',
    phase: 1
  },
  hvac: {
    googlePlacesType: 'hvac_contractor',
    displayName: 'HVAC',
    keywords: ['hvac', 'heating', 'air conditioning', 'furnace'],
    priority: 'high',
    phase: 1
  },
  electrical: {
    googlePlacesType: 'electrician',
    displayName: 'Electrical',
    keywords: ['electrician', 'electrical service', 'wiring'],
    priority: 'high',
    phase: 1
  },
  roofing: {
    googlePlacesType: 'roofing_contractor',
    displayName: 'Roofing',
    keywords: ['roofing', 'roof repair', 'roof replacement'],
    priority: 'high',
    phase: 1
  },

  // Medium Priority (Month 2)
  landscaping: {
    googlePlacesType: 'landscaper',
    displayName: 'Landscaping/Lawn Care',
    keywords: ['landscaping', 'lawn care', 'lawn mowing', 'yard work'],
    priority: 'medium',
    phase: 2
  },
  pest_control: {
    googlePlacesType: 'pest_control_service',
    displayName: 'Pest Control',
    keywords: ['pest control', 'exterminator', 'termite control'],
    priority: 'medium',
    phase: 2
  },
  cleaning: {
    googlePlacesType: 'house_cleaning_service',
    displayName: 'Cleaning Services',
    keywords: ['cleaning service', 'house cleaning', 'maid service'],
    priority: 'medium',
    phase: 2
  },
  painting: {
    googlePlacesType: 'painter',
    displayName: 'Painting',
    keywords: ['painting', 'house painter', 'interior painting'],
    priority: 'medium',
    phase: 2
  },

  // Lower Priority (Expand Later)
  carpentry: {
    googlePlacesType: 'carpenter',
    displayName: 'Carpentry/Handyman',
    keywords: ['carpenter', 'handyman', 'handyman service'],
    priority: 'low',
    phase: 3
  },
  appliance_repair: {
    googlePlacesType: 'appliance_repair_service',
    displayName: 'Appliance Repair',
    keywords: ['appliance repair', 'refrigerator repair', 'washer repair'],
    priority: 'low',
    phase: 3
  },
  general_contractor: {
    googlePlacesType: 'general_contractor',
    displayName: 'General Contractors',
    keywords: ['general contractor', 'home remodeling', 'renovation'],
    priority: 'low',
    phase: 3
  }
} as const;
```

---

## Database Schema: prospective_businesses

```sql
CREATE TABLE IF NOT EXISTS prospective_businesses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Google Places Data
  google_place_id text UNIQUE NOT NULL,
  name text NOT NULL,
  formatted_address text,
  formatted_phone_number text,
  international_phone_number text,
  website text,

  -- Location
  latitude double precision,
  longitude double precision,
  zip_code text,
  city text,
  state text DEFAULT 'IN',
  location geography(Point, 4326), -- PostGIS for distance queries

  -- Business Quality Metrics
  rating numeric(2,1),
  user_ratings_total integer DEFAULT 0,
  price_level integer, -- 0-4 scale from Google
  business_status text, -- OPERATIONAL, CLOSED_TEMPORARILY, CLOSED_PERMANENTLY

  -- Service Categories
  service_category text NOT NULL, -- plumbing, hvac, electrical, etc.
  service_types text[], -- Array of related service types

  -- Discovery Metadata
  discovered_at timestamptz DEFAULT now(),
  discovery_source text DEFAULT 'google_places',
  discovery_zip text NOT NULL, -- Which ZIP search found this
  distance_from_target numeric(5,2), -- Miles from target ZIP

  -- Invitation Status
  invitation_status text DEFAULT 'pending', -- pending, invited, clicked, activated, declined, bounced
  invitation_sent_at timestamptz,
  invitation_clicked_at timestamptz,
  follow_up_count integer DEFAULT 0,
  last_follow_up_at timestamptz,

  -- Activation
  activated boolean DEFAULT false,
  activated_at timestamptz,
  activated_business_id uuid REFERENCES businesses(id) ON DELETE SET NULL,

  -- Quality Flags
  qualified boolean DEFAULT true, -- Meets quality filters
  disqualification_reason text,

  -- Tracking
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Indexes for performance
CREATE INDEX idx_prospective_businesses_service_category ON prospective_businesses(service_category);
CREATE INDEX idx_prospective_businesses_invitation_status ON prospective_businesses(invitation_status);
CREATE INDEX idx_prospective_businesses_zip_code ON prospective_businesses(zip_code);
CREATE INDEX idx_prospective_businesses_rating ON prospective_businesses(rating);
CREATE INDEX idx_prospective_businesses_location ON prospective_businesses USING GIST(location);
CREATE INDEX idx_prospective_businesses_discovery_zip ON prospective_businesses(discovery_zip);

-- Updated at trigger
CREATE TRIGGER update_prospective_businesses_updated_at
  BEFORE UPDATE ON prospective_businesses
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();
```

---

## TypeScript Types (Shared)

```typescript
// src/types/discovery.ts

export type ServiceCategory =
  | 'plumbing'
  | 'hvac'
  | 'electrical'
  | 'roofing'
  | 'landscaping'
  | 'pest_control'
  | 'cleaning'
  | 'painting'
  | 'carpentry'
  | 'appliance_repair'
  | 'general_contractor';

export type InvitationStatus =
  | 'pending'
  | 'invited'
  | 'clicked'
  | 'activated'
  | 'declined'
  | 'bounced';

export interface ProspectiveBusiness {
  id: string;
  googlePlaceId: string;
  name: string;
  formattedAddress: string | null;
  formattedPhoneNumber: string | null;
  internationalPhoneNumber: string | null;
  website: string | null;
  latitude: number | null;
  longitude: number | null;
  zipCode: string | null;
  city: string | null;
  state: string;
  rating: number | null;
  userRatingsTotal: number;
  priceLevel: number | null;
  businessStatus: string | null;
  serviceCategory: ServiceCategory;
  serviceTypes: string[] | null;
  discoveredAt: Date;
  discoverySource: string;
  discoveryZip: string;
  distanceFromTarget: number | null;
  invitationStatus: InvitationStatus;
  invitationSentAt: Date | null;
  invitationClickedAt: Date | null;
  followUpCount: number;
  lastFollowUpAt: Date | null;
  activated: boolean;
  activatedAt: Date | null;
  activatedBusinessId: string | null;
  qualified: boolean;
  disqualificationReason: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface DiscoveryConfig {
  targetMarkets: TargetMarket[];
  serviceCategories: ServiceCategory[];
  qualityFilters: QualityFilters;
  schedule: ScheduleConfig;
}

export interface TargetMarket {
  name: string;
  zipCode: string;
  radius: number; // miles
  priority: 'high' | 'medium' | 'low';
  coordinates: {
    lat: number;
    lng: number;
  };
}

export interface QualityFilters {
  minRating: number;
  minReviewCount: number;
  requirePhone: boolean;
  requireActiveHours: boolean;
}

export interface ScheduleConfig {
  discoveryFrequency: 'daily' | 'weekly';
  invitationBatchSize: number;
  followUpDays: number[];
}

export interface GooglePlacesResult {
  place_id: string;
  name: string;
  formatted_address: string;
  formatted_phone_number?: string;
  international_phone_number?: string;
  website?: string;
  geometry: {
    location: {
      lat: number;
      lng: number;
    };
  };
  rating?: number;
  user_ratings_total?: number;
  price_level?: number;
  business_status?: string;
  types: string[];
}
```

---

## Environment Variables Required

```bash
# Google Places API
GOOGLE_PLACES_API_KEY=your_key_here

# SendGrid for Email
SENDGRID_API_KEY=your_key_here
SENDGRID_FROM_EMAIL=invites@leadflip.com
SENDGRID_FROM_NAME=LeadFlip

# Redis/Upstash (already configured)
UPSTASH_REDIS_REST_URL=https://vocal-polliwog-15926.upstash.io
UPSTASH_REDIS_REST_TOKEN=your_token_here

# Base URL for invitation links
NEXT_PUBLIC_APP_URL=http://localhost:3002
```

---

## BullMQ Job Definitions

### Job: discovery-scan

**Queue**: `discovery`
**Trigger**: Cron (weekly) or manual
**Payload**:
```typescript
{
  zipCode: string;
  serviceCategory: ServiceCategory;
  radius: number;
}
```

**Actions**:
1. Call Google Places API for nearby businesses
2. Filter by quality criteria
3. Calculate distance from target ZIP
4. Insert into prospective_businesses (if not exists)
5. Return count of discovered businesses

---

### Job: send-invitation

**Queue**: `invitations`
**Trigger**: Daily batch (10 per day)
**Payload**:
```typescript
{
  prospectiveBusinessId: string;
}
```

**Actions**:
1. Fetch business details
2. Generate personalized invitation email
3. Create pre-filled signup link with query params
4. Send via SendGrid
5. Update invitation_status to 'invited'
6. Log invitation_sent_at timestamp

---

### Job: follow-up

**Queue**: `invitations`
**Trigger**: Daily check for businesses at day 3, 7, 14
**Payload**:
```typescript
{
  prospectiveBusinessId: string;
  followUpNumber: number; // 1, 2, or 3
}
```

**Actions**:
1. Check current status (skip if activated/declined)
2. Send follow-up email (different copy per follow-up)
3. Increment follow_up_count
4. Update last_follow_up_at

---

## API Integration Pattern

### Google Places API - Nearby Search

```typescript
// src/lib/google-places/client.ts

import { Client } from '@googlemaps/google-maps-services-js';

const client = new Client({});

export async function nearbySearch(params: {
  location: { lat: number; lng: number };
  radius: number; // meters
  type: string;
  keyword?: string;
}): Promise<GooglePlacesResult[]> {
  const response = await client.placesNearby({
    params: {
      location: params.location,
      radius: params.radius,
      type: params.type,
      keyword: params.keyword,
      key: process.env.GOOGLE_PLACES_API_KEY!,
    },
  });

  return response.data.results;
}

export async function placeDetails(placeId: string): Promise<any> {
  const response = await client.placeDetails({
    params: {
      place_id: placeId,
      fields: [
        'place_id',
        'name',
        'formatted_address',
        'formatted_phone_number',
        'international_phone_number',
        'website',
        'geometry',
        'rating',
        'user_ratings_total',
        'price_level',
        'business_status',
        'types',
      ],
      key: process.env.GOOGLE_PLACES_API_KEY!,
    },
  });

  return response.data.result;
}
```

---

## Email Templates Structure

### Template 1: Initial Invitation

**Subject**: `Exclusive invite: Join LeadFlip for qualified leads in {city}`

**Body**:
```
Hi {business_name},

We found your {service_category} business on Google ({rating} stars - impressive!) and think you'd be perfect for LeadFlip.

LeadFlip connects local service businesses like yours with customers who need help right now. No bidding wars, no fake leads - just qualified customers ready to hire.

Why businesses in {city} are joining:
• Pay only for leads you want
• AI pre-qualifies customers before you're matched
• Get notified instantly via SMS/email
• Average response time: under 15 minutes

Your profile is pre-filled - it takes 2 minutes to activate:
{signup_link}

Questions? Reply to this email.

Best,
The LeadFlip Team

P.S. We're launching in {city} this month. Early businesses get 50% off their first 5 leads.
```

### Template 2: Follow-Up (Day 3)

**Subject**: `Following up: {business_name} + LeadFlip`

### Template 3: Follow-Up (Day 7)

**Subject**: `Last call: Exclusive leads for {business_name}`

### Template 4: Follow-Up (Day 14)

**Subject**: `We'll remove {business_name} from our list`

---

## tRPC Endpoints Needed

```typescript
// src/server/routers/discovery.ts

export const discoveryRouter = router({
  // Admin: Get all prospective businesses
  getProspects: adminProcedure
    .input(z.object({
      serviceCategory: z.string().optional(),
      invitationStatus: z.string().optional(),
      zipCode: z.string().optional(),
      limit: z.number().default(50),
      offset: z.number().default(0),
    }))
    .query(async ({ input }) => { /* ... */ }),

  // Admin: Get discovery dashboard stats
  getStats: adminProcedure
    .query(async () => { /* ... */ }),

  // Admin: Trigger manual discovery scan
  triggerScan: adminProcedure
    .input(z.object({
      zipCode: z.string(),
      serviceCategory: z.string(),
    }))
    .mutation(async ({ input }) => { /* ... */ }),

  // Admin: Send invitation manually
  sendInvitation: adminProcedure
    .input(z.object({
      prospectiveBusinessId: z.string(),
    }))
    .mutation(async ({ input }) => { /* ... */ }),

  // Admin: Mark business as disqualified
  disqualify: adminProcedure
    .input(z.object({
      prospectiveBusinessId: z.string(),
      reason: z.string(),
    }))
    .mutation(async ({ input }) => { /* ... */ }),

  // Public: Track invitation click (via query param)
  trackClick: publicProcedure
    .input(z.object({
      prospectId: z.string(),
    }))
    .mutation(async ({ input }) => { /* ... */ }),
});
```

---

## Admin Dashboard UI Components

### `/admin/discovery` - Main Dashboard

**Layout**:
```
┌─────────────────────────────────────────────────────────┐
│ Business Discovery - Indiana Launch                     │
├─────────────────────────────────────────────────────────┤
│                                                          │
│ 📊 Overview                                             │
│ ┌──────────┬──────────┬──────────┬──────────┐          │
│ │ 127      │ 64       │ 12       │ 3        │          │
│ │ Discovered│ Invited │ Clicked  │ Activated│          │
│ └──────────┴──────────┴──────────┴──────────┘          │
│                                                          │
│ 📍 By Market                                            │
│ • Bloomington (47448): 37 discovered, 2 activated       │
│ • Columbus (47201): 27 discovered, 1 activated          │
│                                                          │
│ 🔧 By Service Category                                  │
│ • Plumbing: 22 discovered, 1 activated                  │
│ • HVAC: 18 discovered, 1 activated                      │
│ • Electrical: 16 discovered, 1 activated                │
│ • Roofing: 14 discovered, 0 activated                   │
│                                                          │
│ 🎯 Next Actions                                         │
│ • 10 invitations scheduled for 9 AM tomorrow            │
│ • 8 follow-ups scheduled for today                      │
│ • 3 businesses clicked but haven't activated            │
│                                                          │
│ [View All Prospects] [Run Discovery] [Settings]         │
└─────────────────────────────────────────────────────────┘
```

### `/admin/discovery/prospects` - Prospects Table

**Columns**:
- Business Name
- Service Category
- Rating (stars)
- Reviews Count
- City, ZIP
- Distance
- Status (badge)
- Actions (Invite, Disqualify)

---

## File Structure

```
src/
├── lib/
│   ├── google-places/
│   │   ├── client.ts          # Google Places API wrapper
│   │   └── types.ts           # Google Places types
│   ├── discovery/
│   │   ├── config.ts          # Discovery configuration
│   │   ├── filters.ts         # Quality filtering logic
│   │   └── utils.ts           # Distance calculations, etc.
│   ├── email/
│   │   ├── sendgrid.ts        # SendGrid client
│   │   └── templates.ts       # Email template functions
│   └── jobs/
│       ├── discovery-scan.ts  # BullMQ job handler
│       ├── send-invitation.ts # BullMQ job handler
│       └── follow-up.ts       # BullMQ job handler
├── server/
│   └── routers/
│       └── discovery.ts       # tRPC discovery router
├── app/
│   └── admin/
│       └── discovery/
│           ├── page.tsx       # Main dashboard
│           └── prospects/
│               └── page.tsx   # Prospects table
├── components/
│   └── admin/
│       └── discovery/
│           ├── stats-cards.tsx
│           ├── market-breakdown.tsx
│           ├── prospects-table.tsx
│           └── scan-trigger.tsx
└── types/
    └── discovery.ts           # Shared types
```

---

## Subagent Task Assignments

### Agent 1: Database & Core Types
- Create migration file for prospective_businesses table
- Create src/types/discovery.ts with all TypeScript types
- Create src/lib/discovery/config.ts with SERVICE_CATEGORIES

### Agent 2: Google Places Integration
- Install @googlemaps/google-maps-services-js
- Create src/lib/google-places/client.ts
- Create src/lib/google-places/types.ts
- Implement nearbySearch and placeDetails functions

### Agent 3: BullMQ Jobs
- Create src/lib/jobs/discovery-scan.ts
- Create src/lib/jobs/send-invitation.ts
- Create src/lib/jobs/follow-up.ts
- Setup job queues and workers

### Agent 4: Email System
- Install @sendgrid/mail
- Create src/lib/email/sendgrid.ts client
- Create src/lib/email/templates.ts with all 4 email templates
- Implement template rendering with variables

### Agent 5: tRPC Router
- Create src/server/routers/discovery.ts
- Implement all 6 endpoints (getProspects, getStats, triggerScan, sendInvitation, disqualify, trackClick)
- Add to main tRPC router

### Agent 6: Admin Dashboard UI
- Create src/app/admin/discovery/page.tsx
- Create src/components/admin/discovery/stats-cards.tsx
- Create src/components/admin/discovery/market-breakdown.tsx
- Create src/components/admin/discovery/scan-trigger.tsx

### Agent 7: Prospects Table UI
- Create src/app/admin/discovery/prospects/page.tsx
- Create src/components/admin/discovery/prospects-table.tsx
- Implement filtering, sorting, pagination
- Add action buttons (Invite, Disqualify)

---

## Success Criteria

Each subagent's work is complete when:
1. All files compile without TypeScript errors
2. All imports resolve correctly
3. Code follows existing project patterns
4. No console errors when running dev server
5. Database migrations run successfully

## Integration Points

After all agents complete:
1. Run database migration
2. Test Google Places API connection
3. Test SendGrid email sending
4. Verify BullMQ jobs queue properly
5. Test admin dashboard loads
6. Run end-to-end discovery scan for one ZIP code
