# Wave Worksheet — Compliance Spine · Forms · Evidence · Resilience

**Updated:** 2026-06-10. **Deploy-ready rule:** a task is ✅ only when built → verified → shipped via `deploy-safe.sh` (health 200, confirmed on live) — not when it merely compiles.

Status key: ✅ **SHIPPED** (live, verified) · 🟡 **READY** (built+compiles, not deployed) · ⬜ **PENDING** (not started)

---

## WAVE 7 — Compliance Integrity (the sign-off spine)
| # | Task | Status | Evidence |
|---|------|--------|----------|
| 7.1 | Sign-off rail-guard on compliance ticket close | ✅ SHIPPED | live: closing a QMS_GOVERNANCE ticket w/o sign-off → blocked, stays OPEN. commit 4f6a1fe |
| 7.2 | SLA escalation on the Driver heartbeat | ✅ SHIPPED | live: 14 stale tickets → CRITICAL. (+tenant-split fix). commit 2d76bf2 |
| 7.3 | Competency gate — block re-sign until remedial done | ⬜ PENDING | pairs w/ 7.1 + training loop; needs work→SOP link (cleaner after W8) |
| 7.4 | Audit-log every close / sign-off / reopen | ⬜ PENDING | next up — uses audit.service, verifiable via /audit |

## WAVE 8 — Forms real & timed
| # | Task | Status | Evidence |
|---|------|--------|----------|
| 8.1 | Load real cultivation forms as recurring TaskTemplates | ⬜ PENDING | source: docs/cultivation-forms-digitization.md (17 forms) |
| 8.2 | Connector fires the actual due form (not generic ticket) | ⬜ PENDING | blocked by 8.1 |
| 8.3 | Mortality form — Weight + Batch # + Plant Tag ID + zone | ⬜ PENDING | additive schema; standalone — anti-diversion |
| 8.4 | Cloning Schedule screen (forms K/L) | ⬜ PENDING | the one missing screen |

## WAVE 9 — Evidence graph (inspection pack)
| # | Task | Status | Evidence |
|---|------|--------|----------|
| 9.1 | Wire ComplianceControl — forms → cited EU-GMP evidence | ⬜ PENDING | ComplianceControl currently 0 rows; blocked by 8.1 |
| 9.2 | Inspection-pack readout per EU-GMP source | ⬜ PENDING | blocked by 7.1 + 9.1 |

## WAVE 10 — Enterprise Resilience & Hardening
| # | Task | Status | Evidence |
|---|------|--------|----------|
| 10.1 | Data-integrity self-check (orphan-tenant detector) | ✅ SHIPPED | live: `[integrity] boot/tick OK — 42 tenant tables, no orphans`. commit 33547f5 |
| 10.2 | Tenant-resilient automation (derive tenants from data) | ✅ SHIPPED | live: driver loops data-derived set, upserted=18. commit 2f48506 |
| 10.3 | Silent-failure / empty-queue health signals | ⬜ PENDING | |
| 10.4 | Scheduled DB backups + retention + restore test | ⬜ PENDING | ops/cron task |
| 10.5 | Monitoring & alerting (/health/full) | ⬜ PENDING | would surface a tenant split early |
| 10.6 | Post-deploy smoke test in deploy-safe.sh | ⬜ PENDING | |

---

## Scoreboard
- **Shipped live:** 7.1 · 7.2 · 10.1 · 10.2  (+ earlier: training guides, email, calendar→ticket connector, Operations Driver, remedial-training loop)
- **Pending:** 7.3 · 7.4 · 8.1–8.4 · 9.1–9.2 · 10.3–10.6
- **Origin POS (separate module, live):** day-close guard ✅ · tab-jump fix ✅ · Ray report ✅

**Deploy mechanism:** `tnt-za/deploy-safe.sh` (build → backup → additive db push, no data-loss → restart → health check → auto-rollback). Live boxes are NOT git; dist is the artifact.
