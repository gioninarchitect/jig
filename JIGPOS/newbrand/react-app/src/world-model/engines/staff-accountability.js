// P25 — Staff Accountability Engine (World First #5)
// Calculates composite staff performance score from 6 operational metrics.
// Feature-gated: config.features.staffAccountability.enabled
//
// Metrics:
//   1. Till accuracy — variance amount / total transactions
//   2. Void/refund ratio — voids per shift vs threshold
//   3. Discount compliance — discounts within policy limits
//   4. Speed consistency — transaction times within expected range
//   5. Stocktake accuracy — count accuracy during stocktakes
//   6. Clock-in compliance — on-time arrivals vs total shifts

// ─── Metric Weights ─────────────────────────────────────────────

const METRIC_WEIGHTS = {
  tillAccuracy: 0.25,
  voidRefundRatio: 0.15,
  discountCompliance: 0.15,
  speedConsistency: 0.15,
  stocktakeAccuracy: 0.15,
  clockInCompliance: 0.15,
};

// ─── Individual Metric Calculators ──────────────────────────────

/**
 * Till accuracy — how close to zero is cash variance.
 * Score 0-100 (100 = perfect, 0 = terrible).
 * @param {string} staffId
 * @param {Object} financial — BranchWorldState.financial
 */
export function calculateTillAccuracy(staffId, financial) {
  const variances = (financial?.tillVariances || []).filter(v => v.staffId === staffId);

  if (!variances.length) return { score: 100, details: 'No shifts recorded' };

  const totalVariance = variances.reduce((s, v) => s + Math.abs(v.amount || 0), 0);
  const avgVariance = totalVariance / variances.length;

  // R0 variance = 100, R200+ = 0
  let score = 100 - (avgVariance / 2);
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    avgVariance: Math.round(avgVariance * 100) / 100,
    shiftCount: variances.length,
    totalVariance: Math.round(totalVariance * 100) / 100,
    details: avgVariance <= 10 ? 'Excellent accuracy' :
             avgVariance <= 50 ? 'Acceptable variance' :
             avgVariance <= 100 ? 'Needs improvement' : 'Serious variance issue',
  };
}

/**
 * Void/refund ratio — lower = better.
 * Score 0-100.
 */
export function calculateVoidRatio(staffId, financial, thresholds) {
  const voidThreshold = thresholds?.voidRefundFrequency || 5;
  const staffVoids = (financial?.voidsByStaff || {})[staffId] || 0;
  const staffShifts = (financial?.shiftsByStaff || {})[staffId] || 1;

  const voidsPerShift = staffVoids / staffShifts;

  // 0 voids/shift = 100, threshold+ = 0
  let score = 100 - (voidsPerShift / voidThreshold) * 100;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    voidsPerShift: Math.round(voidsPerShift * 100) / 100,
    totalVoids: staffVoids,
    shiftCount: staffShifts,
    details: voidsPerShift <= 1 ? 'Low void champion' :
             voidsPerShift <= voidThreshold * 0.5 ? 'Within acceptable range' :
             voidsPerShift <= voidThreshold ? 'Approaching threshold' : 'Above threshold',
  };
}

/**
 * Discount compliance — discounts within policy limits.
 * Score 0-100.
 */
export function calculateDiscountCompliance(staffId, financial) {
  const discounts = (financial?.discountsByStaff || {})[staffId] || { count: 0, total: 0, approved: 0 };

  if (discounts.count === 0) return { score: 100, details: 'No discounts applied' };

  // Approved/total ratio
  const approvalRate = discounts.approved / discounts.count;

  // Average discount amount (lower = better)
  const avgDiscount = discounts.total / discounts.count;

  let score = approvalRate * 70; // 70% from approval rate
  score += avgDiscount <= 50 ? 30 : avgDiscount <= 100 ? 20 : avgDiscount <= 200 ? 10 : 0;
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    discountCount: discounts.count,
    approvalRate: Math.round(approvalRate * 100),
    avgDiscount: Math.round(avgDiscount),
    details: approvalRate >= 0.95 ? 'Excellent compliance' :
             approvalRate >= 0.8 ? 'Mostly compliant' : 'Needs supervisor review',
  };
}

/**
 * Speed consistency — transaction processing time.
 * Score 0-100.
 */
export function calculateSpeedConsistency(staffId, staff) {
  const metrics = (staff?.shiftMetrics || {})[staffId] || {};
  const avgTime = metrics.avgTransactionTime || 0; // seconds
  const consistency = metrics.timeConsistency || 0; // 0-1

  if (!avgTime) return { score: 80, details: 'No timing data' };

  // Target: 60-120 seconds per transaction
  let timeScore = 0;
  if (avgTime >= 30 && avgTime <= 120) timeScore = 100;
  else if (avgTime <= 180) timeScore = 70;
  else if (avgTime <= 300) timeScore = 40;
  else timeScore = 20;

  // Consistency bonus (stable times = reliable)
  const consistencyBonus = consistency * 20;

  const score = Math.min(100, Math.round(timeScore * 0.7 + consistencyBonus));

  return {
    score,
    avgTransactionTime: Math.round(avgTime),
    consistency: Math.round(consistency * 100),
    details: avgTime <= 120 ? 'Fast and efficient' :
             avgTime <= 180 ? 'Average speed' : 'Slow — may need training',
  };
}

