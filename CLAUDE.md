# CLAUDE.md

**Last Updated:** October 1, 2025 at 22:18:43 EDT
**Project Status:** Phase 1 Complete (100%), Phase 2 In Progress (40%)

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LeadFlip** is a Claude Agent SDK-powered reverse marketplace for local services that combines:

1. **AI-Powered Lead Matching** - Consumers post problems, AI matches them with local businesses
2. **Autonomous Outbound Calling** - AI agents make calls on behalf of businesses to qualify leads
3. **Multi-Agent Orchestration** - Specialized subagents for classification, matching, calling, and follow-up

The platform uses Claude Agent SDK as the core orchestration layer, with subagents handling specialized tasks like lead classification, business matching, AI calling (via OpenAI Realtime API + SignalWire), and response generation.

## Technology Stack

**Frontend:**
- Next.js 15.2.3 (App Router) with React 19
- Tailwind CSS + shadcn/ui components
- React Hook Form + Zod validation
- Three portals: Consumer Portal, Business Portal, Admin Dashboard
- Deployment: Vercel

**Backend:**
- Next.js API Routes with tRPC (serverless functions on Vercel)
- Node.js 20+
- Authentication: Clerk (JWT tokens)

**Database:**
- Supabase (PostgreSQL 15) with Row-Level Security
- Supabase Realtime for live updates (lead status, call status)
- Supabase Storage for call recordings

**AI Orchestration (Claude Agent SDK):**
- Main orchestrator agent coordinates workflow
- Specialized subagents for focused tasks
- Automatic context management and compaction
- CLAUDE.md memory system for learning patterns
- MCP (Model Context Protocol) servers for external integrations
- Event-driven hooks for automation

**Call Infrastructure:**
- BullMQ (Redis-backed job queue via Upstash/Railway)
- Standalone WebSocket server (Railway/Fly.io for persistent connections)
- SignalWire for PSTN calls and SMS (Twilio-compatible, more cost-effective)
- OpenAI Realtime API for voice I/O
- Claude handles reasoning and decision-making during calls

**Notification System:**
- SendGrid for email notifications
- SignalWire for SMS notifications
- Mailgun as backup email provider

**Key Architecture Constraint:** WebSocket server MUST run on persistent infrastructure (Railway/Fly.io), NOT serverless platforms like Vercel.

## LeadFlip Agent Architecture

### Main Orchestrator Agent

**Purpose:** Coordinates the entire lead lifecycle from submission to conversion

**Responsibilities:**
1. Receive consumer problem submissions
2. Invoke Lead Classifier subagent
3. Score lead quality (0-10 scale)
4. Invoke Business Matcher subagent
5. Generate notification content via Response Generator subagent
6. Optionally invoke Call Agent subagent for follow-up calls
7. Track conversions and update CLAUDE.md memory

**System Prompt Location:** `./.claude/main-orchestrator.md`

**Allowed Tools:**
- Read/Write (database operations via MCP)
- Bash (trigger notifications, queue jobs)
- WebFetch (verify business info)
- All MCP tools (database, SignalWire, Slack)

### Subagent 1: Lead Classifier

**Purpose:** NLP classification of consumer problems into structured data

**Input:** Raw consumer text (e.g., "My water heater is leaking, need someone ASAP in Carmel 46032, budget $500 max")

**Output:** Structured JSON:
```json
{
  "service_category": "plumbing",
  "urgency": "emergency",
  "budget_min": 0,
  "budget_max": 500,
  "location_zip": "46032",
  "key_requirements": ["water heater", "leak repair"],
  "sentiment": "negative",
  "quality_score": 8.5
}
```

**System Prompt Location:** `./.claude/agents/lead-classifier.md`

**Max Turns:** 1 (single-turn classification for speed)

### Subagent 2: Business Matcher

**Purpose:** Intelligent matching beyond simple proximity queries

**Matching Criteria:**
1. Geographic proximity (<10 miles priority)
2. Service category match (exact or related)
3. Business rating (prefer 4+ stars)
4. Historical response rate (prefer >70%)
5. Current capacity (check if paused notifications)
6. Pricing tier match (budget alignment)
7. Special requirements (e.g., "pet-friendly", "licensed plumber")

**Output:** Ranked list of top 10 matches with confidence scores

**System Prompt Location:** `./.claude/agents/business-matcher.md`

**Custom MCP Tools:**
- `query_businesses` - PostgreSQL with PostGIS distance calculations
- `check_business_capacity` - Recent response history analysis

### Subagent 3: Response Generator

**Purpose:** Create personalized notification messages for matched businesses

**Input:**
- Consumer's problem description
- Business profile (name, rating, years in business, services)

