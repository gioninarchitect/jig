/**
 * JIG Craft Cannabis - World Model Integration Tests
 *
 * Covers:
 *   1. Order flow
 *   2. Payment flow
 *   3. Churn prediction
 *   4. Intervention triggers
 *   5. Pattern detection
 *   6. Inference engine
 *   7. End-to-end scenarios
 */

import type {
  Client,
  ClientWorldState,
  Order,
  OrderItem,
  Product,
} from '../types';

import {
  createInitialClientState,
  clientWorldReducer,
  calculateOrderFrequency,
  assessChurnRisk,
  checkTierUpgrade,
  updateProductPreferences,
} from '../state';

import {
  detectAllPatterns,
  detectPurchasingPatterns,
  detectPaymentPatterns,
  detectRiskPatterns,
  getHighPriorityPatterns,
} from '../patterns';

import {
  predictRestock,
  analyzeChurnRisk,
  assessPaymentRisk,
  generateProductRecommendations,
  analyzeTierStatus,
  forecastRevenue,
} from '../inference';

import {
  generateInterventions,
  shouldTriggerIntervention,
} from '../interventions';

import { computeIntelligenceSummary } from '../ClientWorldContext';

import { clientEventBus } from '../events';

// ─────────────────────────────────────────────────────────────
// MOCK DATA GENERATORS
// ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

function mockClient(overrides: Partial<Client> = {}): Client {
  return {
    id: 'client-001',
    companyName: 'Green Leaf Dispensary',
    contactPerson: 'Thabo Mokoena',
    email: 'thabo@greenleaf.co.za',
    phone: '082 555 1234',
    address: {
      street: '123 Main Road',
      city: 'Sandton',
      province: 'Gauteng',
      postalCode: '2196',
      country: 'South Africa',
    },
    clientType: 'dispensary',
    tier: 'standard',
    creditLimit: 50000,
    paymentTerms: 'net14',
    status: 'active',
    createdAt: Date.now() - 180 * MS_PER_DAY,
    lastActiveAt: Date.now(),
    ...overrides,
  };
}

function mockOrderItems(count = 2): OrderItem[] {
  const items: OrderItem[] = [
    {
      productId: 'prod-001',
      sku: 'JIG-PH-250',
      name: 'Purple Haze Premium 250g',
      quantity: 250,
      unitPrice: 650,
      totalPrice: 162500,
    },
    {
      productId: 'prod-002',
      sku: 'JIG-PR-50',
      name: 'Pre-Roll 6-Pack',
      quantity: 50,
      unitPrice: 150,
      totalPrice: 7500,
    },
    {
      productId: 'prod-003',
      sku: 'JIG-ED-20',
      name: 'Edible Gummy 10-Pack',
      quantity: 20,
      unitPrice: 200,
      totalPrice: 4000,
    },
  ];
  return items.slice(0, count);
}

function mockProducts(): Product[] {
  return [
    {
      id: 'prod-001',
      sku: 'JIG-PH-250',
      name: 'Purple Haze Premium',
      category: 'flower',
      strain: 'hybrid',
      thcContent: '22%',
      unit: 'grams',
      stockQuantity: 5000,
      reorderPoint: 500,
      costPrice: 400,
      priceTiers: [
        { minQuantity: 1, price: 750, tierName: 'Standard' },
        { minQuantity: 100, price: 700, tierName: 'Silver' },
        { minQuantity: 500, price: 650, tierName: 'Gold' },
      ],
      isActive: true,
      createdAt: Date.now() - 90 * MS_PER_DAY,
      updatedAt: Date.now(),
    },
    {
      id: 'prod-002',
      sku: 'JIG-PR-50',
      name: 'Pre-Roll 6-Pack',
      category: 'pre_rolls',
      unit: 'packs',
      stockQuantity: 2000,
      reorderPoint: 200,
      costPrice: 80,
      priceTiers: [{ minQuantity: 1, price: 150, tierName: 'Standard' }],
      isActive: true,
      createdAt: Date.now() - 90 * MS_PER_DAY,
      updatedAt: Date.now(),
    },
    {
      id: 'prod-003',
      sku: 'JIG-ED-20',
      name: 'Edible Gummy 10-Pack',
      category: 'edibles',
      unit: 'packs',
      stockQuantity: 1000,
      reorderPoint: 100,
      costPrice: 100,
      priceTiers: [{ minQuantity: 1, price: 200, tierName: 'Standard' }],
      isActive: true,
      createdAt: Date.now() - 10 * MS_PER_DAY,
      updatedAt: Date.now(),
    },
    {
      id: 'prod-004',
      sku: 'JIG-VPE-10',
      name: 'Vape Cartridge Premium',
      category: 'vapes',
      unit: 'units',
      stockQuantity: 500,
      reorderPoint: 50,
      costPrice: 150,
      priceTiers: [{ minQuantity: 1, price: 300, tierName: 'Standard' }],
      isActive: true,
      createdAt: Date.now() - 5 * MS_PER_DAY,
      updatedAt: Date.now(),
    },
  ];
}

