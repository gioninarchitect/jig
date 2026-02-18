/**
 * JIG Craft Cannabis - Client World State Management
 *
 * Event-sourced state for each wholesale client. Every event flows
 * through clientWorldReducer to produce an updated ClientWorldState
 * which is then persisted.
 *
 * Key exports:
 *   createInitialClientState  - factory for new clients
 *   clientWorldReducer        - pure reducer (event -> state)
 *   saveClientState / loadClientState - persistence
 */

import type {
  Client,
  ClientTier,
  ClientWorldEvent,
  ClientWorldState,
  ChurnRisk,
  Intervention,
  Order,
  OrderItem,
  PaymentMethod,
  ProductCategory,
  ProductPreference,
} from './types';

import { TIER_THRESHOLDS } from './types';

// ─────────────────────────────────────────────────────────────
// STORAGE CONFIGURATION
// ─────────────────────────────────────────────────────────────

const STORAGE_KEY_PREFIX = '@jig_client_';
const getStorageKey = (clientId: string): string =>
  `${STORAGE_KEY_PREFIX}${clientId}`;

// ─────────────────────────────────────────────────────────────
// INITIAL STATE FACTORY
// ─────────────────────────────────────────────────────────────

/** Create a fresh world state for a newly registered client. */
export function createInitialClientState(
  clientId: string,
  client: Client,
): ClientWorldState {
  const now = Date.now();

  return {
    clientId,
    client,
    createdAt: now,
    lastUpdated: now,

    purchasing: {
      lifetimeValue: 0,
      totalOrders: 0,
      averageOrderValue: 0,
      lastOrderAt: null,
      lastOrderValue: 0,
      orderFrequencyDays: 30,
      preferredProducts: [],
      preferredCategories: [],
      pricePointSensitivity: 'mixed',
      bulkBuyer: false,
      seasonalPattern: null,
    },

    payment: {
      totalPaid: 0,
      outstandingBalance: 0,
      paymentReliability: 1,
      averageDaysToPayment: 0,
      latePayments: 0,
      creditUtilization: 0,
      lastPaymentAt: null,
      paymentTrend: 'stable',
    },

    inventory: {
      estimatedStockDays: 30,
      lastRestockDate: null,
      averageConsumptionRate: 0,
      stockAlerts: [],
      reorderPredictions: [],
    },

    relationship: {
      accountAgeDays: 0,
      tier: client.tier,
      satisfactionScore: 7,
      supportTickets: 0,
      complaintsCount: 0,
      npsScore: null,
      churnRisk: 'low',
      lastContactAt: null,
      assignedSalesRep: null,
    },

    behavioral: {
      preferredOrderDay: 'no_pattern',
      preferredOrderTime: 'no_pattern',
      browsingHistory: [],
      cartAbandonment: 0,
      cartAbandonmentValue: 0,
      emailOpenRate: 0.5,
      promotionResponseRate: 0.3,
      lastLoginAt: null,
      sessionCount: 0,
      averageSessionMinutes: 0,
    },

    patterns: [],
    interventions: [],
    orders: [],
  };
}

// ─────────────────────────────────────────────────────────────
// PERSISTENCE LAYER
// ─────────────────────────────────────────────────────────────

/**
 * Save client state. Uses localStorage in browser context,
 * can be swapped for a DB adapter in the backend.
 */
export async function saveClientState(
  state: ClientWorldState,
): Promise<void> {
  const key = getStorageKey(state.clientId);
  const serialized = JSON.stringify(state);

  if (typeof localStorage !== 'undefined') {
    localStorage.setItem(key, serialized);
  }
  // In Node/backend context, this would write to the DB.
  // The function signature stays async so the DB adapter is drop-in.
}

/** Load a client's world state, or null if none exists. */
export async function loadClientState(
  clientId: string,
): Promise<ClientWorldState | null> {
  const key = getStorageKey(clientId);

  if (typeof localStorage !== 'undefined') {
    const raw = localStorage.getItem(key);
    if (!raw) return null;
    return JSON.parse(raw) as ClientWorldState;
  }

  return null;
}

