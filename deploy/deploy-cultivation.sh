#!/bin/bash
# ──────────────────────────────────────────────
# Origin Cultivation Dashboard - Deploy Script
#
# Separate from POS — own PM2 process on port 3005
#
# Usage:
#   bash deploy/deploy-cultivation.sh          # Full deploy (pack + upload + restart)
#   bash deploy/deploy-cultivation.sh --pack   # Just build tarball
#   bash deploy/deploy-cultivation.sh --push   # Just upload existing tarball + restart
#   bash deploy/deploy-cultivation.sh --setup  # First-time setup on server
#   bash deploy/deploy-cultivation.sh --seed   # Run seed script on server
# ──────────────────────────────────────────────

set -euo pipefail

SERVER="154.66.197.199"
DOMAIN="origin.cleva-ai.co.za"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-full}"

echo "========================================"
echo "  CULTIVATION DEPLOY - $(date)"
echo "========================================"

# ── Build & Pack ──────────────────────────────
do_pack() {
  echo ""
  echo "[1/2] Creating cultivation tarball..."
  cd "$LOCAL_ROOT/JIGPOS/newbrand"

  # Pack only what cultivation needs (not the full POS)
  COPYFILE_DISABLE=1 tar --no-mac-metadata \
    --exclude='._*' --exclude='.DS_Store' --exclude='__MACOSX' --exclude='.AppleDouble' \
    --exclude='node_modules' --exclude='.git' --exclude='.env' --exclude='.env.*' \
    --exclude='archived' --exclude='react-app' \
    -czf /tmp/origin-cultivation.tar.gz \
    backend/cultivation-server.js \
    backend/controllers/cultivation.controller.js \
    backend/routes/cultivation.js \
    backend/routes/auth-otp.js \
    backend/middleware/auth.js \
    backend/middleware/rateLimiter.js \
    backend/middleware/errorHandler.js \
    backend/middleware/validation.js \
    backend/config/index.js \
    backend/modules/database/models/CultivationZone.js \
    backend/modules/database/models/CultivationBatch.js \
    backend/modules/database/models/EnvironmentReading.js \
    backend/modules/database/models/HarvestRecord.js \
    backend/modules/database/models/ComplianceLog.js \
    backend/modules/database/models/User.js \
    backend/modules/database/models/Section21Document.js \
    backend/modules/logger/index.js \
    backend/modules/auth/otp.service.js \
    backend/modules/notification/email/service.js \
    backend/modules/notification/email/templates.js \
    backend/utils/apiResponse.js \
    backend/services/emailService.js \
    backend/scripts/seed-cultivation.js \
    cultivation-dashboard.html \
    frontend/cult-auth.js \
    frontend/cult-core.js \
    frontend/cult-overview.js \
    frontend/cult-zones.js \
    frontend/cult-batches.js \
    frontend/cult-environment.js \
    frontend/cult-compliance.js \
    frontend/cult-harvest.js \
    frontend/cult-reports.js \
    frontend/or-auth.js \
    frontend/or-core.js \
    frontend/or-utils.js \
    frontend/config.js \
    css/cult-dashboard.css \
    css/or-brand.css \
    css/globals.css \
    images/origin-logo.png \
    package.json \
    package-lock.json

  # Safety check
  if tar -tzf /tmp/origin-cultivation.tar.gz | grep -qE '^\.env$|/\.env$'; then
    echo "  ABORT: .env found in tarball!"
    exit 1
  fi

  # Production .env for cultivation
  cat > /tmp/origin-cultivation.env <<'CULTENV'
MONGODB_URI=mongodb://localhost:27017/origin
JWT_SECRET=origin_pos_a8f3c2e91b7d045f6e
PORT=3005
NODE_ENV=production
BASE_URL=https://origin.cleva-ai.co.za
SMTP_HOST=mail.cleva-ai.co.za
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=origin@cleva-ai.co.za
SMTP_PASS=B0t2026@@
SMTP_FROM_EMAIL=origin@cleva-ai.co.za
SMTP_FROM_NAME=Origin by ILCO Farming
OTP_SMTP_HOST=mail.cleva-ai.co.za
OTP_SMTP_PORT=465
OTP_SMTP_SECURE=true
OTP_SMTP_USER=origin@cleva-ai.co.za
OTP_SMTP_PASS=B0t2026@@
OTP_SMTP_FROM=origin@cleva-ai.co.za
OTP_EXPIRY_MINUTES=10
OTP_LENGTH=6
CULTENV

  echo ""
  echo "[2/2] Pack complete"
  echo "  Tarball: /tmp/origin-cultivation.tar.gz ($(du -h /tmp/origin-cultivation.tar.gz | cut -f1))"
  echo "  ENV:     /tmp/origin-cultivation.env"
}

