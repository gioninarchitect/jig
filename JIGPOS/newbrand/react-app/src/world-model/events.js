// P18 — World Model Event Bus for DBC
// Singleton bus: subscribe/emit/getHistory
// History capped at 1000 events per branch, auto-timestamps on emit.

import { EVENT_TO_DOMAIN } from './types';

// ─── EventBus Class ─────────────────────────────────────────────

class EventBus {
  constructor() {
    // Map<eventType, Set<callback>>
    this._listeners = {};
    // Map<branchId, Array<event>>  — capped at MAX_HISTORY per branch
    this._history = {};
    // Wildcard listeners (subscribe to ALL events)
    this._wildcardListeners = new Set();
  }

  // ── Subscribe ───────────────────────────────────────────────────
  // Returns an unsubscribe function.
  // Pass '*' as eventType to listen to every event.
  subscribe(eventType, callback) {
    if (typeof callback !== 'function') {
      throw new Error('EventBus.subscribe: callback must be a function');
    }

    if (eventType === '*') {
      this._wildcardListeners.add(callback);
      return () => this._wildcardListeners.delete(callback);
    }

    if (!this._listeners[eventType]) {
      this._listeners[eventType] = new Set();
    }
    this._listeners[eventType].add(callback);

    return () => {
      this._listeners[eventType]?.delete(callback);
      if (this._listeners[eventType]?.size === 0) {
        delete this._listeners[eventType];
      }
    };
  }

  // ── Emit ────────────────────────────────────────────────────────
  // event shape: { type, branchId, data }
  // Auto-adds: timestamp, id, domain
  emit(event) {
    if (!event || !event.type) {
      throw new Error('EventBus.emit: event must have a type');
    }
    if (!event.branchId) {
      throw new Error('EventBus.emit: event must have a branchId');
    }

    const enriched = {
      ...event,
      id: `${event.type}_${event.branchId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      timestamp: Date.now(),
      domain: EVENT_TO_DOMAIN[event.type] || 'unknown',
    };

    // Store in branch history
    this._pushToHistory(enriched);

    // Notify type-specific listeners
    const typeListeners = this._listeners[enriched.type];
    if (typeListeners) {
      for (const cb of typeListeners) {
        try { cb(enriched); } catch (err) {
          console.error(`EventBus: listener error for ${enriched.type}`, err);
        }
      }
    }

    // Notify wildcard listeners
    for (const cb of this._wildcardListeners) {
      try { cb(enriched); } catch (err) {
        console.error('EventBus: wildcard listener error', err);
      }
    }

    return enriched;
  }

  // ── History ─────────────────────────────────────────────────────

  _pushToHistory(event) {
    const { branchId } = event;
    if (!this._history[branchId]) {
      this._history[branchId] = [];
    }
    this._history[branchId].push(event);

    // Cap at 1000 per branch
    if (this._history[branchId].length > 1000) {
      this._history[branchId] = this._history[branchId].slice(-1000);
    }
  }

  // Get history for a branch (or all branches).
  // Options: { branchId, type, domain, limit, since }
  getHistory(options = {}) {
    const { branchId, type, domain, limit, since } = options;

    let events;
    if (branchId) {
      events = this._history[branchId] || [];
    } else {
      // Merge all branches, sorted by timestamp
      events = Object.values(this._history).flat();
      events.sort((a, b) => a.timestamp - b.timestamp);
    }

    // Filter by event type
    if (type) {
      events = events.filter(e => e.type === type);
    }

    // Filter by domain
    if (domain) {
      events = events.filter(e => e.domain === domain);
    }

    // Filter by time
    if (since) {
      events = events.filter(e => e.timestamp >= since);
    }

    // Limit results (from most recent)
    if (limit && limit > 0) {
      events = events.slice(-limit);
    }

    return events;
  }

  // Get count of events per domain for a branch (useful for dashboards)
  getDomainCounts(branchId) {
    const events = this._history[branchId] || [];
    const counts = {};
    for (const evt of events) {
      counts[evt.domain] = (counts[evt.domain] || 0) + 1;
    }
    return counts;
  }

  // ── Utilities ───────────────────────────────────────────────────

  // Clear history for a branch (e.g. on day rollover)
  clearHistory(branchId) {
    if (branchId) {
      delete this._history[branchId];
    } else {
      this._history = {};
    }
  }

  // Remove all listeners (useful in tests / unmount)
  removeAllListeners() {
    this._listeners = {};
    this._wildcardListeners.clear();
  }

  // Full reset (listeners + history)
  reset() {
    this.removeAllListeners();
    this.clearHistory();
  }
}

// ─── Singleton Export ────────────────────────────────────────────
// One bus for the entire React app. Import this everywhere.

const eventBus = new EventBus();
export default eventBus;

// Named exports for convenience
export { EventBus };
