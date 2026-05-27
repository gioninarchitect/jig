#!/bin/bash
# ──────────────────────────────────────────────
# PureGro Premium Cannabis Care - Chat Bot Deployment
# Run locally: bash deploy/deploy-chat.sh
# ──────────────────────────────────────────────
set -euo pipefail

SERVER="154.66.197.199"
APP_DIR="/var/www/jig"
PM2_NAME="puregro-api"
DB_NAME="jig"
TARBALL="/tmp/puregro-deploy.tar.gz"
PROJECT_DIR="$(cd "$(dirname "$0")/.." && pwd)"

echo "========================================"
echo "  PureGro CHAT DEPLOY - $(date)"
echo "========================================"

# ── 1. Build ─────────────────────────────────
echo ""
echo "[1/6] Building..."
cd "$PROJECT_DIR"
npm run build
echo "  Build complete"

# ── 2. Create tarball ────────────────────────
echo ""
echo "[2/6] Creating deployment package..."
COPYFILE_DISABLE=1 tar \
  --no-mac-metadata \
  --exclude='._*' \
  --exclude='.DS_Store' \
  --exclude='__MACOSX' \
  --exclude='.AppleDouble' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.next' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  -czf "$TARBALL" \
  dist/ database/ deploy/ package.json package-lock.json .env.example

# ── 3. Verify tarball ────────────────────────
echo ""
echo "[3/6] Verifying package..."
if tar -tzf "$TARBALL" | grep -qE '\.env$|\.env\.' ; then
  echo "  ABORT: .env files found in tarball!"
  rm -f "$TARBALL"
  exit 1
fi

# Verify critical files
for f in "dist/server/server/chat/chatEngine.js" "dist/server/server/chat/webhookRoutes.js" "database/migration-006-chat.sql" "dist/frontend/index.html"; do
  if ! tar -tzf "$TARBALL" | grep -q "$f"; then
    echo "  ABORT: Missing critical file: $f"
    rm -f "$TARBALL"
    exit 1
  fi
done
echo "  Package verified (no .env, all critical files present)"

# ── 4. Upload ────────────────────────────────
echo ""
echo "[4/6] Uploading to server..."
scp "$TARBALL" "root@${SERVER}:/tmp/puregro-deploy.tar.gz"
echo "  Upload complete"

# ── 5. Deploy on server ─────────────────────
echo ""
echo "[5/6] Deploying on server..."
ssh "root@${SERVER}" bash -s <<'REMOTE'
set -euo pipefail
APP_DIR="/var/www/jig"
DB_NAME="jig"
PM2_NAME="puregro-api"

cd "$APP_DIR"

# Extract
tar -xzf /tmp/puregro-deploy.tar.gz
echo "  Extracted"

# Install deps
npm install --production --silent
echo "  Dependencies installed"

# Run chat migration
if sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT 1 FROM pg_tables WHERE tablename='chat_user_links'" | grep -q 1; then
  echo "  Chat tables already exist - skipping migration"
else
  sudo -u postgres psql -d "$DB_NAME" -f "$APP_DIR/database/migration-006-chat.sql"
  echo "  Migration 006 applied"
fi

# Add Telegram token to .env if not already there
if ! grep -q "TELEGRAM_BOT_TOKEN" "$APP_DIR/.env" 2>/dev/null; then
  cat >> "$APP_DIR/.env" <<'EOF'

# Chat Bot (Telegram)
TELEGRAM_BOT_TOKEN=your-telegram-bot-token-here
TELEGRAM_WEBHOOK_SECRET=
EOF
  echo "  Telegram token added to .env"
else
  echo "  Telegram token already in .env"
fi

# Fix permissions
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"
echo "  Permissions set"

# Restart
pm2 restart "$PM2_NAME"
pm2 save
echo "  PM2 restarted"

# Cleanup
rm -f /tmp/puregro-deploy.tar.gz
REMOTE
echo "  Server deployment complete"

# ── 6. Health check ──────────────────────────
echo ""
echo "[6/6] Health check..."
sleep 3
ssh "root@${SERVER}" "curl -sf http://127.0.0.1:3002/health" && echo "" || echo "  WARNING: Health check failed - check pm2 logs puregro-api"

# ── Done ─────────────────────────────────────
echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "  App:     https://jig.cleva-ai.co.za"
echo "  Health:  https://jig.cleva-ai.co.za/health"
echo "  Admin:   https://jig.cleva-ai.co.za/admin/chat"
echo ""
echo "  Next: Set webhook from admin panel:"
echo "  URL: https://jig.cleva-ai.co.za/api/v1/chat/webhook/telegram"
echo ""

rm -f "$TARBALL"
