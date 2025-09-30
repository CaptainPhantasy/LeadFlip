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
- **Call Agent** - Makes autonomous AI calls via OpenAI Realtime API + Twilio
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
- MCP servers (Postgres, Twilio, Slack)
- BullMQ + Redis for call queue
- WebSocket server (Railway) for Twilio ↔ OpenAI bridge
- OpenAI Realtime API for voice I/O
- Claude Sonnet 4.5 for reasoning

## Project Status

🚧 **In Development** - Phase 1: Foundation

See `CLAUDE.md` for complete architecture documentation.

## Setup

### Prerequisites

- Node.js 20+
- OpenAI API key (with Realtime API access)
- Anthropic API key (Claude Sonnet 4.5)
- Twilio account (submit A2P registration ASAP - takes 1-2 weeks)
- Supabase project
- Clerk account
- Upstash Redis account

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Add your API keys to .env.local

# Run database migrations
npx supabase db push

# Start development server
npm run dev
```

### Critical Deployment Constraints

⚠️ **WebSocket server MUST run on persistent infrastructure (Railway/Fly.io), NOT Vercel**

- Frontend + API Routes → Vercel ✅
- WebSocket Server → Railway ✅
- BullMQ Worker → Railway ✅

## Development Roadmap

- **Phase 1 (Weeks 1-4):** Foundation - Next.js + Supabase + Clerk + Agent SDK setup
- **Phase 2 (Weeks 5-8):** Agent Architecture - Build all subagents + MCP servers
- **Phase 3 (Weeks 9-12):** Call Integration - WebSocket server + Twilio + OpenAI
- **Phase 4 (Weeks 13-16):** Learning & Optimization - CLAUDE.md memory system
- **Phase 5 (Weeks 17-20):** Beta Launch - Real users + feedback

## Cost Management

**Per-Call Economics:**
- Twilio: $0.042/call (3 min avg)
- OpenAI Realtime: $0.90/call
- Claude reasoning: $0.03/call
- **Total: ~$0.97/call**

**Agent SDK Optimizations:**
- Prompt caching: 90% cost reduction
- Context compaction: 60-80% savings on long tasks
- Subagent isolation: 50% reduction vs monolithic prompts
- **Total savings: 82%** vs direct API calls

## License

Proprietary - All rights reserved

## Contact

Douglas Talley - [GitHub](https://github.com/CaptainPhantasy)
