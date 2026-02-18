/**
 * JIG Craft Cannabis - Inference Engine
 *
 * Prediction and analysis functions that derive actionable
 * intelligence from a client's world state. Each function is
 * pure: state in, analysis out.
 *
 *   predictRestock           - when each product needs reordering
 *   analyzeChurnRisk         - detailed churn breakdown
 *   assessPaymentRisk        - credit / payment risk assessment
 *   generateProductRecs      - cross-sell & reorder suggestions
 *   analyzeTierStatus        - tier progress & upgrade path
 *   recommendContactTime     - best day/time/channel to reach client
 *   forecastRevenue          - revenue projections for this client
 */

import type {
  ClientTier,
  ClientWorldState,
  ChurnAnalysis,
  ChurnRisk,
  ContactRecommendation,
  InterventionChannel,
  PaymentRiskAnalysis,
  PaymentTerms,
  Product,
  ProductRecommendation,
  RestockPredictionResult,
  RevenueForecast,
  TierAnalysis,
} from './types';

import { TIER_THRESHOLDS } from './types';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;

const TIER_ORDER: ClientTier[] = ['standard', 'silver', 'gold', 'platinum'];

function nextTier(current: ClientTier): ClientTier | null {
  const idx = TIER_ORDER.indexOf(current);
  return idx < TIER_ORDER.length - 1 ? TIER_ORDER[idx + 1] : null;
}

// ─────────────────────────────────────────────────────────────
// 1. RESTOCK PREDICTIONS
// ─────────────────────────────────────────────────────────────

/**
 * For each product the client has ordered, predict when they'll
 * need to reorder based on order frequency and quantity history.
 */
export function predictRestock(
  state: ClientWorldState,
): RestockPredictionResult[] {
  const predictions: RestockPredictionResult[] = [];
  const now = Date.now();

  for (const pref of state.purchasing.preferredProducts) {
    // Gather all order instances for this product
    const productOrders: { quantity: number; date: number }[] = [];
    for (const order of state.orders) {
      if (order.status === 'cancelled') continue;
      for (const item of order.items) {
        if (item.productId === pref.productId) {
          productOrders.push({
            quantity: item.quantity,
            date: order.createdAt,
          });
        }
      }
    }

    if (productOrders.length < 2) continue;

    // Sort chronologically
    productOrders.sort((a, b) => a.date - b.date);

    // Average gap in days between orders of this product
    let totalGap = 0;
    for (let i = 1; i < productOrders.length; i++) {
      totalGap += productOrders[i].date - productOrders[i - 1].date;
    }
    const avgGapDays = totalGap / (productOrders.length - 1) / MS_PER_DAY;

    // Average & last quantity
    const avgQty =
      productOrders.reduce((s, o) => s + o.quantity, 0) /
      productOrders.length;
    const lastQty = productOrders[productOrders.length - 1].quantity;
    const lastDate = productOrders[productOrders.length - 1].date;

    // Days since last order of this product
    const daysSinceLast = (now - lastDate) / MS_PER_DAY;
    const daysUntilNeeded = Math.max(0, Math.round(avgGapDays - daysSinceLast));
    const predictedDate = now + daysUntilNeeded * MS_PER_DAY;

    // Confidence based on data points (more history = higher confidence)
    const confidence = Math.min(0.95, 0.4 + productOrders.length * 0.1);

    predictions.push({
      productId: pref.productId,
      productName: pref.name,
      predictedDate,
      daysUntilNeeded,
      confidence,
      suggestedQuantity: Math.round(avgQty),
      lastOrderedQuantity: lastQty,
      averageOrderQuantity: Math.round(avgQty),
    });
  }

  // Sort by urgency (soonest first)
  return predictions.sort((a, b) => a.daysUntilNeeded - b.daysUntilNeeded);
}

// ─────────────────────────────────────────────────────────────
// 2. CHURN RISK ANALYSIS
// ─────────────────────────────────────────────────────────────

/**
 * Detailed churn analysis with weighted factors,
 * actionable suggestions, and a timeframe estimate.
 */
