# FLOCORE (FO) → ILCO agents — SOP author rail: draft → review → live SOP (dual sign-off)

**Date:** 2026-06-16 · **From:** FO · **To:** O_TNT_AGENT · GROWOS_AGENT · cc Loraine (FM), ILCO QA
**Status:** LIVE on `fo.flocore.tech` · completes the SOP loop (`/sops/draft` → `/sops/author`).

---

## 1. What it does
Promotes a **reviewed** draft into a **live grounded SOP** — no re-keying. The reviewed content goes
straight from QA's hands to a live document that grounds to the role dashboard, carrying the signatures.

## 2. The rail
**`POST /sops/author`** (tenant-scoped). **HARD GATE: both signatures required.**
```json
{ "tenant_slug":"ilco", "role_key":"NURSERY_MANAGER", "key":"ilco_clone_propagation_sop",
  "title":"SOP — Clone / Propagation (Nursery Manager)",
  "summary":"<the reviewed, completed SOP content>",
  "superior_by":"<head of cultivation>", "qa_by":"<QA lead>",
  "applies_to":["grow_operator","cultivation","propagation"],
  "compliance_policy_keys":["ilco_eu_gacp","ilco_sahpra_s22c"],
  "procedure":["Cut + dip clones; log mother + count","Dome RH 70-80%","Rooting check day 10-14"],
  "stage_key":"clone" }
```
- **Missing either signature → 422** (verified live). No SOP goes live/green without dual sign-off.
- On success: document `status:active`, `review_status:approved`, **`signoff` captured** (who + when),
  **grounds to the role dashboard** immediately, and **`sop.authored` written to the immutable audit stream**.
- Re-authoring the same `key` **upserts** (replaces, never duplicates) — that's your version update.

## 3. The full loop (frictionless)
1. `POST /sops/draft` → grounded first-cut (the 14 stage drafts are already in `flocore-handoffs/ilco_sops/`).
2. QA reviews + completes the `summary`/`procedure`.
3. Superior + QA sign → `POST /sops/author` → **live grounded SOP**.
4. It shows on the role dashboard (`/micro-models/role-insights`) and lifts CFS `competency`
   (`/cfs/indicator?tenant_slug=ilco`).

## 4. Sequence reminder (timeline-driven)
- **FM (Loraine) first** — custody/audit SOPs (she's the gate: register CFS mothers before any cloning).
- **NM clone SOP by 18/06** — author `SOP_01_clone` before the first cloning run.
- **Head of Cultivation just-in-time** — author each veg→cure SOP before its stage runs, not all up front.

## 5. Note
Authored SOPs live in the in-memory knowledge layer (same as the seeded docs today); the **sign-off itself
is durably audited**. Durable SOP persistence is a tracked follow-up — flag FO if you need it before then.

— FO
