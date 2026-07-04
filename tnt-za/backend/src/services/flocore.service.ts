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

// FO stages the gate URL as FLOCORE_URL and the scoped W32 bearer as FLOCORE_TOKEN.
// Keep the older FLOCORE_BASE_URL / FLOCORE_SERVICE_TOKEN names as fallbacks.
const BASE = process.env.FLOCORE_BASE_URL || process.env.FLOCORE_URL || 'https://fo.flocore.tech';
const AUTH = process.env.FLOCORE_BASIC_AUTH || ''; // "user:pass" (gate basic-auth for /auth/* and AI rails)
const TENANT = process.env.FLOCORE_TENANT_SLUG || 'ilco';
const SERVICE_TOKEN = process.env.FLOCORE_TOKEN || process.env.FLOCORE_SERVICE_TOKEN || ''; // scoped tenant:ilco bearer for /events/emit

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

// =====================================================================
// SSO — W30 centralized identity (OTP issue/verify through the gate).
// FLOCORE owns the email + code; tnt-za never rolls its own OTP here.
// Both calls go through the basic-auth gate (no bearer needed).
// =====================================================================

export interface FlocoreOtpVerifyResult {
  ok: boolean;
  status: number;            // FO HTTP status (200 = verified, 401 = bad/expired code)
  token?: string;            // FLOCORE-issued session JWT (proof the email owns the code)
  user?: any;
  expiresAt?: string;
  error?: string;
}

/** Ask FLOCORE to email a one-time code. Throws on transport failure so the caller can report. */
export async function otpRequest(email: string): Promise<{ ok: boolean; delivery: string; expiresInSeconds?: number }> {
  if (!flocoreEnabled()) throw Object.assign(new Error('FLOCORE SSO not configured'), { status: 503 });
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${BASE}/auth/otp/request`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ tenant_slug: TENANT, email, brand: 'origin' }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) throw Object.assign(new Error(data?.detail || 'Could not send code'), { status: res.status });
    return { ok: data.ok === true, delivery: data.delivery || 'unknown', expiresInSeconds: data.expires_in_seconds };
  } finally {
    clearTimeout(timer);
  }
}

/** Verify a code with FLOCORE. Returns status so the caller can distinguish bad-code (401) from FO-down. */
export async function otpVerify(email: string, code: string): Promise<FlocoreOtpVerifyResult> {
  if (!flocoreEnabled()) return { ok: false, status: 503, error: 'FLOCORE SSO not configured' };
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(`${BASE}/auth/otp/verify`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', ...authHeader() },
      body: JSON.stringify({ tenant_slug: TENANT, email, code }),
    });
    const data: any = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, status: res.status, error: data?.detail || 'Invalid or expired code' };
    return { ok: true, status: 200, token: data.token, user: data.user, expiresAt: data.expires_at };
  } catch (err: any) {
    return { ok: false, status: 0, error: err?.name === 'AbortError' ? 'FLOCORE timeout' : (err?.message || 'FLOCORE unreachable') };
  } finally {
    clearTimeout(timer);
  }
}

// =====================================================================
// Events — W32 gateway (/events/emit). Additive, fire-and-forget.
// Uses the scoped tenant:ilco service token as a Bearer (NO basic-auth:
// nginx passes /events/emit through and the app validates the token).
// A failed emit is logged and swallowed — it must never block a farm action.
// =====================================================================

export const eventsEnabled = () => SERVICE_TOKEN.length > 0;

/** Fire-and-forget emit of a real tnt event to the FLOCORE event rail. Never throws. */
export async function emitEvent(type: string, payload: Record<string, any>, metadata: Record<string, any> = {}): Promise<void> {
  if (!eventsEnabled()) return; // no scoped W32 token yet → no-op (no 401 spam)
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 8000);
  try {
    const res = await fetch(`${BASE}/events/emit`, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${SERVICE_TOKEN}` },
      body: JSON.stringify({
        tenant_slug: TENANT,        // authoritatively re-stamped from the token FO-side
        module_key: 'ilco-tnt',
        type,
        payload,
        metadata: { source: 'ilco-tnt', ...metadata },
      }),
    });
    if (!res.ok) {
      console.warn(`[flocore] emit ${type} → HTTP ${res.status}`);
    }
  } catch (err: any) {
    console.warn(`[flocore] emit ${type} failed: ${err?.name === 'AbortError' ? 'timeout' : err?.message}`);
  } finally {
    clearTimeout(timer);
  }
}
