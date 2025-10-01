# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**LeadFlip** is a Claude Agent SDK-powered reverse marketplace for local services that combines:

1. **AI-Powered Lead Matching** - Consumers post problems, AI matches them with local businesses
2. **Autonomous Outbound Calling** - AI agents make calls on behalf of businesses to qualify leads
3. **Multi-Agent Orchestration** - Specialized subagents for classification, matching, calling, and follow-up

The platform uses Claude Agent SDK as the core orchestration layer, with subagents handling specialized tasks like lead classification, business matching, AI calling (via OpenAI Realtime API + Twilio), and response generation.

## Technology Stack

**Frontend:**
- Next.js 14 (App Router) with React 18
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
- Twilio Programmable Voice for PSTN calls
- OpenAI Realtime API for voice I/O
- Claude handles reasoning and decision-making during calls

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
- All MCP tools (database, Twilio, Slack)

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
3. Call Session Worker establishes Twilio → OpenAI WebSocket bridge
4. Claude provides real-time reasoning during conversation
5. Generate call summary and transcript
6. Update lead status based on outcome

**System Prompt Location:** `./.claude/agents/call-agent.md`

**Integration Points:**
- BullMQ for job queuing
- WebSocket server for audio streaming
- Twilio for telephony
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

# Test call flow
npm run test:call-flow

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
│  4. Notification via MCP           │
│     → SMS/Email/Slack to businesses│
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
Twilio → WebSocket Server → OpenAI Realtime API
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
    twilio: createTwilioServer(process.env.TWILIO_API_KEY),
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
4. **Initiate Twilio call** with Media Streams enabled
5. **Establish WebSocket** to OpenAI Realtime API
6. **Send session config** with system prompt + voice (alloy/echo/fable)
7. **Stream audio bidirectionally**: Twilio ↔ OpenAI
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
import { createTwilioServer } from '@mcp/twilio';
import { createSlackServer } from '@mcp/slack';

export const mcpServers = {
  database: createPostgresServer({
    connectionString: process.env.DATABASE_URL,
    ssl: true
  }),

  twilio: createTwilioServer({
    accountSid: process.env.TWILIO_ACCOUNT_SID,
    authToken: process.env.TWILIO_AUTH_TOKEN,
    fromNumber: process.env.TWILIO_PHONE_NUMBER
  }),

  slack: createSlackServer({
    botToken: process.env.SLACK_BOT_TOKEN
  })
};

// Available MCP tools:
// - mcp__database__query (run SQL queries)
// - mcp__database__insert (insert records)
// - mcp__twilio__send_sms (send text message)
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
  1. Deploy WebSocket server in `us-east-1` (close to Twilio + OpenAI)
  2. Reduce audio buffer to 20ms chunks
  3. Use dedicated server (not shared Hobby tier)
  4. Profile with `console.time()` for slow processing

**Target Metrics:**
- Twilio → WebSocket: <50ms
- WebSocket → OpenAI: <100ms
- OpenAI response: <200ms
- Total round-trip: <500ms

### Twilio A2P Registration

**Blocker: Cannot place calls to unverified numbers**
- Symptom: "Unverified callee" error from Twilio
- Root Cause: A2P (Application-to-Person) registration pending
- Solution:
  1. Submit A2P registration **on Day 1** (takes 1-2 weeks)
  2. During wait: use Twilio trial with verified numbers for testing
  3. Contact Twilio support after 3 days if stuck on "Pending"
  4. Backup: Use Vonage/Plivo if Twilio rejects

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

### Subagent Not Responding

**Blocker: Subagent hangs or returns incomplete response**
- Symptom: `receiveResponse()` never completes, agent stuck
- Root Cause: System prompt unclear or conflicting tool permissions
- Solution:
  1. Review subagent system prompt (must be specific, actionable)
  2. Check `max_turns` is appropriate (1 for classifier, 5+ for complex tasks)
  3. Add timeout: `setTimeout(() => client.abort(), 30000)`
  4. Test subagent in isolation before orchestrator integration

## Cost Management

### Per-Call Economics

**AI Call Costs (avg 3-minute call):**
- Twilio: $0.014/min × 3 = $0.042
- OpenAI Realtime: ($0.06 input + $0.24 output)/min × 3 = $0.90
- Claude reasoning: ~$0.03 (4-5 reasoning calls per conversation)
- **Total per call: ~$0.97**

**Business Pricing Model:**
- Free tier: No AI calls (text notifications only)
- Starter ($49/mo): 20 AI calls included ($2.45/call above)
- Professional ($149/mo): 100 AI calls included ($1.50/call above)
- Enterprise (custom): Unlimited calls, volume discounts

**Margin Analysis:**
- Professional tier: $149 - (100 × $0.97) = $52 gross profit (35% margin)
- Additional calls: $1.50 - $0.97 = $0.53 profit per call (35% margin)

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

### Budget Alerts

