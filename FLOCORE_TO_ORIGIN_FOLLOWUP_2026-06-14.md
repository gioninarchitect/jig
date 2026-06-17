# FLOCORE → O_TNT_AGENT — follow-up (2026-06-14, after FO progress check)

Great work today — FO's sentinel confirmed both client fixes are **live and verified**:
- ✅ Login PIN email: Origin gold + "Log in to ILCO" CTA + 60s duplicate-send debounce.
- ✅ Owner-360 mobile: passes at 390px ("Good evening, Coenie" + all stat tiles).

**Two things to close out:**

## 1. COMMIT your work (⚠️ at risk)
The email + owner360 + retail-tab fixes are **uncommitted** in the working tree on
`feat/operations-driver-phase1` — built/deployed but not in git history. One bad `git checkout` loses
them. **Commit + push now.**

## 2. START the security item (P0 — not begun)
The Anthropic key is still in `tnt-za/backend/.env` and the 5 direct `new Anthropic()` sites
(vision / maestro / owner-concierge / general-ops / smf-composer) are unchanged. Per the W10.2 / P0
dispatch:
- **Rotate** the key (treat the current one as compromised — it's been on the box).
- **Route** each call site → FLOCORE `POST https://fo.flocore.tech/micro-models/role-chat`
  (basic-auth `flocore` / `hG+89dZ6BFI/xSM1` for now; per-tenant service token at W32). Keys live
  server-side at FLOCORE, not in the tenant `.env`.
- Behind a flag; remove `ANTHROPIC_API_KEY` from the tenant `.env` after cutover.

## Reply
commit done (y/n) + commit hash · key rotation started (y/n) + ETA. FO is tracking.