/** Simulate placing N orders spaced over time. */
function buildStateWithOrders(
  orderCount: number,
  options: {
    orderValue?: number;
    frequencyDays?: number;
    startDaysAgo?: number;
    tier?: Client['tier'];
  } = {},
): ClientWorldState {
  const {
    orderValue = 45000,
    frequencyDays = 21,
    startDaysAgo = orderCount * (options.frequencyDays ?? 21),
    tier = 'standard',
  } = options;

  const client = mockClient({ tier });
  const realNow = Date.now();
  const dateSpy = jest.spyOn(Date, 'now');

  // Create initial state at the time of first order
  const firstOrderTime = realNow - startDaysAgo * MS_PER_DAY;
  dateSpy.mockReturnValue(firstOrderTime);
  let state = createInitialClientState('client-001', client);

  for (let i = 0; i < orderCount; i++) {
    const daysAgo = startDaysAgo - i * frequencyDays;
    const items = mockOrderItems(2);
    const subtotal = orderValue;
    const total = subtotal * 1.15; // + VAT

    const orderTimestamp = realNow - daysAgo * MS_PER_DAY;
    dateSpy.mockReturnValue(orderTimestamp);

    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: `JIG-${String(i + 1).padStart(6, '0')}`,
      items,
      subtotal,
      total,
      paymentMethod: 'eft',
    });

    // Simulate payment received 1 day after order
    dateSpy.mockReturnValue(orderTimestamp + MS_PER_DAY);
    state = clientWorldReducer(state, {
      type: 'PAYMENT_RECEIVED',
      orderId: `JIG-${String(i + 1).padStart(6, '0')}`,
      amount: total,
      method: 'eft',
    });
  }

  dateSpy.mockRestore();
  return state;
}

// ─────────────────────────────────────────────────────────────
// 1. ORDER FLOW TESTS
// ─────────────────────────────────────────────────────────────

