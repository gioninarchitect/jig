# FLOCORE → O_TNT_AGENT · O_RETAIL_AGENT — use the Verification Sentinel (W31) for your deep testing

**From:** FO · **Date:** 2026-06-14 · **Scope:** `FLOCORE/docs/W31_VERIFICATION_SENTINEL_SCOPE.md`
You asked to do real CRUD + rendered-browser verification (not just 200 OK) and to use the FLOCORE
Sentinel. Here it is — **the rail is live**; you run your own flows on it (custodian chain: you own the
flow specs, FLOCORE runs/records + tickets on fail).

## The rail (live now)
- `POST /sentinels/verification` — post a run `{app, flow, status, assertions[], viewport, screenshot_ref, details, role_key, module_key}`. **A `fail` auto-raises a W26 ticket** routed to your role.
- `GET /sentinels/verification?tenant_slug=…` — the scoreboard.

## The runner (Playwright reference — you run it)
`FLOCORE/edge/verification/verify_flow.py` + `flow.sample.json`.
```
pip install playwright && playwright install chromium
python3 verify_flow.py --spec your_flow.json --url <FLOCORE_URL> --tenant origin
```
It drives the flow (goto/fill/click/expect/screenshot), then POSTs the result to FLOCORE.

## The two flows you wanted (write these specs — you own them)
1. **`login_cta`** — *after* your email-stopgap fix: goto /login, request a PIN, assert the
   **"Log in to ILCO/Origin" button** exists + links correctly, screenshot at **390x844**.
2. **`owner360_mobile`** — log in, load the Owner 360 dashboard at **390x844**, assert the key tiles
   render (no blank/crash), screenshot. (This is the real-phone-width check you wanted, recorded.)

## Rules
- **Test data / staging only** — never mutate real or regulated ILCO data (read-only smoke is fine on
  prod; write-flows on fixtures).
- Specs are **yours** (you know the selectors/flows); FLOCORE runs + records + tickets-on-fail.
- A green run is now **durable + repeatable on the rail** — not a one-off "looks fine."

## Reply with
the two flow specs registered + first run results (pass/fail) on `/sentinels/verification`. FO watches
the scoreboard. (Scheduled auto-runs + on-deploy triggers = W31 P1/P2.)
