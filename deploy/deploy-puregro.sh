#!/bin/bash
# ═══════════════════════════════════════════════════════════════
# PureGro Deployment Script
# Deploys POS + B2B to puregro.cleva-ai.co.za (154.66.197.199)
#
# Usage:  ./deploy/deploy-puregro.sh [step]
#
# Steps:
#   all       — Full deploy (build, pack, upload, setup, seed, ssl)
#   build     — Build B2B app locally
#   pack      — Create deployment tarballs
#   upload    — SCP tarballs + configs to server
#   setup     — Extract, install deps, configure nginx, start PM2
#   seed      — Run database seeds (branches + products + B2B schema)
#   ssl       — Set up SSL with certbot
#   verify    — Health checks
#   update    — Quick redeploy (build, pack, upload, restart PM2)
#   hotfix    — Full redeploy + fix port to 3004 + nginx + seed users
#   portfix   — Server-only: move POS to port 3004 (no rebuild/upload)
#   telegram  — Activate Telegram bot (token + webhook)
#   demo      — Full demo deploy (build + hotfix + telegram + verify)
#
# ═══════════════════════════════════════════════════════════════

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────
SERVER="154.66.197.199"
SERVER_USER="root"
DOMAIN="puregro.cleva-ai.co.za"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
POS_DIR="$LOCAL_ROOT/JIGPOS/newbrand"
B2B_DIR="$LOCAL_ROOT"
REMOTE_BASE="/var/www/puregro"
REMOTE_POS="$REMOTE_BASE/pos"
REMOTE_B2B="$REMOTE_BASE/b2b"
TMP="/tmp"

# SMTP
SMTP_HOST="mail.cleva-ai.co.za"
SMTP_PORT="465"
SMTP_USER="otp@cleva-ai.co.za"
SMTP_PASS="B0t2026!@#"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${GREEN}[OK]${NC} $1"; }
warn() { echo -e "${YELLOW}[!!]${NC} $1"; }
err()  { echo -e "${RED}[ERR]${NC} $1"; exit 1; }
step() { echo -e "\n${CYAN}═══ $1 ═══${NC}"; }

# ── Step: Build ────────────────────────────────────────────────
do_build() {
    step "Building B2B app"
    cd "$B2B_DIR"
    npm run build 2>&1 | tail -5
    log "B2B build complete (dist/server + dist/frontend)"
}

