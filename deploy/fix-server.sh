#!/bin/bash
# ──────────────────────────────────────────────
# PureGro - Server Fix Script
# Run ON the server: bash /tmp/fix-server.sh
# ──────────────────────────────────────────────

set -euo pipefail

APP_DIR="/var/www/jig"
DB_NAME="jig"
DB_USER="puregro_app"
PORT=3002
DOMAIN="jig.cleva-ai.co.za"

echo "========================================"
echo "  PureGro SERVER FIX - $(date)"
echo "========================================"

# ── 1. Database user ─────────────────────────
echo ""
echo "[1/6] PostgreSQL..."

if sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" | grep -q 1; then
  echo "  User $DB_USER exists"
else
  DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
  sudo -u postgres psql -c "CREATE USER $DB_USER WITH PASSWORD '$DB_PASS';"
  echo ""
  echo "  ┌─────────────────────────────────────────┐"
  echo "  │  DB PASSWORD: $DB_PASS"
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

sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;" > /dev/null 2>&1
sudo -u postgres psql -d "$DB_NAME" -c "GRANT ALL ON SCHEMA public TO $DB_USER;" > /dev/null 2>&1
sudo -u postgres psql -d "$DB_NAME" -c "CREATE EXTENSION IF NOT EXISTS \"uuid-ossp\";" > /dev/null 2>&1

# Run schema
if [ -f "$APP_DIR/database/schema.sql" ]; then
  TABLE_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT count(*) FROM information_schema.tables WHERE table_schema='public';" 2>/dev/null || echo "0")
  if [ "${TABLE_COUNT// /}" -lt 5 ]; then
    sudo -u postgres psql -d "$DB_NAME" -f "$APP_DIR/database/schema.sql" > /dev/null
    echo "  Schema applied"
  else
    echo "  Schema already there ($TABLE_COUNT tables)"
  fi
fi

# Get current password for .env
DB_PASS_CURRENT=$(sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER'" 2>/dev/null || echo "")
# Reset password so we know it
NEW_DB_PASS=$(openssl rand -base64 24 | tr -dc 'a-zA-Z0-9' | head -c 32)
sudo -u postgres psql -c "ALTER USER $DB_USER WITH PASSWORD '$NEW_DB_PASS';" > /dev/null 2>&1

echo "  DB password reset"

# ── 2. Create .env ───────────────────────────
echo ""
echo "[2/6] Creating .env..."

JWT_SECRET=$(openssl rand -base64 48 | tr -dc 'a-zA-Z0-9' | head -c 64)

cat > "$APP_DIR/.env" << EOF
DATABASE_URL=postgresql://${DB_USER}:${NEW_DB_PASS}@localhost:5432/${DB_NAME}
SMTP_HOST=mail.cleva-ai.co.za
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=otp@cleva-ai.co.za
SMTP_PASS=NEED_REAL_PASSWORD
JWT_SECRET=${JWT_SECRET}
JWT_EXPIRES_IN=7d
ADMIN_EMAILS=florisolivier7@gmail.com
CORS_ORIGIN=https://${DOMAIN}
PORT=${PORT}
NODE_ENV=production
EOF

echo "  .env created at $APP_DIR/.env"
echo "  NOTE: You still need to set SMTP_PASS manually:"
echo "    nano $APP_DIR/.env"

# ── 3. Seed database ────────────────────────
echo ""
echo "[3/6] Seeding database..."

PRODUCT_COUNT=$(sudo -u postgres psql -d "$DB_NAME" -tAc "SELECT count(*) FROM products;" 2>/dev/null || echo "0")
if [ "${PRODUCT_COUNT// /}" -lt 1 ]; then
  cd "$APP_DIR"
  npx ts-node --project tsconfig.server.json database/seed.ts 2>&1 || echo "  Seed failed - will retry after PM2 starts"
  echo "  Seed done"
else
  echo "  Already seeded ($PRODUCT_COUNT products)"
fi

# ── 4. Fix nginx ─────────────────────────────
echo ""
echo "[4/6] Fixing nginx..."

cat > /etc/nginx/sites-available/jig << 'NGINXCONF'
server {
    listen 80;
    listen [::]:80;
    server_name jig.cleva-ai.co.za;

    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml;

    location /api/ {
        proxy_pass http://127.0.0.1:3002;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        client_max_body_size 2m;
    }

    location /health {
        proxy_pass http://127.0.0.1:3002;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }

    root /var/www/jig/dist/frontend;
    index index.html;

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
        access_log off;
    }

    location / {
        try_files $uri $uri/ /index.html;
    }

    access_log /var/log/nginx/puregro-access.log;
    error_log /var/log/nginx/puregro-error.log;
}
NGINXCONF

ln -sf /etc/nginx/sites-available/jig /etc/nginx/sites-enabled/jig

# Test and reload
if nginx -t 2>&1; then
  systemctl reload nginx
  echo "  nginx reloaded"
else
  echo "  nginx config error!"
  nginx -t
fi

# ── 5. PM2 ───────────────────────────────────
echo ""
echo "[5/6] Restarting PM2..."

chown -R www-data:www-data "$APP_DIR"
chmod -R 755 "$APP_DIR"

cd "$APP_DIR"
pm2 delete puregro-api 2>/dev/null || true
pm2 start ecosystem.config.js
pm2 save > /dev/null
echo "  PM2 started"

sleep 3

# ── 6. Verify ────────────────────────────────
echo ""
echo "[6/6] Verifying..."

echo "  PM2 status:"
pm2 list 2>/dev/null | grep jig

echo ""
echo "  Health check:"
if curl -sf "http://127.0.0.1:$PORT/health" 2>/dev/null; then
  echo ""
  echo "  API is HEALTHY"
else
  echo "  API not responding - checking logs:"
  pm2 logs puregro-api --lines 15 --nostream 2>&1
fi

echo ""
echo "  nginx test:"
RESPONSE=$(curl -sf -o /dev/null -w "%{http_code}" "http://localhost" -H "Host: $DOMAIN" 2>/dev/null || echo "failed")
echo "  HTTP response for $DOMAIN: $RESPONSE"

echo ""
echo "========================================"
echo "  FIX COMPLETE"
echo ""
echo "  Site: https://$DOMAIN"
echo "  Health: https://$DOMAIN/health"
echo ""
echo "  REMAINING:"
echo "  1. Set SMTP password: nano $APP_DIR/.env"
echo "  2. Get SSL: certbot --nginx -d $DOMAIN"
echo "  3. Restart after SMTP: pm2 restart puregro-api"
echo "========================================"
