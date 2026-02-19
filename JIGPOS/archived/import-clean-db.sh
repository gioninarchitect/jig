#!/bin/bash
# Import clean database on UAT server
# Run this AFTER extracting deployment tarball on server

echo "Importing clean Basotho Medical Herbs database to UAT..."

# Drop existing database (CAREFUL - only for UAT!)
mongosh bmh --eval "db.dropDatabase()"

# Import all collections
mongorestore --db=bmh db-exports/bmh/

echo "Database imported successfully"
echo "Clean data with:"
echo "  - Admin: admin@basothomedicalherbs.ls / Admin123!"
echo "  - Manager: manager@basothomedicalherbs.ls / Manager123!"
echo "  - Assistant: assistant@basothomedicalherbs.ls / Assistant123!"
echo "  - User: user@basothomedicalherbs.ls / User123!"
echo "  - Patient: patient@basothomedicalherbs.ls / Patient123!"
echo "  - All staff have NO loyalty tiers"
echo "  - All products have 50 units inventory"
