# LeadFlip Parallel Execution Plan

**Objective**: Fix all critical blockers and complete Phase 2 implementation
**Execution Mode**: Parallel agent fleet (5 specialized agents)
**Timeline**: Complete all tracks within 2-3 days
**Coordination**: Shared documents for inter-agent communication

---

## Agent Fleet Assignment

### 🔴 Track 1: Notification System Agent
**Agent ID**: `notification-agent`
**Priority**: CRITICAL (P0)
**Owner**: Notification System Specialist

**Deliverables**:
- [ ] Implement actual email sending (SendGrid/Mailgun)
- [ ] Implement SMS sending (Twilio)
- [ ] Replace console.logs in main-orchestrator.ts
- [ ] Create notification templates
- [ ] Test end-to-end lead → notification flow
- [ ] Update notification-worker.ts integration

**Files to Modify**:
- `src/lib/agents/main-orchestrator.ts` (lines 324-343)
- `src/server/workers/notification-worker.ts`
- `src/lib/email/templates/` (create)

**Dependencies**: None (can start immediately)

**Exit Criteria**: Consumer submits lead → Business receives email/SMS within 30 seconds

---

### 🟡 Track 2: Database Schema Agent
**Agent ID**: `schema-agent`
**Priority**: CRITICAL (P0)
**Owner**: Database Schema Specialist

**Deliverables**:
- [ ] Fix column name mismatches (phone_number vs phone, location vs location_point)
- [ ] Add missing columns (years_in_business, completed_jobs)
- [ ] Create migration script for updates
- [ ] Run migration on Supabase
- [ ] Verify all tRPC endpoints work with new schema
- [ ] Update TypeScript types to match schema

**Files to Modify**:
- `supabase/migrations/20250930000000_initial_schema.sql`
- `src/server/routers/business.ts`
- `src/server/routers/lead.ts`
- Create: `supabase/migrations/20251001000001_fix_schema_mismatches.sql`

**Dependencies**: None (can start immediately)

**Exit Criteria**: Business registration completes successfully, no database errors in logs

---

### 🔵 Track 3: AI Calling Integration Agent
**Agent ID**: `calling-agent`
**Priority**: HIGH (P1)
**Owner**: AI Calling Infrastructure Specialist

**Deliverables**:
- [ ] Create TwiML endpoint (`/api/twiml/call/[callId]/route.ts`)
- [ ] Integrate BullMQ queue with tRPC endpoints
- [ ] Update `business.requestAICall` to queue jobs
- [ ] Update `lead.requestCallback` to queue jobs
- [ ] Test job queueing end-to-end
- [ ] Document call flow

**Files to Create**:
- `src/app/api/twiml/call/[callId]/route.ts`
- `src/app/api/webhooks/twilio/status/route.ts`

**Files to Modify**:
- `src/server/routers/business.ts` (requestAICall)
- `src/server/routers/lead.ts` (requestCallback)
- `src/server/routers/call.ts` (add initiate endpoint)

**Dependencies**: Track 2 (schema must be fixed first for call records)

**Exit Criteria**: Business clicks "Request AI Call" → Job appears in BullMQ queue

---

### 🟢 Track 4: Testing Infrastructure Agent
**Agent ID**: `testing-agent`
**Priority**: HIGH (P1)
**Owner**: Testing & QA Specialist

**Deliverables**:
- [ ] Create lead submission integration test
- [ ] Create business registration integration test
- [ ] Create notification flow integration test
- [ ] Create AI call queueing test
- [ ] Set up test database seeding
- [ ] Document testing procedures
- [ ] Create CI/CD test pipeline config

**Files to Create**:
- `tests/integration/lead-flow.test.ts`
- `tests/integration/business-flow.test.ts`
- `tests/integration/notification-flow.test.ts`
- `tests/integration/call-queueing.test.ts`
- `tests/helpers/test-data.ts`
- `.github/workflows/test.yml`

**Dependencies**: Track 1, Track 2 (features must work before testing)

**Exit Criteria**: All integration tests pass, test coverage >60%

---

### 🟣 Track 5: Deployment Infrastructure Agent
**Agent ID**: `deployment-agent`
**Priority**: MEDIUM (P2)
**Owner**: DevOps & Deployment Specialist

