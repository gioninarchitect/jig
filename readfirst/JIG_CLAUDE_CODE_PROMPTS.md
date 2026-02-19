# JIG Craft Cannabis - Claude Code Prompt Series
## HEADCASE EVOLVE Implementation for Wholesale Intelligence

---

# 📋 HOW TO USE

1. **Copy each prompt** into Claude Code sequentially
2. **Wait for completion** before moving to next phase
3. **Review generated code** before proceeding
4. **Test each phase** incrementally

---

# ⚡ THE GOLDEN RULE

> **All data must be database persistent, linked to working healthy API endpoints, bound to working action buttons and secondary tabs/components on UI. All dashboards and their subsections must be wired up. No assumptions can be made.**

### Every Phase Must Deliver:

| Layer | Requirement | Validation |
|-------|-------------|------------|
| **Database** | Real tables with schema | `SELECT * FROM table` works |
| **API** | Working endpoints | Postman/curl returns data |
| **UI Buttons** | Bound handlers | Click triggers API call |
| **Tabs/Sections** | All functional | No "Coming Soon" placeholders |
| **State** | Persistent | Refresh maintains data |

### Before Moving to Next Phase:

```bash
# Verify database
psql -c "SELECT COUNT(*) FROM client_world_state"

# Verify API
curl http://localhost:3000/api/intelligence/client/123

# Verify UI binding
# Click every button, check network tab for API calls
```

---

# 🎯 QUICK START (Single Prompt)

For rapid implementation, use this combined prompt:

```
Generate a complete HEADCASE EVOLVE intelligent wholesale system for JIG Craft Cannabis.

Business: B2B cannabis wholesale platform
Clients: Dispensaries, retailers, distributors in South Africa
Products: Flower, pre-rolls, edibles, concentrates, vapes, accessories

Generate these files in src/world-model/:

1. types.ts - Complete TypeScript types for:
   - Client entity with full business details
   - Product with pricing tiers and stock
   - Order with items, payment status, delivery
   - ClientWorldState with domains: purchasing, payment, inventory, relationship, behavioral
   - All events (ORDER_PLACED, PAYMENT_RECEIVED, CART_ABANDONED, etc.)
   - Intervention types for B2B wholesale

2. events.ts - Event bus with emitters for:
   - Order lifecycle (placed, confirmed, shipped, delivered, cancelled)
   - Payment events (received, overdue)
   - Engagement events (login, product viewed, cart abandoned)
   - Support events (ticket opened, complaint, feedback)

3. state.ts - State management with:
   - createInitialClientState(clientId) factory
   - Persistence layer
   - clientWorldReducer handling all events
   - Helpers: calculateOrderFrequency, predictRestockDate, calculateChurnRisk

4. inference.ts - Business intelligence with:
   - predictRestockNeeded(state) - when client needs to reorder
   - calculateChurnRisk(state) - likelihood of losing client
   - detectPaymentRisk(state) - credit/payment concerns
   - suggestProducts(state) - cross-sell opportunities
   - calculateTierEligibility(state) - upgrade recommendations

5. patterns.ts - B2B behavioral patterns:
   - PURCHASING_PATTERNS (bulk_buyer, price_sensitive, premium_preference, seasonal)
   - PAYMENT_PATTERNS (reliable_payer, slow_payer, credit_risk)
   - ENGAGEMENT_PATTERNS (active_browser, cart_abandoner, loyal_customer, at_risk)
   - detectAllPatterns() for client analysis

6. interventions.ts - Automated actions:
   - REORDER_REMINDER triggers
   - CHURN_PREVENTION triggers
   - PAYMENT_REMINDER triggers
   - UPSELL_OPPORTUNITY triggers
   - generateInterventions(state) returning prioritized list

7. ClientWorldContext.tsx - React context with:
   - ClientWorldProvider component
   - Computed: churnRisk, restockPredictions, recommendations, tierStatus
   - useClientWorld() main hook
   - Specialized hooks for each domain

8. index.ts - Barrel exports

9. system-prompt.md - JIG AI Assistant constraints

Follow B2B wholesale patterns: payment terms, bulk pricing, credit management.
Include South African business context (VAT, EFT payments, POPIA compliance).
```

---

# 📦 PHASED APPROACH (Recommended)

## PHASE 1: TYPES & ENTITIES

### Prompt 1.1 - Core Business Types
```
Generate src/world-model/types.ts for JIG Cannabis wholesale platform.

Include:

1. PRIMITIVE TYPES
```typescript
// Client classification
export type ClientTier = 'standard' | 'silver' | 'gold' | 'platinum';
export type ClientStatus = 'pending' | 'active' | 'suspended' | 'churned';
export type ClientType = 'dispensary' | 'retailer' | 'distributor' | 'cafe' | 'online_store';

// Payment
export type PaymentTerms = 'cod' | 'net7' | 'net14' | 'net30';
export type PaymentStatus = 'pending' | 'partial' | 'paid' | 'overdue' | 'refunded';
export type PaymentMethod = 'eft' | 'card' | 'cash' | 'credit';

// Order
export type OrderStatus = 'pending' | 'confirmed' | 'processing' | 'shipped' | 'delivered' | 'cancelled';

// Product
export type ProductCategory = 'flower' | 'pre_rolls' | 'edibles' | 'concentrates' | 'vapes' | 'accessories';
export type StrainType = 'sativa' | 'indica' | 'hybrid' | 'na';
export type StockStatus = 'available' | 'low' | 'out';

// Intelligence
export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';
export type InterventionType = 'reorder_reminder' | 'churn_prevention' | 'payment_reminder' | 'upsell' | 'welcome' | 'win_back' | 'vip_offer';
export type InterventionChannel = 'email' | 'sms' | 'in_app' | 'whatsapp' | 'sales_call';
export type InterventionPriority = 'low' | 'medium' | 'high' | 'critical';
```

2. ADDRESS TYPE
```typescript
export interface Address {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  country: string; // default: 'South Africa'
}
```

3. CLIENT ENTITY
```typescript
export interface Client {
  id: string;
  companyName: string;
  tradingName?: string;
  registrationNumber?: string;
  vatNumber?: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: Address;
  deliveryAddress?: Address;
  clientType: ClientType;
  tier: ClientTier;
  creditLimit: number;
  paymentTerms: PaymentTerms;
  status: ClientStatus;
  createdAt: number;
  lastActiveAt: number;
}
```

4. PRODUCT ENTITY
```typescript
export interface PriceTier {
  minQuantity: number;
  price: number;
  tierName: string;
}

