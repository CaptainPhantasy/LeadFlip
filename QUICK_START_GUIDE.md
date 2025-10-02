# LeadFlip - Quick Start Guide for New Developers

**Last Updated:** October 1, 2025 at 8:35 PM EDT
**Target Audience:** New developers joining the LeadFlip project
**Time to Complete:** ~30 minutes (excluding API key setup)

---

## Overview

LeadFlip is an AI-powered reverse marketplace for local services. This guide will get you from zero to a running development environment.

⚠️ **Important:** The application currently has critical blockers. This guide will get you set up, but you'll need to wait for or implement fixes before the app is fully functional.

---

## Prerequisites Checklist

Before starting, ensure you have:

### Required Software
- [ ] **Node.js 20+** - [Download](https://nodejs.org/)
  ```bash
  node --version  # Should be v20.x or higher
  ```
- [ ] **Git** - [Download](https://git-scm.com/)
- [ ] **Code Editor** - VS Code recommended

### Required API Accounts (Free tiers available)

Create accounts and obtain API keys for:

1. [ ] **Supabase** - [supabase.com](https://supabase.com)
   - Free tier: 500MB database, 2GB bandwidth/month
   - Need: Project URL, Anon Key, Service Role Key

2. [ ] **Clerk** - [clerk.com](https://clerk.com)
   - Free tier: 10,000 MAUs
   - Need: Publishable Key, Secret Key

3. [ ] **Anthropic** - [console.anthropic.com](https://console.anthropic.com)
   - $5 credit on signup
   - Need: API Key (for Claude Sonnet 4.5)

4. [ ] **OpenAI** - [platform.openai.com](https://platform.openai.com)
   - $5 credit on new accounts
   - Need: API Key (Realtime API access required)

5. [ ] **SignalWire** - [signalwire.com](https://signalwire.com)
   - Free trial: $5 credit
   - Need: Project ID, API Token, Space URL, Phone Number

6. [ ] **Upstash Redis** - [upstash.com](https://upstash.com)
   - Free tier: 10,000 commands/day
   - Need: REST URL, REST Token

7. [ ] **SendGrid** - [sendgrid.com](https://sendgrid.com)
   - Free tier: 100 emails/day
   - Need: API Key, Verified sender email

---

## Step 1: Clone Repository

```bash
# Clone the repo
git clone https://github.com/CaptainPhantasy/LeadFlip.git
cd LeadFlip

# Verify you're on main branch
git branch
# Should show: * main
```

---

## Step 2: Install Dependencies

```bash
# Install all npm packages
npm install

# This will install:
# - Next.js 15.2.3
# - React 19
# - Anthropic Claude SDK
# - OpenAI SDK
# - Supabase client
# - Clerk
# - BullMQ
# - And ~50 other packages

# Expected install time: 2-3 minutes
```

**Common Issues:**
- **Error: "Node version mismatch"** → Upgrade to Node 20+
- **Error: "EACCES permission denied"** → Use `sudo npm install` or fix npm permissions
- **Warning about deprecated packages** → Ignore for now (will be fixed in future updates)

---

## Step 3: Configure Environment Variables

### 3a. Copy Template
```bash
cp .env.example .env.local
```

### 3b. Edit .env.local
Open `.env.local` in your editor and fill in your API keys:

#### Database (Supabase)
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGci...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGci...
```
👉 Get these from: Supabase Dashboard → Project Settings → API

#### Authentication (Clerk)
```bash
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
```
👉 Get these from: Clerk Dashboard → API Keys

#### AI Services
```bash
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-proj-...
```
👉 Get these from respective dashboards

#### SignalWire (Calls & SMS)
```bash
SIGNALWIRE_PROJECT_ID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
SIGNALWIRE_API_TOKEN=PTxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SIGNALWIRE_SPACE_URL=yourspace.signalwire.com
SIGNALWIRE_PHONE_NUMBER=+1xxxxxxxxxx
```
👉 Get these from: SignalWire Dashboard → API

#### Redis (Upstash)
```bash
REDIS_URL=rediss://default:password@your-redis.upstash.io:6379
```
👉 Get this from: Upstash Dashboard → Your Redis → REST API

#### Email (SendGrid)
```bash
SENDGRID_API_KEY=SG.xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
SENDGRID_FROM_EMAIL=noreply@yourdomain.com  # Must be verified in SendGrid
SENDGRID_FROM_NAME=LeadFlip
```
👉 Get API key from: SendGrid Dashboard → Settings → API Keys

#### Application URLs
```bash
NEXT_PUBLIC_APP_URL=http://localhost:3002
WEBSOCKET_SERVER_URL=ws://localhost:8080
NODE_ENV=development
```
👉 Use these defaults for local development

### 3c. Verify Configuration
```bash
# Check if .env.local exists and has content
cat .env.local | grep -E "^[A-Z_]+=" | wc -l
# Should show: 20+ (number of configured variables)

# Ensure .env.local is NOT tracked by git
git status .env.local
# Should show: "Untracked" or not listed
```

---

## Step 4: Setup Database (Supabase)

⚠️ **CRITICAL STEP** - The app will not work without this.

### Option A: Supabase Dashboard (Recommended for First Time)

1. Go to your Supabase project dashboard
2. Click **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open migration files in order and run each:

**Migration Order:**
```sql
-- 1. Run: supabase/migrations/20250930000000_initial_schema.sql
-- (Creates tables, enables PostGIS)

-- 2. Run: supabase/migrations/20250930000001_database_functions.sql
-- (Creates utility functions)

-- 3. Run: supabase/migrations/20250930000003_fix_user_id_type_final.sql
-- (Fixes user_id type to UUID)

-- 4. Run: supabase/migrations/20251001000001_fix_schema_mismatches.sql
-- (CRITICAL - fixes column names to match code)

-- 5. Run: supabase/migrations/20250930000002_fix_schema_and_rls.sql
-- (Enhanced RLS policies)

-- 6. Run: supabase/migrations/20250930000002_prospective_businesses.sql
-- (Adds prospective businesses table)
```

5. After each migration, check for errors at the bottom of the SQL editor
6. If you see "Success. No rows returned", the migration worked!

**Detailed migration guide:** See [`DATABASE_MIGRATION_HISTORY.md`](./DATABASE_MIGRATION_HISTORY.md)

### Option B: Supabase CLI (Advanced)

```bash
# Install Supabase CLI
npm install -g supabase

# Link to your project (get project ref from Supabase dashboard URL)
supabase link --project-ref YOUR_PROJECT_REF

# Push all migrations
supabase db push

# Verify schema
supabase db diff
```

### Verify Database Setup
```bash
# Connect to Supabase and test
# (Replace with your database URL from .env.local)
psql "$DATABASE_URL" -c "SELECT table_name FROM information_schema.tables WHERE table_schema='public';"

# Should list: users, leads, businesses, matches, calls, conversions, prospective_businesses
```

---

## Step 5: Understand Current Blockers

⚠️ Before attempting to run the app, know these blockers exist:

### Blocker 1: Build Failure (CRITICAL)
**Error:** "server-only cannot be imported from a Client Component"
**File:** `src/lib/auth/admin.ts`
**Impact:** `npm run build` fails, cannot deploy

**What This Means:**
- You can edit code, but build will fail
- Development server won't start
- Wait for Agent 1 (Build Fix) or manually fix

**Quick Fix (Advanced):**
```bash
# If you want to fix manually:
# 1. Move server functions from src/lib/auth/admin.ts to tRPC endpoint
# 2. Update src/components/admin/user-management.tsx to call API instead of direct import
# See: END_TO_END_TESTING_REPORT.md for detailed fix instructions
```

### Blocker 2: WebSocket Server Not Deployed
**Impact:** AI calling system won't work
**What This Means:**
- Lead submission/matching should work (once build is fixed)
- AI calls will fail (no WebSocket server running)
- Need to deploy to Railway or Fly.io

---

## Step 6: Try Running Dev Server (Expected to Fail)

```bash
npm run dev
```

**Expected Output:**
```
> leadflip@0.1.0 dev
> next dev -p 3002

   ▲ Next.js 15.2.3
   - Local:        http://localhost:3002
   - Environments: .env.local

 ✓ Ready in 2.5s
 ○ Compiling / ...

❌ Failed to compile.

./src/lib/auth/admin.ts
'server-only' cannot be imported from a Client Component module.
```

**This is expected!** Don't panic. This is a known issue being fixed by Agent 1.

---

## Step 7: Explore Codebase While Waiting

While blockers are being fixed, familiarize yourself with the code:

### Key Directories
```
LeadFlip/
├── src/
│   ├── app/                    # Next.js app router (pages)
│   │   ├── api/               # API routes
│   │   ├── consumer/          # Consumer portal
│   │   ├── business/          # Business portal
│   │   └── admin/             # Admin dashboard
│   ├── components/            # React components
│   ├── lib/
│   │   ├── agents/           # AI agent implementations ⭐
│   │   ├── auth/             # Authentication logic
│   │   ├── sms/              # SMS notifications
│   │   └── email/            # Email templates
│   ├── server/
│   │   ├── routers/          # tRPC API endpoints
│   │   ├── workers/          # BullMQ job workers
│   │   └── websocket-server.ts  # WebSocket server (for AI calls)
│   └── types/                # TypeScript type definitions
├── .claude/
│   └── agents/               # AI agent system prompts ⭐
├── supabase/
│   └── migrations/           # Database migrations
└── tests/                    # Test files (currently empty)
```

### Important Files to Read
1. **`CLAUDE.md`** - Complete architecture documentation
2. **`END_TO_END_TESTING_REPORT.md`** - Detailed audit findings
3. **`SUBAGENT_SHARED_SPEC.md`** - Agent task assignments
4. **`src/lib/agents/main-orchestrator.ts`** - Main AI agent logic

---

## Step 8: Run Tests (After Agent 3 Completes)

Currently, no tests exist (0% coverage). Once Agent 3 creates the test suite:

```bash
# Run all tests
npm run test

# Run specific test suite
npm run test:agents         # AI agent tests
npm run test:integration    # Integration tests

# Run with coverage
npm run test:coverage
```

---

## Step 9: Monitor Agent Progress

Check the status of parallel agents fixing blockers:

```bash
# Check if build fix is complete
npm run build

# If successful, start dev server
npm run dev
```

**Agent Status Tracking:**
- Agent 1 (Build Fix): `BUILD_FIX_AGENT_COMPLETION_REPORT.md`
- Agent 2 (Database): `DATABASE_AGENT_COMPLETION_REPORT.md`
- Agent 3 (Testing): `TESTING_AGENT_COMPLETION_REPORT.md`
- Agent 4 (Documentation): `DOCUMENTATION_AGENT_COMPLETION_REPORT.md` (this doc)
- Agent 5 (WebSocket): `WEBSOCKET_DEPLOYMENT_AGENT_COMPLETION_REPORT.md`

---

## Common Commands Reference

```bash
# Development
npm run dev              # Start dev server (port 3002)
npm run build            # Build for production (currently fails)
npm run start            # Start production server (after build)

# Database
npx supabase db push     # Apply migrations
npx supabase db diff     # Check schema differences
npx supabase db reset    # Reset database (WARNING: deletes data)

# Testing (once tests exist)
npm run test             # Run all tests
npm run test:agents      # Test AI agents
npm run test:integration # Integration tests
npm run test:e2e         # End-to-end tests

# Workers (separate processes)
npm run websocket-server # Start WebSocket server (port 8080)
npm run worker           # Start BullMQ job worker

# Code Quality
npm run lint             # Run ESLint
npm run type-check       # TypeScript type checking
```

---

## Next Steps After Blockers Fixed

Once all 5 agents complete their tasks:

1. **Verify Build Works**
   ```bash
   npm run build
   # Should complete without errors
   ```

2. **Start Development**
   ```bash
   # Terminal 1: Main app
   npm run dev

   # Terminal 2: WebSocket server (for AI calls)
   npm run websocket-server

   # Terminal 3: Job worker (for background tasks)
   npm run worker
   ```

3. **Test Basic Flows**
   - Visit http://localhost:3002
   - Sign up as consumer
   - Submit test lead
   - Check database for created lead
   - Sign up as business
   - View matched leads

4. **Run Test Suite**
   ```bash
   npm run test
   # Should show >30% coverage
   ```

5. **Start Building Features**
   - Pick a task from GitHub Issues
   - Create feature branch
   - Write tests first (TDD)
   - Implement feature
   - Submit PR

---

## Getting Help

### Documentation
- **Architecture:** `CLAUDE.md`
- **API Reference:** `API_DOCUMENTATION.md` (coming soon)
- **Testing Guide:** `TESTING.md`
- **Deployment:** `DEPLOYMENT.md`

### Common Issues
See [`README.md`](./README.md#common-issues--solutions) for troubleshooting.

### Ask Questions
- GitHub Issues: https://github.com/CaptainPhantasy/LeadFlip/issues
- Project Owner: Douglas Talley ([@CaptainPhantasy](https://github.com/CaptainPhantasy))

---

## Appendix: Environment Variables Quick Reference

| Variable | Service | Required | Where to Get |
|----------|---------|----------|--------------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase | ✅ Yes | Dashboard → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase | ✅ Yes | Dashboard → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase | ✅ Yes | Dashboard → Settings → API |
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | Clerk | ✅ Yes | Dashboard → API Keys |
| `CLERK_SECRET_KEY` | Clerk | ✅ Yes | Dashboard → API Keys |
| `ANTHROPIC_API_KEY` | Anthropic | ✅ Yes | Console → API Keys |
| `OPENAI_API_KEY` | OpenAI | ✅ Yes | Platform → API Keys |
| `SIGNALWIRE_PROJECT_ID` | SignalWire | ✅ Yes | Dashboard → API |
| `SIGNALWIRE_API_TOKEN` | SignalWire | ✅ Yes | Dashboard → API |
| `SIGNALWIRE_SPACE_URL` | SignalWire | ✅ Yes | Dashboard → API |
| `SIGNALWIRE_PHONE_NUMBER` | SignalWire | ✅ Yes | Dashboard → Phone Numbers |
| `REDIS_URL` | Upstash | ✅ Yes | Dashboard → REST API |
| `SENDGRID_API_KEY` | SendGrid | ✅ Yes | Dashboard → API Keys |
| `SENDGRID_FROM_EMAIL` | SendGrid | ✅ Yes | Must verify sender |
| `GOOGLE_PLACES_API_KEY` | Google Cloud | ❌ No | Console → APIs & Services |
| `SLACK_BOT_TOKEN` | Slack | ❌ No | App → OAuth & Permissions |

---

**Last Updated:** October 1, 2025 at 8:35 PM EDT
**Agent:** Documentation Agent (Agent 4)

<!-- [2025-10-01 8:35 PM] Documentation Agent: Created quick start guide for new developers -->
