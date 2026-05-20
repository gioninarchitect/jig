#!/bin/bash
# ──────────────────────────────────────────────
# Origin by ILCO Farming - Deploy Script
#
# Usage:
#   bash deploy/deploy-origin.sh          # Full deploy (build + upload + restart)
#   bash deploy/deploy-origin.sh --pack   # Just build tarball (no SSH needed)
#   bash deploy/deploy-origin.sh --push   # Just upload existing tarball + restart
#   bash deploy/deploy-origin.sh --setup  # First-time server setup (run once)
# ──────────────────────────────────────────────

set -euo pipefail

SERVER="154.66.197.199"
DOMAIN="origin.cleva-ai.co.za"
LOCAL_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
MODE="${1:-full}"

echo "========================================"
echo "  ORIGIN DEPLOY - $(date)"
echo "========================================"

# ── Build & Pack ──────────────────────────────
do_pack() {
  echo ""
  echo "[1/3] Building B2B..."
  cd "$LOCAL_ROOT"
  npm run build
  echo "  Build OK"

  echo ""
  echo "[2/3] Creating POS tarball..."
  cd "$LOCAL_ROOT/JIGPOS/newbrand"
  COPYFILE_DISABLE=1 tar --no-mac-metadata \
    --exclude='._*' --exclude='.DS_Store' --exclude='__MACOSX' --exclude='.AppleDouble' \
    --exclude='node_modules' --exclude='.git' --exclude='.env' --exclude='.env.*' \
    --exclude='archived' --exclude='react-app/node_modules' --exclude='react-app/.env' \
    -czf /tmp/origin-pos.tar.gz .

  echo ""
  echo "[3/3] Creating B2B tarball..."
  cd "$LOCAL_ROOT"
  COPYFILE_DISABLE=1 tar --no-mac-metadata \
    --exclude='._*' --exclude='.DS_Store' --exclude='__MACOSX' --exclude='.AppleDouble' \
    --exclude='node_modules' --exclude='.git' --exclude='.next' \
    --exclude='.env' --exclude='.env.*' --exclude='JIGPOS' --exclude='ds' \
    -czf /tmp/origin-b2b.tar.gz \
    dist/ database/ package.json package-lock.json ecosystem.config.js deploy/ public/

  # Safety check
  for f in /tmp/origin-pos.tar.gz /tmp/origin-b2b.tar.gz; do
    if tar -tzf "$f" | grep -qE '^\.env$|/\.env$'; then
      echo "  ABORT: .env found in tarball!"
      exit 1
    fi
  done

  # Production .env files
  cat > /tmp/origin-pos.env <<'POSENV'
MONGODB_URI=mongodb://localhost:27017/origin
JWT_SECRET=origin_pos_a8f3c2e91b7d045f6e
PORT=3008
NODE_ENV=production
BASE_URL=https://origin.cleva-ai.co.za
INTERNAL_API_KEY=origin_internal_2026
ORIGIN_RETAIL_CORE_API_URL=http://127.0.0.1:3009/api/v1/origin-retail/pharmacy-core
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
POSENV

  cat > /tmp/origin-b2b.env <<'B2BENV'
DATABASE_URL=postgresql://origin:origin_prod_2026@localhost:5432/origin
JWT_SECRET=origin_b2b_c4d7e9f01a3b5826d1
PORT=3009
NODE_ENV=production
CORS_ORIGIN=https://origin.cleva-ai.co.za
ADMIN_EMAILS=admin@cleva-ai.co.za,florisolivier7@gmail.com
VITE_ADMIN_EMAILS=admin@cleva-ai.co.za,florisolivier7@gmail.com
INTERNAL_API_KEY=origin_internal_2026
SMTP_HOST=mail.cleva-ai.co.za
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=origin@cleva-ai.co.za
SMTP_PASS=B0t2026@@
JIG_COMPANY_NAME=Origin by ILCO Farming (Pty) Ltd
JIG_COMPANY_EMAIL=admin@cleva-ai.co.za
JIG_COMPANY_PHONE=+27 84 796 8457
POS_API_URL=http://127.0.0.1:3008
B2BENV

  echo ""
  echo "  POS: /tmp/origin-pos.tar.gz ($(du -h /tmp/origin-pos.tar.gz | cut -f1))"
  echo "  B2B: /tmp/origin-b2b.tar.gz ($(du -h /tmp/origin-b2b.tar.gz | cut -f1))"
  echo "  ENV: /tmp/origin-pos.env, /tmp/origin-b2b.env"
}

