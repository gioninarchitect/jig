// P24 — Demand Chart (demand prediction visualization)
// CSS-based bar chart showing predicted demand vs current stock for top products.

import { useState, useMemo } from 'react';

const URGENCY_COLORS = {
  critical: 'bg-origin-red',
  urgent: 'bg-or-gold',
  soon: 'bg-blue-400',
  healthy: 'bg-or-gold',
};

export default function DemandChart({ predictions, inventory }) {
  const [sortBy, setSortBy] = useState('urgency');
  const [showCount, setShowCount] = useState(15);

  const chartData = useMemo(() => {
    if (!predictions?.length) return [];

    const data = predictions.map((p, i) => {
      const inv = inventory?.[i];
      return {
        ...p,
        productName: inv?.productName || inv?.name || `Product #${(p.productId || '').toString().slice(-6)}`,
        category: inv?.category || '',
      };
    });

    // Sort
    if (sortBy === 'urgency') {
      const order = { critical: 0, urgent: 1, soon: 2, healthy: 3 };
      data.sort((a, b) => (order[a.reorderUrgency] || 3) - (order[b.reorderUrgency] || 3));
    } else if (sortBy === 'demand') {
      data.sort((a, b) => b.dailyDemand - a.dailyDemand);
    } else if (sortBy === 'stock') {
      data.sort((a, b) => a.daysOfStock - b.daysOfStock);
    }

    return data.slice(0, showCount);
  }, [predictions, inventory, sortBy, showCount]);

  if (!predictions?.length) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">No demand predictions available</div>
    );
  }

  // Find max values for scaling
  const maxDemand = Math.max(...chartData.map(d => d.dailyDemand), 1);
  const maxStock = Math.max(...chartData.map(d => d.currentStock), 1);

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="flex gap-1">
          {[
            { key: 'urgency', label: 'By Urgency' },
            { key: 'demand', label: 'By Demand' },
            { key: 'stock', label: 'By Stock' },
          ].map(s => (
            <button
              key={s.key}
              onClick={() => setSortBy(s.key)}
              className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
                sortBy === s.key ? 'bg-or-gold text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
        <select
          value={showCount}
          onChange={e => setShowCount(Number(e.target.value))}
          className="text-xs border border-gray-200 rounded px-2 py-1"
        >
          <option value={10}>Top 10</option>
          <option value={15}>Top 15</option>
          <option value={25}>Top 25</option>
          <option value={50}>Top 50</option>
        </select>
      </div>

      {/* Legend */}
      <div className="flex items-center gap-4 text-[10px] text-gray-500">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-or-gold/60" />
          <span>Daily Demand</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-origin-slate/30" />
          <span>Current Stock (scaled)</span>
        </div>
        <div className="flex items-center gap-3 ml-auto">
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-origin-red" />Critical</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-or-gold" />Urgent</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-400" />Soon</span>
          <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-or-gold" />Healthy</span>
        </div>
      </div>

      {/* Chart */}
      <div className="space-y-1">
        {chartData.map((item, i) => {
          const demandWidth = maxDemand > 0 ? (item.dailyDemand / maxDemand) * 100 : 0;
          const stockWidth = maxStock > 0 ? (item.currentStock / maxStock) * 100 : 0;
          const urgencyColor = URGENCY_COLORS[item.reorderUrgency] || 'bg-gray-400';

          return (
            <div key={item.productId || i} className="group">
              {/* Product label */}
              <div className="flex items-center justify-between mb-0.5">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${urgencyColor}`} />
                  <span className="text-xs text-white truncate max-w-[200px]">
                    {item.productName}
                  </span>
                </div>
                <div className="flex items-center gap-3 text-[10px] text-gray-400 shrink-0">
                  <span>{item.dailyDemand}/day</span>
                  <span>{item.currentStock} units</span>
                  <span className={`font-bold ${
                    item.daysOfStock <= 3 ? 'text-origin-red' :
                    item.daysOfStock <= 7 ? 'text-or-gold-dark' :
                    'text-or-gold'
                  }`}>{item.daysOfStock}d</span>
                </div>
              </div>

              {/* Bars */}
              <div className="space-y-0.5 pl-4">
                {/* Demand bar */}
                <div className="h-3 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-or-gold/60 rounded transition-all duration-500"
                    style={{ width: `${Math.max(demandWidth, 1)}%` }}
                  />
                </div>
                {/* Stock bar */}
                <div className="h-3 bg-gray-100 rounded overflow-hidden">
                  <div
                    className="h-full bg-origin-slate/30 rounded transition-all duration-500"
                    style={{ width: `${Math.max(stockWidth, 1)}%` }}
                  />
                </div>
              </div>

              {/* Adjustments tooltip on hover */}
              {item.adjustments?.length > 0 && (
                <div className="hidden group-hover:flex flex-wrap gap-1 pl-4 mt-0.5">
                  {item.adjustments.map((adj, j) => (
                    <span key={j} className="px-1.5 py-0.5 rounded text-[9px] bg-or-gold/10 text-or-gold-dark">
                      {adj.factor}: {adj.impact > 1 ? '+' : ''}{Math.round((adj.impact - 1) * 100)}%
                    </span>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Summary */}
      <div className="text-xs text-gray-400 text-center">
        Showing {chartData.length} of {predictions.length} products
      </div>
    </div>
  );
}