export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  strain?: StrainType;
  thcContent?: string;
  cbdContent?: string;
  description?: string;
  unit: 'grams' | 'units' | 'packs' | 'boxes' | 'cases';
  stockQuantity: number;
  reorderPoint: number;
  costPrice: number;
  priceTiers: PriceTier[];
  isActive: boolean;
  createdAt: number;
  updatedAt: number;
}
```

5. ORDER ENTITY
```typescript
export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export interface Order {
  id: string; // format: JIG-XXXXXX
  clientId: string;
  items: OrderItem[];
  subtotal: number;
  vatAmount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentDueDate?: number;
  paidAt?: number;
  deliveryAddress: Address;
  deliveryNotes?: string;
  trackingNumber?: string;
  createdAt: number;
  updatedAt: number;
}
```

6. INTELLIGENCE TYPES
```typescript
export interface ProductPreference {
  productId: string;
  sku: string;
  name: string;
  orderCount: number;
  totalQuantity: number;
  lastOrdered: number;
}

export interface StockAlert {
  productId: string;
  productName: string;
  estimatedDaysRemaining: number;
  suggestedQuantity: number;
}

export interface ReorderPrediction {
  productId: string;
  productName: string;
  predictedDate: number;
  confidence: number;
  suggestedQuantity: number;
}

export interface ClientPattern {
  id: string;
  clientId: string;
  patternType: string;
  category: 'purchasing' | 'payment' | 'engagement' | 'risk';
  frequency: number;
  confidence: number;
  lastDetected: number;
  evidence?: string;
}

export interface Intervention {
  id: string;
  clientId: string;
  type: InterventionType;
  channel: InterventionChannel;
  priority: InterventionPriority;
  triggeredBy: string;
  message: string;
  status: 'pending' | 'sent' | 'opened' | 'clicked' | 'converted' | 'ignored';
  triggeredAt: number;
  respondedAt?: number;
  outcome?: 'success' | 'partial' | 'failed' | 'pending';
}
```

Add JSDoc comments for all types.
```

### Prompt 1.2 - World State Types
```
Continue src/world-model/types.ts with Client World State:

1. DOMAIN STATE INTERFACES

```typescript
// Purchasing behavior
export interface PurchasingState {
  lifetimeValue: number;
  totalOrders: number;
  averageOrderValue: number;
  lastOrderAt: number | null;
  lastOrderValue: number;
  orderFrequencyDays: number;
  preferredProducts: ProductPreference[];
  preferredCategories: ProductCategory[];
  pricePointSensitivity: 'budget' | 'mid' | 'premium' | 'mixed';
  bulkBuyer: boolean;
  seasonalPattern: string | null;
}

// Payment behavior
export interface PaymentState {
  totalPaid: number;
  outstandingBalance: number;
  paymentReliability: number; // 0-1
  averageDaysToPayment: number;
  latePayments: number;
  creditUtilization: number;
  lastPaymentAt: number | null;
  paymentTrend: 'improving' | 'stable' | 'declining';
}

// Estimated client inventory
export interface InventoryState {
  estimatedStockDays: number;
  lastRestockDate: number | null;
  averageConsumptionRate: number;
  stockAlerts: StockAlert[];
  reorderPredictions: ReorderPrediction[];
}

// Client relationship health
export interface RelationshipState {
  accountAgeDays: number;
  tier: ClientTier;
  satisfactionScore: number; // 1-10
  supportTickets: number;
  complaintsCount: number;
  npsScore: number | null;
  churnRisk: ChurnRisk;
  lastContactAt: number | null;
  assignedSalesRep: string | null;
}

// Engagement patterns
export interface BrowsingEvent {
  productId: string;
  timestamp: number;
  durationSeconds: number;
  addedToCart: boolean;
}

export interface BehavioralState {
  preferredOrderDay: 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday' | 'no_pattern';
  preferredOrderTime: 'morning' | 'afternoon' | 'evening' | 'no_pattern';
  browsingHistory: BrowsingEvent[];
  cartAbandonment: number;
  cartAbandonmentValue: number;
  emailOpenRate: number;
  promotionResponseRate: number;
  lastLoginAt: number | null;
  sessionCount: number;
  averageSessionMinutes: number;
}
```

2. MAIN CLIENT WORLD STATE
```typescript
export interface ClientWorldState {
  // Identity
  clientId: string;
  client: Client;
  createdAt: number;
  lastUpdated: number;

  // Domain slices
  purchasing: PurchasingState;
  payment: PaymentState;
  inventory: InventoryState;
  relationship: RelationshipState;
  behavioral: BehavioralState;

  // Active data
  patterns: ClientPattern[];
  interventions: Intervention[];
  orders: Order[];
}
```

3. EVENT TYPES
```typescript
export type ClientWorldEvent =
  // Order events
  | { type: 'ORDER_PLACED'; orderId: string; items: OrderItem[]; subtotal: number; total: number; paymentMethod: PaymentMethod }
  | { type: 'ORDER_CONFIRMED'; orderId: string }
  | { type: 'ORDER_SHIPPED'; orderId: string; trackingNumber: string }
  | { type: 'ORDER_DELIVERED'; orderId: string }
  | { type: 'ORDER_CANCELLED'; orderId: string; reason: string }
  
  // Payment events
  | { type: 'PAYMENT_RECEIVED'; orderId: string; amount: number; method: PaymentMethod }
  | { type: 'PAYMENT_OVERDUE'; orderId: string; daysOverdue: number; amount: number }
  
  // Engagement events
  | { type: 'CLIENT_LOGIN'; timestamp: number }
  | { type: 'PRODUCT_VIEWED'; productId: string; duration: number }
  | { type: 'CART_UPDATED'; items: OrderItem[]; totalValue: number }
  | { type: 'CART_ABANDONED'; items: OrderItem[]; totalValue: number }
  
  // Promotion events
  | { type: 'PROMOTION_SENT'; promotionId: string; channel: InterventionChannel }
  | { type: 'PROMOTION_RESPONDED'; promotionId: string; action: 'opened' | 'clicked' | 'ordered' | 'ignored' }
  
  // Support events
  | { type: 'SUPPORT_TICKET_OPENED'; ticketId: string; category: string; priority: string }
  | { type: 'COMPLAINT_RECEIVED'; category: string; severity: string }
  | { type: 'FEEDBACK_RECEIVED'; score: number; comment: string }
  
  // Pattern events
  | { type: 'PATTERN_DETECTED'; patternId: string; patternType: string; confidence: number }
  
  // Intervention events
  | { type: 'INTERVENTION_TRIGGERED'; intervention: Intervention }
  | { type: 'INTERVENTION_RESPONDED'; interventionId: string; outcome: string };