/** Remove a client's persisted state. */
export async function clearClientState(clientId: string): Promise<void> {
  const key = getStorageKey(clientId);
  if (typeof localStorage !== 'undefined') {
    localStorage.removeItem(key);
  }
}

/** List all client IDs that have persisted state. */
export async function getAllClientIds(): Promise<string[]> {
  const ids: string[] = [];
  if (typeof localStorage !== 'undefined') {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key?.startsWith(STORAGE_KEY_PREFIX)) {
        ids.push(key.slice(STORAGE_KEY_PREFIX.length));
      }
    }
  }
  return ids;
}

// ─────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

/** Average calendar days between orders. */
export function calculateOrderFrequency(orders: Order[]): number {
  if (orders.length < 2) return 30; // default assumption

  const sorted = [...orders].sort((a, b) => a.createdAt - b.createdAt);
  let totalGap = 0;
  for (let i = 1; i < sorted.length; i++) {
    totalGap += sorted[i].createdAt - sorted[i - 1].createdAt;
  }
  return Math.round(totalGap / (sorted.length - 1) / MS_PER_DAY);
}

/** Estimate how many days of stock the client has left. */
export function estimateStockDays(
  orders: Order[],
  lastDeliveryAt: number,
): number {
  if (orders.length < 2) return 30;

  const avgFreq = calculateOrderFrequency(orders);
  const daysSinceDelivery = (Date.now() - lastDeliveryAt) / MS_PER_DAY;
  return Math.max(0, Math.round(avgFreq - daysSinceDelivery));
}

/** Detect which day of the week the client prefers to order. */
export function detectPreferredOrderDay(
  orders: Order[],
): ClientWorldState['behavioral']['preferredOrderDay'] {
  if (orders.length < 3) return 'no_pattern';

  const dayCounts: Record<string, number> = {};
  const dayNames = [
    'sunday',
    'monday',
    'tuesday',
    'wednesday',
    'thursday',
    'friday',
    'saturday',
  ] as const;

  for (const order of orders) {
    const day = dayNames[new Date(order.createdAt).getDay()];
    dayCounts[day] = (dayCounts[day] ?? 0) + 1;
  }

  let maxDay = 'no_pattern';
  let maxCount = 0;
  for (const [day, count] of Object.entries(dayCounts)) {
    if (count > maxCount) {
      maxCount = count;
      maxDay = day;
    }
  }

  // Only report a pattern if the top day accounts for >40% of orders
  if (maxCount / orders.length < 0.4) return 'no_pattern';
  return maxDay as ClientWorldState['behavioral']['preferredOrderDay'];
}

/** Calculate payment reliability score (0-1). */
export function calculatePaymentReliability(orders: Order[]): number {
  const paidOrders = orders.filter(
    (o) => o.paymentStatus === 'paid' || o.paymentStatus === 'overdue',
  );
  if (paidOrders.length === 0) return 1; // no data, assume good

  const onTimeCount = paidOrders.filter((o) => {
    // Overdue and still unpaid = definitively late
    if (o.paymentStatus === 'overdue' && !o.paidAt) return false;
    // No data to compare = assume on-time
    if (!o.paidAt || !o.paymentDueDate) return true;
    return o.paidAt <= o.paymentDueDate;
  }).length;

  return onTimeCount / paidOrders.length;
}