# ── Upload & Deploy ───────────────────────────
do_push() {
  echo ""
  echo "[1/3] Uploading to $SERVER..."
  scp /tmp/origin-pos.tar.gz /tmp/origin-b2b.tar.gz \
      /tmp/origin-pos.env /tmp/origin-b2b.env \
      root@$SERVER:/tmp/
  echo "  Upload complete"

  echo ""
  echo "[2/3] Deploying on server..."
  ssh root@$SERVER bash -s << 'REMOTE'
set -euo pipefail

cd /var/www/origin/pos
cp .env /tmp/origin-pos-bak 2>/dev/null || true
tar -xzf /tmp/origin-pos.tar.gz
cp /tmp/origin-pos-bak .env 2>/dev/null || cp /tmp/origin-pos.env .env
npm install --production --silent 2>/dev/null

cd /var/www/origin/b2b
cp .env /tmp/origin-b2b-bak 2>/dev/null || true
tar -xzf /tmp/origin-b2b.tar.gz
cp /tmp/origin-b2b-bak .env 2>/dev/null || cp /tmp/origin-b2b.env .env
npm install --production --silent 2>/dev/null

chown -R www-data:www-data /var/www/origin
chmod -R 755 /var/www/origin

pm2 restart origin-pos origin-b2b
pm2 save

rm -f /tmp/origin-*.tar.gz /tmp/origin-*.env /tmp/origin-*-bak
echo "  Deploy complete"
REMOTE

  echo ""
  echo "[3/3] Health check..."
  sleep 3
  ssh root@$SERVER "curl -sf http://127.0.0.1:3008/api/v1/health | python3 -m json.tool 2>/dev/null || echo 'POS health failed'"

  echo ""
  echo "========================================"
  echo "  DEPLOYED: https://$DOMAIN"
  echo "========================================"
}

# ── First-time server setup ───────────────────
do_setup() {
  echo ""
  echo "First-time setup on $SERVER..."
  scp /tmp/origin-pos.tar.gz /tmp/origin-b2b.tar.gz \
      /tmp/origin-pos.env /tmp/origin-b2b.env \
      root@$SERVER:/tmp/

  ssh root@$SERVER bash -s << 'REMOTE_SETUP'
set -euo pipefail

mkdir -p /var/www/origin/{pos,b2b,uploads}

cd /var/www/origin/pos
tar -xzf /tmp/origin-pos.tar.gz
cp /tmp/origin-pos.env .env
npm install --production

cd /var/www/origin/b2b
tar -xzf /tmp/origin-b2b.tar.gz
cp /tmp/origin-b2b.env .env
npm install --production

cp /var/www/origin/b2b/deploy/nginx.conf /etc/nginx/sites-available/origin
ln -sf /etc/nginx/sites-available/origin /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

chown -R www-data:www-data /var/www/origin
chmod -R 755 /var/www/origin

pm2 delete origin-pos origin-b2b 2>/dev/null || true
cd /var/www/origin/pos && PORT=3008 pm2 start backend/server.js --name origin-pos
cd /var/www/origin/b2b && pm2 start ecosystem.config.js
pm2 save

cd /var/www/origin/pos
node backend/scripts/seed-branches.js
node backend/scripts/reseed-products.js
node backend/scripts/ensure-demo-users.js

rm -f /tmp/origin-*.tar.gz /tmp/origin-*.env
echo ""
pm2 status
REMOTE_SETUP

  ssh root@$SERVER "certbot --nginx -d $DOMAIN --non-interactive --agree-tos --email admin@cleva-ai.co.za" || echo "(SSL: set up manually)"

  echo ""
  echo "========================================"
  echo "  SETUP COMPLETE: https://$DOMAIN"
  echo "  Login: florisolivier7@gmail.com / PIN: 123456"
  echo "========================================"
}

# ── Main ──────────────────────────────────────
case "$MODE" in
  --pack)  do_pack ;;
  --push)  do_push ;;
  --setup) do_pack && do_setup ;;
  full|*)  do_pack && do_push ;;
esac

echo ""
echo "Done!"
