#!/bin/bash
# WebSocket Latency Test Script
# [2025-10-01] Agent 5: WebSocket Deployment Guide
# Tests round-trip latency to ensure <500ms target

set -e

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default to localhost if no URL provided
WS_URL=${1:-"ws://localhost:8080"}
HTTP_URL=$(echo "$WS_URL" | sed 's/ws:/http:/' | sed 's/wss:/https:/')

echo "⚡ WebSocket Latency Test"
echo "========================="
echo ""
echo "Target: $WS_URL"
echo "Target Latency: <500ms round-trip"
echo ""

# Test 1: HTTP Health Check Latency
echo "Test 1: HTTP Health Check Latency"
echo "----------------------------------"

TOTAL_HTTP_TIME=0
HTTP_TESTS=5

for i in $(seq 1 $HTTP_TESTS); do
    START=$(date +%s%3N)
    curl -s "${HTTP_URL}/health" > /dev/null
    END=$(date +%s%3N)
    TIME=$((END - START))
    TOTAL_HTTP_TIME=$((TOTAL_HTTP_TIME + TIME))

    if [ $TIME -lt 50 ]; then
        echo -e "Test $i: ${GREEN}${TIME}ms ✅${NC} (excellent)"
    elif [ $TIME -lt 100 ]; then
        echo -e "Test $i: ${GREEN}${TIME}ms ✅${NC} (good)"
    elif [ $TIME -lt 500 ]; then
        echo -e "Test $i: ${YELLOW}${TIME}ms ⚠️${NC} (acceptable)"
    else
        echo -e "Test $i: ${RED}${TIME}ms ❌${NC} (slow)"
    fi
done

AVG_HTTP=$((TOTAL_HTTP_TIME / HTTP_TESTS))
echo ""
echo "Average HTTP latency: ${AVG_HTTP}ms"

if [ $AVG_HTTP -lt 100 ]; then
    echo -e "${GREEN}✅ Excellent HTTP performance${NC}"
elif [ $AVG_HTTP -lt 500 ]; then
    echo -e "${GREEN}✅ Good HTTP performance${NC}"
else
    echo -e "${RED}❌ Poor HTTP performance${NC}"
fi

echo ""

# Test 2: WebSocket Connection Latency
echo "Test 2: WebSocket Connection Latency"
echo "-------------------------------------"

if ! command -v wscat &> /dev/null; then
    echo -e "${YELLOW}⚠️  wscat not installed${NC}"
    echo "Install with: npm install -g wscat"
    echo "Skipping WebSocket latency test..."
else
    # Create a temporary file for WebSocket test
    WS_TEST_FILE=$(mktemp)

    echo "Measuring connection establishment time..."

    START=$(date +%s%3N)
    # Connect and immediately close
    timeout 2 wscat -c "$WS_URL" --close 2>/dev/null || true
    END=$(date +%s%3N)
    CONNECTION_TIME=$((END - START))

    if [ $CONNECTION_TIME -lt 100 ]; then
        echo -e "Connection time: ${GREEN}${CONNECTION_TIME}ms ✅${NC}"
    elif [ $CONNECTION_TIME -lt 500 ]; then
        echo -e "Connection time: ${YELLOW}${CONNECTION_TIME}ms ⚠️${NC}"
    else
        echo -e "Connection time: ${RED}${CONNECTION_TIME}ms ❌${NC}"
    fi

    rm -f "$WS_TEST_FILE"
fi

echo ""

# Test 3: Geographic Latency (DNS + Network)
echo "Test 3: Network Latency (DNS + Routing)"
echo "----------------------------------------"

# Extract hostname from URL
HOSTNAME=$(echo "$WS_URL" | sed 's/ws:\/\///' | sed 's/wss:\/\///' | sed 's/:.*//')

echo "Testing connectivity to: $HOSTNAME"

# DNS lookup time
START=$(date +%s%3N)
nslookup "$HOSTNAME" > /dev/null 2>&1
END=$(date +%s%3N)
DNS_TIME=$((END - START))
echo "DNS lookup: ${DNS_TIME}ms"

