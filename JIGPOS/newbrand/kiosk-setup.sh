#!/bin/bash
# Origin POS kiosk autostart + watchdog — run on the POSBANK (NO sudo): curl -s URL | bash
set -e

BROWSER=$(which chromium-browser chromium 2>/dev/null | head -1)
[ -z "$BROWSER" ] && BROWSER="chromium-browser"
echo "Using browser: $BROWSER"

# Watchdog wrapper — relaunches the POS instantly if it's closed (Alt+F4) or crashes
cat > "$HOME/origin-pos-kiosk.sh" << EOF
#!/bin/bash
export DISPLAY=:0
URL="https://origin.cleva-ai.co.za/pos.html"
PREFS="\$HOME/.config/chromium/Default/Preferences"
while true; do
  # clear crash-restore nag each launch
  [ -f "\$PREFS" ] && sed -i 's/"exit_type":"Crashed"/"exit_type":"Normal"/;s/"exited_cleanly":false/"exited_cleanly":true/' "\$PREFS" 2>/dev/null || true
  $BROWSER --app=\$URL --start-fullscreen --kiosk-printing --no-first-run --disable-infobars --disable-session-crashed-bubble --disable-restore-session-state
  sleep 1
done
EOF
chmod +x "$HOME/origin-pos-kiosk.sh"

# Autostart the watchdog on login
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/origin-pos-kiosk.desktop" << EOF
[Desktop Entry]
Type=Application
Name=Origin POS Kiosk
Exec=$HOME/origin-pos-kiosk.sh
X-GNOME-Autostart-enabled=true
Terminal=false
EOF

echo ""
echo "==================================================="
echo " Origin POS kiosk + WATCHDOG installed"
echo " The POS auto-launches on boot, and RELAUNCHES"
echo " instantly if closed (Alt+F4) or it crashes."
echo ""
echo " Start it now without rebooting:"
echo "   \$HOME/origin-pos-kiosk.sh &"
echo ""
echo " To stop the watchdog for maintenance:"
echo "   pkill -f origin-pos-kiosk.sh ; pkill chromium"
echo "==================================================="
