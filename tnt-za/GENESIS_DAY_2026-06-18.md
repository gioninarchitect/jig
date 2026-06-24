# Genesis Day — End of Day Summary
**ILCO TnT-ZA · Thursday 18 June 2026**

On-site cloning genesis go-live + farm-team (NM Edgar) onboarding. Live site: https://tntilco.cleva-ai.co.za · live bundle at EOD: `index-CT4SY9M-.js`

---

## What shipped & is live (verified green)

| Area | What changed |
|---|---|
| **Tickets** | NM create-form rebuilt as tap **pills** (no dropdowns); context-filtered category, coloured priority, one-tap "Send to" department |
| **Photos** | Tray photo/video upload now **persists + serves** (was 404 — nginx served `/var/www/tnt-za/uploads` but multer wrote to `…/backend/uploads`; symlinked) |
| **Nursery** | New **Racks view** — trays sit in racks (1 tray = 126 cuttings), tap → tray detail |
| **Mother Room** | New **Map view** — pots coloured by strain, status-ringed (green active / amber stressed / red+💀 culled), tap → mother detail; default back to **cards** with Map as a toggle CTA |
| **Trays** | **Status editable** via pills (fixed the stuck-ROOTED Day-0 tray); **ILCO tray-code** auto-assembles `SL-M10-21/01-T3-18/06`, count (126) stored separately, editable |
| **Mothers** | Codes normalised to `SL-M7 · 14/10` (derived from number + inception date, survives raw-text typos); strain-colour bug fixed (BC pots rendered black — `hsl()` can't take alpha suffix → now hex) |
| **Checklists** | Dynamic — live progress bar, "✓ all done" sweep, per-item Done/Issue/N-A + issue notes, auto Date/Initials fields, **edit-after-complete** |
| **Deviations** | A burst collapses into ONE bell entry → Quality Management (investigation → QA approve → RP close-off flow already there) |
| **Dashboards** | Cultivator + **Loraine (Cultivation Supervisor)** scoped to cultivation only; Loraine keeps Chickens, loses owner views |
| **UX** | Auto **scroll-to-top** on every navigation; **Plants** removed everywhere (nav + route redirects to /dashboard) |
| **Owner Concierge** | 504 fixed — nginx `/api` `proxy_read_timeout` 30s → **180s** (+ `proxy_send_timeout` 180s). One Opus 4.7 call w/ adaptive thinking runs 60–120s |

## Roles at EOD

- **Ray** = `FACILITY_MANAGER` — full facility view (unchanged)
- **Loraine** = `FACILITY_SUPERVISOR` — Cultivation Supervisor: cultivation suite + Chickens (she runs the chicken farm), **no** Owner 360 / Facility 360 / Task Board / processing / compliance dept
- **Cultivator** = cultivation only (operational, level 2)
- **Edgar / NM** = cultivation only (see below)

## Deferred to tomorrow (tracked)

- **FLOCORE custody emission** (the 19th) — the app emits nothing to the FLOCORE rails, so FLOCORE is blind to the genesis tray. Today the in-app append-only SHA-256 AuditLog chain holds it. When O_TNT wires the emission, the tray arrives carrying its own `trayNumber` (new format and all) and FLOCORE aligns the schedule batch_id, genealogy and custody chain automatically. Pair the gateway reroute with gemma `keep_alive` (cold-load alone = 30s).
- **Owner Concierge → async** (task #120) — `POST /concierge/brief` → `job_id` → poll/SSE, so no 2-minute synchronous request.

## Watch items (need owner/Loraine login to confirm)

1. Owner 360 → **Generate brief** should complete now (~60–120s), not 504.
2. **Loraine login** → cultivation + Chickens, **no** Owner/Facility 360.

## Key facts / gotchas captured

- **CT-2026-001** = genesis tray, NOT renamed (still that ID in DB): SL, mother SL-007 (est 14/10/2025), 126 cuttings, ROOTING. New-format equivalent would be `SL-M7-14/10-T1-18/06`.
- **New tray format**: `{STRAIN}-M{motherNo}-{motherEstDate ddmm}-T{trayNo}-{cloneDate ddmm}`. M = offspring index; mother line = M0, offspring from M1.
- 193 mother records had inconsistent identifiers (repeated numbers across date-cohorts, ~6 malformed) — chose **display-reformat only** (non-destructive); no live renumber.
- Deploy pattern: `npm run build` → tar dist → scp tr-api → rm live `index-*` assets → extract into `/var/www/tnt-za/frontend/dist` → verify live bundle hash.

---

# What Edgar (NM) can see

**Navigation (his lane only):**

- **Core** — My Shift · Tickets · Checklists · Scan & Tag
- Dashboard
- **Cultivation** — BayGrid · Grow Calendar · Mothers · Cloning · Strains · Daily Check · Env Log · Activity Log · IPM Scouting · Cleaning · Mortality

**His dashboard:** cultivation-only — quick actions (My Shift / BayGrid / Mothers / Tickets), his clone trays, tasks due, his tickets, activity feed, his notification bell. No facility-wide banners, no owner KPIs.

**Hidden from him:** Owner 360 · Facility 360 · Chickens · Task Board · all Processing (Batches / Trim / Lab / Dispatch) · Compliance dept (QMS / QA Sign-off / SOP Library / GMP Audit) · System (Assets / HR / Users / Security) · weight-variance alerts.

So Edgar opens straight into his cultivation workspace and never sees owner or other-department surfaces.

---

*EOD smoke check: site health green; NM endpoints all 200 (tickets, mothers, clone-trays, baygrid, tasks, strains, notifications, users); concierge route 401 not 504; uploaded media serves 200; genesis tray intact; nginx timeout 180s confirmed on disk.*
