# LeadFlip WebSocket Server - Complete Deployment Guide

**Last Updated:** October 1, 2025
**Status:** Ready for Production Deployment
**Critical:** This server MUST run on persistent infrastructure (Railway or Fly.io), NOT Vercel

---

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Platform Comparison: Railway vs Fly.io](#platform-comparison-railway-vs-flyio)
4. [Deployment Option 1: Railway](#deployment-option-1-railway)
5. [Deployment Option 2: Fly.io](#deployment-option-2-flyio)
6. [Post-Deployment Testing](#post-deployment-testing)
7. [Monitoring & Logging](#monitoring--logging)
8. [Troubleshooting](#troubleshooting)
9. [Cost Analysis](#cost-analysis)

---

## Overview

The LeadFlip WebSocket server handles real-time audio streaming between SignalWire (telephony provider) and OpenAI Realtime API for AI-powered voice calls. It bridges the gap between phone calls and AI conversation.

### Architecture Flow

```
SignalWire (Phone Call)
        ↓
    WebSocket
        ↓
LeadFlip WebSocket Server (Railway/Fly.io)
        ↓
    WebSocket
        ↓
OpenAI Realtime API
        ↓
Claude API (for reasoning)
```

### Key Features

- **Real-time audio streaming**: <500ms round-trip latency target
- **Persistent connections**: WebSocket sessions last the duration of phone calls (1-10 minutes)
- **Automatic failover**: Health checks and auto-restart on failure
- **Graceful shutdown**: Properly ends active calls before shutdown
- **Call recording**: Stores transcripts and audio buffers

### Why Not Vercel?

Vercel functions have a **10-second maximum execution time** for Hobby tier and **300 seconds for Pro**. Phone calls can last 5-10 minutes, requiring persistent infrastructure. Additionally, WebSocket connections need stable long-running processes.

---

## Prerequisites

### Required Accounts

1. **SignalWire Account** (already configured)
   - Project ID: `2f9ce47f-c556-4cf2-803c-2b1525b35b34`
   - Phone: `+18888915040`
   - Space URL: `legacyai.signalwire.com`

2. **OpenAI Account** (Realtime API access)
   - API key with Realtime API enabled
   - Usage tier: Tier 1+ recommended

3. **Anthropic Account** (Claude API)
   - API key for reasoning during calls

4. **Supabase Account** (database)
   - Project URL: `https://plmnuogbbkgsatfmkyxm.supabase.co`

5. **Deployment Platform** (choose one):
   - **Railway Account** (recommended for ease of use)
   - **Fly.io Account** (recommended for cost optimization)

### Required Environment Variables

The following environment variables are **REQUIRED** for the WebSocket server:

| Variable | Description | Example |
|----------|-------------|---------|
| `WEBSOCKET_PORT` | Port for WebSocket server | `8080` |
| `NODE_ENV` | Environment | `production` |
| `OPENAI_API_KEY` | OpenAI API key | `sk-...` |
| `ANTHROPIC_API_KEY` | Claude API key | `sk-ant-...` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL | `https://xxx.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key | `eyJhbGci...` |
| `SIGNALWIRE_PROJECT_ID` | SignalWire project ID | `2f9ce47f-...` |
| `SIGNALWIRE_API_TOKEN` | SignalWire API token | `PT2ec5c1...` |
| `SIGNALWIRE_SPACE_URL` | SignalWire space URL | `legacyai.signalwire.com` |

### Required Tools

```bash
# Docker (for local testing)
docker --version  # Should be 20.10+

# Node.js (for local development)
node --version    # Should be 20.x

# Git (for version control)
git --version

# Choose ONE deployment CLI:
# Railway CLI
npm install -g @railway/cli

# OR Fly.io CLI
curl -L https://fly.io/install.sh | sh
```

---

## Platform Comparison: Railway vs Fly.io

### Railway

**Pros:**
- ✅ Extremely simple deployment (1-click from GitHub)
- ✅ Built-in environment variable management
- ✅ Automatic HTTPS with generated domains
- ✅ Great for beginners
- ✅ Real-time logs in dashboard
- ✅ Generous free tier ($5/month credit)

**Cons:**
- ❌ More expensive at scale ($0.20/GB RAM/month)
- ❌ Less control over infrastructure
- ❌ Limited to predefined regions

**Best For:** Quick deployment, teams new to infrastructure, startups

---

### Fly.io

**Pros:**
- ✅ More cost-effective at scale ($0.0000008/sec = $2.10/month for 1 VM)
- ✅ Global edge network (deploy closer to users)
- ✅ Better performance (can run in 30+ regions)
- ✅ More granular scaling control
- ✅ Free tier: 3 shared VMs with 256MB RAM

**Cons:**
- ❌ Steeper learning curve
- ❌ Requires CLI for most operations
- ❌ More manual configuration

**Best For:** Cost-conscious teams, global applications, developers comfortable with CLI

---

### Recommended Choice: Railway for MVP, Fly.io for Scale

**Phase 1 (MVP/Beta):** Use **Railway** for speed and simplicity
**Phase 2 (Production):** Migrate to **Fly.io** for cost optimization

**Estimated Monthly Costs:**
- Railway: $15-25/month (1-2 instances)
- Fly.io: $5-10/month (1-2 instances)

---

## Deployment Option 1: Railway

### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
railway --version
```

### Step 2: Login to Railway

```bash
railway login
```

This will open a browser for authentication.

### Step 3: Initialize Railway Project

From your project root (`/Volumes/Storage/Development/LeadFlip`):

```bash
# Create new Railway project
railway init

# Follow prompts:
# - Project name: leadflip-websocket
# - Environment: production
```

### Step 4: Link to Existing Project (if you already created one)

```bash
railway link
# Select your project from the list
```

### Step 5: Set Environment Variables

**Option A: Via CLI (recommended for sensitive values)**

```bash
railway variables set WEBSOCKET_PORT=8080
railway variables set NODE_ENV=production
railway variables set OPENAI_API_KEY=sk-your-key-here
railway variables set ANTHROPIC_API_KEY=sk-ant-your-key-here
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://plmnuogbbkgsatfmkyxm.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
railway variables set SIGNALWIRE_PROJECT_ID=2f9ce47f-c556-4cf2-803c-2b1525b35b34
railway variables set SIGNALWIRE_API_TOKEN=PT2ec5c1cb7098ec694e2825877b92d42e21386e16bebe831b
railway variables set SIGNALWIRE_SPACE_URL=legacyai.signalwire.com
```

**Option B: Via Dashboard**

1. Go to https://railway.app/dashboard
2. Select your project
3. Click "Variables" tab
4. Add each variable manually

### Step 6: Deploy Using Automated Script

```bash
# Run the deployment script
bash scripts/deploy-websocket.sh

# When prompted:
# 1. Choose option "1" for Railway
# 2. Select existing project or create new
# 3. Wait for deployment to complete
```

**Manual Deployment (Alternative):**

```bash
# Deploy using Dockerfile
railway up -d Dockerfile.websocket

# Check deployment status
railway status

# Get logs
railway logs
```

### Step 7: Get Your WebSocket URL

```bash
# Generate a public domain
railway domain

# Example output:
# leadflip-websocket-production.up.railway.app
```

Your WebSocket URL will be:
```
wss://leadflip-websocket-production.up.railway.app
```

### Step 8: Verify Deployment

```bash
# Test health check
curl https://leadflip-websocket-production.up.railway.app/health

# Expected response:
# {"status":"healthy","activeCalls":0,"uptime":123}
```

### Step 9: Configure Railway Settings

In Railway dashboard:

1. **Health Checks:**
   - Path: `/health`
   - Interval: 30s
   - Timeout: 5s
   - Already configured in `railway.json`

2. **Auto-Scaling:**
   - Min instances: 1
   - Max instances: 3
   - CPU threshold: 80%
   - Already configured in `railway.json`

3. **Restart Policy:**
   - Restart on failure: ✅ Enabled
   - Max retries: 3
   - Already configured in `railway.json`

### Step 10: Update Main Application

Add the WebSocket URL to your main Next.js app (Vercel):

```bash
# In Vercel dashboard, add environment variable:
WEBSOCKET_SERVER_URL=wss://leadflip-websocket-production.up.railway.app
```

---

## Deployment Option 2: Fly.io

### Step 1: Install Fly CLI

**macOS/Linux:**
```bash
curl -L https://fly.io/install.sh | sh
```

**Windows (PowerShell):**
```powershell
iwr https://fly.io/install.ps1 -useb | iex
```

Verify installation:
```bash
flyctl version
# or
fly version
```

### Step 2: Login to Fly.io

```bash
flyctl auth login
# or
fly auth login
```

### Step 3: Create Fly.io App

From your project root:

```bash
# Create app using existing config
flyctl launch --config fly.websocket.toml --no-deploy

# Follow prompts:
# - App name: leadflip-websocket (or auto-generated)
# - Region: iad (US East - closest to OpenAI/SignalWire)
# - Postgres: No (using Supabase)
# - Redis: No (using Upstash)
```

### Step 4: Set Secrets (Environment Variables)

```bash
# Set secrets (these are encrypted at rest)
flyctl secrets set \
  WEBSOCKET_PORT=8080 \
  NODE_ENV=production \
  OPENAI_API_KEY=sk-your-key-here \
  ANTHROPIC_API_KEY=sk-ant-your-key-here \
  NEXT_PUBLIC_SUPABASE_URL=https://plmnuogbbkgsatfmkyxm.supabase.co \
  NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key \
  SIGNALWIRE_PROJECT_ID=2f9ce47f-c556-4cf2-803c-2b1525b35b34 \
  SIGNALWIRE_API_TOKEN=PT2ec5c1cb7098ec694e2825877b92d42e21386e16bebe831b \
  SIGNALWIRE_SPACE_URL=legacyai.signalwire.com
```

**Alternative: Interactive Secret Setting**

```bash
# Set secrets one by one (more secure, no shell history)
flyctl secrets set OPENAI_API_KEY=
# Paste your key when prompted

flyctl secrets set ANTHROPIC_API_KEY=
# Paste your key when prompted
```

### Step 5: Deploy Using Automated Script

```bash
# Run the deployment script
bash scripts/deploy-websocket.sh

# When prompted:
# 1. Choose option "2" for Fly.io
# 2. Follow prompts to set secrets
# 3. Wait for deployment to complete
```

**Manual Deployment (Alternative):**

```bash
# Deploy using Dockerfile
flyctl deploy -c fly.websocket.toml

# Monitor deployment
flyctl logs
```

### Step 6: Get Your WebSocket URL

```bash
# Get app info
flyctl info

# Example output:
# Hostname: leadflip-websocket.fly.dev
```

Your WebSocket URL will be:
```
wss://leadflip-websocket.fly.dev
```

### Step 7: Verify Deployment

```bash
# Test health check
curl https://leadflip-websocket.fly.dev/health

# Expected response:
# {"status":"healthy","activeCalls":0,"uptime":123}

# Check logs
flyctl logs
```

### Step 8: Configure Fly.io Settings

The `fly.websocket.toml` already includes:

1. **Health Checks:**
   - HTTP check on `/health` every 30s
   - TCP check on port 8080 every 30s
   - Grace period: 10s

2. **Auto-Scaling:**
   - Min machines: 1
   - Max machines: 3
   - Configured in `[scaling]` section

3. **Resources:**
   - CPU: 1 shared core
   - RAM: 512 MB
   - Configured in `[[vm]]` section

4. **Always On:**
   - `auto_stop_machines = false` (keeps WebSocket connections alive)
   - `auto_start_machines = true` (auto-recovery)

### Step 9: Update Main Application

Add the WebSocket URL to your main Next.js app (Vercel):

```bash
# In Vercel dashboard, add environment variable:
WEBSOCKET_SERVER_URL=wss://leadflip-websocket.fly.dev
```

---

## Post-Deployment Testing

### Test 1: Health Check

```bash
# Railway
curl https://leadflip-websocket-production.up.railway.app/health

# Fly.io
curl https://leadflip-websocket.fly.dev/health

# Expected Response:
{
  "status": "healthy",
  "activeCalls": 0,
  "uptime": 123.456
}
```

### Test 2: WebSocket Connection

```bash
# Run automated test script
npm run test:websocket

# Or manually with custom URL:
npx tsx scripts/test-websocket-connection.ts wss://your-deployment-url
```

**Expected Output:**
```
🧪 WebSocket Connection Test Suite

📡 Target: wss://leadflip-websocket.fly.dev

Test 1: Basic WebSocket Connection...
✅ Connected in 145ms

Test 2: Health Check Endpoint...
✅ Health check passed in 89ms
   Status: healthy, Active calls: 0

Test 3: Simulated SignalWire Message...
   Sending mock SignalWire start event...
✅ Server responded in 234ms
   Response: {"event":"start","status":"processing"}

═══════════════════════════════════════════════════════════
                    TEST RESULTS
═══════════════════════════════════════════════════════════

1. ✅ Basic Connection (145ms)
   Connected successfully

2. ✅ Health Check (89ms)
   Server healthy - {"status":"healthy","activeCalls":0,"uptime":123}

3. ✅ SignalWire Message (234ms)
   Received response: start

═══════════════════════════════════════════════════════════
Summary: 3/3 tests passed
═══════════════════════════════════════════════════════════

🎉 All tests passed! WebSocket server is ready for deployment.
```

### Test 3: End-to-End Call Flow

**Prerequisites:**
- WebSocket server deployed
- Database migrations applied
- SignalWire configured

**Steps:**

1. **Queue a test call:**
   ```bash
   # In your main app (Vercel)
   npm run test:call-flow
   ```

2. **Monitor WebSocket logs:**
   ```bash
   # Railway
   railway logs

   # Fly.io
   flyctl logs
   ```

3. **Expected log sequence:**
   ```
   📞 New SignalWire connection established
   📞 Call started: CA1234567890
   🤖 Connected to OpenAI Realtime API
   🎤 User started speaking
   🎤 User stopped speaking
   User: Hello, I need help with plumbing
   ✅ Response completed
   📞 Call ended: CA1234567890
   📝 Transcript length: 452
   ✅ Call summary saved: goal_achieved
   ```

### Test 4: Latency Test

**Target Metrics:**
- SignalWire → WebSocket: <50ms
- WebSocket → OpenAI: <100ms
- OpenAI response: <200ms
- **Total round-trip: <500ms**

**Manual Test:**

```bash
# Use the latency test script
bash scripts/test-websocket-latency.sh wss://your-deployment-url

# Expected output:
# Connection latency: 45ms ✅
# Message round-trip: 178ms ✅
# Health check: 32ms ✅
# Total average: 85ms ✅
```

### Test 5: Load Test (Optional)

**For production readiness:**

```bash
# Install artillery (load testing tool)
npm install -g artillery

# Run load test (simulates 10 concurrent calls)
artillery run scripts/websocket-load-test.yml

# Expected results:
# - 0% connection failures
# - <500ms average latency
# - No memory leaks
```

---

## Monitoring & Logging

### Log Aggregation

#### Railway Logs

```bash
# Real-time logs
railway logs

# Filter by severity
railway logs --filter error

# Export logs (last 1000 lines)
railway logs --json > logs.json
```

#### Fly.io Logs

```bash
# Real-time logs
flyctl logs

# Follow logs (tail -f)
flyctl logs -f

# Filter by app instance
flyctl logs --app leadflip-websocket --instance abc123
```

### Error Tracking

**Recommended:** Integrate Sentry for error tracking

1. **Install Sentry:**
   ```bash
   npm install @sentry/node
   ```

2. **Add to WebSocket server:**
   ```typescript
   // src/server/websocket-server.ts
   import * as Sentry from '@sentry/node';

   Sentry.init({
     dsn: process.env.SENTRY_DSN,
     environment: process.env.NODE_ENV,
   });
   ```

3. **Set environment variable:**
   ```bash
   # Railway
   railway variables set SENTRY_DSN=your-sentry-dsn

   # Fly.io
   flyctl secrets set SENTRY_DSN=your-sentry-dsn
   ```

### Performance Monitoring

**Key Metrics to Track:**

1. **Active Connections**
   - Check `/health` endpoint
   - Alert if > 80% of max capacity

2. **Memory Usage**
   ```bash
   # Railway: Check dashboard
   # Fly.io:
   flyctl vm status
   ```

3. **CPU Usage**
   ```bash
   # Railway: Check dashboard
   # Fly.io:
   flyctl metrics
   ```

4. **Call Duration**
   - Track in Supabase `calls` table
   - Average should be 2-5 minutes

5. **Error Rate**
   - Track failed connections
   - Track OpenAI API errors
   - Alert if >5% error rate

### Alert Configuration

#### Railway Alerts (via Dashboard)

1. Go to Project Settings → Alerts
2. Configure:
   - CPU > 80% for 5 minutes
   - Memory > 85% for 5 minutes
   - Health check fails 3 times
   - Deployment fails

#### Fly.io Alerts (via CLI)

```bash
# Install Fly.io monitoring
flyctl extensions create fly-log-shipper

# Configure alerts (via fly.toml)
[alerts]
  [[alerts.rules]]
    name = "high-cpu"
    metric = "cpu_usage"
    threshold = 80
    duration = "5m"

  [[alerts.rules]]
    name = "health-check-fail"
    metric = "health_check_failures"
    threshold = 3
    duration = "2m"
```

### Log Rotation

**Railway:** Automatic (last 7 days retained)
**Fly.io:** Configure log shipping to external service

```bash
# Ship logs to Datadog/Logflare/etc
flyctl extensions create logflare
```

---

## Troubleshooting

### Issue 1: Connection Timeout (WebSocket won't connect)

**Symptoms:**
- WebSocket connection fails after 10-30 seconds
- Health check passes, but WS connection fails

**Diagnosis:**
```bash
# Test health check
curl https://your-deployment-url/health

# Test WebSocket with wscat
npm install -g wscat
wscat -c wss://your-deployment-url

# Check logs
railway logs  # or flyctl logs
```

**Solutions:**

1. **Check firewall settings:**
   ```bash
   # Railway: No action needed (auto-configured)

   # Fly.io: Verify port 8080 is exposed
   flyctl ips list
   ```

2. **Verify environment variables:**
   ```bash
   # Railway
   railway variables

   # Fly.io
   flyctl secrets list
   ```

3. **Check HTTPS/WSS:**
   - Ensure you're using `wss://` not `ws://`
   - Both platforms force HTTPS

---

### Issue 2: High Latency (>500ms round-trip)

**Symptoms:**
- Audio delays during calls
- Choppy voice quality
- User complaints about lag

**Diagnosis:**
```bash
# Run latency test
npm run test:websocket

# Check server location
# Railway: See dashboard (should be us-east)
# Fly.io:
flyctl regions list
```

**Solutions:**

1. **Deploy closer to OpenAI (us-east):**
   ```bash
   # Railway: Set in dashboard (Region: US East)

   # Fly.io:
   flyctl regions set iad  # US East (Virginia)
   ```

2. **Reduce audio buffer size:**
   ```typescript
   // In websocket-server.ts
   turn_detection: {
     prefix_padding_ms: 200,  // Reduce from 300
     silence_duration_ms: 300, // Reduce from 500
   }
   ```

3. **Upgrade to dedicated CPU:**
   ```bash
   # Fly.io:
   flyctl scale vm dedicated-cpu-1x
   ```

---

### Issue 3: Memory Leaks (Server crashes after hours)

**Symptoms:**
- Server restarts every few hours
- Memory usage steadily increases
- Out of memory errors in logs

**Diagnosis:**
```bash
# Check memory usage
# Railway: Dashboard
# Fly.io:
flyctl vm status

# Check for unclosed connections
railway logs | grep "connection closed"  # or flyctl logs
```

**Solutions:**

1. **Verify graceful shutdown:**
   ```typescript
   // Already implemented in websocket-server.ts
   process.on('SIGTERM', async () => {
     for (const session of activeSessions.values()) {
       await handleCallEnd(session);
     }
   });
   ```

2. **Clear audio buffers after each call:**
   ```typescript
   // In handleCallEnd()
   session.audioBuffer = [];  // Clear buffer
   session.transcript = [];    // Clear transcript
   ```

3. **Increase memory allocation:**
   ```bash
   # Railway: Upgrade plan (Starter → Pro)

   # Fly.io:
   flyctl scale memory 1024  # 1GB RAM
   ```

---

### Issue 4: OpenAI API Errors

**Symptoms:**
- Calls connect but no AI responses
- "OpenAI WebSocket error" in logs
- 401/403 errors

**Diagnosis:**
```bash
# Check OpenAI API key
railway variables | grep OPENAI  # or flyctl secrets list

# Test OpenAI API directly
curl https://api.openai.com/v1/models \
  -H "Authorization: Bearer $OPENAI_API_KEY"
```

**Solutions:**

1. **Verify API key is valid:**
   ```bash
   # Regenerate key at https://platform.openai.com/api-keys
   railway variables set OPENAI_API_KEY=sk-new-key
   ```

2. **Check Realtime API access:**
   - Ensure your OpenAI account has Realtime API enabled
   - Tier 1+ required

3. **Monitor rate limits:**
   ```bash
   # Check OpenAI usage dashboard
   # Increase limits if needed
   ```

---

### Issue 5: SignalWire Connection Failures

**Symptoms:**
- "Failed to fetch call context" errors
- Database connection timeouts
- Calls initiate but no audio

**Diagnosis:**
```bash
# Check database connection
curl https://plmnuogbbkgsatfmkyxm.supabase.co/rest/v1/calls \
  -H "apikey: $NEXT_PUBLIC_SUPABASE_ANON_KEY"

# Check SignalWire webhook configuration
# Verify webhook URL points to WebSocket server
```

**Solutions:**

1. **Update SignalWire webhook URL:**
   ```bash
   # In SignalWire dashboard:
   # Phone Numbers → Select number → Voice & Fax
   # Media Streams: wss://your-deployment-url
   ```

2. **Verify Supabase credentials:**
   ```bash
   railway variables set NEXT_PUBLIC_SUPABASE_URL=https://plmnuogbbkgsatfmkyxm.supabase.co
   railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=your-key
   ```

3. **Check RLS policies:**
   ```sql
   -- In Supabase SQL editor
   SELECT * FROM calls WHERE twilio_call_sid = 'TEST_SID';
   -- Should return results (if RLS allows)
   ```

---

## Cost Analysis

### Railway Pricing

**Free Tier:**
- $5/month in credits
- Enough for ~200 hours of uptime
- Good for testing, not production

**Starter Plan ($20/month):**
- $20 usage credits
- Pay for resources used:
  - CPU: $0.002/min (~$3/month per instance)
  - RAM: $0.20/GB/month (~$1.60 for 512MB)
  - Network: $0.10/GB
- **Estimated cost:** $15-25/month for 1-2 instances

**Pro Plan ($50/month):**
- $50 usage credits
- Same rates as Starter
- Priority support
- **Estimated cost:** $50/month for 3-5 instances

---

### Fly.io Pricing

**Free Tier:**
- 3 shared-CPU VMs (256MB RAM each)
- 160GB outbound data transfer
- **FREE** for small workloads

**Paid Usage:**
- **CPU:** $0.0000008/sec per shared CPU = $2.10/month
- **RAM:** $0.0000000231/sec per MB = $0.60/month per 256MB
- **Network:** $0.02/GB (outbound)

**Example Configuration (1 VM, 512MB RAM):**
- CPU: $2.10/month
- RAM: $1.20/month (512MB)
- Network: ~$5/month (250GB @ $0.02/GB)
- **Total: $8-10/month**

**Example Configuration (2 VMs for redundancy):**
- CPU: $4.20/month
- RAM: $2.40/month
- Network: ~$10/month
- **Total: $16-18/month**

---

### Cost Optimization Tips

1. **Start with Fly.io free tier** (3 VMs)
   - Handles ~100 concurrent calls
   - $0/month for first 3 VMs

2. **Use auto-scaling wisely**
   - Railway: Scale to 0 during low traffic (not recommended for WebSocket)
   - Fly.io: Keep min_machines=1, scale up only when needed

3. **Monitor bandwidth usage**
   - Audio streaming is bandwidth-intensive
   - 1 minute of audio ≈ 500KB-1MB
   - Compress audio if possible

4. **Optimize call duration**
   - Shorter calls = less server time
   - Implement voicemail detection (already in code)
   - Auto-disconnect after 10 minutes

---

### Recommendation

**For MVP/Beta (0-1000 calls/month):**
- **Platform:** Fly.io (free tier)
- **Cost:** $0/month
- **Setup time:** 30 minutes

**For Production (1000-10,000 calls/month):**
- **Platform:** Fly.io (2 VMs, 512MB each)
- **Cost:** $16-20/month
- **Setup time:** 1 hour

**For Enterprise (10,000+ calls/month):**
- **Platform:** Fly.io (5+ VMs, dedicated CPU)
- **Cost:** $100-200/month
- **Consider:** Kubernetes/ECS for better control

---

## Final Checklist

Before going live, ensure:

- [ ] WebSocket server deployed to Railway or Fly.io
- [ ] Health check endpoint returns 200 OK
- [ ] All environment variables set correctly
- [ ] WebSocket connection test passes (3/3 tests)
- [ ] End-to-end call flow tested successfully
- [ ] Latency <500ms round-trip
- [ ] Error tracking (Sentry) configured
- [ ] Monitoring/alerts set up
- [ ] Main Next.js app updated with `WEBSOCKET_SERVER_URL`
- [ ] SignalWire webhook configured to point to WebSocket server
- [ ] Database migrations applied
- [ ] Load test passed (if applicable)

---

## Quick Start Commands

### Railway Deployment (5 minutes)

```bash
# 1. Install CLI
npm install -g @railway/cli

# 2. Login
railway login

# 3. Deploy
bash scripts/deploy-websocket.sh
# Choose option "1" for Railway

# 4. Test
npm run test:websocket
```

### Fly.io Deployment (10 minutes)

```bash
# 1. Install CLI
curl -L https://fly.io/install.sh | sh

# 2. Login
flyctl auth login

# 3. Deploy
bash scripts/deploy-websocket.sh
# Choose option "2" for Fly.io

# 4. Test
npm run test:websocket
```

---

## Support & Resources

- **Railway Docs:** https://docs.railway.app
- **Fly.io Docs:** https://fly.io/docs
- **SignalWire Docs:** https://developer.signalwire.com
- **OpenAI Realtime API:** https://platform.openai.com/docs/guides/realtime
- **LeadFlip Issues:** https://github.com/CaptainPhantasy/LeadFlip/issues

---

**Last Updated:** October 1, 2025
**Next Review:** When scaling beyond 1000 calls/month