# ── Step: Pack ─────────────────────────────────────────────────
do_pack() {
    step "Creating deployment tarballs"

    # POS tarball
    cd "$POS_DIR"
    COPYFILE_DISABLE=1 tar --no-mac-metadata \
        --exclude='._*' --exclude='.DS_Store' --exclude='__MACOSX' --exclude='.AppleDouble' \
        --exclude='node_modules' --exclude='.git' --exclude='.env' --exclude='.env.*' \
        --exclude='.env.local' --exclude='.env.production' \
        --exclude='archived' --exclude='react-app/node_modules' --exclude='react-app/.env' \
        -czf "$TMP/puregro-pos.tar.gz" .
    log "POS tarball: $(du -h $TMP/puregro-pos.tar.gz | cut -f1)"

    # B2B tarball
    cd "$B2B_DIR"
    COPYFILE_DISABLE=1 tar --no-mac-metadata \
        --exclude='._*' --exclude='.DS_Store' --exclude='__MACOSX' --exclude='.AppleDouble' \
        --exclude='node_modules' --exclude='.git' --exclude='.next' \
        --exclude='.env' --exclude='.env.*' --exclude='.env.local' --exclude='.env.production' \
        --exclude='JIGPOS' --exclude='ds' \
        -czf "$TMP/puregro-b2b.tar.gz" \
        dist/ database/ package.json package-lock.json ecosystem.config.js deploy/ public/
    log "B2B tarball: $(du -h $TMP/puregro-b2b.tar.gz | cut -f1)"

    # Verify no .env leaked
    if tar -tzf "$TMP/puregro-pos.tar.gz" | grep -qE '^\.env$|/\.env$'; then
        err "ABORT: .env found in POS tarball!"
    fi
    if tar -tzf "$TMP/puregro-b2b.tar.gz" | grep -qE '^\.env$|/\.env$'; then
        err "ABORT: .env found in B2B tarball!"
    fi
    log "No .env files in tarballs"

    # Create production .env files
    cat > "$TMP/puregro-pos.env" <<POSENV
# PureGro POS - Production
MONGODB_URI=mongodb://localhost:27017/puregro
JWT_SECRET=puregro_pos_a8f3c2e91b7d045f6e
PORT=3004
NODE_ENV=production
BASE_URL=https://$DOMAIN/pos
INTERNAL_API_KEY=puregro_internal_2026
ORIGIN_RETAIL_CORE_API_URL=http://127.0.0.1:3002/api/v1/origin-retail/pharmacy-core
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=true
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
SMTP_FROM_EMAIL=$SMTP_USER
SMTP_FROM_NAME=PureGro Premium Cannabis Care
OTP_SMTP_HOST=$SMTP_HOST
OTP_SMTP_PORT=$SMTP_PORT
OTP_SMTP_SECURE=true
OTP_SMTP_USER=$SMTP_USER
OTP_SMTP_PASS=$SMTP_PASS
OTP_SMTP_FROM=$SMTP_USER
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
POSENV
    log "POS .env created"

    cat > "$TMP/puregro-b2b.env" <<B2BENV
# PureGro B2B Wholesale - Production
DATABASE_URL=postgresql://puregro:puregro_prod_2026@localhost:5432/puregro
JWT_SECRET=puregro_b2b_c4d7e9f01a3b5826d1
PORT=3002
NODE_ENV=production
CORS_ORIGIN=https://$DOMAIN
ADMIN_EMAILS=admin@cleva-ai.co.za,florisolivier7@gmail.com
VITE_ADMIN_EMAILS=admin@cleva-ai.co.za,florisolivier7@gmail.com
INTERNAL_API_KEY=puregro_internal_2026
SMTP_HOST=$SMTP_HOST
SMTP_PORT=$SMTP_PORT
SMTP_SECURE=true
SMTP_USER=$SMTP_USER
SMTP_PASS=$SMTP_PASS
JIG_COMPANY_NAME=PureGro Premium Cannabis Care (Pty) Ltd
JIG_COMPANY_REG=2024/123456/07
JIG_COMPANY_VAT=4123456789
JIG_COMPANY_ADDRESS=Western Cape, South Africa
JIG_COMPANY_EMAIL=admin@cleva-ai.co.za
JIG_COMPANY_PHONE=+27 84 796 8457
JIG_BANK_NAME=First National Bank
JIG_BANK_ACCOUNT_NAME=PureGro Premium Cannabis Care (Pty) Ltd
JIG_BANK_ACCOUNT_NUMBER=6200 1234 567
JIG_BANK_BRANCH_CODE=250655
JIG_BANK_REFERENCE=Use your PO number as reference
POS_API_URL=http://127.0.0.1:3004
B2BENV
    log "B2B .env created"
}

# ── Step: Upload ───────────────────────────────────────────────
do_upload() {
    step "Uploading to $SERVER"
    scp "$TMP/puregro-pos.tar.gz" \
        "$TMP/puregro-b2b.tar.gz" \
        "$TMP/puregro-pos.env" \
        "$TMP/puregro-b2b.env" \
        "$SERVER_USER@$SERVER:/tmp/"
    log "All files uploaded to server /tmp/"
}