```

4. TYPE GUARDS
```typescript
export function isValidOrderStatus(status: string): status is OrderStatus {
  return ['pending', 'confirmed', 'processing', 'shipped', 'delivered', 'cancelled'].includes(status);
}

export function isValidClientTier(tier: string): tier is ClientTier {
  return ['standard', 'silver', 'gold', 'platinum'].includes(tier);
}

export function isValidChurnRisk(risk: string): risk is ChurnRisk {
  return ['low', 'medium', 'high', 'critical'].includes(risk);
}
```
```

---

## PHASE 2: EVENTS & STATE

### Prompt 2.1 - Event Bus
```
Generate src/world-model/events.ts for JIG wholesale platform:

1. EVENT BUS CLASS
```typescript
import { ClientWorldEvent } from './types';

type EventListener = (event: ClientWorldEvent) => void;

class ClientEventBus {
  private listeners: Set<EventListener> = new Set();
  private eventHistory: ClientWorldEvent[] = [];
  private maxHistory = 500; // More history for B2B analytics

  subscribe(listener: EventListener): () => void
  emit(event: ClientWorldEvent): void
  getHistory(): ClientWorldEvent[]
  getHistoryByType(type: string): ClientWorldEvent[]
  getHistoryByClient(clientId: string): ClientWorldEvent[]
  clearHistory(): void
  getSubscriberCount(): number
}

export const clientEventBus = new ClientEventBus();
```

2. ORDER EVENT EMITTERS
```typescript
export function emitOrderPlaced(
  orderId: string,
  items: OrderItem[],
  subtotal: number,
  total: number,
  paymentMethod: PaymentMethod
): void

export function emitOrderConfirmed(orderId: string): void

export function emitOrderShipped(orderId: string, trackingNumber: string): void

export function emitOrderDelivered(orderId: string): void

export function emitOrderCancelled(orderId: string, reason: string): void
```

3. PAYMENT EVENT EMITTERS
```typescript
export function emitPaymentReceived(
  orderId: string,
  amount: number,
  method: PaymentMethod
): void

export function emitPaymentOverdue(
  orderId: string,
  daysOverdue: number,
  amount: number
): void
```

4. ENGAGEMENT EVENT EMITTERS
```typescript
export function emitClientLogin(): void

export function emitProductViewed(productId: string, duration: number): void

export function emitCartUpdated(items: OrderItem[], totalValue: number): void

export function emitCartAbandoned(items: OrderItem[], totalValue: number): void
```

5. PROMOTION EVENT EMITTERS
```typescript
export function emitPromotionSent(
  promotionId: string,
  channel: InterventionChannel
): void

export function emitPromotionResponded(
  promotionId: string,
  action: 'opened' | 'clicked' | 'ordered' | 'ignored'
): void
```

6. SUPPORT EVENT EMITTERS
```typescript
export function emitSupportTicketOpened(
  ticketId: string,
  category: string,
  priority: string
): void

export function emitComplaintReceived(category: string, severity: string): void

export function emitFeedbackReceived(score: number, comment: string): void
```

7. INTELLIGENCE EVENT EMITTERS
```typescript
export function emitPatternDetected(
  patternId: string,
  patternType: string,
  confidence: number
): void

export function emitInterventionTriggered(intervention: Intervention): void

export function emitInterventionResponded(interventionId: string, outcome: string): void
```

Include usage examples for order flow tracking.
```

### Prompt 2.2 - State Management
```
Generate src/world-model/state.ts for JIG wholesale:

1. STORAGE CONFIGURATION
```typescript
const STORAGE_KEY_PREFIX = '@jig_client_';
const getStorageKey = (clientId: string) => `${STORAGE_KEY_PREFIX}${clientId}`;
```

2. INITIAL STATE FACTORY
```typescript
export function createInitialClientState(clientId: string, client: Client): ClientWorldState {
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
      orderFrequencyDays: 30, // Default assumption
      preferredProducts: [],
      preferredCategories: [],
      pricePointSensitivity: 'mixed',
      bulkBuyer: false,
      seasonalPattern: null,
    },
    
    payment: {
      totalPaid: 0,
      outstandingBalance: 0,
      paymentReliability: 1, // Start optimistic
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
```

3. PERSISTENCE LAYER
```typescript
export async function saveClientState(state: ClientWorldState): Promise<void>
export async function loadClientState(clientId: string): Promise<ClientWorldState | null>
export async function clearClientState(clientId: string): Promise<void>
export async function getAllClientIds(): Promise<string[]>
```

4. MAIN REDUCER
```typescript
export function clientWorldReducer(
  state: ClientWorldState,
  event: ClientWorldEvent
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
    case 'CART_ABANDONED':
      return handleCartAbandoned(state, event, now);
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
    default:
      return state;
  }
}
```

5. EVENT HANDLERS

ORDER_PLACED handler:
- Add order to orders array
- Update purchasing.totalOrders
- Update purchasing.lifetimeValue
- Update purchasing.lastOrderAt, lastOrderValue
- Recalculate purchasing.averageOrderValue
- Recalculate purchasing.orderFrequencyDays
- Update purchasing.preferredProducts
- Detect preferredOrderDay from timestamp
- Update inventory.estimatedStockDays (add based on order)
- Check for tier upgrade eligibility

PAYMENT_RECEIVED handler:
- Update order paymentStatus
- Update payment.totalPaid
- Update payment.outstandingBalance
- Update payment.lastPaymentAt
- Recalculate payment.paymentReliability
- Calculate daysToPayment and update average
- Update payment.creditUtilization

PAYMENT_OVERDUE handler:
- Update order paymentStatus to 'overdue'
- Increment payment.latePayments
- Recalculate payment.paymentReliability
- Update relationship.churnRisk if multiple late payments

CART_ABANDONED handler:
- Increment behavioral.cartAbandonment
- Add to behavioral.cartAbandonmentValue
- Trigger cart recovery intervention

6. HELPER FUNCTIONS
```typescript
// Calculate average days between orders
function calculateOrderFrequency(orders: Order[]): number

// Estimate when client will need to reorder
function estimateStockDays(orders: Order[], lastDelivery: number): number

// Determine preferred order day from history
function detectPreferredOrderDay(orders: Order[]): string

// Calculate payment reliability score
function calculatePaymentReliability(orders: Order[]): number

// Determine churn risk level
function assessChurnRisk(state: ClientWorldState): ChurnRisk

