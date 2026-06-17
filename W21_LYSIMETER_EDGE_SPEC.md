# W21 — Lysimeter Edge Spec (affordable tier) · SCOPE

**Status:** scoping → build (device side, ILCO/GrowOS lane) · **Date:** 2026-06-16
**FLOCORE side:** LIVE — the IoT bridge ingests + steers (see §5). **This spec = the DEVICE contract.**
**Principle:** the edge **closes the irrigation control loop locally**; FLOCORE/GrowOS observe, steer, audit.
Never put the cloud in the irrigation trigger path.

---

## 1. What we're building
A substrate-weight (lysimeter) irrigation controller: a representative pot on a load cell triggers
irrigation by weight (dryback), and streams weight + runoff EC/pH to FLOCORE for crop-steering
intelligence. This is the W21 **affordable edge tier** (complements PRIVA/Aranet, doesn't replace them).

## 2. Bill of materials (per node)
| Component | Part | Notes |
|---|---|---|
| Load cell | ZEMIC L6G aluminium single-point, 50–100 kg | industrial-grade; far more stable than hobby cells |
| Amplifier | HX711 24-bit | standard load-cell ADC |
| Controller | ESP32 (Wi-Fi) | local loop + telemetry |
| Output | Relay → irrigator trigger input | dry-contact into the existing irrigator |
| Platform | Aluminium plate ~300 × 300 mm | one representative 7 L pot |
| (optional) | Inline runoff EC + pH probes | feeds the EC/pH balance loop (§5) |

Pro-tier alternative: the **Aranet slab-weight sensor** → same bridge, `source:"aranet"`.

## 3. Control loop (LOCAL — on the ESP32)
- Sample weight at ≥0.2 Hz; median-filter (reject footsteps/wind spikes).
- **Trigger:** when weight ≤ `irrigate_at_kg` → fire relay until weight ≥ `target_kg` (field capacity).
- **Setpoints are stage-aware** and supplied by GrowOS (veg = small dryback, flower = larger). Defaults
  live until GrowOS pushes them. The edge **enforces**; GrowOS/the micro-model **decide** the setpoint.
- **Fail-safe (non-negotiable):**
  - Network down → keep running the local loop on last-known setpoints (never block irrigation on cloud).
  - Sensor fault / out-of-range / no weight change after a shot → **hold relay, raise alarm**, fall back to
    a timed safety schedule; do not free-run the valve.
  - Max shot duration + max shots/hour hard caps (anti-flood).
- **Calibration:** tare empty platform; 2-point calibration with known masses; periodic re-tare;
  temperature-drift compensation. Log calibration as a custody-grade event.

## 4. Telemetry contract (edge → FLOCORE)
`POST https://fo.flocore.tech/iot/readings` (tenant-scoped bearer), one call per metric:
```json
{ "tenant_slug":"ilco", "source":"esp32", "device_id":"lys-flowerA-01",
  "site_id":"flower-room-A", "growth_stage":"flower_w3",
  "metric":"substrate_weight_kg", "value":3.42, "unit":"kg", "ts":"<ISO8601>" }
```
Metrics to post:
- **`substrate_weight_kg`** — every sample (or on change) → FLOCORE computes dryback % + `irrigate_now`.
- **`runoff_ec`**, **`runoff_ph`** — per irrigation/runoff event → FLOCORE balances the NEXT feed.
- **`feed_ec`**, **`feed_ph`** — the input feed reference (post when the recipe changes) → the balance baseline.
- `device_id` = the pot/node (so FLOCORE tracks field capacity per pot); `site_id` = the zone it represents.

## 5. What FLOCORE does with it (LIVE today)
- `substrate_weight_kg` → **dryback %** vs the stage max + `irrigate_now`; KPI `dryback_in_target_pct`;
  over-dry auto-raises a crop-steering ticket.
- `runoff_ec` rising above `feed_ec` (salts accumulating) → **`recommended_next_feed_ec`** (lower / flush)
  + `action`; KPI `runoff_ec_in_target_pct`. (Verified: feed 2.6, runoff 4.2 → next feed 2.4, flush.)
- `runoff_ph` drift → **`recommended_next_feed_ph`** (opposite direction); KPI `runoff_ph_in_target_pct`.
- All emit bottom-up observations (distillation signal) + ground to the irrigation SOP for the stage.

## 6. Closing the recommendation loop (optional pull)
The edge MAY pull FLOCORE's recommendation before mixing the next batch (read the last `/iot/readings`
result's `recommended_next_feed_ec/ph`), but application stays on the **safe-use ladder**:
monitor → recommend → **approve** (grower confirms) → **auto** (only once trusted). Never auto-dose
nutrients off a cloud value without the ladder.

## 7. Sampling discipline
One lysimeter speaks for a zone — make it representative: one per **strain × zone**, mid-canopy, away from
wind/edges/foot-traffic and irrigation lines. Record which `device_id` represents which `site_id` (custody-grade).

## 8. Non-goals
Not a full irrigation product · no cloud in the trigger path · no auto-dosing without the safe-use ladder ·
the edge never depends on FLOCORE to irrigate.

— FO
