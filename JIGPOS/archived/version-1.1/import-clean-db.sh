#!/bin/bash
# Import clean database on UAT server
# Run this AFTER extracting deployment tarball on server

echo "Importing clean CBD Wellness 24 database to UAT..."

# Drop existing database (CAREFUL - only for UAT!)
mongosh cbdwellness24 --eval "db.dropDatabase()"

# Import all collections
mongorestore --db=cbdwellness24 db-exports/cbdwellness24/

echo "Database imported successfully"
echo "Clean data with:"
echo "  - Admin: admin@cbdwellness24.co.za / Admin123!"
echo "  - Manager: manager@cbdwellness24.co.za / Manager123!"
echo "  - Assistant: assistant@cbdwellness24.co.za / Assistant123!"
echo "  - User: user@cbdwellness24.co.za / User123!"
echo "  - Patient: patient@cbdwellness24.co.za / Patient123!"
echo "  - All staff have NO loyalty tiers"
echo "  - All products have 50 units inventory"