export function analyzeChurnRisk(state: ClientWorldState): ChurnAnalysis {
  const factors: string[] = [];
  const suggestedActions: string[] = [];
  let score = 0;

  // Factor 1: Order recency vs frequency (40%)
  if (state.purchasing.lastOrderAt) {
    const daysSince =
      (Date.now() - state.purchasing.lastOrderAt) / MS_PER_DAY;
    const ratio = daysSince / state.purchasing.orderFrequencyDays;
    if (ratio > 3) {
      score += 40;
      factors.push(
        `No order in ${Math.round(daysSince)} days (avg frequency: ${state.purchasing.orderFrequencyDays} days)`,
      );
      suggestedActions.push('Immediate personal outreach - sales manager call');
    } else if (ratio > 2) {
      score += 30;
      factors.push(
        `Order overdue by ${Math.round(daysSince - state.purchasing.orderFrequencyDays)} days`,
      );
      suggestedActions.push('Send re-engagement email with special offer');
    } else if (ratio > 1.5) {
      score += 20;
      factors.push('Order slightly overdue');
      suggestedActions.push('Gentle restock reminder');
    } else if (ratio > 1.2) {
      score += 10;
      factors.push('Approaching expected order window');
    }
  } else if (state.purchasing.totalOrders === 0) {
    score += 15;
    factors.push('No orders placed yet');
    suggestedActions.push('Onboarding follow-up call');
  }

  // Factor 2: Declining order values (20%)
  if (state.orders.length >= 3) {
    const recent = state.orders.slice(-3);
    const older = state.orders.slice(-6, -3);
    if (older.length > 0) {
      const recentAvg =
        recent.reduce((s, o) => s + o.total, 0) / recent.length;
      const olderAvg =
        older.reduce((s, o) => s + o.total, 0) / older.length;
      if (recentAvg < olderAvg * 0.7) {
        score += 20;
        factors.push(
          `Order values declining (R${Math.round(olderAvg)} -> R${Math.round(recentAvg)})`,
        );
        suggestedActions.push('Discuss changing needs, offer tailored bundles');
      } else if (recentAvg < olderAvg * 0.85) {
        score += 10;
        factors.push('Slight decline in order values');
      }
    }
  }

  // Factor 3: Payment issues (15%)
  if (state.payment.latePayments >= 3) {
    score += 15;
    factors.push(`${state.payment.latePayments} late payments`);
    suggestedActions.push('Review payment terms, offer payment plan');
  } else if (state.payment.latePayments >= 1) {
    score += 8;
    factors.push('Has had late payment(s)');
  }

  // Factor 4: Complaints (10%)
  if (state.relationship.complaintsCount >= 3) {
    score += 10;
    factors.push(`${state.relationship.complaintsCount} complaints filed`);
    suggestedActions.push('Customer success resolution meeting');
  } else if (state.relationship.complaintsCount >= 1) {
    score += 5;
    factors.push('Has filed complaint(s)');
    suggestedActions.push('Follow up on complaint resolution');
  }

  // Factor 5: Login inactivity (10%)
  if (state.behavioral.lastLoginAt) {
    const daysSinceLogin =
      (Date.now() - state.behavioral.lastLoginAt) / MS_PER_DAY;
    if (daysSinceLogin > 60) {
      score += 10;
      factors.push(`No login in ${Math.round(daysSinceLogin)} days`);
      suggestedActions.push('Re-engagement campaign');
    } else if (daysSinceLogin > 30) {
      score += 5;
      factors.push('Reduced platform engagement');
    }
  }

  // Factor 6: Cart abandonment (5%)
  if (state.behavioral.cartAbandonment >= 5) {
    score += 5;
    factors.push(
      `${state.behavioral.cartAbandonment} cart abandonments (R${state.behavioral.cartAbandonmentValue.toFixed(0)} value)`,
    );
    suggestedActions.push('Investigate cart UX barriers');
  } else if (state.behavioral.cartAbandonment >= 3) {
    score += 3;
    factors.push('Multiple cart abandonments');
  }

  // Map score to risk
  let risk: ChurnRisk;
  let timeframe: string;
  if (score >= 60) {
    risk = 'critical';
    timeframe = 'Likely to churn within 2 weeks';
  } else if (score >= 40) {
    risk = 'high';
    timeframe = 'May churn within 30 days';
  } else if (score >= 20) {
    risk = 'medium';
    timeframe = 'Monitor over next 60 days';
  } else {
    risk = 'low';
    timeframe = 'No immediate concern';
  }

  if (factors.length === 0) {
    factors.push('No risk factors detected');
  }
  if (suggestedActions.length === 0) {
    suggestedActions.push('Continue regular relationship management');
  }

  return {
    risk,
    probability: Math.min(1, score / 100),
    factors,
    suggestedActions,
    timeframe,
  };
}

