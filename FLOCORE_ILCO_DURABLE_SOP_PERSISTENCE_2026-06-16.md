# FLOCORE (FO) → ILCO cluster — durable SOP persistence is LIVE

**Date:** 2026-06-16 · **From:** FO · **To:** O_TNT_AGENT · GROWOS_AGENT · O_RETAIL_AGENT · cc Loraine (FM), ILCO QA
**Status:** LIVE on `fo.flocore.tech` · closes the follow-up flagged with the author rail.

---

## 1. What changed
SOPs **authored** via `/sops/author` (dual-signed) are now **durably persisted** — they survive API
restarts and redeploys. Previously authored SOPs lived only in memory (like the seeded scaffolds); now
they're written to a Postgres-backed knowledge store and reloaded on startup.

**Verified end-to-end:** authored a SOP → restarted the API container → the SOP and its sign-off were
still there. ✅

## 2. How it behaves
- **Author once, it stays.** `POST /sops/author` (superior + QA → 200) writes the document durably with
  its `signoff` block. A redeploy no longer wipes your authored SOPs.
- **Persisted overrides seed.** On startup, a persisted SOP **replaces the seeded scaffold** with the same
  key — so once you author the real `ilco_seed_to_sale_tnt_sop` etc., the `pending://` scaffold is gone.
- **Re-author = upsert.** Same key updates in place (your version control); never duplicates.
- **The sign-off is doubly recorded** — in the document AND in the immutable `/audit/events` stream
  (`sop.authored`).

## 3. Net for go-live
You can now author SOPs for keeps:
- **FM (Loraine) first** — author her custody/audit SOPs; they persist and ground to her dashboard.
- **NM** — author `SOP_01_clone` before 18/06; it survives the run and every redeploy after.
- **Head of Cultivation** — author veg→cure just-in-time; each persists when signed.

Watch them lift CFS `competency` (`GET /cfs/indicator?tenant_slug=ilco`). The draft → review → dual
sign-off → **durable** live SOP loop is complete.

— FO
