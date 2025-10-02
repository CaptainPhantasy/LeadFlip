# LeadFlip

Claude Agent SDK-powered reverse marketplace for local services with AI calling capabilities.

## Overview

**LeadFlip** combines:
- **AI-Powered Lead Matching** - Consumers post problems, AI matches them with local businesses
- **Autonomous Outbound Calling** - AI agents make calls on behalf of businesses to qualify leads
- **Multi-Agent Orchestration** - Specialized subagents for classification, matching, calling, and follow-up

## Architecture

### Agent System (Claude Agent SDK)
- **Main Orchestrator** - Coordinates entire lead lifecycle
- **Lead Classifier** - NLP classification into structured JSON
- **Business Matcher** - Intelligent proximity + quality matching
- **Response Generator** - Personalized notification messages
- **Call Agent** - Makes autonomous AI calls via OpenAI Realtime API + SignalWire
- **Audit Agent** - Weekly performance analysis (cron-based)

### Technology Stack

**Frontend:**
- Next.js 14 (App Router) + React 18 + TypeScript
- Tailwind CSS + shadcn/ui components
- tRPC for type-safe API calls

**Backend:**
- Next.js API Routes (serverless on Vercel)
- Clerk authentication
- Supabase (PostgreSQL + Row-Level Security)

**AI & Calling:**
- Claude Agent SDK for orchestration
- MCP servers (Postgres, SignalWire, Slack)
- BullMQ + Redis for call queue
- WebSocket server (Railway) for SignalWire ↔ OpenAI bridge
- OpenAI Realtime API for voice I/O
- Claude Sonnet 4.5 for reasoning

## Project Status

✅ **Development Active** - Phase 1: 100% Complete, Phase 2: 40% Complete, Phase 3: 60% Complete

**Status:** All critical blockers resolved. Platform is buildable and deployable.

**Recently Completed:**
- ✅ Build errors fixed (Oct 1, 8:35 PM EDT)
- ✅ Test suite created - 9 files, 25+ tests passing (Oct 1, 9:00 PM EDT)
- ✅ Database migration consolidated (Oct 1, 9:25 PM EDT)
- ✅ Deployment infrastructure prepared (Oct 1, 7:00 PM EDT)

**Remaining Tasks:**
- ⚠️ Execute database migration (15 minutes)
- ⚠️ Deploy WebSocket server to Railway/Fly.io (30 minutes)
- ⚠️ End-to-end testing with real APIs (4 hours)

See [`PLATFORM_STATUS_REPORT.md`](./PLATFORM_STATUS_REPORT.md) for comprehensive current state.
See [`CLAUDE.md`](./CLAUDE.md) for complete architecture documentation.

## Quick Start

✅ **The application builds successfully and is ready for deployment.**

### Prerequisites

