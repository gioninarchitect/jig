/**
 * JIG Craft Cannabis - HEADCASE EVOLVE World Model Types
 *
 * Complete type definitions for the B2B wholesale intelligence platform.
 * Covers entities (Client, Product, Order), domain state slices
 * (Purchasing, Payment, Inventory, Relationship, Behavioral),
 * the unified ClientWorldState, all event types, and type guards.
 */

// ─────────────────────────────────────────────────────────────
// 1. PRIMITIVE / ENUM TYPES
// ─────────────────────────────────────────────────────────────

/** Client classification tiers based on lifetime spend */
export type ClientTier = 'standard' | 'silver' | 'gold' | 'platinum';

/** Client account status */
export type ClientStatus = 'pending' | 'active' | 'suspended' | 'churned';

/** Type of cannabis retail establishment */
export type ClientType =
  | 'dispensary'
  | 'retailer'
  | 'distributor'
  | 'cafe'
  | 'online_store';

/** Payment terms offered to the client */
export type PaymentTerms = 'cod' | 'net7' | 'net14' | 'net30';

/** Status of a payment against an order */
export type PaymentStatus =
  | 'pending'
  | 'partial'
  | 'paid'
  | 'overdue'
  | 'refunded';

/** Method the client uses to pay */
export type PaymentMethod = 'eft' | 'card' | 'cash' | 'credit';

/** Lifecycle status of an order */
export type OrderStatus =
  | 'pending'
  | 'confirmed'
  | 'processing'
  | 'shipped'
  | 'delivered'
  | 'cancelled';

/** Product categories carried by JIG */
export type ProductCategory =
  | 'flower'
  | 'pre_rolls'
  | 'edibles'
  | 'concentrates'
  | 'vapes'
  | 'accessories';

/** Cannabis strain classification */
export type StrainType = 'sativa' | 'indica' | 'hybrid' | 'na';

/** Stock availability indicator */
export type StockStatus = 'available' | 'low' | 'out';

/** Churn probability bracket */
export type ChurnRisk = 'low' | 'medium' | 'high' | 'critical';

/** Categories of automated interventions */
export type InterventionType =
  | 'reorder_reminder'
  | 'churn_prevention'
  | 'payment_reminder'
  | 'upsell'
  | 'welcome'
  | 'win_back'
  | 'vip_offer';

/** Delivery channel for an intervention */
export type InterventionChannel =
  | 'email'
  | 'sms'
  | 'in_app'
  | 'whatsapp'
  | 'sales_call';

/** Urgency of an intervention */
export type InterventionPriority = 'low' | 'medium' | 'high' | 'critical';

// ─────────────────────────────────────────────────────────────
// 2. OTP EMAIL AUTHENTICATION TYPES
// ─────────────────────────────────────────────────────────────

/** Why the OTP was requested */
export type OtpPurpose = 'login' | 'register' | 'reset';

/** A one-time pin sent to the client's email */
export interface AuthOtp {
  id: string;
  email: string;
  otpCode: string;
  purpose: OtpPurpose;
  attempts: number;
  maxAttempts: number;
  isVerified: boolean;
  expiresAt: number;
  createdAt: number;
  verifiedAt?: number;
}

/** An active authenticated session */
export interface AuthSession {
  id: string;
  clientId: string;
  tokenHash: string;
  userAgent?: string;
  ipAddress?: string;
  isActive: boolean;
  createdAt: number;
  expiresAt: number;
  lastUsedAt: number;
}

/** Request body for POST /auth/request-otp */
export interface OtpRequest {
  email: string;
  purpose: OtpPurpose;
}

/** Request body for POST /auth/verify-otp */
export interface OtpVerifyRequest {
  email: string;
  otpCode: string;
}

/** Response from POST /auth/verify-otp on success */
export interface AuthTokenResponse {
  accessToken: string;
  expiresIn: number;
  clientId: string;
  tier: ClientTier;
}

/** OTP configuration constants */
export const OTP_CONFIG = {
  /** Length of generated OTP code */
  CODE_LENGTH: 6,
  /** Minutes until OTP expires */
  EXPIRY_MINUTES: 10,
  /** Max verification attempts per OTP */
  MAX_ATTEMPTS: 3,
  /** Cooldown seconds between OTP requests to same email */
  COOLDOWN_SECONDS: 60,
  /** Session duration in hours */
  SESSION_HOURS: 24,
} as const;

// ─────────────────────────────────────────────────────────────
// 3. SHARED VALUE OBJECTS (Address)
// ─────────────────────────────────────────────────────────────