// ─────────────────────────────────────────────────────────────
// 3. PAYMENT RISK ASSESSMENT
// ─────────────────────────────────────────────────────────────

export function assessPaymentRisk(
  state: ClientWorldState,
): PaymentRiskAnalysis {
  const factors: string[] = [];
  let riskScore = 0;

  // Reliability
  if (state.payment.paymentReliability < 0.5) {
    riskScore += 40;
    factors.push(
      `Low payment reliability: ${(state.payment.paymentReliability * 100).toFixed(0)}%`,
    );
  } else if (state.payment.paymentReliability < 0.8) {
    riskScore += 20;
    factors.push(
      `Below-average reliability: ${(state.payment.paymentReliability * 100).toFixed(0)}%`,
    );
  }

  // Late payments
  if (state.payment.latePayments >= 3) {
    riskScore += 30;
    factors.push(`${state.payment.latePayments} late payments on record`);
  } else if (state.payment.latePayments >= 1) {
    riskScore += 10;
    factors.push(`${state.payment.latePayments} late payment(s)`);
  }

  // Credit utilization
  if (state.payment.creditUtilization > 0.9) {
    riskScore += 20;
    factors.push(
      `Credit utilization at ${(state.payment.creditUtilization * 100).toFixed(0)}%`,
    );
  } else if (state.payment.creditUtilization > 0.7) {
    riskScore += 10;
    factors.push('High credit utilization');
  }

  // Outstanding balance with no recent payment
  if (state.payment.outstandingBalance > 0 && state.payment.lastPaymentAt) {
    const daysSincePayment =
      (Date.now() - state.payment.lastPaymentAt) / MS_PER_DAY;
    if (daysSincePayment > 30) {
      riskScore += 15;
      factors.push(
        `Outstanding R${state.payment.outstandingBalance.toFixed(0)} with no payment in ${Math.round(daysSincePayment)} days`,
      );
    }
  }

  // Determine risk level
  let riskLevel: PaymentRiskAnalysis['riskLevel'];
  if (riskScore >= 60) riskLevel = 'critical';
  else if (riskScore >= 40) riskLevel = 'high';
  else if (riskScore >= 20) riskLevel = 'medium';
  else riskLevel = 'low';

  // Recommend terms
  let recommendedTerms: PaymentTerms;
  if (riskLevel === 'critical') recommendedTerms = 'cod';
  else if (riskLevel === 'high') recommendedTerms = 'cod';
  else if (riskLevel === 'medium') recommendedTerms = 'net7';
  else if (state.payment.paymentReliability >= 0.95 && state.purchasing.totalOrders >= 5)
    recommendedTerms = 'net30';
  else recommendedTerms = 'net14';

  // Recommend credit limit
  let recommendedCreditLimit = state.client.creditLimit;
  if (riskLevel === 'low' && state.payment.paymentReliability >= 0.9) {
    recommendedCreditLimit = Math.round(
      state.purchasing.averageOrderValue * 2,
    );
  } else if (riskLevel === 'high' || riskLevel === 'critical') {
    recommendedCreditLimit = 0;
  }

  if (factors.length === 0) {
    factors.push('Good payment history');
  }

  return {
    riskLevel,
    recommendedTerms,
    recommendedCreditLimit,
    factors,
    trend: state.payment.paymentTrend,
  };
}

// ─────────────────────────────────────────────────────────────
// 4. PRODUCT RECOMMENDATIONS
// ─────────────────────────────────────────────────────────────

/**
 * Generate product recommendations based on purchase history,
 * browsing data, and the full product catalogue.
 */
