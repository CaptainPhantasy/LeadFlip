#!/bin/bash
# [2025-10-01 8:35 PM] Agent 5: Build script for WebSocket server

echo "🔨 Building WebSocket server..."

# Clean dist directory
rm -rf dist/server
mkdir -p dist/server
mkdir -p dist/lib/agents
mkdir -p dist/types

# Build WebSocket server with tsx (TypeScript execution)
echo "📦 Compiling TypeScript..."
npx tsc \
  --target ES2020 \
  --module commonjs \
  --outDir dist \
  --rootDir src \
  --esModuleInterop \
  --skipLibCheck \
  --resolveJsonModule \
  --moduleResolution node \
  --downlevelIteration \
  src/server/websocket-server.ts \
  src/lib/agents/call-agent.ts

echo "✅ Build complete!"
echo "📂 Output: dist/server/websocket-server.js"
echo ""
echo "To run: node dist/server/websocket-server.js"
