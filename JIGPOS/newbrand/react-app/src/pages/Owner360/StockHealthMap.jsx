// P22 — Network-Wide Stock Health Map for 360View
// Aggregated stock health across all branches

import { formatCurrency } from '../../config';
import { useOriginWorldModel } from '../../world-model/WorldModelContext';

function healthBar(value, max = 100) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100));
  let color = 'bg-or-gold';
  if (pct < 40) color = 'bg-origin-red';
  else if (pct < 70) color = 'bg-or-gold';
  return { pct, color };
}

export default function StockHealthMap({ branches }) {
  const { allBranches } = useOriginWorldModel();

  const activeBranches = branches.filter(b => b.isActive);

  // Aggregate network totals
  const network = activeBranches.reduce((acc, branch) => {
    const stats = branch.stats || {};
    acc.totalValue += stats.inventoryValue || 0;
    acc.totalQuantity += stats.inventoryQuantity || 0;
    acc.totalLowStock += stats.lowStockItems || 0;
    return acc;
  }, { totalValue: 0, totalQuantity: 0, totalLowStock: 0 });

  return (
    <div className="space-y-4">
      {/* Network Totals */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Network Stock Value</div>
          <div className="font-heading text-lg text-white">{formatCurrency(network.totalValue)}</div>
        </div>
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Total Units</div>
          <div className="font-heading text-lg text-white">{network.totalQuantity.toLocaleString()}</div>
        </div>
        <div className="p-3 rounded-lg bg-origin-slate border border-or-gold/20 text-center">
          <div className="text-xs text-or-gold-light">Low Stock Items</div>
          <div className={`font-heading text-lg ${network.totalLowStock > 5 ? 'text-origin-red' : 'text-white'}`}>
            {network.totalLowStock}
          </div>
        </div>
      </div>

      {/* Per-branch stock bars */}
      <div className="space-y-3">
        {activeBranches.map(branch => {
          const stats = branch.stats || {};
          const worldState = allBranches[branch._id];
          const stockHealth = worldState?.stockHealth || {};
          const overall = stockHealth.overall || 0;
          const bar = healthBar(overall);

          return (
            <div key={branch._id} className="p-3 rounded-lg bg-white border border-gray-200">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm font-semibold text-white">{branch.name}</span>
                <span className="text-xs text-gray-400">{formatCurrency(stats.inventoryValue || 0)}</span>
              </div>

              {/* Health bar */}
              <div className="w-full h-2.5 rounded-full bg-gray-100 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${bar.color}`}
                  style={{ width: `${bar.pct}%` }}
                />
              </div>

              {/* Metrics row */}
              <div className="flex justify-between mt-2 text-[10px] text-gray-400">
                <span>{stats.inventoryQuantity || 0} units</span>
                <span>{stats.lowStockItems || 0} low stock</span>
                <span className={overall > 0 ? '' : 'opacity-40'}>
                  Health: {overall > 0 ? `${overall}%` : '--'}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
