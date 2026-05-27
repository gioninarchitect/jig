// P26 — Compliance Block Modal (POS integration)
// Shown BEFORE payment when pre-sale validation detects blocks or warnings.
// Blocks must be resolved before sale can proceed. Warnings are informational.

import Modal from './ui/Modal';
import Badge from './ui/Badge';

const BLOCK_TYPE_CONFIG = {
  PURCHASE_LIMIT_DAILY: { icon: 'scale', label: 'Daily Purchase Limit' },
  PURCHASE_LIMIT_MONTHLY: { icon: 'calendar', label: 'Monthly Purchase Limit' },
  EXPIRED_COA: { icon: 'document', label: 'Expired Certificate' },
  BATCH_QA_FAILED: { icon: 'shield', label: 'QA Failed' },
  STAFF_NOT_CERTIFIED: { icon: 'user', label: 'Staff Certification' },
  PRESCRIPTION_MISSING: { icon: 'file', label: 'Prescription Missing' },
  PRESCRIPTION_EXPIRED: { icon: 'clock', label: 'Prescription Expired' },
  CUSTOMER_NOT_IDENTIFIED: { icon: 'id', label: 'Customer Required' },
  PRODUCT_RECALLED: { icon: 'alert', label: 'Product Recalled' },
  BATCH_RECALLED: { icon: 'alert', label: 'Batch Recalled' },
};

const ACTION_LABELS = {
  BLOCK_SALE: 'Sale cannot proceed',
  REMOVE_ITEM: 'Remove item from cart',
  BLOCK_MEDICAL_ITEMS: 'Remove medical items',
};

/**
 * @param {Object} props
 * @param {boolean} props.open
 * @param {Function} props.onClose
 * @param {Array} props.blocks — compliance blocks (hard stops)
 * @param {Array} props.warnings — compliance warnings (informational)
 * @param {Function} props.onRemoveItem — (itemId) => remove item from cart
 * @param {Function} props.onProceedWithWarnings — proceed despite warnings (no blocks)
 */
export default function ComplianceBlockModal({ open, onClose, blocks, warnings, onRemoveItem, onProceedWithWarnings }) {
  const hasBlocks = blocks?.length > 0;
  const hasWarnings = warnings?.length > 0;

  return (
    <Modal open={open} onClose={onClose} title="Compliance Check" size="lg">
      <div className="space-y-4">
        {/* Status header */}
        <div className={`p-3 rounded-lg text-center ${
          hasBlocks ? 'bg-origin-red/10 border border-origin-red/20' : 'bg-or-gold/10 border border-or-gold/20'
        }`}>
          <div className={`font-heading text-lg ${hasBlocks ? 'text-origin-red' : 'text-or-gold-dark'}`}>
            {hasBlocks ? 'SALE BLOCKED' : 'WARNINGS DETECTED'}
          </div>
          <div className="text-xs text-gray-500 mt-1">
            {hasBlocks
              ? `${blocks.length} compliance issue${blocks.length !== 1 ? 's' : ''} must be resolved before proceeding`
              : `${warnings.length} warning${warnings.length !== 1 ? 's' : ''} — review before proceeding`
            }
          </div>
        </div>

        {/* Blocks */}
        {hasBlocks && (
          <div className="space-y-2">
            <div className="text-xs text-origin-red font-bold uppercase">Blocking Issues</div>
            {blocks.map((block, i) => {
              const cfg = BLOCK_TYPE_CONFIG[block.type] || { label: block.type };
              const canRemove = block.action === 'REMOVE_ITEM' || block.action === 'BLOCK_MEDICAL_ITEMS';

              return (
                <div key={i} className="p-3 rounded-lg border border-origin-red/20 bg-origin-red/5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <Badge status="error">{cfg.label}</Badge>
                      </div>
                      <div className="text-sm text-white">{block.message}</div>
                      <div className="text-[10px] text-gray-400 mt-1">
                        {ACTION_LABELS[block.action] || block.action}
                      </div>
                    </div>
                    {canRemove && block.itemId && onRemoveItem && (
                      <button
                        onClick={() => onRemoveItem(block.itemId)}
                        className="px-3 py-1.5 rounded-lg bg-origin-red text-white text-xs font-bold hover:bg-red-700 transition-colors shrink-0"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Warnings */}
        {hasWarnings && (
          <div className="space-y-2">
            <div className="text-xs text-or-gold-dark font-bold uppercase">Warnings</div>
            {warnings.map((warning, i) => {
              const cfg = BLOCK_TYPE_CONFIG[warning.type] || { label: warning.type };

              return (
                <div key={i} className="p-3 rounded-lg border border-or-gold/20 bg-or-gold/5">
                  <div className="flex items-center gap-2 mb-1">
                    <Badge status="warning">{cfg.label}</Badge>
                  </div>
                  <div className="text-sm text-white">{warning.message}</div>
                </div>
              );
            })}
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2 pt-2 border-t border-gray-100">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-lg bg-gray-100 text-gray-700 text-sm font-bold hover:bg-gray-200 transition-colors"
          >
            Back to Cart
          </button>
          {!hasBlocks && hasWarnings && onProceedWithWarnings && (
            <button
              onClick={onProceedWithWarnings}
              className="flex-1 py-2.5 rounded-lg bg-or-gold text-white text-sm font-bold hover:bg-or-gold-dark transition-colors"
            >
              Proceed with Warnings
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
