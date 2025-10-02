# LeadFlip Deployment Guide

**Last Updated**: October 1, 2025
**Target Audience**: DevOps engineers, developers deploying to production

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Prerequisites](#prerequisites)
4. [Environment Variables](#environment-variables)
5. [Deployment Steps](#deployment-steps)
6. [Platform-Specific Guides](#platform-specific-guides)
7. [Post-Deployment Verification](#post-deployment-verification)
8. [Monitoring & Maintenance](#monitoring--maintenance)
9. [Troubleshooting](#troubleshooting)
10. [Cost Estimates](#cost-estimates)

---

## Overview

LeadFlip is a multi-component application requiring deployment across different platforms:

| Component | Platform | Reason |
|-----------|----------|--------|
| **Next.js Frontend + API Routes** | Vercel | Serverless, auto-scaling, CDN |
| **WebSocket Server** | Railway/Fly.io | Persistent connections required |
| **BullMQ Workers** | Railway/Fly.io | Long-running processes |
| **Database** | Supabase | Managed PostgreSQL with PostGIS |
| **Redis Queue** | Upstash | Serverless Redis for BullMQ |

**Critical Constraint**: WebSocket server and workers CANNOT run on Vercel (serverless incompatible).

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      PRODUCTION ARCHITECTURE                │
└─────────────────────────────────────────────────────────────┘

                    ┌──────────────┐
                    │   Vercel     │
                    │  (Frontend)  │
                    │  Next.js API │
                    └──────┬───────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
   ┌────▼────┐      ┌─────▼──────┐    ┌─────▼──────┐
   │Supabase │      │   Upstash  │    │  Twilio    │
   │ (DB)    │      │  (Redis)   │    │  (Calls)   │
   └─────────┘      └─────┬──────┘    └──────┬─────┘
                          │                   │
                    ┌─────▼──────┐     ┌─────▼────────┐
                    │  Railway/  │     │  Railway/    │
                    │   Fly.io   │     │   Fly.io     │
                    │  (Worker)  │     │ (WebSocket)  │
                    └────────────┘     └──────┬───────┘
                                              │
                                       ┌──────▼──────┐
                                       │   OpenAI    │
                                       │  Realtime   │
                                       └─────────────┘
```

---

## Prerequisites

### Required Accounts

- [x] **Vercel** (frontend deployment) - Free tier OK for development
- [x] **Railway** OR **Fly.io** (persistent servers) - ~$10-20/month
- [x] **Supabase** (database) - Already configured
- [x] **Upstash** (Redis) - Already configured
- [x] **Clerk** (authentication) - Already configured
- [x] **Anthropic** (Claude API) - Already configured
- [x] **OpenAI** (Realtime API) - Already configured
- [x] **Twilio** (telephony) - Already configured
- [x] **SendGrid** OR **Mailgun** (email) - Need to configure

### Required Tools

```bash
# Node.js 20+
node --version  # Should be v20.x or higher

# Docker (for local testing)
docker --version

# Railway CLI (if using Railway)
npm install -g @railway/cli

# Fly.io CLI (if using Fly.io)
curl -L https://fly.io/install.sh | sh

# Vercel CLI (optional, for manual deploys)
npm install -g vercel
```

---

## Environment Variables

### Complete Variable List

See `.env.example` for the complete list with descriptions.

#### Required for Core Functionality

```bash
# Database
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Authentication
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# AI Services
ANTHROPIC_API_KEY=
OPENAI_API_KEY=

# Application
NEXT_PUBLIC_APP_URL=
NODE_ENV=production
```

#### Required for AI Calling Feature

```bash
# Twilio
TWILIO_ACCOUNT_SID=
TWILIO_AUTH_TOKEN=
TWILIO_PHONE_NUMBER=
TWILIO_TWIML_APP_SID=

# Redis
REDIS_URL=

# WebSocket
WEBSOCKET_SERVER_URL=
WEBSOCKET_PORT=8080
```

#### Required for Notifications

```bash
# SendGrid (or Mailgun)
SENDGRID_API_KEY=
SENDGRID_FROM_EMAIL=
SENDGRID_FROM_NAME=
```

---

## Deployment Steps

### Step 1: Deploy Database Migrations

**CRITICAL**: Must be done before deploying any services.

```bash
# Option 1: Via Supabase Dashboard (Recommended)
# 1. Go to https://app.supabase.com/project/YOUR_PROJECT/sql
# 2. Copy contents of supabase/migrations/20251001000001_fix_schema_mismatches.sql
# 3. Paste and run in SQL Editor
# 4. Verify success (check for errors)

# Option 2: Via Supabase CLI (if installed)
supabase db push
```

**Verification**:
```sql
-- Run in Supabase SQL Editor to verify tables exist
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public';
```

### Step 2: Deploy WebSocket Server

**CRITICAL**: Must complete before AI calling will work.

#### Using Automated Script

```bash
cd /Volumes/Storage/Development/LeadFlip

# Run deployment script
./scripts/deploy-websocket.sh

# Follow prompts to select Railway or Fly.io
```

#### Manual Railway Deployment

```bash
# Install Railway CLI
npm install -g @railway/cli

# Login
railway login

# Create new project (first time only)
railway init

# Deploy websocket service
railway up -d Dockerfile.websocket

# Set environment variables in Railway dashboard:
# - OPENAI_API_KEY
# - ANTHROPIC_API_KEY
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - WEBSOCKET_PORT=8080
# - NODE_ENV=production

# Generate domain
railway domain

# Copy the generated URL (e.g., leadflip-websocket.railway.app)
```

#### Manual Fly.io Deployment

```bash
# Install Fly CLI
curl -L https://fly.io/install.sh | sh

# Login
fly auth login

# Deploy (uses fly.websocket.toml)
fly deploy -c fly.websocket.toml

# Set secrets
fly secrets set OPENAI_API_KEY=sk-...
fly secrets set ANTHROPIC_API_KEY=sk-ant-...
fly secrets set NEXT_PUBLIC_SUPABASE_URL=https://...
fly secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# Get deployment URL
fly info
```

**Important**: Copy the WebSocket server URL for use in next steps.

### Step 3: Deploy BullMQ Worker

#### Using Automated Script

```bash
./scripts/deploy-worker.sh

# Follow prompts
```

#### Manual Railway Deployment

```bash
# Create new service in existing project
railway service create leadflip-worker

# Deploy worker
railway up -d Dockerfile.worker

# Set environment variables in Railway dashboard:
# - REDIS_URL (from Upstash)
# - TWILIO_ACCOUNT_SID
# - TWILIO_AUTH_TOKEN
# - TWILIO_PHONE_NUMBER
# - NEXT_PUBLIC_SUPABASE_URL
# - NEXT_PUBLIC_SUPABASE_ANON_KEY
# - WEBSOCKET_SERVER_URL (from Step 2)
# - NEXT_PUBLIC_APP_URL (will set after Vercel deploy)
# - NODE_ENV=production
```

#### Manual Fly.io Deployment

```bash
fly deploy -c fly.worker.toml

# Set secrets (same as Railway list above)
fly secrets set REDIS_URL=rediss://...
fly secrets set TWILIO_ACCOUNT_SID=AC...
# ... etc
```

### Step 4: Configure SendGrid/Mailgun

**Option A: SendGrid**

```bash
# 1. Sign up at https://sendgrid.com
# 2. Create API key: Settings > API Keys > Create API Key
# 3. Verify sender email: Settings > Sender Authentication
# 4. Add to environment variables:
SENDGRID_API_KEY=SG.your-key
SENDGRID_FROM_EMAIL=noreply@yourdomain.com
SENDGRID_FROM_NAME=LeadFlip
```

**Option B: Mailgun**

```bash
# 1. Sign up at https://mailgun.com
# 2. Add domain: Sending > Domains > Add New Domain
# 3. Verify DNS records
# 4. Get API key from Settings > API Keys
MAILGUN_API_KEY=your-key
MAILGUN_DOMAIN=mg.yourdomain.com
```

### Step 5: Deploy Next.js App to Vercel

#### Via GitHub (Recommended)

```bash
# 1. Push code to GitHub
git push origin main

# 2. Go to https://vercel.com/new
# 3. Import your GitHub repository
# 4. Configure environment variables (see below)
# 5. Deploy
```

#### Via Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
vercel --prod

# Set environment variables
vercel env add NEXT_PUBLIC_SUPABASE_URL
vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
vercel env add SUPABASE_SERVICE_ROLE_KEY
vercel env add NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY
vercel env add CLERK_SECRET_KEY
vercel env add ANTHROPIC_API_KEY
vercel env add OPENAI_API_KEY
vercel env add TWILIO_ACCOUNT_SID
vercel env add TWILIO_AUTH_TOKEN
vercel env add TWILIO_PHONE_NUMBER
vercel env add SENDGRID_API_KEY
vercel env add SENDGRID_FROM_EMAIL
vercel env add SENDGRID_FROM_NAME
vercel env add REDIS_URL
vercel env add WEBSOCKET_SERVER_URL  # From Step 2
vercel env add NEXT_PUBLIC_APP_URL  # Your Vercel domain

# Redeploy with env vars
vercel --prod
```

**Important**: Copy your Vercel URL and update worker's `NEXT_PUBLIC_APP_URL` variable.

### Step 6: Update Worker with Vercel URL

```bash
# Railway
railway variables set NEXT_PUBLIC_APP_URL=https://your-app.vercel.app

# Fly.io
fly secrets set NEXT_PUBLIC_APP_URL=https://your-app.vercel.app
```

### Step 7: Configure Twilio TwiML App

```bash
# 1. Go to Twilio Console > Voice > TwiML Apps
# 2. Create new TwiML App
# 3. Set Voice Request URL: https://your-app.vercel.app/api/twiml/call/[callId]
# 4. Set Voice Fallback URL: https://your-app.vercel.app/api/twiml/fallback
# 5. Set Status Callback URL: https://your-app.vercel.app/api/webhooks/twilio/status
# 6. Save and copy the TwiML App SID

# Add to environment variables
vercel env add TWILIO_TWIML_APP_SID
# Paste the App SID

# Update Railway/Fly.io worker as well
railway variables set TWILIO_TWIML_APP_SID=APxxxxx
```

---

## Platform-Specific Guides

### Railway Deployment

**Advantages**:
- Simpler than Fly.io
- Better UI for beginners
- Automatic SSL certificates
- Built-in monitoring

**Cost**: ~$10-20/month for both services

**Configuration**: See `railway.json`

**Scaling**:
```json
{
  "websocket-server": {
    "scale": {
      "minInstances": 1,
      "maxInstances": 3
    }
  }
}
```

### Fly.io Deployment

**Advantages**:
- More control over infrastructure
- Better for high traffic
- Global edge network
- Cheaper at scale

**Cost**: ~$5-15/month for both services

**Configuration**: See `fly.websocket.toml` and `fly.worker.toml`

**Scaling**:
```bash
# Scale websocket server
fly scale count 3 --config fly.websocket.toml

# Scale worker
fly scale count 5 --config fly.worker.toml
```

### Vercel Deployment

**Advantages**:
- Zero config for Next.js
- Automatic preview deployments
- Built-in analytics
- Free SSL certificates

**Cost**: Free tier sufficient for MVP, Pro ($20/mo) for production

**Limits**:
- 10-second serverless function timeout (sufficient for AI API calls)
- No persistent connections (why we use Railway/Fly.io for WebSocket)

---

## Post-Deployment Verification

### Automated Health Check

```bash
# Run comprehensive health check
./scripts/health-check.sh
```

### Manual Verification

#### 1. WebSocket Server Health

```bash
# Replace with your actual WebSocket URL
curl https://leadflip-websocket.railway.app/health

# Expected response:
# {"status":"healthy","activeCalls":0,"uptime":123}
```

#### 2. Worker Status

```bash
# Railway
railway logs --service leadflip-worker

# Fly.io
fly logs --config fly.worker.toml

# Look for: "🚀 Call worker started"
```

#### 3. Database Connection

```sql
-- Run in Supabase SQL Editor
SELECT COUNT(*) FROM businesses;
SELECT COUNT(*) FROM leads;
```

#### 4. End-to-End Test

```bash
# 1. Open your Vercel app: https://your-app.vercel.app
# 2. Sign up as a consumer
# 3. Submit a test lead
# 4. Check Supabase: lead should appear in `leads` table
# 5. Check logs: should see classification + matching activity
```

#### 5. AI Calling Test (After Track 3 Complete)

```bash
# 1. Sign up as a business
# 2. Wait for lead match notification (email/SMS)
# 3. Click "Request AI Call"
# 4. Check worker logs: should see job processing
# 5. Answer phone call: should hear AI assistant
```

---

## Monitoring & Maintenance

### Logging

**Vercel**:
```bash
# View real-time logs
vercel logs --follow
```

**Railway**:
```bash
railway logs --follow
```

**Fly.io**:
```bash
fly logs --config fly.websocket.toml
fly logs --config fly.worker.toml
```

### Metrics

**WebSocket Server**:
- Active connections: Check `/health` endpoint
- Response time: Twilio Media Streams analytics
- Error rate: Check logs for exceptions

**Worker**:
- Queue depth: Monitor Redis in Upstash dashboard
- Processing rate: Check worker logs
- Failed jobs: BullMQ retries (check logs)

### Alerts

**Recommended Monitoring**:
- Uptime monitoring: UptimeRobot, Better Uptime
- Error tracking: Sentry (optional)
- Cost alerts: Railway/Fly.io dashboard

**Setup Sentry (Optional)**:
```bash
npm install @sentry/nextjs

# Add to .env
SENTRY_DSN=https://your-sentry-dsn

# Initialize in app
# See: https://docs.sentry.io/platforms/javascript/guides/nextjs/
```

### Database Backups

Supabase automatically backs up your database daily. To create manual backup:

```bash
# Via Supabase CLI
supabase db dump -f backup-$(date +%Y%m%d).sql

# Or via dashboard: Database > Backups > Create Backup
```

---

## Troubleshooting

### WebSocket Server Issues

**Problem**: WebSocket connections timeout after 30 seconds

**Solution**:
```bash
# Verify health endpoint
curl https://your-websocket-url.com/health

# Check logs for errors
railway logs --service websocket-server

# Common causes:
# - OPENAI_API_KEY not set
# - ANTHROPIC_API_KEY not set
# - Insufficient memory (increase to 1GB)
```

**Problem**: "Error: connect ECONNREFUSED"

**Solution**: WebSocket server not running. Check deployment status in Railway/Fly.io dashboard.

### Worker Issues

**Problem**: Jobs not processing

**Solution**:
```bash
# Check worker is running
railway logs --service leadflip-worker

# Verify Redis connection
# Login to Upstash dashboard > View connection string

# Check queue in Redis
redis-cli -u $REDIS_URL
LLEN bull:calls:wait  # Should show pending jobs
```

**Problem**: Calls failing immediately

**Solution**:
```bash
# Check Twilio credentials
curl -u $TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN \
  https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json

# Verify TwiML endpoint is accessible
curl https://your-app.vercel.app/api/twiml/call/test-id
```

### Database Issues

**Problem**: "relation does not exist"

**Solution**: Migrations not applied. Run migrations manually in Supabase SQL editor.

**Problem**: "column does not exist"

**Solution**: Schema mismatch. Verify migration `20251001000001_fix_schema_mismatches.sql` was applied.

### Performance Issues

**Problem**: Slow API responses

**Solution**:
```bash
# Check Vercel function execution time
# Dashboard > Analytics > Functions

# If > 5 seconds, optimize:
# 1. Add caching
# 2. Reduce AI prompt size
# 3. Use Claude Haiku instead of Sonnet for simple tasks
```

**Problem**: High AI costs

**Solution**:
```bash
# Monitor costs in Anthropic/OpenAI dashboards
# Implement rate limiting
# Use prompt caching (already implemented in Agent SDK)
# Set hard limits:
# - Anthropic: Set spending limit in dashboard
# - OpenAI: Set hard limit in usage settings
```

---

## Cost Estimates

### Development/MVP (< 100 users)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | Free | Hobby tier |
| Railway (2 services) | $10/mo | 512MB each |
| Supabase | Free | Up to 500MB DB |
| Upstash Redis | Free | Up to 10K commands/day |
| Clerk | Free | Up to 5K MAU |
| Anthropic | $50/mo | ~1,000 lead classifications |
| OpenAI | $30/mo | ~30 AI calls (3 min avg) |
| Twilio | $10/mo | ~30 AI calls |
| SendGrid | Free | Up to 100 emails/day |
| **Total** | **~$100/mo** | |

### Production (1,000 active users)

| Service | Cost | Notes |
|---------|------|-------|
| Vercel | $20/mo | Pro tier |
| Railway | $50/mo | 1GB instances, 5 total |
| Supabase | $25/mo | Pro tier |
| Upstash Redis | $10/mo | Pro tier |
| Clerk | $25/mo | Up to 10K MAU |
| Anthropic | $500/mo | ~10,000 classifications |
| OpenAI | $300/mo | ~300 AI calls |
| Twilio | $100/mo | ~300 AI calls + SMS |
| SendGrid | $20/mo | Up to 40K emails/mo |
| **Total** | **~$1,050/mo** | |

### Cost Optimization Tips

1. **Use Claude Haiku** for simple classifications ($0.25/MTok vs $3/MTok for Sonnet)
2. **Implement prompt caching** (already done via Agent SDK)
3. **Batch AI operations** where possible
4. **Set spending limits** in all AI provider dashboards
5. **Monitor queue depth** to prevent runaway worker costs
6. **Use free tier email** (SendGrid 100/day) for development

---

## Security Checklist

- [ ] All secrets stored in platform environment variables (never in code)
- [ ] `.env.local` added to `.gitignore`
- [ ] Supabase RLS policies enabled (if migrating from service role key)
- [ ] Clerk webhook signing secret configured
- [ ] Twilio webhook signatures verified (in TwiML endpoint)
- [ ] CORS configured correctly in Next.js
- [ ] HTTPS enforced (automatic with Vercel/Railway/Fly.io)
- [ ] API rate limiting implemented (optional for MVP)
- [ ] Sentry error tracking configured (optional)

---

## Rollback Procedure

If deployment fails:

```bash
# Vercel: Rollback to previous deployment
vercel rollback

# Railway: Rollback to previous deployment
railway rollback

# Fly.io: List releases and rollback
fly releases --config fly.websocket.toml
fly deploy --image registry.fly.io/your-app:deployment-123

# Database: Restore from backup
# Supabase Dashboard > Database > Backups > Restore
```

---

## Next Steps After Deployment

1. **Test all features** with real users
2. **Monitor costs** daily for first week
3. **Set up alerts** for errors and downtime
4. **Enable Sentry** for error tracking
5. **Configure custom domain** in Vercel
6. **Set up CI/CD** for automated deployments
7. **Document runbooks** for common issues

---

## Support & Resources

- **LeadFlip Documentation**: See `CLAUDE.md`
- **Railway Docs**: https://docs.railway.app
- **Fly.io Docs**: https://fly.io/docs
- **Vercel Docs**: https://vercel.com/docs
- **Supabase Docs**: https://supabase.com/docs
- **BullMQ Docs**: https://docs.bullmq.io

---

**Deployment Version**: 1.0
**Last Updated**: October 1, 2025
**Maintained By**: LeadFlip DevOps Team
