# Integration Points - Cross-Agent Coordination

**Purpose**: Document shared interfaces, types, and dependencies between agent tracks
**Rule**: Any agent changing a shared interface MUST update this document first

---

## Shared TypeScript Types

### Lead Classification Output
**Owner**: Track 2 (Schema)
**Consumers**: Track 1 (Notifications), Track 3 (AI Calling), Track 4 (Testing)

```typescript
// Location: src/types/lead-classifier.ts
export interface ClassifiedLead {
  service_category: string;
  urgency: 'emergency' | 'urgent' | 'standard' | 'flexible';
  budget_min: number;
  budget_max: number | null;
  location_zip: string | null;
  location_city?: string;  // ⚠️ Track 2: Adding this field
  key_requirements: string[];
  sentiment: 'positive' | 'neutral' | 'negative';
  quality_score: number; // 0-10
}
```

**Changes**:
- [Track 2] Will add `location_city` field after geocoding implementation

---

### Business Profile Schema
**Owner**: Track 2 (Schema)
**Consumers**: Track 1 (Notifications), Track 3 (AI Calling)

```typescript
// Database columns (after Track 2 fixes)
businesses {
  id: UUID
  user_id: UUID
  name: string                        // ✅ Fixed: was business_name
  service_categories: string[]
  phone_number: string               // ✅ Fixed: was phone
  email: string
  address: string
  city: string
  state: string
  zip_code: string
  location: GEOGRAPHY(POINT)         // ✅ Fixed: was location_point
  description?: string
  price_tier: 'budget' | 'standard' | 'premium'
  offers_emergency_service: boolean
  is_licensed: boolean
  is_insured: boolean
  is_active: boolean
  years_in_business?: number         // ⚠️ Track 2: ADDING THIS
  completed_jobs?: number            // ⚠️ Track 2: ADDING THIS
  notifications_paused: boolean
  max_monthly_leads?: number
  created_at: timestamp
  updated_at: timestamp
}
```

**Changes**:
- [Track 2] ✅ COMPLETE: Fixed `phone` → `phone_number`
- [Track 2] ✅ COMPLETE: Fixed `location_point` → `location`
- [Track 2] ✅ COMPLETE: Fixed `business_name` → `name`
- [Track 2] ✅ COMPLETE: Added `years_in_business`, `completed_jobs`
- [Track 2] ✅ COMPLETE: Added `address`, `city`, `state`, `zip_code`
- [Track 2] ✅ COMPLETE: Added `description`, `price_tier`, `rating`
- [Track 2] ✅ COMPLETE: Added `offers_emergency_service`, `is_licensed`, `is_insured`, `is_active`
- [Track 2] ✅ COMPLETE: Added `max_monthly_leads`

---

### Notification Payload
**Owner**: Track 1 (Notifications)
**Consumers**: Track 3 (AI Calling - uses similar pattern)

```typescript
// Location: src/types/notifications.ts (Track 1 will create)
export interface NotificationPayload {
  channel: 'email' | 'sms' | 'slack';
  recipient: string;
  subject: string;
  message: string;
  call_to_action: string;
  lead_id: string;
  business_id: string;
  metadata?: {
    lead_quality_score?: number;
    urgency?: string;
    service_category?: string;
  };
}

export interface NotificationResult {
  success: boolean;
  message_id?: string;
  error?: string;
  sent_at: string;
}
```

**Changes**:
- [Track 1] Will create this interface
- [Track 3] Will reuse for call-related notifications

---

### Call Queue Job
**Owner**: Track 3 (AI Calling)
**Consumers**: Track 5 (Deployment - needs to know job structure)

```typescript
// Location: src/server/queue/config.ts (already exists, Track 3 will verify)
export interface InitiateCallJob {
  call_id: string;
  lead_id: string;
  business_id?: string;
  consumer_id?: string;
  phone_number: string;
  call_type: 'qualify_lead' | 'confirm_appointment' | 'follow_up' | 'consumer_callback';
  objective: string;
  system_prompt: string;
  scheduled_time?: string;
  attempt_number: number;
}
```

**Changes**:
- [Track 3] Will add validation for phone_number format
- [Track 3] Will add `priority` field for urgent calls

---

## API Contracts

### tRPC Mutation: `lead.submit`
**Owner**: Track 2 (Schema) - depends on this working
**Consumers**: Track 1 (Notifications), Track 4 (Testing)

```typescript
// Input
{
  problemText: string; // min 10 chars
  contactPhone?: string; // E.164 format
  contactEmail?: string; // valid email
}

// Output
{
  lead_id: string;
  classified_lead: ClassifiedLead;
  quality_score: number;
  matches: BusinessMatch[];
  notifications_sent: number;  // ⚠️ Track 1: Will make this accurate
  status: 'matched' | 'no_matches' | 'low_quality' | 'error';
}
```

**Changes**:
- [Track 1] `notifications_sent` will return actual count (currently always 0)
- [Track 2] Schema must support all ClassifiedLead fields

---

### tRPC Mutation: `business.requestAICall`
**Owner**: Track 3 (AI Calling)
**Consumers**: Track 4 (Testing), Track 5 (Deployment)

```typescript
// Input
{
  leadId: string; // UUID
  objective: string; // Min 10 characters
  scheduledTime?: string; // ISO 8601
}

// Output
{
  success: boolean;
  call_id: string;              // ✅ Track 3: ADDED
  message: string;              // ✅ Track 3: ADDED
  queued_at: string;            // ✅ Track 3: ADDED
}
```