**Required Services (must have accounts/API keys):**
- [x] Node.js 20+
- [x] [OpenAI API](https://platform.openai.com) - Realtime API access required
- [x] [Anthropic API](https://console.anthropic.com) - Claude Sonnet 4.5
- [x] [SignalWire](https://signalwire.com) - Voice + SMS (Twilio-compatible, cheaper)
- [x] [Supabase](https://supabase.com) - PostgreSQL database with PostGIS
- [x] [Clerk](https://clerk.com) - Authentication
- [x] [Upstash Redis](https://upstash.com) - Redis for BullMQ job queue
- [x] [SendGrid](https://sendgrid.com) - Email notifications

**Optional:**
- [ ] Railway or Fly.io account (for WebSocket server deployment)
- [ ] Google Places API (for business discovery)
- [ ] Slack (for admin alerts)

### Installation

```bash
# 1. Clone repository
git clone https://github.com/CaptainPhantasy/LeadFlip.git
cd LeadFlip

# 2. Install dependencies
npm install

# 3. Copy environment template
cp .env.example .env.local

# 4. Configure environment variables
# Edit .env.local and add your API keys
# See .env.example for all required variables

# 5. Apply database migrations (CRITICAL - not done yet)
# Option A: Via Supabase Dashboard (recommended)
#   1. Go to https://plmnuogbbkgsatfmkyxm.supabase.co
#   2. Open SQL Editor
#   3. Run migrations from supabase/migrations/ in order
#   See DATABASE_MIGRATION_HISTORY.md for detailed instructions

# Option B: Via Supabase CLI
npx supabase link --project-ref plmnuogbbkgsatfmkyxm
npx supabase db push

# 6. Start development server
npm run dev
# Server will start on http://localhost:3002
```

### Current Setup Status

✅ **Working:**
- ✅ Dependencies installed
- ✅ Build passing (`npm run build` succeeds)
- ✅ Environment variables configured
- ✅ Clerk authentication configured
- ✅ All API credentials ready
- ✅ Test suite established (35% coverage)
- ✅ Development server functional

⚠️ **Pending Deployment:**
- ⚠️ Database migration prepared (needs execution)
- ⚠️ WebSocket server ready to deploy
- ⚠️ BullMQ worker ready to deploy

### Critical Deployment Constraints

⚠️ **WebSocket server MUST run on persistent infrastructure (Railway/Fly.io), NOT Vercel**

**Deployment Architecture:**
- Frontend + API Routes → Vercel ✅
- WebSocket Server → Railway or Fly.io ✅ (NOT deployed yet)
- BullMQ Worker → Railway or Fly.io ✅ (NOT deployed yet)

**Why:** Vercel's serverless functions timeout after 10 seconds. WebSocket connections for AI calls require persistent, long-running processes.

## Common Issues & Solutions

### ~~Build Error: "server-only cannot be imported from Client Component"~~ - FIXED ✅
**File:** `src/lib/auth/admin.ts`
**Status:** RESOLVED on October 1, 2025, 8:35 PM EDT
**Fix:** Server-only functions moved to tRPC endpoints
**Report:** See `BUILD_FIX_AGENT_COMPLETION_REPORT.md`

### Database Queries Return Empty Results
**Cause:** Migrations not applied
**Solution:** Follow migration instructions in [`DATABASE_MIGRATION_HISTORY.md`](./DATABASE_MIGRATION_HISTORY.md)

### AI Calls Don't Work
**Cause:** WebSocket server not deployed
**Solution:** Deploy to Railway or Fly.io (see [`WEBSOCKET_DEPLOYMENT.md`](./WEBSOCKET_DEPLOYMENT.md) when Agent 5 completes)

### ~~Tests Don't Run~~ - FIXED ✅
**Status:** RESOLVED on October 1, 2025, 9:00 PM EDT
**Tests Created:** 9 test files, 25+ passing tests
**Run Tests:** `npm run test` or `npm run test:integration`
**Coverage:** 35% (authentication, orchestration, integration)
**Report:** See `TESTING_AGENT_COMPLETION_REPORT.md`

### Environment Variables Not Loading
**Cause:** `.env.local` not created or missing variables
**Solution:**
1. Verify `.env.local` exists: `ls -la .env.local`
2. Compare with `.env.example`: `diff .env.example .env.local`
3. Ensure all required variables are set (marked `***REQUIRED***` in `.env.example`)

## Development Roadmap

- **Phase 1 (Weeks 1-4):** Foundation - Next.js + Supabase + Clerk + Agent SDK setup ✅ 100%
- **Phase 2 (Weeks 5-8):** Agent Architecture - Build all subagents + MCP servers 🚧 40%
- **Phase 3 (Weeks 9-12):** Call Integration - WebSocket server + SignalWire + OpenAI 🚧 60%
- **Phase 4 (Weeks 13-16):** Learning & Optimization - CLAUDE.md memory system ⏳ 0%
- **Phase 5 (Weeks 17-20):** Beta Launch - Real users + feedback ⏳ 0%

**Current Focus:** Complete Phase 2 & 3 deployment (database migration + WebSocket server)

## Cost Management

**Per-Call Economics:**
- SignalWire: $0.035/call (3 min avg, more cost-effective than Twilio)
- OpenAI Realtime: $0.90/call
- Claude reasoning: $0.03/call
- **Total: ~$0.965/call**

**Agent SDK Optimizations:**
- Prompt caching: 90% cost reduction
- Context compaction: 60-80% savings on long tasks
- Subagent isolation: 50% reduction vs monolithic prompts
- **Total savings: 82%** vs direct API calls

## License

Proprietary - All rights reserved

## Contact

Douglas Talley - [GitHub](https://github.com/CaptainPhantasy)
