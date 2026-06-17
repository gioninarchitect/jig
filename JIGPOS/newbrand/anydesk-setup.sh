#!/bin/bash
# Install AnyDesk for remote access to the POSBANK. Run with: curl -s URL | sudo bash
set -e

mkdir -p /etc/apt/keyrings
wget -qO- https://keys.anydesk.com/repos/DEB-GPG-KEY | gpg --dearmor -o /etc/apt/keyrings/anydesk.gpg
echo "deb [signed-by=/etc/apt/keyrings/anydesk.gpg] http://deb.anydesk.com/ all main" > /etc/apt/sources.list.d/anydesk.list
apt update
apt install -y anydesk
systemctl enable --now anydesk
sleep 2

# Set unattended-access password so you can connect without someone clicking Accept
echo "OriginPOS2026!" | anydesk --set-password 2>/dev/null || true
sleep 2

echo ""
echo "==================================================="
echo " AnyDesk INSTALLED"
echo ""
echo " THIS DESK ID (connect to this from your laptop):"
anydesk --get-id
echo ""
echo " Unattended password: OriginPOS2026!"
echo " (change it later in the AnyDesk app > Settings > Security)"
echo "==================================================="