# ── Step: Setup ────────────────────────────────────────────────
do_setup() {
    step "Setting up server"
    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_SETUP'
set -euo pipefail

echo "[1/7] Creating directories..."
mkdir -p /var/www/puregro/{pos,b2b,uploads} /var/log/pm2

echo "[2/7] Extracting POS..."
cd /var/www/puregro/pos
rm -rf backend frontend css images scripts *.html *.js *.json 2>/dev/null || true
tar -xzf /tmp/puregro-pos.tar.gz
cp /tmp/puregro-pos.env .env

echo "[3/7] Installing POS dependencies..."
npm install --production --silent 2>&1 | tail -3

echo "[4/7] Extracting B2B..."
cd /var/www/puregro/b2b
tar -xzf /tmp/puregro-b2b.tar.gz
cp /tmp/puregro-b2b.env .env

echo "[5/7] Installing B2B dependencies..."
npm install --production --silent 2>&1 | tail -3

echo "[6/7] Configuring nginx..."
cp /var/www/puregro/b2b/deploy/nginx.conf /etc/nginx/sites-available/puregro
ln -sf /etc/nginx/sites-available/puregro /etc/nginx/sites-enabled/
# Remove default site if it conflicts
rm -f /etc/nginx/sites-enabled/default 2>/dev/null || true
nginx -t
systemctl reload nginx

echo "[7/7] Setting permissions & starting PM2..."
chown -R www-data:www-data /var/www/puregro
chmod -R 755 /var/www/puregro

# Stop old processes if any
pm2 delete puregro-pos puregro-b2b 2>/dev/null || true

# Start both apps
cd /var/www/puregro/b2b
pm2 start ecosystem.config.js
pm2 save

# Cleanup
rm -f /tmp/puregro-*.tar.gz /tmp/puregro-*.env

echo ""
echo "Server setup complete!"
pm2 status
REMOTE_SETUP
    log "Server setup done"
}

# ── Step: Seed ─────────────────────────────────────────────────
do_seed() {
    step "Running database seeds"
    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_SEED'
set -euo pipefail

echo "[1/4] Seeding POS branches..."
cd /var/www/puregro/pos
node backend/scripts/seed-branches.js

echo "[2/5] Seeding POS products..."
node backend/scripts/seed-puregro-products.js

echo "[3/5] Setting up POS staff users..."
node backend/scripts/setup-dev-users.js

echo "[4/5] Setting up PostgreSQL for B2B..."
# Create user and database if they don't exist
sudo -u postgres psql -tc "SELECT 1 FROM pg_roles WHERE rolname='puregro'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE USER puregro WITH PASSWORD 'puregro_prod_2026';"
sudo -u postgres psql -tc "SELECT 1 FROM pg_database WHERE datname='puregro'" | grep -q 1 || \
    sudo -u postgres psql -c "CREATE DATABASE puregro OWNER puregro;"

echo "[5/6] Running B2B schema + seed..."
cd /var/www/puregro/b2b
node dist/seed/seed.js

echo "[6/7] Applying chat migration (if not already applied)..."
sudo -u postgres psql -U puregro -d puregro <<'SQL'
DO $$ BEGIN CREATE TYPE chat_platform AS ENUM ('telegram', 'whatsapp', 'slack'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
DO $$ BEGIN CREATE TYPE chat_link_state AS ENUM ('pending_email', 'pending_otp', 'linked'); EXCEPTION WHEN duplicate_object THEN NULL; END $$;
CREATE TABLE IF NOT EXISTS chat_user_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  platform chat_platform NOT NULL,
  platform_user_id VARCHAR(100) NOT NULL,
  platform_username VARCHAR(100),
  platform_display_name VARCHAR(255),
  link_state chat_link_state NOT NULL DEFAULT 'pending_email',
  pending_email VARCHAR(255),
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  message_count INTEGER NOT NULL DEFAULT 0,
  last_message_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(platform, platform_user_id)
);
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  link_id UUID NOT NULL REFERENCES chat_user_links(id) ON DELETE CASCADE,
  messages JSONB NOT NULL DEFAULT '[]',
  pending_action JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(link_id)
);
CREATE INDEX IF NOT EXISTS idx_chat_links_platform ON chat_user_links(platform, platform_user_id);
CREATE INDEX IF NOT EXISTS idx_chat_links_client ON chat_user_links(client_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_link ON chat_sessions(link_id);
SQL

echo "[7/7] Applying Origin Retail pharmacy pivot migration..."
sudo -u postgres psql -U puregro -d puregro -v ON_ERROR_STOP=1 -f /var/www/puregro/b2b/database/migration-009-pharmacy-pivot.sql

echo ""
echo "All databases seeded!"
REMOTE_SEED
    log "Database seeds complete"
}