**Output:** Professional 3-sentence response template (50-100 words)

**System Prompt Location:** `./.claude/agents/response-generator.md`

**Hook Integration:** Automatically triggered after business matching via `afterToolUse` hook

### Subagent 4: Call Agent

**Purpose:** Make autonomous outbound calls to qualify leads or reach consumers

**Use Cases:**
1. Business wants AI to call consumer to qualify need
2. Consumer requests callback from matched business
3. Follow-up call to confirm appointment/quote acceptance

**Call Flow:**
1. Receive call objective from orchestrator
2. Queue call job in BullMQ
3. Call Session Worker establishes SignalWire → OpenAI WebSocket bridge
4. Claude provides real-time reasoning during conversation
5. Generate call summary and transcript
6. Update lead status based on outcome

**System Prompt Location:** `./.claude/agents/call-agent.md`

**Integration Points:**
- BullMQ for job queuing
- WebSocket server for audio streaming
- SignalWire for telephony
- OpenAI Realtime API for voice
- Claude API for reasoning

### Subagent 5: Audit Agent

**Purpose:** Weekly analysis of platform performance and optimization recommendations

**Schedule:** Runs via cron hook every Sunday at 2am

**Tasks:**
1. Analyze low-converting leads (<5/10 quality score)
2. Identify spam patterns
3. Evaluate business response rates
4. Generate recommendations for intake form improvements
5. Update CLAUDE.md memory with new patterns

**System Prompt Location:** `./.claude/agents/audit-agent.md`

**Output:** Markdown report saved to `./reports/lead-audit-{date}.md`

## Key Development Commands

```bash
# Install dependencies (including Claude Agent SDK)
npm install

# Setup environment variables
cp .env.example .env.local

# Run database migrations (Supabase)
supabase migration up

# Start development server (Next.js frontend + API)
npm run dev

# Start WebSocket server (separate process for call handling)
npm run websocket-server

# Start BullMQ worker (call queue processor)
npm run worker

# Run agent tests
npm run test:agents

# Test lead classification flow
npm run test:lead-flow

# Test notification system
npm run test:notifications

# Send test SMS/email
npm run test:notifications:send

# Run audit agent manually
npm run audit

# Build for production
npm run build
```

## Architecture Principles

### Complete LeadFlip Flow

```
Consumer Submission
        ↓
Main Orchestrator Agent
        ↓
┌───────┴────────────────────────────┐
│                                    │
│  1. Lead Classifier Subagent       │
│     → Structured JSON output       │
│                                    │
│  2. Business Matcher Subagent      │
│     → Ranked list of matches       │
│                                    │
│  3. Response Generator Subagent    │
│     → Personalized messages        │
│                                    │
│  4. Notification via SendGrid/SMS  │
│     → Email/SMS to businesses      │
│                                    │
└────────────────────────────────────┘
        ↓
Business Opts In (or requests AI call)
        ↓
Call Agent Subagent
        ↓
Queue Job in BullMQ
        ↓
Call Session Worker
        ↓
SignalWire → WebSocket Server → OpenAI Realtime API
                  ↓
          Claude API (reasoning)
                  ↓
Transcript + Summary saved
        ↓
Lead status updated → Business/Consumer notified
```

### Database Schema Pattern

**Core Tables:**
- `users` - Synced from Clerk (consumers + businesses + admins)
- `leads` - Consumer problems with classified data (JSONB)
- `businesses` - Business profiles with PostGIS location
- `matches` - Lead-to-business matches with confidence scores
- `calls` - AI call records with transcripts
- `conversions` - Closed deals for learning/analytics

**Row-Level Security (RLS):**
- Consumers see only their own leads
- Businesses see only matched leads + their profile
- Admins have full access
- Call recordings restricted to authorized parties

### Subagent Orchestration Pattern

**Single Responsibility:**
- Each subagent does ONE thing exceptionally well
- Orchestrator coordinates, never duplicates subagent logic
- Max turns configured per subagent (1 for classifier, 5 for call agent)

**Context Isolation:**
- Subagents receive minimal context (only what they need)
- Reduces token usage and improves focus
- Orchestrator maintains full context via CLAUDE.md memory

**Parallel Execution:**
- Independent subagents can run concurrently
- Example: Response Generator can run while Call Agent queues job

### Memory-Driven Optimization