// Check if client qualifies for tier upgrade
function checkTierUpgrade(state: ClientWorldState): ClientTier | null

// Update product preferences based on order history
function updateProductPreferences(
  current: ProductPreference[],
  newOrder: Order
): ProductPreference[]
```

Include tests for critical business logic.
```

---

## PHASE 3: BUSINESS INTELLIGENCE

### Prompt 3.1 - Pattern Detection
```
Generate src/world-model/patterns.ts for JIG wholesale business intelligence:

1. PATTERN DEFINITIONS
```typescript
interface PatternDefinition {
  id: string;
  name: string;
  category: 'purchasing' | 'payment' | 'engagement' | 'risk';
  detect: (state: ClientWorldState) => boolean;
  confidence: (state: ClientWorldState) => number;
  severity: 'info' | 'warning' | 'concern' | 'critical';
  suggestedAction?: string;
}
```

2. PURCHASING PATTERNS
```typescript
const PURCHASING_PATTERNS: PatternDefinition[] = [
  {
    id: 'bulk_buyer',
    name: 'Bulk Buyer',
    category: 'purchasing',
    detect: (state) => state.purchasing.averageOrderValue > 25000,
    confidence: (state) => Math.min(0.9, state.purchasing.totalOrders / 10),
    severity: 'info',
    suggestedAction: 'Offer pallet pricing and priority shipping',
  },
  {
    id: 'price_sensitive',
    name: 'Price Sensitive',
    category: 'purchasing',
    detect: (state) => state.purchasing.pricePointSensitivity === 'budget',
    confidence: (state) => 0.7,
    severity: 'info',
    suggestedAction: 'Highlight value deals and bundle pricing',
  },
  {
    id: 'premium_preference',
    name: 'Premium Product Preference',
    category: 'purchasing',
    detect: (state) => state.purchasing.pricePointSensitivity === 'premium',
    confidence: (state) => 0.7,
    severity: 'info',
    suggestedAction: 'Prioritize new premium strain releases',
  },
  {
    id: 'seasonal_buyer',
    name: 'Seasonal Purchasing Pattern',
    category: 'purchasing',
    detect: (state) => state.purchasing.seasonalPattern !== null,
    confidence: (state) => 0.6,
    severity: 'info',
    suggestedAction: 'Pre-season inventory planning outreach',
  },
  {
    id: 'category_focused',
    name: 'Category Focused',
    category: 'purchasing',
    detect: (state) => state.purchasing.preferredCategories.length === 1,
    confidence: (state) => 0.8,
    severity: 'info',
    suggestedAction: 'Cross-sell complementary categories',
  },
  {
    id: 'declining_orders',
    name: 'Declining Order Values',
    category: 'purchasing',
    detect: (state) => {
      const orders = state.orders.slice(-5);
      if (orders.length < 3) return false;
      return orders[orders.length - 1].total < orders[0].total * 0.7;
    },
    confidence: (state) => 0.75,
    severity: 'warning',
    suggestedAction: 'Personal outreach to understand changing needs',
  },
];
```

3. PAYMENT PATTERNS
```typescript
const PAYMENT_PATTERNS: PatternDefinition[] = [
  {
    id: 'reliable_payer',
    name: 'Reliable Payer',
    category: 'payment',
    detect: (state) => state.payment.paymentReliability >= 0.95,
    confidence: (state) => Math.min(0.9, state.purchasing.totalOrders / 5),
    severity: 'info',
    suggestedAction: 'Consider credit limit increase',
  },
  {
    id: 'slow_payer',
    name: 'Consistently Slow Payer',
    category: 'payment',
    detect: (state) => state.payment.averageDaysToPayment > 14 && state.payment.latePayments >= 2,
    confidence: (state) => 0.8,
    severity: 'warning',
    suggestedAction: 'Review payment terms, consider COD',
  },
  {
    id: 'credit_risk',
    name: 'Credit Risk',
    category: 'payment',
    detect: (state) => state.payment.paymentReliability < 0.6 && state.payment.latePayments >= 3,
    confidence: (state) => 0.85,
    severity: 'critical',
    suggestedAction: 'Suspend credit, require COD',
  },
  {
    id: 'improving_payment',
    name: 'Improving Payment Behavior',
    category: 'payment',
    detect: (state) => state.payment.paymentTrend === 'improving',
    confidence: (state) => 0.7,
    severity: 'info',
    suggestedAction: 'Acknowledge improvement, maintain relationship',
  },
  {
    id: 'high_credit_utilization',
    name: 'High Credit Utilization',
    category: 'payment',
    detect: (state) => state.payment.creditUtilization > 0.8,
    confidence: (state) => 0.9,
    severity: 'warning',
    suggestedAction: 'Review credit limit appropriateness',
  },
];
```

4. ENGAGEMENT PATTERNS
```typescript
const ENGAGEMENT_PATTERNS: PatternDefinition[] = [
  {
    id: 'active_browser',
    name: 'Active Browser',
    category: 'engagement',
    detect: (state) => state.behavioral.sessionCount > 10 && state.behavioral.averageSessionMinutes > 5,
    confidence: (state) => 0.8,
    severity: 'info',
    suggestedAction: 'Send personalized product recommendations',
  },
  {
    id: 'cart_abandoner',
    name: 'Frequent Cart Abandoner',
    category: 'engagement',
    detect: (state) => state.behavioral.cartAbandonment >= 3,
    confidence: (state) => 0.85,
    severity: 'warning',
    suggestedAction: 'Investigate barriers - price, stock, UX issues',
  },
  {
    id: 'loyal_customer',
    name: 'Loyal Customer',
    category: 'engagement',
    detect: (state) => 
      state.relationship.accountAgeDays > 365 && 
      state.purchasing.totalOrders >= 12 &&
      state.relationship.churnRisk === 'low',
    confidence: (state) => 0.9,
    severity: 'info',
    suggestedAction: 'VIP treatment, early access to new products',
  },
  {
    id: 'monday_orderer',
    name: 'Monday Orderer',
    category: 'engagement',
    detect: (state) => state.behavioral.preferredOrderDay === 'monday',
    confidence: (state) => 0.7,
    severity: 'info',
    suggestedAction: 'Send reminders Sunday evening',
  },
  {
    id: 'promotion_responsive',
    name: 'Promotion Responsive',
    category: 'engagement',
    detect: (state) => state.behavioral.promotionResponseRate > 0.5,
    confidence: (state) => 0.8,
    severity: 'info',
    suggestedAction: 'Include in promotional campaigns',
  },
  {
    id: 'disengaged',
    name: 'Disengaged',
    category: 'engagement',
    detect: (state) => {
      const daysSinceLogin = state.behavioral.lastLoginAt 
        ? (Date.now() - state.behavioral.lastLoginAt) / 86400000 
        : 999;
      return daysSinceLogin > 30;
    },
    confidence: (state) => 0.75,
    severity: 'warning',
    suggestedAction: 'Re-engagement campaign',
  },
];
```

5. RISK PATTERNS
```typescript
const RISK_PATTERNS: PatternDefinition[] = [
  {
    id: 'churn_imminent',
    name: 'Churn Imminent',
    category: 'risk',
    detect: (state) => state.relationship.churnRisk === 'critical',
    confidence: (state) => 0.9,
    severity: 'critical',
    suggestedAction: 'Immediate personal outreach from sales manager',
  },
  {
    id: 'at_risk',
    name: 'At Risk',
    category: 'risk',
    detect: (state) => state.relationship.churnRisk === 'high',
    confidence: (state) => 0.8,
    severity: 'concern',
    suggestedAction: 'Proactive sales call to understand concerns',
  },
  {
    id: 'satisfaction_declining',
    name: 'Satisfaction Declining',
    category: 'risk',
    detect: (state) => 
      state.relationship.complaintsCount > 0 || 
      state.relationship.satisfactionScore < 5,
    confidence: (state) => 0.85,
    severity: 'concern',
    suggestedAction: 'Customer success outreach',
  },
  {
    id: 'new_client_not_ordering',
    name: 'New Client Not Converting',
    category: 'risk',
    detect: (state) => 
      state.relationship.accountAgeDays > 14 && 
      state.relationship.accountAgeDays < 60 &&
      state.purchasing.totalOrders === 0,
    confidence: (state) => 0.7,
    severity: 'warning',
    suggestedAction: 'Onboarding follow-up call',
  },
];
```

6. DETECTION FUNCTIONS
```typescript
export function detectAllPatterns(state: ClientWorldState): ClientPattern[]
export function detectPurchasingPatterns(state: ClientWorldState): ClientPattern[]
export function detectPaymentPatterns(state: ClientWorldState): ClientPattern[]
export function detectEngagementPatterns(state: ClientWorldState): ClientPattern[]
export function detectRiskPatterns(state: ClientWorldState): ClientPattern[]
export function getHighPriorityPatterns(state: ClientWorldState): ClientPattern[]
```
```