/** Determine churn risk level from the full state. */
export function assessChurnRisk(state: ClientWorldState): ChurnRisk {
  let score = 0;

  // Factor 1: Days since last order vs. frequency (weight: 40%)
  if (state.purchasing.lastOrderAt) {
    const daysSince =
      (Date.now() - state.purchasing.lastOrderAt) / MS_PER_DAY;
    const ratio = daysSince / state.purchasing.orderFrequencyDays;
    if (ratio > 3) score += 40;
    else if (ratio > 2) score += 30;
    else if (ratio > 1.5) score += 20;
    else if (ratio > 1.2) score += 10;
  }

  // Factor 2: Declining order values (weight: 20%)
  if (state.orders.length >= 3) {
    const recent = state.orders.slice(-3);
    const older = state.orders.slice(-6, -3);
    if (older.length > 0) {
      const recentAvg =
        recent.reduce((s, o) => s + o.total, 0) / recent.length;
      const olderAvg =
        older.reduce((s, o) => s + o.total, 0) / older.length;
      if (recentAvg < olderAvg * 0.7) score += 20;
      else if (recentAvg < olderAvg * 0.85) score += 10;
    }
  }

  // Factor 3: Payment issues (weight: 15%)
  if (state.payment.latePayments >= 3) score += 15;
  else if (state.payment.latePayments >= 1) score += 8;

  // Factor 4: Support complaints (weight: 10%)
  if (state.relationship.complaintsCount >= 3) score += 10;
  else if (state.relationship.complaintsCount >= 1) score += 5;

  // Factor 5: Login inactivity (weight: 10%)
  if (state.behavioral.lastLoginAt) {
    const daysSinceLogin =
      (Date.now() - state.behavioral.lastLoginAt) / MS_PER_DAY;
    if (daysSinceLogin > 60) score += 10;
    else if (daysSinceLogin > 30) score += 5;
  }

  // Factor 6: Cart abandonment (weight: 5%)
  if (state.behavioral.cartAbandonment >= 5) score += 5;
  else if (state.behavioral.cartAbandonment >= 3) score += 3;

  // Map score to risk level
  if (score >= 60) return 'critical';
  if (score >= 40) return 'high';
  if (score >= 20) return 'medium';
  return 'low';
}

/** Check if the client qualifies for a tier upgrade. Returns the new tier or null. */
export function checkTierUpgrade(
  state: ClientWorldState,
): ClientTier | null {
  const ltv = state.purchasing.lifetimeValue;
  const currentTier = state.relationship.tier;

  if (currentTier !== 'platinum' && ltv >= TIER_THRESHOLDS.platinum)
    return 'platinum';
  if (currentTier === 'standard' && ltv >= TIER_THRESHOLDS.gold)
    return 'gold';
  if (currentTier === 'standard' && ltv >= TIER_THRESHOLDS.silver)
    return 'silver';
  if (currentTier === 'silver' && ltv >= TIER_THRESHOLDS.gold) return 'gold';
  if (currentTier === 'gold' && ltv >= TIER_THRESHOLDS.platinum)
    return 'platinum';

  return null;
}

/** Merge a new order's items into the running product preferences. */
export function updateProductPreferences(
  current: ProductPreference[],
  items: OrderItem[],
  orderTimestamp: number,
): ProductPreference[] {
  const map = new Map<string, ProductPreference>();
  for (const pref of current) {
    map.set(pref.productId, { ...pref });
  }

  for (const item of items) {
    const existing = map.get(item.productId);
    if (existing) {
      existing.orderCount += 1;
      existing.totalQuantity += item.quantity;
      existing.lastOrdered = orderTimestamp;
    } else {
      map.set(item.productId, {
        productId: item.productId,
        sku: item.sku,
        name: item.name,
        orderCount: 1,
        totalQuantity: item.quantity,
        lastOrdered: orderTimestamp,
      });
    }
  }

  // Return sorted by order count descending
  return Array.from(map.values()).sort(
    (a, b) => b.orderCount - a.orderCount,
  );
}

/** Derive preferred categories from product preferences and order items. */
function derivePreferredCategories(
  orders: Order[],
  _preferences: ProductPreference[],
): ProductCategory[] {
  // Count category occurrences across all order items.
  // Since OrderItem doesn't carry category, we approximate from the
  // product name conventions. In production this would join with the
  // products table. For now we return unique categories from the state.
  // This will be enriched in the inference engine (Phase 3).
  const categories = new Set<ProductCategory>();

  for (const order of orders) {
    for (const item of order.items) {
      const lowerName = item.name.toLowerCase();
      if (lowerName.includes('pre-roll') || lowerName.includes('pre_roll'))
        categories.add('pre_rolls');
      else if (lowerName.includes('edible') || lowerName.includes('gummy'))
        categories.add('edibles');
      else if (
        lowerName.includes('concentrate') ||
        lowerName.includes('wax') ||
        lowerName.includes('shatter')
      )
        categories.add('concentrates');
      else if (lowerName.includes('vape') || lowerName.includes('cart'))
        categories.add('vapes');
      else if (
        lowerName.includes('grinder') ||
        lowerName.includes('paper') ||
        lowerName.includes('accessory')
      )
        categories.add('accessories');
      else categories.add('flower'); // default for cannabis weight products
    }
  }

  return Array.from(categories);
}

