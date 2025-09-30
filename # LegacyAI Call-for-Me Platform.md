# # LegacyAI Call-for-Me Platform
# Complete Project Documentation
**Version:** 1.0 **Project Code:** LEGACY-CALL-001 **Start Date:** Q1 2025 **Target Launch:** 4-6 weeks from kickoff **Project Lead:** Douglas Talley

# Executive Summary
LegacyAI Call-for-Me is a B2B-focused AI-powered outbound calling platform that enables users to delegate phone calls to an intelligent agent. Unlike existing solutions (GenSpark), this platform prioritizes voice quality, advanced reasoning capabilities, and seamless integration with the LegacyAI ecosystem (CASPER, Legacy Prime, NeighborlyAI, Sympatico).
**Core Value Proposition:**
* Superior voice quality using OpenAI Realtime API (vs. GenSpark's poor voicing)
* Advanced reasoning via Claude 4 Sonnet for complex B2B scenarios
* Honor-system manual call entry with attestation for power users
* Multi-tenant SaaS architecture (users don't need their own API keys)
* Transparent pricing: ~$0.40/call cost → $0.60-0.75/call retail

⠀
# Problems Being Solved
### Problem 1: Time-Consuming Business Calls
**Who Experiences This:** Small business owners, consultants, sales teams, HOA managers
**Current State:**
* Business owners spend 5-15 hours/week on routine phone calls
* Calls for: vendor quotes, appointment scheduling, follow-ups, status checks
* High opportunity cost (time better spent on core business activities)

⠀**How We Solve It:**
* Delegate calls to AI agent with natural voice and reasoning
* AI can handle: information gathering, negotiation, scheduling, confirmation
* User provides instruction ("Call Acme Corp, ask for delivery times on Widget X")
* AI executes, returns summary + transcript

⠀**Success Metric:** Users save 8+ hours/week on routine calls

### Problem 2: Poor Voice Quality in Existing Tools
**Who Experiences This:** Current GenSpark users, early adopters of AI calling
**Current State:**
* GenSpark's voice quality is "very poor" (per user feedback)
* Robotic, unnatural, high latency, poor interruption handling
* Damages professional reputation when AI sounds obviously fake

⠀**How We Solve It:**
* OpenAI Realtime API provides <500ms latency, natural prosody
* Advanced turn-taking with interruption handling
* Claude reasoning layer ensures contextually appropriate responses
* Professional, warm tone suitable for B2B contexts

⠀**Success Metric:** 90%+ of called parties don't realize they're speaking with AI (blind tests)

### Problem 3: Lack of Control & Flexibility
**Who Experiences This:** Power users, businesses with specific workflows
**Current State:**
* GenSpark is a black box with limited customization
* No manual phone number entry for known contacts
* Can't integrate with existing CRM, calendar, or business systems
* One-size-fits-all approach doesn't serve specialized use cases

⠀**How We Solve It:**
* Manual call entry mode (user attests responsibility)
* Automated B2B mode (directory lookup with safety checks)
* Batch upload for campaigns (Enterprise tier)
* Extensible tool/integration architecture (CRM, calendar, payment APIs)
* LegacyAI ecosystem integration (CASPER orchestration, Legacy Prime workflows)

⠀**Success Metric:** 50%+ of Professional tier users utilize manual entry or integrations

### Problem 4: Compliance & Legal Uncertainty
**Who Experiences This:** Risk-averse businesses, regulated industries
**Current State:**
* Users unsure if AI calling violates TCPA, TSR, DNC regulations
* Platforms don't provide clear liability boundaries
* Fear of fines or lawsuits prevents adoption

⠀**How We Solve It:**
* Clear attestation system (user checks box, accepts responsibility)
* Comprehensive logging (who called whom, when, with what attestation)
* Abuse detection algorithms (sequential patterns, off-hours, keyword flags)
* Transparent ToS that shifts liability appropriately
* Ban mechanism for abusers protects platform reputation

⠀**Success Metric:** Zero legal incidents in first 6 months, 95%+ attestation completion rate

### Problem 5: Cost Opacity & Vendor Lock-In
**Who Experiences This:** Budget-conscious SMBs, consultants
**Current State:**
* GenSpark pricing is unclear or expensive
* Users forced into monthly subscriptions regardless of usage
* No transparency into per-call costs

⠀**How We Solve It:**
* Transparent pricing: $0.60/call pay-as-you-go OR subscription with credits
* Free tier (10 calls/mo) to try before buying
* Usage dashboard shows real-time cost breakdown (Twilio, OpenAI, Claude)
* No annual lock-in, cancel anytime

⠀**Success Metric:** 30%+ of signups convert from free → paid within 30 days

# User Stories
### User Story 1: The Consultant
**As a** management consultant juggling multiple clients **I want to** delegate vendor research calls to an AI agent **So that** I can focus on high-value strategic work instead of spending hours calling suppliers
**Acceptance Criteria:**
* User enters instruction: "Call 5 office furniture vendors, ask for pricing on 20 ergonomic chairs, delivery to Indianapolis"
* System looks up vendor phone numbers via directory (or user provides)
* AI calls each vendor, navigates phone menus, speaks with sales rep
* AI gathers: price per chair, bulk discounts, delivery timeframe, warranty terms
* System returns structured summary table + full transcripts
* Total time investment by user: 5 minutes to set up → 2 hours saved

⠀**Priority:** HIGH (Core MVP feature)

### User Story 2: The Small Business Owner
**As a** landscaping business owner **I want to** have AI call my suppliers to check inventory before I commit to a job **So that** I don't promise customers delivery dates I can't meet
**Acceptance Criteria:**
* User opens manual call mode, enters supplier phone number
* User checks attestation: "I have existing business relationship with this supplier"
* User provides objective: "Check if you have 50 bags of mulch in stock, ask pickup vs. delivery options"
* AI calls supplier, confirms identity ("Calling on behalf of Green Thumb Landscaping"), asks questions
* AI records answers, returns summary: "In stock: Yes. Pickup available today. Delivery: 2-day lead time, $50 fee"
* User makes informed decision on customer quote

⠀**Priority:** HIGH (Manual entry differentiator)

### User Story 3: The Sales Team Lead
**As a** B2B sales manager **I want to** automate qualification calls for warm leads **So that** my sales reps only spend time on high-intent prospects
**Acceptance Criteria:**
* User uploads CSV of 50 warm leads (company name, phone, contact name)
* For each lead, AI calls and asks: "Are you currently evaluating solutions for [problem]? What's your timeline? Who's the decision-maker?"
* AI categorizes responses: Hot (actively evaluating, <30 days), Warm (interested, 30-90 days), Cold (not interested)
* System outputs: 10 Hot leads with notes for reps to call back
* Sales reps focus on Hot leads only, conversion rate increases 40%

⠀**Priority:** MEDIUM (Post-MVP, Enterprise feature)

### User Story 4: The HOA Board Member
**As an** HOA board member managing a 200-unit community **I want to** get bids from 3 snow removal contractors without spending my evening on calls **So that** I can make a decision at next week's board meeting
**Acceptance Criteria:**
* User enters: "Call these 3 snow removal companies, ask for seasonal contract pricing (Nov-Mar), equipment used, response time guarantee"
* AI calls each contractor during business hours
* AI navigates: "Press 2 for sales" phone trees, leaves voicemail if no answer
* System schedules retry for no-answers (1 hour later, then next day)
* User receives comparison table: Contractor A ($5,000, 2-hour response), Contractor B ($6,500, 1-hour response), Contractor C (voicemail, no response)
* User presents to board with confidence

⠀**Priority:** MEDIUM (NeighborlyAI integration opportunity)

### User Story 5: The Power User (LegacyAI Ecosystem)
**As a** consultant using CASPER for complex workflows **I want to** invoke Call-for-Me as a tool within a CASPER workflow **So that** I can orchestrate multi-step research that combines web scraping, calling, and synthesis
**Acceptance Criteria:**
* CASPER workflow: "Research competitor pricing"
  * Step 1: Web scrape competitor websites (CASPER agent)
  * Step 2: Call competitors posing as potential customer (Call-for-Me agent)
  * Step 3: Synthesize: web price vs. phone quote, identify discrepancies (CASPER agent)
* User invokes CASPER with high-level goal
* CASPER breaks into subtasks, calls Call-for-Me API for phone research step
* Call-for-Me returns structured data to CASPER
* CASPER produces final report with all sources cited

⠀**Priority:** LOW (Post-MVP, ecosystem integration)

# Software Development Plan (SDP)
### Technology Stack
**Frontend**
* **Framework:** Next.js 14 (App Router)
* **UI Library:** React 18
* **Styling:** Tailwind CSS + shadcn/ui components
* **State Management:** React Context + Zustand (for complex state)
* **Forms:** React Hook Form + Zod validation
* **Realtime Updates:** Supabase Realtime (WebSocket subscriptions to calls table)
* **Deployment:** Vercel

⠀**Rationale:** Next.js 14 App Router provides excellent DX, server components reduce bundle size, Vercel deployment is zero-config. shadcn/ui gives professional UI without heavy library overhead.

**Backend / API Layer**
* **Framework:** Next.js API Routes (serverless functions)
* **Runtime:** Node.js 20+
* **API Patterns:** RESTful endpoints + Supabase Realtime for live updates
* **Authentication:** Clerk (JWT tokens validated in middleware)
* **Deployment:** Vercel (same as frontend, co-located)

⠀**Rationale:** No separate backend server needed. Next.js API routes handle all business logic, deployed as serverless functions on Vercel. Reduces operational complexity.

**Database & Storage**
* **Database:** Supabase (PostgreSQL 15)
* **ORM:** Supabase JavaScript Client + Raw SQL for complex queries
* **Storage:** Supabase Storage (call recordings as MP3/WAV files)
* **Realtime:** Supabase Realtime (live call status updates)
* **Migrations:** Supabase Migration CLI
* **Deployment:** Supabase Cloud (managed)

⠀**Rationale:** Supabase provides database, storage, realtime, and auth in one platform. Row-Level Security (RLS) ensures data isolation per user. Generous free tier, scales to enterprise.

**Authentication & User Management**
* **Provider:** Clerk
* **Features Used:**
  * Email/password + OAuth (Google, Microsoft)
  * JWT tokens compatible with Supabase RLS
  * User profile management
  * Session management
* **Integration:** Clerk Supabase JWT sync (automatic user_id mapping)

⠀**Rationale:** Clerk handles all auth complexity (password hashing, OAuth flows, session management). Tight Supabase integration means users are automatically synced to database.

**Call Queue & Job Processing**
* **Queue:** BullMQ (Redis-backed job queue)
* **Redis:** Upstash (serverless Redis) OR Railway (persistent Redis)
* **Workers:** Node.js worker processes (separate from API)
* **Deployment:** Railway or Render (24/7 worker process)

⠀**Rationale:** BullMQ provides robust job scheduling, retry logic, and concurrency control. Upstash offers serverless Redis (pay-per-use) ideal for MVP. Railway provides persistent Redis for production scale.

**Telephony Bridge (WebSocket Server)**
* **Runtime:** Node.js 20+ (standalone server)
* **WebSocket Library:** ws (native WebSockets)
* **Framework:** Express (minimal HTTP server for health checks)
* **Connections:**
  * Twilio Media Streams (WebSocket inbound)
  * OpenAI Realtime API (WebSocket outbound)
* **Deployment:** Railway, Fly.io, or Render (needs 24/7 uptime)

⠀**Rationale:** Separate WebSocket server required for real-time audio streaming. Cannot use serverless (needs persistent connections). Railway/Fly.io provide cheap, reliable hosting ($5-10/mo).

**External APIs**
| **Service** | **Purpose** | **SDK/Library** |
|:-:|:-:|:-:|
| **Twilio Programmable Voice** | PSTN call placement, media streaming | twilio npm package |
| **OpenAI Realtime API** | Voice input/output, transcription | openai npm package + WebSocket |
| **Anthropic Claude API** | Reasoning, decision-making, tool orchestration | @anthropic-ai/sdk |
| **Google Places API** (optional) | Business directory lookup | @googlemaps/google-maps-services-js |

**Monitoring & Observability**
* **Error Tracking:** Sentry
* **Logging:** Betterstack (Logtail) OR Supabase native logs
* **Uptime Monitoring:** Betterstack
* **Analytics:** Vercel Analytics (built-in) + Supabase Studio

⠀**Rationale:** Sentry catches errors in production with stack traces. Betterstack provides centralized logging. Minimal cost for MVP (<$50/mo combined).

### System Architecture Diagram
### ┌─────────────────────────────────────────────────────────────┐
### │                      USER BROWSER                            │
### │  Next.js 14 Frontend (React + Tailwind + shadcn/ui)         │
### │  Deployed on: Vercel                                         │
### └─────────────────────────────────────────────────────────────┘
###                         ↓ HTTPS
### ┌─────────────────────────────────────────────────────────────┐
### │                  AUTHENTICATION LAYER                        │
### │  Clerk (handles login, session, JWT generation)             │
### │  JWT tokens include: user_id, email, role                   │
### └─────────────────────────────────────────────────────────────┘
###                         ↓ Authenticated Requests
### ┌─────────────────────────────────────────────────────────────┐
### │                   BACKEND API LAYER                          │
### │  Next.js API Routes (serverless functions on Vercel)         │
### │  Routes:                                                      │
### │   - POST /api/calls/manual (create manual call)             │
### │   - POST /api/calls/automated (create automated B2B call)   │
### │   - GET  /api/calls (list user's calls)                     │
### │   - GET  /api/calls/:id (get call details)                  │
### │   - GET  /api/calls/:id/recording (get audio file)          │
### └─────────────────────────────────────────────────────────────┘
###             ↓                               ↓
### ┌───────────────────────────┐   ┌──────────────────────────────┐
### │   SUPABASE DATABASE       │   │   BULLMQ QUEUE (Redis)       │
### │   (PostgreSQL)            │   │   Hosted on: Upstash/Railway │
### │   Tables:                 │   │   Jobs:                      │
### │   - users                 │   │   - initiate-call            │
### │   - calls                 │   │   - retry-call               │
### │   - call_attestations     │   │   - cleanup-old-files        │
### │   - call_flags            │   │                              │
### │   - user_consents         │   │   Workers:                   │
### │   Row-Level Security ON   │   │   - Call Session Worker      │
### └───────────────────────────┘   └──────────────────────────────┘
###             ↓                               ↓
### ┌─────────────────────────────────────────────────────────────┐
### │            CALL SESSION WORKER (Node.js Process)             │
### │  Hosted on: Railway/Fly.io (24/7 uptime required)           │
### │  Responsibilities:                                            │
### │  1. Consume jobs from BullMQ queue                           │
### │  2. Initiate Twilio call                                     │
### │  3. Establish WebSocket bridge: Twilio ↔ OpenAI ↔ Claude   │
### │  4. Stream audio bidirectionally                             │
### │  5. Invoke Claude for reasoning/tool calls                   │
### │  6. Save transcript, summary, recording to Supabase          │
### └─────────────────────────────────────────────────────────────┘
###             ↓                   ↓                   ↓
### ┌────────────────┐  ┌────────────────────┐  ┌─────────────────┐
### │ TWILIO API     │  │ OPENAI REALTIME    │  │ ANTHROPIC API   │
### │ (Telephony)    │  │ (Voice I/O)        │  │ (Reasoning)     │
### │ - Place calls  │  │ - Audio streaming  │  │ - Tool calls    │
### │ - Media streams│  │ - Transcription    │  │ - Decision logic│
### └────────────────┘  └────────────────────┘  └─────────────────┘

### Database Schema (Supabase PostgreSQL)
### -- Enable UUID extension
### CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

### -- Users table (synced from Clerk via JWT)
### CREATE TABLE users (
###   id UUID PRIMARY KEY, -- Matches Clerk user_id
###   email VARCHAR(255) NOT NULL UNIQUE,
###   full_name VARCHAR(255),
###   subscription_tier VARCHAR(50) DEFAULT 'free', -- 'free', 'starter', 'professional', 'enterprise'
###   account_status VARCHAR(50) DEFAULT 'active', -- 'active', 'suspended', 'under_review'
###   manual_calls_paused BOOLEAN DEFAULT false,
###   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
###   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
### );

### -- User consents (platform-level, one-time)
### CREATE TABLE user_consents (
###   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
###   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
###   consent_type VARCHAR(100) NOT NULL, -- 'outbound_calling', 'call_recording', 'data_processing'
###   consent_version VARCHAR(20) NOT NULL, -- Version of ToS/Privacy Policy
###   granted BOOLEAN NOT NULL,
###   granted_at TIMESTAMPTZ,
###   revoked_at TIMESTAMPTZ,
###   ip_address INET,
###   user_agent TEXT,
###   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
###   UNIQUE(user_id, consent_type, consent_version)
### );

### -- Calls table (core entity)
### CREATE TABLE calls (
###   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
###   user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
###   call_type VARCHAR(50) NOT NULL, -- 'manual_entry', 'automated_b2b', 'batch_upload'

###   -- Contact info
###   target_phone VARCHAR(20) NOT NULL,
###   contact_name VARCHAR(255),
###   contact_company VARCHAR(255),

###   -- Call details
###   call_purpose VARCHAR(100), -- 'existing_client', 'warm_lead', 'referral', 'vendor_inquiry', etc.
###   call_objective TEXT NOT NULL, -- User's instruction

###   -- Attestation (for manual calls)
###   user_attested BOOLEAN DEFAULT false,
###   attestation_signature VARCHAR(255), -- User's typed name
###   attestation_timestamp TIMESTAMPTZ,
###   attestation_ip_address INET,

###   -- Scheduling
###   status VARCHAR(50) NOT NULL DEFAULT 'queued', -- 'queued', 'in_progress', 'completed', 'failed', 'cancelled'
###   scheduled_for TIMESTAMPTZ,
###   started_at TIMESTAMPTZ,
###   ended_at TIMESTAMPTZ,
###   duration_seconds INTEGER,

###   -- Results
###   transcript JSONB, -- Array of {role: 'user'|'assistant', content: 'text', timestamp: '...'}
###   summary TEXT,
###   outcome VARCHAR(100), -- 'goal_achieved', 'no_answer', 'voicemail', 'declined', 'error'

###   -- Recording
###   recording_url TEXT, -- Supabase Storage URL
###   recording_duration_seconds INTEGER,

###   -- Costs
###   estimated_cost_usd DECIMAL(10,4),
###   actual_cost_usd DECIMAL(10,4),
###   cost_breakdown JSONB, -- {twilio: 0.07, openai: 0.30, claude: 0.03}

###   -- Metadata
###   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
###   updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
### );

### -- Call flags (abuse detection)
### CREATE TABLE call_flags (
###   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
###   call_id UUID NOT NULL REFERENCES calls(id) ON DELETE CASCADE,

###   flag_type VARCHAR(100) NOT NULL, -- 'rapid_calling', 'suspicious_pattern', 'keyword_detected', 'user_report'
###   flag_severity VARCHAR(20) NOT NULL, -- 'low', 'medium', 'high', 'critical'
###   flag_reason TEXT NOT NULL,

###   auto_detected BOOLEAN NOT NULL DEFAULT false,
###   detection_metadata JSONB,

###   -- Resolution
###   resolved BOOLEAN NOT NULL DEFAULT false,
###   resolved_at TIMESTAMPTZ,
###   resolved_by UUID REFERENCES users(id),
###   resolution_action VARCHAR(100), -- 'false_positive', 'warning_issued', 'account_suspended'
###   resolution_notes TEXT,

###   created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
### );

### -- Indexes
### CREATE INDEX idx_calls_user_status ON calls(user_id, status);
### CREATE INDEX idx_calls_scheduled ON calls(scheduled_for) WHERE status = 'queued';
### CREATE INDEX idx_calls_user_created ON calls(user_id, created_at DESC);
### CREATE INDEX idx_flags_unresolved ON call_flags(resolved, flag_severity) WHERE NOT resolved;

### -- Row Level Security (RLS)
### ALTER TABLE users ENABLE ROW LEVEL SECURITY;
### ALTER TABLE calls ENABLE ROW LEVEL SECURITY;
### ALTER TABLE call_flags ENABLE ROW LEVEL SECURITY;
### ALTER TABLE user_consents ENABLE ROW LEVEL SECURITY;

### -- RLS Policies
### -- Users can only see their own data
### CREATE POLICY "Users can view own profile" ON users FOR SELECT USING (auth.uid() = id);
### CREATE POLICY "Users can update own profile" ON users FOR UPDATE USING (auth.uid() = id);

### CREATE POLICY "Users can view own calls" ON calls FOR SELECT USING (auth.uid() = user_id);
### CREATE POLICY "Users can create own calls" ON calls FOR INSERT WITH CHECK (auth.uid() = user_id);
### CREATE POLICY "Users can update own calls" ON calls FOR UPDATE USING (auth.uid() = user_id);

### CREATE POLICY "Users can view own flags" ON call_flags FOR SELECT USING (
###   EXISTS (SELECT 1 FROM calls WHERE calls.id = call_flags.call_id AND calls.user_id = auth.uid())
### );

### CREATE POLICY "Users can view own consents" ON user_consents FOR SELECT USING (auth.uid() = user_id);
### CREATE POLICY "Users can create own consents" ON user_consents FOR INSERT WITH CHECK (auth.uid() = user_id);

### API Endpoints Specification
**POST /api/calls/manual
Description:** Create a manual call with user attestation
**Authentication:** Required (Clerk JWT)
**Request Body:**
### {
###   phone_number: string; // E.164 format, e.g., "+15551234567"
###   contact_name?: string;
###   contact_company?: string;
###   call_purpose: 'existing_client' | 'warm_lead' | 'referral' | 'vendor_inquiry' | 'partnership' | 'other_business';
###   call_objective: string; // Max 500 chars

###   attestation: {
###     legitimate_purpose: true;
###     not_dnc: true;
###     reasonable_basis: true;
###     understands_recording: true;
###     accepts_responsibility: true;
###     signature_full_name: string; // Min 3 chars
###     signature_organization?: string;
###   };

###   schedule_type: 'immediate' | 'scheduled';
###   scheduled_for?: string; // ISO datetime, required if scheduled
### }
**Response (200 OK):**
### {
###   call_id: string; // UUID
###   status: 'queued' | 'scheduled';
###   scheduled_for?: string; // ISO datetime
###   estimated_cost_usd: number;
###   validations: {
###     rate_limit_check: 'passed' | 'warning';
###   };
### }
**Response (429 Rate Limited):**
### {
###   error: 'Rate limit exceeded';
###   details: string;
###   retry_after: string; // ISO datetime
### }

**POST /api/calls/automated
Description:** Create automated B2B call via directory lookup
**Authentication:** Required (Clerk JWT)
**Request Body:**
### {
###   business_name: string;
###   business_location?: string; // City, state for disambiguation
###   call_objective: string;
###   schedule_type: 'immediate' | 'scheduled';
###   scheduled_for?: string;
### }
**Response (200 OK):**
### {
###   call_id: string;
###   status: 'queued' | 'scheduled';
###   business_info: {
###     name: string;
###     phone: string;
###     address: string;
###   };
###   estimated_cost_usd: number;
### }

**GET /api/calls
Description:** List user's calls with pagination
**Authentication:** Required (Clerk JWT)
**Query Parameters:**
* status: Filter by status (optional)
* limit: Number of results (default 20, max 100)
* offset: Pagination offset

⠀**Response (200 OK):**
### {
###   calls: [
###     {
###       id: string;
###       call_type: string;
###       target_phone: string;
###       contact_name?: string;
###       call_objective: string;
###       status: string;
###       created_at: string;
###       duration_seconds?: number;
###       outcome?: string;
###     }
###   ],
###   total: number;
###   has_more: boolean;
### }

**GET /api/calls/:id
Description:** Get detailed call information
**Authentication:** Required (Clerk JWT, must own call)
**Response (200 OK):**
### {
###   id: string;
###   call_type: string;
###   target_phone: string;
###   contact_name?: string;
###   contact_company?: string;
###   call_objective: string;
###   status: string;
###   scheduled_for?: string;
###   started_at?: string;
###   ended_at?: string;
###   duration_seconds?: number;
###   transcript?: Array<{
###     role: 'user' | 'assistant';
###     content: string;
###     timestamp: string;
###   }>;
###   summary?: string;
###   outcome?: string;
###   recording_url?: string;
###   actual_cost_usd?: number;
###   cost_breakdown?: {
###     twilio: number;
###     openai: number;
###     claude: number;
###   };
###   created_at: string;
### }

### Call Session Worker Logic
**Responsibilities:**
1 Consume initiate-call jobs from BullMQ queue
2 Initialize Twilio call with Media Streams
3 Establish WebSocket to OpenAI Realtime API
4 Bidirectionally stream audio: Twilio ↔ OpenAI
5 Monitor OpenAI responses for reasoning triggers
6 Invoke Claude API when complex decision needed
7 Execute tool calls (business lookup, CRM, etc.)
8 Save transcript incrementally to Supabase
9 Generate summary on call end
10 Upload recording to Supabase Storage
11 Update call status and costs in database

⠀**Pseudo-code Flow:**
### // Worker consumes job
### queue.process('initiate-call', async (job) => {
###   const { call_id, user_id } = job.data;

###   // 1. Fetch call details from Supabase
###   const call = await supabase.from('calls').select('*').eq('id', call_id).single();

###   // 2. Update status to 'in_progress'
###   await supabase.from('calls').update({ status: 'in_progress', started_at: new Date() }).eq('id', call_id);

###   // 3. Initiate Twilio call
###   const twilioCall = await twilioClient.calls.create({
###     to: call.target_phone,
###     from: process.env.TWILIO_PHONE_NUMBER,
###     url: `https://websocket-server.com/twiml/${call_id}`, // TwiML endpoint
###   });

###   // 4. Establish WebSocket to OpenAI Realtime API
###   const openaiWs = new WebSocket('wss://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview', {
###     headers: { Authorization: `Bearer ${process.env.OPENAI_API_KEY}` }
###   });

###   // 5. Send session config to OpenAI
###   openaiWs.on('open', () => {
###     openaiWs.send(JSON.stringify({
###       type: 'session.update',
###       session: {
###         modalities: ['audio', 'text'],
###         instructions: buildSystemPrompt(call.call_objective),
###         voice: 'alloy',
###         turn_detection: { type: 'server_vad' }
###       }
###     }));
###   });

###   // 6. Stream audio: Twilio → OpenAI
###   twilioWs.on('message', (msg) => {
###     if (msg.event === 'media') {
###       openaiWs.send(JSON.stringify({
###         type: 'input_audio_buffer.append',
###         audio: msg.media.payload
###       }));
###     }
###   });

###   // 7. Stream audio: OpenAI → Twilio
###   openaiWs.on('message', (msg) => {
###     const data = JSON.parse(msg);

###     if (data.type === 'response.audio.delta') {
###       twilioWs.send(JSON.stringify({
###         event: 'media',
###         media: { payload: data.delta }
###       }));
###     }

###     if (data.type === 'response.text.done') {
###       // Save transcript turn
###       transcript.push({ role: 'assistant', content: data.text, timestamp: new Date() });

###       // Check if Claude reasoning needed
###       if (requiresClaudeReasoning(data.text)) {
###         const claudeResponse = await invokeClaudeAgent(transcript, call.call_objective);
###         // Feed Claude's decision back to OpenAI
###         openaiWs.send(JSON.stringify({
###           type: 'conversation.item.create',
###           item: { type: 'message', role: 'system', content: claudeResponse }
###         }));
###       }
###     }

###     if (data.type === 'conversation.interrupted') {
###       // User interrupted AI, truncate current output
###       twilioWs.send(JSON.stringify({ event: 'clear' }));
###     }
###   });

###   // 8. Handle call end
###   twilioWs.on('close', async () => {
###     const endTime = new Date();
###     const duration = (endTime - call.started_at) / 1000; // seconds

###     // Generate summary with Claude
###     const summary = await generateSummary(transcript, call.call_objective);

###     // Determine outcome
###     const outcome = determineOutcome(transcript, call.call_objective);

###     // Calculate costs
###     const costs = {
###       twilio: duration * 0.014 / 60,
###       openai: duration * 0.06 / 60,
###       claude: (transcript.length * 100) * (3 / 1000000) // Rough estimate
###     };

###     // Update Supabase
###     await supabase.from('calls').update({
###       status: 'completed',
###       ended_at: endTime,
###       duration_seconds: duration,
###       transcript: transcript,
###       summary: summary,
###       outcome: outcome,
###       actual_cost_usd: costs.twilio + costs.openai + costs.claude,
###       cost_breakdown: costs
###     }).eq('id', call_id);

###     // Upload recording if enabled
###     if (process.env.ENABLE_RECORDING === 'true') {
###       const recordingUrl = await uploadRecording(twilioCall.sid, call_id);
###       await supabase.from('calls').update({ recording_url: recordingUrl }).eq('id', call_id);
###     }
###   });
### });

### Development Phases & Timeline
**Phase 0: Setup & Infrastructure (Week 0 - Before coding)
Duration:** 3-5 business days (includes waiting for approvals)
**Tasks:**
1 Create Twilio account, submit A2P registration *(wait 1-2 weeks)*
2 Create OpenAI account, request Realtime API access *(wait 1-7 days)*
3 Create Anthropic, Supabase, Clerk, Upstash accounts *(same day)*
4 Purchase domain, setup DNS
5 Make design decisions (recording, voicemail, rate limits)
6 Draft ToS and Privacy Policy (use templates)

⠀**Deliverables:**
* All API keys collected in secure vault (1Password, .env file template)
* Design decisions documented
* Legal docs published (can iterate later)

⠀**Blocker Warning:** Cannot proceed to Phase 1 until Twilio A2P approved (1-2 weeks). Use wait time for other account setups.

**Phase 1: Foundation (Week 1)
Duration:** 5 days
**Tasks:**
1 Setup Next.js 14 project with TypeScript, Tailwind, shadcn/ui
2 Configure Clerk authentication, setup middleware
3 Initialize Supabase project, run migrations (create tables)
4 Setup Clerk ↔ Supabase JWT sync
5 Build basic UI shell (navbar, sidebar, dashboard layout)
6 Create authentication flow (sign up, login, protected routes)
7 Setup Vercel deployment, connect GitHub repo

⠀**Deliverables:**
* Users can sign up, log in, see empty dashboard
* Database schema deployed to Supabase
* CI/CD pipeline established (push to main → auto-deploy)

⠀**Blocker Warning:** Clerk Supabase integration requires correct JWT config. Test auth flow thoroughly before proceeding.

**Phase 2: Core Call Flow (Week 2)
Duration:** 7 days
**Tasks:**
1 Build manual call form UI (phone input, objective, attestation)
2 Implement POST /api/calls/manual endpoint
3 Create BullMQ queue, setup Upstash Redis connection
4 Build basic WebSocket server (connects Twilio + OpenAI)
5 Implement OpenAI Realtime API integration
6 Test: Place call to YOUR phone, hear AI respond
7 Build call detail page (show status, transcript)
8 Implement Supabase Realtime subscription for live status updates

⠀**Deliverables:**
* User can submit manual call form
* Call is queued, worker picks it up
* Twilio places call, user hears AI voice
* Transcript appears in real-time on dashboard

⠀**Blocker Warning:** WebSocket server must be deployed on persistent infrastructure (Railway/Fly.io) NOT Vercel (serverless doesn't support persistent connections).

**Phase 3: Intelligence Layer (Week 3)
Duration:** 5 days
**Tasks:**
1 Integrate Claude API for reasoning
2 Build tool definitions (business lookup, log event, end call)
3 Implement handoff logic (OpenAI voice → Claude reasoning → back to OpenAI)
4 Build summary generation (Claude generates summary from transcript)
5 Implement outcome detection logic
6 Add cost tracking (calculate Twilio + OpenAI + Claude costs)
7 Optimize system prompts based on test calls

⠀**Deliverables:**
* AI can invoke tools during call (e.g., lookup business info)
* Post-call summary is automatically generated
* Cost breakdown visible in UI

⠀**Blocker Warning:** Claude API rate limits may be hit during testing. Request quota increase if needed.

**Phase 4: Polish & Safety (Week 4)
Duration:** 5 days
**Tasks:**
1 Build admin dashboard (view flagged calls)
2 Implement abuse detection algorithms (sequential patterns, keyword detection)
3 Add rate limiting (check hourly/daily/monthly limits)
4 Build call history page with filters
5 Implement recording upload to Supabase Storage
6 Add error handling (Twilio errors, OpenAI failures, retry logic)
7 Setup Sentry for error tracking
8 Write user documentation (how to use manual entry, attestation explained)

⠀**Deliverables:**
* Abuse detection flags suspicious calls
* Rate limits prevent spam
* Errors are logged and visible in Sentry
* User guide published

⠀**Blocker Warning:** Test rate limiting with multiple accounts. Ensure Clerk user_id is correctly used for limit tracking.

**Phase 5: Beta Testing (Week 5-6)
Duration:** 10 days
**Tasks:**
1 Recruit 5-10 beta testers from network
2 Onboard beta testers (give them accounts, walk through platform)
3 Monitor first 50 calls closely (listen to recordings, read transcripts)
4 Collect feedback via surveys
5 Identify bugs, usability issues
6 Iterate on system prompts, UI/UX
7 Test edge cases (no answer, voicemail, busy signal, caller hangs up mid-call)
8 Conduct load testing (simulate 10 concurrent calls)

⠀**Deliverables:**
* 50+ real calls made by beta testers
* Feedback incorporated
* Major bugs fixed
* System proven stable under load

⠀**Blocker Warning:** If voice quality is poor (<4/5 rating), do NOT launch. Debug latency issues first.

### Scrum Master: Pre-Emptive Blockage Warnings
**Blocker 1: Twilio A2P Approval Delay
Risk:** HIGH **Timeline Impact:** 1-2 week delay if not started early
**Mitigation:**
* Start Twilio A2P registration on Day 1 of project
* During wait time, build frontend, database, auth flow
* Use Twilio trial account with verified numbers for initial testing
* Have backup plan: Use Vonage or Plivo if Twilio rejects

⠀**Early Warning Signs:**
* Twilio requests additional business documentation
* A2P registration status stuck on "Pending" > 5 days

⠀**Action Plan:**
* Contact Twilio support proactively on Day 3
* Escalate to Twilio sales rep if available
* Consider expedited review (may require phone call)

⠀
**Blocker 2: OpenAI Realtime API Access
Risk:** MEDIUM **Timeline Impact:** 1-7 day delay
**Mitigation:**
* Request Realtime API access on Day 1
* In waitlist form, emphasize B2B use case, business plan
* Use OpenAI standard Whisper + TTS as fallback (lower quality but works)

⠀**Early Warning Signs:**
* No response from OpenAI after 3 days
* Access request rejected

⠀**Action Plan:**
* Email OpenAI developer support with detailed use case
* Offer to do a demo call for their team
* Fallback: Build with standard API, migrate to Realtime later

⠀
**Blocker 3: WebSocket Server Deployment
Risk:** MEDIUM **Timeline Impact:** 1-2 day delay
**Mitigation:**
* Choose Railway or Fly.io early (both have easy Node.js deployment)
* Do NOT try to deploy WebSocket server on Vercel (will fail)
* Test WebSocket connectivity immediately after deployment

⠀**Early Warning Signs:**
* WebSocket connections timing out
* Server crashing under load
* High latency (>2 seconds)

⠀**Action Plan:**
* Check WebSocket server logs for errors
* Increase server resources (RAM, CPU)
* Add connection pooling if too many concurrent calls
* Consider vertical scaling (larger instance) over horizontal (multiple instances with sticky sessions needed)

⠀
**Blocker 4: Claude API Rate Limits
Risk:** LOW (for MVP), MEDIUM (for scale) **Timeline Impact:** 1 day delay
**Mitigation:**
* Anthropic provides generous rate limits on paid accounts
* During development, use console logging to track Claude API calls
* Implement caching for repeated tool results (e.g., business lookup)

⠀**Early Warning Signs:**
* 429 Rate Limit Exceeded errors in logs
* Calls failing due to Claude unavailability

⠀**Action Plan:**
* Request rate limit increase from Anthropic support
* Implement exponential backoff retry logic
* Cache Claude responses when safe (e.g., business info)

⠀
**Blocker 5: Supabase Row Level Security (RLS) Misconfiguration
Risk:** HIGH (security issue) **Timeline Impact:** 2-3 hours debugging
**Mitigation:**
* Test RLS policies immediately after creation
* Use Supabase Studio to run test queries as different users
* Write automated tests for RLS (check user A cannot see user B's calls)

⠀**Early Warning Signs:**
* Frontend queries returning empty results (RLS blocking legitimate access)
* Users seeing other users' data (RLS not working)

⠀**Action Plan:**
* Review RLS policies in Supabase Studio
* Test with two separate user accounts in different browsers
* Use Supabase logs to see which policies are evaluated
* Simplify policies first (e.g., auth.uid() = user_id), then add complexity

⠀
**Blocker 6: Clerk JWT Token Issues with Supabase
Risk:** MEDIUM **Timeline Impact:** 2-4 hours debugging
**Mitigation:**
* Follow Clerk's Supabase integration guide exactly
* Verify JWT signing secret matches between Clerk and Supabase
* Test token flow: Clerk generates JWT → Next.js API validates → Supabase RLS uses auth.uid()

⠀**Early Warning Signs:**
* Supabase queries returning "JWT expired" errors
* auth.uid() in RLS policies returns null

⠀**Action Plan:**
* Check Clerk dashboard: Ensure Supabase integration is enabled
* Verify Supabase project settings have correct JWT secret
* Use jwt.io to decode Clerk token, verify sub claim matches Supabase user_id
* Test with curl command to isolate frontend vs backend issue

⠀
**Blocker 7: Audio Quality / Latency Issues
Risk:** HIGH (impacts core value prop) **Timeline Impact:** 1-3 days debugging
**Mitigation:**
* Deploy WebSocket server geographically close to Twilio and OpenAI (us-east-1 recommended)
* Use wired internet connection for initial testing (not WiFi)
* Monitor latency at each hop: Twilio → WebSocket Server → OpenAI

⠀**Early Warning Signs:**
* Audio has >1 second delay (robotic feel)
* Audio cutting in/out
* Echo or feedback
* Caller complains "I can't hear you clearly"

⠀**Action Plan:**
* Check WebSocket server logs for slow processing (>200ms per message)
* Reduce audio buffer size (smaller chunks = lower latency but higher CPU)
* Test from multiple locations (different ISPs, cellular)
* Consider dedicated infrastructure (not shared Hobby tier)
* Profile code for performance bottlenecks

⠀
**Blocker 8: Cost Overruns During Testing
Risk:** LOW **Timeline Impact:** N/A (financial)
**Mitigation:**
* Set budget alerts on Twilio ($50), OpenAI ($50), Claude ($50)
* Use Twilio trial credits for initial testing ($15 free)
* Limit test calls to 5 minutes max (hang up programmatically)

⠀**Early Warning Signs:**
* Twilio bill >$20 in first week (should be <$5)
* OpenAI bill >$30 in first week (should be <$10)

⠀**Action Plan:**
* Review logs for runaway processes (call not ending properly)
* Add automatic call duration limit (e.g., 10 min max)
* Pause testing until issue resolved
* Use free/trial resources whenever possible

⠀
**Blocker 9: Beta Tester Recruitment
Risk:** MEDIUM **Timeline Impact:** 1 week delay
**Mitigation:**
* Start recruiting beta testers in Week 3 (before Phase 5)
* Offer incentive: Free account for 6 months + $50 credit
* Leverage LegacyAI network, LinkedIn, HOA contacts

⠀**Early Warning Signs:**
* Only 1-2 beta testers signed up by Week 4
* Beta testers not making calls (no engagement)

⠀**Action Plan:**
* Personally reach out to warm contacts (not just broadcast)
* Offer 1:1 onboarding call to walk them through
* Make it easy: Provide sample call objectives ("Call this vendor, ask X")
* Gamify: "First 10 beta testers get lifetime discount"

⠀
**Blocker 10: Compliance / Legal Concerns
Risk:** LOW (for MVP), HIGH (for scale) **Timeline Impact:** Variable
**Mitigation:**
* Use ToS template (customize minimally)
* Add clear disclaimers: "Beta product, use at own risk"
* Start with B2B only (lower regulatory risk than B2C)
* Log everything (CYA if complaint arises)

⠀**Early Warning Signs:**
* User reports receiving unwanted call from platform
* Complaint filed with FTC or state attorney general
* Twilio suspends account for abuse

⠀**Action Plan:**
* Investigate immediately (within 24 hours)
* Pull call logs, transcript, attestation record
* Contact user who made call
* If malicious, ban user permanently
* If genuine complaint, offer apology + refund, investigate safeguard gaps
* Consult lawyer if formal complaint or legal threat

⠀
# Product Requirements Document (PRD)
### Product Vision
LegacyAI Call-for-Me becomes the go-to platform for B2B professionals who need to delegate routine phone calls without sacrificing quality or control. Within 12 months, 1,000+ active users save 8+ hours/week each, generating $50K MRR.

### Success Metrics (KPIs)
**User Acquisition**
* **Target:** 500 signups in first 3 months
* **Measurement:** Clerk dashboard, Google Analytics
* **Leading Indicator:** 50+ signups in beta (Month 1)

⠀**Activation**
* **Target:** 40% of signups make at least 1 call within 7 days
* **Measurement:** Supabase query (users with calls count > 0)
* **Leading Indicator:** Onboarding completion rate >70%

⠀**Retention**
* **Target:** 60% of users make calls in Month 2 (retained users)
* **Measurement:** Cohort analysis in Supabase
* **Leading Indicator:** Week 2 retention >75%

⠀**Revenue**
* **Target:** $10K MRR by Month 6
* **Measurement:** Stripe dashboard (billing)
* **Leading Indicator:** 30% free → paid conversion rate

⠀**Voice Quality**
* **Target:** 90% of called parties don't realize it's AI (blind test)
* **Measurement:** Post-call surveys (optional)
* **Leading Indicator:** <500ms average latency, <5% error rate

⠀**Cost Efficiency**
* **Target:** Maintain 40%+ gross margin (revenue - COGS)
* **Measurement:** (Revenue - API Costs) / Revenue
* **Leading Indicator:** Actual cost per call <$0.42

⠀
### Minimum Viable Product (MVP) Feature Set
**✅ Must Have (Launch Blockers)
1** **User Authentication**
	* Email/password signup via Clerk
	* Password reset flow
	* Protected routes (dashboard requires login)
**2** **Manual Call Entry**
	* Phone number input (E.164 validation)
	* Call objective text area
	* Attestation checkboxes + digital signature
	* Schedule immediate or future call
**3** **Call Execution**
	* Queue system (BullMQ)
	* WebSocket bridge (Twilio ↔ OpenAI ↔ Claude)
	* Real-time audio streaming
	* Basic error handling (retry failed calls 1x)
**4** **Call Dashboard**
	* List all user's calls (with status badges)
	* Real-time status updates (queued → in-progress → completed)
	* Click to view call details
**5** **Call Detail Page**
	* Full transcript (turn-by-turn)
	* AI-generated summary
	* Call outcome badge
	* Duration and cost breakdown
	* Attestation record display (for manual calls)
**6** **Basic Abuse Detection**
	* Rate limiting (hourly, daily, monthly)
	* Automatic pause on suspicious patterns

⠀
**🟡 Should Have (Post-MVP, Month 2-3)
1** **Automated B2B Call Mode**
	* Business directory lookup (Google Places API)
	* DNC check integration (optional service)
	* Automated call placement without manual attestation
**2** **Call Recording**
	* Toggle on/off per call
	* Store in Supabase Storage
	* Playback in dashboard
**3** **Voice Selection**
	* Choose from OpenAI voices (alloy, echo, fable, onyx, nova, shimmer)
	* Preview voices before call
**4** **Retry Failed Calls**
	* Automatic retry for "no answer" (1 hour later, then next day)
	* User can manually trigger retry
**5** **Call Templates**
	* Save call objectives as templates
	* Quick-start from template ("Get vendor quote", "Schedule meeting", etc.)

⠀
**🟢 Nice to Have (Post-MVP, Month 4-6)
1** **Batch Upload**
	* CSV import for multiple calls
	* Bulk attestation (one checkbox for entire batch)
	* Progress tracking (10/50 calls completed)
**2** **CRM Integration**
	* Salesforce, HubSpot, Pipedrive
	* Auto-log calls to CRM
	* Pull contact context from CRM before call
**3** **Calendar Integration**
	* Google Calendar, Outlook
	* AI can schedule meetings during call
	* Availability checking
**4** **LegacyAI Ecosystem Integration**
	* CASPER can invoke Call-for-Me as tool
	* Legacy Prime workflows include calling step
	* NeighborlyAI templates for HOA calls
**5** **Advanced Analytics Dashboard**
	* Call success rate trends
	* Cost analytics (spend by week/month)
	* AI performance metrics (goal achievement rate)

⠀
### User Experience (UX) Requirements
**Onboarding Flow
1** **Welcome Screen:** "Make phone calls without picking up the phone"
**2** **Consent:** Check box "I agree to use this for legitimate business purposes only"
**3** **Quick Tour:** 3-step walkthrough (1. Enter call details, 2. AI calls for you, 3. Review transcript)
**4** **First Call Prompt:** "Try your first call for free! Call a business and ask for their hours."

⠀**Dashboard Layout**
### ┌─────────────────────────────────────────────────────────────┐
### │  LegacyAI Call-for-Me    [New Call] [Settings] [User Menu] │
### ├─────────────────────────────────────────────────────────────┤
### │  Recent Calls                                                │
### │  ┌─────────────────────────────────────────────────────────┐│
### │  │ 📞 Acme Corp - Vendor Quote      [Completed] 5 min ago  ││
### │  │ 📞 Building Supply - Inventory   [In Progress] now      ││
### │  │ 📞 Snow Removal Co - Bid Request [Failed] 1 hour ago    ││
### │  └─────────────────────────────────────────────────────────┘│
### │                                                               │
### │  Usage This Month                                            │
### │  ┌────────────────────────────────┐                         │
### │  │ 23 / 100 calls used            │                         │
### │  │ $13.80 spent                   │                         │
### │  │ 77 calls remaining              │                         │
### │  └────────────────────────────────┘                         │
### └─────────────────────────────────────────────────────────────┘
**New Call Flow (Manual Entry)**
### Step 1: Call Type
###   ○ Automated B2B (Lookup business)
###   ● Manual Entry (I have the number)

### Step 2: Contact Details
###   Phone Number: [+1 (___) ___-____]
###   Contact Name (optional): [______]
###   Company (optional): [______]

### Step 3: Call Objective
###   What should the AI accomplish?
###   [Textarea: 500 char limit]

###   Example: "Ask if they have 50 bags of mulch in stock,
###   inquire about pickup vs delivery options and pricing"

### Step 4: Attestation (REQUIRED)
###   ☑ I confirm this call is legitimate
###   ☑ I accept full legal responsibility

###   Sign your name: [______]

### [Cancel] [Schedule Call] [Call Now]

### Non-Functional Requirements
**Performance**
* **API Response Time:** <200ms (95th percentile)
* **Call Initiation Latency:** <5 seconds (from "Call Now" click to Twilio dialing)
* **Audio Latency:** <500ms (round-trip from spoken word to AI response)
* **Dashboard Load Time:** <1 second

⠀**Scalability**
* **Concurrent Calls:** Support 50 simultaneous calls in MVP (scale to 500 in 6 months)
* **Database:** Supabase can handle 10K calls/day (well within limits)
* **WebSocket Server:** Horizontal scaling via load balancer if needed

⠀**Reliability**
* **Uptime:** 99.5% (excluding Twilio/OpenAI outages)
* **Error Rate:** <2% of calls fail due to platform bugs
* **Data Integrity:** Zero data loss (all calls logged, transcripts saved)

⠀**Security**
* **Authentication:** Clerk JWT with expiry, refresh tokens
* **Data Isolation:** Supabase RLS ensures users can't access others' data
* **API Keys:** Stored in environment variables, never exposed to frontend
* **Audit Logs:** All call attestations logged with IP address, timestamp

⠀
### Technical Debt & Future Refactoring
**Known Technical Debt (Acceptable for MVP)
1** **No horizontal scaling for WebSocket server:** Single instance OK for <50 concurrent calls
**2** **Manual database migrations:** Acceptable for MVP, automate later with migration tool
**3** **Limited error handling:** Basic retry logic only, more sophisticated failure modes post-MVP
**4** **No caching layer:** Direct API calls to Twilio/OpenAI/Claude without Redis cache

⠀**Post-MVP Refactoring Priorities
1** **Implement Redis caching** for business directory lookups (avoid repeated Google Places API calls)
**2** **Add observability:** Distributed tracing (OpenTelemetry) to debug latency issues
**3** **Refactor WebSocket server:** Split into microservices (call manager, audio streamer, Claude agent)
**4** **Optimize Claude prompts:** A/B test different system prompts, measure goal achievement rate

⠀
### Risk Assessment & Mitigation
| **Risk** | **Probability** | **Impact** | **Mitigation** |
|:-:|:-:|:-:|:-:|
| **Twilio suspends account for abuse** | Medium | Critical | Robust abuse detection, ban bad actors quickly, responsive support |
| **OpenAI Realtime API performance degrades** | Low | High | Monitor latency, have fallback to standard API, communicate with OpenAI support |
| **Legal complaint (TCPA violation)** | Low | High | Clear ToS, attestation system, log everything, ban violators, consult lawyer |
| **High churn (users try once, leave)** | Medium | Medium | Improve onboarding, offer templates, email drip campaign with tips |
| **Cost overruns (API costs exceed revenue)** | Medium | High | Monitor margins weekly, adjust pricing if needed, optimize Claude usage |
| **Competitor launches similar product** | Medium | Medium | Focus on LegacyAI ecosystem integration as differentiator, move fast |

### Go-to-Market Strategy
**Target Customers (Priority Order)
1** **Solo Consultants & Freelancers** (easiest to reach, fast purchase decision)
**2** **Small Business Owners** (landscaping, HVAC, contractors - high call volume)
**3** **HOA Board Members** (via NeighborlyAI integration)
**4** **B2B Sales Teams** (longer sales cycle, higher LTV)

⠀**Acquisition Channels (MVP)
1** **Product Hunt Launch** (Month 2) - Goal: 500 upvotes, 200 signups
**2** **LinkedIn Content** (Douglas Talley's network) - 3x posts/week, case studies
**3** **Indie Hackers** (Community engagement, build in public)
**4** **Direct Outreach** (Email 50 consultants in network, offer free beta)

⠀**Pricing Strategy (MVP)**
* **Free Tier:** 10 calls/month (get users hooked)
* **Starter:** $49/mo, 100 calls included, $0.60 each additional
* **Professional:** $149/mo, 400 calls included, $0.50 each additional, priority support
* **Enterprise:** Custom pricing, unlimited calls, dedicated account manager

⠀
# Conclusion
This document serves as the single source of truth for the LegacyAI Call-for-Me platform. All development decisions should reference this document. Any changes to scope, features, or architecture must be documented here with version updates.
**Next Steps:**
1 Review this document with full team
2 Secure all API keys and credentials (Week 0)
3 Kick off Phase 1 development (Week 1)
4 Weekly standup to review progress against timeline
5 Launch beta by end of Week 5

⠀**Success Criteria for Launch:**
* ✅ 10 beta testers successfully make 5+ calls each
* ✅ Average voice quality rating >4/5
* ✅ Zero critical bugs in production
* ✅ All MVP features complete
* ✅ Legal docs published (ToS, Privacy Policy)

⠀Let's build this. 🚀
