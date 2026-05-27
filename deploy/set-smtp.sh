#!/bin/bash
# Set SMTP password and restart PureGro

APP_DIR="/var/www/jig"

# Write password using python to avoid shell escaping issues
python3 -c "
import re
with open('$APP_DIR/.env', 'r') as f:
    content = f.read()
content = re.sub(r'SMTP_PASS=.*', 'SMTP_PASS=B0t2026!@#', content)
with open('$APP_DIR/.env', 'w') as f:
    f.write(content)
print('SMTP password updated')
"

# Verify
grep 'SMTP_PASS' "$APP_DIR/.env"

# Restart
pm2 restart puregro-api
sleep 3

# Health check
echo ""
echo "=== Health Check ==="
curl -s http://127.0.0.1:3002/health && echo ""

echo ""
echo "=== PM2 Status ==="
pm2 list | grep jig
