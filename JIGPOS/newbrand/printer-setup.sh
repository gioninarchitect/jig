#!/bin/bash
# Origin POS — S300H thermal printer + cash drawer setup. Run: curl -s URL | sudo bash
set -e

echo ">> Installing CUPS + tools..."
apt-get update -qq
apt-get install -y cups system-config-printer xfce4-screenshooter >/dev/null 2>&1 || apt-get install -y cups system-config-printer
usermod -aG lpadmin ubuntu 2>/dev/null || true
systemctl enable --now cups >/dev/null 2>&1

echo ">> Looking for the printer..."
lpinfo -v 2>/dev/null | grep -i 'usb\|socket\|dnssd' || true
USB_URI=$(lpinfo -v 2>/dev/null | awk '/usb/ && !/https|ipp/ {print $2; exit}')

if [ -n "$USB_URI" ]; then
  echo ">> Found USB printer: $USB_URI"
  lpadmin -x OriginReceipt 2>/dev/null || true
  lpadmin -p OriginReceipt -E -v "$USB_URI" -m raw
  lpadmin -d OriginReceipt
  cupsenable OriginReceipt 2>/dev/null || true
  cupsaccept OriginReceipt 2>/dev/null || true
  echo ""
  echo ">> Sending TEST SLIP..."
  printf '\n\n   ORIGIN RETAIL\n   Potchefstroom\n   ----------------\n   Printer OK!\n\n\n\n\n' | lp -d OriginReceipt >/dev/null
  sleep 1
  echo ">> Kicking CASH DRAWER..."
  printf '\x1B\x70\x00\x19\xFA' | lp -d OriginReceipt -o raw >/dev/null 2>&1 || true
  echo ""
  echo "==================================================="
  echo " PRINTER 'OriginReceipt' INSTALLED + set as default"
  echo " A test slip should have printed."
  echo " The cash drawer should have popped open."
  echo "==================================================="
else
  echo ""
  echo "!! No USB printer detected."
  echo "   1. Check the printer is plugged into a USB port and powered ON."
  echo "   2. If it is connected by NETWORK (LAN) cable instead, run:"
  echo "        ip neigh   # find the printer IP, then tell Floris"
  echo "   We'll switch it to socket://<IP>:9100"
fi
