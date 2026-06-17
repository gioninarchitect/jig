#!/bin/bash
# Proper ESC/POS test slip — init, print, feed, cut. Run: curl -s URL | bash
P=OriginReceipt

# Build ESC/POS: ESC @ (init), centered bold title, text, feed, full cut
{
  printf '\x1B\x40'                 # ESC @  initialise
  printf '\x1B\x61\x01'             # ESC a 1  center align
  printf '\x1B\x21\x30'             # ESC ! 0x30  double height+width
  printf 'ORIGIN RETAIL\n'
  printf '\x1B\x21\x00'             # ESC ! 0  normal
  printf 'Potchefstroom\n'
  printf '------------------------\n'
  printf 'Printer test OK\n'
  printf 'S300H + cash drawer\n'
  printf '\n\n\n\n'                 # feed
  printf '\x1D\x56\x00'             # GS V 0  full cut
} | lp -d "$P" -o raw >/dev/null 2>&1

echo "Test slip sent to $P."
echo "If still blank -> the paper roll is likely upside down (thermal side wrong way). Flip it and retry."