**CLAUDE.md Learning System:**
```markdown
# LeadFlip Platform Memory

## Historical Conversion Patterns (Last 30 Days)
- Emergency plumbing leads: 85% conversion, avg $450 job value
- Lawn care leads (summer): 95% response rate
- Lawn care leads (winter): 30% response rate → reduce matching threshold
- Leads with phone + email: 85% response vs 45% email-only

## Business Performance
- "ABC Plumbing": 100% response to emergency leads within 15 min
- "XYZ Lawn Care": Ignores leads <$100 → filter out low-budget matches

## Seasonal Adjustments
- Jun-Aug: Boost lawn care/landscaping by +2 quality points
- Dec-Feb: Reduce lawn care matching, boost snow removal/HVAC
- Apr-May: Peak home improvement season, increase match radius

## Spam Patterns Detected
- Keywords: "test", "asap cheap", "free quote" → auto-flag
- Phone numbers with repeated digits (555-5555) → reject
- Submissions <10 words → request clarification
```

This memory is automatically read by all agents and influences scoring/matching in real-time.

### Hook-Based Automation

**Event Hooks (./.claude/settings.json):**
```json
{
  "hooks": {
    "afterToolUse": {
      "match_business": "generate_response_template",
      "classify_lead": "calculate_quality_score"
    },
    "onSchedule": {
      "cron": "0 2 * * 0",
      "command": "run_lead_quality_audit"
    },
    "beforeToolUse": {
      "send_notification": "check_business_capacity"
    }
  }
}
```

**Hook Use Cases:**
- Auto-generate response after matching
- Weekly audit reports every Sunday 2am
- Pre-flight checks before sending notifications
- Real-time alerts for high-value leads

## API Endpoints (tRPC)

### Consumer Endpoints
- `lead.submit` - Submit consumer problem (triggers orchestrator)
- `lead.getById` - Get lead details + match status
- `lead.getMatches` - Get matched businesses for a lead
- `lead.requestCallback` - Request AI call from business

### Business Endpoints
- `business.register` - Create business profile
- `business.getLeads` - Get matched leads (filtered by subscription tier)
- `business.respondToLead` - Accept/decline lead
- `business.requestAICall` - Request AI to call consumer on their behalf
- `business.updateCapacity` - Pause/resume lead notifications

### Call Endpoints
- `call.initiate` - Queue AI call (via Call Agent subagent)
- `call.getById` - Get call details + transcript
- `call.getRecording` - Get audio file (authorized users only)
- `call.listByLead` - Get all calls related to a lead

### Admin Endpoints
- `admin.getAuditReports` - List generated audit reports
- `admin.flagLead` - Manually flag spam/low-quality lead
- `admin.updateMemory` - Manually update CLAUDE.md patterns

## Critical Implementation Notes

### Main Orchestrator Invocation Pattern

```typescript
import { ClaudeSDKClient, ClaudeAgentOptions } from '@anthropic-ai/claude-agent-sdk';

// Initialize main orchestrator with MCP servers
const orchestratorOptions: ClaudeAgentOptions = {
  systemPromptFile: './.claude/main-orchestrator.md',
  allowedTools: ['Read', 'Write', 'Bash', 'WebFetch'],
  mcpServers: {
    database: createPostgresServer(process.env.DATABASE_URL),
    signalwire: createSignalWireServer(process.env.SIGNALWIRE_API_TOKEN),
    slack: createSlackServer(process.env.SLACK_BOT_TOKEN)
  },
  maxTurns: 20
};

const client = new ClaudeSDKClient(orchestratorOptions);

// Submit consumer lead
await client.query(`
  New consumer lead submitted:
  "${rawProblemText}"

  Please:
  1. Classify this lead using the Lead Classifier subagent
  2. Score quality (0-10)
  3. Find matching businesses using Business Matcher subagent
  4. Generate notification messages using Response Generator subagent
  5. Send notifications via MCP
`);

for await (const response of client.receiveResponse()) {
  console.log(response.content[0].text);
  // Handle real-time updates
}
```

### Subagent Invocation Pattern

```typescript
import { ClaudeSDKClient, ClaudeAgentOptions } from '@anthropic-ai/claude-agent-sdk';

// Launch Lead Classifier subagent
const classifierOptions: ClaudeAgentOptions = {
  systemPromptFile: './.claude/agents/lead-classifier.md',
  allowedTools: ['Read'],
  maxTurns: 1 // Single-turn classification
};

const classifier = new ClaudeSDKClient(classifierOptions);
await classifier.query(`Classify this lead: ${rawProblemText}`);

for await (const response of classifier.receiveResponse()) {
  const structuredLead = JSON.parse(response.content[0].text);
  console.log('Classified lead:', structuredLead);
}
```

### Call Session Worker Logic

The Call Session Worker handles real-time voice interactions:

