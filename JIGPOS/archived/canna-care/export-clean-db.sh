#!/bin/bash
# Export clean database for UAT deployment
# Run this BEFORE creating deployment tarball

echo "Exporting clean CBD Wellness 24 database..."

# Create exports directory
mkdir -p db-exports

# Export all collections from cbdwellness24 database
mongodump --db=cbdwellness24 --out=db-exports/

echo "Database exported to db-exports/"
echo "Files included in deployment package"
