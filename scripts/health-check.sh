#!/bin/bash
# Health Check Script for LeadFlip Infrastructure
# Verifies all services are running correctly

set -e

echo "🏥 LeadFlip Infrastructure Health Check"
echo "======================================="

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Load environment variables
if [ -f ".env.local" ]; then
    export $(cat .env.local | grep -v '^#' | xargs)
fi

ERRORS=0
WARNINGS=0

# Function to check HTTP endpoint
check_http() {
    local name=$1
    local url=$2
    local expected_status=${3:-200}

    echo -n "Checking $name... "

    response=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

    if [ "$response" = "$expected_status" ]; then
        echo -e "${GREEN}✅ OK (HTTP $response)${NC}"
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
        ((ERRORS++))
    fi
}

# Function to check environment variable
check_env() {
    local name=$1
    local var_name=$2

    echo -n "Checking $name... "

    if [ -n "${!var_name}" ]; then
        echo -e "${GREEN}✅ Set${NC}"
    else
        echo -e "${YELLOW}⚠️  Not set${NC}"
        ((WARNINGS++))
    fi
}

echo ""
echo "📋 Environment Variables"
echo "------------------------"
check_env "Supabase URL" "NEXT_PUBLIC_SUPABASE_URL"
check_env "Clerk Publishable Key" "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"
check_env "Anthropic API Key" "ANTHROPIC_API_KEY"
check_env "OpenAI API Key" "OPENAI_API_KEY"
check_env "Twilio Account SID" "TWILIO_ACCOUNT_SID"
check_env "Redis URL" "REDIS_URL"
check_env "WebSocket Server URL" "WEBSOCKET_SERVER_URL"
check_env "SendGrid API Key" "SENDGRID_API_KEY"

echo ""
echo "🌐 Service Endpoints"
echo "--------------------"

# Check Next.js app (if running locally)
if [ -n "$NEXT_PUBLIC_APP_URL" ]; then
    check_http "Next.js App" "$NEXT_PUBLIC_APP_URL" "200"
fi

# Check WebSocket server health
if [ -n "$WEBSOCKET_SERVER_URL" ]; then
    # Convert ws:// to http:// for health check
    HEALTH_URL=$(echo "$WEBSOCKET_SERVER_URL" | sed 's/ws:/http:/' | sed 's/wss:/https:/')/health
    check_http "WebSocket Server" "$HEALTH_URL" "200"
fi

# Check Supabase
if [ -n "$NEXT_PUBLIC_SUPABASE_URL" ]; then
    check_http "Supabase" "$NEXT_PUBLIC_SUPABASE_URL/rest/v1/" "200"
fi

echo ""
echo "🔌 External Service Connectivity"
echo "---------------------------------"

# Test Anthropic API
echo -n "Testing Anthropic API... "
if [ -n "$ANTHROPIC_API_KEY" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "x-api-key: $ANTHROPIC_API_KEY" \
        -H "anthropic-version: 2023-06-01" \
        https://api.anthropic.com/v1/messages \
        -X POST -d '{"model":"claude-3-haiku-20240307","max_tokens":1,"messages":[{"role":"user","content":"test"}]}' \
        || echo "000")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  API key not set${NC}"
    ((WARNINGS++))
fi

# Test OpenAI API
echo -n "Testing OpenAI API... "
if [ -n "$OPENAI_API_KEY" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -H "Authorization: Bearer $OPENAI_API_KEY" \
        https://api.openai.com/v1/models \
        || echo "000")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  API key not set${NC}"
    ((WARNINGS++))
fi

# Test Twilio
echo -n "Testing Twilio API... "
if [ -n "$TWILIO_ACCOUNT_SID" ] && [ -n "$TWILIO_AUTH_TOKEN" ]; then
    response=$(curl -s -o /dev/null -w "%{http_code}" \
        -u "$TWILIO_ACCOUNT_SID:$TWILIO_AUTH_TOKEN" \
        "https://api.twilio.com/2010-04-01/Accounts/$TWILIO_ACCOUNT_SID.json" \
        || echo "000")

    if [ "$response" = "200" ]; then
        echo -e "${GREEN}✅ OK${NC}"
    else
        echo -e "${RED}❌ FAILED (HTTP $response)${NC}"
        ((ERRORS++))
    fi
else
    echo -e "${YELLOW}⚠️  Credentials not set${NC}"
    ((WARNINGS++))
fi

# Test Redis connection
echo -n "Testing Redis connection... "
if [ -n "$REDIS_URL" ]; then
    # Simple test using redis-cli if available
    if command -v redis-cli &> /dev/null; then
        redis-cli -u "$REDIS_URL" PING &> /dev/null && \
            echo -e "${GREEN}✅ OK${NC}" || \
            (echo -e "${RED}❌ FAILED${NC}" && ((ERRORS++)))
    else
        echo -e "${YELLOW}⚠️  redis-cli not installed, skipping${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  Redis URL not set${NC}"
    ((WARNINGS++))
fi

echo ""
echo "======================================="
echo "📊 Health Check Summary"
echo "======================================="
echo -e "Errors: ${RED}$ERRORS${NC}"
echo -e "Warnings: ${YELLOW}$WARNINGS${NC}"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}🎉 All systems operational!${NC}"
    exit 0
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}⚠️  Some optional services not configured${NC}"
    exit 0
else
    echo -e "${RED}❌ Critical services are down${NC}"
    exit 1
fi
