#!/bin/bash
# Disable the PrtScn screenshot shortcut on XFCE (run as the desktop user, NO sudo)
echo ">> Disabling screenshot keyboard shortcuts..."
# Remove any keybinding that launches the screenshooter
for p in $(xfconf-query -c xfce4-keyboard-shortcuts -l 2>/dev/null | grep -iE 'print|screenshot'); do
  xfconf-query -c xfce4-keyboard-shortcuts -p "$p" -r 2>/dev/null && echo "   removed: $p"
done
# Belt-and-braces: make the Print command a no-op
xfconf-query -c xfce4-keyboard-shortcuts -n -t string -p '/commands/custom/Print' -s 'true' 2>/dev/null || true
xfconf-query -c xfce4-keyboard-shortcuts -n -t string -p '/commands/custom/<Primary>Print' -s 'true' 2>/dev/null || true
echo ">> Done. The PrtScn / screenshot popup is disabled (takes effect immediately)."