/** Detect preferred order time from timestamps. */
function detectPreferredOrderTime(
  orders: Order[],
): 'morning' | 'afternoon' | 'evening' | 'no_pattern' {
  if (orders.length < 3) return 'no_pattern';

  const buckets = { morning: 0, afternoon: 0, evening: 0 };
  for (const order of orders) {
    const hour = new Date(order.createdAt).getHours();
    if (hour >= 6 && hour < 12) buckets.morning++;
    else if (hour >= 12 && hour < 18) buckets.afternoon++;
    else buckets.evening++;
  }

  const max = Math.max(buckets.morning, buckets.afternoon, buckets.evening);
  if (max / orders.length < 0.4) return 'no_pattern';

  if (buckets.morning === max) return 'morning';
  if (buckets.afternoon === max) return 'afternoon';
  return 'evening';
}

// ─────────────────────────────────────────────────────────────
// EVENT HANDLERS (pure functions, each returns a new state)
// ─────────────────────────────────────────────────────────────

function handleOrderPlaced(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'ORDER_PLACED' }>,
  now: number,
): ClientWorldState {
  const newOrder: Order = {
    id: event.orderId,
    clientId: state.clientId,
    items: event.items,
    subtotal: event.subtotal,
    vatAmount: event.total - event.subtotal,
    total: event.total,
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: event.paymentMethod,
    deliveryAddress: state.client.deliveryAddress ?? state.client.address,
    createdAt: now,
    updatedAt: now,
  };

  const orders = [...state.orders, newOrder];
  const totalOrders = state.purchasing.totalOrders + 1;
  const lifetimeValue = state.purchasing.lifetimeValue + event.total;
  const averageOrderValue = lifetimeValue / totalOrders;
  const orderFrequencyDays = calculateOrderFrequency(orders);
  const preferredProducts = updateProductPreferences(
    state.purchasing.preferredProducts,
    event.items,
    now,
  );
  const preferredCategories = derivePreferredCategories(
    orders,
    preferredProducts,
  );
  const bulkBuyer = averageOrderValue > 25_000;
  const preferredOrderDay = detectPreferredOrderDay(orders);
  const preferredOrderTime = detectPreferredOrderTime(orders);

  // Estimate stock days: they just ordered, so reset estimate
  const estimatedStockDays = orderFrequencyDays;

  // Check tier upgrade
  const newTier = checkTierUpgrade({
    ...state,
    purchasing: { ...state.purchasing, lifetimeValue },
  });

  return {
    ...state,
    lastUpdated: now,
    orders,
    purchasing: {
      ...state.purchasing,
      lifetimeValue,
      totalOrders,
      averageOrderValue,
      lastOrderAt: now,
      lastOrderValue: event.total,
      orderFrequencyDays,
      preferredProducts,
      preferredCategories,
      bulkBuyer,
    },
    inventory: {
      ...state.inventory,
      estimatedStockDays,
      lastRestockDate: now,
    },
    relationship: {
      ...state.relationship,
      tier: newTier ?? state.relationship.tier,
      accountAgeDays: Math.round((now - state.createdAt) / MS_PER_DAY),
      churnRisk: 'low', // just ordered, reset risk
    },
    behavioral: {
      ...state.behavioral,
      preferredOrderDay,
      preferredOrderTime,
    },
  };
}

function handleOrderConfirmed(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'ORDER_CONFIRMED' }>,
  now: number,
): ClientWorldState {
  const orders = state.orders.map((o) =>
    o.id === event.orderId
      ? { ...o, status: 'confirmed' as const, updatedAt: now }
      : o,
  );
  return { ...state, lastUpdated: now, orders };
}

