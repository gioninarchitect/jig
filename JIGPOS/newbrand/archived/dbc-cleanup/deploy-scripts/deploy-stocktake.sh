#!/bin/bash
# Deploy Stocktake App upgrade to production
# Server: app.debudchef.co.za (154.66.197.199)

set -e

SERVER="root@154.66.197.199"
REMOTE_PATH="/var/www/dbc"
TARBALL="/tmp/stocktake-deploy.tar.gz"

echo "=== Stocktake App Production Deployment ==="
echo ""

# Step 1: Upload
echo "[1/5] Uploading tarball to server..."
scp "$TARBALL" "$SERVER:/tmp/"

# Step 2-5: Remote operations
echo "[2/5] Backing up existing files..."
echo "[3/5] Extracting upgraded files..."
echo "[4/5] Fixing permissions..."
echo "[5/5] Restarting PM2..."

ssh "$SERVER" "cd $REMOTE_PATH && \
  TIMESTAMP=\$(date +%Y%m%d-%H%M%S) && \
  mkdir -p backups && \
  tar -czf backups/backup-stocktake-\$TIMESTAMP.tar.gz \
    stocktake-app.html \
    frontend/st-counting.js \
    frontend/st-items.js \
    frontend/st-camera.js \
    frontend/st-sessions.js \
    frontend/st-auth.js \
    frontend/st-receiving.js \
    backend/controllers/stocktake.controller.js \
    backend/modules/database/models/StockTake.js \
    backend/routes/stocktake.js && \
  echo 'Backup saved: backups/backup-stocktake-'\$TIMESTAMP'.tar.gz' && \
  tar -xzf /tmp/stocktake-deploy.tar.gz && \
  chown -R www-data:www-data stocktake-app.html frontend/ backend/ && \
  pm2 restart dbc && \
  rm /tmp/stocktake-deploy.tar.gz && \
  echo '' && \
  echo '=== Stocktake upgrade deployed successfully ==='"
