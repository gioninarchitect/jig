#!/bin/bash
# TnT-ZA — One-command deploy. Prompts for password at each step.
set -euo pipefail

SERVER="root@154.66.197.199"
G='\033[0;32m'; C='\033[0;36m'; R='\033[0;31m'; N='\033[0m'
log() { echo -e "${C}[TnT-ZA]${N} $1"; }
ok()  { echo -e "${G}  ✓${N} $1"; }

# 1. Build
log "Building backend..."
cd "$(dirname "$0")/backend"
npm ci --production=false 2>&1 | tail -1
npx prisma generate 2>&1 | tail -1
npm run build 2>&1 | tail -1
ok "Backend"

log "Building frontend..."
cd ../frontend
npm ci 2>&1 | tail -1
npm run build 2>&1 | tail -1
ok "Frontend"

# 2. Pack
log "Packing..."
cd ..
COPYFILE_DISABLE=1 tar -czf /tmp/tnt-backend.tar.gz --exclude='node_modules' -C backend dist/ prisma/ package.json package-lock.json
COPYFILE_DISABLE=1 tar -czf /tmp/tnt-frontend.tar.gz -C frontend dist/
ok "Packed"

# 3. Upload (password prompts)
log "Uploading... (enter server password)"
ssh $SERVER "mkdir -p /tmp/tnt-deploy"
scp /tmp/tnt-backend.tar.gz $SERVER:/tmp/tnt-deploy/
scp /tmp/tnt-frontend.tar.gz $SERVER:/tmp/tnt-deploy/
ok "Uploaded"

# 4. Deploy on server
STEP="${1:-full}"

if [ "$STEP" = "update" ]; then
  log "Quick update..."
  ssh $SERVER << 'EOF'
cd /var/www/tnt-za/backend && tar -xzf /tmp/tnt-deploy/tnt-backend.tar.gz
npm ci --production && npx prisma generate && npx prisma db push
cd /var/www/tnt-za/frontend && tar -xzf /tmp/tnt-deploy/tnt-frontend.tar.gz
pm2 restart tnt-za
echo ""; curl -s http://127.0.0.1:6000/api/health; echo ""
EOF
  ok "Updated"
  exit 0
fi

log "Full deploy on server..."
ssh $SERVER << 'EOF'
set -e

# PostgreSQL
systemctl start postgresql 2>/dev/null || true
sudo -u postgres psql -c "CREATE USER tntza WITH PASSWORD 'tntza2026';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE tntza OWNER tntza;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tntza TO tntza;" 2>/dev/null || true

# Extract
mkdir -p /var/www/tnt-za/{backend,frontend,uploads}
cd /var/www/tnt-za/backend && tar -xzf /tmp/tnt-deploy/tnt-backend.tar.gz
npm ci --production
npm install tsx --save-dev

cd /var/www/tnt-za/frontend && tar -xzf /tmp/tnt-deploy/tnt-frontend.tar.gz

# .env (only create if missing)
if [ ! -f /var/www/tnt-za/backend/.env ]; then
cat > /var/www/tnt-za/backend/.env << 'ENVFILE'
DATABASE_URL=postgresql://tntza:tntza2026@localhost:5432/tntza
JWT_SECRET=tnt-za-prod-ilco-2026
PORT=6000
CORS_ORIGIN=https://tntilco.cleva-ai.co.za
NODE_ENV=production
SMTP_HOST=mail.cleva-ai.co.za
SMTP_PORT=465
SMTP_USER=otp@cleva-ai.co.za
SMTP_PASS=
ENVFILE
fi

# Prisma + Seed
cd /var/www/tnt-za/backend
npx prisma generate
npx prisma db push
npx prisma db seed

# PM2
pm2 delete tnt-za 2>/dev/null || true
pm2 start dist/server.js --name tnt-za --cwd /var/www/tnt-za/backend --max-memory-restart 512M
pm2 save

# nginx
cat > /etc/nginx/sites-available/tnt-za << 'NGINX'
server {
    listen 80;
    server_name tntilco.cleva-ai.co.za;
    root /var/www/tnt-za/frontend/dist;
    index index.html;
    location / { try_files $uri $uri/ /index.html; }
    location /api/ {
        proxy_pass http://127.0.0.1:6000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }
    location /uploads/ { alias /var/www/tnt-za/uploads/; expires 30d; }
    location /assets/ { expires 1y; add_header Cache-Control "public, immutable"; }
    gzip on;
    gzip_types text/css application/javascript application/json;
}
NGINX
ln -sf /etc/nginx/sites-available/tnt-za /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx

# SSL
certbot --nginx -d tntilco.cleva-ai.co.za --non-interactive --agree-tos --email admin@cleva-ai.co.za 2>/dev/null || echo "SSL: run certbot manually"

echo ""
echo "================================"
echo "  TnT-ZA LIVE"
echo "  https://tntilco.cleva-ai.co.za"
echo "================================"
curl -s http://127.0.0.1:6000/api/health
echo ""
EOF

ok "Deploy complete! Open https://tntilco.cleva-ai.co.za"
