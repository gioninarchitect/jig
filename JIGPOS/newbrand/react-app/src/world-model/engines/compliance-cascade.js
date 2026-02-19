// P26 — Pre-Sale Compliance Cascade Engine (World First #4)
// Runs BEFORE every sale to validate compliance across all domains.
// Feature-gated: config.features.complianceCascade.enabled
//
// 5 validation checks:
//   1. Purchase limit (daily/monthly gram limits)
//   2. Batch CoA validation (lab certificate expiry)
//   3. Section 21 staff certification
//   4. Section 21 patient/prescription verification
//   5. Product recall check

import api from '../../services/api';

// ─── SA Cannabis Compliance Constants ───────────────────────────

const DEFAULT_DAILY_GRAM_LIMIT = 150;    // grams per day
const DEFAULT_MONTHLY_GRAM_LIMIT = 600;  // grams per month
const PURCHASE_LIMIT_WARNING = 0.8;      // 80% = warning
const PURCHASE_LIMIT_BLOCK = 1.0;        // 100% = hard block
const COA_EXPIRY_WARNING_DAYS = 14;      // warn 14 days before CoA expiry

// ─── Cart Weight Calculation ────────────────────────────────────

/**
 * Calculate total controlled substance weight in cart.
 * @param {Array} cart — [{productId, name, quantity, weight, track, isControlled}]
 * @returns {number} grams
 */
export function calculateCartWeight(cart) {
  if (!cart?.length) return 0;

  return cart.reduce((total, item) => {
    // Only count controlled items
    if (!item.isControlled && item.track !== 'medical') return total;

    // Weight per unit × quantity
    const weightPerUnit = item.weight || item.quantityInGrams || 0;
    return total + (weightPerUnit * (item.quantity || 1));
  }, 0);
}

// ─── Core: Validate Sale ────────────────────────────────────────

/**
 * Run all pre-sale compliance checks.
 * @param {Object} params
 * @param {Array} params.cart — cart items
 * @param {Object|null} params.customer — customer data (null for walk-in)
 * @param {Object} params.staff — current staff member
 * @param {Array} params.batches — batch data for items in cart
 * @param {Object} config — WorldModelConfig
 * @returns {Object} { allowed, blocks, warnings }
 */
