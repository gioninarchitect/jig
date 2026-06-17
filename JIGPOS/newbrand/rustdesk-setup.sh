#!/bin/bash
# Install RustDesk for remote access to the POSBANK. Run: curl -s URL | sudo bash
set -e

echo ">> Removing any broken AnyDesk..."
apt-get purge -y anydesk >/dev/null 2>&1 || true
dpkg --remove --force-remove-reinstreq anydesk >/dev/null 2>&1 || true
apt-get install -f -y >/dev/null 2>&1 || true

echo ">> Finding latest RustDesk for x86_64..."
URL=$(curl -s https://api.github.com/repos/rustdesk/rustdesk/releases/latest \
  | grep browser_download_url \
  | grep 'x86_64.deb' \
  | grep -viE 'musl|unsigned|appimage' \
  | head -1 | cut -d'"' -f4)
if [ -z "$URL" ]; then
  echo "!! Could not find a download URL. Check internet on the box."
  exit 1
fi
echo ">> Downloading: $URL"
cd /tmp
wget -q "$URL" -O rustdesk.deb
echo ">> Installing..."
apt-get install -y ./rustdesk.deb || apt-get install -f -y

echo ">> Starting service..."
systemctl enable --now rustdesk 2>/dev/null || true
sleep 4

echo ">> Setting unattended password..."
rustdesk --password OriginPOS2026! 2>/dev/null || true
sleep 1

ID=$(rustdesk --get-id 2>/dev/null | tr -d '[:space:]')
[ -z "$ID" ] && { sleep 3; ID=$(rustdesk --get-id 2>/dev/null | tr -d '[:space:]'); }

echo ""
echo "==================================================="
echo " RustDesk INSTALLED"
echo " THIS DESK ID:  ${ID:-(run: rustdesk --get-id)}"
echo " Password:      OriginPOS2026!"
echo ""
echo " If no ID above, just type:  rustdesk --get-id"
echo " or open RustDesk from the Applications menu."
echo "==================================================="
