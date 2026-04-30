#!/bin/bash
# Run this ON the server: bash /tmp/setup-nginx.sh

echo "[TnT-ZA] Writing nginx config..."

echo 'server {
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
}' > /etc/nginx/sites-available/tnt-za

ln -sf /etc/nginx/sites-available/tnt-za /etc/nginx/sites-enabled/

echo "[TnT-ZA] Testing nginx..."
nginx -t

echo "[TnT-ZA] Reloading nginx..."
systemctl reload nginx

echo "[TnT-ZA] Setting up SSL..."
certbot --nginx -d tntilco.cleva-ai.co.za --non-interactive --agree-tos --email admin@cleva-ai.co.za || echo "SSL failed - run certbot manually"

echo "[TnT-ZA] Verifying..."
curl -s http://127.0.0.1:6000/api/health
echo ""
echo "[TnT-ZA] Done! Open https://tntilco.cleva-ai.co.za"