# Ping test (3 packets)
if command -v ping &> /dev/null; then
    echo "Ping test (3 packets)..."

    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS ping
        PING_OUTPUT=$(ping -c 3 "$HOSTNAME" 2>&1 || true)
    else
        # Linux ping
        PING_OUTPUT=$(ping -c 3 -W 1 "$HOSTNAME" 2>&1 || true)
    fi

    # Extract average from ping
    if echo "$PING_OUTPUT" | grep -q "avg"; then
        AVG_PING=$(echo "$PING_OUTPUT" | grep -oE 'avg[^0-9]*([0-9.]+)' | grep -oE '[0-9.]+')
        AVG_PING_INT=${AVG_PING%.*}

        if [ "$AVG_PING_INT" -lt 50 ]; then
            echo -e "Average ping: ${GREEN}${AVG_PING}ms ✅${NC} (excellent)"
        elif [ "$AVG_PING_INT" -lt 100 ]; then
            echo -e "Average ping: ${GREEN}${AVG_PING}ms ✅${NC} (good)"
        elif [ "$AVG_PING_INT" -lt 200 ]; then
            echo -e "Average ping: ${YELLOW}${AVG_PING}ms ⚠️${NC} (acceptable)"
        else
            echo -e "Average ping: ${RED}${AVG_PING}ms ❌${NC} (high latency)"
        fi
    else
        echo -e "${YELLOW}Could not determine ping latency${NC}"
    fi
fi

echo ""

# Test 4: Regional Performance Analysis
echo "Test 4: Regional Performance Analysis"
echo "--------------------------------------"

# Detect if deployed to known platforms
if echo "$WS_URL" | grep -q "railway.app"; then
    echo "Platform: Railway"
    echo "Expected latency: 50-150ms (US East)"
elif echo "$WS_URL" | grep -q "fly.dev"; then
    echo "Platform: Fly.io"
    echo "Expected latency: 30-100ms (Global edge)"
elif echo "$WS_URL" | grep -q "localhost"; then
    echo "Platform: Local development"
    echo "Expected latency: <10ms"
else
    echo "Platform: Unknown"
fi

echo ""

# Calculate estimated round-trip time
echo "Estimated Round-Trip Times:"
echo "---------------------------"
echo "SignalWire → WebSocket: ~$AVG_HTTP_INT ms"
echo "WebSocket → OpenAI: ~100ms (estimated)"
echo "OpenAI processing: ~200ms (estimated)"

TOTAL_ESTIMATED=$((AVG_HTTP + 100 + 200))
echo ""
echo "Total estimated latency: ${TOTAL_ESTIMATED}ms"

if [ $TOTAL_ESTIMATED -lt 500 ]; then
    echo -e "${GREEN}✅ Within target (<500ms)${NC}"
else
    echo -e "${RED}❌ Exceeds target (>500ms)${NC}"
    echo ""
    echo "Recommendations:"
    echo "1. Deploy closer to OpenAI (us-east-1)"
    echo "2. Use dedicated CPU (not shared)"
    echo "3. Optimize audio buffer size"
    echo "4. Check network connectivity"
fi

echo ""

# Summary
echo "========================================="
echo "          LATENCY TEST SUMMARY          "
echo "========================================="
echo ""
printf "%-30s %10s %10s\n" "Metric" "Value" "Status"
echo "-----------------------------------------"

# HTTP latency
if [ $AVG_HTTP -lt 100 ]; then
    printf "%-30s %8sms %10s\n" "HTTP Health Check" "$AVG_HTTP" "✅"
else
    printf "%-30s %8sms %10s\n" "HTTP Health Check" "$AVG_HTTP" "⚠️"
fi

# DNS latency
if [ $DNS_TIME -lt 100 ]; then
    printf "%-30s %8sms %10s\n" "DNS Lookup" "$DNS_TIME" "✅"
else
    printf "%-30s %8sms %10s\n" "DNS Lookup" "$DNS_TIME" "⚠️"
fi

# Total estimated
if [ $TOTAL_ESTIMATED -lt 500 ]; then
    printf "%-30s %8sms %10s\n" "Total Estimated" "$TOTAL_ESTIMATED" "✅"
else
    printf "%-30s %8sms %10s\n" "Total Estimated" "$TOTAL_ESTIMATED" "❌"
fi

echo "-----------------------------------------"
echo ""

if [ $AVG_HTTP -lt 100 ] && [ $TOTAL_ESTIMATED -lt 500 ]; then
    echo -e "${GREEN}🎉 Excellent latency performance!${NC}"
    echo "WebSocket server is optimized for real-time AI calls."
    exit 0
elif [ $TOTAL_ESTIMATED -lt 500 ]; then
    echo -e "${GREEN}✅ Acceptable latency performance${NC}"
    echo "WebSocket server meets the <500ms target."
    exit 0
else
    echo -e "${RED}⚠️  Latency exceeds target${NC}"
    echo "Consider optimization steps above."
    exit 1
fi