/** South African physical address */
export interface Address {
  street: string;
  city: string;
  province: string;
  postalCode: string;
  /** Defaults to 'South Africa' */
  country: string;
}

// ─────────────────────────────────────────────────────────────
// 3. CORE ENTITIES
// ─────────────────────────────────────────────────────────────

/** A wholesale client (dispensary, retailer, etc.) */
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

/** Bulk pricing tier for a product */
export interface PriceTier {
  /** Minimum quantity to qualify for this tier price */
  minQuantity: number;
  /** Price per unit at this tier */
  price: number;
  /** Human-readable tier label, e.g. "Bulk 500g+" */
  tierName: string;
}

/** A product in the JIG catalogue */
export interface Product {
  id: string;
  sku: string;
  name: string;
  category: ProductCategory;
  subcategory?: string;
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

/** A single line item within an order */
export interface OrderItem {
  productId: string;
  sku: string;
  name: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

/** A wholesale order (format: JIG-XXXXXX) */
export interface Order {
  /** Format: JIG-XXXXXX */
  id: string;
  clientId: string;
  items: OrderItem[];
  subtotal: number;
  /** South African VAT (15%) */
  vatAmount: number;
  total: number;
  status: OrderStatus;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  paymentDueDate?: number;
  paidAt?: number;
  /** Format: PO-XXXXXX */
  poNumber?: string;
  /** Format: INV-XXXXXX */
  invoiceNumber?: string;
  deliveryAddress: Address;
  deliveryNotes?: string;
  trackingNumber?: string;
  courierName?: string;
  confirmedAt?: number;
  shippedAt?: number;
  deliveredAt?: number;
  createdAt: number;
  updatedAt: number;
}

/** Status of a proof-of-payment upload */
export type PopStatus = 'pending' | 'approved' | 'rejected';

/** A proof-of-payment file uploaded by a client */
export interface PopUpload {
  id: string;
  orderId: string;
  clientId: string;
  fileName: string;
  filePath: string;
  fileSize: number;
  mimeType: string;
  status: PopStatus;
  adminNotes?: string;
  reviewedBy?: string;
  reviewedAt?: number;
  uploadedAt: number;
}

// ─────────────────────────────────────────────────────────────
// 4. INTELLIGENCE TYPES
// ─────────────────────────────────────────────────────────────

/** A product the client orders frequently */
export interface ProductPreference {
  productId: string;
  sku: string;
  name: string;
  orderCount: number;
  totalQuantity: number;
  lastOrdered: number;
}

/** Alert: client's estimated stock of a product is running low */
export interface StockAlert {
  productId: string;
  productName: string;
  estimatedDaysRemaining: number;
  suggestedQuantity: number;
}

/** Predicted date and quantity for the client's next reorder of a product */
export interface ReorderPrediction {
  productId: string;
  productName: string;
  predictedDate: number;
  confidence: number;
  suggestedQuantity: number;
}

/** A behavioural pattern detected for a client */
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

/** An automated or suggested action targeting a client */
export interface Intervention {
  id: string;
  clientId: string;
  type: InterventionType;
  channel: InterventionChannel;
  priority: InterventionPriority;
  triggeredBy: string;
  message: string;
  status:
    | 'pending'
    | 'sent'
    | 'opened'
    | 'clicked'
    | 'converted'
    | 'ignored';
  triggeredAt: number;
  respondedAt?: number;
  outcome?: 'success' | 'partial' | 'failed' | 'pending';
}

// ─────────────────────────────────────────────────────────────
// 5. DOMAIN STATE SLICES (ClientWorldState sub-objects)
// ─────────────────────────────────────────────────────────────

/** Purchasing behaviour metrics */
export interface PurchasingState {
  lifetimeValue: number;
  totalOrders: number;
  averageOrderValue: number;
  lastOrderAt: number | null;
  lastOrderValue: number;
  /** Average calendar days between orders */
  orderFrequencyDays: number;
  preferredProducts: ProductPreference[];
  preferredCategories: ProductCategory[];
  pricePointSensitivity: 'budget' | 'mid' | 'premium' | 'mixed';
  bulkBuyer: boolean;
  seasonalPattern: string | null;
}

/** Payment behaviour metrics */
export interface PaymentState {
  totalPaid: number;
  outstandingBalance: number;
  /** 0-1 reliability score */
  paymentReliability: number;
  averageDaysToPayment: number;
  latePayments: number;
  /** Outstanding / Credit limit (0-1) */
  creditUtilization: number;
  lastPaymentAt: number | null;
  paymentTrend: 'improving' | 'stable' | 'declining';
}

/** Estimated inventory at the client's premises */
export interface InventoryState {
  estimatedStockDays: number;
  lastRestockDate: number | null;
  /** Units consumed per day (average across products) */
  averageConsumptionRate: number;
  stockAlerts: StockAlert[];
  reorderPredictions: ReorderPrediction[];
}

/** Relationship health indicators */
export interface RelationshipState {
  accountAgeDays: number;
  tier: ClientTier;
  /** 1-10 satisfaction score */
  satisfactionScore: number;
  supportTickets: number;
  complaintsCount: number;
  npsScore: number | null;
  churnRisk: ChurnRisk;
  lastContactAt: number | null;
  assignedSalesRep: string | null;
}

/** A single product-view event in the client's browsing history */
export interface BrowsingEvent {
  productId: string;
  timestamp: number;
  durationSeconds: number;
  addedToCart: boolean;
}

/** Engagement / behavioural metrics */
export interface BehavioralState {
  preferredOrderDay:
    | 'monday'
    | 'tuesday'
    | 'wednesday'
    | 'thursday'
    | 'friday'
    | 'saturday'
    | 'sunday'
    | 'no_pattern';
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

// ─────────────────────────────────────────────────────────────
// 6. UNIFIED CLIENT WORLD STATE
// ─────────────────────────────────────────────────────────────

/**
 * The complete state representation for a single wholesale client.
 * Updated via event sourcing through the clientWorldReducer.
 */
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

// ─────────────────────────────────────────────────────────────
// 7. EVENT TYPES (immutable facts produced by commands)
// ─────────────────────────────────────────────────────────────

/** Discriminated union of every event the world model can process */
export type ClientWorldEvent =
  // Order lifecycle
  | {
      type: 'ORDER_PLACED';
      orderId: string;
      items: OrderItem[];
      subtotal: number;
      total: number;
      paymentMethod: PaymentMethod;
    }
  | { type: 'ORDER_CONFIRMED'; orderId: string }
  | { type: 'ORDER_SHIPPED'; orderId: string; trackingNumber: string }
  | { type: 'ORDER_DELIVERED'; orderId: string }
  | { type: 'ORDER_CANCELLED'; orderId: string; reason: string }