1. **Consume job** from BullMQ queue (`initiate-call`)
2. **Fetch call details** from Supabase (lead info, business info, call objective)
3. **Update status** to `in_progress`
4. **Initiate SignalWire call** with Media Streams enabled
5. **Establish WebSocket** to OpenAI Realtime API
6. **Send session config** with system prompt + voice (alloy/echo/fable)
7. **Stream audio bidirectionally**: SignalWire ↔ OpenAI
8. **Monitor responses** for reasoning triggers (e.g., "I need to check availability")
9. **Invoke Call Agent subagent** via Claude API for complex decisions
10. **Save transcript incrementally** to Supabase (real-time updates)
11. **Generate summary** with Call Agent on call end
12. **Upload recording** to Supabase Storage (if enabled)
13. **Update call record** with status, duration, outcome, costs

**Call Outcomes:**
- `goal_achieved` - Consumer/business agreed to next step
- `no_answer` - No one picked up (retry later)
- `voicemail` - Left message (mark for follow-up)
- `declined` - Consumer/business not interested
- `error` - Technical failure (retry once)

### MCP Server Setup

```typescript
// server/mcp-servers.ts
import { createPostgresServer } from '@mcp/postgres';
import { createSignalWireServer } from '@mcp/signalwire';
import { createSlackServer } from '@mcp/slack';

export const mcpServers = {
  database: createPostgresServer({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  }),

  signalwire: createSignalWireServer({
    projectId: process.env.SIGNALWIRE_PROJECT_ID,
    apiToken: process.env.SIGNALWIRE_API_TOKEN,
    spaceUrl: process.env.SIGNALWIRE_SPACE_URL,
    fromNumber: process.env.SIGNALWIRE_PHONE_NUMBER
  }),

  slack: createSlackServer({
    botToken: process.env.SLACK_BOT_TOKEN
  })
};

// Available MCP tools:
// - mcp__database__query (run SQL queries)
// - mcp__database__insert (insert records)
// - mcp__signalwire__send_sms (send text message)
// - mcp__signalwire__make_call (initiate voice call)
// - mcp__slack__post_message (post to channel)
```

## Security & Compliance

### Lead Quality & Anti-Spam

**Consumer Submission:**
- CAPTCHA required (Cloudflare Turnstile)
- Rate limiting: 5 submissions per hour per IP
- Spam keyword detection (auto-flag for review)
- Minimum 10 words required in problem description
- Phone number validation (E.164 format)

**Audit Agent Monitoring:**
- Weekly analysis of low-quality leads
- Spam pattern detection (keywords, repeated submissions)
- IP blocking for persistent spam
- Business response rate tracking (flag low performers)

### AI Call Compliance

**Legal Requirements:**
- Business must have explicit consumer consent before AI calls
- All calls recorded (two-party consent states require notification)
- Clear identification: "I'm an AI assistant calling on behalf of [Business Name]"
- Consumer can request human callback at any time
- DNC (Do Not Call) registry checking (via external service)

**Audit Trail:**
- Log: who initiated call, when, for what lead
- Store: full transcript, recording, call outcome
- Track: consent timestamp, business ID, consumer ID
- Retention: 2 years minimum for legal compliance

### Row-Level Security (RLS)

**Consumers:**
```sql
-- Consumers see only their own leads
CREATE POLICY "consumers_own_leads" ON leads
  FOR SELECT USING (auth.uid() = user_id);

-- Consumers can create their own leads
CREATE POLICY "consumers_create_leads" ON leads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
```

**Businesses:**
```sql
-- Businesses see only matched leads
CREATE POLICY "businesses_view_matches" ON leads
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM matches
      WHERE matches.lead_id = leads.id
        AND matches.business_id = auth.uid()
        AND matches.status = 'active'
    )
  );

-- Businesses can update match status only
CREATE POLICY "businesses_update_matches" ON matches
  FOR UPDATE USING (auth.uid() = business_id);
```

**Admins:**
```sql
-- Admins have full access
CREATE POLICY "admins_full_access" ON leads
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE users.id = auth.uid()
        AND users.role = 'admin'
    )
  );
```

### Data Privacy

**PII Protection:**
- Phone numbers encrypted at rest (Supabase encryption)
- Call recordings stored in private S3 bucket (signed URLs only)
- Consumer email never shared with businesses (only platform contact)
- GDPR-compliant data deletion (30-day grace period)

**Business Data:**
- Business phone numbers never exposed to consumers
- Response rates visible only to admins
- Aggregate analytics only (no individual lead details)

## Common Blockers & Solutions

### WebSocket Server Issues

**Blocker: Connections timeout or server crashes**
- Symptom: WebSocket connections drop after 30 seconds, server crashes under load
- Root Cause: Deployed on serverless platform (Vercel) instead of persistent server
- Solution: Deploy on Railway/Fly.io/Render with 24/7 uptime. Use `PM2` or `systemd` for auto-restart.

