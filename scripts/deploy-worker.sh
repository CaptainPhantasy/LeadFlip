#!/bin/bash
# Deploy LeadFlip BullMQ Call Worker to Railway/Fly.io
# This script automates worker deployment

set -e  # Exit on error

echo "🚀 LeadFlip BullMQ Worker Deployment"
echo "===================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Detect deployment platform
read -p "Deploy to (1) Railway or (2) Fly.io? [1/2]: " platform

if [ "$platform" = "1" ]; then
    DEPLOY_PLATFORM="railway"
elif [ "$platform" = "2" ]; then
    DEPLOY_PLATFORM="flyio"
else
    echo -e "${RED}Invalid choice. Exiting.${NC}"
    exit 1
fi

echo -e "${YELLOW}Deploying to: $DEPLOY_PLATFORM${NC}"

# Pre-deployment checks
echo ""
echo "📋 Pre-deployment Checks"
echo "------------------------"

# Check if Dockerfile exists
if [ ! -f "Dockerfile.worker" ]; then
    echo -e "${RED}❌ Dockerfile.worker not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dockerfile.worker found${NC}"

# Check environment variables
if [ ! -f ".env.local" ]; then
    echo -e "${YELLOW}⚠️  .env.local not found - make sure to set environment variables in Railway/Fly.io dashboard${NC}"
else
    echo -e "${GREEN}✅ .env.local found (reference for env vars)${NC}"
fi

# Verify required dependencies
if ! command -v docker &> /dev/null; then
    echo -e "${RED}❌ Docker not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Docker installed${NC}"

# Test Docker build locally
echo ""
echo "🔨 Building Docker image locally (test)"
echo "----------------------------------------"
docker build -f Dockerfile.worker -t leadflip-worker:test . || {
    echo -e "${RED}❌ Docker build failed${NC}"
    exit 1
}
echo -e "${GREEN}✅ Docker build successful${NC}"

# Deploy based on platform
if [ "$DEPLOY_PLATFORM" = "railway" ]; then
    echo ""
    echo "🚂 Deploying to Railway"
    echo "----------------------"

    # Check Railway CLI
    if ! command -v railway &> /dev/null; then
        echo -e "${RED}❌ Railway CLI not installed${NC}"
        echo "Install with: npm install -g @railway/cli"
        exit 1
    fi

    # Login to Railway (if needed)
    railway login || {
        echo -e "${RED}❌ Railway login failed${NC}"
        exit 1
    }

    # Create separate service for worker
    echo ""
    read -p "Create as new service in existing project? [Y/n]: " create_service
    if [ "$create_service" != "n" ] && [ "$create_service" != "N" ]; then
        railway service create leadflip-worker || echo "Service may already exist"
    fi

    # Link to project
    railway link

    # Set environment variables
    echo ""
    echo "Setting environment variables..."
    railway variables set NODE_ENV=production

    echo -e "${YELLOW}⚠️  Remember to set these variables in Railway dashboard:${NC}"
    echo "  - REDIS_URL (from Upstash)"
    echo "  - TWILIO_ACCOUNT_SID"
    echo "  - TWILIO_AUTH_TOKEN"
    echo "  - TWILIO_PHONE_NUMBER"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"
    echo "  - WEBSOCKET_SERVER_URL (from websocket deployment)"
    echo "  - NEXT_PUBLIC_APP_URL (your Vercel URL)"

    # Deploy
    echo ""
    echo "Deploying..."
    railway up -d Dockerfile.worker

    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"

elif [ "$DEPLOY_PLATFORM" = "flyio" ]; then
    echo ""
    echo "✈️  Deploying to Fly.io"
    echo "----------------------"

    # Check Fly CLI
    if ! command -v flyctl &> /dev/null && ! command -v fly &> /dev/null; then
        echo -e "${RED}❌ Fly CLI not installed${NC}"
        echo "Install with: curl -L https://fly.io/install.sh | sh"
        exit 1
    fi

    FLY_CMD=$(command -v flyctl || command -v fly)

    # Login to Fly.io (if needed)
    $FLY_CMD auth login || {
        echo -e "${RED}❌ Fly.io login failed${NC}"
        exit 1
    }

    # Launch or deploy
    echo ""
    if [ ! -f "fly.worker.toml" ]; then
        echo -e "${RED}❌ fly.worker.toml not found${NC}"
        exit 1
    fi

    # Create app if doesn't exist
    $FLY_CMD apps create leadflip-worker --config fly.worker.toml || echo "App may already exist"

    # Set secrets
    echo ""
    echo "Setting secrets (you'll be prompted)..."
    echo -e "${YELLOW}Enter each secret when prompted (or press Ctrl+C to skip):${NC}"

    $FLY_CMD secrets set \
        REDIS_URL="$(read -sp 'REDIS_URL: ' url; echo $url)" \
        TWILIO_ACCOUNT_SID="$(read -sp 'TWILIO_ACCOUNT_SID: ' sid; echo $sid)" \
        TWILIO_AUTH_TOKEN="$(read -sp 'TWILIO_AUTH_TOKEN: ' token; echo $token)" \
        --config fly.worker.toml || true

    # Deploy
    echo ""
    echo "Deploying..."
    $FLY_CMD deploy -c fly.worker.toml

    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
fi

echo ""
echo "======================================="
echo -e "${GREEN}🎉 BullMQ Worker Deployed!${NC}"
echo "======================================="
echo ""
echo "Worker Status:"
if [ "$DEPLOY_PLATFORM" = "railway" ]; then
    railway logs
elif [ "$DEPLOY_PLATFORM" = "flyio" ]; then
    $FLY_CMD logs --config fly.worker.toml
fi
echo ""
echo "Next Steps:"
echo "1. Verify worker is processing jobs from queue"
echo "2. Check logs for any errors"
echo "3. Test AI call initiation from the app"
echo "4. Monitor queue with BullMQ dashboard (if configured)"
echo ""
