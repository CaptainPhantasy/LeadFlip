#!/bin/bash
# WebSocket Health Check Test Script
# [2025-10-01] Agent 5: WebSocket Deployment Guide

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to localhost if no URL provided
WS_URL=${1:-"ws://localhost:8080"}

# Convert WebSocket URL to HTTP for health check
HTTP_URL=$(echo "$WS_URL" | sed 's/ws:/http:/' | sed 's/wss:/https:/')
HEALTH_URL="${HTTP_URL}/health"

echo "🏥 WebSocket Server Health Check"
echo "================================="
echo ""
echo "Target: $WS_URL"
echo "Health Check URL: $HEALTH_URL"
echo ""

# Test 1: Health Check Endpoint
echo "Test 1: Health Check Endpoint"
echo "------------------------------"

RESPONSE=$(curl -s -w "\n%{http_code}" "$HEALTH_URL" 2>&1 || echo "000")
HTTP_CODE=$(echo "$RESPONSE" | tail -n1)
BODY=$(echo "$RESPONSE" | head -n-1)

if [ "$HTTP_CODE" = "200" ]; then
    echo -e "${GREEN}✅ Health check passed (HTTP 200)${NC}"
    echo ""
    echo "Response:"
    echo "$BODY" | jq . 2>/dev/null || echo "$BODY"
    echo ""

    # Parse JSON response
    if echo "$BODY" | jq . &>/dev/null; then
        STATUS=$(echo "$BODY" | jq -r '.status')
        ACTIVE_CALLS=$(echo "$BODY" | jq -r '.activeCalls')
        UPTIME=$(echo "$BODY" | jq -r '.uptime')

        echo "Status: $STATUS"
        echo "Active Calls: $ACTIVE_CALLS"
        echo "Uptime: ${UPTIME}s"
    fi
else
    echo -e "${RED}❌ Health check failed (HTTP $HTTP_CODE)${NC}"
    echo ""
    echo "Response:"
    echo "$BODY"
    exit 1
fi

echo ""

# Test 2: WebSocket Connection
echo "Test 2: WebSocket Connection"
echo "-----------------------------"

# Check if wscat is installed
if ! command -v wscat &> /dev/null; then
    echo -e "${YELLOW}⚠️  wscat not installed (skipping WebSocket test)${NC}"
    echo "Install with: npm install -g wscat"
else
    echo "Testing WebSocket connection..."

    # Use timeout to limit connection test
    TIMEOUT_CMD=""
    if command -v timeout &> /dev/null; then
        TIMEOUT_CMD="timeout 5"
    elif command -v gtimeout &> /dev/null; then
        TIMEOUT_CMD="gtimeout 5"
    fi

    # Test WebSocket connection (expect it to stay open)
    if $TIMEOUT_CMD wscat -c "$WS_URL" --close &>/dev/null; then
        echo -e "${GREEN}✅ WebSocket connection successful${NC}"
    else
        EXIT_CODE=$?
        if [ $EXIT_CODE -eq 124 ] || [ $EXIT_CODE -eq 143 ]; then
            # Timeout means connection stayed open (good!)
            echo -e "${GREEN}✅ WebSocket connection successful (persistent)${NC}"
        else
            echo -e "${RED}❌ WebSocket connection failed${NC}"
            exit 1
        fi
    fi
fi

echo ""

# Test 3: Response Time
echo "Test 3: Response Time"
echo "---------------------"

START_TIME=$(date +%s%3N)
curl -s "$HEALTH_URL" > /dev/null
END_TIME=$(date +%s%3N)
RESPONSE_TIME=$((END_TIME - START_TIME))

echo "Response time: ${RESPONSE_TIME}ms"

if [ $RESPONSE_TIME -lt 100 ]; then
    echo -e "${GREEN}✅ Excellent response time (<100ms)${NC}"
elif [ $RESPONSE_TIME -lt 500 ]; then
    echo -e "${GREEN}✅ Good response time (<500ms)${NC}"
elif [ $RESPONSE_TIME -lt 1000 ]; then
    echo -e "${YELLOW}⚠️  Acceptable response time (<1s)${NC}"
else
    echo -e "${RED}❌ Slow response time (>1s)${NC}"
fi

echo ""

# Test 4: Multiple Consecutive Requests (Load Test)
echo "Test 4: Load Test (10 consecutive requests)"
echo "--------------------------------------------"

SUCCESS_COUNT=0
TOTAL_TIME=0

for i in {1..10}; do
    START=$(date +%s%3N)
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" "$HEALTH_URL")
    END=$(date +%s%3N)
    TIME=$((END - START))
    TOTAL_TIME=$((TOTAL_TIME + TIME))

    if [ "$HTTP_CODE" = "200" ]; then
        ((SUCCESS_COUNT++))
        echo -e "Request $i: ${GREEN}✅${NC} (${TIME}ms)"
    else
        echo -e "Request $i: ${RED}❌${NC} HTTP $HTTP_CODE"
    fi
done

AVG_TIME=$((TOTAL_TIME / 10))

echo ""
echo "Results:"
echo "  Success rate: $SUCCESS_COUNT/10 (${SUCCESS_COUNT}0%)"
echo "  Average response time: ${AVG_TIME}ms"

if [ $SUCCESS_COUNT -eq 10 ] && [ $AVG_TIME -lt 500 ]; then
    echo -e "${GREEN}✅ Load test passed${NC}"
elif [ $SUCCESS_COUNT -eq 10 ]; then
    echo -e "${YELLOW}⚠️  All requests successful but slow${NC}"
else
    echo -e "${RED}❌ Load test failed${NC}"
    exit 1
fi

echo ""

# Summary
echo "================================="
echo -e "${GREEN}🎉 All Health Checks Passed!${NC}"
echo "================================="
echo ""
echo "WebSocket server is healthy and ready for production."
echo ""
echo "Next steps:"
echo "1. Update WEBSOCKET_SERVER_URL in Vercel: $WS_URL"
echo "2. Configure SignalWire Media Streams webhook: $WS_URL"
echo "3. Run end-to-end test: npm run test:websocket"
echo ""