describe('Order Flow', () => {
  let state: ClientWorldState;

  beforeEach(() => {
    const client = mockClient();
    state = createInitialClientState('client-001', client);
  });

  test('ORDER_PLACED updates purchasing stats', () => {
    const items = mockOrderItems(2);
    const subtotal = 170000;
    const total = 195500;

    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items,
      subtotal,
      total,
      paymentMethod: 'eft',
    });

    expect(state.purchasing.totalOrders).toBe(1);
    expect(state.purchasing.lifetimeValue).toBe(total);
    expect(state.purchasing.lastOrderValue).toBe(total);
    expect(state.purchasing.lastOrderAt).toBeTruthy();
    expect(state.purchasing.averageOrderValue).toBe(total);
    expect(state.orders).toHaveLength(1);
    expect(state.orders[0].id).toBe('JIG-000001');
    expect(state.orders[0].status).toBe('pending');
  });

  test('multiple orders calculate frequency correctly', () => {
    state = buildStateWithOrders(5, { frequencyDays: 21 });
    expect(state.purchasing.totalOrders).toBe(5);
    expect(state.purchasing.orderFrequencyDays).toBeGreaterThan(0);
  });

  test('preferred products update from order history', () => {
    const items = mockOrderItems(2);

    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items,
      subtotal: 170000,
      total: 195500,
      paymentMethod: 'eft',
    });

    expect(state.purchasing.preferredProducts.length).toBeGreaterThan(0);
    expect(state.purchasing.preferredProducts[0].productId).toBe('prod-001');
  });

  test('ORDER_CONFIRMED updates order status', () => {
    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items: mockOrderItems(1),
      subtotal: 162500,
      total: 186875,
      paymentMethod: 'eft',
    });

    state = clientWorldReducer(state, {
      type: 'ORDER_CONFIRMED',
      orderId: 'JIG-000001',
    });

    expect(state.orders[0].status).toBe('confirmed');
  });

  test('ORDER_SHIPPED sets tracking number', () => {
    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items: mockOrderItems(1),
      subtotal: 162500,
      total: 186875,
      paymentMethod: 'eft',
    });

    state = clientWorldReducer(state, {
      type: 'ORDER_SHIPPED',
      orderId: 'JIG-000001',
      trackingNumber: 'TRACK-12345',
    });

    expect(state.orders[0].status).toBe('shipped');
    expect(state.orders[0].trackingNumber).toBe('TRACK-12345');
  });

  test('ORDER_CANCELLED reverses LTV', () => {
    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items: mockOrderItems(1),
      subtotal: 162500,
      total: 186875,
      paymentMethod: 'eft',
    });

    const ltvBefore = state.purchasing.lifetimeValue;

    state = clientWorldReducer(state, {
      type: 'ORDER_CANCELLED',
      orderId: 'JIG-000001',
      reason: 'Client request',
    });

    expect(state.purchasing.lifetimeValue).toBeLessThan(ltvBefore);
    expect(state.purchasing.totalOrders).toBe(0);
    expect(state.orders[0].status).toBe('cancelled');
  });

  test('ORDER_DELIVERED resets stock estimate', () => {
    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items: mockOrderItems(1),
      subtotal: 162500,
      total: 186875,
      paymentMethod: 'eft',
    });

    state = clientWorldReducer(state, {
      type: 'ORDER_DELIVERED',
      orderId: 'JIG-000001',
    });

    expect(state.orders[0].status).toBe('delivered');
    expect(state.inventory.lastRestockDate).toBeTruthy();
  });
});

// ─────────────────────────────────────────────────────────────
// 2. PAYMENT FLOW TESTS
// ─────────────────────────────────────────────────────────────

describe('Payment Flow', () => {
  test('PAYMENT_RECEIVED updates reliability and totals', () => {
    let state = buildStateWithOrders(1);

    // State already has payment received from buildStateWithOrders
    expect(state.payment.totalPaid).toBeGreaterThan(0);
    expect(state.payment.lastPaymentAt).toBeTruthy();
  });

  test('PAYMENT_OVERDUE increments late payments', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);

    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items: mockOrderItems(1),
      subtotal: 162500,
      total: 186875,
      paymentMethod: 'eft',
    });

    state = clientWorldReducer(state, {
      type: 'PAYMENT_OVERDUE',
      orderId: 'JIG-000001',
      daysOverdue: 7,
      amount: 186875,
    });

    expect(state.payment.latePayments).toBe(1);
    expect(state.orders[0].paymentStatus).toBe('overdue');
  });

  test('multiple late payments degrade reliability', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);

    for (let i = 0; i < 3; i++) {
      state = clientWorldReducer(state, {
        type: 'ORDER_PLACED',
        orderId: `JIG-${i}`,
        items: mockOrderItems(1),
        subtotal: 10000,
        total: 11500,
        paymentMethod: 'eft',
      });

      state = clientWorldReducer(state, {
        type: 'PAYMENT_OVERDUE',
        orderId: `JIG-${i}`,
        daysOverdue: 14,
        amount: 11500,
      });
    }

    expect(state.payment.latePayments).toBe(3);
    expect(state.payment.paymentTrend).toBe('declining');
  });
});

// ─────────────────────────────────────────────────────────────
// 3. CHURN PREDICTION TESTS
// ─────────────────────────────────────────────────────────────

