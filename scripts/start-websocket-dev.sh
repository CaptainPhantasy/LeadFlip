#!/bin/bash
# [2025-10-01 8:35 PM] Agent 5: WebSocket development startup script
# Loads environment variables and starts WebSocket server

set -e

echo "🔧 Starting WebSocket server in development mode..."
echo ""

# Load environment variables from .env.local
if [ -f .env.local ]; then
  export $(grep -v '^#' .env.local | xargs)
  echo "✅ Environment variables loaded from .env.local"
else
  echo "⚠️  Warning: .env.local not found"
fi

# Verify required environment variables
REQUIRED_VARS=(
  "NEXT_PUBLIC_SUPABASE_URL"
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
  "ANTHROPIC_API_KEY"
  "OPENAI_API_KEY"
)

MISSING_VARS=()

for VAR in "${REQUIRED_VARS[@]}"; do
  if [ -z "${!VAR}" ]; then
    MISSING_VARS+=("$VAR")
  fi
done

if [ ${#MISSING_VARS[@]} -gt 0 ]; then
  echo "❌ Missing required environment variables:"
  for VAR in "${MISSING_VARS[@]}"; do
    echo "   - $VAR"
  done
  echo ""
  echo "Please add these to your .env.local file"
  exit 1
fi

echo "✅ All required environment variables present"
echo ""
echo "📡 Starting WebSocket server on port ${WEBSOCKET_PORT:-8080}..."
echo ""

# Start WebSocket server
npm run websocket-server
