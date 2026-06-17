#!/bin/bash
# Kill Chromium's "Turn on caret browsing?" (F7) prompt for good. Run as desktop user (NO sudo).

# 1) Disable the F7 key NOW (keycode 73 on standard keyboards) so caret browsing can't trigger
export DISPLAY=${DISPLAY:-:0}
xmodmap -e 'keycode 73 = ' 2>/dev/null && echo ">> F7 key disabled for this session."

# 2) Persist it — run on every login
mkdir -p "$HOME/.config/autostart"
cat > "$HOME/.config/autostart/disable-f7.desktop" << 'EOF'
[Desktop Entry]
Type=Application
Name=Disable F7 (caret browsing)
Exec=bash -c "sleep 5; xmodmap -e 'keycode 73 = '"
X-GNOME-Autostart-enabled=true
Terminal=false
EOF

# 3) Also turn the Chromium preference off as a backstop
PREFS="$HOME/.config/chromium/Default/Preferences"
if [ -f "$PREFS" ]; then
  python3 - "$PREFS" << 'PY' 2>/dev/null || true
import json, sys
p = sys.argv[1]
try: d = json.load(open(p))
except Exception: d = {}
d.setdefault('settings', {}).setdefault('a11y', {})['caretbrowsing'] = {'enabled': False}
d['ask_for_caret_browsing'] = False
json.dump(d, open(p, 'w'))
PY
fi

echo ""
echo "==================================================="
echo " Caret-browsing (F7) prompt is now DISABLED."
echo " F7 does nothing, and it auto-applies on every login."
echo "==================================================="