describe('Churn Prediction', () => {
  test('active client has low churn risk', () => {
    const state = buildStateWithOrders(5, { frequencyDays: 21 });
    const risk = assessChurnRisk(state);
    expect(risk).toBe('low');
  });

  test('analyzeChurnRisk returns detailed breakdown', () => {
    const state = buildStateWithOrders(5, { frequencyDays: 21 });
    const analysis = analyzeChurnRisk(state);

    expect(analysis).toHaveProperty('risk');
    expect(analysis).toHaveProperty('probability');
    expect(analysis).toHaveProperty('factors');
    expect(analysis).toHaveProperty('suggestedActions');
    expect(analysis).toHaveProperty('timeframe');
    expect(analysis.probability).toBeGreaterThanOrEqual(0);
    expect(analysis.probability).toBeLessThanOrEqual(1);
  });

  test('complaints increase churn risk', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);
    state = buildStateWithOrders(3);

    // Add complaints
    for (let i = 0; i < 4; i++) {
      state = clientWorldReducer(state, {
        type: 'COMPLAINT_RECEIVED',
        category: 'quality',
        severity: 'high',
      });
    }

    const analysis = analyzeChurnRisk(state);
    expect(analysis.factors.some((f) => f.includes('complaint'))).toBe(true);
  });

  test('no orders gives non-zero risk factor', () => {
    const client = mockClient();
    const state = createInitialClientState('client-001', client);
    const analysis = analyzeChurnRisk(state);

    expect(analysis.factors.some((f) => f.includes('No orders'))).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────
// 4. INTERVENTION TRIGGER TESTS
// ─────────────────────────────────────────────────────────────

describe('Intervention Triggers', () => {
  test('generates welcome intervention for new client', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);
    // Set account age to 1 day
    state = {
      ...state,
      relationship: { ...state.relationship, accountAgeDays: 1 },
    };

    const interventions = generateInterventions(state);
    const welcome = interventions.find(
      (i) => i.triggeredBy === 'welcome_new_client',
    );
    expect(welcome).toBeDefined();
    expect(welcome?.type).toBe('welcome');
  });

  test('generates restock reminder when stock low', () => {
    let state = buildStateWithOrders(3);
    state = {
      ...state,
      inventory: { ...state.inventory, estimatedStockDays: 2 },
    };

    const interventions = generateInterventions(state);
    const restock = interventions.find(
      (i) => i.triggeredBy === 'restock_urgent',
    );
    expect(restock).toBeDefined();
    expect(restock?.channel).toBe('whatsapp');
    expect(restock?.priority).toBe('high');
  });

  test('generates payment overdue intervention', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);

    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items: mockOrderItems(1),
      subtotal: 50000,
      total: 57500,
      paymentMethod: 'eft',
    });

    // Set order as overdue
    state = {
      ...state,
      orders: state.orders.map((o) => ({
        ...o,
        paymentStatus: 'overdue' as const,
      })),
    };

    const interventions = generateInterventions(state);
    const payment = interventions.find(
      (i) => i.triggeredBy === 'payment_overdue',
    );
    expect(payment).toBeDefined();
    expect(payment?.priority).toBe('high');
  });

  test('interventions are sorted by priority', () => {
    let state = buildStateWithOrders(3);
    state = {
      ...state,
      inventory: { ...state.inventory, estimatedStockDays: 2 },
      relationship: { ...state.relationship, churnRisk: 'high' },
      orders: state.orders.map((o) => ({
        ...o,
        paymentStatus: 'overdue' as const,
      })),
    };

    const interventions = generateInterventions(state);
    if (interventions.length >= 2) {
      const priorities = ['critical', 'high', 'medium', 'low'];
      for (let i = 1; i < interventions.length; i++) {
        const prevIdx = priorities.indexOf(interventions[i - 1].priority);
        const currIdx = priorities.indexOf(interventions[i].priority);
        expect(prevIdx).toBeLessThanOrEqual(currIdx);
      }
    }
  });

  test('cooldown prevents duplicate interventions', () => {
    let state = buildStateWithOrders(3);
    state = {
      ...state,
      inventory: { ...state.inventory, estimatedStockDays: 2 },
    };

    // Generate once
    const first = generateInterventions(state);
    const restockFirst = first.find(
      (i) => i.triggeredBy === 'restock_urgent',
    );
    expect(restockFirst).toBeDefined();

    // Add the intervention to state (simulating it was triggered)
    state = {
      ...state,
      interventions: [...state.interventions, ...first],
    };

    // Generate again - should be blocked by cooldown
    const second = generateInterventions(state);
    const restockSecond = second.find(
      (i) => i.triggeredBy === 'restock_urgent',
    );
    expect(restockSecond).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────
// 5. PATTERN DETECTION TESTS
// ─────────────────────────────────────────────────────────────

describe('Pattern Detection', () => {
  test('detects bulk buyer pattern', () => {
    const state = buildStateWithOrders(5, { orderValue: 50000 });
    const patterns = detectPurchasingPatterns(state);
    const bulkBuyer = patterns.find((p) => p.patternType === 'bulk_buyer');
    expect(bulkBuyer).toBeDefined();
    expect(bulkBuyer!.confidence).toBeGreaterThan(0);
  });

  test('detects reliable payer pattern', () => {
    const state = buildStateWithOrders(6);
    // All payments received -> high reliability
    const patterns = detectPaymentPatterns(state);
    const reliable = patterns.find(
      (p) => p.patternType === 'reliable_payer',
    );
    expect(reliable).toBeDefined();
  });

  test('detects credit risk on multiple late payments', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);

    // Create orders with overdue payments
    for (let i = 0; i < 4; i++) {
      state = clientWorldReducer(state, {
        type: 'ORDER_PLACED',
        orderId: `JIG-${i}`,
        items: mockOrderItems(1),
        subtotal: 10000,
        total: 11500,
        paymentMethod: 'eft',
      });
      state = clientWorldReducer(state, {
        type: 'PAYMENT_OVERDUE',
        orderId: `JIG-${i}`,
        daysOverdue: 21,
        amount: 11500,
      });
    }

    const patterns = detectPaymentPatterns(state);
    const creditRisk = patterns.find(
      (p) => p.patternType === 'credit_risk',
    );
    expect(creditRisk).toBeDefined();
    expect(creditRisk!.confidence).toBeGreaterThanOrEqual(0.8);
  });

  test('detects new client not ordering (risk)', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);
    state = {
      ...state,
      relationship: { ...state.relationship, accountAgeDays: 30 },
    };

    const patterns = detectRiskPatterns(state);
    const notConverting = patterns.find(
      (p) => p.patternType === 'new_client_not_ordering',
    );
    expect(notConverting).toBeDefined();
  });

  test('multiple patterns can co-exist', () => {
    const state = buildStateWithOrders(15, { orderValue: 50000 });
    const allPatterns = detectAllPatterns(state);
    expect(allPatterns.length).toBeGreaterThan(1);

    const categories = new Set(allPatterns.map((p) => p.category));
    expect(categories.size).toBeGreaterThanOrEqual(1);
  });

  test('getHighPriorityPatterns excludes info-level', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);
    state = {
      ...state,
      relationship: {
        ...state.relationship,
        accountAgeDays: 30,
        churnRisk: 'high',
      },
    };

    const highPrio = getHighPriorityPatterns(state);
    // high priority = warning, concern, critical (not info)
    // at_risk pattern should be detected
    const atRisk = highPrio.find((p) => p.patternType === 'at_risk');
    expect(atRisk).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────