### Prompt 3.2 - Inference Engine
```
Generate src/world-model/inference.ts for JIG wholesale predictions:

1. RESTOCK PREDICTIONS
```typescript
export interface RestockPrediction {
  productId: string;
  productName: string;
  predictedDate: number;
  daysUntilNeeded: number;
  confidence: number;
  suggestedQuantity: number;
  lastOrderedQuantity: number;
  averageOrderQuantity: number;
}

export function predictRestock(state: ClientWorldState): RestockPrediction[] {
  // Analyze order history for each product
  // Calculate average consumption rate
  // Estimate days until reorder needed
  // Return sorted by urgency
}
```

2. CHURN RISK CALCULATION
```typescript
export interface ChurnAnalysis {
  risk: ChurnRisk;
  probability: number;
  factors: string[];
  suggestedActions: string[];
  timeframe: string;
}

export function analyzeChurnRisk(state: ClientWorldState): ChurnAnalysis {
  // Factor weights:
  // - Days since last order vs. average frequency (40%)
  // - Declining order values (20%)
  // - Payment issues (15%)
  // - Support complaints (10%)
  // - Login inactivity (10%)
  // - Cart abandonment (5%)
}
```

3. PAYMENT RISK ASSESSMENT
```typescript
export interface PaymentRiskAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedTerms: PaymentTerms;
  recommendedCreditLimit: number;
  factors: string[];
  trend: 'improving' | 'stable' | 'declining';
}

export function assessPaymentRisk(state: ClientWorldState): PaymentRiskAnalysis
```

4. PRODUCT RECOMMENDATIONS
```typescript
export interface ProductRecommendation {
  productId: string;
  productName: string;
  reason: string;
  confidence: number;
  expectedValue: number;
  category: 'reorder' | 'cross_sell' | 'upsell' | 'new_product';
}

export function generateProductRecommendations(
  state: ClientWorldState,
  allProducts: Product[]
): ProductRecommendation[]
```

5. TIER ELIGIBILITY
```typescript
export interface TierAnalysis {
  currentTier: ClientTier;
  eligibleForUpgrade: boolean;
  nextTier: ClientTier | null;
  requirementsForNextTier: {
    requirement: string;
    current: number;
    needed: number;
    progress: number;
  }[];
  estimatedTimeToUpgrade: number | null;
}

export function analyzeTierStatus(state: ClientWorldState): TierAnalysis {
  // Tier thresholds:
  // Standard: < R100,000 lifetime
  // Silver: R100,000 - R300,000 lifetime
  // Gold: R300,000 - R750,000 lifetime
  // Platinum: > R750,000 lifetime
}
```

6. OPTIMAL CONTACT TIME
```typescript
export interface ContactRecommendation {
  bestDay: string;
  bestTime: string;
  channel: InterventionChannel;
  reason: string;
}

export function recommendContactTime(state: ClientWorldState): ContactRecommendation
```

7. REVENUE FORECASTING
```typescript
export interface RevenueForecast {
  nextOrderEstimate: number;
  next30Days: number;
  next90Days: number;
  annualProjection: number;
  confidence: number;
}

export function forecastRevenue(state: ClientWorldState): RevenueForecast
```
```

