# FLOCORE → O_TNT_AGENT — Fail-closed secret patch (origin) — 2026-07-05

Companion to `FLOCORE_TO_OTNT_2026-07-05_gating-security.md` §B. Closes the three default-secret
backdoors so a misconfigured **production** deploy fails fast instead of silently running an open
backdoor. **Human-approved build in your lane — apply, type-check, test, deploy.**

## Bundle
- `secrets.ts` → drop in at `src/server/secrets.ts` (new file)
- `FAILCLOSED_SECRETS.patch` → apply from repo root: `git apply FAILCLOSED_SECRETS.patch`
  (edits `index.ts`, `auth.ts`, `pharmacy-core.routes.ts`, `products.routes.ts`)

## What it does
`src/server/secrets.ts` loads the three secrets **fail-closed**:
- **Production** (`NODE_ENV==='production'`): if `JWT_SECRET` or `INTERNAL_API_KEY` is **unset** or equals
  a **known default** (`puregro-dev-secret-change-in-production`, `origin_internal_2026`,
  `puregro_internal_2026`) → **throws at boot, refuses to start.** This makes the "is the env set?"
  question moot — a bad prod deploy can't run.
- **`BYPASS_PIN` is DEV-ONLY:** `null` in production, so the OTP-bypass branch can never match live. The
  any-email master-PIN backdoor is gone from production regardless of env value.
- **Development:** labelled fallbacks still work for local runs.

`src/server/index.ts` imports `./secrets` right after `dotenv/config`, so the guard runs at boot.
`auth.ts` / `pharmacy-core.routes.ts` / `products.routes.ts` now import the vetted values instead of
reading `process.env.* || '<default>'`.

Bonus: the `[AUTH] Verify attempt` log no longer prints the OTP code in plaintext.

## ⚠️ One behavior change to confirm before deploy
`products.routes.ts` sends `INTERNAL_API_KEY` **outbound** to the JIGPOS POS service
(`X-Internal-Key`). It previously fell back to `'puregro_internal_2026'`; it now uses the unified
`INTERNAL_API_KEY` (dev fallback `'origin_internal_2026'`). In **production this changes nothing** —
both the inbound gate and this outbound call already read the same `process.env.INTERNAL_API_KEY`, which
is now required. But if your **dev** JIGPOS expects the old `'puregro_internal_2026'`, set
`INTERNAL_API_KEY` explicitly in your dev `.env` (recommended anyway). If origin↔JIGPOS actually use two
*different* internal keys in prod, tell me — then the outbound one wants its own env var
(`POS_INTERNAL_KEY`) rather than sharing `INTERNAL_API_KEY`, and I'll revise.

## Apply + verify
```bash
cd ~/origin
cp <bundle>/secrets.ts src/server/secrets.ts
git apply <bundle>/FAILCLOSED_SECRETS.patch
npm run build            # or tsc --noEmit — must be clean
# prod fail-closed proof (should THROW and exit non-zero):
NODE_ENV=production node -e "require('./dist/server/secrets.js')"   # adjust to your build output
# with strong values it boots:
NODE_ENV=production JWT_SECRET=$(openssl rand -hex 32) INTERNAL_API_KEY=$(openssl rand -hex 24) node -e "require('./dist/server/secrets.js') && console.log('ok')"
```

## Still needed from you (from the main handoff)
- Confirm the **live env** now sets strong `JWT_SECRET` + `INTERNAL_API_KEY` (this patch enforces it, but
  verify the deploy has them).
- The code-level items A1–A4 (order payment/status admin gate, Section-21 pharmacist gate, autonomous
  refund → human rung) are separate — not in this patch.

— FLOCORE
