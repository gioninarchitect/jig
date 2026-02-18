#!/bin/bash
# ──────────────────────────────────────────────
# JIG Craft Cannabis - Server Setup & Deploy
#
# Run ON THE SERVER (154.66.197.199) as root.
# This script is idempotent - safe to run multiple times.
#
# Usage:
#   bash /tmp/deploy.sh          # Full setup + deploy
#   bash /tmp/deploy.sh --update # Skip DB/nginx setup, just deploy code
# ──────────────────────────────────────────────

set -euo pipefail

SERVER="154.66.197.199"
DOMAIN="jig.cleva-ai.co.za"
APP_DIR="/var/www/jig"
DB_NAME="jig"
DB_USER="jig_app"
PORT=3002
PM2_NAME="jig-api"

UPDATE_ONLY=false
if [ "${1:-}" = "--update" ]; then
  UPDATE_ONLY=true
fi

echo "========================================"
echo "  JIG DEPLOY - $(date)"
echo "  Mode: $([ "$UPDATE_ONLY" = true ] && echo 'UPDATE' || echo 'FULL SETUP')"
echo "========================================"

# ── 1. Create app directory ──────────────────
echo ""
echo "[1/8] App directory..."
mkdir -p "$APP_DIR"

# ── 2. PostgreSQL database ───────────────────
if [ "$UPDATE_ONLY" = false ]; then
  echo ""
  echo "[2/8] PostgreSQL setup..."

  # Create user if not exists
  if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
    echo "  User $DB_USER already exists"
  else
    DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
    sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
    echo "  Created user $DB_USER"
    echo "  PASSWORD: $DB_PASS"
    echo "  SAVE THIS - you need it for .env"
  fi

  # Create database if not exists
  if sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$DB_NAME"; then
    echo "  Database $DB_NAME already exists"
  else
    sudo -u postgres psql -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
    echo "  Created database $DB_NAME"
  fi

  # Grant privileges
  sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
  sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

  # Enable uuid-ossp extension
  sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";"
  echo "  Extensions enabled"

  # Run schema if tables don't exist
  if [ -f "$APP_DIR/database/schema.sql" ]; then
    TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';")
    if [ "$TABLE_COUNT" -lt 5 ]; then
      sudo -u postgres psql -d "$DB_NAME" -f "$APP_DIR/database/schema.sql"
      echo "  Schema applied"
    else
      echo "  Schema already applied ($TABLE_COUNT tables)"
    fi
  else
    echo "  WARNING: schema.sql not found - deploy code first, then re-run"
  fi
else
  echo ""
  echo "[2/8] PostgreSQL setup... SKIPPED (update mode)"
fi

# ── 3. Extract tarball ───────────────────────
echo ""
echo "[3/8] Extracting code..."
if [ -f /tmp/jig-deploy.tar.gz ]; then
  cd "$APP_DIR"
  tar -xzf /tmp/jig-deploy.tar.gz
  echo "  Extracted to $APP_DIR"
else
  echo "  WARNING: /tmp/jig-deploy.tar.gz not found"
  echo "  Upload it first, then re-run"
fi

# ── 4. Install dependencies ──────────────────
echo ""
echo "[4/8] npm install..."
cd "$APP_DIR"
if [ -f package.json ]; then
  npm install --production --silent
  echo "  Dependencies installed"
else
  echo "  WARNING: package.json not found"
fi

# ── 5. Environment file ─────────────────────
echo ""
echo "[5/8] Environment check..."
if [ ! -f "$APP_DIR/.env" ]; then
  echo "  WARNING: .env not found!"
  echo "  Create it from .env.example:"
  echo "    cp $APP_DIR/.env.example $APP_DIR/.env"
  echo "    nano $APP_DIR/.env"
  echo "  Then re-run this script with --update"
else
  echo "  .env exists"
fi

# ── 6. Seed database ────────────────────────
echo ""
echo "[6/8] Database seed..."
if [ -f "$APP_DIR/.env" ] && [ -f "$APP_DIR/database/seed.ts" ]; then
  # Check if products table has data
  source "$APP_DIR/.env" 2>/dev/null || true
  PRODUCT_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT count(*) FROM products;" 2>/dev/null || echo "0")
  if [ "$PRODUCT_COUNT" -lt 1 ]; then
    cd "$APP_DIR"
    npx ts-node --project tsconfig.server.json database/seed.ts
    echo "  Seed complete"
  else
    echo "  Already seeded ($PRODUCT_COUNT products)"
  fi
else
  echo "  SKIPPED (need .env and seed.ts)"
fi

# ── 7. nginx ─────────────────────────────────
if [ "$UPDATE_ONLY" = false ]; then
  echo ""
  echo "[7/8] nginx configuration..."

  if [ -f "$APP_DIR/deploy/nginx.conf" ]; then
    cp "$APP_DIR/deploy/nginx.conf" /etc/nginx/sites-available/jig

    if [ ! -L /etc/nginx/sites-enabled/jig ]; then
      ln -s /etc/nginx/sites-available/jig /etc/nginx/sites-enabled/jig
      echo "  Site enabled"
    else
      echo "  Site already enabled"
    fi

    nginx -t && systemctl reload nginx
    echo "  nginx reloaded"
  else
    echo "  WARNING: deploy/nginx.conf not found"
  fi

  # SSL certificate
  echo ""
  echo "  Requesting SSL certificate..."
  if certbot certificates 2>/dev/null | grep -q "$DOMAIN"; then
    echo "  SSL cert already exists for $DOMAIN"
  else
    certbot --nginx -d "$DOMAIN" --non-interactive --agree-tos --email admin@cleva-ai.co.za --redirect
    echo "  SSL certificate installed"
  fi
else
  echo ""
  echo "[7/8] nginx... SKIPPED (update mode)"
fi

# ── 8. PM2 ───────────────────────────────────
echo ""
echo "[8/8] PM2 process..."

# Set permissions
chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

if pm2 list | grep -q "$PM2_NAME"; then
  pm2 restart "$PM2_NAME"
  echo "  Restarted $PM2_NAME"
else
  cd "$APP_DIR"
  pm2 start ecosystem.config.js
  echo "  Started $PM2_NAME"
fi

pm2 save
echo "  PM2 config saved"

# ── Done ─────────────────────────────────────
echo ""
echo "========================================"
echo "  DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "  App:    https://$DOMAIN"
echo "  Health: https://$DOMAIN/health"
echo "  API:    https://$DOMAIN/api/v1"
echo "  Port:   $PORT"
echo "  PM2:    pm2 logs $PM2_NAME"
echo ""

# Verify health
echo "Checking health..."
sleep 2
if curl -sf "http://127.0.0.1:$PORT/health" > /dev/null 2>&1; then
  echo "  API is healthy"
  curl -s "http://127.0.0.1:$PORT/health" | python3 -m json.tool 2>/dev/null || true
else
  echo "  WARNING: Health check failed"
  echo "  Check logs: pm2 logs $PM2_NAME --lines 20"
fi
