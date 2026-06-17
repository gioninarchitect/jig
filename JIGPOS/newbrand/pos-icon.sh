#!/bin/bash
# Put an "Origin POS" icon on the XFCE desktop + apps menu. Run: curl -s URL | bash
set -e

BROWSER=$(which chromium-browser chromium 2>/dev/null | head -1)
[ -z "$BROWSER" ] && BROWSER="chromium-browser"

DESKTOP_DIR=$(xdg-user-dir DESKTOP 2>/dev/null || echo "$HOME/Desktop")
mkdir -p "$DESKTOP_DIR" "$HOME/.local/share/applications" "$HOME/.local/share/icons"

# Download the Origin logo for the icon
ICON_PATH="$HOME/.local/share/icons/origin-pos.png"
curl -s -o "$ICON_PATH" https://origin.cleva-ai.co.za/images/icon-512.png || true
[ -s "$ICON_PATH" ] || ICON_PATH="applications-internet"

read -r -d '' LAUNCHER << EOF || true
[Desktop Entry]
Version=1.0
Type=Application
Name=Origin POS
Comment=Open the Origin Retail POS
Exec=$BROWSER --app=https://origin.cleva-ai.co.za/pos.html --start-fullscreen
Icon=$ICON_PATH
Terminal=false
Categories=Office;
StartupNotify=true
EOF

# Desktop icon
echo "$LAUNCHER" > "$DESKTOP_DIR/Origin-POS.desktop"
chmod +x "$DESKTOP_DIR/Origin-POS.desktop"
gio set "$DESKTOP_DIR/Origin-POS.desktop" metadata::trusted true 2>/dev/null || true

# Apps menu entry
echo "$LAUNCHER" > "$HOME/.local/share/applications/origin-pos.desktop"
chmod +x "$HOME/.local/share/applications/origin-pos.desktop"
update-desktop-database "$HOME/.local/share/applications" 2>/dev/null || true

echo ""
echo "==================================================="
echo " 'Origin POS' icon added to the Desktop."
echo " Double-tap it to open the POS."
echo " (Also in Applications menu > Office > Origin POS)"
echo "==================================================="
