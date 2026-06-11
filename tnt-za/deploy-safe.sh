#!/bin/bash
# ─────────────────────────────────────────────────────────────────────────────
# TnT-ZA SAFE deploy — code/dist only, additive schema, NO data loss, NO reseed.
#
# Why this exists: the original deploy.sh runs `prisma db push --accept-data-loss`
# AND reseeds users with a different email set — destructive, unsafe for a live
# box. This script ships the compiled dist + schema, applies ONLY additive schema
# changes (db push refuses destructive ones without the flag), restarts, verifies,
# and rolls back automatically if the health check fails. It never touches users.
#
# Live server is NOT git and runs from dist/ (src is incomplete) — dist IS the
# artifact. Always `npm run build` first. Diff local dist vs live dist before
# shipping to confirm the change set is only what you intend.
#
# Usage:  ./deploy-safe.sh
# ─────────────────────────────────────────────────────────────────────────────
set -euo pipefail
SERVER="tr-api"                 # ssh alias for root@154.66.197.199
APPDIR="/var/www/tnt-za/backend"
HEALTH="http://127.0.0.1:6000/api/health"   # the real app port (.env PORT=6000); 3002 is a stale zombie process

echo "▸ 1/6 build (tsc → dist)"
( cd backend && npm run build )

echo "▸ 2/6 backup live dist + schema (rollback point)"
TS=$(ssh "$SERVER" "cd $APPDIR && ts=\$(date +%Y%m%d-%H%M%S) && cp -r dist dist.bak-\$ts && cp prisma/schema.prisma prisma/schema.prisma.bak-\$ts && echo \$ts")
echo "  backup: dist.bak-$TS"

echo "▸ 3/6 ship dist + schema"
tar -czf /tmp/tnt-deploy.tar.gz -C backend dist prisma/schema.prisma
scp -q /tmp/tnt-deploy.tar.gz "$SERVER":/tmp/tnt-deploy.tar.gz

echo "▸ 4/6 extract + generate + ADDITIVE db push (no --accept-data-loss)"
ssh "$SERVER" "cd $APPDIR && tar -xzf /tmp/tnt-deploy.tar.gz 2>/dev/null && npx prisma generate >/dev/null 2>&1 && npx prisma db push --skip-generate 2>&1 | grep -iE 'in sync|data loss|drop' || true"

echo "▸ 5/6 restart"
ssh "$SERVER" "pm2 restart tnt-za --update-env >/dev/null 2>&1 && sleep 4"

echo "▸ 6/6 verify health"
CODE=$(ssh "$SERVER" "curl -sS -o /dev/null -w '%{http_code}' $HEALTH" || echo 000)
if [ "$CODE" = "200" ]; then
  echo "✅ deploy OK (health $CODE). Boot:"
  ssh "$SERVER" "pm2 logs tnt-za --lines 30 --nostream 2>/dev/null | grep -iE '\[driver\]|\[training-loop\]|running on' | tail -4"
else
  echo "❌ health $CODE — ROLLING BACK to dist.bak-$TS"
  ssh "$SERVER" "cd $APPDIR && rm -rf dist && cp -r dist.bak-$TS dist && pm2 restart tnt-za >/dev/null 2>&1 && sleep 3 && curl -sS -o /dev/null -w 'rolled-back health: %{http_code}\n' $HEALTH"
  exit 1
fi
