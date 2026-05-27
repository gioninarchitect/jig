#!/bin/bash
# Run ON the server: bash /tmp/server-setup-origin.sh

mkdir -p /var/www/origin/pos
mkdir -p /var/www/origin/b2b
mkdir -p /var/www/origin/uploads

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
nginx -t
systemctl reload nginx

chown -R www-data:www-data /var/www/origin
chmod -R 755 /var/www/origin

pm2 delete origin-pos origin-b2b 2>/dev/null || true

cd /var/www/origin/pos
PORT=3008 pm2 start backend/server.js --name origin-pos

cd /var/www/origin/b2b
pm2 start ecosystem.config.js
pm2 save

cd /var/www/origin/pos
node backend/scripts/seed-branches.js
node backend/scripts/reseed-products.js
node backend/scripts/ensure-demo-users.js
node seed-stock.js

certbot --nginx -d origin.cleva-ai.co.za --non-interactive --agree-tos --email admin@cleva-ai.co.za || echo "SSL: set up manually"

rm -f /tmp/origin-pos.tar.gz
rm -f /tmp/origin-b2b.tar.gz
rm -f /tmp/origin-pos.env
rm -f /tmp/origin-b2b.env

pm2 status
echo "Done! https://origin.cleva-ai.co.za"