**Changes**:
- [Track 3] ✅ COMPLETE: Returns actual call_id from database + BullMQ job
- [Track 3] ✅ COMPLETE: Returns queued_at timestamp
- [Track 3] ✅ COMPLETE: Returns user-friendly message
- [Track 3] ✅ COMPLETE: Validates business is matched to lead before queueing
- [Track 3] ✅ COMPLETE: Creates call record in database before queueing
- [Track 3] ✅ COMPLETE: Generates system prompt via CallAgent

---

### tRPC Mutation: `lead.requestCallback`
**Owner**: Track 3 (AI Calling)
**Consumers**: Track 4 (Testing), Track 5 (Deployment)

```typescript
// Input
{
  leadId: string; // UUID
  businessId: string; // UUID
  preferredTime?: string; // ISO 8601
  objective?: string; // Optional custom objective
}

// Output
{
  success: boolean;
  call_id: string;
  message: string;
  queued_at: string;
}
```

**Changes**:
- [Track 3] ✅ COMPLETE: Validates consumer owns lead
- [Track 3] ✅ COMPLETE: Validates business is matched and accepted lead
- [Track 3] ✅ COMPLETE: Requires consumer phone number
- [Track 3] ✅ COMPLETE: Generates default objective if not provided
- [Track 3] ✅ COMPLETE: Creates call record and queues BullMQ job
- [Track 3] ✅ COMPLETE: Returns call_id and queued_at timestamp

---

## Database Migration Coordination

### Migration Sequence
**Critical**: Migrations must run in order

1. **20250930000000_initial_schema.sql** (Already exists)
2. **20251001000001_fix_schema_mismatches.sql** (Track 2 will create)
   - Rename columns
   - Add missing columns
   - Update constraints
3. **20251001000002_add_notification_tracking.sql** (Track 1 will create)
   - Add `notifications` table
   - Add notification_history tracking
4. **20251001000003_add_call_metadata.sql** (Track 3 may create)
   - Add additional call tracking fields if needed

**Coordination Rule**: If Track 1 or 3 needs schema changes, notify Track 2 FIRST

---

## Environment Variables

### Track 1 (Notifications) Requirements
```bash
# Email
SENDGRID_API_KEY=          # or MAILGUN_API_KEY
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=

# SMS
TWILIO_ACCOUNT_SID=        # Already exists
TWILIO_AUTH_TOKEN=         # Already exists
TWILIO_PHONE_NUMBER=       # Already exists

# Slack (optional)
SLACK_BOT_TOKEN=
SLACK_CHANNEL_ID=
```

### Track 2 (Schema) Requirements
```bash
# Already configured
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

### Track 3 (AI Calling) Requirements
```bash
# Already configured
OPENAI_API_KEY=
ANTHROPIC_API_KEY=
REDIS_URL=

# New requirements
WEBSOCKET_SERVER_URL=      # Track 5 will provide after deployment
TWILIO_TWIML_APP_SID=      # Track 3 will configure
```

### Track 5 (Deployment) Requirements
```bash
# Railway/Fly.io
RAILWAY_TOKEN=             # or FLY_API_TOKEN=
DEPLOYMENT_ENV=production
```

---

## File Modification Conflicts

### High-Risk Files (Multiple Agents)
These files may be modified by multiple agents. Coordinate carefully.

**`src/lib/agents/main-orchestrator.ts`**
- Track 1: Lines 324-343 (notification sending)
- Track 2: May need to update for schema changes
- **Resolution**: Track 1 has priority, Track 2 reviews changes

**`src/server/routers/business.ts`**
- Track 2: Lines 46-68 (schema fixes)
- Track 3: Lines 199-232 (AI call integration)
- **Resolution**: Track 2 completes first, Track 3 rebases

**`src/server/queue/config.ts`**
- Track 3: May modify job interfaces
- Track 5: Needs to understand job structure
- **Resolution**: Track 3 updates INTEGRATION_POINTS.md with any changes

---

## Testing Data Contracts

### Test User Accounts
**Owner**: Track 4 (Testing)
**Shared with**: All tracks for manual testing

```typescript
// Track 4 will create these test accounts
export const TEST_USERS = {
  consumer1: {
    email: 'consumer1@test.leadflip.com',
    password: '[Track 4 will set]',
    clerk_id: '[Track 4 will provide]'
  },
  business1: {
    email: 'business1@test.leadflip.com',
    password: '[Track 4 will set]',
    clerk_id: '[Track 4 will provide]'
  },
  admin1: {
    email: 'admin1@test.leadflip.com',
    password: '[Track 4 will set]',
    clerk_id: '[Track 4 will provide]'
  }
};
```

### Test Database Seeding
**Owner**: Track 4 (Testing)
**Consumers**: All tracks

Track 4 will create:
- 10 test businesses (various categories, locations)
- 20 test leads (various quality scores)
- 5 test matches
- Sample call records

**Access**: All agents can use `npm run seed:test` after Track 4 creates it

---

## Change Request Process

If any agent needs to modify a shared interface:

1. **Post to this document** with proposed change
2. **Tag affected agents** in change description
3. **Wait 1 hour** for objections (or proceed if all agents approve)
4. **Update this document** with final change
5. **Implement change** in your track

Example change request format:
```markdown
## [CHANGE REQUEST] Track X - Description
**Proposed by**: [agent-name]
**Affects**: Track Y, Track Z
**Description**: [What you want to change]
**Reason**: [Why this change is needed]
**Breaking**: Yes/No

Proposed Change:
[Code or interface change]

**Status**: PENDING | APPROVED | REJECTED
**Approvals**: [Track Y: ✅] [Track Z: ⏳]
```

---

**Last Updated**: Agent fleet launch
**Next Review**: After Day 1 completion
