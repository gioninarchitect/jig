#!/bin/bash
# ──────────────────────────────────────────────
# JIG Craft Cannabis - One-Shot Deploy
#
# Run locally. Builds, packages, uploads, and
# sets up everything on the server.
#
# Usage:
#   bash deploy.sh          # Full setup (first time)
#   bash deploy.sh --update # Code update only
# ──────────────────────────────────────────────

set -euo pipefail

PROJECT_DIR="/Users/florisolivier/jig"
SERVER="154.66.197.199"
DOMAIN="jig.cleva-ai.co.za"
APP_DIR="/var/www/jig"
DB_NAME="jig"
DB_USER="jig_app"
PORT=3002
PM2_NAME="jig-api"
TARBALL="/tmp/jig-deploy.tar.gz"

UPDATE_ONLY=false
if [ "${1:-}" = "--update" ]; then
  UPDATE_ONLY=true
fi

echo "========================================"
echo "  JIG DEPLOY - $(date)"
echo "  Mode: $([ "$UPDATE_ONLY" = true ] && echo 'UPDATE' || echo 'FULL SETUP')"
echo "========================================"

# ── LOCAL: Build ─────────────────────────────
echo ""
echo "[1/5] Building locally..."
cd "$PROJECT_DIR"
npm run build
echo "  Build complete"

# ── LOCAL: Test ──────────────────────────────
echo ""
echo "[2/5] Running tests..."
npx jest --passWithNoTests
echo "  Tests passed"

# ── LOCAL: Package ───────────────────────────
echo ""
echo "[3/5] Creating tarball..."
COPYFILE_DISABLE=1 tar \
  --no-mac-metadata \
  --exclude='._*' \
  --exclude='.DS_Store' \
  --exclude='__MACOSX' \
  --exclude='.AppleDouble' \
  --exclude='node_modules' \
  --exclude='.git' \
  --exclude='.env' \
  --exclude='.env.*' \
  --exclude='.env.local' \
  --exclude='.env.production' \
  -czf "$TARBALL" \
  -C "$PROJECT_DIR" .

TARBALL_SIZE=$(du -h "$TARBALL" | cut -f1)
echo "  Tarball: $TARBALL ($TARBALL_SIZE)"

# Verify no .env leaked in
if tar -tzf "$TARBALL" | grep -qE '\.env$|\.env\.' ; then
  echo "  ABORT: .env files found in tarball!"
  exit 1
fi
echo "  Verified: no .env files"

# ── UPLOAD ───────────────────────────────────
echo ""
echo "[4/5] Uploading to $SERVER..."
scp "$TARBALL" "root@$SERVER:/tmp/jig-deploy.tar.gz"
echo "  Upload complete"

# ── REMOTE: Deploy ───────────────────────────
echo ""
echo "[5/5] Deploying on server..."

ssh "root@$SERVER" bash -s -- "$UPDATE_ONLY" "$APP_DIR" "$DB_NAME" "$DB_USER" "$PORT" "$PM2_NAME" "$DOMAIN" <<'REMOTE_SCRIPT'
set -euo pipefail

UPDATE_ONLY="$1"
APP_DIR="$2"
DB_NAME="$3"
DB_USER="$4"
PORT="$5"
PM2_NAME="$6"
DOMAIN="$7"

echo ""
echo "── Server: Extracting code ────────────"
mkdir -p "$APP_DIR"
cd "$APP_DIR"
tar -xzf /tmp/jig-deploy.tar.gz 2>/dev/null
rm -f /tmp/jig-deploy.tar.gz
echo "  Extracted to $APP_DIR"

echo ""
echo "── Server: npm install ────────────────"
cd "$APP_DIR"
npm install --production --silent 2>&1 | tail -3
echo "  Dependencies installed"

