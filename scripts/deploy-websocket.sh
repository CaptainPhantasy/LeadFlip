#!/bin/bash
# Deploy LeadFlip WebSocket Server to Railway/Fly.io
# This script automates WebSocket server deployment

set -e  # Exit on error

echo "🚀 LeadFlip WebSocket Server Deployment"
echo "======================================="

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
if [ ! -f "Dockerfile.websocket" ]; then
    echo -e "${RED}❌ Dockerfile.websocket not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Dockerfile.websocket found${NC}"

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
docker build -f Dockerfile.websocket -t leadflip-websocket:test . || {
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

    # Link to project (or create new)
    echo ""
    read -p "Do you have an existing Railway project? [y/N]: " has_project
    if [ "$has_project" = "y" ] || [ "$has_project" = "Y" ]; then
        railway link
    else
        railway init
    fi

    # Set environment variables
    echo ""
    echo "Setting environment variables..."
    railway variables set WEBSOCKET_PORT=8080
    railway variables set NODE_ENV=production

    echo -e "${YELLOW}⚠️  Remember to set these variables in Railway dashboard:${NC}"
    echo "  - OPENAI_API_KEY"
    echo "  - ANTHROPIC_API_KEY"
    echo "  - NEXT_PUBLIC_SUPABASE_URL"
    echo "  - NEXT_PUBLIC_SUPABASE_ANON_KEY"

    # Deploy
    echo ""
    echo "Deploying..."
    railway up -d Dockerfile.websocket

    # Get deployment URL
    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    railway domain || echo "Run 'railway domain' to generate a domain"

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
    if [ ! -f "fly.toml" ]; then
        echo "Creating new Fly.io app..."
        cp fly.websocket.toml fly.toml
        $FLY_CMD launch --config fly.toml --no-deploy
    fi

    # Set secrets
    echo ""
    echo "Setting secrets (you'll be prompted)..."
    echo -e "${YELLOW}Enter each secret when prompted (or press Ctrl+C to skip):${NC}"

    $FLY_CMD secrets set OPENAI_API_KEY="$(read -sp 'OPENAI_API_KEY: ' key; echo $key)" || true
    $FLY_CMD secrets set ANTHROPIC_API_KEY="$(read -sp 'ANTHROPIC_API_KEY: ' key; echo $key)" || true

    # Deploy
    echo ""
    echo "Deploying..."
    $FLY_CMD deploy -c fly.websocket.toml

    # Get deployment URL
    echo ""
    echo -e "${GREEN}✅ Deployment complete!${NC}"
    $FLY_CMD info
fi

echo ""
echo "======================================="
echo -e "${GREEN}🎉 WebSocket Server Deployed!${NC}"
echo "======================================="
echo ""
echo "Next Steps:"
echo "1. Copy the deployment URL from above"
echo "2. Set WEBSOCKET_SERVER_URL in your Vercel environment variables"
echo "3. Update .env.local with the WebSocket URL"
echo "4. Deploy the main Next.js app to Vercel"
echo "5. Test AI calling functionality"
echo ""
echo "Health Check: [deployment-url]/health"
echo ""