# ── Step: Reseed (upload latest scripts + run seeds) ──────────
do_reseed() {
    step "Uploading latest seed scripts + running seeds"

    # Pack just the seed scripts
    cd "$POS_DIR"
    COPYFILE_DISABLE=1 tar --no-mac-metadata \
        --exclude='._*' --exclude='.DS_Store' \
        -czf "$TMP/puregro-seeds.tar.gz" \
        backend/scripts/seed-branches.js \
        backend/scripts/seed-puregro-products.js \
        backend/scripts/setup-dev-users.js

    scp "$TMP/puregro-seeds.tar.gz" "$SERVER_USER@$SERVER:/tmp/"

    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_RESEED'
set -euo pipefail

cd /var/www/puregro/pos

echo "[1/5] Extracting latest seed scripts..."
tar -xzf /tmp/puregro-seeds.tar.gz
rm -f /tmp/puregro-seeds.tar.gz

echo "[2/5] Seeding branches..."
node backend/scripts/seed-branches.js

echo "[3/5] Seeding products (mdcStage=live, isActive=true)..."
node backend/scripts/seed-puregro-products.js

echo "[4/5] Seeding staff users..."
node backend/scripts/setup-dev-users.js

echo "[5/5] Verifying..."
node -e "
const mongoose = require('mongoose');
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/puregro').then(async () => {
  const P = require('./backend/modules/database/models/Product');
  const Branch = require('./backend/modules/database/models/Branch');
  const User = require('./backend/modules/database/models/User');
  const BI = mongoose.models.BranchInventory || mongoose.model('BranchInventory', new mongoose.Schema({}, {strict: false}));
  const products = await P.countDocuments({status:'active'});
  const live = await P.countDocuments({mdcStage:'live'});
  const branches = await Branch.countDocuments({isActive:true});
  const users = await User.countDocuments();
  const inventory = await BI.countDocuments();
  console.log('Products:', products, '(MDC live:', live + ')');
  console.log('Branches:', branches);
  console.log('Users:', users);
  console.log('BranchInventory:', inventory);
  mongoose.disconnect();
});
"

echo ""
echo "Reseed complete!"
REMOTE_RESEED
    log "Reseed done"
}

# ── Step: SSL ──────────────────────────────────────────────────
do_ssl() {
    step "Setting up SSL"
    ssh "$SERVER_USER@$SERVER" "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@cleva-ai.co.za"
    log "SSL configured for $DOMAIN"
}

# ── Step: Verify ───────────────────────────────────────────────
do_verify() {
    step "Running health checks"

    echo -n "  B2B health:  "
    curl -sf "https://$DOMAIN/health" 2>/dev/null && echo "" || warn "FAILED (DNS or SSL not ready? trying HTTP...)" && \
    curl -sf "http://$SERVER/health" 2>/dev/null && echo "" || true

    echo -n "  POS home:    "
    curl -sf -o /dev/null -w "%{http_code}" "https://$DOMAIN/pos/" 2>/dev/null || \
    curl -sf -o /dev/null -w "%{http_code}" "http://$SERVER/pos/" 2>/dev/null || echo "FAILED"
    echo ""

    echo -n "  POS API:     "
    curl -sf -o /dev/null -w "%{http_code}" "https://$DOMAIN/pos/api/v1/products" 2>/dev/null || \
    curl -sf -o /dev/null -w "%{http_code}" "http://$SERVER/pos/api/v1/products" 2>/dev/null || echo "FAILED"
    echo ""

    ssh "$SERVER_USER@$SERVER" "pm2 status"
    log "Verification complete"
}

