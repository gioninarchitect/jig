// P24 — Reorder Suggestions (actionable reorder cards)
// Shows products that need reordering with predicted demand + optimal quantities.

import { useState } from 'react';
import { formatCurrency } from '../../config';
import Badge from '../../components/ui/Badge';
import api from '../../services/api';

const URGENCY_CONFIG = {
  critical: { badge: 'error', border: 'border-origin-red/30 bg-origin-red/5', label: 'Critical' },
  urgent: { badge: 'warning', border: 'border-or-gold/30 bg-or-gold/5', label: 'Urgent' },
  soon: { badge: 'info', border: 'border-blue-200 bg-blue-50', label: 'Soon' },
  healthy: { badge: 'active', border: 'border-gray-200 bg-white', label: 'Healthy' },
};

export default function ReorderSuggestions({ suggestions, autoReorderEnabled }) {
  const [creating, setCreating] = useState(null);
  const [filter, setFilter] = useState('all');

  const filtered = filter === 'all'
    ? suggestions
    : suggestions.filter(s => s.urgency === filter);

  async function handleCreatePO(suggestion) {
    setCreating(suggestion.productId);
    try {
      await api.post('/purchase-orders', {
        items: [{
          product: suggestion.productId,
          productName: suggestion.productName,
          productSku: suggestion.sku,
          quantity: suggestion.suggestedQuantity,
          unitPrice: suggestion.estimatedCost / suggestion.suggestedQuantity,
        }],
        notes: `Auto-suggested by Smart Stock (${suggestion.reason}, ${suggestion.daysOfStock} days of stock remaining)`,
        status: 'draft',
      });
    } catch {
      // Error handled silently — PO creation is non-critical
    }
    setCreating(null);
  }

  if (!suggestions.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">No reorder suggestions</div>
        <div className="text-xs text-gray-300 mt-1">All products are above reorder thresholds</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2 flex-wrap">
        {['all', 'critical', 'urgent', 'soon'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filter === f
                ? 'bg-or-gold text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? `All (${suggestions.length})` : `${f.charAt(0).toUpperCase() + f.slice(1)} (${suggestions.filter(s => s.urgency === f).length})`}
          </button>
        ))}
      </div>

      {/* Total estimated cost */}
      <div className="text-xs text-gray-500">
        Estimated total cost: <span className="font-bold text-white">{formatCurrency(filtered.reduce((s, r) => s + r.estimatedCost, 0))}</span>
      </div>

      {/* Suggestion cards */}
      {filtered.map((s, i) => {
        const cfg = URGENCY_CONFIG[s.urgency] || URGENCY_CONFIG.healthy;
        return (
          <div key={s.productId || i} className={`p-4 rounded-lg border ${cfg.border}`}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={cfg.badge}>{cfg.label}</Badge>
                  <span className="font-heading text-sm text-white truncate">
                    {s.productName || s.sku || `Product #${(s.productId || '').toString().slice(-6)}`}
                  </span>
                </div>
                {s.sku && <div className="text-[10px] text-gray-400 mb-2">SKU: {s.sku}</div>}

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <div className="text-gray-400">Current Stock</div>
                    <div className="font-bold text-white">{s.currentStock} units</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Daily Demand</div>
                    <div className="font-bold text-white">{s.dailyDemand}/day</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Days of Stock</div>
                    <div className={`font-bold ${s.daysOfStock <= 3 ? 'text-origin-red' : s.daysOfStock <= 7 ? 'text-or-gold-dark' : 'text-white'}`}>
                      {s.daysOfStock} days
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-400">Confidence</div>
                    <div className={`font-bold ${
                      s.confidence.level === 'high' ? 'text-or-gold' :
                      s.confidence.level === 'medium' ? 'text-or-gold-dark' :
                      'text-origin-red'
                    }`}>{s.confidence.level}</div>
                  </div>
                </div>

                {/* Reason */}
                <div className="mt-2 text-xs text-gray-500">
                  {s.reason}
                  {s.reorderDate && ` — reorder by ${new Date(s.reorderDate).toLocaleDateString('en-ZA')}`}
                </div>
              </div>

              {/* Right: order action */}
              <div className="text-right shrink-0">
                <div className="text-xs text-gray-400">Suggested</div>
                <div className="font-heading text-lg text-white">{s.suggestedQuantity} units</div>
                <div className="text-xs text-gray-400">{formatCurrency(s.estimatedCost)}</div>
                <button
                  onClick={() => handleCreatePO(s)}
                  disabled={creating === s.productId}
                  className="mt-2 px-3 py-1.5 rounded-lg bg-or-gold text-white text-xs font-bold hover:bg-or-gold-dark transition-colors disabled:opacity-50"
                >
                  {creating === s.productId ? 'Creating...' : 'Draft PO'}
                </button>
              </div>
            </div>

            {/* Demand adjustments */}
            {s.prediction?.adjustments?.length > 0 && (
              <div className="mt-3 flex flex-wrap gap-1">
                {s.prediction.adjustments.map((adj, j) => (
                  <span
                    key={j}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      adj.impact > 1 ? 'bg-or-gold/10 text-or-gold-dark' : 'bg-blue-50 text-blue-600'
                    }`}
                  >
                    {adj.factor}: {adj.impact > 1 ? '+' : ''}{Math.round((adj.impact - 1) * 100)}%
                  </span>
                ))}
              </div>
            )}
          </div>
        );
      })}

      {autoReorderEnabled && (
        <div className="text-center text-xs text-or-gold font-bold py-2">
          Auto-reorder is enabled — draft POs will be created automatically for critical items
        </div>
      )}
    </div>
  );
}
