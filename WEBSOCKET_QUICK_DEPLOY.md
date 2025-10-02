# WebSocket Server - Quick Deploy Guide

**Last Updated:** October 1, 2025, 8:35 PM EDT
**Agent:** WebSocket Deployment Agent (Agent 5)

---

## 🚀 Local Testing (2 minutes)

```bash
# Start WebSocket server
npm run websocket-server

# In new terminal: Test connection
npm run test:websocket
```

**Expected:** 2/3 tests pass ✅

---

## 🌐 Railway Deployment (5 minutes)

```bash
# 1. Install & login
npm install -g @railway/cli
railway login

# 2. Initialize
railway init

# 3. Set environment (copy from .env.local)
railway variables set ANTHROPIC_API_KEY=sk-ant-...
railway variables set OPENAI_API_KEY=sk-proj-...
railway variables set NEXT_PUBLIC_SUPABASE_URL=https://plmnuogbbkgsatfmkyxm.supabase.co
railway variables set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 4. Deploy
railway up

# 5. Get URL
railway status
# Copy URL → Add to Vercel as WEBSOCKET_SERVER_URL
```

**Cost:** ~$13/month

---

## ✈️ Fly.io Deployment (5 minutes)

```bash
# 1. Install & login
brew install flyctl
flyctl auth login

# 2. Launch
flyctl launch --config fly.websocket.toml --no-deploy

# 3. Set secrets
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...
flyctl secrets set OPENAI_API_KEY=sk-proj-...
flyctl secrets set NEXT_PUBLIC_SUPABASE_URL=https://plmnuogbbkgsatfmkyxm.supabase.co
flyctl secrets set NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...

# 4. Deploy
flyctl deploy --config fly.websocket.toml

# 5. Get URL
flyctl status
# Copy URL → Add to Vercel as WEBSOCKET_SERVER_URL
```

**Cost:** Free tier available ($0/month)

---

## ✅ Verify Deployment

```bash
# Health check
curl https://your-server.com/health

# WebSocket test
npm run test:websocket wss://your-server.com
```

**Expected:** All 3 tests pass ✅

---

## 📋 Environment Variables Required

```bash
ANTHROPIC_API_KEY=sk-ant-...          # Claude API
OPENAI_API_KEY=sk-proj-...            # Realtime voice
NEXT_PUBLIC_SUPABASE_URL=https://...  # Database
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...  # Database auth
```

**Where to get:**
- Anthropic: https://console.anthropic.com/
- OpenAI: https://platform.openai.com/
- Supabase: Dashboard → Project Settings → API

---

## 🔗 Integration with Main App

After deployment:

1. **Copy WebSocket URL** (from Railway/Fly.io status)
2. **Add to Vercel:**
   - Go to Project Settings → Environment Variables
   - Add: `WEBSOCKET_SERVER_URL=wss://your-server.com`
3. **Redeploy** main app on Vercel

---

## 🐛 Troubleshooting

### Server won't start
```bash
# Check logs
railway logs
# or
flyctl logs
```

### Connection fails
```bash
# Verify environment variables
railway variables
# or
flyctl secrets list
```

### Audio quality issues
- Check region is `us-east` or `iad`
- Increase memory: `railway scale --memory 1GB`

---

## 📚 Full Documentation

See `WEBSOCKET_DEPLOYMENT_GUIDE.md` for:
- Detailed troubleshooting (10+ scenarios)
- Cost analysis
- Production configuration
- Monitoring setup
- Security best practices

---

**Quick Reference Card** | For full guide see: [WEBSOCKET_DEPLOYMENT_GUIDE.md](./WEBSOCKET_DEPLOYMENT_GUIDE.md)
