# LeadFlip - Subagent Shared Specification

**Date:** October 1, 2025, 8:30 PM EDT
**Purpose:** Common reference for all parallel subagents fixing critical issues
**Source Report:** `END_TO_END_TESTING_REPORT.md`

---

## Project Context

LeadFlip is a Claude Agent SDK-powered reverse marketplace for local services with AI-powered lead matching and autonomous outbound calling.

**Tech Stack:**
- Next.js 15.2.3 + TypeScript + Tailwind CSS
- Supabase (PostgreSQL 15 + PostGIS)
- Clerk Authentication
- Anthropic Claude API (reasoning)
- OpenAI Realtime API (voice)
- SignalWire (calls + SMS)
- BullMQ (Redis-backed job queue)

**Repository:** https://github.com/CaptainPhantasy/LeadFlip
**Local Path:** `/Volumes/Storage/Development/LeadFlip`

---

## Critical Blockers Identified

### 1. Build Failure (CRITICAL)
**File:** `src/lib/auth/admin.ts`
**Error:** Server-only import in client component
**Impact:** Cannot build or deploy application

### 2. Database Not Migrated (CRITICAL)
**Location:** `supabase/migrations/`
**Issue:** 11 migration files exist but unclear if applied
**Impact:** All database operations will fail

### 3. No Testing Coverage (HIGH)
**Issue:** 0% test coverage despite configured Jest
**Impact:** Cannot verify functionality or catch regressions

### 4. WebSocket Server Not Deployed (HIGH)
**File:** `src/server/websocket-server.ts`
**Issue:** Implemented but not deployed to persistent infrastructure
**Impact:** AI calling system cannot function

### 5. Documentation Outdated (MEDIUM)
**Issue:** CLAUDE.md claims 95% Phase 1 complete but blockers exist
**Impact:** Misleading status reporting

---

## Subagent Assignments

### Agent 1: Build Fix Agent
**Task:** Fix Server/Client component mismatch in `src/lib/auth/admin.ts`
**Priority:** P0 (CRITICAL)
**Est. Time:** 30 minutes

**Requirements:**
1. Move server-only functions (`isAdmin`, `grantAdminRole`, etc.) to tRPC endpoints
2. Create `src/app/admin/actions.ts` with server actions
3. Update `src/components/admin/user-management.tsx` to use API calls
4. Verify build succeeds: `npm run build`
5. Document changes with timestamp and comments

**Success Criteria:**
- `npm run build` completes without errors
- Admin dashboard remains functional
- All admin auth checks still work

---

### Agent 2: Database Migration Agent
**Task:** Apply and verify all database migrations
**Priority:** P0 (CRITICAL)
**Est. Time:** 45 minutes

**Requirements:**
1. Review all 11 migration files in `supabase/migrations/`
2. Identify which migrations are redundant (e.g., 4 versions of `fix_user_id_type`)
3. Run migrations via Supabase dashboard SQL editor
4. Verify schema with: `SELECT * FROM information_schema.columns WHERE table_name IN ('users', 'leads', 'businesses', 'matches', 'calls')`
5. Test basic CRUD operations on each table
6. Document applied migrations in `DATABASE_MIGRATION_STATUS.md`

**Success Criteria:**
- All tables exist with correct columns
- PostGIS extension enabled
- RLS policies active
- Test INSERT/SELECT works on all tables

---

### Agent 3: Testing Agent
**Task:** Create basic test suite for critical components
**Priority:** P1 (HIGH)
**Est. Time:** 3 hours

**Requirements:**
1. Create `tests/agents/lead-classifier.test.ts` - Test JSON output structure
2. Create `tests/integration/auth.test.ts` - Test RLS policies
3. Create `tests/integration/lead-flow.test.ts` - Test orchestrator end-to-end
4. Ensure all tests pass: `npm run test`
5. Document test coverage in `TESTING_STATUS.md`

**Success Criteria:**
- At least 3 test files created
- All tests pass
- Coverage > 30% for critical paths

---

### Agent 4: Documentation Agent
**Task:** Update documentation to reflect actual status
**Priority:** P2 (MEDIUM)
**Est. Time:** 2 hours

**Requirements:**
1. Update `CLAUDE.md` with accurate Phase 1/Phase 2 status
2. Remove or consolidate redundant migration files
3. Create `DATABASE_MIGRATION_STATUS.md` with migration history
4. Update `README.md` with current setup instructions
5. Create `.env.example` from `.env.local`

**Success Criteria:**
- CLAUDE.md reflects actual blockers
- Migration history documented
- Setup instructions accurate

---

### Agent 5: WebSocket Deployment Agent
**Task:** Deploy WebSocket server to persistent infrastructure
**Priority:** P1 (HIGH)
**Est. Time:** 2 hours

