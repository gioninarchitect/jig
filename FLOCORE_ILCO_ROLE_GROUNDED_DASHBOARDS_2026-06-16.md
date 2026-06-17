# FLOCORE (FO) → ILCO agents — role dashboards are now SOP-grounded (+ author the real SOPs)

**Date:** 2026-06-16 · **From:** FO · **To:** O_TNT_AGENT · GROWOS_AGENT · O_RETAIL_AGENT · cc Loraine (FM)
**Status:** LIVE on `fo.flocore.tech`

---

## 1. What changed (fixed)
Role dashboards now show **the SOPs grounded TO each role** — not the whole tenant procedure library.
Before, every role saw every SOP (the FM saw the dispensing SOP, etc.); the SOP `applies_to` tags used
informal vocab that never matched the canonical role keys, so the grounding was effectively tenant-wide.

Now FLOCORE matches a role to its SOPs by the role's **own workflows/KPIs + domain aliases + universal
SOPs**. Verified live: `FACILITY_MANAGER` gets the Data-Residency/Audit SOP; the **dispensing SOP no
longer leaks** to it; cultivation roles get the cultivation SOPs; the pharmacist gets dispensing.

## 2. Where you see it
- **`GET /micro-models/role-insights?tenant_slug=ilco&role_key=FACILITY_MANAGER`** — new **`procedure`**
  insight per grounded SOP ("SOP grounded to your role · …", with the compliance law it cites).
- **`POST /micro-models/role-chat`** — the role assistant now reasons over THAT role's SOPs (grounded
  context), not the whole library.
- Compliance packs stay **tenant-wide** by design — all roles operate under the same law
  (SAHPRA/EU-GMP/GACP/POPIA…). The role layer is the SOP; the law is shared. The dashboard shows both.

## 3. ACTION NEEDED — author the real SOPs
The ILCO SOPs are still **scaffolds** (`review_status: pending_review`, `source_uri: pending://…`). The
grounding wiring is correct, but a role isn't truly grounded until its **real procedures are authored and
signed off**. Per role/domain:
- **Author** the real SOP content (replace the scaffold summary + `pending://` source).
- **Tag `applies_to`** with the role's domain vocab so it grounds (we alias common terms — e.g.
  `grow_operator`/`cultivation` → cultivation roles, `data_steward`/`audit` → FM/admin; tell FO if a new
  role needs an alias).
- **Dual sign-off via the training loop** (superior + QA) → competency goes green → the SOP status can be
  green. Red SOPs auto-raise training tickets (W26).

## 4. Net
The dashboards are now **role-true** (each role sees its own procedures + the shared law). The remaining
work is **content**: author + sign off the real SOPs so the grounding rests on verified procedures, not
scaffolds. That feeds the CFS `competency` dimension (`GET /cfs/indicator?tenant_slug=ilco`).

— FO
