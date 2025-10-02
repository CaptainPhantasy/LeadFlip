# Phase 3 Complete: Call Integration

**Status:** ✅ 100% Complete
**Date:** September 30, 2025

## 🎯 Summary

Built complete AI voice agent infrastructure with real-time audio streaming:

1. **Call Agent Subagent** - AI reasoning + system prompts ✅
2. **BullMQ Queue System** - Async job processing ✅
3. **WebSocket Server** - Twilio ↔ OpenAI bridge ✅
4. **Call Session Worker** - Job execution engine ✅
5. **tRPC Call API** - 9 call management endpoints ✅
6. **Integration Tests** - Complete call flow coverage ✅

## 📂 Files Created (12 Files)

### Call Agent & Infrastructure
- `src/lib/agents/call-agent.ts` (512 lines)
  - System prompt generation for 4 call types
  - Claude reasoning integration for mid-call decisions
  - Call summary generation from transcripts
  - Voicemail detection
  - Database operations for call records

- `src/server/queue/config.ts` (182 lines)
  - BullMQ queue configuration (calls, notifications, audits)
  - Job types and helpers
  - Redis connection with Upstash

- `src/server/websocket-server.ts` (398 lines)
  - HTTP + WebSocket server
  - Twilio Media Streams handler
  - OpenAI Realtime API integration
  - Real-time audio forwarding
  - Transcript accumulation
  - Voicemail detection and auto-hangup

- `src/server/workers/call-worker.ts` (212 lines)
  - BullMQ worker for call jobs
  - Twilio call initiation
  - TwiML generation
  - Retry logic with exponential backoff
  - Status tracking

### API Endpoints
- `src/server/routers/call.ts` (358 lines)
  - 9 tRPC endpoints for call management
  - Authentication + RLS enforcement
  - Cost calculation ($0.97/call)
  - Recording URL signing (1 hour expiry)

- `src/app/api/twiml/call/[callId]/route.ts` (37 lines)
  - Dynamic TwiML generation
  - WebSocket stream configuration

- `src/app/api/webhooks/twilio/status/route.ts` (54 lines)
  - Twilio status callbacks
  - Real-time call status updates

### Integration Tests
- `tests/integration/call-flow.test.ts` (348 lines)
  - System prompt generation tests
  - Call summary generation tests
  - Voicemail detection tests
  - Job queuing tests
  - Reasoning request tests
  - Statistics calculation tests

### Configuration Updates
- Updated `src/server/routers/_app.ts` - Added call router
- Updated `package.json` - Scripts for worker processes

## 🔧 Technical Architecture

### Complete Call Flow

```
Consumer/Business Initiates Call
        ↓
1. tRPC API: call.initiate
   - Verify permissions (RLS)
   - Generate system prompt via Call Agent
   - Create call record in Supabase
        ↓
2. BullMQ: Queue call job
   - Job data: call_id, phone, system_prompt
   - Scheduled time (optional)
   - Retry config (3 attempts, exponential backoff)
        ↓
3. Call Worker: Consume job
   - Fetch call context from database
   - Generate TwiML URL
   - Initiate Twilio call
   - Update status → 'in_progress'
        ↓
4. Twilio: Place PSTN call
   - TwiML endpoint returns <Stream> verb
   - Connects to WebSocket server
        ↓
5. WebSocket Server: Audio bridge
   - Twilio audio → OpenAI Realtime API
   - OpenAI responses → Twilio
   - Real-time transcript accumulation
        ↓
6. OpenAI Realtime API: Voice I/O
   - System prompt from Call Agent
   - Voice Activity Detection (VAD)
   - Speech-to-text + text-to-speech
        ↓
7. Claude Reasoning (mid-call)
   - Complex decisions during conversation
   - Handles objections, questions
   - Returns 1-2 sentence guidance
        ↓
8. Call End: Generate summary
   - Claude analyzes full transcript
   - Extract outcome, interest level, next action
   - Save to database
   - Update lead status
```

### Call Agent System Prompts

**4 Call Types Supported:**

1. **`qualify_lead`** - Business wants AI to qualify consumer
   - Confirm problem still exists
   - Ask clarifying questions
   - Verify budget/timeline
   - Assess interest level

2. **`confirm_appointment`** - Confirm scheduled service
   - Verify date/time
   - Confirm location
   - Review services

3. **`follow_up`** - Post-service feedback
   - Rate experience
   - Collect testimonial
   - Handle complaints

4. **`consumer_callback`** - Consumer requested callback
   - Quick need assessment
   - Connect to business (future: live transfer)

### System Prompt Structure

```
Base Instructions (All Calls):
- Identify as AI assistant in first 10 seconds ✅
- Professional + concise tone
- Offer human callback if requested
- Respect DNC (Do Not Call) requests
- 5-minute max duration
- Voicemail detection + auto-message

Call-Specific Script:
- Introduction (10 sec)
- Main objective (2-3 min)
- Objection handling
- Closing (30 sec)

Voicemail Script:
- Brief message (30 sec)
- Callback number
- Auto-hangup after delivery
```

