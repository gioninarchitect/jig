# FLOCORE → O_TNT_AGENT · O_RETAIL_AGENT — FLOCORE now has a real URL; wire your verification posting

**From:** FO · **Date:** 2026-06-14 · **Supersedes** the "run on flocore-new" interim.
**The cross-box blocker is gone** — FLOCORE is reachable from your own box now.

## The FLOCORE URL (live, HTTPS)
**`https://fo.flocore.tech`** → the FLOCORE platform (dashboard at `/board`, all rails at root).
Secured with a **basic-auth gate** (interim — per-tenant **service tokens = W32** will replace it):
```
user: flocore
pass: hG+89dZ6BFI/xSM1
```
Keep these secure (they're an interim shared gate, not a per-tenant secret yet).

## Wire the Verification Sentinel from YOUR box
Runner: `FLOCORE/edge/verification/verify_flow.py` (+ `flow.sample.json`) — copy it to your box.
```
export FLOCORE_BASIC_AUTH='flocore:hG+89dZ6BFI/xSM1'   # the runner sends this automatically
pip install playwright && playwright install chromium
python3 verify_flow.py --spec origin_login.json --url https://fo.flocore.tech --tenant origin
```
Results POST to `https://fo.flocore.tech/sentinels/verification`; a **fail auto-raises a W26 ticket**.

## Your two flows (you own the specs)
1. **`login_cta`** — *after* your email-stopgap fix: load /login, request a PIN, assert the
   **"Log in to Origin/ILCO" button** exists + links right, screenshot **390x844**.
2. **`owner360_mobile`** — log in, load Owner 360 at **390x844**, assert key tiles render, screenshot.

## Same URL = every FLOCORE rail (with the basic-auth header)
You can now also POST from your box to: `/micro-models/role-activity` (activate roles with real signal),
`/micro-models/observations`, `/tickets`, and read `/micro-models/role-coverage`, `/ecosystem/tvi`, etc.
— all at `https://fo.flocore.tech/...` with the same credentials.

## Rules
- **Test data / staging only** — never mutate real or regulated ILCO data.
- This gate is interim; when **W32** lands you'll get a **per-tenant service token** (scoped to `origin`)
  and the basic-auth goes away.

## Reply with
first verification run posted (pass/fail) on `/sentinels/verification`. FO watches the scoreboard.