  // Payment
  | {
      type: 'PAYMENT_RECEIVED';
      orderId: string;
      amount: number;
      method: PaymentMethod;
    }
  | {
      type: 'PAYMENT_OVERDUE';
      orderId: string;
      daysOverdue: number;
      amount: number;
    }

  // Engagement
  | { type: 'CLIENT_LOGIN'; timestamp: number }
  | { type: 'PRODUCT_VIEWED'; productId: string; duration: number }
  | { type: 'CART_UPDATED'; items: OrderItem[]; totalValue: number }
  | { type: 'CART_ABANDONED'; items: OrderItem[]; totalValue: number }

  // Promotions
  | {
      type: 'PROMOTION_SENT';
      promotionId: string;
      channel: InterventionChannel;
    }
  | {
      type: 'PROMOTION_RESPONDED';
      promotionId: string;
      action: 'opened' | 'clicked' | 'ordered' | 'ignored';
    }

  // Support
  | {
      type: 'SUPPORT_TICKET_OPENED';
      ticketId: string;
      category: string;
      priority: string;
    }
  | { type: 'COMPLAINT_RECEIVED'; category: string; severity: string }
  | { type: 'FEEDBACK_RECEIVED'; score: number; comment: string }

  // Intelligence
  | {
      type: 'PATTERN_DETECTED';
      patternId: string;
      patternType: string;
      confidence: number;
    }
  | { type: 'INTERVENTION_TRIGGERED'; intervention: Intervention }
  | {
      type: 'INTERVENTION_RESPONDED';
      interventionId: string;
      outcome: string;
    };

// ─────────────────────────────────────────────────────────────
// 8. INFERENCE RESULT TYPES
// ─────────────────────────────────────────────────────────────

/** Detailed restock prediction for a single product */
export interface RestockPredictionResult {
  productId: string;
  productName: string;
  predictedDate: number;
  daysUntilNeeded: number;
  confidence: number;
  suggestedQuantity: number;
  lastOrderedQuantity: number;
  averageOrderQuantity: number;
}

/** Full churn analysis for a client */
export interface ChurnAnalysis {
  risk: ChurnRisk;
  /** 0-1 probability */
  probability: number;
  factors: string[];
  suggestedActions: string[];
  timeframe: string;
}

/** Payment risk assessment */
export interface PaymentRiskAnalysis {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendedTerms: PaymentTerms;
  recommendedCreditLimit: number;
  factors: string[];
  trend: 'improving' | 'stable' | 'declining';
}

/** Product recommendation with reasoning */
export interface ProductRecommendation {
  productId: string;
  productName: string;
  reason: string;
  confidence: number;
  expectedValue: number;
  category: 'reorder' | 'cross_sell' | 'upsell' | 'new_product';
}

/** Tier progression analysis */
export interface TierAnalysis {
  currentTier: ClientTier;
  eligibleForUpgrade: boolean;
  nextTier: ClientTier | null;
  requirementsForNextTier: {
    requirement: string;
    current: number;
    needed: number;
    /** 0-1 progress toward requirement */
    progress: number;
  }[];
  /** Estimated days until upgrade, or null if not projected */
  estimatedTimeToUpgrade: number | null;
}

/** Best time/channel to contact a client */
export interface ContactRecommendation {
  bestDay: string;
  bestTime: string;
  channel: InterventionChannel;
  reason: string;
}

/** Revenue forecast based on historical patterns */
export interface RevenueForecast {
  nextOrderEstimate: number;
  next30Days: number;
  next90Days: number;
  annualProjection: number;
  /** 0-1 confidence in the forecast */
  confidence: number;
}

// ─────────────────────────────────────────────────────────────
// 9. PATTERN & INTERVENTION DEFINITION TYPES
// ─────────────────────────────────────────────────────────────

/** A pattern detection rule */
export interface PatternDefinition {
  id: string;
  name: string;
  category: 'purchasing' | 'payment' | 'engagement' | 'risk';
  detect: (state: ClientWorldState) => boolean;
  confidence: (state: ClientWorldState) => number;
  severity: 'info' | 'warning' | 'concern' | 'critical';
  suggestedAction?: string;
}

/** An automated intervention trigger rule */
export interface InterventionTrigger {
  id: string;
  name: string;
  condition: (state: ClientWorldState) => boolean;
  generateIntervention: (
    state: ClientWorldState,
  ) => Omit<Intervention, 'id' | 'triggeredAt' | 'status'>;
  /** Minimum hours between triggering the same intervention type */
  cooldownHours: number;
  priority: InterventionPriority;
}

// ─────────────────────────────────────────────────────────────
// 10. TIER THRESHOLDS (Constants)
// ─────────────────────────────────────────────────────────────

/** Lifetime spend thresholds (ZAR) for each tier */
export const TIER_THRESHOLDS: Record<ClientTier, number> = {
  standard: 0,
  silver: 100_000,
  gold: 300_000,
  platinum: 750_000,
};

/** SA VAT rate */
export const VAT_RATE = 0.15;

// ─────────────────────────────────────────────────────────────
// 11. TYPE GUARDS
// ─────────────────────────────────────────────────────────────

const ORDER_STATUSES: OrderStatus[] = [
  'pending',
  'confirmed',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
];

const CLIENT_TIERS: ClientTier[] = ['standard', 'silver', 'gold', 'platinum'];

const CHURN_RISKS: ChurnRisk[] = ['low', 'medium', 'high', 'critical'];

const PAYMENT_STATUSES: PaymentStatus[] = [
  'pending',
  'partial',
  'paid',
  'overdue',
  'refunded',
];

const CLIENT_STATUSES: ClientStatus[] = [
  'pending',
  'active',
  'suspended',
  'churned',
];

const PRODUCT_CATEGORIES: ProductCategory[] = [
  'flower',
  'pre_rolls',
  'edibles',
  'concentrates',
  'vapes',
  'accessories',
];

export function isValidOrderStatus(status: string): status is OrderStatus {
  return ORDER_STATUSES.includes(status as OrderStatus);
}

export function isValidClientTier(tier: string): tier is ClientTier {
  return CLIENT_TIERS.includes(tier as ClientTier);
}

export function isValidChurnRisk(risk: string): risk is ChurnRisk {
  return CHURN_RISKS.includes(risk as ChurnRisk);
}

export function isValidPaymentStatus(
  status: string,
): status is PaymentStatus {
  return PAYMENT_STATUSES.includes(status as PaymentStatus);
}

export function isValidClientStatus(
  status: string,
): status is ClientStatus {
  return CLIENT_STATUSES.includes(status as ClientStatus);
}

export function isValidProductCategory(
  category: string,
): category is ProductCategory {
  return PRODUCT_CATEGORIES.includes(category as ProductCategory);
}
