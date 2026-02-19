#!/bin/bash

# Basotho Medical Herbs - One-Time Deployment Script
# SAFE: Does NOT touch existing PM2 apps, Nginx configs, or databases

echo "=== Basotho Medical Herbs Deployment ==="
echo ""

# Install dependencies
echo "Installing dependencies..."
npm install --production

# Copy .env file
echo "Setting up environment..."
cp .env.production .env

# Create logs directory
mkdir -p logs

# Seed database (creates NEW database: bmh)
echo "Seeding database..."
node backend/scripts/seed-test-users.js
node backend/scripts/seed-lifestyle-products.js
node backend/scripts/seed-medical-products.js

# Start PM2 (adds NEW app: bmh)
echo "Starting application with PM2..."
pm2 start ecosystem.config.js
pm2 save

echo ""
echo "=== Backend Deployment Complete ==="
echo ""
echo "Next steps (manual - to avoid breaking existing apps):"
echo ""
echo "1. Copy Nginx config:"
echo "   sudo cp nginx-portal.conf /etc/nginx/sites-available/portal.basothomedicalherbs.ls"
echo ""
echo "2. Enable site:"
echo "   sudo ln -sf /etc/nginx/sites-available/portal.basothomedicalherbs.ls /etc/nginx/sites-enabled/"
echo ""
echo "3. Test Nginx (IMPORTANT - checks for conflicts):"
echo "   sudo nginx -t"
echo ""
echo "4. If test passes, reload Nginx:"
echo "   sudo systemctl reload nginx"
echo ""
echo "5. Get SSL certificate:"
echo "   sudo certbot --nginx -d portal.basothomedicalherbs.ls"
echo ""
echo "App running on: http://localhost:3001"
echo "PM2 status:"
pm2 list
