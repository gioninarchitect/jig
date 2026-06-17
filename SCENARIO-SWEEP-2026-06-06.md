# Scenario & Edge-Case Sweep — everything built 2026-06-06

Legend: **✓ covered** · **⚠ GAP (needs build/decision)** · **? VERIFY (unconfirmed)** · **▣ logged as task**

---

## 1. Takings Report (`salesreport.buildRange`)
| Scenario | Status |
|---|---|
| SAST day boundaries (from/to inclusive) | ✓ `T00:00:00+02:00` / `T23:59:59.999+02:00` |
| Exclude pre-launch test sales | ✓ `isTest:{$ne:true}` |
| Voided/refunded separated from takings | ✓ separate bucket |
| Branch scoping with bad id | ✓ `oid()` guards |
| Float amounts (R9.999…) | ✓ `r2()` rounding on outputs |
| **Split/multi-payment sale** (byMethod vs total) | ⚠ `byMethod` sums each `payments[].amount`; `total` uses `totalAmount`. If a sale has multiple payments they can diverge from the per-method split. Today all sales are single-payment, so latent. |
| Completed sale with **empty `payments[]`** | ⚠ counts in `total`, contributes nothing to `byMethod` → method split < total. Rare. |
| Very large date range (perf) | ? loads all matching sales into memory; fine at 26 sales, watch at scale |
| Email send failure | ✓ `sendEmail` throws → `emailRange` returns 500 → UI shows error (not swallowed). SMTP working (May 535s were old). |
| Invalid / empty recipients | ✓ `EMAIL_RE` filter + 400 on empty |

## 2. Float / day-end (`pos-shifts.js`, `day-end.js`, `closeTill`)
| Scenario | Status |
|---|---|
| Empty float field | ✓ defaults R0 (no phantom R500) |
| Store that *wants* a float | ✓ must type it (intended) |
| Variance > R50 | ✓ in-page manager-PIN override modal (kiosk-safe) |
| Empty denominations → NaN actualCash | ✓ "count the till first" guard |
| **Close succeeds but no clear confirmation** | ⚠▣ #50 — the incident; looked like "nothing happened" |
| **Sale rung up after close** (no open session) | ⚠▣ #50 — createSale doesn't require an open till |
| **Day-end with no open shift** | ⚠▣ #50 — submit silently does nothing; needs "No open shift" message |
| Re-open a wrongly-closed session | ⚠ manual DB only; no UI |

## 3. Branch inventory / `createProduct`
| Scenario | Status |
|---|---|
| New product invisible on branch till | ✓ auto-creates `branchinventories` row |
| Sale stock deduction | ✓ hits `Product.inventory.quantity` (grid source) |
| **`{name:{$not:/online/i}}` branch filter** | ⚠ a future branch with "online" in its name (e.g. "Online Pharmacy") is wrongly skipped → its products get no inventory row. Use an explicit flag, not a name regex. |
| New product seeds into **pending** branches too | ⚠ minor — pending/inactive branch gets rows; harmless (branch inactive) |
| Product at qty 0 hidden from till | ✓ expected (grid `qty>0`); shows on stock sheet |
| Slug E11000 collision | ✓ unique slug set |

## 4. Onboarding + activation
| Scenario | Status |
|---|---|
| Non-admin runs wizard | ✓ `ONBOARD_ROLES` gate (branch_assistant denied) |
| **Pending RP logs in before activation** | ✓ `verify-pin` rejects `isActive:false` (403) — gate holds |
| Activation seeds catalogue | ✓ all active products @ qty 0 into new branch |
| Approve twice (re-activate) | ✓ idempotent upsert |
| **Reject then re-submit** | ⚠ creates a NEW branch — no dedup on outlet name → duplicate branches |
| **Existing RP email onboarded to new branch** | ⚠ reuses user but keeps their old role/primaryBranch (doesn't re-point) |
| Doc upload > 10 MB | ⚠ multer limit errors; not surfaced gracefully in UI |
| Doc file type | ⚠ no restriction (any file accepted as a "document") |
| Branch code collision | ? `PREFIX + last-6-of-ms` — low odds, possible on same-ms double submit |
| Docs viewable in review screen | ✓ stored at `/var/www/origin/uploads/onboarding/` → nginx `/uploads/` |
| Local preview (file://) | ✓ PREVIEW mode mocks submit; real gate only on server |

## 5. Reports button / SW / brand assets
| Scenario | Status |
|---|---|
| Reports button visibility | ✓ same gate as stock (managers/owner) |
| SW cache refresh | ✓ v58 forces fresh assets; network-first for .html/.js |
| Brand docs (design system, icons, Botanica, status report) | ✓ static; Botanica regulatory copy VERIFY-flagged |

## 6. FLOCORE / orchestrator / module agents
| Scenario | Status |
|---|---|
| Integration replies | ✓ both written, grounded |
| **D1 auth model** | ⚠ owner decision |
| **D2 security sign-off owner** | ⚠ owner decision |
| Module agents step on each other | ✓ boundary rules in each agent def |
| Live wiring | ? awaits FLOCORE deploy brief (ports, service token, event envelope) |

## 7. Feedback assistant skill / specs
| Scenario | Status |
|---|---|
| Skill applies to other stacks | ✓ MERN/Prisma notes; baseline test showed it fixes the "skip AI triage" failure |
| LLM returns bad JSON | ⚠ spec says "validate the JSON" — implementation must enforce |
| Academy/bug-assistant = specs only | ✓ not built yet (#52/#53) |

---

## Genuine gaps worth a decision (not yet logged separately)
1. **`/online/` branch regex** in `createProduct` + `onboarding.approve` — replace with an explicit `isOnline`/type flag so a future "online"-named branch isn't skipped.
2. **Reject-then-resubmit makes duplicate branches** — add dedup (warn on existing outlet name / reuse the rejected branch).
3. **Report split-payment** byMethod-vs-total divergence — reconcile if/when split tenders go live.
4. **Onboarding doc gate** — restrict file types + surface the 10 MB limit; consider required-doc completeness server-side (currently client-enforced).

Everything else is either ✓ covered or ▣ already logged (#50 day-end).