# ── Database setup (full mode only) ──────────
if [ "$UPDATE_ONLY" = "false" ]; then
  echo ""
  echo "── Server: PostgreSQL setup ───────────"

  DB_PASS=""
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    echo "  User $DB_USER exists"
  else
    DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
    echo ""
    echo "  ┌─────────────────────────────────────────┐"
    echo "  │  NEW DATABASE PASSWORD                   │"
    echo "  │  User: $DB_USER"
    echo "  │  Pass: $DB_PASS"
    echo "  │  SAVE THIS NOW                           │"
    echo "  └─────────────────────────────────────────┘"
    echo ""
  fi

  if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "  Database $DB_NAME exists"
  else
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo "  Created database $DB_NAME"
  fi

  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null
  sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" > /dev/null
  sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > /dev/null

  if [ -f "$APP_DIR/database/schema.sql" ]; then
    TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")
    if [ "$TABLE_COUNT" -lt 5 ]; then
      sudo -u postgres psql -d "$DB_NAME" -f "$APP_DIR/database/schema.sql" > /dev/null
      echo "  Schema applied"
    else
      echo "  Schema already applied ($TABLE_COUNT tables)"
    fi
  fi

  # ── nginx ──────────────────────────────────
  echo ""
  echo "── Server: nginx ──────────────────────"

  if [ -f "$APP_DIR/deploy/nginx.conf" ]; then
    cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/jig

    if [ ! -L /etc/nginx/sites-enabled/jig ]; then
      ln -s /etc/nginx/sites-available/jig /etc/nginx/sites-enabled/jig
      echo "  Site enabled"
    fi

    nginx -t 2>&1 && systemctl reload nginx
    echo "  nginx reloaded"
  fi

  # ── SSL ────────────────────────────────────
  echo ""
  echo "── Server: SSL certificate ────────────"
  if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo "  SSL cert exists for $DOMAIN"
  else
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@cleva-ai.co.za --redirect
    echo "  SSL certificate installed"
  fi

fi

# ── .env check ─────────────────────────────
echo ""
echo "── Server: Environment ────────────────"
if [ ! -f "$APP_DIR/.env" ]; then
  echo ""
  echo "  ╔═══════════════════════════════════════╗"
  echo "  ║  .env FILE MISSING                    ║"
  echo "  ║                                       ║"
  echo "  ║  cp $APP_DIR/.env.example $APP_DIR/.env"
  echo "  ║  nano $APP_DIR/.env                   ║"
  echo "  ║                                       ║"
  echo "  ║  Fill in DATABASE_URL and SMTP_PASS   ║"
  echo "  ║  Then re-run with --update            ║"
  echo "  ╚═══════════════════════════════════════╝"
  echo ""
else
  echo "  .env exists"
fi

# ── Seed ───────────────────────────────────
if [ -f "$APP_DIR/.env" ]; then
  PRODUCT_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT count(*) FROM products;" 2>/dev/null || echo "0")
  if [ "${PRODUCT_COUNT// /}" -lt 1 ]; then
    echo ""
    echo "── Server: Seeding database ───────────"
    cd "$APP_DIR"
    node dist/seed/seed.js
    echo "  Seed complete"
  fi
fi

# ── Permissions ────────────────────────────
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

# ── PM2 ────────────────────────────────────
echo ""
echo "── Server: PM2 ────────────────────────"
if pm2 list 2>/dev/null | grep -q "$PM2_NAME"; then
  pm2 restart "$PM2_NAME"
  echo "  Restarted $PM2_NAME"
else
  cd "$APP_DIR"
  pm2 start ecosystem.config.js
  echo "  Started $PM2_NAME"
fi
pm2 save > /dev/null
echo "  PM2 saved"

# ── Health check ─────────────────────────
echo ""
echo "── Server: Health check ─────────────"
sleep 2
if curl -sf "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
  echo "  API is HEALTHY"
  curl -s "http://127.0.0.1:$PORT/health"
  echo ""
else
  echo "  WARNING: Health check failed"
  echo "  Check: pm2 logs $PM2_NAME --lines 30"
fi

echo ""
echo "========================================"
echo "  DEPLOY COMPLETE"
echo "  https://$DOMAIN"
echo "  https://$DOMAIN/health"
echo "========================================"
REMOTE_SCRIPT

# ── LOCAL: Cleanup ───────────────────────────
rm -f "$TARBALL"
echo ""
echo "Done. Local tarball cleaned up."
