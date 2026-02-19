#!/bin/bash
# Export clean database for UAT deployment
# Run this BEFORE creating deployment tarball

echo "Exporting clean Basotho Medical Herbs database..."

# Create exports directory
mkdir -p db-exports

# Export all collections from bmh database
mongodump --db=bmh --out=db-exports/

echo "Database exported to db-exports/"
echo "Files included in deployment package"
