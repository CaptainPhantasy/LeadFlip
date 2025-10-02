#!/bin/bash
# Railway-specific deployment script for LeadFlip WebSocket Server
# [2025-10-01] Agent 5: WebSocket Deployment Guide

set -e

echo "🚂 Railway Deployment - LeadFlip WebSocket Server"
echo "=================================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Railway CLI
if ! command -v railway &> /dev/null; then
    echo -e "${RED}❌ Railway CLI not installed${NC}"
    echo ""
    echo "Install with:"
    echo "  npm install -g @railway/cli"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Railway CLI found${NC}"

# Check if logged in
if ! railway whoami &> /dev/null; then
    echo ""
    echo -e "${YELLOW}⚠️  Not logged in to Railway${NC}"
    echo "Logging in..."
    railway login || {
        echo -e "${RED}❌ Login failed${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Logged in to Railway${NC}"
echo ""

# Link or create project
echo "📦 Railway Project Setup"
echo "------------------------"
read -p "Do you have an existing Railway project for LeadFlip WebSocket? [y/N]: " has_project

if [ "$has_project" = "y" ] || [ "$has_project" = "Y" ]; then
    echo "Linking to existing project..."
    railway link || {
        echo -e "${RED}❌ Failed to link project${NC}"
        exit 1
    }
else
    echo "Creating new project..."
    railway init || {
        echo -e "${RED}❌ Failed to create project${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Project linked${NC}"
echo ""

# Set environment variables
echo "🔐 Setting Environment Variables"
echo "---------------------------------"

# Required variables
railway variables --set WEBSOCKET_PORT=8080
railway variables --set NODE_ENV=production

echo -e "${GREEN}✅ Basic variables set${NC}"
echo ""

# Prompt for sensitive variables
echo -e "${YELLOW}Please enter the following API keys:${NC}"
echo "(Press Enter to skip if already set)"
echo ""

read -sp "OpenAI API Key (sk-...): " OPENAI_KEY
echo
if [ -n "$OPENAI_KEY" ]; then
    railway variables --set OPENAI_API_KEY="$OPENAI_KEY"
    echo -e "${GREEN}✅ OpenAI API key set${NC}"
fi

read -sp "Anthropic API Key (sk-ant-...): " ANTHROPIC_KEY
echo
if [ -n "$ANTHROPIC_KEY" ]; then
    railway variables --set ANTHROPIC_API_KEY="$ANTHROPIC_KEY"
    echo -e "${GREEN}✅ Anthropic API key set${NC}"
fi

read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
if [ -n "$SUPABASE_URL" ]; then
    railway variables --set NEXT_PUBLIC_SUPABASE_URL="$SUPABASE_URL"
    echo -e "${GREEN}✅ Supabase URL set${NC}"
fi

read -sp "Supabase Anon Key: " SUPABASE_KEY
echo
if [ -n "$SUPABASE_KEY" ]; then
    railway variables --set NEXT_PUBLIC_SUPABASE_ANON_KEY="$SUPABASE_KEY"
    echo -e "${GREEN}✅ Supabase key set${NC}"
fi

# SignalWire variables (can use defaults)
echo ""
echo -e "${BLUE}SignalWire Configuration${NC}"
read -p "SignalWire Project ID [2f9ce47f-c556-4cf2-803c-2b1525b35b34]: " SW_PROJECT
SW_PROJECT=${SW_PROJECT:-2f9ce47f-c556-4cf2-803c-2b1525b35b34}
railway variables --set SIGNALWIRE_PROJECT_ID="$SW_PROJECT"

read -sp "SignalWire API Token [PT2ec5c1cb7098ec694e2825877b92d42e21386e16bebe831b]: " SW_TOKEN
echo
SW_TOKEN=${SW_TOKEN:-PT2ec5c1cb7098ec694e2825877b92d42e21386e16bebe831b}
railway variables --set SIGNALWIRE_API_TOKEN="$SW_TOKEN"

read -p "SignalWire Space URL [legacyai.signalwire.com]: " SW_SPACE
SW_SPACE=${SW_SPACE:-legacyai.signalwire.com}
railway variables --set SIGNALWIRE_SPACE_URL="$SW_SPACE"

echo -e "${GREEN}✅ All variables configured${NC}"
echo ""

# Verify Dockerfile exists
if [ ! -f "Dockerfile.websocket" ]; then
    echo -e "${RED}❌ Dockerfile.websocket not found${NC}"
    echo "Please ensure you're running this from the project root"
    exit 1
fi

echo -e "${GREEN}✅ Dockerfile.websocket found${NC}"
echo ""

# Deploy
echo "🚀 Deploying to Railway"
echo "-----------------------"
railway up -d Dockerfile.websocket || {
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""

# Get deployment URL
echo "🌐 Getting Deployment URL"
echo "-------------------------"
DOMAIN=$(railway domain 2>&1 | grep -Eo 'https://[^ ]+' | head -1)

if [ -z "$DOMAIN" ]; then
    echo "Generating new domain..."
    railway domain || {
        echo -e "${YELLOW}⚠️  Could not generate domain automatically${NC}"
        echo "Please run: railway domain"
    }
    DOMAIN=$(railway domain 2>&1 | grep -Eo 'https://[^ ]+' | head -1)
fi

if [ -n "$DOMAIN" ]; then
    # Convert HTTPS to WSS
    WS_URL=$(echo "$DOMAIN" | sed 's/https:/wss:/')
    echo ""
    echo -e "${GREEN}🎉 WebSocket Server Deployed!${NC}"
    echo "=================================================="
    echo ""
    echo "HTTPS URL: $DOMAIN"
    echo "WebSocket URL: $WS_URL"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Test health check:"
    echo "   curl $DOMAIN/health"
    echo ""
    echo "2. Test WebSocket connection:"
    echo "   npm run test:websocket $WS_URL"
    echo ""
    echo "3. Add to Vercel environment variables:"
    echo "   WEBSOCKET_SERVER_URL=$WS_URL"
    echo ""
    echo "4. Update SignalWire webhook:"
    echo "   Media Streams URL: $WS_URL"
    echo ""
    echo "5. Monitor logs:"
    echo "   railway logs"
    echo ""
fi

echo "=================================================="
echo -e "${GREEN}✅ Railway Deployment Complete${NC}"
echo "=================================================="
