#!/bin/bash
# Fix login API URL and responsive design on production

echo "Updating login page with API fix and responsive improvements..."

cd /var/www/cbd-wellness-24

# Backup login.html
cp login.html login.html.backup-$(date +%Y%m%d-%H%M%S)

echo "Backup created"

# Copy updated login.html from local (you'll need to upload the new login.html first)
# For now, we'll just remind you to upload it

echo ""
echo "============================================"
echo "MANUAL STEPS REQUIRED:"
echo "============================================"
echo ""
echo "1. Upload the updated login.html to /var/www/cbd-wellness-24/"
echo ""
echo "2. Test the login at https://portal.cbdwellness24.co.za/login"
echo ""
echo "3. Use these test credentials:"
echo "   - Admin: admin@cbdwellness24.co.za / CBDWellness2024!"
echo "   - Staff Assistant: assistant@cbdwellness24.co.za / Assistant123!"
echo ""
echo "CHANGES MADE:"
echo "- API_URL now auto-detects environment (localhost vs production)"
echo "- Added responsive breakpoints for 1024px, 768px, 480px, 360px"
echo "- Fixed button sizing and spacing on mobile devices"
echo "- Improved logo sizing across all screen sizes"
echo "============================================"