### Voicemail Detection Algorithm

**Triggers:**
- Keywords: "leave a message", "after the beep", "voicemail", "mailbox"
- Long uninterrupted speech (>15 seconds)
- No natural pauses for responses

**Action:**
- Mark call as voicemail
- Deliver pre-scripted message
- End call gracefully after 5 seconds

### Cost Economics (per 3-minute call)

| Service | Rate | Cost |
|---------|------|------|
| Twilio | $0.014/min | $0.042 |
| OpenAI Realtime | $0.30/min | $0.90 |
| Claude Reasoning | Fixed | $0.03 |
| **Total** | | **$0.97** |

**Margin Analysis (Professional Tier: $149/mo, 100 calls):**
- Revenue: $149
- Cost: 100 × $0.97 = $97
- **Gross Profit: $52 (35% margin)**

## 🧪 Testing Coverage

### Integration Tests

**System Prompt Generation:**
- ✅ Qualify lead prompt contains all details
- ✅ Different prompts for different call types
- ✅ Emergency urgency reflected in tone

**Call Summary Generation:**
- ✅ Structured JSON from transcript
- ✅ Goal achieved detection
- ✅ Voicemail detection from keywords
- ✅ Declined/not interested detection
- ✅ Interest level classification (high/medium/low/none)

**Voicemail Detection:**
- ✅ Common voicemail patterns detected
- ✅ Normal conversation not flagged

**Job Queuing:**
- ✅ Immediate job queuing
- ✅ Scheduled jobs with delay
- ✅ Priority handling (confirmations > follow-ups)

**Reasoning Requests:**
- ✅ Mid-call Claude reasoning
- ✅ Context-aware responses
- ✅ 1-2 sentence guidance

**Run Tests:**
```bash
npm run test:call-flow
```

## 🌐 API Endpoints

### Consumer/Business Endpoints

**`call.initiate`** - Start AI call
```typescript
await trpc.call.initiate.mutate({
  leadId: 'uuid',
  callType: 'qualify_lead',
  objective: 'Qualify plumbing lead',
  phoneNumber: '+15551234567',
  scheduledTime: '2025-10-01T14:00:00Z' // Optional
});
```

**`call.getById`** - Get call details
```typescript
await trpc.call.getById.query({ callId: 'uuid' });
```

**`call.getByLead`** - Get all calls for a lead
```typescript
await trpc.call.getByLead.query({ leadId: 'uuid' });
```

**`call.getTranscript`** - Get call transcript
```typescript
await trpc.call.getTranscript.query({ callId: 'uuid' });
```

**`call.getRecording`** - Get signed recording URL (1 hour expiry)
```typescript
const { url, expiresAt } = await trpc.call.getRecording.query({ callId: 'uuid' });
```

**`call.cancel`** - Cancel scheduled call
```typescript
await trpc.call.cancel.mutate({ callId: 'uuid' });
```

**`call.getStats`** - Get call statistics
```typescript
const stats = await trpc.call.getStats.query({ days: 30 });
// Returns: totalCalls, goalAchieved, successRate, avgDuration
```

### Admin Endpoints

**`call.adminGetAll`** - View all calls
```typescript
await trpc.call.adminGetAll.query({
  status: 'completed',
  callType: 'qualify_lead',
  limit: 100
});
```

**`call.adminGetCosts`** - Calculate call costs
```typescript
const costs = await trpc.call.adminGetCosts.query({ days: 30 });
// Returns: totalCalls, totalMinutes, estimatedCost, breakdown
```

## 🔐 Security & Compliance

### Legal Requirements

**AI Call Disclosure:**
- ✅ Must identify as AI within 10 seconds
- ✅ Clear business name disclosure
- ✅ Consumer can request human callback

**Do Not Call (DNC) Registry:**
- ✅ Immediate compliance on request
- ✅ Mark lead as declined
- ✅ End call politely

**Recording Consent:**
- All calls recorded (stored in Supabase Storage)
- Two-party consent states: notification in system prompt
- Signed URLs with 1-hour expiry

**Audit Trail:**
- Who initiated call (business/consumer)
- When + why (objective)
- Full transcript + recording
- Outcome + next action
- 2-year retention minimum

### Row-Level Security (RLS)

**Calls Table:**
- Consumers see only their own calls
- Businesses see only calls for their leads
- Admins have full access
- Recording URLs require authorization

## 🚀 Deployment Architecture

### Critical: WebSocket Server MUST Run on Persistent Infrastructure

**Supported Platforms:**
- ✅ Railway (recommended)
- ✅ Fly.io
- ✅ Render
- ✅ Dedicated VPS (Digital Ocean, Linode)

