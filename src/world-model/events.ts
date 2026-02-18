/**
 * JIG Craft Cannabis - Client Event Bus
 *
 * Pub/sub event system for the world model. Every client action
 * (order, payment, login, etc.) emits an event that flows through
 * the reducer to update ClientWorldState.
 *
 * Usage:
 *   import { clientEventBus, emitOrderPlaced } from './events';
 *
 *   // Subscribe to all events
 *   const unsub = clientEventBus.subscribe((event) => {
 *     console.log('Event:', event.type);
 *   });
 *
 *   // Emit from your order flow
 *   emitOrderPlaced('JIG-000001', items, 45000, 51750, 'eft');
 *
 *   // Clean up
 *   unsub();
 */

import type {
  ClientWorldEvent,
  OrderItem,
  PaymentMethod,
  InterventionChannel,
  Intervention,
} from './types';

// ─────────────────────────────────────────────────────────────
// EVENT BUS
// ─────────────────────────────────────────────────────────────

type EventListener = (event: ClientWorldEvent) => void;

class ClientEventBus {
  private listeners: Set<EventListener> = new Set();
  private eventHistory: ClientWorldEvent[] = [];
  private readonly maxHistory: number;

  constructor(maxHistory = 500) {
    this.maxHistory = maxHistory;
  }

  /** Subscribe to all events. Returns an unsubscribe function. */
  subscribe(listener: EventListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /** Emit an event to all subscribers and record it in history. */
  emit(event: ClientWorldEvent): void {
    // Append to history (ring buffer)
    this.eventHistory.push(event);
    if (this.eventHistory.length > this.maxHistory) {
      this.eventHistory.shift();
    }

    // Notify all subscribers
    for (const listener of this.listeners) {
      try {
        listener(event);
      } catch (err) {
        console.error(`[EventBus] Listener error on ${event.type}:`, err);
      }
    }
  }

  /** Get the full event history (oldest first). */
  getHistory(): ReadonlyArray<ClientWorldEvent> {
    return this.eventHistory;
  }

  /** Get events of a specific type. */
  getHistoryByType<T extends ClientWorldEvent['type']>(
    type: T,
  ): Extract<ClientWorldEvent, { type: T }>[] {
    return this.eventHistory.filter(
      (e): e is Extract<ClientWorldEvent, { type: T }> => e.type === type,
    );
  }

  /** Clear the event history. */
  clearHistory(): void {
    this.eventHistory = [];
  }

  /** Number of active subscribers. */
  getSubscriberCount(): number {
    return this.listeners.size;
  }
}

/** Singleton event bus instance */
export const clientEventBus = new ClientEventBus();

// ─────────────────────────────────────────────────────────────
// ORDER EVENT EMITTERS
// ─────────────────────────────────────────────────────────────

export function emitOrderPlaced(
  orderId: string,
  items: OrderItem[],
  subtotal: number,
  total: number,
  paymentMethod: PaymentMethod,
): void {
  clientEventBus.emit({
    type: 'ORDER_PLACED',
    orderId,
    items,
    subtotal,
    total,
    paymentMethod,
  });
}

export function emitOrderConfirmed(orderId: string): void {
  clientEventBus.emit({ type: 'ORDER_CONFIRMED', orderId });
}

export function emitOrderShipped(
  orderId: string,
  trackingNumber: string,
): void {
  clientEventBus.emit({ type: 'ORDER_SHIPPED', orderId, trackingNumber });
}

export function emitOrderDelivered(orderId: string): void {
  clientEventBus.emit({ type: 'ORDER_DELIVERED', orderId });
}

export function emitOrderCancelled(orderId: string, reason: string): void {
  clientEventBus.emit({ type: 'ORDER_CANCELLED', orderId, reason });
}

// ─────────────────────────────────────────────────────────────
// PAYMENT EVENT EMITTERS
// ─────────────────────────────────────────────────────────────

export function emitPaymentReceived(
  orderId: string,
  amount: number,
  method: PaymentMethod,
): void {
  clientEventBus.emit({
    type: 'PAYMENT_RECEIVED',
    orderId,
    amount,
    method,
  });
}

export function emitPaymentOverdue(
  orderId: string,
  daysOverdue: number,
  amount: number,
): void {
  clientEventBus.emit({
    type: 'PAYMENT_OVERDUE',
    orderId,
    daysOverdue,
    amount,
  });
}

// ─────────────────────────────────────────────────────────────
// ENGAGEMENT EVENT EMITTERS
// ─────────────────────────────────────────────────────────────

export function emitClientLogin(): void {
  clientEventBus.emit({ type: 'CLIENT_LOGIN', timestamp: Date.now() });
}

export function emitProductViewed(
  productId: string,
  duration: number,
): void {
  clientEventBus.emit({ type: 'PRODUCT_VIEWED', productId, duration });
}

export function emitCartUpdated(
  items: OrderItem[],
  totalValue: number,
): void {
  clientEventBus.emit({ type: 'CART_UPDATED', items, totalValue });
}

export function emitCartAbandoned(
  items: OrderItem[],
  totalValue: number,
): void {
  clientEventBus.emit({ type: 'CART_ABANDONED', items, totalValue });
}

// ─────────────────────────────────────────────────────────────
// PROMOTION EVENT EMITTERS
// ─────────────────────────────────────────────────────────────

export function emitPromotionSent(
  promotionId: string,
  channel: InterventionChannel,
): void {
  clientEventBus.emit({ type: 'PROMOTION_SENT', promotionId, channel });
}

export function emitPromotionResponded(
  promotionId: string,
  action: 'opened' | 'clicked' | 'ordered' | 'ignored',
): void {
  clientEventBus.emit({ type: 'PROMOTION_RESPONDED', promotionId, action });
}

// ─────────────────────────────────────────────────────────────
// SUPPORT EVENT EMITTERS
// ─────────────────────────────────────────────────────────────

export function emitSupportTicketOpened(
  ticketId: string,
  category: string,
  priority: string,
): void {
  clientEventBus.emit({
    type: 'SUPPORT_TICKET_OPENED',
    ticketId,
    category,
    priority,
  });
}

export function emitComplaintReceived(
  category: string,
  severity: string,
): void {
  clientEventBus.emit({ type: 'COMPLAINT_RECEIVED', category, severity });
}

export function emitFeedbackReceived(score: number, comment: string): void {
  clientEventBus.emit({ type: 'FEEDBACK_RECEIVED', score, comment });
}

// ─────────────────────────────────────────────────────────────
// INTELLIGENCE EVENT EMITTERS
// ─────────────────────────────────────────────────────────────

export function emitPatternDetected(
  patternId: string,
  patternType: string,
  confidence: number,
): void {
  clientEventBus.emit({
    type: 'PATTERN_DETECTED',
    patternId,
    patternType,
    confidence,
  });
}

export function emitInterventionTriggered(intervention: Intervention): void {
  clientEventBus.emit({ type: 'INTERVENTION_TRIGGERED', intervention });
}

export function emitInterventionResponded(
  interventionId: string,
  outcome: string,
): void {
  clientEventBus.emit({
    type: 'INTERVENTION_RESPONDED',
    interventionId,
    outcome,
  });
}
