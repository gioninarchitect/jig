#!/bin/bash
# P35 — Build React SPA for production deployment
# Usage: bash scripts/build-react.sh

set -e

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REACT_DIR="$PROJECT_ROOT/react-app"

echo "=== DBC React Build ==="
echo "Project: $PROJECT_ROOT"
echo ""

# Step 1: Install dependencies (if needed)
if [ ! -d "$REACT_DIR/node_modules" ]; then
  echo "[1/3] Installing dependencies..."
  cd "$REACT_DIR" && npm install
else
  echo "[1/3] Dependencies OK"
fi

# Step 2: Build
echo "[2/3] Building React SPA..."
cd "$REACT_DIR" && npm run build

# Step 3: Verify
DIST_DIR="$REACT_DIR/dist"
if [ ! -f "$DIST_DIR/index.html" ]; then
  echo "ERROR: Build failed — no dist/index.html"
  exit 1
fi

INDEX_JS=$(ls "$DIST_DIR/assets/index-"*.js 2>/dev/null | head -1)
if [ -z "$INDEX_JS" ]; then
  echo "ERROR: Build failed — no index JS bundle"
  exit 1
fi

# Check asset paths use /app/ prefix
if grep -q 'src="/app/assets/' "$DIST_DIR/index.html"; then
  echo "[3/3] Verified: assets use /app/ prefix"
else
  echo "ERROR: Assets missing /app/ prefix — check vite.config.js base setting"
  exit 1
fi

CHUNK_COUNT=$(ls "$DIST_DIR/assets/"*.js 2>/dev/null | wc -l | tr -d ' ')
CSS_SIZE=$(wc -c < "$DIST_DIR/assets/index-"*.css 2>/dev/null | tr -d ' ')
JS_SIZE=$(wc -c < "$INDEX_JS" | tr -d ' ')

echo ""
echo "=== Build Complete ==="
echo "Chunks: $CHUNK_COUNT JS files"
echo "Main bundle: $(( JS_SIZE / 1024 )) KB"
echo "CSS: $(( CSS_SIZE / 1024 )) KB"
echo "Output: $DIST_DIR"
echo ""
echo "Express serves this at /app/* (see backend/server.js)"