/**
 * Stocktake accuracy — counting precision during stocktakes.
 * Score 0-100.
 */
export function calculateStocktakeAccuracy(staffId, inventory) {
  // Stocktake variance attributed to this staff member
  const staffCounts = (inventory?.stocktakeCounts || {})[staffId] || { total: 0, accurate: 0 };

  if (staffCounts.total === 0) return { score: 90, details: 'No stocktakes assigned' };

  const accuracyRate = staffCounts.accurate / staffCounts.total;

  let score = Math.round(accuracyRate * 100);

  return {
    score,
    totalCounts: staffCounts.total,
    accurateCount: staffCounts.accurate,
    accuracyRate: Math.round(accuracyRate * 100),
    details: accuracyRate >= 0.98 ? 'Highly accurate counter' :
             accuracyRate >= 0.9 ? 'Good accuracy' : 'Needs counting training',
  };
}

/**
 * Clock-in compliance — attendance and punctuality.
 * Score 0-100.
 */
export function calculateClockInCompliance(staffId, staff) {
  const attendance = (staff?.attendance || {})[staffId] || { onTime: 0, late: 0, absent: 0, total: 0 };

  if (attendance.total === 0) return { score: 90, details: 'No attendance data' };

  const onTimeRate = attendance.onTime / attendance.total;
  const absentRate = attendance.absent / attendance.total;

  let score = onTimeRate * 80; // 80% from punctuality
  score -= absentRate * 40;     // Penalty for absences
  score = Math.max(0, Math.min(100, Math.round(score)));

  return {
    score,
    onTimeRate: Math.round(onTimeRate * 100),
    lateCount: attendance.late,
    absentCount: attendance.absent,
    totalShifts: attendance.total,
    details: onTimeRate >= 0.95 ? 'Excellent punctuality' :
             onTimeRate >= 0.8 ? 'Generally punctual' : 'Attendance concerns',
  };
}

// ─── Composite Staff Score ──────────────────────────────────────

/**
 * Calculate overall staff accountability score.
 * @param {string} staffId
 * @param {Object} state — BranchWorldState
 * @param {Object} config — WorldModelConfig
 * @returns {Object|null} { staffId, score, metrics, achievements, trend }
 */
export function calculateStaffScore(staffId, state, config) {
  if (!config?.features?.staffAccountability?.enabled) return null;

  const thresholds = config.thresholds || {};

  const metrics = {
    tillAccuracy: calculateTillAccuracy(staffId, state.financial),
    voidRefundRatio: calculateVoidRatio(staffId, state.financial, thresholds),
    discountCompliance: calculateDiscountCompliance(staffId, state.financial),
    speedConsistency: calculateSpeedConsistency(staffId, state.staff),
    stocktakeAccuracy: calculateStocktakeAccuracy(staffId, state.inventory),
    clockInCompliance: calculateClockInCompliance(staffId, state.staff),
  };

  // Weighted average
  let weightedSum = 0;
  let totalWeight = 0;
  for (const [key, weight] of Object.entries(METRIC_WEIGHTS)) {
    if (metrics[key]) {
      weightedSum += (metrics[key].score || 0) * weight;
      totalWeight += weight;
    }
  }
  const compositeScore = totalWeight > 0 ? Math.round(weightedSum / totalWeight) : 0;

  // Achievements (positive reinforcement)
  const achievements = [];
  if (config.features.staffAccountability.positiveReinforcement) {
    if (metrics.tillAccuracy.score >= 99) achievements.push({ id: 'perfect_till', label: 'Perfect Till Streak', icon: 'target' });
    if (metrics.voidRefundRatio.score >= 95) achievements.push({ id: 'low_void', label: 'Low Void Champion', icon: 'shield' });
    if (metrics.speedConsistency.score >= 90) achievements.push({ id: 'speed_star', label: 'Speed Star', icon: 'zap' });
    if (metrics.clockInCompliance.score >= 98) achievements.push({ id: 'punctual', label: 'Always On Time', icon: 'clock' });
    if (metrics.stocktakeAccuracy.score >= 98) achievements.push({ id: 'eagle_eye', label: 'Eagle Eye Counter', icon: 'eye' });
    if (compositeScore >= 90) achievements.push({ id: 'top_performer', label: 'Top Performer', icon: 'star' });
  }

  // Score tier
  let tier = 'needs_improvement';
  if (compositeScore >= 90) tier = 'exceptional';
  else if (compositeScore >= 75) tier = 'good';
  else if (compositeScore >= 60) tier = 'satisfactory';

  return {
    staffId,
    score: compositeScore,
    tier,
    metrics,
    achievements,
  };
}

// ─── Leaderboard ────────────────────────────────────────────────

/**
 * Calculate leaderboard for all staff at a branch.
 * @param {Array} staffIds — list of staff member IDs
 * @param {Object} state — BranchWorldState
 * @param {Object} config
 * @returns {Array} sorted by score descending
 */
export function calculateLeaderboard(staffIds, state, config) {
  if (!config?.features?.staffAccountability?.enabled || !staffIds?.length) return [];

  return staffIds
    .map(id => calculateStaffScore(id, state, config))
    .filter(Boolean)
    .sort((a, b) => b.score - a.score);
}
