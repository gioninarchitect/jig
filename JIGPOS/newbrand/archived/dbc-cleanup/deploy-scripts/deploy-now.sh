#!/bin/bash
# DBC Deploy Script — 12 Feb 2026
# Deploys frontend + fixes roles + adds missing strains
SERVER="root@154.66.197.199"
REMOTE="/var/www/dbc"

echo "=== STEP 1/3: Deploy frontend ==="
scp /tmp/dbc-frontend-hotfix.tar.gz $SERVER:/tmp/ && \
ssh $SERVER "cd $REMOTE && tar -xzf /tmp/dbc-frontend-hotfix.tar.gz && chown -R www-data:www-data frontend/ *.html css/ images/ && rm /tmp/dbc-frontend-hotfix.tar.gz && echo 'Frontend deployed'" || { echo "FAILED: Frontend deploy"; exit 1; }

echo ""
echo "=== STEP 2/3: Fix roles (staff_assistant -> branch_assistant) + owner name ==="
scp /Users/florisolivier/DBC/newbrand/fix-roles.js $SERVER:/tmp/ && \
ssh $SERVER "node /tmp/fix-roles.js && rm /tmp/fix-roles.js" || { echo "FAILED: Role fix"; exit 1; }

echo ""
echo "=== STEP 3/3: Add missing strains (Gelato, LA Candy, NFS, Cereal Milk) ==="
scp /Users/florisolivier/DBC/newbrand/add-missing-strains.js $SERVER:/tmp/ && \
ssh $SERVER "node /tmp/add-missing-strains.js && rm /tmp/add-missing-strains.js" || { echo "FAILED: Add strains"; exit 1; }

echo ""
echo "=============================="
echo "ALL DONE - Hard refresh the stocktake app"
echo "=============================="
