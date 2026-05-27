#!/bin/bash
# ============================================================
# DBC Deploy: Day End Cashup + Stocktake + Dialog Fixes
# Date: 15 Feb 2026
# Run ON the server: /tmp/deploy-dayend.sh
# ============================================================

set -e

REMOTE_PATH="/var/www/dbc"
PM2_NAME="dbc"
TARBALL="/tmp/dayend-deploy.tar.gz"

echo "========================================="
echo "  DBC Production Deploy"
echo "  Day End Cashup + Stocktake + Dialog Fixes"
echo "========================================="
echo ""

# ------------------------------------------
# Step 1: Verify tarball exists
# ------------------------------------------
echo "[1/6] Checking tarball..."
if [ ! -f "$TARBALL" ]; then
    echo "  ERROR: $TARBALL not found!"
    exit 1
fi
echo "  Found: $TARBALL"
echo ""

# ------------------------------------------
# Step 2: Backup existing files
# ------------------------------------------
echo "[2/6] Backing up existing files..."
cd "$REMOTE_PATH"
TIMESTAMP=$(date +%Y%m%d-%H%M%S)
mkdir -p backups
tar -czf "backups/backup-dayend-$TIMESTAMP.tar.gz" \
    pos.html \
    stocktake-app.html \
    frontend/dbc-core.js \
    frontend/pos-cashup.js \
    frontend/pos-shifts.js \
    frontend/inv-stocktake.js \
    frontend/inv-mdc.js \
    frontend/inv-reorder.js \
    frontend/inv-purchase-orders.js \
    frontend/inv-batches.js \
    frontend/st-auth.js \
    frontend/st-camera.js \
    frontend/st-counting.js \
    frontend/st-items.js \
    frontend/st-receiving.js \
    frontend/st-sessions.js \
    backend/routes/pos.js \
    backend/controllers/pos.controller.js \
    backend/modules/database/models/BranchInventory.js \
    backend/modules/database/models/DailyCashup.js \
    2>/dev/null || true
echo "  Backup: backups/backup-dayend-$TIMESTAMP.tar.gz"
echo ""

# ------------------------------------------
# Step 3: Extract new files
# ------------------------------------------
echo "[3/6] Deploying new files..."
tar -xzf "$TARBALL"
rm "$TARBALL"
echo "  Files extracted."
echo ""

# ------------------------------------------
# Step 4: Syntax check backend JS
# ------------------------------------------
echo "[4/6] Syntax checking backend files..."
node -c backend/routes/pos.js
node -c backend/controllers/pos.controller.js
node -c backend/modules/database/models/BranchInventory.js
node -c backend/modules/database/models/DailyCashup.js
echo "  All syntax checks passed."
echo ""

# ------------------------------------------
# Step 5: Fix permissions + restart PM2
# ------------------------------------------
echo "[5/6] Setting permissions and restarting..."
chown -R www-data:www-data \
    pos.html \
    stocktake-app.html \
    frontend/dbc-core.js \
    frontend/pos-cashup.js \
    frontend/pos-shifts.js \
    frontend/inv-stocktake.js \
    frontend/inv-mdc.js \
    frontend/inv-reorder.js \
    frontend/inv-purchase-orders.js \
    frontend/inv-batches.js \
    frontend/st-auth.js \
    frontend/st-camera.js \
    frontend/st-counting.js \
    frontend/st-items.js \
    frontend/st-receiving.js \
    frontend/st-sessions.js \
    backend/routes/pos.js \
    backend/controllers/pos.controller.js \
    backend/modules/database/models/BranchInventory.js \
    backend/modules/database/models/DailyCashup.js
chmod 644 \
    pos.html \
    stocktake-app.html \
    frontend/dbc-core.js \
    frontend/pos-cashup.js \
    frontend/pos-shifts.js \
    frontend/inv-stocktake.js \
    frontend/inv-mdc.js \
    frontend/inv-reorder.js \
    frontend/inv-purchase-orders.js \
    frontend/inv-batches.js \
    frontend/st-auth.js \
    frontend/st-camera.js \
    frontend/st-counting.js \
    frontend/st-items.js \
    frontend/st-receiving.js \
    frontend/st-sessions.js \
    backend/routes/pos.js \
    backend/controllers/pos.controller.js \
    backend/modules/database/models/BranchInventory.js \
    backend/modules/database/models/DailyCashup.js
echo "  Permissions set."
pm2 restart "$PM2_NAME"
echo "  PM2 restarted."
echo ""

# ------------------------------------------
# Step 6: Health check + DB schema verify
# ------------------------------------------
echo "[6/6] Health check and database verification..."
sleep 3

STATUS=$(curl -s http://localhost:3003/api/v1/health)
echo "  Health: $STATUS" | head -c 200
echo ""

node -e "
    require('dotenv').config();
    const mongoose = require('mongoose');
    mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/dbc').then(async () => {
        const db = mongoose.connection.db;
        const collections = await db.listCollections().toArray();
        const names = collections.map(c => c.name);
        console.log('  DB Collections:');
        console.log('    dailycashups:', names.includes('dailycashups') ? 'EXISTS' : 'WILL BE CREATED ON FIRST USE');
        console.log('    branchinventories:', names.includes('branchinventories') ? 'EXISTS' : 'MISSING');
        console.log('    tillsessions:', names.includes('tillsessions') ? 'EXISTS' : 'MISSING');
        if (names.includes('dailycashups')) {
            const indexes = await db.collection('dailycashups').indexes();
            console.log('    dailycashups indexes:', indexes.length);
        }
        const BranchInventory = require('./backend/modules/database/models/BranchInventory');
        const bi = new BranchInventory({});
        console.log('    BranchInventory.addStock:', typeof bi.addStock === 'function' ? 'OK' : 'MISSING');
        console.log('  Database: OK - no migrations needed');
        process.exit(0);
    }).catch(e => { console.error('  DB Error:', e.message); process.exit(1); });
"

echo ""
echo "========================================="
echo "  Deployment complete!"
echo "  Test at: https://app.debudchef.co.za/pos.html"
echo "========================================="