export function generateProductRecommendations(
  state: ClientWorldState,
  allProducts: Product[],
): ProductRecommendation[] {
  const recommendations: ProductRecommendation[] = [];
  const purchasedIds = new Set(
    state.purchasing.preferredProducts.map((p) => p.productId),
  );
  const browsedIds = new Set(
    state.behavioral.browsingHistory.map((b) => b.productId),
  );
  const purchasedCategories = new Set(state.purchasing.preferredCategories);

  // 1. Reorder suggestions for regular products running low
  for (const pref of state.purchasing.preferredProducts) {
    const product = allProducts.find((p) => p.id === pref.productId);
    if (!product || !product.isActive) continue;

    const daysSinceLast = pref.lastOrdered
      ? (Date.now() - pref.lastOrdered) / MS_PER_DAY
      : 999;
    if (daysSinceLast > state.purchasing.orderFrequencyDays * 0.8) {
      const avgQty =
        pref.totalQuantity > 0 ? Math.round(pref.totalQuantity / pref.orderCount) : 1;
      recommendations.push({
        productId: pref.productId,
        productName: pref.name,
        reason: `Usually reorders every ~${state.purchasing.orderFrequencyDays} days. Last ordered ${Math.round(daysSinceLast)} days ago.`,
        confidence: Math.min(0.95, 0.5 + pref.orderCount * 0.05),
        expectedValue: avgQty * (product.priceTiers[0]?.price ?? product.costPrice),
        category: 'reorder',
      });
    }
  }

  // 2. Cross-sell: products in categories they haven't tried
  for (const product of allProducts) {
    if (!product.isActive) continue;
    if (purchasedIds.has(product.id)) continue;
    if (purchasedCategories.has(product.category)) continue;

    recommendations.push({
      productId: product.id,
      productName: product.name,
      reason: `Never tried ${product.category.replace('_', ' ')} category`,
      confidence: 0.4,
      expectedValue: product.priceTiers[0]?.price ?? product.costPrice,
      category: 'cross_sell',
    });

    if (recommendations.filter((r) => r.category === 'cross_sell').length >= 3)
      break;
  }

  // 3. Upsell: browsed but never purchased
  for (const product of allProducts) {
    if (!product.isActive) continue;
    if (purchasedIds.has(product.id)) continue;
    if (!browsedIds.has(product.id)) continue;

    recommendations.push({
      productId: product.id,
      productName: product.name,
      reason: 'Viewed but not yet purchased',
      confidence: 0.6,
      expectedValue: product.priceTiers[0]?.price ?? product.costPrice,
      category: 'upsell',
    });
  }

  // 4. New products in their preferred categories
  const thirtyDaysAgo = Date.now() - 30 * MS_PER_DAY;
  for (const product of allProducts) {
    if (!product.isActive) continue;
    if (purchasedIds.has(product.id)) continue;
    if (product.createdAt < thirtyDaysAgo) continue;
    if (!purchasedCategories.has(product.category)) continue;

    recommendations.push({
      productId: product.id,
      productName: product.name,
      reason: `New ${product.category.replace('_', ' ')} product (added recently)`,
      confidence: 0.5,
      expectedValue: product.priceTiers[0]?.price ?? product.costPrice,
      category: 'new_product',
    });
  }

  // Sort by confidence descending, cap at 10
  return recommendations
    .sort((a, b) => b.confidence - a.confidence)
    .slice(0, 10);
}

// ─────────────────────────────────────────────────────────────
// 5. TIER STATUS ANALYSIS
// ─────────────────────────────────────────────────────────────

export function analyzeTierStatus(state: ClientWorldState): TierAnalysis {
  const currentTier = state.relationship.tier;
  const next = nextTier(currentTier);
  const ltv = state.purchasing.lifetimeValue;

  if (!next) {
    return {
      currentTier,
      eligibleForUpgrade: false,
      nextTier: null,
      requirementsForNextTier: [],
      estimatedTimeToUpgrade: null,
    };
  }

  const threshold = TIER_THRESHOLDS[next];
  const remaining = Math.max(0, threshold - ltv);
  const progress = threshold > 0 ? Math.min(1, ltv / threshold) : 1;

  // Estimate time based on average order value and frequency
  let estimatedDays: number | null = null;
  if (
    state.purchasing.averageOrderValue > 0 &&
    state.purchasing.orderFrequencyDays > 0 &&
    remaining > 0
  ) {
    const ordersNeeded = Math.ceil(
      remaining / state.purchasing.averageOrderValue,
    );
    estimatedDays = ordersNeeded * state.purchasing.orderFrequencyDays;
  }

  return {
    currentTier,
    eligibleForUpgrade: remaining <= 0,
    nextTier: next,
    requirementsForNextTier: [
      {
        requirement: `Lifetime spend of R${threshold.toLocaleString()}`,
        current: ltv,
        needed: threshold,
        progress,
      },
    ],
    estimatedTimeToUpgrade: estimatedDays,
  };
}

