#!/bin/bash
# Generate a run-ready owner360_mobile spec with the live dynamic PIN.
# Coenie is TENANT_ADMIN (not an OPEN_LOGIN_ROLE) so the stored-PIN fallback is
# blocked in production — we MUST use a freshly issued dynamic PIN. We trigger
# request-pin, read the PIN from pm2 (non-prod logging is on for this box), and
# substitute it into the spec. The spec re-clicks "Request PIN" in the UI within
# the 60s debounce window, so that click reuses THIS session — the PIN stays valid.
set -euo pipefail
EMAIL="florisolivier7+coenie@gmail.com"
DIR="$(cd "$(dirname "$0")" && pwd)"

echo "▸ flushing pm2 + requesting PIN for $EMAIL"
ssh tr-api "pm2 flush tnt-za >/dev/null 2>&1" || true
curl -s -X POST https://tntilco.cleva-ai.co.za/api/auth/request-pin \
  -H 'content-type: application/json' -d "{\"email\":\"$EMAIL\"}" -o /dev/null
sleep 2

PIN=$(ssh tr-api "pm2 logs tnt-za --lines 60 --nostream 2>/dev/null" \
  | grep -F "PIN for $EMAIL" | tail -1 | grep -oE '[0-9]{6}$')

if [ -z "${PIN:-}" ]; then echo "❌ could not read PIN from pm2"; exit 1; fi
echo "▸ captured PIN: $PIN"

sed "s/__PIN__/$PIN/" "$DIR/owner360_mobile.json" > "$DIR/owner360_mobile.run.json"
echo "▸ wrote $DIR/owner360_mobile.run.json"
