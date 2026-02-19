#!/bin/bash
set -e

echo "MongoDB Database Import for CBD Wellness 24"
echo "============================================"
echo ""

DB_NAME="cbdwellness24"
DUMP_FILE="cbd-db-backup-20251107-1430.tar.gz"
DEPLOY_DIR="/var/www/cbd-wellness-24"

echo "Step 1: Extracting database dump..."
cd $DEPLOY_DIR
tar -xzf $DUMP_FILE

echo "Step 1.5: Removing macOS hidden files..."
find cbd-db-backup-20251107-1430 -name "._*" -delete
find cbd-db-backup-20251107-1430 -name ".DS_Store" -delete

echo "Step 2: Backing up existing database (just in case)..."
mongodump --db=$DB_NAME --out=/tmp/cbd-backup-before-import-$(date +%Y%m%d-%H%M) || echo "No existing database to backup"

echo "Step 3: Importing database..."
mongorestore --db=$DB_NAME --drop cbd-db-backup-20251107-1430/cbdwellness24/

echo "Step 4: Verifying import..."
echo "Products count:"
mongosh $DB_NAME --quiet --eval "db.products.countDocuments()"

echo "Users count:"
mongosh $DB_NAME --quiet --eval "db.users.countDocuments()"

echo "Menu items count:"
mongosh $DB_NAME --quiet --eval "db.menuitems.countDocuments()"

echo "Step 5: Cleaning up..."
rm -rf cbd-db-backup-20251107-1430

echo ""
echo "Database import complete!"
echo "Restart application with: pm2 restart cbd-wellness-24"