function handleOrderShipped(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'ORDER_SHIPPED' }>,
  now: number,
): ClientWorldState {
  const orders = state.orders.map((o) =>
    o.id === event.orderId
      ? {
          ...o,
          status: 'shipped' as const,
          trackingNumber: event.trackingNumber,
          updatedAt: now,
        }
      : o,
  );
  return { ...state, lastUpdated: now, orders };
}

function handleOrderDelivered(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'ORDER_DELIVERED' }>,
  now: number,
): ClientWorldState {
  const orders = state.orders.map((o) =>
    o.id === event.orderId
      ? { ...o, status: 'delivered' as const, updatedAt: now }
      : o,
  );
  return {
    ...state,
    lastUpdated: now,
    orders,
    inventory: {
      ...state.inventory,
      lastRestockDate: now,
      estimatedStockDays: state.purchasing.orderFrequencyDays,
    },
  };
}

function handleOrderCancelled(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'ORDER_CANCELLED' }>,
  now: number,
): ClientWorldState {
  const cancelledOrder = state.orders.find((o) => o.id === event.orderId);
  const orders = state.orders.map((o) =>
    o.id === event.orderId
      ? { ...o, status: 'cancelled' as const, updatedAt: now }
      : o,
  );

  // Reverse the lifetime value impact
  const lifetimeValue = cancelledOrder
    ? state.purchasing.lifetimeValue - cancelledOrder.total
    : state.purchasing.lifetimeValue;
  const totalOrders = Math.max(0, state.purchasing.totalOrders - 1);
  const averageOrderValue =
    totalOrders > 0 ? lifetimeValue / totalOrders : 0;

  return {
    ...state,
    lastUpdated: now,
    orders,
    purchasing: {
      ...state.purchasing,
      lifetimeValue,
      totalOrders,
      averageOrderValue,
    },
  };
}

function handlePaymentReceived(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'PAYMENT_RECEIVED' }>,
  now: number,
): ClientWorldState {
  const orders = state.orders.map((o) =>
    o.id === event.orderId
      ? {
          ...o,
          paymentStatus: 'paid' as const,
          paidAt: now,
          updatedAt: now,
        }
      : o,
  );

  const totalPaid = state.payment.totalPaid + event.amount;
  const outstandingBalance = Math.max(
    0,
    state.payment.outstandingBalance - event.amount,
  );
  const paymentReliability = calculatePaymentReliability(orders);

  // Calculate days to payment for this order
  const paidOrder = state.orders.find((o) => o.id === event.orderId);
  let averageDaysToPayment = state.payment.averageDaysToPayment;
  if (paidOrder) {
    const daysToPayThis = (now - paidOrder.createdAt) / MS_PER_DAY;
    const paidCount = orders.filter((o) => o.paymentStatus === 'paid').length;
    averageDaysToPayment =
      (state.payment.averageDaysToPayment * (paidCount - 1) + daysToPayThis) /
      paidCount;
  }

  const creditUtilization =
    state.client.creditLimit > 0
      ? outstandingBalance / state.client.creditLimit
      : 0;

  // Determine payment trend
  let paymentTrend = state.payment.paymentTrend;
  if (paymentReliability > 0.9) paymentTrend = 'improving';
  else if (paymentReliability < 0.6) paymentTrend = 'declining';
  else paymentTrend = 'stable';

  return {
    ...state,
    lastUpdated: now,
    orders,
    payment: {
      ...state.payment,
      totalPaid,
      outstandingBalance,
      paymentReliability,
      averageDaysToPayment,
      lastPaymentAt: now,
      creditUtilization,
      paymentTrend: paymentTrend as 'improving' | 'stable' | 'declining',
    },
  };
}

function handlePaymentOverdue(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'PAYMENT_OVERDUE' }>,
  now: number,
): ClientWorldState {
  const orders = state.orders.map((o) =>
    o.id === event.orderId
      ? { ...o, paymentStatus: 'overdue' as const, updatedAt: now }
      : o,
  );

  const latePayments = state.payment.latePayments + 1;
  const paymentReliability = calculatePaymentReliability(orders);

  // Late payments increase churn risk
  const churnRisk = assessChurnRisk({
    ...state,
    orders,
    payment: { ...state.payment, latePayments, paymentReliability },
  });

  return {
    ...state,
    lastUpdated: now,
    orders,
    payment: {
      ...state.payment,
      latePayments,
      paymentReliability,
      paymentTrend: 'declining',
    },
    relationship: {
      ...state.relationship,
      churnRisk,
    },
  };
}

