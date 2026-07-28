# WAVES.md — ILCO / Origin · wave → ticket board
`[ ]` todo · `[~]` in progress / partial · `[x]` done & verified live · `[!]` blocked
Last updated: 2026-07-26 · Branch `feat/flocore-sso-events`

---

## LANE A — Loraine (tnt-za cultivation)
- [x] **Phase 1 — kill T&H task flood.** 995 per-tray/day tasks → 6 per-room; generator fixed; backlog SKIPPED+audited; "Checklists" nav removed. *(deployed, verified)*
- [x] **Phase 2 — inventory module.** `/inventory`: 21 items, auto-balance, IN/OUT, chemical batch+expiry register, alerts, reason+audit edits. *(live, seed verified)*
- [x] **Chicken live count.** birds-left = placed − deaths − **catches**; per coop; card shows caught. *(verified live: Coop 4 = 2300−117−1800=383)*
- [ ] **Phase 3 — room-by-room + batch golden thread (~14d).** Click room → its own paperwork; batch # threads clone→dispatch. **BLOCKED on Loraine input:** Scouting + Defoliation log fields; auto-deduct-on-chemical-application OK?; remaining product photos. Build room shell + 2 rooms, prove, then roll. DoD: 2 rooms live + batch stamped end-to-end, signed off by Loraine.
- [ ] **Phase-2 follow-up:** wire chemical application in Activity Log → auto stock-OUT (pending Loraine's OK).

## LANE B — Origin POS (retail)
- [x] **Ilse owner onboarding.** `ilse@ilcofarming.co.za` owner, Potchefstroom, PIN 884422; install modal; login verified.
- [x] **Owner/approver stock access without override code.** approvalCode.js + stock-sheet.html; cashiers still gated. *(live)*
- [x] **Card reconciliation on cash-up.** Optional Speedpoint input → card variance → owner flag+email on mismatch. *(backend TEST 1 + headless UI verified; cashier can test on next real cash-up)*
- [x] **Mirror live POS → git** (`fe8737a`, 7 files). Deploy stays scp; git = record.
- [ ] **Deliver** ORIGIN-CASHUP-CARD-RECON PDF to cashier + owner.
- [!] **POS `123456` OTP bypass** authenticates ANY email in prod (`auth-otp.controller.js:288`). Fix ready (prod-gate, 2 min). **Flo-gated: "leave POS"** — revisit before more off-site owner devices.
- [ ] Strip credentials from tracked `NEXT-SESSION-POS.md` / `RECAP-2026-06-06.md` (FO flagged; Flo-gated).

## LANE C — FLOCORE integration
- [x] **Event emit LIVE** both modules (`/events/emit`, Bearer 200; NET-goods amounts).
- [x] **Feeding contract answered** to FO (ticket 65443fb3): endpoint `/api/feeding/records`, JWT+level2, schema, no idempotency today. Awaiting FO decision on machine-auth + externalId.
- [x] **Continuity docs** NEXT_SESSION.md + WAVES.md (this file).
- [~] **SSO** built, deployed dormant (`FLOCORE_SSO_ENABLED` off, PIN fallback).
- [!] **P0 — AI gateway reroute + delete Anthropic key.** BLOCKED by FO gate collision (`/ai/gateway` needs Basic AND Bearer in one header). `.env` 644→600 done; key not in git. Reroute mechanical once FO exempts the gate.
- [!] **W28 `/documents`** — same gate collision; unreachable from tenant.
- [ ] **Nursery emit** — 6 KPIs → `/iot/readings` (token in hand; may hit same gate — probe first).
- [!] **SSO flip** — needs FO to provision staff FLOCORE identities (loraine@/lou@/jen@/nm@/fm@/owners) + Flo's go.

## LANE E — 🔴 TRADE-READY: prove the farm→pharmacy pipeline (SAHPRA + SAPC) · ~2 weeks
Goal: demonstrate ONE batch flowing cultivation→processing→lab/COA→dispatch→pharmacy→Section-21 dispense, audit-clean, to the medicines regulator + pharmacy council. Live demo + compliance doc pack + on-site walk-through. Plan: `tnt-za/docs/ILCO-TRADE-READY-PLAN-2026-07-28.pdf`.
- [x] **E0a — FARM-SIDE PROOF RUN (DONE 28 Jul).** First batch→COA→dispatch ever on the live farm. Built the missing **harvest→batch link** (`POST /api/batches/from-harvest/:id`, golden thread), a **dispatch lab-gate** (no manifest without a released COA), a **validation-COA watermark**, and fixed a latent bug (QA was blocked from issuing COAs). Walked pilot **VAL-SL260316** (real completed harvest, 354.96 kg): batch → 4 processing weigh events → 8 lab results (sample, marked) → **watermarked COA PDF** (`/uploads/coa/VAL-SL260316.pdf`) → RELEASED → dispatch manifest. **22 audit rows hash-chained** (4466→4488). Deployed (health 200), committed `8e8162a`. Lab values are marked SAMPLE — decision B (run as marked validation) taken.
- [ ] **E0b — PHARMACY-SIDE dispense** (Origin POS, separate live system). Receive VAL-SL260316 + its COA into a POS branch (Batch record carries `labCertificateUrl`), then demonstrate a Section-21 gated dispense **via the already-gated online order flow** (NOT the live till — "leave POS"). Needs a clearly-marked proof patient + Section-21 doc on the live retail Mongo → **DECISION PENDING** (write proof patient/order to live POS, or hold). Known gap: dispensed line can't yet carry the farm batch#/COA (two disconnected stock systems).
- [ ] **E0 follow-ups (farm):** strain code "SL" should resolve to full strain name on the COA; add a "Create batch from harvest" button on the harvest UI (endpoint works; button = demo polish); no LAB_TECH user exists (lab result entered by Processing for the proof) — provision a lab-tech role holder for real ops.
- [ ] **E1 — Section-21 dispense flow** verified front-to-back on the POS (patient/doctor/pharmacist vetting → gated order → dispense record).
- [ ] **E2 — SOP gap fill** for the stages shown (only 3 SOPs live) so the demo's process steps have their SOP.
- [ ] **E3 — Live demo script** (batch walk + audit reproduce + RBAC per-role view). Dry-run end-to-end.
- [ ] **E4 — Compliance document pack** (SAHPRA section + SAPC section; capability→requirement map + pilot COA + audit extract). **Specialist-reviewed before issue.**
- [ ] **E5 — On-site walk-through** route (farm + shop, system-in-context). Leverages Loraine Phase-3 rooms (parked).
- [!] **E6 — Specialist sign-off** on ALL regulator-facing copy (medicines-law + pharmacy). Nothing goes to SAHPRA/SAPC without it. Also confirm: GMP application standing, pharmacy SAPC registration + pharmacist of record.
**DoD:** one batch's COA + Section-21 dispense demonstrable live; doc pack specialist-signed; demo rehearsed; date locked.

## LANE D — quality debt
- [ ] **Work-board audit (20 Jun)** open items: offline-UX "lies" + token-refresh (P0), .catch swallow + compliance-ticket dead-end (P1), optimistic updates (P2). Re-verify vs current code first (3+ weeks old).
