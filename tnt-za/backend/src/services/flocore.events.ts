// =====================================================================
// flocore.events — forwards a curated set of REAL cultivation-lane domain
// events from the local eventBus to the FLOCORE event rail (POST /events/emit).
//
// Additive + fire-and-forget: registering here changes NO existing behaviour.
// emitEvent() is a no-op until the scoped W32 service token is configured, so
// this is inert on prod until Flo sets FLOCORE_SERVICE_TOKEN. A failed emit is
// logged and swallowed inside emitEvent — a farm action never blocks on FLOCORE.
//
// Scope: CULTIVATION lane only (plants, clones, harvest, mortality, batch, COA).
// We deliberately do NOT forward chicken / HR / auth / ticket / SOP events here.
// =====================================================================

import { eventBus } from './eventBus';
import { emitEvent } from './flocore.service';

// local eventBus type  →  FLOCORE event type
const FORWARD_MAP: Record<string, string> = {
  PLANT_REGISTERED:    'tnt.plant.registered',
  PLANT_PHASE_CHANGED: 'tnt.plant.phase_changed',
  CLONES_TRANSPLANTED: 'tnt.clone.transplanted',
  HARVEST_REQUESTED:   'tnt.harvest.requested',
  MORTALITY_RECORDED:  'tnt.plant.mortality',
  BATCH_CREATED:       'tnt.batch.created',
  COA_ISSUED:          'tnt.coa.issued',
};

// Fields that are eventBus plumbing rather than domain data — kept out of the payload.
const OMIT = new Set(['type', 'timestamp']);

function toPayload(event: Record<string, any>): Record<string, any> {
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(event)) {
    if (OMIT.has(k) || v === undefined) continue;
    out[k] = v;
  }
  return out;
}

for (const [localType, flocoreType] of Object.entries(FORWARD_MAP)) {
  eventBus.on(localType, (event) => {
    // void — never await; the farm action has already completed.
    void emitEvent(flocoreType, toPayload(event), { local_event: localType });
  });
}

console.log(`[flocore.events] forwarding ${Object.keys(FORWARD_MAP).length} cultivation event types to the FLOCORE rail`);