**Testing:**
```bash
# Test WebSocket connection
wscat -c wss://your-websocket-server.com

# Send test audio packet
{"event": "media", "media": {"payload": "..."}}
```

### Audio Quality/Latency

**Blocker: >1 second delay, robotic voice**
- Symptom: Audio cuts in/out, echo, feedback
- Root Cause: Geographic distance or buffer size issues
- Solution:
  1. Deploy WebSocket server in `us-east-1` (close to SignalWire + OpenAI)
  2. Reduce audio buffer to 20ms chunks
  3. Use dedicated server (not shared Hobby tier)
  4. Profile with `console.time()` for slow processing

**Target Metrics:**
- SignalWire → WebSocket: <50ms
- WebSocket → OpenAI: <100ms
- OpenAI response: <200ms
- Total round-trip: <500ms

### Clerk JWT ↔ Supabase Integration

**Blocker: `auth.uid()` returns null in RLS policies**
- Symptom: Database queries return empty results, RLS blocking legitimate access
- Root Cause: JWT signing secret mismatch or `sub` claim format issue
- Solution:
  1. Verify Clerk JWT template includes `sub` field (user ID)
  2. Copy JWT secret from Clerk → paste into Supabase project settings
  3. Decode token with `jwt.io` to verify structure
  4. Test with `curl` to isolate frontend vs backend issue

**Test query:**
```sql
-- Run in Supabase SQL editor
SELECT auth.uid(); -- Should return user ID, not NULL
```

### Claude Agent SDK Token Limits

**Blocker: Context too large, agent loses track**
- Symptom: Agent forgets earlier context, repeats actions
- Solution: Agent SDK handles automatic compaction. For long tasks (>30 hours), enable checkpointing:
```typescript
const options: ClaudeAgentOptions = {
  checkpointDir: './checkpoints/orchestrator',
  maxTurns: 100
};
```

### MCP Server Configuration

**Blocker: MCP tools not available to agent**
- Symptom: Agent says "I don't have access to database tool"
- Solution:
  1. Verify MCP server is initialized in `mcpServers` config
  2. Check `allowedTools` includes MCP tool names (e.g., `mcp__database__query`)
  3. Test each MCP tool independently before agent integration
  4. Check environment variables for API keys

**Debug MCP tools:**
```typescript
// Test MCP tool directly
const result = await mcpServers.database.query({
  query: 'SELECT * FROM leads LIMIT 1'
});
console.log(result);
```

## Cost Management

### Per-Call Economics

**AI Call Costs (avg 3-minute call):**
- SignalWire: $0.0095/min × 3 = $0.0285 (~32% cheaper than Twilio)
- OpenAI Realtime: ($0.06 input + $0.24 output)/min × 3 = $0.90
- Claude reasoning: ~$0.03 (4-5 reasoning calls per conversation)
- **Total per call: ~$0.965** (vs $0.97 with Twilio)

**SMS Costs:**
- SignalWire: $0.0079/message (~21% cheaper than Twilio)
- Average 3 SMS per lead (notification + follow-ups)
- **Total per lead: ~$0.024**

**Business Pricing Model:**
- Free tier: No AI calls (text notifications only)
- Starter ($49/mo): 20 AI calls included ($2.45/call above)
- Professional ($149/mo): 100 AI calls included ($1.50/call above)
- Enterprise (custom): Unlimited calls, volume discounts

**Margin Analysis:**
- Professional tier: $149 - (100 × $0.965) = $52.50 gross profit (35% margin)
- Additional calls: $1.50 - $0.965 = $0.535 profit per call (36% margin)

### Claude Agent SDK Cost Optimizations

**Prompt Caching (90% reduction):**
```typescript
// System prompts are automatically cached by Agent SDK
// Repeated lead classifications reuse cached prompt
// Cost: $0.30/1M tokens → $0.03/1M tokens (cached)

const classifierOptions: ClaudeAgentOptions = {
  systemPromptFile: './.claude/agents/lead-classifier.md',
  // Prompt is cached automatically after first use
};
```

**Context Compaction:**
- Long orchestrator sessions (50+ leads) don't hit token limits
- Agent SDK automatically compacts old context
- Maintains only relevant information
- **Savings: 60-80%** on long-running tasks vs. manual context management

**Subagent Isolation:**
- Each subagent has minimal context (only what it needs)
- Classifier sees just raw text, not full lead history
- Matcher sees structured lead + business pool, not transcripts
- **Savings: 50%** vs. monolithic prompt with all context

**Expected Total Savings:**
- Direct API calls (no SDK): ~$0.15 per lead classification
- With Agent SDK optimizations: ~$0.03 per lead classification
- **82% cost reduction**

