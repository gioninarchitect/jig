#!/bin/bash
# Deploy audit fixes (frontend only) to production
# Server: app.debudchef.co.za (154.66.197.199)

set -e

SERVER="root@154.66.197.199"
REMOTE_PATH="/var/www/dbc"
TARBALL="/tmp/audit-fixes-deploy.tar.gz"

echo "=== Audit Fixes Production Deployment ==="
echo ""

# Step 1: Upload
echo "[1/4] Uploading tarball to server..."
scp "$TARBALL" "$SERVER:/tmp/"

# Step 2-4: Remote operations
echo "[2/4] Backing up existing files..."
echo "[3/4] Extracting upgraded files..."
echo "[4/4] Fixing permissions..."

ssh "$SERVER" "cd $REMOTE_PATH && \
  TIMESTAMP=\$(date +%Y%m%d-%H%M%S) && \
  mkdir -p backups && \
  tar -czf backups/backup-audit-\$TIMESTAMP.tar.gz \
    branch-receiving.html \
    pos.html \
    frontend/admin-core.js \
    frontend/admin-menu-boards.js \
    frontend/admin-pos.js \
    frontend/admin-viral-management.js \
    frontend/admin-vouchers.js \
    frontend/dbc-auth.js \
    frontend/owner-reports.js \
    frontend/pos-cart.js \
    frontend/st-auth.js \
    2>/dev/null; \
  echo 'Backup saved: backups/backup-audit-'\$TIMESTAMP'.tar.gz' && \
  tar -xzf /tmp/audit-fixes-deploy.tar.gz && \
  chown -R www-data:www-data \
    branch-receiving.html \
    pos.html \
    frontend/ \
    css/ \
    images/favicon.png \
    images/favicon.ico \
    images/icon-192.png \
    images/icon-512.png \
    images/placeholder.png && \
  rm /tmp/audit-fixes-deploy.tar.gz && \
  echo '' && \
  echo '=== Audit fixes deployed successfully ==='"