**Requirements:**
1. Test WebSocket server locally: `npm run websocket-server`
2. Create Railway or Fly.io deployment configuration
3. Deploy WebSocket server with environment variables
4. Update `WEBSOCKET_SERVER_URL` in production env
5. Test connectivity from local dev environment
6. Document deployment in `WEBSOCKET_DEPLOYMENT.md`

**Success Criteria:**
- WebSocket server accessible from public URL
- Can establish connection and send test messages
- Logs show no errors

---

## Shared Resources

### Environment Variables (All Agents)

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=https://plmnuogbbkgsatfmkyxm.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=[see .env.local]
SUPABASE_SERVICE_ROLE_KEY=[see .env.local]
DATABASE_URL=[see .env.local]

# Auth
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=[see .env.local]
CLERK_SECRET_KEY=[see .env.local]

# AI APIs
ANTHROPIC_API_KEY=[see .env.local]
OPENAI_API_KEY=[see .env.local]

# Communications
SIGNALWIRE_PROJECT_ID=2f9ce47f-c556-4cf2-803c-2b1525b35b34
SIGNALWIRE_API_TOKEN=[see .env.local]
SIGNALWIRE_PHONE_NUMBER=+18888915040

# Queue
UPSTASH_REDIS_REST_URL=https://vocal-polliwog-15926.upstash.io
UPSTASH_REDIS_REST_TOKEN=[see .env.local]
```

### Common Commands

```bash
# Build
npm run build

# Test
npm run test
npm run test:agents
npm run test:integration

# Run dev server
npm run dev

# Run WebSocket server
npm run websocket-server

# Run workers
npm run worker
```

### File Structure

```
/Volumes/Storage/Development/LeadFlip/
├── src/
│   ├── app/               # Next.js app router
│   ├── components/        # React components
│   ├── lib/
│   │   ├── agents/       # AI agent implementations
│   │   ├── auth/         # Authentication logic
│   │   ├── email/        # Email templates
│   │   └── sms/          # SMS templates
│   ├── server/
│   │   ├── routers/      # tRPC API endpoints
│   │   ├── workers/      # BullMQ workers
│   │   └── websocket-server.ts
│   └── types/            # TypeScript types
├── supabase/
│   └── migrations/       # Database migrations
├── tests/                # Test files
├── .claude/
│   └── agents/          # Agent system prompts
└── [docs]               # Various markdown docs
```

---

## Quality Standards

### Code Changes
- ✅ Add timestamp comments: `// [2025-10-01 8:30 PM] Fixed server/client import issue`
- ✅ Use TypeScript strict mode
- ✅ Follow existing code style
- ✅ Add error handling
- ✅ Log significant actions

### Testing
- ✅ All tests must pass before marking task complete
- ✅ Use Jest + TypeScript
- ✅ Mock external API calls
- ✅ Test both success and error cases

### Documentation
- ✅ Markdown format
- ✅ Include examples where relevant
- ✅ Add "Last Updated" timestamp
- ✅ Link to related files

### Git Workflow
- ⚠️ **DO NOT COMMIT YET** - All agents complete first
- Document all changes in completion reports
- Main commit will be created after all agents finish

---

## Communication Protocol

Each agent should:

1. **Start with status update:**
   ```
   [Agent Name] Starting task: [Task Name]
   Priority: P0/P1/P2
   Estimated time: X minutes
   ```

2. **Document progress:**
   - Create `[AGENT_NAME]_PROGRESS.md` file
   - Update with each major step
   - Include any blockers encountered

3. **Report completion:**
   ```
   [Agent Name] Task Complete
   Time taken: X minutes
   Success criteria met: Yes/No
   Blockers found: None/[Description]
   Next steps: [Recommendations]
   ```

4. **Create completion report:**
   - File: `[AGENT_NAME]_COMPLETION_REPORT.md`
   - Include: Changes made, files modified, test results, next steps

---

## Coordination Rules

1. **No conflicting file edits** - Agents assigned different files
2. **Shared files:** If editing same file, document coordination in progress file
3. **Blockers:** Report immediately if blocked by another agent's work
4. **Dependencies:**
   - Build Fix Agent must complete before Testing Agent can verify
   - Database Migration Agent should complete before Testing Agent runs integration tests

---

## Success Metrics

### Overall Success = ALL of:
- ✅ Build succeeds (`npm run build` exits 0)
- ✅ Database schema matches code expectations
- ✅ At least 3 test files created and passing
- ✅ Documentation updated with accurate status
- ✅ WebSocket server deployed and accessible

### Partial Success = 3 of 5 above

### Failure = < 3 of 5 above

---

## Reference Documents

- `END_TO_END_TESTING_REPORT.md` - Detailed findings and recommendations
- `CLAUDE.md` - Project architecture and documentation
- `README.md` - Setup instructions
- `.env.local` - Environment configuration (DO NOT COMMIT)

---

**Spec Version:** 1.0
**Last Updated:** October 1, 2025, 8:30 PM EDT
**Coordinator:** Claude Code (Main Orchestrator)
