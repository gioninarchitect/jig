#!/bin/bash
# DBC Stocktake Fix Deploy — 12 Feb 2026
# 1) Add missing products (Cartridge Plug, Mediblz, Joynt, Magic Mushroom, Coder Juice, Blueberry 5g)
# 2) Add ALL missing products to active Ormonde session
# 3) Deploy frontend + backend (isCountable fix, Add Product button, invoice rebrand)
SERVER="root@154.66.197.199"
REMOTE="/var/www/dbc"

echo "=== STEP 1/3: Add missing products to DB ==="
scp /Users/florisolivier/DBC/newbrand/add-missing-products.js $SERVER:/tmp/ && \
ssh $SERVER "node /tmp/add-missing-products.js && rm /tmp/add-missing-products.js" || { echo "FAILED: Add products"; exit 1; }

echo ""
echo "=== STEP 2/3: Fix session — add all missing products ==="
scp /Users/florisolivier/DBC/newbrand/fix-session-items.js $SERVER:/tmp/ && \
ssh $SERVER "node /tmp/fix-session-items.js && rm /tmp/fix-session-items.js" || { echo "FAILED: Session fix"; exit 1; }

echo ""
echo "=== STEP 3/3: Deploy frontend + backend ==="
scp /tmp/dbc-stocktake-fix.tar.gz $SERVER:/tmp/ && \
ssh $SERVER "cd $REMOTE && tar -xzf /tmp/dbc-stocktake-fix.tar.gz && chown -R www-data:www-data frontend/ stocktake-app.html backend/controllers/stocktake.controller.js backend/routes/stocktake.js backend/services/invoiceGenerator.js css/ images/ && pm2 restart dbc && rm /tmp/dbc-stocktake-fix.tar.gz && echo 'Deployed + PM2 restarted'" || { echo "FAILED: Deploy"; exit 1; }

echo ""
echo "=============================="
echo "ALL DONE — Hard refresh stocktake app"
echo "- 7 new products added (Cartridge Plug, Mediblz, Joynt, Synergy Waves, Magic Mushroom, Coder Juice, Blueberry 5g)"
echo "- All missing products added to session"
echo "- Pre-rolls now count in units"
echo "- Gold + button = Add Product"
echo "- Invoices rebranded to De Bud Chef"
echo "=============================="
