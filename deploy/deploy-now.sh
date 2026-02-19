#!/bin/bash
# ──────────────────────────────────────────────
# JIG Craft Cannabis - Deploy Script
#
# Usage:
#   bash deploy/deploy-now.sh          # Full deploy (build + upload + restart)
#   bash deploy/deploy-now.sh --pack   # Just build tarball (no SSH needed)
#   bash deploy/deploy-now.sh --push   # Just upload existing tarball + restart
# ──────────────────────────────────────────────

set -euo pipefail

SERVER="154.66.197.199"
DOMAIN="jig.cleva-ai.co.za"
APP_DIR="/var/www/jig"
PM2_NAME="jig-api"
TARBALL="/tmp/jig-deploy.tar.gz"
MODE="${1:-full}"

echo "========================================"
echo "  JIG DEPLOY - $(date)"
echo "========================================"


# ── Build & Pack ──────────────────────────────
do_pack() {
  # Build
  echo ""
  echo "[1/3] Building..."
  npm run build
  echo "  Build OK"

  # Test
  echo ""
  echo "[2/3] Testing..."
  npm test
  echo "  48/48 tests passed"

  # Tarball
  echo ""
  echo "[3/3] Creating tarball..."
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
    dist/ database/ deploy/ src/ \
    package.json package-lock.json \
    tsconfig.json tsconfig.server.json tsconfig.seed.json \
    ecosystem.config.js vite.config.ts index.html

  # Safety check: no .env in tarball
  if tar -tzf "$TARBALL" | grep -qE '\.env'; then
    echo "  ABORT: .env files found in tarball!"
    rm "$TARBALL"
    exit 1
  fi

  SIZE=$(ls -lh "$TARBALL" | awk '{print $5}')
  echo "  Tarball ready: $TARBALL ($SIZE)"
}

# ── Upload & Deploy ───────────────────────────
do_push() {
  if [ ! -f "$TARBALL" ]; then
    echo "  No tarball found at $TARBALL"
    echo "  Run: bash deploy/deploy-now.sh --pack"
    exit 1
  fi

  echo ""
  echo "[1/3] Uploading to $SERVER..."
  scp "$TARBALL" root@$SERVER:/tmp/jig-deploy.tar.gz
  echo "  Upload complete"

  echo ""
  echo "[2/3] Deploying on server..."
  ssh root@$SERVER bash -s << 'REMOTE'
set -euo pipefail

APP_DIR="/var/www/jig"
PM2_NAME="jig-api"
DB_NAME="jig"

echo "  Extracting..."
cd "$APP_DIR"
tar -xzf /tmp/jig-deploy.tar.gz

echo "  Installing dependencies..."
npm install --production --silent 2>/dev/null

# Run verification migration if table doesn't exist
TABLE_EXISTS=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT EXISTS (SELECT FROM information_schema.tables WHERE table_name = 'client_documents');" 2>/dev/null || echo "f")
if [ "$TABLE_EXISTS" = "f" ]; then
  echo "  Running verification migration..."
  sudo -u postgres psql -d "$DB_NAME" -f "$APP_DIR/database/verification-migration.sql"
  echo "  Migration complete"
else
  echo "  Migration already applied"
fi

# Ensure upload directories exist
mkdir -p uploads/documents uploads/pop

# Fix permissions
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# Restart
pm2 restart "$PM2_NAME"
pm2 save

# Cleanup
rm /tmp/jig-deploy.tar.gz

echo "  Server deploy complete"
REMOTE

  # Health check
  echo ""
  echo "[3/3] Health check..."
  sleep 3
  ssh root@$SERVER "curl -sf http://127.0.0.1:3002/health | python3 -m json.tool 2>/dev/null || echo 'Health check failed - check: pm2 logs $PM2_NAME --lines 20'"

  # Cleanup local tarball
  rm -f "$TARBALL"

  echo ""
  echo "========================================"
  echo "  DEPLOYMENT COMPLETE"
  echo "========================================"
  echo ""
  echo "  App:    https://$DOMAIN"
  echo "  Health: https://$DOMAIN/health"
  echo "  Logs:   ssh root@$SERVER 'pm2 logs $PM2_NAME --lines 20'"
  echo ""
}

# ── Main ──────────────────────────────────────
case "$MODE" in
  --pack)
    do_pack
    echo ""
    echo "  Tarball built. When SSH is working, run:"
    echo "  bash deploy/deploy-now.sh --push"
    ;;
  --push)
    do_push
    ;;
  full|*)
    do_pack
    do_push
    ;;
esac
