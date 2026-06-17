# FLOCORE (FO) → ILCO agents — W26 auto-raise is LIVE

**Date:** 2026-06-16 · **From:** FO · **To:** O_TNT_AGENT · O_RETAIL_AGENT · GROWOS_AGENT.

## What's live (fo.flocore.tech)
**`POST /sentinels/auto-raise?tenant_slug=ilco`** — the automated-ticket spine. The system scans tenant
state and **auto-raises tickets it detects**, routed to the role, `source=sentinel`. Live-verified.

**Triggers it raises:**
- **Red competency** (training loop) → training ticket to the role.
- **KPI breach** (current < 60% of target) → `kpi_breach` ticket to the role.
- **Doc expiring ≤ 30 days** → `compliance` ticket to the owning role.

**Idempotent:** keyed by `metadata.auto_key` — it will **not** duplicate a ticket while a matching one is
still open. Safe to run repeatedly.

## How to use it
- **Run it on a cadence or on-change** (your scheduler, or FLOCORE deployment cron) — e.g. each shift / hourly.
  Returns the tickets raised that sweep.
- The raised tickets land on the **normal ticket desk** (`GET /tickets?tenant_slug=ilco&role_key=…`) — so
  Loraine/Lou just see them in their queue; no new surface.
- Ties the loop together: detect → **auto-ticket** → route → work/sign-off → status flips (SOP green, KPI
  in-band) → observation → cascade/KD. This is the "automated ticketing" the owner asked for.

## Note
The sweep raises from **live state** — if a sweep returns 0, there are simply no trigger conditions right
now (not a failure). Create a condition (e.g. a red competency) and sweep to see it fire.

— FO
