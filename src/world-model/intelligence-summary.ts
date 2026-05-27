/**
 * PureGro Premium Cannabis Care - Intelligence Summary (Pure Function)
 *
 * Extracted from ClientWorldContext so it can be used by the
 * server without pulling in React dependencies.
 */

import type { ClientWorldState } from './types';
import {
  analyzeChurnRisk,
  assessPaymentRisk,
  analyzeTierStatus,
  predictRestock,
  forecastRevenue,
} from './inference';

export interface ClientIntelligenceSummary {
  healthScore: number;
  topConcerns: string[];
  opportunities: string[];
  recommendedActions: string[];
}

export function computeIntelligenceSummary(
  state: ClientWorldState,
): ClientIntelligenceSummary {
  const concerns: string[] = [];
  const opportunities: string[] = [];
  const actions: string[] = [];

  let score = 100;

  // Churn risk penalty
  const churn = analyzeChurnRisk(state);
  if (churn.risk === 'critical') {
    score -= 40;
    concerns.push(`CHURN CRITICAL: ${churn.factors[0]}`);
    actions.push(churn.suggestedActions[0]);
  } else if (churn.risk === 'high') {
    score -= 25;
    concerns.push(`Churn risk HIGH: ${churn.factors[0]}`);
    actions.push(churn.suggestedActions[0]);
  } else if (churn.risk === 'medium') {
    score -= 10;
    concerns.push(`Churn risk medium: ${churn.factors[0]}`);
  }

  // Payment risk penalty
  const payRisk = assessPaymentRisk(state);
  if (payRisk.riskLevel === 'critical') {
    score -= 20;
    concerns.push(`PAYMENT CRITICAL: ${payRisk.factors[0]}`);
    actions.push(`Switch to ${payRisk.recommendedTerms.toUpperCase()} terms`);
  } else if (payRisk.riskLevel === 'high') {
    score -= 10;
    concerns.push(`Payment risk: ${payRisk.factors[0]}`);
  }

  // Outstanding balance penalty
  if (state.payment.outstandingBalance > 0) {
    const overdue = state.orders.filter((o) => o.paymentStatus === 'overdue');
    if (overdue.length > 0) {
      const total = overdue.reduce((s, o) => s + o.total, 0);
      score -= 10;
      concerns.push(`R${total.toFixed(0)} overdue across ${overdue.length} order(s)`);
      actions.push('Send payment reminder');
    }
  }

  // Complaints penalty
  if (state.relationship.complaintsCount > 0) {
    score -= state.relationship.complaintsCount * 3;
    concerns.push(`${state.relationship.complaintsCount} complaint(s) on record`);
  }

  // Tier upgrade opportunity
  const tier = analyzeTierStatus(state);
  if (tier.nextTier && tier.requirementsForNextTier.length > 0) {
    const req = tier.requirementsForNextTier[0];
    const remaining = req.needed - req.current;
    if (remaining > 0 && remaining < state.purchasing.averageOrderValue * 3) {
      opportunities.push(
        `R${remaining.toFixed(0)} from ${tier.nextTier.toUpperCase()} tier (${Math.round(req.progress * 100)}% progress)`,
      );
      actions.push(`Suggest bulk order to unlock ${tier.nextTier} pricing`);
    }
  }

  // Restock predictions
  const restock = predictRestock(state);
  const urgentRestock = restock.filter((r) => r.daysUntilNeeded <= 7);
  if (urgentRestock.length > 0) {
    opportunities.push(`${urgentRestock.length} product(s) due for reorder within 7 days`);
    actions.push(`Send restock reminder for ${urgentRestock[0].productName}`);
  }

  // Cross-sell potential
  if (state.purchasing.preferredCategories.length <= 2) {
    opportunities.push(
      `Only buys ${state.purchasing.preferredCategories.length} category/ies - cross-sell opportunity`,
    );
  }

  // Revenue forecast
  const forecast = forecastRevenue(state);
  if (forecast.next30Days > 0) {
    opportunities.push(`Forecasted R${forecast.next30Days.toLocaleString()} in next 30 days`);
  }

  score = Math.max(0, Math.min(100, score));

  if (concerns.length === 0) concerns.push('No concerns');
  if (opportunities.length === 0) opportunities.push('Maintain current engagement');
  if (actions.length === 0) actions.push('Continue regular relationship management');

  return {
    healthScore: score,
    topConcerns: concerns.slice(0, 5),
    opportunities: opportunities.slice(0, 5),
    recommendedActions: actions.slice(0, 5),
  };
}
