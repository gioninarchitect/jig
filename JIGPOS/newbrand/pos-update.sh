#!/bin/bash
# Force the POS to the latest version — clears the cached service worker + relaunches. Run as desktop user (NO sudo).
export DISPLAY=${DISPLAY:-:0}
echo ">> Stopping POS..."
pkill -f origin-pos-kiosk.sh 2>/dev/null
pkill chromium 2>/dev/null
pkill chromium-browser 2>/dev/null
sleep 2

echo ">> Clearing cached app (service worker + cache)..."
P="$HOME/.config/chromium/Default"
rm -rf "$P/Service Worker" "$P/Cache" "$P/Code Cache" 2>/dev/null

sleep 1
echo ">> Relaunching POS (latest version)..."
if [ -f "$HOME/origin-pos-kiosk.sh" ]; then
  nohup "$HOME/origin-pos-kiosk.sh" >/dev/null 2>&1 &
else
  BROWSER=$(which chromium-browser chromium 2>/dev/null | head -1)
  nohup "$BROWSER" --app=https://origin.cleva-ai.co.za/pos.html --start-fullscreen --kiosk-printing >/dev/null 2>&1 &
fi
echo ">> Done. The POS is now on the latest version."