export function validateSale({ cart, customer, staff, batches }, config) {
  if (!config?.features?.complianceCascade?.enabled) {
    return { allowed: true, blocks: [], warnings: [] };
  }

  if (!config.features.complianceCascade.preSaleBlocking) {
    return { allowed: true, blocks: [], warnings: [] };
  }

  const blocks = [];
  const warnings = [];

  // ── Check 1: Purchase Limit ───────────────────────────────────

  if (customer) {
    const limits = customer.purchaseLimits || {};
    const dailyLimit = limits.dailyLimit || DEFAULT_DAILY_GRAM_LIMIT;
    const monthlyLimit = limits.monthlyLimit || DEFAULT_MONTHLY_GRAM_LIMIT;
    const dailyUsed = limits.dailyUsed || 0;
    const monthlyUsed = limits.monthlyUsed || 0;
    const cartWeight = calculateCartWeight(cart);

    // Daily limit check
    const dailyAfter = dailyUsed + cartWeight;
    const dailyPercent = dailyAfter / dailyLimit;

    if (dailyPercent >= PURCHASE_LIMIT_BLOCK) {
      blocks.push({
        type: 'PURCHASE_LIMIT_DAILY',
        message: `Customer at ${dailyUsed}g of ${dailyLimit}g daily limit. Cart adds ${cartWeight}g (total: ${dailyAfter}g).`,
        action: 'BLOCK_SALE',
        data: { dailyUsed, dailyLimit, cartWeight, dailyAfter },
      });
    } else if (dailyPercent >= PURCHASE_LIMIT_WARNING) {
      warnings.push({
        type: 'PURCHASE_LIMIT_DAILY_WARNING',
        message: `Customer approaching daily limit: ${dailyAfter}g of ${dailyLimit}g (${Math.round(dailyPercent * 100)}%)`,
        data: { dailyUsed, dailyLimit, cartWeight, dailyPercent: Math.round(dailyPercent * 100) },
      });
    }

    // Monthly limit check
    const monthlyAfter = monthlyUsed + cartWeight;
    const monthlyPercent = monthlyAfter / monthlyLimit;

    if (monthlyPercent >= PURCHASE_LIMIT_BLOCK) {
      blocks.push({
        type: 'PURCHASE_LIMIT_MONTHLY',
        message: `Customer at ${monthlyUsed}g of ${monthlyLimit}g monthly limit. Cart adds ${cartWeight}g (total: ${monthlyAfter}g).`,
        action: 'BLOCK_SALE',
        data: { monthlyUsed, monthlyLimit, cartWeight, monthlyAfter },
      });
    } else if (monthlyPercent >= PURCHASE_LIMIT_WARNING) {
      warnings.push({
        type: 'PURCHASE_LIMIT_MONTHLY_WARNING',
        message: `Customer approaching monthly limit: ${monthlyAfter}g of ${monthlyLimit}g (${Math.round(monthlyPercent * 100)}%)`,
        data: { monthlyUsed, monthlyLimit, cartWeight, monthlyPercent: Math.round(monthlyPercent * 100) },
      });
    }
  }

  // ── Check 2: Batch CoA Validation ─────────────────────────────

  const now = new Date();
  for (const item of (cart || [])) {
    const batch = batches?.find(b =>
      (b._id || b.batchId) === item.batchId ||
      (b.product || b.productId) === (item.productId || item.product)
    );

    if (!batch) continue;

    // CoA expiry (lab certificate)
    const coaExpiry = batch.coaExpiryDate || batch.expiryDate;
    if (coaExpiry) {
      const expiryDate = new Date(coaExpiry);
      if (expiryDate < now) {
        const daysAgo = Math.floor((now - expiryDate) / 86400000);
        blocks.push({
          type: 'EXPIRED_COA',
          message: `Batch ${batch.batchId || batch.batchNumber || 'Unknown'} CoA expired ${daysAgo} days ago`,
          action: 'REMOVE_ITEM',
          itemId: item.id || item.productId,
          itemName: item.name,
          data: { batchId: batch.batchId, expiryDate: coaExpiry, daysExpired: daysAgo },
        });
      } else {
        const daysUntil = Math.floor((expiryDate - now) / 86400000);
        if (daysUntil <= COA_EXPIRY_WARNING_DAYS) {
          warnings.push({
            type: 'COA_EXPIRING_SOON',
            message: `Batch ${batch.batchId || 'Unknown'} CoA expires in ${daysUntil} days`,
            itemId: item.id || item.productId,
            data: { batchId: batch.batchId, daysUntilExpiry: daysUntil },
          });
        }
      }
    }

    // QA status check
    if (batch.qaStatus === 'rejected' || batch.qaStatus === 'expired') {
      blocks.push({
        type: 'BATCH_QA_FAILED',
        message: `Batch ${batch.batchId || 'Unknown'} has QA status: ${batch.qaStatus}`,
        action: 'REMOVE_ITEM',
        itemId: item.id || item.productId,
        itemName: item.name,
        data: { batchId: batch.batchId, qaStatus: batch.qaStatus },
      });
    }
  }

  // ── Check 3: Section 21 Staff Certification ───────────────────

  const hasMedical = (cart || []).some(item =>
    item.track === 'medical' || item.requiresSection21
  );

  if (hasMedical && staff) {
    if (!staff.section21Certified && !staff.role?.includes('admin') && !staff.role?.includes('owner')) {
      blocks.push({
        type: 'STAFF_NOT_CERTIFIED',
        message: 'Staff member not Section 21 certified — cannot process medical sales',
        action: 'BLOCK_SALE',
        data: { staffId: staff._id || staff.id, staffName: staff.name || staff.firstName },
      });
    }
  }

  // ── Check 4: Section 21 Patient Verification ──────────────────

  if (hasMedical && customer) {
    // Check prescription
    if (!customer.section21Prescription && !customer.section21Status?.approved) {
      blocks.push({
        type: 'PRESCRIPTION_MISSING',
        message: 'Customer has no Section 21 prescription on file',
        action: 'BLOCK_MEDICAL_ITEMS',
        data: { customerId: customer._id || customer.id },
      });
    } else if (customer.section21PrescriptionExpiry) {
      const prescExpiry = new Date(customer.section21PrescriptionExpiry);
      if (prescExpiry < now) {
        const daysExpired = Math.floor((now - prescExpiry) / 86400000);
        blocks.push({
          type: 'PRESCRIPTION_EXPIRED',
          message: `Customer Section 21 prescription expired ${daysExpired} days ago`,
          action: 'BLOCK_MEDICAL_ITEMS',
          data: { customerId: customer._id || customer.id, expiryDate: customer.section21PrescriptionExpiry, daysExpired },
        });
      }
    }

    // No customer for medical sale = must identify
    if (!customer._id && !customer.id) {
      blocks.push({
        type: 'CUSTOMER_NOT_IDENTIFIED',
        message: 'Medical sale requires customer identification — assign a customer to this sale',
        action: 'BLOCK_MEDICAL_ITEMS',
      });
    }
  } else if (hasMedical && !customer) {
    blocks.push({
      type: 'CUSTOMER_NOT_IDENTIFIED',
      message: 'Medical sale requires customer identification — assign a customer to this sale',
      action: 'BLOCK_MEDICAL_ITEMS',
    });
  }

  // ── Check 5: Product Recall Check ─────────────────────────────

  for (const item of (cart || [])) {
    if (item.recalled || item.status === 'recalled') {
      blocks.push({
        type: 'PRODUCT_RECALLED',
        message: `${item.name || 'Product'} has been recalled — remove from sale`,
        action: 'REMOVE_ITEM',
        itemId: item.id || item.productId,
        itemName: item.name,
      });
    }

    // Check batch recall status
    const batch = batches?.find(b =>
      (b._id || b.batchId) === item.batchId ||
      (b.product || b.productId) === (item.productId || item.product)
    );
    if (batch?.status === 'recalled') {
      blocks.push({
        type: 'BATCH_RECALLED',
        message: `Batch ${batch.batchId || 'Unknown'} for ${item.name || 'product'} has been recalled`,
        action: 'REMOVE_ITEM',
        itemId: item.id || item.productId,
        itemName: item.name,
        data: { batchId: batch.batchId, reason: batch.qaRejectionReason },
      });
    }
  }

  return {
    allowed: blocks.length === 0,
    blocks,
    warnings,
    checkedAt: Date.now(),
    checksRun: 5,
  };
}