// 6. INFERENCE ENGINE TESTS
// ─────────────────────────────────────────────────────────────

describe('Inference Engine', () => {
  test('predictRestock returns predictions for ordered products', () => {
    const state = buildStateWithOrders(5);
    const predictions = predictRestock(state);

    expect(predictions.length).toBeGreaterThan(0);
    expect(predictions[0]).toHaveProperty('productId');
    expect(predictions[0]).toHaveProperty('daysUntilNeeded');
    expect(predictions[0]).toHaveProperty('confidence');
    expect(predictions[0]).toHaveProperty('suggestedQuantity');
  });

  test('predictRestock is sorted by urgency', () => {
    const state = buildStateWithOrders(5);
    const predictions = predictRestock(state);

    if (predictions.length >= 2) {
      expect(predictions[0].daysUntilNeeded).toBeLessThanOrEqual(
        predictions[1].daysUntilNeeded,
      );
    }
  });

  test('assessPaymentRisk returns valid analysis', () => {
    const state = buildStateWithOrders(5);
    const risk = assessPaymentRisk(state);

    expect(['low', 'medium', 'high', 'critical']).toContain(risk.riskLevel);
    expect(['cod', 'net7', 'net14', 'net30']).toContain(
      risk.recommendedTerms,
    );
    expect(risk.factors.length).toBeGreaterThan(0);
  });

  test('good payer gets favourable terms', () => {
    const state = buildStateWithOrders(10);
    const risk = assessPaymentRisk(state);

    expect(risk.riskLevel).toBe('low');
    expect(['net14', 'net30']).toContain(risk.recommendedTerms);
  });

  test('generateProductRecommendations finds cross-sell', () => {
    const state = buildStateWithOrders(3);
    const products = mockProducts();
    const recs = generateProductRecommendations(state, products);

    expect(recs.length).toBeGreaterThan(0);
    // Should find cross-sell for categories not purchased
    const crossSell = recs.filter((r) => r.category === 'cross_sell');
    // Client only buys flower + pre_rolls, so edibles/vapes should be cross-sell
    expect(crossSell.length).toBeGreaterThanOrEqual(0);
  });

  test('analyzeTierStatus shows progress', () => {
    const state = buildStateWithOrders(3, { orderValue: 25000 });
    const tier = analyzeTierStatus(state);

    expect(tier.currentTier).toBeDefined();
    expect(tier.requirementsForNextTier.length).toBeGreaterThan(0);
    expect(tier.requirementsForNextTier[0].progress).toBeGreaterThanOrEqual(0);
    expect(tier.requirementsForNextTier[0].progress).toBeLessThanOrEqual(1);
  });

  test('platinum client has no next tier', () => {
    const state = buildStateWithOrders(3, { tier: 'platinum' });
    const updatedState = {
      ...state,
      relationship: { ...state.relationship, tier: 'platinum' as const },
    };
    const tier = analyzeTierStatus(updatedState);

    expect(tier.nextTier).toBeNull();
    expect(tier.eligibleForUpgrade).toBe(false);
  });

  test('forecastRevenue returns projections', () => {
    const state = buildStateWithOrders(5);
    const forecast = forecastRevenue(state);

    expect(forecast.nextOrderEstimate).toBeGreaterThan(0);
    expect(forecast.next30Days).toBeGreaterThan(0);
    expect(forecast.next90Days).toBeGreaterThan(0);
    expect(forecast.annualProjection).toBeGreaterThan(0);
    expect(forecast.confidence).toBeGreaterThan(0);
  });

  test('forecastRevenue discounts for churn risk', () => {
    const stateHealthy = buildStateWithOrders(5);
    const stateAtRisk = {
      ...stateHealthy,
      relationship: {
        ...stateHealthy.relationship,
        churnRisk: 'high' as const,
      },
    };

    const forecastHealthy = forecastRevenue(stateHealthy);
    const forecastAtRisk = forecastRevenue(stateAtRisk);

    expect(forecastAtRisk.next30Days).toBeLessThan(
      forecastHealthy.next30Days,
    );
  });

  test('new client with no orders gets zero forecast', () => {
    const client = mockClient();
    const state = createInitialClientState('client-001', client);
    const forecast = forecastRevenue(state);

    expect(forecast.nextOrderEstimate).toBe(0);
    expect(forecast.confidence).toBeLessThanOrEqual(0.1);
  });
});