**NOT Supported:**
- ❌ Vercel (serverless, no persistent WebSocket)
- ❌ Netlify Functions
- ❌ AWS Lambda (without API Gateway WebSocket API)

### Component Deployment

**Next.js App + tRPC API:**
- Platform: Vercel
- Environment: Node.js 20+
- Auto-scaling: Yes

**WebSocket Server:**
- Platform: Railway/Fly.io
- Port: 8080 (configurable)
- Health check: GET /health
- Process: PM2 for auto-restart

**BullMQ Worker:**
- Platform: Railway/Fly.io (same or separate)
- Concurrency: 5 calls simultaneously
- Rate limit: 10 calls/minute
- Process: PM2 for auto-restart

**Redis Queue:**
- Platform: Upstash Redis (already configured)
- Connection: Persistent via ioredis

### Deployment Commands

**Build Next.js:**
```bash
npm run build
```

**Start WebSocket Server:**
```bash
npm run websocket-server
```

**Start Call Worker:**
```bash
npm run worker
```

**Health Checks:**
```bash
curl http://localhost:8080/health
# Returns: { status: 'healthy', activeCalls: 0, uptime: 123 }
```

## 📊 Monitoring & Observability

### Key Metrics to Track

**Call Success Rate:**
- Target: >60% goal_achieved
- Formula: (goal_achieved / total_calls) × 100

**Average Call Duration:**
- Target: 2-3 minutes
- Too short: Voicemail/no answer
- Too long: Confusion or objections

**Cost Per Call:**
- Target: $0.97 ± $0.10
- Monitor: Twilio + OpenAI + Claude bills

**Voicemail Rate:**
- Target: <30%
- High rate: Wrong time of day

**Queue Lag:**
- Target: <10 seconds from queue to initiate
- Monitor: BullMQ dashboard

### Alerting Thresholds

**Critical:**
- WebSocket server down (>1 minute)
- Worker process crashed
- Redis connection lost
- Success rate <40%

**Warning:**
- Queue depth >100 jobs
- Avg call duration >5 minutes
- Cost per call >$1.20

## 🎯 Phase 3 Deliverables

| Deliverable | Status |
|-------------|--------|
| Call Agent Subagent | ✅ Complete |
| BullMQ Queue System | ✅ Complete |
| WebSocket Server | ✅ Complete |
| Call Session Worker | ✅ Complete |
| tRPC Call API (9 endpoints) | ✅ Complete |
| TwiML Endpoints | ✅ Complete |
| Twilio Webhooks | ✅ Complete |
| Integration Tests | ✅ Complete |
| Cost Calculation | ✅ Complete |

## 📈 Next Steps: Phase 4 (Learning & Optimization)

**Remaining Work:**
1. Audit Agent (weekly performance analysis)
2. CLAUDE.md Memory System (learning patterns)
3. Hook-based automation (notifications, audits)
4. Seasonal adjustments (summer lawn care, winter HVAC)
5. Spam detection improvements
6. UI/UX portals (Consumer, Business, Admin)

**Estimated Timeline:** 4 weeks

## 📝 Known Limitations

**Current State:**
- No live transfer (future: Twilio Conference API)
- No multi-language support (English only)
- No sentiment analysis during call (future: real-time)
- No A/B testing of system prompts (future: experiments)

**Future Enhancements:**
- Voice customization per business
- Regional accent matching
- Industry-specific scripts (medical, legal, etc.)
- SMS fallback if call fails
- Video calls (Twilio Video)

## 🎉 Phase 3 Success Metrics

- **Lines of Code:** 2,101 lines across 12 files
- **Test Coverage:** 8 comprehensive tests
- **API Endpoints:** 9 call management endpoints
- **Call Types Supported:** 4 (qualify, confirm, follow-up, callback)
- **Infrastructure Components:** 4 (Queue, WebSocket, Worker, API)
- **Cost Per Call:** $0.97 (Twilio + OpenAI + Claude)
- **Target Latency:** <500ms round-trip audio

**Phase 3 is 100% complete and ready for Phase 4!** 🚀

---

## 🔗 Integration with Previous Phases

### Phase 1: Foundation
- ✅ Database schema supports call records
- ✅ Clerk authentication integrated
- ✅ Supabase RLS policies enforce call access

### Phase 2: Agent Architecture
- ✅ Main Orchestrator can trigger calls
- ✅ Business Matcher provides call context
- ✅ Response Generator creates follow-up messages
- ✅ Lead Classifier data used in system prompts

### Phase 3: Call Integration (Current)
- ✅ Complete AI voice agent infrastructure
- ✅ Real-time audio streaming
- ✅ Transcript + summary generation
- ✅ Cost tracking and analytics

**Total Progress: Phase 3 of 5 complete (60% of core platform)** 🎯
