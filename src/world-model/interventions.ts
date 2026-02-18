/**
 * JIG Craft Cannabis - Automated Intervention Triggers
 *
 * 11 intervention triggers across 4 categories, each with:
 *   - A condition predicate
 *   - An intervention generator
 *   - A cooldown to prevent spam
 *
 * The main export `generateInterventions()` evaluates all triggers
 * against a client state and returns the top prioritised actions.
 */

import type {
  ClientWorldState,
  Intervention,
  InterventionPriority,
  InterventionTrigger,
} from './types';

// ─────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────

const MS_PER_DAY = 86_400_000;
const MS_PER_HOUR = 3_600_000;

let interventionCounter = 0;
function generateId(): string {
  interventionCounter += 1;
  return `int_${Date.now()}_${interventionCounter}`;
}

// ─────────────────────────────────────────────────────────────
// REORDER REMINDER TRIGGERS (2)
// ─────────────────────────────────────────────────────────────

const REORDER_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'restock_gentle',
    name: 'Gentle Restock Reminder',
    condition: (s) =>
      s.inventory.estimatedStockDays <= 7 &&
      s.inventory.estimatedStockDays > 3,
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'reorder_reminder',
      channel: 'email',
      priority: 'low',
      triggeredBy: 'restock_gentle',
      message: `Hi ${s.client.contactPerson}, based on your order history you might be running low soon. Ready to restock?`,
    }),
    cooldownHours: 72,
    priority: 'low',
  },
  {
    id: 'restock_urgent',
    name: 'Urgent Restock Reminder',
    condition: (s) => s.inventory.estimatedStockDays <= 3,
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'reorder_reminder',
      channel: 'whatsapp',
      priority: 'high',
      triggeredBy: 'restock_urgent',
      message: `${s.client.companyName} - Stock alert! You're likely running low. Quick reorder? We can ship today.`,
    }),
    cooldownHours: 24,
    priority: 'high',
  },
];

// ─────────────────────────────────────────────────────────────
// CHURN PREVENTION TRIGGERS (3)
// ─────────────────────────────────────────────────────────────

const CHURN_PREVENTION_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'churn_medium_risk',
    name: 'Medium Churn Risk Outreach',
    condition: (s) => {
      if (!s.purchasing.lastOrderAt || s.purchasing.totalOrders <= 2)
        return false;
      const daysSince =
        (Date.now() - s.purchasing.lastOrderAt) / MS_PER_DAY;
      return daysSince > s.purchasing.orderFrequencyDays * 1.5;
    },
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'churn_prevention',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'churn_medium_risk',
      message: `Hi ${s.client.contactPerson}, we noticed it's been a while since your last order. Everything okay? Here's what's new in our catalogue...`,
    }),
    cooldownHours: 168, // 1 week
    priority: 'medium',
  },
  {
    id: 'churn_high_risk',
    name: 'High Churn Risk - Personal Touch',
    condition: (s) => s.relationship.churnRisk === 'high',
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'churn_prevention',
      channel: 'sales_call',
      priority: 'high',
      triggeredBy: 'churn_high_risk',
      message: `URGENT: ${s.client.companyName} (LTV: R${s.purchasing.lifetimeValue.toFixed(0)}) at high churn risk. Personal call needed.`,
    }),
    cooldownHours: 336, // 2 weeks
    priority: 'high',
  },
  {
    id: 'win_back',
    name: 'Win Back Campaign',
    condition: (s) => {
      if (!s.purchasing.lastOrderAt) return false;
      const daysSince =
        (Date.now() - s.purchasing.lastOrderAt) / MS_PER_DAY;
      return daysSince > 90 && s.purchasing.lifetimeValue > 50_000;
    },
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'win_back',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'win_back',
      message: `We miss you ${s.client.companyName}! Come back with 10% off your next order.`,
    }),
    cooldownHours: 720, // 30 days
    priority: 'medium',
  },
];

// ─────────────────────────────────────────────────────────────
// PAYMENT REMINDER TRIGGERS (2)
// ─────────────────────────────────────────────────────────────

const PAYMENT_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'payment_due_soon',
    name: 'Payment Due Soon',
    condition: (s) => {
      return s.orders.some(
        (o) =>
          o.paymentStatus === 'pending' &&
          o.paymentDueDate != null &&
          (o.paymentDueDate - Date.now()) / MS_PER_DAY <= 3 &&
          (o.paymentDueDate - Date.now()) > 0,
      );
    },
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'payment_reminder',
      channel: 'email',
      priority: 'low',
      triggeredBy: 'payment_due_soon',
      message: `Friendly reminder: You have a payment due in the next 3 days. Please settle to keep your account in good standing.`,
    }),
    cooldownHours: 72,
    priority: 'low',
  },
  {
    id: 'payment_overdue',
    name: 'Payment Overdue',
    condition: (s) => {
      return s.orders.some((o) => o.paymentStatus === 'overdue');
    },
    generateIntervention: (s) => {
      const overdueOrders = s.orders.filter(
        (o) => o.paymentStatus === 'overdue',
      );
      const totalOverdue = overdueOrders.reduce(
        (sum, o) => sum + o.total,
        0,
      );
      return {
        clientId: s.clientId,
        type: 'payment_reminder',
        channel: 'sms',
        priority: 'high',
        triggeredBy: 'payment_overdue',
        message: `Payment of R${totalOverdue.toFixed(0)} is overdue. Please settle to avoid service interruption.`,
      };
    },
    cooldownHours: 48,
    priority: 'high',
  },
];

