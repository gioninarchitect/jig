type EventPayload = Record<string, any> & { type: string; timestamp: Date };
type EventHandler = (event: EventPayload) => void | Promise<void>;

const listeners = new Map<string, EventHandler[]>();
const history: EventPayload[] = [];
const MAX_HISTORY = 500;

export const eventBus = {
  emit(type: string, payload: Record<string, any> = {}) {
    const event: EventPayload = { type, ...payload, timestamp: new Date() };
    history.push(event);
    if (history.length > MAX_HISTORY) history.shift();

    const handlers = listeners.get(type) || [];
    const wildcards = listeners.get('*') || [];
    [...handlers, ...wildcards].forEach((h) => {
      try { h(event); } catch (e) { console.error(`[EventBus] Handler error for ${type}:`, e); }
    });
  },

  on(type: string, handler: EventHandler) {
    if (!listeners.has(type)) listeners.set(type, []);
    listeners.get(type)!.push(handler);
    return () => this.off(type, handler);
  },

  off(type: string, handler: EventHandler) {
    const handlers = listeners.get(type) || [];
    listeners.set(type, handlers.filter((h) => h !== handler));
  },

  getHistory() { return [...history]; },
  getHistoryByType(type: string) { return history.filter((e) => e.type === type); },
};
