/**
 * JIG Craft Cannabis - n8n Webhook Event Emitter
 *
 * Fires events to n8n webhook endpoints. Each event type maps to
 * a separate n8n webhook URL derived from the base URL.
 *
 * Config via env:
 *   N8N_WEBHOOK_URL  - Base webhook URL (e.g. http://localhost:5678/webhook)
 *   N8N_ENABLED      - Set to "true" to enable (default: false)
 *
 * Events are fire-and-forget (non-blocking, best-effort).
 */

// ── Event types ─────────────────────────────────────────────

export type N8nEventType =
  // Order lifecycle
  | 'order.created'
  | 'order.confirmed'
  | 'order.shipped'
  | 'order.delivered'
  | 'order.cancelled'
  // Payment
  | 'payment.received'
  | 'payment.overdue'
  | 'pop.uploaded'
  | 'pop.approved'
  | 'pop.rejected'
  // Client
  | 'client.created'
  | 'client.activated'
  // Verification
  | 'doc.uploaded'
  | 'doc.approved'
  | 'doc.rejected'
  // Products
  | 'product.created';

export interface N8nEvent {
  type: N8nEventType;
  timestamp: string;
  payload: Record<string, unknown>;
}

// ── Emitter ─────────────────────────────────────────────────

function isEnabled(): boolean {
  return process.env.N8N_ENABLED === 'true' && !!process.env.N8N_WEBHOOK_URL;
}

/**
 * Emit an event to n8n. Non-blocking, logs errors but never throws.
 *
 * The event is POSTed to: {N8N_WEBHOOK_URL}/{event-type}
 * e.g. http://localhost:5678/webhook/order-confirmed
 */
export function emitEvent(type: N8nEventType, payload: Record<string, unknown>): void {
  if (!isEnabled()) return;

  const baseUrl = process.env.N8N_WEBHOOK_URL!.replace(/\/$/, '');
  const slug = type.replace(/\./g, '-'); // order.confirmed -> order-confirmed
  const url = `${baseUrl}/${slug}`;

  const event: N8nEvent = {
    type,
    timestamp: new Date().toISOString(),
    payload,
  };

  fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(process.env.N8N_API_KEY ? { 'X-N8N-API-KEY': process.env.N8N_API_KEY } : {}),
    },
    body: JSON.stringify(event),
    signal: AbortSignal.timeout(5000),
  }).catch((err) => {
    console.error(`[n8n] Failed to emit ${type}:`, (err as Error).message);
  });
}

/**
 * Emit multiple events at once (e.g. batch notifications).
 */
export function emitEvents(events: Array<{ type: N8nEventType; payload: Record<string, unknown> }>): void {
  for (const e of events) {
    emitEvent(e.type, e.payload);
  }
}
