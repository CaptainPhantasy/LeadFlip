#!/bin/bash
# Fly.io-specific deployment script for LeadFlip WebSocket Server
# [2025-10-01] Agent 5: WebSocket Deployment Guide

set -e

echo "✈️  Fly.io Deployment - LeadFlip WebSocket Server"
echo "================================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check Fly CLI (both flyctl and fly are acceptable)
FLY_CMD=""
if command -v flyctl &> /dev/null; then
    FLY_CMD="flyctl"
elif command -v fly &> /dev/null; then
    FLY_CMD="fly"
else
    echo -e "${RED}❌ Fly CLI not installed${NC}"
    echo ""
    echo "Install with:"
    echo "  curl -L https://fly.io/install.sh | sh"
    echo ""
    exit 1
fi

echo -e "${GREEN}✅ Fly CLI found: $FLY_CMD${NC}"

# Check if logged in
if ! $FLY_CMD auth whoami &> /dev/null; then
    echo ""
    echo -e "${YELLOW}⚠️  Not logged in to Fly.io${NC}"
    echo "Logging in..."
    $FLY_CMD auth login || {
        echo -e "${RED}❌ Login failed${NC}"
        exit 1
    }
fi

echo -e "${GREEN}✅ Logged in to Fly.io${NC}"
echo ""

# Check if app exists
APP_NAME="leadflip-websocket"
echo "📦 Fly.io App Setup"
echo "-------------------"

if $FLY_CMD apps list | grep -q "$APP_NAME"; then
    echo -e "${GREEN}✅ App '$APP_NAME' already exists${NC}"
else
    echo "Creating new app..."

    # Check if config exists
    if [ ! -f "fly.websocket.toml" ]; then
        echo -e "${RED}❌ fly.websocket.toml not found${NC}"
        exit 1
    fi

    # Launch app (without deploying yet)
    $FLY_CMD launch --config fly.websocket.toml --no-deploy || {
        echo -e "${RED}❌ Failed to create app${NC}"
        exit 1
    }

    echo -e "${GREEN}✅ App created${NC}"
fi

echo ""

# Set secrets
echo "🔐 Setting Secrets (Environment Variables)"
echo "-------------------------------------------"
echo -e "${YELLOW}Please enter the following values:${NC}"
echo "(Press Enter to skip if already set)"
echo ""

# Create a temporary file for batch secret setting
SECRETS_FILE=$(mktemp)

# Collect secrets
read -sp "OpenAI API Key (sk-...): " OPENAI_KEY
echo
if [ -n "$OPENAI_KEY" ]; then
    echo "OPENAI_API_KEY=$OPENAI_KEY" >> "$SECRETS_FILE"
fi

read -sp "Anthropic API Key (sk-ant-...): " ANTHROPIC_KEY
echo
if [ -n "$ANTHROPIC_KEY" ]; then
    echo "ANTHROPIC_API_KEY=$ANTHROPIC_KEY" >> "$SECRETS_FILE"
fi

read -p "Supabase URL (https://xxx.supabase.co): " SUPABASE_URL
if [ -n "$SUPABASE_URL" ]; then
    echo "NEXT_PUBLIC_SUPABASE_URL=$SUPABASE_URL" >> "$SECRETS_FILE"
fi

read -sp "Supabase Anon Key: " SUPABASE_KEY
echo
if [ -n "$SUPABASE_KEY" ]; then
    echo "NEXT_PUBLIC_SUPABASE_ANON_KEY=$SUPABASE_KEY" >> "$SECRETS_FILE"
fi

# SignalWire variables (can use defaults)
echo ""
echo -e "${BLUE}SignalWire Configuration${NC}"
read -p "SignalWire Project ID [2f9ce47f-c556-4cf2-803c-2b1525b35b34]: " SW_PROJECT
SW_PROJECT=${SW_PROJECT:-2f9ce47f-c556-4cf2-803c-2b1525b35b34}
echo "SIGNALWIRE_PROJECT_ID=$SW_PROJECT" >> "$SECRETS_FILE"

read -sp "SignalWire API Token [PT2ec5c1cb7098ec694e2825877b92d42e21386e16bebe831b]: " SW_TOKEN
echo
SW_TOKEN=${SW_TOKEN:-PT2ec5c1cb7098ec694e2825877b92d42e21386e16bebe831b}
echo "SIGNALWIRE_API_TOKEN=$SW_TOKEN" >> "$SECRETS_FILE"

read -p "SignalWire Space URL [legacyai.signalwire.com]: " SW_SPACE
SW_SPACE=${SW_SPACE:-legacyai.signalwire.com}
echo "SIGNALWIRE_SPACE_URL=$SW_SPACE" >> "$SECRETS_FILE"

# Set all secrets at once
if [ -s "$SECRETS_FILE" ]; then
    echo ""
    echo "Setting secrets..."
    cat "$SECRETS_FILE" | $FLY_CMD secrets import --app "$APP_NAME" || {
        echo -e "${RED}❌ Failed to set secrets${NC}"
        rm "$SECRETS_FILE"
        exit 1
    }
    echo -e "${GREEN}✅ Secrets configured${NC}"
fi

# Clean up
rm "$SECRETS_FILE"

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
echo "🚀 Deploying to Fly.io"
echo "----------------------"
$FLY_CMD deploy -c fly.websocket.toml --app "$APP_NAME" || {
    echo -e "${RED}❌ Deployment failed${NC}"
    exit 1
}

echo ""
echo -e "${GREEN}✅ Deployment successful!${NC}"
echo ""

# Get deployment info
echo "🌐 Getting Deployment Info"
echo "--------------------------"
INFO=$($FLY_CMD info --app "$APP_NAME" 2>&1)

# Extract hostname
HOSTNAME=$(echo "$INFO" | grep -i "hostname" | awk '{print $NF}' | head -1)

if [ -z "$HOSTNAME" ]; then
    # Fallback: try to get from fly.toml
    HOSTNAME="${APP_NAME}.fly.dev"
fi

WS_URL="wss://$HOSTNAME"
HTTPS_URL="https://$HOSTNAME"

echo ""
echo -e "${GREEN}🎉 WebSocket Server Deployed!${NC}"
echo "=================================================="
echo ""
echo "HTTPS URL: $HTTPS_URL"
echo "WebSocket URL: $WS_URL"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Test health check:"
echo "   curl $HTTPS_URL/health"
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
echo "   $FLY_CMD logs --app $APP_NAME"
echo ""
echo "6. Check status:"
echo "   $FLY_CMD status --app $APP_NAME"
echo ""
echo "7. Scale if needed:"
echo "   $FLY_CMD scale count 2 --app $APP_NAME  # 2 instances"
echo "   $FLY_CMD scale memory 1024 --app $APP_NAME  # 1GB RAM"
echo ""

# Show current status
echo "📊 Current Status:"
echo "------------------"
$FLY_CMD status --app "$APP_NAME" || true

echo ""
echo "=================================================="
echo -e "${GREEN}✅ Fly.io Deployment Complete${NC}"
echo "=================================================="
