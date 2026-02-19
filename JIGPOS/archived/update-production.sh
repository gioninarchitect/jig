#!/bin/bash
# Update production files safely

echo "Updating API URLs for production..."

cd /var/www/cbd-wellness-24

# Backup files first
cp login.html login.html.backup
cp admin.html admin.html.backup
cp dashboard.html dashboard.html.backup

echo "Backups created"

# Update login.html
sed -i "s|const API_URL = 'http://localhost:3001'|const API_URL = 'https://portal.basothomedicalherbs.ls'|g" login.html

# Update admin.html
sed -i "s|const API_URL = 'http://localhost:3001'|const API_URL = 'https://portal.basothomedicalherbs.ls'|g" admin.html

# Update dashboard.html
sed -i "s|const API_URL = 'http://localhost:3001'|const API_URL = 'https://portal.basothomedicalherbs.ls'|g" dashboard.html

echo "API URLs updated"

# Seed menu
echo "Seeding Bean & Bud menu..."
node backend/scripts/seed-menu.js

echo "Done! Refresh your browser."