**Development Phase:**
```bash
# Set AWS CloudWatch alerts for API costs
aws cloudwatch put-metric-alarm \
  --alarm-name "anthropic-monthly-spend" \
  --threshold 100 \
  --comparison-operator GreaterThanThreshold

# Twilio spending alerts
twilio api:trigger-alerts:create --limit 50 --email alerts@leadflip.com
```

**Production Phase:**
- Monthly budget: $1,000/mo (handles ~1,000 AI calls + 10,000 lead classifications)
- Alert at 80% spend ($800)
- Hard limit at 110% ($1,100) to prevent overages

## Testing Strategy

### Subagent Unit Tests

```typescript
// tests/agents/lead-classifier.test.ts
import { ClaudeSDKClient } from '@anthropic-ai/claude-agent-sdk';

describe('Lead Classifier Subagent', () => {
  it('should classify emergency plumbing lead', async () => {
    const classifier = new ClaudeSDKClient({
      systemPromptFile: './.claude/agents/lead-classifier.md',
      maxTurns: 1
    });

    const input = "My water heater is leaking, need someone ASAP in Carmel 46032, budget $500 max";
    await classifier.query(`Classify this lead: ${input}`);

    for await (const response of classifier.receiveResponse()) {
      const result = JSON.parse(response.content[0].text);

      expect(result.service_category).toBe('plumbing');
      expect(result.urgency).toBe('emergency');
      expect(result.budget_max).toBe(500);
      expect(result.location_zip).toBe('46032');
      expect(result.quality_score).toBeGreaterThan(7);
    }
  });

  it('should handle vague submissions with low quality score', async () => {
    const input = "need help with stuff";
    // Test that quality_score < 5 for vague leads
  });
});
```

### Integration Tests

```typescript
// tests/integration/lead-flow.test.ts
describe('Complete Lead Flow', () => {
  it('should process lead from submission to business notification', async () => {
    // 1. Submit consumer lead
    const lead = await trpc.lead.submit.mutate({
      problemText: "Lawn needs mowing, Fishers 46038, budget $100"
    });

    // 2. Wait for orchestrator to process
    await waitFor(() => lead.status === 'matched', { timeout: 10000 });

    // 3. Verify businesses were matched
    const matches = await trpc.lead.getMatches.query({ leadId: lead.id });
    expect(matches.length).toBeGreaterThan(0);

    // 4. Verify notifications sent
    const notifications = await db.query('SELECT * FROM notifications WHERE lead_id = $1', [lead.id]);
    expect(notifications.length).toBeGreaterThan(0);
  });
});
```

### Call Flow Testing

```typescript
// tests/integration/call-flow.test.ts
describe('AI Call Flow', () => {
  it('should make call and generate transcript', async () => {
    // Mock Twilio/OpenAI for testing
    const mockTwilio = createMockTwilioClient();
    const mockOpenAI = createMockOpenAIWebSocket();

    const call = await trpc.call.initiate.mutate({
      leadId: 'test-lead-id',
      objective: 'Call consumer to confirm appointment time'
    });

    // Wait for call to complete
    await waitFor(() => call.status === 'completed', { timeout: 60000 });

    // Verify transcript exists
    expect(call.transcript).toBeDefined();
    expect(call.transcript.length).toBeGreaterThan(0);
    expect(call.outcome).toBeOneOf(['goal_achieved', 'voicemail', 'no_answer']);
  });
});
```

### Memory Learning Tests

```typescript
// tests/agents/memory-learning.test.ts
describe('CLAUDE.md Memory Learning', () => {
  it('should adjust scoring based on historical patterns', async () => {
    // Update memory with pattern: lawn care in summer = high conversion
    await updateMemory(`
      ## Seasonal Adjustments
      - Jun-Aug: Lawn care leads convert at 95%
    `);

    // Submit lawn care lead in July
    const lead1 = await classifyLead("Need lawn mowed, July, Carmel 46032");
    expect(lead1.quality_score).toBeGreaterThan(8); // Boosted by seasonal pattern

    // Submit same lead in December
    const lead2 = await classifyLead("Need lawn mowed, December, Carmel 46032");
    expect(lead2.quality_score).toBeLessThan(6); // Not boosted in winter
  });
});
```

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

**Security:**
- [ ] Login as Consumer → verify can't see other consumers' leads
- [ ] Login as Business → verify can only see matched leads
- [ ] Attempt SQL injection → verify parameterized queries prevent

## Implementation Roadmap

### Phase 1: Foundation (Weeks 1-4)
- Setup Next.js + TypeScript + Tailwind
- Configure Clerk authentication + Supabase
- Create database schema with RLS policies
- Build basic UI (Consumer/Business/Admin portals)
- Install Claude Agent SDK, create project structure

### Phase 2: Agent Architecture (Weeks 5-8)
- Build Main Orchestrator agent
- Create Lead Classifier subagent
- Create Business Matcher subagent
- Create Response Generator subagent
- Implement MCP servers (Postgres, Twilio)
- Test end-to-end lead flow (no calls yet)