// ─────────────────────────────────────────────────────────────
// UPSELL / OPPORTUNITY TRIGGERS (4)
// ─────────────────────────────────────────────────────────────

const UPSELL_TRIGGERS: InterventionTrigger[] = [
  {
    id: 'tier_upgrade_eligible',
    name: 'Tier Upgrade Available',
    condition: (s) => {
      const thresholds: Record<string, number> = {
        standard: 100_000,
        silver: 300_000,
        gold: 750_000,
        platinum: Infinity,
      };
      return (
        s.purchasing.lifetimeValue >= thresholds[s.relationship.tier]
      );
    },
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'vip_offer',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'tier_upgrade_eligible',
      message: `Congratulations ${s.client.companyName}! You've unlocked better pricing. Your new tier brings automatic savings on every order.`,
    }),
    cooldownHours: 720, // 30 days
    priority: 'medium',
  },
  {
    id: 'bulk_incentive',
    name: 'Bulk Order Incentive',
    condition: (s) =>
      s.purchasing.averageOrderValue < 25_000 &&
      s.purchasing.totalOrders >= 3,
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'upsell',
      channel: 'in_app',
      priority: 'low',
      triggeredBy: 'bulk_incentive',
      message: `Did you know? Orders over R25,000 unlock an extra 5% off. Your average order is R${s.purchasing.averageOrderValue.toFixed(0)}.`,
    }),
    cooldownHours: 336, // 2 weeks
    priority: 'low',
  },
  {
    id: 'cart_recovery',
    name: 'Cart Recovery',
    condition: (s) =>
      s.behavioral.cartAbandonment > 0 &&
      s.behavioral.cartAbandonmentValue > 5_000,
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'reorder_reminder',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'cart_recovery',
      message: `Still thinking? Your last cart had R${s.behavioral.cartAbandonmentValue.toFixed(0)} worth of products. Complete your order today.`,
    }),
    cooldownHours: 24,
    priority: 'medium',
  },
  {
    id: 'welcome_new_client',
    name: 'Welcome New Client',
    condition: (s) =>
      s.relationship.accountAgeDays <= 3 &&
      s.purchasing.totalOrders === 0,
    generateIntervention: (s) => ({
      clientId: s.clientId,
      type: 'welcome',
      channel: 'email',
      priority: 'medium',
      triggeredBy: 'welcome_new_client',
      message: `Welcome to JIG Craft Cannabis, ${s.client.contactPerson}! Browse our catalogue and place your first order to start earning tier rewards.`,
    }),
    cooldownHours: 168, // only once effectively
    priority: 'medium',
  },
];

// ─────────────────────────────────────────────────────────────
// ALL TRIGGERS
// ─────────────────────────────────────────────────────────────

const ALL_TRIGGERS: InterventionTrigger[] = [
  ...REORDER_TRIGGERS,
  ...CHURN_PREVENTION_TRIGGERS,
  ...PAYMENT_TRIGGERS,
  ...UPSELL_TRIGGERS,
];

// ─────────────────────────────────────────────────────────────
// COOLDOWN CHECK
// ─────────────────────────────────────────────────────────────

/**
 * Check whether a trigger's cooldown has elapsed since the
 * last intervention of the same triggeredBy type.
 */
export function shouldTriggerIntervention(
  trigger: InterventionTrigger,
  state: ClientWorldState,
): boolean {
  // First check if the condition is met
  if (!trigger.condition(state)) return false;

  // Then check cooldown
  const lastSameType = state.interventions
    .filter((i) => i.triggeredBy === trigger.id)
    .sort((a, b) => b.triggeredAt - a.triggeredAt)[0];

  if (!lastSameType) return true; // never triggered before

  const hoursSince =
    (Date.now() - lastSameType.triggeredAt) / MS_PER_HOUR;
  return hoursSince >= trigger.cooldownHours;
}

// ─────────────────────────────────────────────────────────────
// PRIORITY ORDERING
// ─────────────────────────────────────────────────────────────

const PRIORITY_WEIGHT: Record<InterventionPriority, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
};

// ─────────────────────────────────────────────────────────────
// MAIN GENERATOR
// ─────────────────────────────────────────────────────────────

/**
 * Evaluate all triggers against the client state.
 * Returns up to `limit` interventions sorted by priority.
 */
export function generateInterventions(
  state: ClientWorldState,
  limit = 5,
): Intervention[] {
  const now = Date.now();
  const results: Intervention[] = [];

  for (const trigger of ALL_TRIGGERS) {
    if (!shouldTriggerIntervention(trigger, state)) continue;

    const partial = trigger.generateIntervention(state);
    results.push({
      id: generateId(),
      triggeredAt: now,
      status: 'pending',
      ...partial,
    });
  }

  // Sort by priority (highest first), then cap
  return results
    .sort(
      (a, b) =>
        PRIORITY_WEIGHT[b.priority] - PRIORITY_WEIGHT[a.priority],
    )
    .slice(0, limit);
}

/**
 * Get all trigger definitions (for admin UI listing).
 */
export function getInterventionTriggers(): ReadonlyArray<InterventionTrigger> {
  return ALL_TRIGGERS;
}
