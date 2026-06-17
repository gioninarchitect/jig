// =====================================================================
// flocore.service — server-side client for the FLOCORE micro-model rails.
//
// FLOCORE is the orchestrator/IdP for ALL ILCO modules and owns the AI rail.
// The AI is the NATIVE on-server model (Ollama / gemma) — NOT Claude.
//
// Two rails consumed here:
//   1. GET  /ai/actions/catalog  → governed action buttons (deterministic, ~200ms)
//   2. POST /micro-models/role-chat → native gemma grounded answer (slow on cold
//      start; warmed by keep_alive=30m). Always called with a tight timeout and a
//      caller-side fallback so the chat can never hang the UI.
//
// Basic auth + base URL come from env; if creds are absent the helpers return
// null and the caller keeps its existing (Claude/ops) behaviour — no regression.
// =====================================================================

const BASE = process.env.FLOCORE_BASE_URL || 'https://fo.flocore.tech';
const AUTH = process.env.FLOCORE_BASIC_AUTH || ''; // "user:pass"
const TENANT = process.env.FLOCORE_TENANT_SLUG || 'ilco';

export const flocoreEnabled = () => AUTH.length > 0;

function authHeader(): Record<string, string> {
  if (!AUTH) return {};
  return { Authorization: 'Basic ' + Buffer.from(AUTH).toString('base64') };
}

async function call(path: string, init: RequestInit, timeoutMs: number): Promise<any | null> {
  if (!flocoreEnabled()) return null;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(`${BASE}${path}`, {
      ...init,
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...authHeader(), ...(init.headers || {}) },
    });
    if (!res.ok) {
      console.warn(`[flocore] ${path} → HTTP ${res.status}`);
      return null;
    }
    return await res.json();
  } catch (err: any) {
    console.warn(`[flocore] ${path} failed: ${err?.name === 'AbortError' ? `timeout ${timeoutMs}ms` : err?.message}`);
    return null;
  } finally {
    clearTimeout(timer);
  }
}

export interface FlocoreCatalogItem {
  label: string;
  action: string;       // raise_ticket | review | act
  target: string;
  safe_use: string;     // recommend-only | approve-required
  severity: string;
  detail: string;
}

/** Governed action buttons for a role (deterministic, fast). Returns [] on any failure. */
export async function getActionCatalog(roleKey: string): Promise<FlocoreCatalogItem[]> {
  const data = await call(
    `/ai/actions/catalog?tenant_slug=${encodeURIComponent(TENANT)}&role_key=${encodeURIComponent(roleKey)}`,
    { method: 'GET' },
    6000,
  );
  return Array.isArray(data) ? (data as FlocoreCatalogItem[]) : [];
}

export interface FlocoreChatResult {
  answer: string;
  model: string;
  usedOllama: boolean;
  suggestedActions?: any[];
}

/** Native gemma grounded answer for a role. Returns null on timeout/failure (caller falls back). */
export async function roleChat(roleKey: string, message: string, timeoutMs = 22000): Promise<FlocoreChatResult | null> {
  const data = await call(
    `/micro-models/role-chat`,
    { method: 'POST', body: JSON.stringify({ tenant_slug: TENANT, role_key: roleKey, message }) },
    timeoutMs,
  );
  if (!data || typeof data.answer !== 'string' || !data.answer.trim()) return null;
  return {
    answer: data.answer,
    model: data.model || 'native',
    usedOllama: data.used_ollama === true,
    suggestedActions: data.suggested_actions,
  };
}
