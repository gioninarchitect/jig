# TnT-ZA Deploy Steps

Build is done. Tarballs at `/tmp/tnt-backend.tar.gz` and `/tmp/tnt-frontend.tar.gz`.

Run each command below. You'll be prompted for the server password.

## Step 1: Upload files

```bash
ssh root@154.66.197.199 "mkdir -p /tmp/tnt-deploy"
scp /tmp/tnt-backend.tar.gz root@154.66.197.199:/tmp/tnt-deploy/
scp /tmp/tnt-frontend.tar.gz root@154.66.197.199:/tmp/tnt-deploy/
```

## Step 2: SSH in and set up

```bash
ssh root@154.66.197.199
```

Then run on the server:

```bash
# ── Install PostgreSQL if not present ──
if ! command -v psql &>/dev/null; then
  apt-get update -qq
  apt-get install -y postgresql postgresql-contrib
  systemctl enable postgresql
  systemctl start postgresql
fi

# ── Create DB ──
sudo -u postgres psql -c "CREATE USER tntza WITH PASSWORD 'tntza_prod_2026';" 2>/dev/null || true
sudo -u postgres psql -c "CREATE DATABASE tntza OWNER tntza;" 2>/dev/null || true
sudo -u postgres psql -c "GRANT ALL PRIVILEGES ON DATABASE tntza TO tntza;" 2>/dev/null || true

# ── Extract files ──
mkdir -p /var/www/tnt-za/backend /var/www/tnt-za/frontend /var/www/tnt-za/uploads
cd /var/www/tnt-za/backend && tar -xzf /tmp/tnt-deploy/tnt-backend.tar.gz
cd /var/www/tnt-za/frontend && tar -xzf /tmp/tnt-deploy/tnt-frontend.tar.gz

# ── Install backend deps ──
cd /var/www/tnt-za/backend
npm ci --production

# ── Create .env ──
cat > /var/www/tnt-za/backend/.env << 'EOF'
DATABASE_URL=postgresql://tntza:tntza_prod_2026@localhost:5432/tntza
JWT_SECRET=tnt-za-prod-change-this-to-random-64-chars
JWT_EXPIRY=24h
SMTP_HOST=mail.cleva-ai.co.za
SMTP_PORT=465
SMTP_USER=otp@cleva-ai.co.za
SMTP_PASS=
PORT=6000
CORS_ORIGIN=https://tntilco.cleva-ai.co.za
NODE_ENV=production
ANTHROPIC_API_KEY=
EOF

# ── Prisma: create tables + seed ──
cd /var/www/tnt-za/backend
npx prisma generate
npx prisma db push
npx prisma db seed

# ── PM2 ──
pm2 delete tnt-za 2>/dev/null || true
pm2 start dist/server.js --name tnt-za --cwd /var/www/tnt-za/backend --max-memory-restart 512M
pm2 save

# ── Verify backend ──
curl -s http://127.0.0.1:6000/api/health
```

## Step 3: Configure nginx

```bash
cat > /etc/nginx/sites-available/tnt-za << 'CONF'
server {
    listen 80;
    server_name tntilco.cleva-ai.co.za;

    root /var/www/tnt-za/frontend/dist;
    index index.html;

    location / {
        try_files $uri $uri/ /index.html;
    }

    location /api/ {
        proxy_pass http://127.0.0.1:6000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 30s;
    }

    location /uploads/ {
        alias /var/www/tnt-za/uploads/;
        expires 30d;
        add_header Cache-Control "public";
    }

    location /assets/ {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }

    add_header X-Frame-Options DENY;
    add_header X-Content-Type-Options nosniff;

    gzip on;
    gzip_types text/css application/javascript application/json;
}
CONF

ln -sf /etc/nginx/sites-available/tnt-za /etc/nginx/sites-enabled/
nginx -t && systemctl reload nginx
```

## Step 4: SSL

```bash
certbot --nginx -d tntilco.cleva-ai.co.za --non-interactive --agree-tos --email admin@cleva-ai.co.za
```

## Step 5: Verify

```bash
curl -s https://tntilco.cleva-ai.co.za/api/health
```

Should return: `{"status":"ok","service":"tnt-za",...}`

Open https://tntilco.cleva-ai.co.za in browser — login page should appear.

## Demo Credentials (from seed output)

| Email | PIN | Role |
|-------|-----|------|
| super@ilco.co.za | (check seed output) | SUPER_ADMIN |
| admin@ilco.co.za | (check seed output) | TENANT_ADMIN |
| fm@ilco.co.za | (check seed output) | FACILITY_MANAGER |
| grower@ilco.co.za | (check seed output) | CULTIVATOR |
| lab@ilco.co.za | (check seed output) | LAB_TECH |
| security@ilco.co.za | (check seed output) | SECURITY_OFFICER |
| viewer@ilco.co.za | (check seed output) | VIEWER |

PINs are printed to console during `npx prisma db seed`.

## Quick Update (after code changes)

```bash
# Local:
cd /Users/florisolivier/origin/tnt-za
./deploy.sh build
./deploy.sh pack
scp /tmp/tnt-backend.tar.gz root@154.66.197.199:/tmp/tnt-deploy/
scp /tmp/tnt-frontend.tar.gz root@154.66.197.199:/tmp/tnt-deploy/

# Server:
cd /var/www/tnt-za/backend && tar -xzf /tmp/tnt-deploy/tnt-backend.tar.gz && npm ci --production && npx prisma generate && npx prisma db push
cd /var/www/tnt-za/frontend && tar -xzf /tmp/tnt-deploy/tnt-frontend.tar.gz
pm2 restart tnt-za
```
