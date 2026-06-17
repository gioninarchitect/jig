# W21 — PRIVA Connector Integration Spec (pro tier) · the API contract

**Status:** scoping → build (device/edge side, tnt-za/GrowOS lane) · **Date:** 2026-06-17
**FLOCORE side:** bridge ingests + steers (LIVE; leaf-VPD + CO2 being added — see §4). **This = the connector contract.**
**Principle:** PRIVA owns climate **control**; FLOCORE **observes + steers (recommend-only)** + grounds + audits.
Never put FLOCORE in PRIVA's control loop — regulated (SAHPRA/EU-GMP). Readings up, insight/compliance down.

---

## 1. Hardware
- **PRIVA** climate computer + **board 3770610** ("Measuring box Temperature/Humidity", 24VAC) + **IR leaf-temp** sensors. CO2 + PPFD where fitted.
- Site: ILCO greenhouse(s) under the one Facility. Tenant `ilco`, module `ilco-tnt`.

## 2. Read path (PRIVA → connector) — **CONNEXT API (confirmed available)**
Site has the **PRIVA Connext API** (REST/JSON) — use it (clean, no Modbus scraping). The connector:
1. **Authenticates** to the Connext API (site credentials — GrowOS holds them on site).
2. **Reads the measurement data points** on a cadence (≈60s climate; faster for fast-moving signals):
   air temp, RH, **IR leaf temp**, CO2, PAR/PPFD (+ any others fitted on board 3770610).
3. **Normalises** each to the FLOCORE reading shape (§3) and posts.
A small **connector service** (Pi/edge) runs the poll loop. (Modbus TCP / BACnet remain fallbacks only if a
data point isn't exposed via Connext.)

## 3. Telemetry contract (connector → FLOCORE)
`POST https://fo.flocore.tech/iot/readings` (tenant-scoped), one call per metric:
```json
{ "tenant_slug":"ilco", "source":"priva", "site_id":"flower-room-1", "device_id":"priva-board-3770610",
  "growth_stage":"flower_w3", "metric":"temp_c", "value":26.0, "unit":"C", "ts":"<ISO8601>" }
```
Metrics to post (FLOCORE derives the KPIs):
| PRIVA signal | metric | FLOCORE derives |
|---|---|---|
| Air temperature | `temp_c` | VPD (with RH) → `vpd_in_range_pct` |
| Relative humidity | `rh_pct` | VPD |
| IR leaf temperature | `leaf_temp_c` | **leaf-VPD** (with RH + air temp) → `leaf_vpd_in_range_pct` |
| CO2 | `co2_ppm` | **CO2 in-band** → `co2_in_target_pct` |
| Light (PAR) | `ppfd` | DLI vs stage target → `dli_attainment_pct` |
| (optional direct) | `vpd_kpa` / `dli` | used as-is |

`growth_stage` selects the stage band (Veg W1–2 … Flower W1–8). `source:"priva"` is preserved through the
event + observation (PRIVA-first tag shown on the cockpit charts).

## 4. What FLOCORE does (rail — LIVE / extending)
- temp+RH→**VPD**, PPFD→**DLI** vs the stage band → cultivation KPIs (LIVE).
- **leaf_temp+RH→leaf-VPD**, **co2_ppm→CO2 band** → KPIs (being added this session).
- Out-of-band → auto-raises a deduped crop-steering ticket (W26) to the role.
- Feeds **stage-aware steering** (Playbook §8: DLI → VPD → humidity → temp → irrigation) — **recommend-only**,
  human-validated; never auto-actuates PRIVA.
- All readings stream as bottom-up **observations** → ground HEAD_OF_CULTIVATION / CULTIVATOR / IRRIGATION_TECH
  micro-models + the greenermore (Lou) cockpit.

## 5. Irrigator (pairs with this)
The lysimeter/irrigator edge (`W21_LYSIMETER_EDGE_SPEC`) handles substrate-weight→dryback + runoff EC/pH→
next-feed balance. PRIVA (climate) + lysimeter (root-zone) together give full stage-aware crop steering.

## 6. Boundaries
- **Recommend-only** into a regulated process; PRIVA stays the controller. No cloud in the control loop.
- Regulated data **SA-resident + append-only audit**. Per-(tenant×customer) silo.
- Connector reads PRIVA; FLOCORE never writes PRIVA setpoints (until/unless an explicit, gated, human-approved
  step is agreed — same safe-use ladder as everything else).

## 7. Build / report
tnt-za/GrowOS agents build the connector against §2–§3 and post a first live reading per metric so we prove the
round-trip (reading → VPD/DLI/CO2/leaf-VPD → KPI moves off zero → observation). Report back to FO.

— FO
