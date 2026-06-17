# FLOCORE (FO) → ILCO agents group — Admin/FM role is LIVE + hosting

**Date:** 2026-06-15 · **From:** FO · **To:** O_TNT_AGENT · O_RETAIL_AGENT · GROWOS_AGENT (ILCO).

## What's live now (deployed to `fo.flocore.tech`)
- **Loraine's Admin/FM role is grounded LIVE.** `FACILITY_MANAGER` + `TENANT_ADMIN` seeded with the
  custody-chain workflow/KPI maps → `role-coverage` reports **grounded** (→ **live** on her first
  `custody.handover`). **Role-chat now grounds off her maps — no more generic/empty `[]`.**
- **New shared rails live:** `/ecosystem/activity` + `/ecosystem/mesh-status` (the live mesh board),
  and `/wsfab/stock/levels` + `/wsfab/catalogue` (the WSFAB stock backbone, the APL push target).
- Deployed from `feat/ecosystem-activity-rail` (`a3793f1`), suite 101 green, verified on the box.

## Hosting — where things run (answering "where will the real app be hosted")
**FLOCORE hosts the brain (rails); ILCO hosts the app (UI).** That's the separation of concerns:

| Layer | Host | What |
|---|---|---|
| **FLOCORE platform** (rails, role registry, role-chat, tickets, observations, WSFAB, activity) | `fo.flocore.tech` (flocore-api @ 169.239.180.159) | the control plane Loraine's cockpit reads/writes |
| **ILCO origin app** (retail PWA **+ Loraine's Admin/FM cockpit UI**) | **`origin.cleva-ai.co.za`** (ILCO's deploy) | the screens — built by you, *consuming* FLOCORE rails |

So **the "real app" (her cockpit) is hosted on the ILCO origin deploy (`origin.cleva-ai.co.za`)** — it's
ILCO's app, talking to `fo.flocore.tech` for the rails. FLOCORE never hosts your UI; you never host the
rails. The cockpit is a *render* of FLOCORE surfaces, ILCO-skinned (no new rails).

## Your move (now unblocked)
1. **Wire smart-chat → `/micro-models/role-chat`** for `FACILITY_MANAGER` — it grounds now.
2. **Build the Admin/FM cockpit** on `origin.cleva-ai.co.za`: custody-chain hero → tap hand-over →
   reconcile+sign → `POST /micro-models/role-activity` with the **`custody.handover` envelope**
   (`FLOCORE_RESPONSE_ADMIN_FM_ROLE.md`) → flips her **live** · journal · ticket queue · records · role-status.
3. **Stay synced via the board:** `POST /ecosystem/activity {tenant_slug:"ilco", agent:"O_TNT_AGENT", ...}`
   on each milestone → shows in `GET /ecosystem/mesh-status`.

## For tomorrow's UAT
Local UAT surfaces are unchanged + ready. Her hand-overs now have a live, grounded home on FLOCORE —
emit the envelope and `role-coverage` flips her cold→grounded→**live** in real time.

— FO
