// Origin Retail bridge client — pulls the Potchefstroom store summary into the TnT Owner Dashboard.
// Read-only, server-to-server via a shared secret header. Uses the Node 18+ global fetch
// (accessed via globalThis to avoid needing DOM/fetch type libs at compile time).
const ORIGIN_API_URL = process.env.ORIGIN_API_URL || 'https://origin.cleva-ai.co.za/pos/api/v1';
const ORIGIN_BRIDGE_KEY = process.env.ORIGIN_BRIDGE_KEY || '';
const _fetch: any = (globalThis as any).fetch;

export async function getRetailSummary(): Promise<any> {
  if (!ORIGIN_BRIDGE_KEY) return { connected: false, reason: 'not_configured' };
  if (!_fetch) return { connected: false, reason: 'fetch_unavailable' };
  try {
    const r = await _fetch(`${ORIGIN_API_URL}/bridge/retail-summary`, {
      headers: { 'x-bridge-key': ORIGIN_BRIDGE_KEY },
    });
    if (!r.ok) return { connected: false, reason: `http_${r.status}` };
    const d = await r.json();
    return { connected: true, ...d };
  } catch (e: any) {
    return { connected: false, reason: e?.message || 'fetch_failed' };
  }
}