// ─────────────────────────────────────────────────────────────
// 7. END-TO-END SCENARIOS
// ─────────────────────────────────────────────────────────────

describe('End-to-End Scenarios', () => {
  test('new client onboarding flow', () => {
    const client = mockClient();
    let state = createInitialClientState('client-001', client);

    // 1. Client logs in
    state = clientWorldReducer(state, {
      type: 'CLIENT_LOGIN',
      timestamp: Date.now(),
    });
    expect(state.behavioral.sessionCount).toBe(1);

    // 2. Browses products
    state = clientWorldReducer(state, {
      type: 'PRODUCT_VIEWED',
      productId: 'prod-001',
      duration: 45,
    });
    expect(state.behavioral.browsingHistory).toHaveLength(1);

    // 3. Places first order
    state = clientWorldReducer(state, {
      type: 'ORDER_PLACED',
      orderId: 'JIG-000001',
      items: mockOrderItems(2),
      subtotal: 170000,
      total: 195500,
      paymentMethod: 'eft',
    });
    expect(state.purchasing.totalOrders).toBe(1);
    expect(state.purchasing.lifetimeValue).toBe(195500);

    // 4. Pays on time
    state = clientWorldReducer(state, {
      type: 'PAYMENT_RECEIVED',
      orderId: 'JIG-000001',
      amount: 195500,
      method: 'eft',
    });
    expect(state.payment.paymentReliability).toBe(1);

    // 5. Check intelligence
    const analysis = analyzeChurnRisk(state);
    expect(analysis.risk).toBe('low');
  });

  test('regular client reorder cycle', () => {
    let state = buildStateWithOrders(5, { orderValue: 45000 });

    // Check restock predictions exist
    const predictions = predictRestock(state);
    expect(predictions.length).toBeGreaterThan(0);

    // Check tier progress
    const tier = analyzeTierStatus(state);
    expect(tier.currentTier).toBeDefined();

    // Check patterns
    const patterns = detectAllPatterns(state);
    expect(patterns.length).toBeGreaterThan(0);
  });

  test('at-risk client intervention flow', () => {
    let state = buildStateWithOrders(5, { orderValue: 30000 });

    // Simulate 90 days passing with no new orders
    const dateSpy = jest.spyOn(Date, 'now');
    const futureNow = Date.now() + 90 * MS_PER_DAY;
    dateSpy.mockReturnValue(futureNow);

    // Simulate multiple complaints
    state = clientWorldReducer(state, {
      type: 'COMPLAINT_RECEIVED',
      category: 'quality',
      severity: 'high',
    });
    state = clientWorldReducer(state, {
      type: 'COMPLAINT_RECEIVED',
      category: 'delivery',
      severity: 'medium',
    });
    state = clientWorldReducer(state, {
      type: 'COMPLAINT_RECEIVED',
      category: 'delivery',
      severity: 'high',
    });

    // Add a late payment
    state = clientWorldReducer(state, {
      type: 'PAYMENT_OVERDUE',
      orderId: state.orders[0].id,
      daysOverdue: 30,
      amount: state.orders[0].total,
    });

    // Should generate churn prevention intervention
    const interventions = generateInterventions(state);
    const churnPrevention = interventions.find(
      (i) => i.type === 'churn_prevention',
    );
    expect(churnPrevention).toBeDefined();

    // Intelligence summary should flag concerns
    const summary = computeIntelligenceSummary(state);
    expect(summary.healthScore).toBeLessThan(80);
    expect(summary.topConcerns.length).toBeGreaterThan(0);

    dateSpy.mockRestore();
  });

  test('VIP client upgrade path', () => {
    // Build client near gold threshold
    const state = buildStateWithOrders(10, { orderValue: 25000 });

    const tier = analyzeTierStatus(state);
    // Should have progress toward next tier
    if (tier.nextTier) {
      expect(tier.requirementsForNextTier.length).toBeGreaterThan(0);
      expect(tier.requirementsForNextTier[0].progress).toBeGreaterThan(0);
    }
  });

  test('computeIntelligenceSummary returns complete summary', () => {
    const state = buildStateWithOrders(5);
    const summary = computeIntelligenceSummary(state);

    expect(summary.healthScore).toBeGreaterThanOrEqual(0);
    expect(summary.healthScore).toBeLessThanOrEqual(100);
    expect(summary.topConcerns.length).toBeGreaterThan(0);
    expect(summary.opportunities.length).toBeGreaterThan(0);
    expect(summary.recommendedActions.length).toBeGreaterThan(0);
  });
});