## Testing Strategy

### Manual Testing Checklist

**Lead Submission:**
- [ ] Submit lead with all fields → verify classification accuracy
- [ ] Submit vague lead (<10 words) → verify rejection
- [ ] Submit spam keywords → verify auto-flag
- [ ] Submit valid lead → verify 3+ business matches

**Business Matching:**
- [ ] Verify proximity sorting (closest businesses first)
- [ ] Verify rating filter (4+ stars prioritized)
- [ ] Verify capacity check (paused businesses excluded)

**AI Call Quality:**
- [ ] Place test call to your phone → verify voice quality (<500ms latency)
- [ ] Test interruption handling (talk over AI) → verify graceful recovery
- [ ] Test "I want human callback" → verify call ends, flag set
- [ ] Test voicemail detection → verify message left, retry scheduled

**Notifications:**
- [ ] Test SMS sending → verify delivery via SignalWire
- [ ] Test email sending → verify delivery via SendGrid
- [ ] Test template rendering → verify personalization works

**Security:**
- [ ] Login as Consumer → verify can't see other consumers' leads
- [ ] Login as Business → verify can only see matched leads
- [ ] Attempt SQL injection → verify parameterized queries prevent

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4) ✅ COMPLETE
- ✅ Setup Next.js + TypeScript + Tailwind
- ✅ Configure Clerk authentication + Supabase
- ✅ Create database schema with RLS policies
- ✅ Install Claude Agent SDK, create project structure
- ✅ Configure SignalWire for calls and SMS
- ✅ Implement notification system (SendGrid + SignalWire)
- ✅ Build basic UI (Consumer/Business/Admin portals)
- ✅ Fix all build errors (server/client boundary violations)
- ✅ Create comprehensive test suite (25+ auth tests passing)
- ✅ Prepare deployment infrastructure (Docker, scripts, configs)

### Phase 2: Agent Architecture (Weeks 5-8) 🚧 IN PROGRESS (40%)
- ✅ Build Main Orchestrator agent
- ✅ Create Lead Classifier subagent
- ✅ Create Business Matcher subagent
- ✅ Create Response Generator subagent
- ⚠️ Implement MCP servers (Postgres, SignalWire) - Partial
- ⚠️ Test end-to-end lead flow (no calls yet) - Framework ready, needs database migration

### Phase 3: Call Integration (Weeks 9-12) 🚧 PARTIAL (60%)
- ✅ Build Call Agent subagent
- ✅ Setup BullMQ queue + Redis
- ✅ Build WebSocket server (SignalWire ↔ OpenAI bridge)
- ✅ Integrate Claude reasoning during calls
- ⚠️ Deploy WebSocket server to Railway/Fly.io - Ready, awaiting deployment
- [ ] Test call flow with real phone numbers - Blocked by deployment

### Phase 4: Learning & Optimization (Weeks 13-16)
- [ ] Create CLAUDE.md memory system
- [ ] Implement Audit Agent (weekly reports)
- [ ] Add hook automation (notifications, audits)
- [ ] Test memory learning with 100+ leads
- [ ] Optimize system prompts based on real data

### Phase 5: Beta Launch (Weeks 17-20)
- [ ] Recruit 10 businesses + 50 consumers
- [ ] Monitor first 100 leads + 20 AI calls
- [ ] Collect feedback, iterate on UX
- [ ] Fix bugs, optimize costs
- [ ] Public launch

## Current Project Status

**Last Updated:** October 1, 2025 at 10:18 PM EDT

### ✅ Phase 1 Complete (100%)

**Infrastructure:**
- Git repository: https://github.com/CaptainPhantasy/LeadFlip
- Next.js 15.2.3 project structure with TypeScript
- Tailwind CSS + shadcn/ui components
- All core dependencies installed