### Prompt 3.3 - Interventions
```
Generate src/world-model/interventions.ts for automated JIG wholesale actions:

1. INTERVENTION TRIGGERS
```typescript
export interface InterventionTrigger {
  id: string;
  name: string;
  condition: (state: ClientWorldState) => boolean;
  generateIntervention: (state: ClientWorldState) => Omit<Intervention, 'id' | 'triggeredAt' | 'status'>;
  cooldownHours: number; // Prevent spam
  priority: InterventionPriority;
}
```

2. REORDER REMINDER TRIGGERS
```typescript
const REORDER_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'restock_gentle',
    name: 'Gentle Restock Reminder',
    condition: (state) => state.inventory.estimatedStockDays <= 7 && state.inventory.estimatedStockDays > 3,
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'reorder_reminder',
      channel: 'email',
      priority: 'low',
      triggeredBy: 'restock_gentle',
      message: `Hi ${state.client.contactPerson}, based on your order history, you might be running low soon. Ready to restock?`,
    }),
    cooldownHours: 72,
    priority: 'low',
  },
  {
    id: 'restock_urgent',
    name: 'Urgent Restock Reminder',
    condition: (state) => state.inventory.estimatedStockDays <= 3,
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'reorder_reminder',
      channel: 'whatsapp',
      priority: 'high',
      triggeredBy: 'restock_urgent',
      message: `🚨 ${state.client.companyName} - Stock alert! You're likely running low. Quick reorder? We can ship today.`,
    }),
    cooldownHours: 24,
    priority: 'high',
  },
];
```

3. CHURN PREVENTION TRIGGERS
```typescript
const CHURN_PREVENTION_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'churn_medium_risk',
    name: 'Medium Churn Risk Outreach',
    condition: (state) => {
      const daysSinceOrder = state.purchasing.lastOrderAt 
        ? (Date.now() - state.purchasing.lastOrderAt) / 86400000 
        : 0;
      return daysSinceOrder > state.purchasing.orderFrequencyDays * 1.5 && 
             state.purchasing.totalOrders > 2;
    },
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'churn_prevention',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'churn_medium_risk',
      message: `Hi ${state.client.contactPerson}, we noticed it's been a while. Everything okay? Here's what's new...`,
    }),
    cooldownHours: 168, // 1 week
    priority: 'medium',
  },
  {
    id: 'churn_high_risk',
    name: 'High Churn Risk - Personal Touch',
    condition: (state) => state.relationship.churnRisk === 'high',
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'churn_prevention',
      channel: 'sales_call',
      priority: 'high',
      triggeredBy: 'churn_high_risk',
      message: `URGENT: ${state.client.companyName} (LTV: R${state.purchasing.lifetimeValue.toFixed(0)}) at high churn risk. Personal call needed.`,
    }),
    cooldownHours: 336, // 2 weeks
    priority: 'high',
  },
  {
    id: 'win_back',
    name: 'Win Back Campaign',
    condition: (state) => {
      const daysSinceOrder = state.purchasing.lastOrderAt 
        ? (Date.now() - state.purchasing.lastOrderAt) / 86400000 
        : 0;
      return daysSinceOrder > 90 && state.purchasing.lifetimeValue > 50000;
    },
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'win_back',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'win_back',
      message: `We miss you ${state.client.companyName}! Come back with 10% off your next order.`,
    }),
    cooldownHours: 720, // 30 days
    priority: 'medium',
  },
];
```

4. PAYMENT REMINDER TRIGGERS
```typescript
const PAYMENT_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'payment_due_soon',
    name: 'Payment Due Soon',
    // Check against actual orders with pending payment
    condition: (state) => {
      const pendingOrders = state.orders.filter(o => 
        o.paymentStatus === 'pending' && 
        o.paymentDueDate && 
        (o.paymentDueDate - Date.now()) / 86400000 <= 3
      );
      return pendingOrders.length > 0;
    },
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'payment_reminder',
      channel: 'email',
      priority: 'low',
      triggeredBy: 'payment_due_soon',
      message: `Friendly reminder: Payment due in 3 days.`,
    }),
    cooldownHours: 72,
    priority: 'low',
  },
  {
    id: 'payment_overdue',
    name: 'Payment Overdue',
    condition: (state) => {
      const overdueOrders = state.orders.filter(o => o.paymentStatus === 'overdue');
      return overdueOrders.length > 0;
    },
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'payment_reminder',
      channel: 'sms',
      priority: 'high',
      triggeredBy: 'payment_overdue',
      message: `Payment overdue. Please settle to avoid service interruption.`,
    }),
    cooldownHours: 48,
    priority: 'high',
  },
];
```

5. UPSELL TRIGGERS
```typescript
const UPSELL_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'tier_upgrade_eligible',
    name: 'Tier Upgrade Available',
    condition: (state) => {
      const nextTierThreshold = {
        standard: 100000,
        silver: 300000,
        gold: 750000,
        platinum: Infinity,
      };
      return state.purchasing.lifetimeValue >= nextTierThreshold[state.relationship.tier];
    },
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'vip_offer',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'tier_upgrade_eligible',
      message: `Congratulations! You've unlocked better pricing!`,
    }),
    cooldownHours: 720,
    priority: 'medium',
  },
  {
    id: 'bulk_incentive',
    name: 'Bulk Order Incentive',
    condition: (state) => 
      state.purchasing.averageOrderValue < 25000 && 
      state.purchasing.totalOrders >= 3,
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'upsell',
      channel: 'in_app',
      priority: 'low',
      triggeredBy: 'bulk_incentive',
      message: `Did you know? Orders over R25,000 get an extra 5% off.`,
    }),
    cooldownHours: 336,
    priority: 'low',
  },
  {
    id: 'cart_recovery',
    name: 'Cart Recovery',
    condition: (state) => state.behavioral.cartAbandonment > 0 && state.behavioral.cartAbandonmentValue > 5000,
    generateIntervention: (state) => ({
      clientId: state.clientId,
      type: 'reorder_reminder',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'cart_recovery',
      message: `Still thinking? Your cart is waiting. Complete your order today.`,
    }),
    cooldownHours: 24,
    priority: 'medium',
  },
];
```

6. MAIN INTERVENTION GENERATOR
```typescript
export function generateInterventions(state: ClientWorldState): Intervention[] {
  const allTriggers = [
    ...REORDER_TRIGGERS,
    ...CHURN_PREVENTION_TRIGGERS,
    ...PAYMENT_TRIGGERS,
    ...UPSELL_TRIGGERS,
  ];
  
  // Check each trigger
  // Respect cooldown periods
  // Sort by priority
  // Return top 3 interventions
}

export function shouldTriggerIntervention(
  trigger: InterventionTrigger,
  state: ClientWorldState
): boolean {
  // Check if condition is met
  // Check if cooldown has passed since last same-type intervention
}
```
```

---

## PHASE 4: CONTEXT & UI INTEGRATION

### Prompt 4.1 - React Context
```
Generate src/world-model/ClientWorldContext.tsx for JIG wholesale:

1. CONTEXT VALUE INTERFACE
```typescript
interface ClientWorldContextValue {
  // Core state
  state: ClientWorldState;
  isLoading: boolean;
  error: string | null;

  // Dispatch
  dispatch: (event: ClientWorldEvent) => void;