# ── Step: Update (quick redeploy) ──────────────────────────────
do_update() {
    step "Quick update (build + pack + upload + restart)"
    do_build
    do_pack
    do_upload
    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_UPDATE'
set -euo pipefail

echo "Extracting POS..."
cd /var/www/puregro/pos
# Preserve .env
cp .env /tmp/puregro-pos-env-backup 2>/dev/null || true
tar -xzf /tmp/puregro-pos.tar.gz
cp /tmp/puregro-pos-env-backup .env 2>/dev/null || cp /tmp/puregro-pos.env .env
npm install --production --silent 2>&1 | tail -3

echo "Extracting B2B..."
cd /var/www/puregro/b2b
cp .env /tmp/puregro-b2b-env-backup 2>/dev/null || true
tar -xzf /tmp/puregro-b2b.tar.gz
cp /tmp/puregro-b2b-env-backup .env 2>/dev/null || cp /tmp/puregro-b2b.env .env
npm install --production --silent 2>&1 | tail -3

echo "Updating nginx config..."
cp /var/www/puregro/b2b/deploy/nginx.conf /etc/nginx/sites-available/puregro
nginx -t && systemctl reload nginx
# Re-apply SSL if certbot was previously configured
certbot --nginx -d puregro.cleva-ai.co.za --non-interactive --agree-tos --email admin@cleva-ai.co.za 2>/dev/null || true

echo "Setting permissions..."
chown -R www-data:www-data /var/www/puregro
chmod -R 755 /var/www/puregro

echo "Ensuring POS_API_URL in B2B .env..."
cd /var/www/puregro/b2b
grep -q 'POS_API_URL' .env 2>/dev/null || echo 'POS_API_URL=http://127.0.0.1:3004' >> .env
grep -q 'INTERNAL_API_KEY' .env 2>/dev/null || echo 'INTERNAL_API_KEY=puregro_internal_2026' >> .env

echo "Ensuring Origin Retail core proxy env in POS .env..."
cd /var/www/puregro/pos
grep -q 'INTERNAL_API_KEY' .env 2>/dev/null || echo 'INTERNAL_API_KEY=puregro_internal_2026' >> .env
grep -q 'ORIGIN_RETAIL_CORE_API_URL' .env 2>/dev/null || echo 'ORIGIN_RETAIL_CORE_API_URL=http://127.0.0.1:3002/api/v1/origin-retail/pharmacy-core' >> .env

echo "Applying Origin Retail pharmacy pivot migration..."
sudo -u postgres psql -U puregro -d puregro -v ON_ERROR_STOP=1 -f /var/www/puregro/b2b/database/migration-009-pharmacy-pivot.sql

echo "Restarting PM2..."
pm2 delete puregro-pos 2>/dev/null || true
cd /var/www/puregro/pos
export PORT=3004
pm2 start backend/server.js --name puregro-pos
pm2 restart puregro-b2b
pm2 save
sleep 3
pm2 status

echo "Activating MDC products (pending -> live)..."
mongosh --quiet 'mongodb://localhost:27017/puregro' --eval 'const r = db.products.updateMany({status:"active",mdcStage:{$ne:"live"}},{$set:{mdcStage:"live"}}); print("MDC activated: " + r.modifiedCount + " products set to live"); print("Total live: " + db.products.countDocuments({mdcStage:"live"}));' || echo "(MDC activation skipped)"

rm -f /tmp/puregro-*.tar.gz /tmp/puregro-*.env /tmp/puregro-*-env-backup

echo "Update complete!"
REMOTE_UPDATE
    log "Update deployed"
}