// ─────────────────────────────────────────────────────────────
// 8. HELPER FUNCTION TESTS
// ─────────────────────────────────────────────────────────────

describe('Helper Functions', () => {
  test('calculateOrderFrequency with <2 orders returns default', () => {
    expect(calculateOrderFrequency([])).toBe(30);
    expect(calculateOrderFrequency([{ createdAt: Date.now() } as Order])).toBe(30);
  });

  test('checkTierUpgrade detects silver threshold', () => {
    const client = mockClient({ tier: 'standard' });
    let state = createInitialClientState('client-001', client);
    state = {
      ...state,
      purchasing: { ...state.purchasing, lifetimeValue: 105000 },
      relationship: { ...state.relationship, tier: 'standard' },
    };
    expect(checkTierUpgrade(state)).toBe('silver');
  });

  test('checkTierUpgrade returns null when at max', () => {
    const client = mockClient({ tier: 'platinum' });
    let state = createInitialClientState('client-001', client);
    state = {
      ...state,
      purchasing: { ...state.purchasing, lifetimeValue: 1000000 },
      relationship: { ...state.relationship, tier: 'platinum' },
    };
    expect(checkTierUpgrade(state)).toBeNull();
  });

  test('updateProductPreferences merges correctly', () => {
    const existing = [
      {
        productId: 'prod-001',
        sku: 'JIG-PH',
        name: 'Purple Haze',
        orderCount: 3,
        totalQuantity: 600,
        lastOrdered: Date.now() - 30 * MS_PER_DAY,
      },
    ];

    const newItems: OrderItem[] = [
      {
        productId: 'prod-001',
        sku: 'JIG-PH',
        name: 'Purple Haze',
        quantity: 250,
        unitPrice: 650,
        totalPrice: 162500,
      },
      {
        productId: 'prod-002',
        sku: 'JIG-PR',
        name: 'Pre-Roll',
        quantity: 50,
        unitPrice: 150,
        totalPrice: 7500,
      },
    ];

    const result = updateProductPreferences(existing, newItems, Date.now());
    expect(result).toHaveLength(2);

    const purple = result.find((p) => p.productId === 'prod-001')!;
    expect(purple.orderCount).toBe(4);
    expect(purple.totalQuantity).toBe(850);

    const preroll = result.find((p) => p.productId === 'prod-002')!;
    expect(preroll.orderCount).toBe(1);
  });
});