### Phase 3: Call Integration (Weeks 9-12)
- Build Call Agent subagent
- Setup BullMQ queue + Redis
- Build WebSocket server (Twilio ↔ OpenAI bridge)
- Integrate Claude reasoning during calls
- Deploy WebSocket server to Railway/Fly.io
- Test call flow with real phone numbers

### Phase 4: Learning & Optimization (Weeks 13-16)
- Create CLAUDE.md memory system
- Implement Audit Agent (weekly reports)
- Add hook automation (notifications, audits)
- Test memory learning with 100+ leads
- Optimize system prompts based on real data

### Phase 5: Beta Launch (Weeks 17-20)
- Recruit 10 businesses + 50 consumers
- Monitor first 100 leads + 20 AI calls
- Collect feedback, iterate on UX
- Fix bugs, optimize costs
- Public launch

## Project Status

**Current Status:** Phase 1 - Foundation (In Progress)

### ✅ Completed:

**Project Infrastructure:**
- Git repository initialized and connected to https://github.com/CaptainPhantasy/LeadFlip
- Next.js 15.2.3 project structure with TypeScript
- Tailwind CSS + configuration complete
- All core dependencies installed (Claude Agent SDK, Twilio, OpenAI, Supabase, BullMQ)
- Development server running on http://localhost:3000

**API Credentials Configured:**
- ✅ Twilio (Test credentials) - Ready for calls
- ✅ Anthropic Claude API - Pro Max subscription with credits
- ✅ OpenAI API - Realtime API access ready
- ✅ Supabase - Database project created (URL + Anon Key + Service Role Key)
- ⏳ Clerk - Not yet set up
- ⏳ Upstash Redis - Not yet set up

**Database Schema:**
- Migration file created: `supabase/migrations/20250930000000_initial_schema.sql`
- Tables defined: users, leads, businesses, matches, calls, conversions
- PostGIS enabled for geographic matching
- Row-Level Security (RLS) policies defined
- **Status:** Ready to run migration (use Supabase MCP in next session)

**File Structure:**
```
/Volumes/Storage/Development/LegacyCall/
├── src/
│   ├── app/              # Next.js app router pages
│   ├── lib/
│   │   ├── supabase/     # Supabase client/server utilities
│   │   └── utils.ts      # Shared utility functions
│   ├── types/            # TypeScript type definitions
│   └── server/           # WebSocket server + workers (to be built)
├── supabase/
│   └── migrations/       # Database schema migrations
├── .claude/              # Agent system prompts (to be created)
├── CLAUDE.md             # This file - architecture documentation
├── README.md             # Project overview
└── .env.local            # All API credentials configured ✅
```

### 🚧 Next Steps (Phase 1 Continuation):

**Immediate (Next Session with Supabase MCP):**
1. Run database migration using Supabase MCP
2. Verify all tables created successfully
3. Test database connectivity from Next.js

**After Database Setup:**
4. Setup Clerk authentication (https://clerk.com)
5. Setup Upstash Redis for BullMQ queue
6. Create `./.claude/` directory structure for agent prompts
7. Build first subagent (Lead Classifier) as proof-of-concept

**Environment Variables Remaining:**
- `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` (TODO)
- `CLERK_SECRET_KEY` (TODO)
- `UPSTASH_REDIS_URL` (TODO)
- `UPSTASH_REDIS_TOKEN` (TODO)

### 📊 Blocker Status:

**RESOLVED:**
- ✅ Twilio credentials (critical blocker #1)
- ✅ OpenAI API access (blocker #2)
- ✅ Anthropic API access (blocker #3)
- ✅ Supabase project setup (blocker #4)
- ✅ Next.js project initialization

**PENDING:**
- ⏳ Database migration execution (will use MCP in next session)
- ⏳ Clerk authentication setup
- ⏳ Upstash Redis setup

**NO BLOCKERS CURRENTLY - Ready to proceed with Phase 1 completion**

### 💾 Database Migration Instructions:

**Option 1: Using Supabase MCP (Recommended - Next Session)**
```typescript
// Will use MCP in next Claude Code session to run migration
// MCP will have direct database access via DATABASE_URL
```

**Option 2: Manual via Supabase Dashboard**
1. Go to https://plmnuogbbkgsatfmkyxm.supabase.co
2. Navigate to SQL Editor
3. Copy contents of `supabase/migrations/20250930000000_initial_schema.sql`
4. Paste and run in SQL Editor
5. Verify tables created in Table Editor

### 🔐 Security Note:

`.env.local` contains sensitive credentials and is in `.gitignore`. Never commit this file to Git.

### 📈 Progress Tracking:

**Phase 1 (Foundation): 70% Complete**
- [x] Git repository setup
- [x] Next.js project initialization
- [x] API credentials configuration
- [x] Database schema design
- [ ] Database migration execution
- [ ] Clerk authentication
- [ ] Redis setup

**Estimated Time to Phase 2:** 1-2 sessions (pending Clerk + Redis + migration)