# ── Step: Hotfix (full redeploy + port fix + nginx + seed) ────
do_hotfix() {
    step "Hotfix: fix port, update nginx, seed users"
    do_pack
    do_upload
    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_HOTFIX'
set -euo pipefail

echo "[1/7] Stopping puregro-pos..."
pm2 delete puregro-pos 2>/dev/null || true
sleep 1
# Kill anything on port 3004 (NOT 3003 — dbc lives there)
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
sleep 1

echo "[2/7] Checking port 3004 is free..."
if lsof -i:3004 -P -n 2>/dev/null | grep -q LISTEN; then
    echo "ERROR: Port 3004 still in use!"
    lsof -i:3004 -P -n
    exit 1
fi
echo "Port 3004 is free."

echo "[3/7] Extracting fresh POS files..."
cd /var/www/puregro/pos
cp .env /tmp/puregro-pos-env-backup 2>/dev/null || true
tar -xzf /tmp/puregro-pos.tar.gz
# Use existing .env but ensure port is 3004
if [ -f /tmp/puregro-pos-env-backup ]; then
    cp /tmp/puregro-pos-env-backup .env
    sed -i 's/PORT=[0-9]*/PORT=3004/' .env
else
    cp /tmp/puregro-pos.env .env
fi
npm install --production --silent 2>&1 | tail -3

echo "[4/7] Updating nginx config..."
cd /var/www/puregro/b2b
cp .env /tmp/puregro-b2b-env-backup 2>/dev/null || true
tar -xzf /tmp/puregro-b2b.tar.gz
cp /tmp/puregro-b2b-env-backup .env 2>/dev/null || cp /tmp/puregro-b2b.env .env
cp deploy/nginx.conf /etc/nginx/sites-available/puregro
nginx -t && systemctl reload nginx
certbot --nginx -d puregro.cleva-ai.co.za --non-interactive --agree-tos --email admin@cleva-ai.co.za 2>/dev/null || echo "(certbot skipped)"

echo "[5/7] Starting puregro-pos on port 3004..."
cd /var/www/puregro/pos
export PORT=3004
pm2 start backend/server.js --name puregro-pos
pm2 save
sleep 3

echo "[6/7] Seeding branches + products + staff users..."
cd /var/www/puregro/pos
node backend/scripts/seed-branches.js
node backend/scripts/seed-puregro-products.js
node backend/scripts/setup-dev-users.js

echo "[7/7] Setting permissions + verifying..."
chown -R www-data:www-data /var/www/puregro
chmod -R 755 /var/www/puregro

echo ""
echo "=== Port check ==="
lsof -i:3004 -P -n | head -3
echo ""
echo "=== PM2 status ==="
pm2 status
echo ""
echo "=== Login test ==="
curl -s -X POST http://127.0.0.1:3004/api/v1/auth/otp/verify-pin \
  -H 'Content-Type: application/json' \
  -d '{"email":"sunningdale.manager@cleva-ai.co.za","pin":"123456"}' | head -c 300
echo ""

rm -f /tmp/puregro-*.tar.gz /tmp/puregro-*.env /tmp/puregro-*-env-backup

echo ""
echo "Hotfix complete! POS on port 3004."
REMOTE_HOTFIX
    log "Hotfix applied"
}

# ── Step: Portfix (server-only, no rebuild/upload) ────────────
do_portfix() {
    step "Portfix: move puregro-pos to port 3004 (server-only)"
    ssh "$SERVER_USER@$SERVER" bash <<'REMOTE_PORTFIX'
set -euo pipefail

echo "[1/5] Stopping puregro-pos..."
pm2 delete puregro-pos 2>/dev/null || true
sleep 1
lsof -ti:3004 | xargs kill -9 2>/dev/null || true
sleep 1

echo "[2/5] Checking port 3004 is free..."
if lsof -i:3004 -P -n 2>/dev/null | grep -q LISTEN; then
    echo "ERROR: Port 3004 still in use!"
    lsof -i:3004 -P -n
    exit 1
fi
echo "Port 3004 is free."

echo "[3/5] Fixing .env port..."
cd /var/www/puregro/pos
sed -i 's/PORT=[0-9]*/PORT=3004/' .env
grep PORT .env

echo "[4/5] Updating nginx to proxy to 3004..."
sed -i 's|proxy_pass http://127.0.0.1:300[0-9];|proxy_pass http://127.0.0.1:3004;|g' /etc/nginx/sites-available/puregro
nginx -t && systemctl reload nginx
certbot --nginx -d puregro.cleva-ai.co.za --non-interactive --agree-tos --email admin@cleva-ai.co.za 2>/dev/null || echo "(certbot skipped)"

echo "[5/5] Starting puregro-pos on port 3004..."
cd /var/www/puregro/pos
export PORT=3004
pm2 start backend/server.js --name puregro-pos
pm2 save
sleep 3

echo ""
echo "=== Port check ==="
lsof -i:3004 -P -n | head -3
echo ""
echo "=== Login test ==="
curl -s -X POST http://127.0.0.1:3004/api/v1/auth/otp/verify-pin \
  -H 'Content-Type: application/json' \
  -d '{"email":"sunningdale.manager@cleva-ai.co.za","pin":"123456"}' | head -c 300
echo ""
echo ""
echo "Portfix complete! POS on port 3004."
REMOTE_PORTFIX
    log "Portfix applied"
}