**Deliverables**:
- [ ] Create Railway/Fly.io deployment config for WebSocket server
- [ ] Create Dockerfile for WebSocket server
- [ ] Create worker deployment configuration
- [ ] Set up environment variables documentation
- [ ] Configure health checks and monitoring
- [ ] Create deployment scripts
- [ ] Document deployment procedures

**Files to Create**:
- `railway.json` or `fly.toml`
- `Dockerfile.websocket`
- `Dockerfile.worker`
- `.env.example` (comprehensive)
- `scripts/deploy-websocket.sh`
- `scripts/deploy-worker.sh`
- `DEPLOYMENT.md`

**Dependencies**: Track 3 (AI calling must be integrated first)

**Exit Criteria**: WebSocket server deployed and accessible, workers running and processing jobs

---

## Shared Resources

### Communication Documents

**Progress Tracking**: `PROGRESS_TRACKER.md`
- Each agent updates their progress hourly
- Blockers logged immediately
- Dependencies tracked

**Integration Points**: `INTEGRATION_POINTS.md`
- Shared types/interfaces between tracks
- API contract changes
- Database schema updates

**Environment Variables**: `ENV_VARIABLES_COMPLETE.md`
- All required variables documented
- Track which agent needs which vars
- Production vs development configs

**Known Issues**: `KNOWN_ISSUES.md`
- Bugs discovered during implementation
- Workarounds applied
- Technical debt logged

---

## Execution Timeline

### Day 1 (Hours 0-8)
- **Hour 0-2**: All agents start setup, create branches
- **Hour 2-4**: Track 1 & 2 make significant progress (no dependencies)
- **Hour 4-6**: Track 3 begins (depends on Track 2)
- **Hour 6-8**: Track 1 & 2 complete initial implementations

### Day 2 (Hours 8-16)
- **Hour 8-10**: Track 1 & 2 testing and refinement
- **Hour 10-12**: Track 3 completes integration
- **Hour 12-14**: Track 4 begins comprehensive testing
- **Hour 14-16**: Track 5 begins deployment setup

### Day 3 (Hours 16-24)
- **Hour 16-20**: Track 4 completes test suite
- **Hour 20-22**: Track 5 completes deployments
- **Hour 22-24**: Final integration testing, documentation

---

## Success Criteria

**Phase 1 Complete**: Tracks 1 & 2 done
- ✅ Notifications working end-to-end
- ✅ Database schema fixed
- ✅ No runtime errors
- ✅ Business can register and receive lead notifications

**Phase 2 Complete**: Track 3 done
- ✅ AI call requests queue properly
- ✅ TwiML endpoint functional
- ✅ Call lifecycle tracked in database

**Phase 3 Complete**: Tracks 4 & 5 done
- ✅ Integration tests passing
- ✅ WebSocket server deployed
- ✅ Workers running in production
- ✅ Full end-to-end AI call working

---

## Rollback Plan

If critical issues arise:
1. **Track 1/2 issues**: Revert to console.log notifications, use old schema
2. **Track 3 issues**: Disable AI calling UI, manual callbacks only
3. **Track 4 issues**: Ship without tests (risky but viable)
4. **Track 5 issues**: Run workers locally, defer production deployment

---

## Agent Coordination Protocol

### Daily Sync (Async via Documents)
- Each agent updates `PROGRESS_TRACKER.md` every 4 hours
- Blockers posted to `KNOWN_ISSUES.md` immediately
- Integration changes posted to `INTEGRATION_POINTS.md`

### Conflict Resolution
- If two agents modify same file: Track with lower number has priority
- Schema changes: Always check with Track 2 agent first
- API changes: Update `INTEGRATION_POINTS.md` before implementing

### Definition of Done
- Code implemented and tested locally
- Tests written (unit + integration where applicable)
- Documentation updated
- PR created with detailed description
- No breaking changes to other tracks

---

**Execution Start Time**: [Agent fleet launch timestamp]
**Expected Completion**: 3 days from start
**Project Manager**: Main Claude instance (you)
**Status**: READY TO LAUNCH
