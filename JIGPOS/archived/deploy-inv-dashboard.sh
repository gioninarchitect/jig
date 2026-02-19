#!/bin/bash
# Deploy Inventory Dashboard UI/UX Upgrade to Production
# Frontend-only — no PM2 restart needed

SERVER="154.66.197.199"
REMOTE_PATH="/var/www/dbc"
TARBALL="/tmp/inv-dashboard-upgrade.tar.gz"

echo "=== Deploying Inventory Dashboard Upgrade ==="
echo ""

# 1. Upload
echo "[1/4] Uploading tarball..."
scp "$TARBALL" root@$SERVER:/tmp/ || { echo "FAILED: Upload failed"; exit 1; }

# 2. Backup existing files
echo "[2/4] Backing up existing files on server..."
ssh root@$SERVER "cd $REMOTE_PATH && TIMESTAMP=\$(date +%Y%m%d-%H%M%S) && mkdir -p backups && tar -czf backups/backup-inv-\$TIMESTAMP.tar.gz css/inv-dashboard.css inventory-manager-dashboard.html frontend/inv-core.js 2>/dev/null; echo 'Backup done'"

# 3. Extract new files
echo "[3/4] Extracting files..."
ssh root@$SERVER "cd $REMOTE_PATH && tar -xzf /tmp/inv-dashboard-upgrade.tar.gz && rm /tmp/inv-dashboard-upgrade.tar.gz && echo 'Extracted'"

# 4. Set permissions
echo "[4/4] Setting permissions..."
ssh root@$SERVER "cd $REMOTE_PATH && chown -R www-data:www-data css/inv-dashboard.css inventory-manager-dashboard.html frontend/inv-core.js && chmod 644 css/inv-dashboard.css inventory-manager-dashboard.html frontend/inv-core.js && echo 'Permissions set'"

echo ""
echo "=== Deployment complete ==="
echo "Test at: https://app.debudchef.co.za/inventory-manager-dashboard.html"