// ─── Audit Trail Logger ─────────────────────────────────────────

/**
 * Log compliance check result for audit trail.
 * @param {Object} result — from validateSale()
 * @param {Object} context — { staffId, customerId, branchId, saleId }
 */
export async function logComplianceCheck(result, context) {
  try {
    await api.post('/compliance/log', {
      type: 'SALE_VALIDATION',
      result: result.blocks.length > 0 ? 'BLOCKED' :
              result.warnings.length > 0 ? 'WARNING' : 'PASSED',
      blocks: result.blocks,
      warnings: result.warnings,
      staffId: context.staffId,
      customerId: context.customerId,
      branchId: context.branchId,
      saleId: context.saleId,
      timestamp: new Date().toISOString(),
    });
  } catch {
    // Audit logging should never block the sale flow
  }
}

// ─── Document Expiry Helpers ────────────────────────────────────

/**
 * Categorize expiring documents by urgency.
 * @param {Array} documents — [{type, name, expiryDate}]
 * @returns {Object} { expired, critical, warning, ok }
 */
export function categorizeDocuments(documents) {
  if (!documents?.length) return { expired: [], critical: [], warning: [], ok: [] };

  const now = new Date();
  const result = { expired: [], critical: [], warning: [], ok: [] };

  for (const doc of documents) {
    if (!doc.expiryDate) { result.ok.push(doc); continue; }

    const expiry = new Date(doc.expiryDate);
    const daysUntil = Math.floor((expiry - now) / 86400000);

    if (daysUntil < 0) {
      result.expired.push({ ...doc, daysExpired: Math.abs(daysUntil) });
    } else if (daysUntil <= 7) {
      result.critical.push({ ...doc, daysUntilExpiry: daysUntil });
    } else if (daysUntil <= 30) {
      result.warning.push({ ...doc, daysUntilExpiry: daysUntil });
    } else {
      result.ok.push({ ...doc, daysUntilExpiry: daysUntil });
    }
  }

  return result;
}

/**
 * Calculate audit readiness score (0-100, higher = more ready).
 * @param {Object} complianceState — documents, prescriptions, licenses
 * @returns {number}
 */
export function calculateAuditReadiness(complianceState) {
  if (!complianceState) return 100;

  let score = 100;

  // Expired documents: -15 each
  const expired = complianceState.expiredDocuments?.length || 0;
  score -= expired * 15;

  // Pending reviews: -5 each
  const pending = complianceState.pendingReviews?.length || 0;
  score -= pending * 5;

  // Missing required documents: -20 each
  const missing = complianceState.missingRequired?.length || 0;
  score -= missing * 20;

  // Blocked sales in last 30 days: -3 each
  const blocked = complianceState.recentBlockedSales || 0;
  score -= blocked * 3;

  // Bonus: recent successful audit
  if (complianceState.lastAuditPassed) score += 10;

  return Math.max(0, Math.min(100, Math.round(score)));
}