# ── Step: Telegram bot activation ─────────────────────────────
do_telegram() {
    step "Activating Telegram bot"

    TELEGRAM_TOKEN="8500017565:AAGYFkAzUBIfHF7SxEh8DtI-K1WwJ1zDdYc"
    TELEGRAM_SECRET="puregro_webhook_secret_2026"
    WEBHOOK_URL="https://$DOMAIN/api/v1/chat/webhook/telegram"

    ssh "$SERVER_USER@$SERVER" bash -s -- "$TELEGRAM_TOKEN" "$TELEGRAM_SECRET" <<'REMOTE_TELEGRAM'
set -euo pipefail
TOKEN="$1"
SECRET="$2"

cd /var/www/puregro/b2b

echo "[1/3] Updating .env with Telegram credentials..."
# Remove existing lines if present, then append fresh
sed -i '/^TELEGRAM_BOT_TOKEN=/d' .env
sed -i '/^TELEGRAM_WEBHOOK_SECRET=/d' .env
echo "TELEGRAM_BOT_TOKEN=$TOKEN" >> .env
echo "TELEGRAM_WEBHOOK_SECRET=$SECRET" >> .env
echo "  Token and secret written to .env"

echo "[2/3] Restarting B2B to pick up new env..."
pm2 restart puregro-b2b
sleep 3

echo "[3/3] Registering webhook with Telegram..."
RESULT=$(curl -sf -X POST "https://api.telegram.org/bot${TOKEN}/setWebhook?url=https://puregro.cleva-ai.co.za/api/v1/chat/webhook/telegram&secret_token=${SECRET}" 2>&1)
echo "  $RESULT"

echo ""
echo "Telegram bot activated!"
pm2 status
REMOTE_TELEGRAM
    log "Telegram bot active"
}

# ── Step: Demo (full demo-ready deploy) ──────────────────────
do_demo() {
    step "Full demo deploy (build + hotfix + telegram + verify)"
    do_build
    do_hotfix
    do_telegram
    do_verify
    echo ""
    echo -e "${GREEN}=== Demo URLs ===${NC}"
    echo "  B2B Login:      https://$DOMAIN/login"
    echo "  B2B Admin:      https://$DOMAIN/admin/chat"
    echo "  POS Terminal:   https://$DOMAIN/pos/pos.html"
    echo "  POS Admin:      https://$DOMAIN/pos/admin.html"
    echo "  POS Owner:      https://$DOMAIN/pos/owner-dashboard.html"
    echo "  POS Inventory:  https://$DOMAIN/pos/inventory-manager-dashboard.html"
    echo "  POS Stocktake:  https://$DOMAIN/pos/stocktake-app.html"
    echo "  Health Check:   https://$DOMAIN/health"
    echo ""
    echo "  Login: sunningdale.manager@cleva-ai.co.za / PIN: 123456"
}

# ── Main ───────────────────────────────────────────────────────
STEP="${1:-all}"

echo -e "${CYAN}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║   PureGro Deployment                      ║"
echo "  ║   Server: $SERVER                  ║"
echo "  ║   Domain: $DOMAIN       ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"

case "$STEP" in
    all)
        do_build
        do_pack
        do_upload
        do_setup
        do_seed
        do_ssl
        do_verify
        ;;
    build)  do_build ;;
    pack)   do_pack ;;
    upload) do_upload ;;
    setup)  do_setup ;;
    seed)   do_seed ;;
    ssl)    do_ssl ;;
    verify) do_verify ;;
    update) do_update ;;
    hotfix)   do_hotfix ;;
    portfix)  do_portfix ;;
    telegram) do_telegram ;;
    reseed)   do_reseed ;;
    demo)     do_demo ;;
    *)
        echo "Usage: $0 {all|build|pack|upload|setup|seed|ssl|verify|update|hotfix|portfix|telegram|demo}"
        exit 1
        ;;
esac

echo -e "\n${GREEN}Done!${NC}"