  // Computed intelligence
  churnAnalysis: ChurnAnalysis;
  restockPredictions: RestockPrediction[];
  paymentRiskAnalysis: PaymentRiskAnalysis;
  tierStatus: TierAnalysis;
  productRecommendations: ProductRecommendation[];
  activeInterventions: Intervention[];
  patterns: ClientPattern[];

  // Actions
  refreshPredictions: () => void;
  acknowledgeIntervention: (interventionId: string, outcome: string) => void;
  resetClientState: () => Promise<void>;
}
```

2. PROVIDER COMPONENT
```typescript
export function ClientWorldProvider({ 
  clientId, 
  client, 
  allProducts,
  children 
}: Props) {
  // State management with reducer
  // Load state on mount
  // Subscribe to event bus
  // Auto-save on changes
  
  // Computed values with useMemo:
  // - churnAnalysis
  // - restockPredictions
  // - paymentRiskAnalysis
  // - tierStatus
  // - productRecommendations
  // - activeInterventions (filtered by status)
  // - patterns (detected on each state change)
}
```

3. MAIN HOOK
```typescript
export function useClientWorld(): ClientWorldContextValue
```

4. SPECIALIZED HOOKS
```typescript
export function usePurchasingState(): PurchasingState
export function usePaymentState(): PaymentState
export function useInventoryState(): InventoryState
export function useRelationshipState(): RelationshipState
export function useBehavioralState(): BehavioralState
export function useChurnRisk(): ChurnAnalysis
export function useRestockPredictions(): RestockPrediction[]
export function useActiveInterventions(): Intervention[]
export function useTierStatus(): TierAnalysis
export function usePatterns(): ClientPattern[]
```

5. ADMIN DASHBOARD HOOK
```typescript
// For admin view of all clients
export function useClientIntelligenceSummary(state: ClientWorldState): {
  healthScore: number;
  topConcerns: string[];
  opportunities: string[];
  recommendedActions: string[];
}
```
```

### Prompt 4.2 - Barrel Exports
```
Generate src/world-model/index.ts with organized exports:

// Types
export * from './types';

// Event Bus
export { clientEventBus } from './events';
export {
  emitOrderPlaced,
  emitOrderConfirmed,
  emitOrderShipped,
  emitOrderDelivered,
  emitOrderCancelled,
  emitPaymentReceived,
  emitPaymentOverdue,
  emitClientLogin,
  emitProductViewed,
  emitCartUpdated,
  emitCartAbandoned,
  emitPromotionSent,
  emitPromotionResponded,
  emitSupportTicketOpened,
  emitComplaintReceived,
  emitFeedbackReceived,
  emitPatternDetected,
  emitInterventionTriggered,
} from './events';

// State Management
export {
  createInitialClientState,
  saveClientState,
  loadClientState,
  clearClientState,
  clientWorldReducer,
} from './state';

// Pattern Detection
export {
  detectAllPatterns,
  detectPurchasingPatterns,
  detectPaymentPatterns,
  detectEngagementPatterns,
  detectRiskPatterns,
  getHighPriorityPatterns,
} from './patterns';

// Inference / Predictions
export {
  predictRestock,
  analyzeChurnRisk,
  assessPaymentRisk,
  generateProductRecommendations,
  analyzeTierStatus,
  recommendContactTime,
  forecastRevenue,
} from './inference';

// Interventions
export {
  generateInterventions,
  shouldTriggerIntervention,
} from './interventions';

// React Context & Hooks
export { ClientWorldProvider } from './ClientWorldContext';
export {
  useClientWorld,
  usePurchasingState,
  usePaymentState,
  useInventoryState,
  useRelationshipState,
  useBehavioralState,
  useChurnRisk,
  useRestockPredictions,
  useActiveInterventions,
  useTierStatus,
  usePatterns,
  useClientIntelligenceSummary,
} from './ClientWorldContext';
```

---

## PHASE 5: AI SYSTEM PROMPT

### Prompt 5.1 - JIG AI Assistant
```
Generate src/world-model/system-prompt.md for JIG wholesale AI assistant:

# JIG Craft Cannabis - AI Sales Assistant

## Identity

You are the **JIG Assistant**, a professional wholesale ordering assistant for cannabis dispensaries and retailers in South Africa. You help business clients manage their inventory, place orders, and stay informed about JIG Craft Cannabis products.

## Tone & Style

- **Professional** but approachable
- **Knowledgeable** about cannabis products (strains, effects, THC/CBD)
- **Business-focused** - remember you're talking to business owners
- **Efficient** - respect their time
- **South African context** - use local terms, understand local market

## Capabilities (What You CAN Do)

### Product Information
- Explain strain differences (Sativa vs Indica vs Hybrid)
- Describe THC/CBD content and effects
- Provide product availability and stock levels
- Explain bulk pricing tiers

### Order Assistance
- Help build orders
- Calculate bulk discounts
- Suggest complementary products
- Provide delivery timeframes
- Track order status

### Account Information
- Show order history
- Display current pricing tier
- Check outstanding balance
- Explain tier upgrade requirements

### Recommendations
- Suggest restock timing based on order history
- Recommend products based on their usual purchases
- Highlight new products relevant to their business
- Alert about low stock on their regular items

## Boundaries (What You CANNOT Do)

### Pricing & Commercial
- Negotiate custom pricing (refer to sales manager)
- Offer unauthorized discounts
- Promise delivery times outside SLA
- Guarantee stock availability

### Confidential Information
- Reveal cost prices or margins
- Share other clients' data or orders
- Discuss competitor information
- Disclose internal sales strategies

### Compliance & Legal
- Provide medical advice about cannabis
- Make health claims
- Give legal advice about regulations
- Help circumvent any compliance requirements

### Account Management
- Approve credit limit changes
- Modify payment terms
- Override payment blocks
- Access accounts without verification

## State-Aware Responses

### Client Tier Context
```
IF tier == 'platinum':
  - Proactive about new products
  - Mention exclusive pre-releases
  - "As a Platinum client, you get first access to..."

IF tier == 'standard':
  - Highlight path to better pricing
  - "Orders over R100K lifetime unlock Silver pricing"
```

### Payment Context
```
IF outstandingBalance > 0:
  - Acknowledge balance professionally
  - Don't block ordering discussion
  - "I see there's an outstanding balance. Would you like payment details?"

IF paymentReliability < 0.7:
  - Don't mention credit options
  - Focus on COD or EFT
```

### Order History Context
```
IF lastOrderAt > 30 days ago:
  - Check if they need to restock
  - "It's been a while! Running low on Purple Haze?"

IF averageOrderValue > 25000:
  - Acknowledge bulk buyer status
  - Mention pallet pricing if applicable
