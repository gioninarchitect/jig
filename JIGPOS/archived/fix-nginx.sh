#!/bin/bash

# Fix Nginx - Remove CBD Wellness from portal-openpharms

echo "Backing up portal-openpharms..."
sudo cp /etc/nginx/sites-available/portal-openpharms /etc/nginx/sites-available/portal-openpharms.backup-$(date +%Y%m%d-%H%M%S)

echo "Removing CBD Wellness blocks from portal-openpharms..."

# Remove all lines containing portal.basothomedicalherbs.ls
sudo sed -i '/portal\.bmh\.co\.za/d' /etc/nginx/sites-available/portal-openpharms

echo "Testing Nginx config..."
sudo nginx -t

if [ $? -eq 0 ]; then
    echo "Config is valid. Reloading Nginx..."
    sudo systemctl reload nginx
    echo "Done! Check https://portal.basothomedicalherbs.ls"
else
    echo "ERROR: Nginx config is broken. Restoring backup..."
    sudo cp /etc/nginx/sites-available/portal-openpharms.backup-$(date +%Y%m%d)* /etc/nginx/sites-available/portal-openpharms
    echo "Backup restored. Please check manually."
fi
