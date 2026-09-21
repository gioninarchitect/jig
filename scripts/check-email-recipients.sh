#!/usr/bin/env bash
# Guard (FLOCORE wall of shame item 63): the Origin POS must never mail Ray, and must never
# send an owner/report email to the shared shop Gmail (which reaches Ray until the mailbox
# forward is removed). Fails the commit/deploy if a banned recipient appears.
set -uo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BE="$ROOT/JIGPOS/newbrand/backend"
fail=0

# A. No Ray address anywhere in the POS backend (recipient, account, alias, seed, anything).
RAY=$(grep -rniE "ray@ilcofarming\.co\.za|ray@ilcofarms\.co\.za" "$BE" 2>/dev/null | grep -vE "node_modules|\.bak")
if [ -n "$RAY" ]; then echo "FAIL: Ray address in POS backend:"; echo "$RAY"; fail=1; fi

# B. Shared shop Gmail must not be a report/owner RECIPIENT (allowed only as the cashier account seed).
SHOP=$(grep -rniE "originbyilcofarming@gmail\.com" "$BE" 2>/dev/null \
  | grep -vE "node_modules|\.bak|scripts/add-potch-cashier\.js" \
  | grep -iE "to:|recipient|REPORT_TO|OWNER_RECIPIENTS|DEFAULT_RECIPIENTS|sendEmail")
if [ -n "$SHOP" ]; then echo "FAIL: shared shop Gmail used as an owner/report recipient:"; echo "$SHOP"; fail=1; fi

[ "$fail" -eq 0 ] && echo "OK: no Ray address, no shared shop Gmail recipient in the POS backend."
exit $fail