function handleClientLogin(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'CLIENT_LOGIN' }>,
  now: number,
): ClientWorldState {
  const sessionCount = state.behavioral.sessionCount + 1;
  return {
    ...state,
    lastUpdated: now,
    behavioral: {
      ...state.behavioral,
      lastLoginAt: event.timestamp,
      sessionCount,
    },
    relationship: {
      ...state.relationship,
      lastContactAt: now,
      accountAgeDays: Math.round((now - state.createdAt) / MS_PER_DAY),
    },
  };
}

function handleProductViewed(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'PRODUCT_VIEWED' }>,
  now: number,
): ClientWorldState {
  const browsingHistory = [
    ...state.behavioral.browsingHistory.slice(-99), // keep last 100
    {
      productId: event.productId,
      timestamp: now,
      durationSeconds: event.duration,
      addedToCart: false,
    },
  ];

  return {
    ...state,
    lastUpdated: now,
    behavioral: { ...state.behavioral, browsingHistory },
  };
}

function handleCartAbandoned(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'CART_ABANDONED' }>,
  now: number,
): ClientWorldState {
  return {
    ...state,
    lastUpdated: now,
    behavioral: {
      ...state.behavioral,
      cartAbandonment: state.behavioral.cartAbandonment + 1,
      cartAbandonmentValue:
        state.behavioral.cartAbandonmentValue + event.totalValue,
    },
  };
}

function handlePromotionResponded(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'PROMOTION_RESPONDED' }>,
  now: number,
): ClientWorldState {
  // Update promotion response rate (simple moving average)
  const responded = event.action !== 'ignored' ? 1 : 0;
  const newRate =
    state.behavioral.promotionResponseRate * 0.8 + responded * 0.2;

  // Track email opens separately
  const emailOpened = event.action === 'opened' || event.action === 'clicked' ? 1 : 0;
  const newEmailRate =
    state.behavioral.emailOpenRate * 0.8 + emailOpened * 0.2;

  return {
    ...state,
    lastUpdated: now,
    behavioral: {
      ...state.behavioral,
      promotionResponseRate: newRate,
      emailOpenRate: newEmailRate,
    },
  };
}

function handleSupportTicketOpened(
  state: ClientWorldState,
  _event: Extract<ClientWorldEvent, { type: 'SUPPORT_TICKET_OPENED' }>,
  now: number,
): ClientWorldState {
  return {
    ...state,
    lastUpdated: now,
    relationship: {
      ...state.relationship,
      supportTickets: state.relationship.supportTickets + 1,
      lastContactAt: now,
    },
  };
}

function handleComplaintReceived(
  state: ClientWorldState,
  _event: Extract<ClientWorldEvent, { type: 'COMPLAINT_RECEIVED' }>,
  now: number,
): ClientWorldState {
  const complaintsCount = state.relationship.complaintsCount + 1;
  // Complaints reduce satisfaction
  const satisfactionScore = Math.max(
    1,
    state.relationship.satisfactionScore - 1,
  );

  const churnRisk = assessChurnRisk({
    ...state,
    relationship: { ...state.relationship, complaintsCount, satisfactionScore },
  });

  return {
    ...state,
    lastUpdated: now,
    relationship: {
      ...state.relationship,
      complaintsCount,
      satisfactionScore,
      churnRisk,
      lastContactAt: now,
    },
  };
}

function handleFeedbackReceived(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'FEEDBACK_RECEIVED' }>,
  now: number,
): ClientWorldState {
  // Weighted average of satisfaction (heavier on recent)
  const satisfactionScore =
    state.relationship.satisfactionScore * 0.6 + event.score * 0.4;

  return {
    ...state,
    lastUpdated: now,
    relationship: {
      ...state.relationship,
      satisfactionScore: Math.round(satisfactionScore * 100) / 100,
      npsScore: event.score >= 9 ? 1 : event.score <= 6 ? -1 : 0,
      lastContactAt: now,
    },
  };
}

