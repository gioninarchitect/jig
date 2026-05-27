#!/bin/bash
# DBC Full Deploy to Production
# Server: app.debudchef.co.za (154.66.197.199)
# Date: 12 Feb 2026

SERVER="root@154.66.197.199"
REMOTE="/var/www/dbc"
TARBALL="/tmp/dbc-full-deploy.tar.gz"

echo "========================================"
echo "  DBC PRODUCTION DEPLOYMENT"
echo "========================================"
echo ""

# Step 1: Upload
echo "[1/3] Uploading tarball to server..."
scp "$TARBALL" "$SERVER:/tmp/"
if [ $? -ne 0 ]; then
    echo "FAILED: Upload failed"
    exit 1
fi
echo "Upload done."
echo ""

# Step 2: Backup + Deploy
echo "[2/3] Backing up and deploying..."
ssh "$SERVER" "cd $REMOTE && \
    TIMESTAMP=\$(date +%Y%m%d-%H%M%S) && \
    mkdir -p backups && \
    tar -czf backups/backup-\$TIMESTAMP.tar.gz backend/ frontend/ css/ images/ *.html config.js package.json && \
    echo \"Backup: backup-\$TIMESTAMP.tar.gz\" && \
    tar -xzf /tmp/dbc-full-deploy.tar.gz && \
    npm install --production && \
    pm2 restart dbc && \
    sleep 3 && \
    pm2 status dbc && \
    rm /tmp/dbc-full-deploy.tar.gz && \
    echo 'Deploy complete'"
if [ $? -ne 0 ]; then
    echo "FAILED: Deploy failed"
    exit 1
fi
echo ""

# Step 3: Set PINs + fix Floris role
echo "[3/3] Setting PINs on production DB..."
ssh "$SERVER" "mongosh dbc --eval \"
    db.users.updateOne({email:'owner@debudchef.co.za'},{\\\$set:{permanentPin:'830101'}});
    db.users.updateOne({email:'admin@debudchef.co.za'},{\\\$set:{permanentPin:'990001'}});
    db.users.updateOne({email:'ormonde.manager@debudchef.co.za'},{\\\$set:{permanentPin:'110001'}});
    db.users.updateOne({email:'ormonde.assistant@debudchef.co.za'},{\\\$set:{permanentPin:'110002'}});
    db.users.updateOne({email:'inventory@debudchef.co.za'},{\\\$set:{permanentPin:'770001'}});
    db.users.updateOne({email:'florisolivier7@gmail.com'},{\\\$set:{role:'admin'}});
    print('PINs set. Floris demoted to admin.');
\""
echo ""

echo "========================================"
echo "  DEPLOYMENT COMPLETE"
echo "========================================"
echo ""
echo "Test these URLs:"
echo "  Owner:     https://app.debudchef.co.za/owner-dashboard.html"
echo "  Admin:     https://app.debudchef.co.za/admin.html"
echo "  POS:       https://app.debudchef.co.za/pos.html"
echo "  Stocktake: https://app.debudchef.co.za/stocktake-app.html"
echo "  Inventory: https://app.debudchef.co.za/inventory-manager-dashboard.html"
echo ""
echo "Logins:"
echo "  Owner (Power):      owner@debudchef.co.za / 830101"
echo "  Admin:              admin@debudchef.co.za / 990001"
echo "  Ormonde Manager:    ormonde.manager@debudchef.co.za / 110001"
echo "  Ormonde Assistant:  ormonde.assistant@debudchef.co.za / 110002"
echo "  Inventory Manager:  inventory@debudchef.co.za / 770001"
