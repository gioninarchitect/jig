# Role Activation — Gap Analysis
**ILCO TnT-ZA · 19 June 2026 (post-genesis)**

Covers the roles defined in the system, which are **activated** (have a live user), each one's **dashboard + nav scope**, and the **gaps** — including the processing line (flagged after today's processing meeting; meeting outcomes still need to feed in where noted).

---

## 1. Activated roles (12 of 24 defined) — live users

| Role | Level | User(s) | Dashboard | Nav scope | Status |
|---|---|---|---|---|---|
| SUPER_ADMIN | 5 | Floris, Devon, Flo | Owner 360 | everything | ✅ |
| TENANT_ADMIN | 4 | **Coenie**, **Ilse** | Owner 360 (→/owner) | everything | ✅ (Ilse = AR/DAR + chickens) |
| FACILITY_MANAGER | 3 | **Ray** | Full FM (sectioned) | everything | ✅ the real FM |
| FACILITY_SUPERVISOR | 3 | **Loraine** | Cultivation-only (fixed) | cultivation + Chickens, no owner views | ✅ Cultivation Supervisor |
| HEAD_OF_CULTIVATION | 3 | **Lou** (Lourens Eksteen) | Grow Focus | core+mgmt+cultivation+compliance | ✅ |
| NURSERY_MANAGER | 3 | **Edgar** (NM) | Clone-room focus | cultivation-only | ✅ |
| PROCESSING_MANAGER | 3 | **Jeanette Ferreira** | Processing (steps 9-14) | core+mgmt+processing+compliance | ✅ |
| CULTIVATOR | 2 | Cultivators (shared) | Cultivation-only | core+cultivation | ✅ |
| LAB_TECH | 2 | **Keke** | Lab Tech | core+processing+compliance | ⚠️ see gap §2.1 |
| SECURITY_OFFICER | 1 | **Sipho Dlamini** | *generic fallback* | core | ⚠️ no security dashboard |
| TRIMMER | 1 | **JR Botha** | *generic fallback* | core+processing | ⚠️ no trim dashboard §2.3 |
| VIEWER | 0 | SAHPRA Inspector | read-only | core | ✅ (inspector window) |

---

## 2. Gaps & mismatches

### 2.1 🔴 Keke is QA, seeded as LAB_TECH
Per the SMF roster Keke is **QA**, but her live user is `LAB_TECH`. Consequence: she lands on the Lab-Tech dashboard, **not** the QA Inspector dashboard, and the **QA_INSPECTOR** role (which has a full dashboard + QA-sign-off + deviation-approval nav) has **no user**. 
→ **Fix:** change Keke's role `LAB_TECH → QA_INSPECTOR`. (One-line user update; confirm before changing live.)

### 2.2 🔴 No Responsible Pharmacist user
`RESPONSIBLE_PHARMACIST` (Berne Swart per SMF) has a built dashboard (release queue, SMF/QMS evidence, S21), QMS **RP close-off**, and is the final sign-off in the deviation chain — but **no user exists**. Today QA-approved deviations have **no one to close them off**, and batch release has no RP. 
→ **Fix:** seed Berne Swart as `RESPONSIBLE_PHARMACIST`.

### 2.3 🟠 Processing line — incomplete (feed in today's meeting)
- **JR Botha** = `TRIMMER` (level 1) → falls to the **generic** dashboard, not a trim/processing one. Needs a trim-session-focused view.
- **No `PROCESSING_SUPERVISOR`** user — the supervisor tier between Jeanette (PM) and JR (trimmer) is empty; its nav scope (core+processing) and floor oversight are unused.
- Processing roles present: PROCESSING_MANAGER (Jeanette) ✅. Missing the supervisor + a proper trimmer dashboard.
→ **Action:** map today's processing-meeting outcomes to: who is PROCESSING_SUPERVISOR, what JR/trimmers must see/do, and whether the 9-14 step flow (wet receiving → drying → debuc → trim → cure → store/QA) needs role-specific screens. **(I need the meeting notes to fill this precisely.)**

### 2.4 🟠 Support roles with no user / no dashboard
- `MAINTENANCE_MANAGER` — built dashboard, **no user**.
- `IT_MANAGER` — Calvin Green per SMF — **no user**, no dedicated dashboard (generic).
- `GMP_PARTNER` — built dashboard, **no user** (external GMP auditor — seed when engaged).
- `SECURITY_OFFICER` (Sipho) — **no security-specific dashboard** (entry/exit logs, patrols); lands on generic.

### 2.5 ✅ Resolved today
- Ray (full FM) vs Loraine (Cultivation Supervisor) — separated; Loraine cultivation+chickens only, no owner views.
- Cultivator + NM — cultivation-only confirmed.

---

## 3. Roles defined but NOT activated (12)
`PROCESSING_SUPERVISOR`, `QA_INSPECTOR`*, `GMP_PARTNER`, `MAINTENANCE_MANAGER`, `IT_MANAGER`, `RESPONSIBLE_PHARMACIST`*, `IRRIGATION_TECH`, `DELIVERY_DRIVER`, `GENERAL_WORKER`, `HOUSEKEEPING`, `LAUNDRY`, `CLIENT`.
(*= has a dashboard built + is needed now, per §2.)

---

## 4. Recommended actions (priority order)
1. **Keke → QA_INSPECTOR** (role fix) — unblocks the QA dashboard + deviation approval.
2. **Seed Berne Swart → RESPONSIBLE_PHARMACIST** — unblocks deviation close-off + release.
3. **Processing**: confirm PROCESSING_SUPERVISOR + give TRIMMER (JR) a real dashboard — pending meeting notes.
4. Seed Calvin Green → IT_MANAGER (facility IT support).
5. Security dashboard for Sipho (entry/exit logs, patrol checklists) — when prioritised.

> All role changes touch **live users** — I'll confirm each before applying. Dashboard builds (trim, security) are net-new screens — scope per need.
