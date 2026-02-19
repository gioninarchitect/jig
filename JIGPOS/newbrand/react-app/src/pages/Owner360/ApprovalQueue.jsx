// P22 — Aggregated Approval Queue for 360View
// All pending approvals from all branches: POs, cashups, stocktakes, payments

import { useState } from 'react';
import { formatCurrency } from '../../config';
import { useToast } from '../../components/ui/Toast';
import Badge from '../../components/ui/Badge';

const TYPE_LABELS = {
  purchase_order: 'PO',
  cashup: 'Cashup',
  stocktake: 'Stocktake',
  payment: 'Payment',
};

const TYPE_BADGE = {
  purchase_order: 'pending',
  cashup: 'warning',
  stocktake: 'info',
  payment: 'processing',
};

function timeAgo(ts) {
  if (!ts) return '';
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return `${Math.floor(diff / 86400000)}d ago`;
}

export default function ApprovalQueue({ approvals, counts, onApprove, onReject }) {
  const { addToast } = useToast();
  const [processing, setProcessing] = useState(null);
  const [typeFilter, setTypeFilter] = useState(null);

  const filtered = typeFilter
    ? approvals.filter(a => a.type === typeFilter)
    : approvals;

  const handleApprove = async (item) => {
    setProcessing(item.id);
    const ok = await onApprove(item);
    if (ok) {
      addToast({ type: 'success', title: 'Approved', message: `${item.title} approved` });
    } else {
      addToast({ type: 'error', title: 'Error', message: 'Failed to approve' });
    }
    setProcessing(null);
  };

  const handleReject = async (item) => {
    setProcessing(item.id);
    const ok = await onReject(item, 'Rejected from 360View');
    if (ok) {
      addToast({ type: 'success', title: 'Rejected', message: `${item.title} rejected` });
    } else {
      addToast({ type: 'error', title: 'Error', message: 'Failed to reject' });
    }
    setProcessing(null);
  };

  const FILTERS = [
    { key: null, label: 'All', count: approvals.length },
    { key: 'purchase_order', label: 'POs', count: counts.purchaseOrders || 0 },
    { key: 'cashup', label: 'Cashups', count: counts.cashups || 0 },
    { key: 'stocktake', label: 'Stocktakes', count: counts.stocktakes || 0 },
    { key: 'payment', label: 'Payments', count: counts.payments || 0 },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filter tabs */}
      <div className="flex gap-1 mb-3 overflow-x-auto">
        {FILTERS.map(f => (
          <button
            key={f.key || 'all'}
            onClick={() => setTypeFilter(f.key)}
            className={`shrink-0 px-3 py-1 rounded text-xs font-bold transition-colors ${
              typeFilter === f.key
                ? 'bg-jig-purple text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
            {f.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-white/30 text-[10px]">{f.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Queue list */}
      <div className="flex-1 overflow-y-auto space-y-2">
        {filtered.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No pending approvals</div>
        ) : (
          filtered.map(item => (
            <div
              key={`${item.type}-${item.id}`}
              className={`p-3 rounded-lg border bg-white ${
                item.priority === 'high' || item.priority === 'critical'
                  ? 'border-jig-red/30'
                  : 'border-gray-200'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <Badge status={TYPE_BADGE[item.type] || 'info'}>
                      {TYPE_LABELS[item.type] || item.type}
                    </Badge>
                    <span className="font-heading text-sm text-white truncate">{item.title}</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {item.subtitle}
                    {item.branch && <span className="ml-2 text-jig-purple-light">{item.branch}</span>}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {item.amount != null && (
                    <div className="font-heading text-sm text-white">{formatCurrency(item.amount)}</div>
                  )}
                  <div className="text-[10px] text-gray-400">{timeAgo(item.createdAt)}</div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex gap-2">
                <button
                  onClick={() => handleApprove(item)}
                  disabled={processing === item.id}
                  className="flex-1 py-1.5 rounded bg-jig-purple text-white text-xs font-bold hover:bg-jig-purple-dark disabled:opacity-50 transition-colors"
                >
                  {processing === item.id ? '...' : 'Approve'}
                </button>
                {item.type === 'purchase_order' && (
                  <button
                    onClick={() => handleReject(item)}
                    disabled={processing === item.id}
                    className="flex-1 py-1.5 rounded bg-jig-red/10 text-jig-red text-xs font-bold hover:bg-jig-red/20 disabled:opacity-50 transition-colors"
                  >
                    Reject
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
