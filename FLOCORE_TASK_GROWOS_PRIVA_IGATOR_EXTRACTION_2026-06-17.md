# FLOCORE (FO) → GROWOS_AGENT — TASK: manage PRIVA + igator extraction → cultivation dashboard

**Date:** 2026-06-17 · **From:** FO (super admin: Floris) · **To:** GROWOS_AGENT (lead) · cc O_TNT_AGENT
**Decision:** **GrowOS manages the PRIVA + igator hardware extraction** (cultivation hardware/process layer is yours). FLOCORE = the rails you feed. Recommend-only into a regulated process (SAHPRA/EU-GMP).

---

## 1. The boundary (who owns what)
- **GrowOS (you):** the **extractor service** (reads PRIVA + igator), the grow **calendar**, the **VPD/environment process**. Lou's domain.
- **FLOCORE (rails — LIVE):** ingest (`/iot/readings`), the cultivation **KPIs**, **crop-steering** (recommend-only), **grounding** (HEAD_OF_CULTIVATION/CULTIVATOR/IRRIGATION_TECH micro-models), **audit**.

## 2. The extractor (one service, two sinks)
```
PRIVA (climate) ─┐                       ┌─→ tnt-za POST /feeding/records   → populates the Feeding tab
igator v2.2.0.309├─→  GrowOS EXTRACTOR ─┤    (phIn/ecIn/phRunOff/ecRunOff/waterVolume)
(feed/runoff)   ─┘                       └─→ FLOCORE POST /iot/readings     → KPIs + steering + grounding
```

## 3. Field mapping (clean 1:1)
| Feeding tab (tnt-za, SOP 3-CUL-11) | igator output | FLOCORE `/iot/readings` metric |
|---|---|---|
| `phIn` | feed/dosing pH | `feed_ph` |
| `ecIn` | feed/dosing EC | `feed_ec` |
| `phRunOff` | run-off pH | `runoff_ph` |
| `ecRunOff` | run-off EC | `runoff_ec` |
| `waterVolume` | shot/volume | (irrigation event) |
| climate | PRIVA | `temp_c` · `rh_pct` · `leaf_temp_c` · `co2_ppm` · `ppfd` |

## 4. FLOCORE rails — READY (no FO change needed to receive)
`/iot/readings` already ingests all the above and derives: VPD, **leaf-VPD** (IR leaf-temp), **CO2 band**, DLI,
**dryback** (lysimeter), **runoff EC/pH → next-feed balance**. Out-of-band → auto-ticket (W26) to the role.
`source` tag (`priva`/`esp32`/`igator`) is preserved through to the cockpit charts.

## 5. Specs to build the extractor against
- **PRIVA:** `W21_PRIVA_CONNECTOR_INTEGRATION_SPEC.md` (Connext API / Modbus / BACnet → `/iot/readings`).
- **Irrigator/lysimeter:** `W21_LYSIMETER_EDGE_SPEC.md` (substrate-weight → dryback + runoff EC/pH; edge closes the loop).
- Post tenant_slug `ilco` (the `origin` slug also aliases to it).

## 6. What FO needs back to finish wiring
- **igator v2.2.0.309 interface:** REST API / CSV export / local DB / Modbus? (so the extractor's read path is defined.)
- **PRIVA:** Connext API on site, or Modbus/BACnet only?
- A first live reading per metric (climate + feed/runoff) so we prove the round-trip (reading → KPI off zero → observation).

## 7. Boundaries
Recommend-only — never auto-actuate PRIVA/igator from the cloud; the edge/controllers keep control. Regulated
data SA-resident + append-only audit. Report progress to FO.

— FO
