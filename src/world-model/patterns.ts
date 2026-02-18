/**
 * JIG Craft Cannabis - Client Pattern Detection
 *
 * 21 behavioural patterns across 4 categories, each with a
 * detect() predicate and confidence() scorer. The pattern engine
 * runs against a ClientWorldState and returns detected patterns
 * as ClientPattern records.
 */

import type {
  ClientPattern,
  ClientWorldState,
  PatternDefinition,
} from './types';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

// ─────────────────────────────────────────────────────────────
// PURCHASING PATTERNS (6)
// ─────────────────────────────────────────────────────────────

const PURCHASING_PATTERNS: PatternDefinition[] = [
  {
    id: 'bulk_buyer',
    name: 'Bulk Buyer',
    category: 'purchasing',
    detect: (s) => s.purchasing.averageOrderValue > 25_000,
    confidence: (s) => Math.min(0.9, s.purchasing.totalOrders / 10),
    severity: 'info',
    suggestedAction: 'Offer pallet pricing and priority shipping',
  },
  {
    id: 'price_sensitive',
    name: 'Price Sensitive',
    category: 'purchasing',
    detect: (s) => s.purchasing.pricePointSensitivity === 'budget',
    confidence: () => 0.7,
    severity: 'info',
    suggestedAction: 'Highlight value deals and bundle pricing',
  },
  {
    id: 'premium_preference',
    name: 'Premium Product Preference',
    category: 'purchasing',
    detect: (s) => s.purchasing.pricePointSensitivity === 'premium',
    confidence: () => 0.7,
    severity: 'info',
    suggestedAction: 'Prioritize new premium strain releases',
  },
  {
    id: 'seasonal_buyer',
    name: 'Seasonal Purchasing Pattern',
    category: 'purchasing',
    detect: (s) => s.purchasing.seasonalPattern !== null,
    confidence: () => 0.6,
    severity: 'info',
    suggestedAction: 'Pre-season inventory planning outreach',
  },
  {
    id: 'category_focused',
    name: 'Category Focused',
    category: 'purchasing',
    detect: (s) => s.purchasing.preferredCategories.length === 1,
    confidence: () => 0.8,
    severity: 'info',
    suggestedAction: 'Cross-sell complementary categories',
  },
  {
    id: 'declining_orders',
    name: 'Declining Order Values',
    category: 'purchasing',
    detect: (s) => {
      const orders = s.orders.slice(-5);
      if (orders.length < 3) return false;
      return orders[orders.length - 1].total < orders[0].total * 0.7;
    },
    confidence: () => 0.75,
    severity: 'warning',
    suggestedAction: 'Personal outreach to understand changing needs',
  },
];

// ─────────────────────────────────────────────────────────────
// PAYMENT PATTERNS (5)
// ─────────────────────────────────────────────────────────────

const PAYMENT_PATTERNS: PatternDefinition[] = [
  {
    id: 'reliable_payer',
    name: 'Reliable Payer',
    category: 'payment',
    detect: (s) => s.payment.paymentReliability >= 0.95,
    confidence: (s) => Math.min(0.9, s.purchasing.totalOrders / 5),
    severity: 'info',
    suggestedAction: 'Consider credit limit increase',
  },
  {
    id: 'slow_payer',
    name: 'Consistently Slow Payer',
    category: 'payment',
    detect: (s) =>
      s.payment.averageDaysToPayment > 14 && s.payment.latePayments >= 2,
    confidence: () => 0.8,
    severity: 'warning',
    suggestedAction: 'Review payment terms, consider COD',
  },
  {
    id: 'credit_risk',
    name: 'Credit Risk',
    category: 'payment',
    detect: (s) =>
      s.payment.paymentReliability < 0.6 && s.payment.latePayments >= 3,
    confidence: () => 0.85,
    severity: 'critical',
    suggestedAction: 'Suspend credit, require COD',
  },
  {
    id: 'improving_payment',
    name: 'Improving Payment Behavior',
    category: 'payment',
    detect: (s) => s.payment.paymentTrend === 'improving',
    confidence: () => 0.7,
    severity: 'info',
    suggestedAction: 'Acknowledge improvement, maintain relationship',
  },
  {
    id: 'high_credit_utilization',
    name: 'High Credit Utilization',
    category: 'payment',
    detect: (s) => s.payment.creditUtilization > 0.8,
    confidence: () => 0.9,
    severity: 'warning',
    suggestedAction: 'Review credit limit appropriateness',
  },
];

// ─────────────────────────────────────────────────────────────
// ENGAGEMENT PATTERNS (6)
// ─────────────────────────────────────────────────────────────