// ─────────────────────────────────────────────────────────────
// 6. OPTIMAL CONTACT TIME
// ─────────────────────────────────────────────────────────────

export function recommendContactTime(
  state: ClientWorldState,
): ContactRecommendation {
  // Best day
  let bestDay = 'Monday';
  if (state.behavioral.preferredOrderDay !== 'no_pattern') {
    // Contact them the day before their usual order day
    const dayMap: Record<string, string> = {
      monday: 'Sunday',
      tuesday: 'Monday',
      wednesday: 'Tuesday',
      thursday: 'Wednesday',
      friday: 'Thursday',
      saturday: 'Friday',
      sunday: 'Saturday',
    };
    bestDay =
      dayMap[state.behavioral.preferredOrderDay] ?? 'Monday';
  }

  // Best time
  let bestTime = '09:00 - 11:00';
  if (state.behavioral.preferredOrderTime === 'afternoon')
    bestTime = '13:00 - 15:00';
  else if (state.behavioral.preferredOrderTime === 'evening')
    bestTime = '16:00 - 18:00';

  // Best channel
  let channel: InterventionChannel = 'email';
  let reason = 'Default outreach channel';

  if (state.behavioral.promotionResponseRate > 0.5) {
    channel = 'email';
    reason = 'High email engagement rate';
  } else if (state.relationship.churnRisk === 'high' || state.relationship.churnRisk === 'critical') {
    channel = 'sales_call';
    reason = 'High churn risk requires personal touch';
  } else if (state.purchasing.lifetimeValue > 300_000) {
    channel = 'sales_call';
    reason = 'VIP client deserves personal attention';
  } else if (state.behavioral.emailOpenRate < 0.2) {
    channel = 'whatsapp';
    reason = 'Low email engagement, try WhatsApp';
  }

  return { bestDay, bestTime, channel, reason };
}

// ─────────────────────────────────────────────────────────────
// 7. REVENUE FORECASTING
// ─────────────────────────────────────────────────────────────

export function forecastRevenue(state: ClientWorldState): RevenueForecast {
  const avgOV = state.purchasing.averageOrderValue;
  const freqDays = state.purchasing.orderFrequencyDays;

  if (state.purchasing.totalOrders < 2 || avgOV === 0) {
    return {
      nextOrderEstimate: 0,
      next30Days: 0,
      next90Days: 0,
      annualProjection: 0,
      confidence: 0.1,
    };
  }

  // Estimate orders per period
  const ordersPerMonth = freqDays > 0 ? 30 / freqDays : 1;
  const ordersPerQuarter = ordersPerMonth * 3;
  const ordersPerYear = ordersPerMonth * 12;

  // Confidence based on data depth
  const dataConfidence = Math.min(
    0.9,
    0.3 + state.purchasing.totalOrders * 0.05,
  );

  // Apply churn risk discount
  const churnDiscount: Record<ChurnRisk, number> = {
    low: 1.0,
    medium: 0.85,
    high: 0.6,
    critical: 0.3,
  };
  const riskMultiplier = churnDiscount[state.relationship.churnRisk];

  return {
    nextOrderEstimate: Math.round(avgOV),
    next30Days: Math.round(avgOV * ordersPerMonth * riskMultiplier),
    next90Days: Math.round(avgOV * ordersPerQuarter * riskMultiplier),
    annualProjection: Math.round(avgOV * ordersPerYear * riskMultiplier),
    confidence: Math.round(dataConfidence * riskMultiplier * 100) / 100,
  };
}
