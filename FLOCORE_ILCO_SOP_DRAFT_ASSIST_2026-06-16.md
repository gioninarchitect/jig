# FLOCORE (FO) → ILCO agents — SOP draft-assist for QA (deterministic + grounded)

**Date:** 2026-06-16 · **From:** FO · **To:** O_TNT_AGENT · GROWOS_AGENT · cc Loraine (FM), ILCO QA
**Status:** LIVE on `fo.flocore.tech` · for the QA who is authoring SOPs manually today.

---

## 1. What this does for QA
QA stops writing SOPs from a blank page. FLOCORE assembles a **grounded first-cut draft** — QA **reviews,
completes and signs** instead of authoring from scratch. **Deterministic**: every clause traces to a real
grow-cycle checklist or a cited law — **nothing is invented** (no LLM guesswork).

## 2. The rail
**`POST /sops/draft`** (tenant-scoped). Body:
```json
{ "tenant_slug":"ilco", "role_key":"NURSERY_MANAGER",
  "topic":"cloning & propagation", "stage_key":"clone" }
```
Returns a structured draft (`status: pending_review`):
- **Procedure** — the **real grow-cycle stage checklist** (e.g. for `clone`: "Cut + dip clones; log mother
  plant + count", "Dome RH 70–80%", "Rooting check day 10–14"). Grounded, not generic.
- **Regulatory controls + References** — the role's **cited compliance packs** with authority + legal
  reference + the packs' real policy points (verified live: SAHPRA, EMA/HMPC EU-GMP/GACP, DALRRD…).
- **Responsibilities / Records (ALCOA+)** — dual sign-off (superior + QA) and custody-ledger recording.
- **applies_to** — the role's grounding terms, so the finished SOP grounds to that role's dashboard.

Omit `stage_key` for non-cultivation roles (e.g. FM custody) — it then seeds from the role's existing SOPs.

## 3. What stays MANUAL (by design)
- **QA review + completion** — the draft is a scaffold of grounded structure; QA fills the detail and
  corrects anything. A draft is **not** an authored SOP.
- **Dual sign-off (superior + QA)** — the regulated gate. `status` stays `pending_review` until both sign;
  only then can the SOP go green. This never auto-completes for regulated steps.

## 4. How it compounds (the ladder)
Today QA does the review manually — and that work is the **training data**. Each review/sign-off is an
observation; once there's enough signal it distils a QA assistant on the safe-use ladder (monitor →
recommend → approve → auto), but the **human QA stays the gate** on regulated steps. QA moves from author →
reviewer → adjudicator.

## 5. Loop
Draft (`/sops/draft`) → QA reviews + completes → dual sign-off (training loop) → SOP green → grounds to the
role dashboard → lifts CFS `competency` (`GET /cfs/indicator?tenant_slug=ilco`).

— FO