# ── Upload & Deploy ───────────────────────────
do_push() {
  echo ""
  echo "[1/3] Uploading to $SERVER..."
  scp /tmp/origin-cultivation.tar.gz /tmp/origin-cultivation.env \
      root@$SERVER:/tmp/
  echo "  Upload complete"

  echo ""
  echo "[2/3] Deploying on server..."
  ssh root@$SERVER bash -s << 'REMOTE'
set -euo pipefail

mkdir -p /var/www/origin/cultivation/uploads/cultivation

cd /var/www/origin/cultivation
cp .env /tmp/origin-cult-bak 2>/dev/null || true
tar -xzf /tmp/origin-cultivation.tar.gz
cp /tmp/origin-cult-bak .env 2>/dev/null || cp /tmp/origin-cultivation.env .env
npm install --production --silent 2>/dev/null

chown -R www-data:www-data /var/www/origin/cultivation
chmod -R 755 /var/www/origin/cultivation

# Start or restart the cultivation PM2 process
if pm2 describe origin-cultivation > /dev/null 2>&1; then
  pm2 restart origin-cultivation
else
  cd /var/www/origin/cultivation
  PORT=3005 pm2 start backend/cultivation-server.js --name origin-cultivation
fi
pm2 save

rm -f /tmp/origin-cultivation.tar.gz /tmp/origin-cultivation.env /tmp/origin-cult-bak
echo "  Deploy complete"
REMOTE

  echo ""
  echo "[3/3] Health check..."
  sleep 3
  ssh root@$SERVER "curl -sf http://127.0.0.1:3005/api/v1/health | python3 -m json.tool 2>/dev/null || echo 'Cultivation health check failed'"

  echo ""
  echo "========================================"
  echo "  DEPLOYED: https://$DOMAIN/cultivation/"
  echo "========================================"
}

# ── First-time setup ─────────────────────────
do_setup() {
  echo ""
  echo "First-time cultivation setup on $SERVER..."
  scp /tmp/origin-cultivation.tar.gz /tmp/origin-cultivation.env \
      root@$SERVER:/tmp/

  ssh root@$SERVER bash -s << 'REMOTE_SETUP'
set -euo pipefail

mkdir -p /var/www/origin/cultivation/uploads/cultivation

cd /var/www/origin/cultivation
tar -xzf /tmp/origin-cultivation.tar.gz
cp /tmp/origin-cultivation.env .env
npm install --production

chown -R www-data:www-data /var/www/origin/cultivation
chmod -R 755 /var/www/origin/cultivation

pm2 delete origin-cultivation 2>/dev/null || true
cd /var/www/origin/cultivation && PORT=3005 pm2 start backend/cultivation-server.js --name origin-cultivation
pm2 save

rm -f /tmp/origin-cultivation.tar.gz /tmp/origin-cultivation.env
echo ""
pm2 status
REMOTE_SETUP

  echo ""
  echo "========================================"
  echo "  CULTIVATION SETUP COMPLETE"
  echo "  URL: https://$DOMAIN/cultivation/"
  echo "  Port: 3005"
  echo "========================================"
  echo ""
  echo "  IMPORTANT: Add nginx proxy rule for /cultivation/"
  echo "  Add to /etc/nginx/sites-available/origin:"
  echo ""
  echo "    location /cultivation/ {"
  echo "        proxy_pass http://127.0.0.1:3005/;"
  echo "        proxy_http_version 1.1;"
  echo "        proxy_set_header Upgrade \$http_upgrade;"
  echo "        proxy_set_header Connection 'upgrade';"
  echo "        proxy_set_header Host \$host;"
  echo "        proxy_cache_bypass \$http_upgrade;"
  echo "    }"
  echo ""
}

# ── Seed demo data ───────────────────────────
do_seed() {
  echo ""
  echo "Seeding cultivation demo data on $SERVER..."
  ssh root@$SERVER "cd /var/www/origin/cultivation && node backend/scripts/seed-cultivation.js"
  echo "  Seed complete"
}

# ── Main ──────────────────────────────────────
case "$MODE" in
  --pack)  do_pack ;;
  --push)  do_push ;;
  --setup) do_pack && do_setup ;;
  --seed)  do_seed ;;
  full|*)  do_pack && do_push ;;
esac

echo ""
echo "Done!"