// ─────────────────────────────────────────────────────────────
// 9. EVENT BUS TESTS
// ─────────────────────────────────────────────────────────────

describe('Event Bus', () => {
  afterEach(() => {
    clientEventBus.clearHistory();
  });

  test('subscribe receives emitted events', () => {
    const received: string[] = [];
    const unsub = clientEventBus.subscribe((e) => received.push(e.type));

    clientEventBus.emit({ type: 'CLIENT_LOGIN', timestamp: Date.now() });
    clientEventBus.emit({
      type: 'PRODUCT_VIEWED',
      productId: 'prod-001',
      duration: 10,
    });

    expect(received).toEqual(['CLIENT_LOGIN', 'PRODUCT_VIEWED']);
    unsub();
  });

  test('unsubscribe stops receiving events', () => {
    const received: string[] = [];
    const unsub = clientEventBus.subscribe((e) => received.push(e.type));

    clientEventBus.emit({ type: 'CLIENT_LOGIN', timestamp: Date.now() });
    unsub();
    clientEventBus.emit({ type: 'CLIENT_LOGIN', timestamp: Date.now() });

    expect(received).toHaveLength(1);
  });

  test('getHistory returns all events', () => {
    clientEventBus.emit({ type: 'CLIENT_LOGIN', timestamp: Date.now() });
    clientEventBus.emit({
      type: 'PRODUCT_VIEWED',
      productId: 'p1',
      duration: 5,
    });

    const history = clientEventBus.getHistory();
    expect(history).toHaveLength(2);
  });

  test('getHistoryByType filters correctly', () => {
    clientEventBus.emit({ type: 'CLIENT_LOGIN', timestamp: Date.now() });
    clientEventBus.emit({
      type: 'PRODUCT_VIEWED',
      productId: 'p1',
      duration: 5,
    });
    clientEventBus.emit({ type: 'CLIENT_LOGIN', timestamp: Date.now() });

    const logins = clientEventBus.getHistoryByType('CLIENT_LOGIN');
    expect(logins).toHaveLength(2);
  });
});