**Services Configured:**
- ✅ SignalWire - Voice + SMS (Project ID: 2f9ce47f-c556-4cf2-803c-2b1525b35b34, Phone: +18888915040)
- ✅ Anthropic Claude API - Pro Max subscription
- ✅ OpenAI API - Realtime API access enabled
- ✅ Supabase - Database project (https://plmnuogbbkgsatfmkyxm.supabase.co)
- ✅ Clerk Authentication - Test environment (grateful-dragon-13.clerk.accounts.dev)
- ✅ Upstash Redis - BullMQ queue (vocal-polliwog-15926.upstash.io)
- ✅ SendGrid - Email notifications configured

**Authentication:**
- Clerk middleware configured
- Protected routes: `/consumer/*`, `/business/*`, `/admin/*`, `/api/trpc/*`
- Public routes: `/`, `/sign-in`, `/sign-up`, `/api/webhooks/*`

**Database:**
- ✅ Schema migrations consolidated (`20251001000002_consolidated_schema_final.sql`)
- ⚠️ Migration prepared but NOT YET APPLIED to Supabase
- ✅ PostGIS enabled for geographic matching (in migration)
- ✅ Row-Level Security (RLS) policies defined (disabled pending Clerk JWT setup)
- ✅ Service role key configured for bypassing RLS in workers
- ✅ Verification and CRUD test scripts ready

**Notification System:**
- ✅ SendGrid email client implemented
- ✅ SignalWire SMS client implemented
- ✅ Mailgun backup email client implemented
- ✅ Email templates for lead notifications
- ✅ SMS templates for lead notifications
- ⚠️ Tested in isolation, needs end-to-end delivery verification

**Call Infrastructure:**
- ✅ WebSocket server code completed (`src/server/websocket-server.ts`)
- ✅ Call worker implemented (`src/server/workers/call-worker.ts`)
- ✅ BullMQ queue configuration ready
- ✅ SignalWire integration complete
- ✅ Docker configurations created (Dockerfile.websocket, Dockerfile.worker)
- ✅ Deployment scripts ready (Railway and Fly.io)
- ⚠️ NOT YET deployed to Railway/Fly.io (ready to deploy)

### 🚧 Phase 2 In Progress (40%)

**Completed:**
- ✅ `.claude/` directory structure created
- ✅ Agent system prompts written
- ✅ Main Orchestrator agent implemented
- ✅ Lead Classifier subagent implemented
- ✅ Business Matcher subagent implemented
- ✅ Response Generator subagent implemented
- ✅ Call Agent subagent implemented
- ✅ Audit Agent system prompt created
- ✅ tRPC routers implemented (lead, business, admin, call, interview, discovery)
- ✅ UI components for Consumer/Business/Admin portals built
- ✅ Authentication system fully tested (25 tests passing)
- ✅ Orchestrator flow test framework created

**In Progress:**
- ⚠️ MCP servers partially configured (needs testing with live APIs)
- ⚠️ Database migration prepared, awaiting execution
- ⚠️ End-to-end lead flow framework ready, needs live testing

### ✅ PREVIOUSLY CRITICAL BLOCKERS - NOW RESOLVED

#### ~~Blocker #1: Build Failure~~ - FIXED ✅
**Status:** RESOLVED on October 1, 2025, 8:35 PM EDT
**Fix Applied:** Created tRPC endpoints for admin operations, removed direct server imports from client components
**Agent:** Build Fix Agent (Track 1)
**Verification:** `npm run build` passes successfully
**Report:** `/Volumes/Storage/Development/LeadFlip/BUILD_FIX_AGENT_COMPLETION_REPORT.md`

#### ~~Blocker #2: Database Migrations~~ - PREPARED ✅
**Status:** CONSOLIDATED on October 1, 2025, 9:25 PM EDT
**Fix Applied:** Created consolidated migration `20251001000002_consolidated_schema_final.sql`
**Agent:** Database Migration Agent (Track 2)
**Next Step:** Execute migration in Supabase dashboard (15 minutes)
**Report:** `/Volumes/Storage/Development/LeadFlip/DATABASE_MIGRATION_AGENT_COMPLETION.md`

#### ~~Issue #1: Zero Test Coverage~~ - FIXED ✅
**Status:** RESOLVED on October 1, 2025, 9:00 PM EDT
**Tests Created:** 9 test files, 25+ auth tests passing, integration framework established
**Agent:** Testing Agent (Track 3)
**Coverage:** 35% and growing
**Report:** `/Volumes/Storage/Development/LeadFlip/TESTING_AGENT_COMPLETION_REPORT.md`

### ⚠️ REMAINING DEPLOYMENT TASKS (NON-BLOCKING)

#### Task #1: Execute Database Migration (15 minutes)
**Impact:** Database operations currently unavailable until migration applied
**Priority:** HIGH (required for end-to-end testing)
**Status:** Migration file ready, awaiting execution
**Action Required:**
1. Access Supabase Dashboard: https://plmnuogbbkgsatfmkyxm.supabase.co
2. Open SQL Editor
3. Run `supabase/migrations/20251001000002_consolidated_schema_final.sql`
4. Verify with `scripts/check-migration-status.sql`
5. Test with `scripts/test-schema-crud.sql`

#### Task #2: Deploy WebSocket Server (30 minutes)
**Impact:** AI calling system unavailable until deployed
**Priority:** MEDIUM (required for Phase 3 testing)
**Status:** Code complete, deployment configs ready
**Action Required:**
1. Choose platform: Railway (easier) or Fly.io (more control)
2. Run deployment script: `npm run deploy:websocket:railway` or `npm run deploy:websocket:fly`
3. Copy WebSocket URL to `.env.local`
4. Test connection: `npm run test:websocket`
**Report:** `/Volumes/Storage/Development/LeadFlip/WEBSOCKET_DEPLOYMENT_AGENT_COMPLETION_REPORT.md`

#### Task #3: End-to-End Testing (4 hours)
**Impact:** Platform functionality not verified with real-world flows
**Priority:** HIGH (required before beta launch)
**Status:** Test framework ready, awaiting database migration and WebSocket deployment
**Action Required:**
1. Complete Tasks #1 and #2 above
2. Run full test suite: `npm run test:integration`
3. Test real lead submission via UI
4. Verify AI agent execution
5. Test notification delivery (email + SMS)
6. Test AI call flow (if WebSocket deployed)

### 📊 Testing Status

**Current Coverage:** 35% (growing)
**Tests Written:** 9 test files with 25+ passing tests
**Integration Tests:** ✅ Framework established
**E2E Tests:** ⚠️ Awaiting deployment

**Test Files Created:**
- ✅ `tests/integration/auth.test.ts` - 25 tests passing (100% success)
- ✅ `tests/integration/orchestrator-flow.test.ts` - 8 test suites
- ✅ `tests/integration/lead-flow.test.ts` - End-to-end framework
- ✅ `tests/integration/notification-flow.test.ts` - Notification tests
- ✅ `tests/integration/ai-call-queueing.test.ts` - Call queue tests
- ✅ `tests/integration/business-registration-flow.test.ts` - Business flow
- ✅ `tests/integration/call-flow.test.ts` - Full call integration
- ✅ `tests/agents/lead-classifier.test.ts` - Unit test framework
- ✅ `tests/api-endpoints.test.ts` - API endpoint tests

**Testing Report:** See `TESTING_REPORT.md` for detailed coverage analysis

### 🎯 Next Steps (Priority Order)

1. ~~**FIX BUILD BLOCKER**~~ - ✅ COMPLETE (Oct 1, 8:35 PM)
2. ~~**CREATE BASIC TESTS**~~ - ✅ COMPLETE (Oct 1, 9:00 PM)
3. **APPLY DATABASE MIGRATION** - Run consolidated migration (15 min)
4. **DEPLOY WEBSOCKET SERVER** - Railway/Fly.io deployment (30 min)
5. **DEPLOY BULLMQ WORKER** - Same platform as WebSocket (30 min)
6. **END-TO-END TESTING** - Verify complete user flows (4 hours)

**Total time to functional platform: ~6 hours of focused work**

### 💾 Environment Configuration

See `.env.example` for required environment variables. Key services:
- SignalWire for calls/SMS (migrated from Twilio on Oct 1, 2025)
- SendGrid for emails
- Supabase for database
- Clerk for authentication
- Upstash Redis for job queue
- OpenAI for voice AI
- Anthropic Claude for reasoning

### 📚 Additional Documentation

**Setup & Deployment:**
- `README.md` - Project overview and quick start guide
- `DEPLOYMENT.md` - Production deployment instructions
- `WEBSOCKET_DEPLOYMENT_GUIDE.md` - Step-by-step WebSocket deployment
- `WEBSOCKET_QUICK_DEPLOY.md` - Quick deployment reference
- `MIGRATION_QUICK_START.md` - Database migration guide

**Status & Testing:**
- `PLATFORM_STATUS_REPORT.md` - Comprehensive current state assessment
- `TESTING_REPORT.md` - Test coverage and results (coming soon)
- `END_TO_END_TESTING_REPORT.md` - Initial audit findings
- `CODEBASE_INSPECTION_REPORT.md` - Detailed code analysis

**Implementation Details:**
- `SIGNALWIRE_MIGRATION_GUIDE.md` - Twilio to SignalWire migration
- `NOTIFICATION_SYSTEM_IMPLEMENTATION.md` - Email/SMS system details
- `DATABASE_MIGRATION_STATUS.md` - Schema evolution and fixes

**Completion Reports:**
- `BUILD_FIX_AGENT_COMPLETION_REPORT.md` - Build blocker resolution
- `DATABASE_MIGRATION_AGENT_COMPLETION.md` - Migration consolidation
- `TESTING_AGENT_COMPLETION_REPORT.md` - Test suite creation
- `WEBSOCKET_DEPLOYMENT_AGENT_COMPLETION_REPORT.md` - Deployment prep
- `TRACK_*_COMPLETION_REPORT.md` - Various parallel track completions

---

**Project Owner:** Douglas Talley ([@CaptainPhantasy](https://github.com/CaptainPhantasy))
**License:** Proprietary - All rights reserved