function handlePatternDetected(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'PATTERN_DETECTED' }>,
  now: number,
): ClientWorldState {
  // Upsert pattern
  const existingIdx = state.patterns.findIndex(
    (p) => p.patternType === event.patternType,
  );
  let patterns: typeof state.patterns;

  if (existingIdx >= 0) {
    patterns = state.patterns.map((p, i) =>
      i === existingIdx
        ? {
            ...p,
            confidence: event.confidence,
            frequency: p.frequency + 1,
            lastDetected: now,
          }
        : p,
    );
  } else {
    patterns = [
      ...state.patterns,
      {
        id: event.patternId,
        clientId: state.clientId,
        patternType: event.patternType,
        category: 'purchasing' as const, // will be refined by pattern engine
        frequency: 1,
        confidence: event.confidence,
        lastDetected: now,
      },
    ];
  }

  return { ...state, lastUpdated: now, patterns };
}

function handleInterventionTriggered(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'INTERVENTION_TRIGGERED' }>,
  now: number,
): ClientWorldState {
  return {
    ...state,
    lastUpdated: now,
    interventions: [...state.interventions, event.intervention],
  };
}

function handleInterventionResponded(
  state: ClientWorldState,
  event: Extract<ClientWorldEvent, { type: 'INTERVENTION_RESPONDED' }>,
  now: number,
): ClientWorldState {
  const interventions = state.interventions.map((i) =>
    i.id === event.interventionId
      ? {
          ...i,
          respondedAt: now,
          outcome: event.outcome as Intervention['outcome'],
          status: 'converted' as const,
        }
      : i,
  );
  return { ...state, lastUpdated: now, interventions };
}

// ─────────────────────────────────────────────────────────────
// MAIN REDUCER
// ─────────────────────────────────────────────────────────────

/**
 * Pure reducer: takes current state + event, returns new state.
 * Does NOT persist - caller is responsible for saving.
 */
export function clientWorldReducer(
  state: ClientWorldState,
  event: ClientWorldEvent,
): ClientWorldState {
  const now = Date.now();

  switch (event.type) {
    case 'ORDER_PLACED':
      return handleOrderPlaced(state, event, now);
    case 'ORDER_CONFIRMED':
      return handleOrderConfirmed(state, event, now);
    case 'ORDER_SHIPPED':
      return handleOrderShipped(state, event, now);
    case 'ORDER_DELIVERED':
      return handleOrderDelivered(state, event, now);
    case 'ORDER_CANCELLED':
      return handleOrderCancelled(state, event, now);
    case 'PAYMENT_RECEIVED':
      return handlePaymentReceived(state, event, now);
    case 'PAYMENT_OVERDUE':
      return handlePaymentOverdue(state, event, now);
    case 'CLIENT_LOGIN':
      return handleClientLogin(state, event, now);
    case 'PRODUCT_VIEWED':
      return handleProductViewed(state, event, now);
    case 'CART_UPDATED':
      return state; // Cart updates don't change world state until checkout
    case 'CART_ABANDONED':
      return handleCartAbandoned(state, event, now);
    case 'PROMOTION_SENT':
      return state; // Sending a promo doesn't change client state
    case 'PROMOTION_RESPONDED':
      return handlePromotionResponded(state, event, now);
    case 'SUPPORT_TICKET_OPENED':
      return handleSupportTicketOpened(state, event, now);
    case 'COMPLAINT_RECEIVED':
      return handleComplaintReceived(state, event, now);
    case 'FEEDBACK_RECEIVED':
      return handleFeedbackReceived(state, event, now);
    case 'PATTERN_DETECTED':
      return handlePatternDetected(state, event, now);
    case 'INTERVENTION_TRIGGERED':
      return handleInterventionTriggered(state, event, now);
    case 'INTERVENTION_RESPONDED':
      return handleInterventionResponded(state, event, now);
    default: {
      // Exhaustive check - if TypeScript complains here, a new event
      // type was added but not handled in the reducer.
      const _exhaustive: never = event;
      return state;
    }
  }
}