const ENGAGEMENT_PATTERNS: PatternDefinition[] = [
  {
    id: 'active_browser',
    name: 'Active Browser',
    category: 'engagement',
    detect: (s) =>
      s.behavioral.sessionCount > 10 &&
      s.behavioral.averageSessionMinutes > 5,
    confidence: () => 0.8,
    severity: 'info',
    suggestedAction: 'Send personalized product recommendations',
  },
  {
    id: 'cart_abandoner',
    name: 'Frequent Cart Abandoner',
    category: 'engagement',
    detect: (s) => s.behavioral.cartAbandonment >= 3,
    confidence: () => 0.85,
    severity: 'warning',
    suggestedAction: 'Investigate barriers - price, stock, UX issues',
  },
  {
    id: 'loyal_customer',
    name: 'Loyal Customer',
    category: 'engagement',
    detect: (s) =>
      s.relationship.accountAgeDays > 365 &&
      s.purchasing.totalOrders >= 12 &&
      s.relationship.churnRisk === 'low',
    confidence: () => 0.9,
    severity: 'info',
    suggestedAction: 'VIP treatment, early access to new products',
  },
  {
    id: 'preferred_day_orderer',
    name: 'Consistent Order Day',
    category: 'engagement',
    detect: (s) => s.behavioral.preferredOrderDay !== 'no_pattern',
    confidence: () => 0.7,
    severity: 'info',
    suggestedAction: 'Send reminders the evening before their usual order day',
  },
  {
    id: 'promotion_responsive',
    name: 'Promotion Responsive',
    category: 'engagement',
    detect: (s) => s.behavioral.promotionResponseRate > 0.5,
    confidence: () => 0.8,
    severity: 'info',
    suggestedAction: 'Include in promotional campaigns',
  },
  {
    id: 'disengaged',
    name: 'Disengaged',
    category: 'engagement',
    detect: (s) => {
      const daysSinceLogin = s.behavioral.lastLoginAt
        ? (Date.now() - s.behavioral.lastLoginAt) / MS_PER_DAY
        : 999;
      return daysSinceLogin > 30;
    },
    confidence: () => 0.75,
    severity: 'warning',
    suggestedAction: 'Re-engagement campaign',
  },
];

// ─────────────────────────────────────────────────────────────
// RISK PATTERNS (4)
// ─────────────────────────────────────────────────────────────

const RISK_PATTERNS: PatternDefinition[] = [
  {
    id: 'churn_imminent',
    name: 'Churn Imminent',
    category: 'risk',
    detect: (s) => s.relationship.churnRisk === 'critical',
    confidence: () => 0.9,
    severity: 'critical',
    suggestedAction: 'Immediate personal outreach from sales manager',
  },
  {
    id: 'at_risk',
    name: 'At Risk',
    category: 'risk',
    detect: (s) => s.relationship.churnRisk === 'high',
    confidence: () => 0.8,
    severity: 'concern',
    suggestedAction: 'Proactive sales call to understand concerns',
  },
  {
    id: 'satisfaction_declining',
    name: 'Satisfaction Declining',
    category: 'risk',
    detect: (s) =>
      s.relationship.complaintsCount > 0 ||
      s.relationship.satisfactionScore < 5,
    confidence: () => 0.85,
    severity: 'concern',
    suggestedAction: 'Customer success outreach',
  },
  {
    id: 'new_client_not_ordering',
    name: 'New Client Not Converting',
    category: 'risk',
    detect: (s) =>
      s.relationship.accountAgeDays > 14 &&
      s.relationship.accountAgeDays < 60 &&
      s.purchasing.totalOrders === 0,
    confidence: () => 0.7,
    severity: 'warning',
    suggestedAction: 'Onboarding follow-up call',
  },
];

// ─────────────────────────────────────────────────────────────
// ALL PATTERNS (combined)
// ─────────────────────────────────────────────────────────────

const ALL_PATTERNS: PatternDefinition[] = [
  ...PURCHASING_PATTERNS,
  ...PAYMENT_PATTERNS,
  ...ENGAGEMENT_PATTERNS,
  ...RISK_PATTERNS,
];

// ─────────────────────────────────────────────────────────────
// DETECTION FUNCTIONS
// ─────────────────────────────────────────────────────────────

/** Run a set of pattern definitions against a client state. */
function runDetection(
  state: ClientWorldState,
  patterns: PatternDefinition[],
): ClientPattern[] {
  const now = Date.now();
  const detected: ClientPattern[] = [];

  for (const pattern of patterns) {
    if (pattern.detect(state)) {
      detected.push({
        id: `${state.clientId}_${pattern.id}`,
        clientId: state.clientId,
        patternType: pattern.id,
        category: pattern.category,
        frequency: 1,
        confidence: pattern.confidence(state),
        lastDetected: now,
        evidence: pattern.suggestedAction,
      });
    }
  }

  return detected;
}

/** Detect all patterns across every category. */
export function detectAllPatterns(
  state: ClientWorldState,
): ClientPattern[] {
  return runDetection(state, ALL_PATTERNS);
}

/** Detect purchasing behaviour patterns only. */
export function detectPurchasingPatterns(
  state: ClientWorldState,
): ClientPattern[] {
  return runDetection(state, PURCHASING_PATTERNS);
}

/** Detect payment behaviour patterns only. */
export function detectPaymentPatterns(
  state: ClientWorldState,
): ClientPattern[] {
  return runDetection(state, PAYMENT_PATTERNS);
}

/** Detect engagement patterns only. */
export function detectEngagementPatterns(
  state: ClientWorldState,
): ClientPattern[] {
  return runDetection(state, ENGAGEMENT_PATTERNS);
}

/** Detect risk patterns only. */
export function detectRiskPatterns(
  state: ClientWorldState,
): ClientPattern[] {
  return runDetection(state, RISK_PATTERNS);
}

/** Get only high-priority patterns (warning, concern, critical). */
export function getHighPriorityPatterns(
  state: ClientWorldState,
): ClientPattern[] {
  const highSeverity = ALL_PATTERNS.filter(
    (p) => p.severity !== 'info',
  );
  return runDetection(state, highSeverity);
}

/** Get the raw pattern definitions (for UI display of all possible patterns). */
export function getPatternDefinitions(): ReadonlyArray<PatternDefinition> {
  return ALL_PATTERNS;
}