```

### Stock Context
```
IF product.stockStatus == 'low':
  - Mention limited availability
  - "This strain is running low - order soon to secure stock"

IF product.stockStatus == 'out':
  - Offer alternatives
  - Provide restock estimate if known
```

## Conversation Examples

### Order Inquiry
Client: "What's the price on 500g of OG Kush?"
Assistant: "For 500g of OG Kush Reserve (25% THC, Indica), you're looking at R650/gram at that quantity - so R325,000 total. As a Silver client, you're already getting our second-best pricing. Want me to add this to an order?"

### Restock Suggestion
Client: "What should I order?"
Assistant: "Based on your last 3 orders, you typically go through Purple Haze (about 200g/month) and the Pre-Roll 6-Packs. You ordered 18 days ago, so you're probably getting low. I'd suggest:
- 250g Purple Haze Premium @ R162,500
- 50x Pre-Roll 6-Packs @ R7,500
That's R170,000 - you're only R30K away from Gold tier!"

### Payment Inquiry
Client: "What do I owe?"
Assistant: "You have one pending invoice:
- Order JIG-001234: R45,000 (due in 3 days)
Payment via EFT to:
FNB - JIG Craft Cannabis (Pty) Ltd
Account: 62 845 712 009
Reference: JIG-001234"

### Product Question
Client: "What's good for relaxation?"
Assistant: "For relaxation, our Indica strains are your best bet:
- **OG Kush Reserve** (25% THC) - Classic deep relaxation
- **Purple Haze Premium** (22% THC, but more balanced) - Relaxed but not couch-locked

The OG Kush is our best seller for evening use. Want to try both with a mixed order?"

## Escalation Triggers

Escalate to human support when:
- Client requests custom pricing negotiation
- Credit/payment disputes arise
- Compliance questions come up
- Client expresses serious dissatisfaction
- Requests beyond your capabilities

Escalation response:
"That's something I'd need to get our sales team involved with. Let me connect you with [Sales Rep Name] who can help. Alternatively, call us at [phone] or email sales@jigcannabis.com"

## Data Access Summary

You can see:
- Client's order history (their orders only)
- Client's pricing tier and lifetime value
- Client's payment status
- Product catalog with current stock
- Client's detected patterns and preferences

You cannot see:
- Other clients' data
- Cost prices or margins
- Internal notes
- Credit scoring details

---

**Remember: You're a helpful business tool, not a salesperson. Be informative, efficient, and professional. When in doubt, connect them with a human.**
```

---

## PHASE 6: TESTING & INTEGRATION

### Prompt 6.1 - Integration Tests
```
Generate src/world-model/__tests__/jig-integration.test.ts:

1. ORDER FLOW TESTS
- New order updates purchasing stats correctly
- Order frequency calculation works with multiple orders
- Preferred products update based on order history
- Stock days estimate adjusts after order

2. PAYMENT FLOW TESTS
- Payment received updates reliability score
- Late payment increments latePayments counter
- Credit utilization calculates correctly
- Payment trend detection works

3. CHURN PREDICTION TESTS
- Churn risk increases when orders delayed
- Churn risk decreases with consistent ordering
- Multiple factors combine correctly
- VIP clients get appropriate risk weighting

4. INTERVENTION TESTS
- Restock reminder triggers at correct threshold
- Cooldown periods prevent spam
- Priority sorting works correctly
- Cart abandonment triggers recovery

5. PATTERN DETECTION TESTS
- Bulk buyer pattern detects correctly
- Credit risk pattern triggers appropriately
- Loyal customer pattern recognizes history
- Multiple patterns can co-exist

6. END-TO-END SCENARIOS
- New client onboarding flow
- Regular client reorder cycle
- At-risk client intervention flow
- VIP client upgrade path

Use Jest syntax. Include mock data generators.
```

### Prompt 6.2 - Integration with Existing App
```
Generate src/world-model/integration.ts showing how to integrate with JIG webapp:

1. Initialize on client login
2. Emit events from existing order flow
3. Display intelligence in admin dashboard
4. Show recommendations to clients
5. Track intervention effectiveness

Include code snippets showing:
- How to wrap existing components
- How to add event emitters to order flow
- How to display churn risk badges
- How to show restock alerts
- How to track AI assistant conversations
```

---

# ✅ POST-GENERATION CHECKLIST

## Golden Rule Verification

Before marking complete, verify EVERY component:

### Database Layer
- [ ] `client_world_state` table exists with all columns
- [ ] `client_patterns` table exists
- [ ] `interventions` table exists
- [ ] `orders` table has world model foreign keys
- [ ] All migrations run successfully
- [ ] Test data can be inserted and retrieved

### API Layer
- [ ] `GET /api/intelligence/client/:id` returns real state
- [ ] `GET /api/intelligence/churn/:id` calculates real risk
- [ ] `GET /api/intelligence/restock/:id` returns predictions
- [ ] `POST /api/events/order-placed` updates state
- [ ] All endpoints return proper error codes
- [ ] All endpoints tested with curl/Postman

### UI Layer
- [ ] Dashboard loads with real data (not mocks)
- [ ] Churn risk badges display actual calculations
- [ ] Restock alerts show real predictions
- [ ] All action buttons trigger API calls
- [ ] All tabs render their subsections
- [ ] All "View Details" links work
- [ ] Refresh maintains state from database

### Integration
- [ ] Event → State → API → UI flow tested end-to-end
- [ ] Order placed → World state updated → Dashboard reflects
- [ ] Intervention triggered → Notification sent (or logged)

After completing all phases:

- [ ] All files in src/world-model/
- [ ] TypeScript compiles without errors
- [ ] All tests pass
- [ ] Event flow works: Action → Event → State → Intelligence
- [ ] Predictions are sensible for test data
- [ ] Interventions trigger at correct thresholds
- [ ] AI system prompt reviewed for business accuracy
- [ ] Integration with existing JIG webapp planned

---

# 🔄 EVOLUTION PROMPT

After 3 months of production use:

```
Based on JIG wholesale data:

1. Which patterns were most predictive of churn?
2. Which interventions had best conversion rates?
3. What restock prediction accuracy did we achieve?
4. Where did the AI assistant hit limitations?

Generate HEADCASE EVOLVE v2 for JIG with:
- Refined churn prediction weights
- Optimized intervention timing
- Improved restock accuracy
- Expanded AI capabilities within safe boundaries

Maintain backward compatibility with existing client data.
```

---

**The Ontology is the cage. The AI obeys.**
