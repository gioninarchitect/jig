// P24 — Transfer Suggestions (inter-branch transfer recommendations)
// Shows stock imbalances across the network with transfer cost vs reorder cost comparison.

import { useState } from 'react';
import { formatCurrency } from '../../config';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';

export default function TransferSuggestions({ suggestions }) {
  const [initiating, setInitiating] = useState(null);

  async function handleInitiateTransfer(suggestion, index) {
    setInitiating(index);
    try {
      await api.post('/stock-transfers', {
        fromBranchId: suggestion.fromBranch.id,
        toBranchId: suggestion.toBranch.id,
        type: 'rebalancing',
        priority: suggestion.toDaysOfStock <= 1 ? 'urgent' : 'normal',
        items: [{
          productId: suggestion.productId,
          name: suggestion.productName,
          quantity: suggestion.quantity,
        }],
        requestNotes: `Smart Stock suggestion: ${suggestion.fromBranch.name} has ${suggestion.fromDaysOfStock} days, ${suggestion.toBranch.name} has ${suggestion.toDaysOfStock} days. Savings: ${formatCurrency(suggestion.savings)}.`,
      });
    } catch {
      // Error handled silently
    }
    setInitiating(null);
  }

  if (!suggestions.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">No transfer suggestions</div>
        <div className="text-xs text-gray-300 mt-1">Stock levels are balanced across branches</div>
      </div>
    );
  }

  const totalSavings = suggestions.reduce((s, t) => s + (t.savings || 0), 0);

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="flex items-center justify-between text-xs">
        <span className="text-gray-500">
          {suggestions.length} transfer{suggestions.length !== 1 ? 's' : ''} suggested
        </span>
        <span className="font-bold text-jig-purple">
          Potential savings: {formatCurrency(totalSavings)}
        </span>
      </div>

      {/* Transfer cards */}
      {suggestions.map((s, i) => (
        <div key={i} className={`p-4 rounded-lg border ${
          s.recommendation === 'transfer' ? 'border-jig-purple/30 bg-jig-purple/5' : 'border-gray-200 bg-white'
        }`}>
          {/* Product name + recommendation */}
          <div className="flex items-center justify-between mb-3">
            <span className="font-heading text-sm text-white">
              {s.productName || `Product #${(s.productId || '').toString().slice(-6)}`}
            </span>
            <Badge status={s.recommendation === 'transfer' ? 'active' : 'info'}>
              {s.recommendation === 'transfer' ? 'Transfer' : 'Reorder'}
            </Badge>
          </div>

          {/* Transfer flow */}
          <div className="flex items-center gap-3 mb-3">
            {/* From branch */}
            <div className="flex-1 p-2 rounded bg-white border border-gray-200 text-center">
              <div className="text-[10px] text-gray-400 uppercase">From</div>
              <div className="text-xs font-bold text-white">{s.fromBranch.name}</div>
              <div className="text-xs text-gray-500">{s.fromDaysOfStock} days of stock</div>
            </div>

            {/* Arrow */}
            <div className="flex flex-col items-center">
              <svg className="w-6 h-6 text-jig-purple" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
              <span className="text-xs font-bold text-white">{s.quantity} units</span>
            </div>

            {/* To branch */}
            <div className="flex-1 p-2 rounded bg-white border border-jig-red/20 text-center">
              <div className="text-[10px] text-gray-400 uppercase">To</div>
              <div className="text-xs font-bold text-white">{s.toBranch.name}</div>
              <div className={`text-xs ${s.toDaysOfStock <= 1 ? 'text-jig-red font-bold' : 'text-gray-500'}`}>
                {s.toDaysOfStock} days of stock
              </div>
            </div>
          </div>

          {/* Cost comparison */}
          <div className="grid grid-cols-3 gap-2 text-xs mb-3">
            <div className="p-2 rounded bg-jig-purple/5 text-center">
              <div className="text-gray-400">Transfer Cost</div>
              <div className="font-bold text-jig-purple">{formatCurrency(s.transferCost)}</div>
            </div>
            <div className="p-2 rounded bg-jig-red/5 text-center">
              <div className="text-gray-400">Reorder Cost</div>
              <div className="font-bold text-jig-red">{formatCurrency(s.reorderCost)}</div>
            </div>
            <div className="p-2 rounded bg-jig-amber/5 text-center">
              <div className="text-gray-400">Savings</div>
              <div className="font-bold text-jig-amber-dark">{formatCurrency(s.savings)}</div>
            </div>
          </div>

          {/* Action */}
          {s.recommendation === 'transfer' && (
            <button
              onClick={() => handleInitiateTransfer(s, i)}
              disabled={initiating === i}
              className="w-full py-2 rounded-lg bg-jig-purple text-white text-xs font-bold hover:bg-jig-purple-dark transition-colors disabled:opacity-50"
            >
              {initiating === i ? 'Creating Transfer...' : 'Initiate Transfer'}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
