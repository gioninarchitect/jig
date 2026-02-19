// P22+P34 — Branch Grid for 360View
// P34: React.memo on BranchCard — only re-render changed branches

import { memo } from 'react';
import { formatCurrency } from '../../config';

function healthColor(branch) {
  const stats = branch.stats || {};
  if (!branch.isActive) return 'border-gray-300 bg-gray-50';
  if (stats.lowStockItems > 5) return 'border-jig-red/40 bg-jig-red/5';
  if (stats.lowStockItems > 2) return 'border-jig-amber/40 bg-jig-amber/5';
  return 'border-jig-purple/30 bg-jig-purple/5';
}

function statusDot(branch) {
  if (!branch.isActive) return 'bg-gray-400';
  if (branch.stats?.isOpenNow) return 'bg-jig-purple animate-pulse';
  return 'bg-jig-amber';
}

// P34: Memoised branch card — only re-renders when branch data or selection changes
const BranchCard = memo(function BranchCard({ branch, isSelected, onSelect }) {
  const stats = branch.stats || {};
  return (
    <button
      onClick={() => onSelect(branch)}
      className={`
        relative text-left p-4 rounded-xl border-2 transition-all
        ${healthColor(branch)}
        ${isSelected ? 'ring-2 ring-jig-amber shadow-lg scale-[1.02]' : 'hover:shadow-md hover:scale-[1.01]'}
      `}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className={`w-2.5 h-2.5 rounded-full ${statusDot(branch)}`} />
          <span className="font-heading text-sm text-white uppercase truncate">
            {branch.name}
          </span>
        </div>
        {stats.activeTills > 0 && (
          <span className="text-[10px] font-bold text-jig-purple-light bg-jig-purple/10 px-1.5 py-0.5 rounded">
            {stats.activeTills} till{stats.activeTills !== 1 ? 's' : ''}
          </span>
        )}
      </div>
      <div className="mb-2">
        <div className="text-xs text-jig-purple-light">Today's Revenue</div>
        <div className="font-heading text-xl text-white">
          {formatCurrency(stats.todayRevenue || 0)}
        </div>
      </div>
      <div className="grid grid-cols-3 gap-2 text-center">
        <div>
          <div className="text-xs text-jig-purple-light">Orders</div>
          <div className="font-heading text-sm text-white">{stats.todayOrders || 0}</div>
        </div>
        <div>
          <div className="text-xs text-jig-purple-light">Staff</div>
          <div className="font-heading text-sm text-white">{stats.staffCount || 0}</div>
        </div>
        <div>
          <div className="text-xs text-jig-purple-light">Low Stock</div>
          <div className={`font-heading text-sm ${stats.lowStockItems > 2 ? 'text-jig-red' : 'text-white'}`}>
            {stats.lowStockItems || 0}
          </div>
        </div>
      </div>
      <div className="mt-2 text-[10px] text-jig-purple-light/60">
        {branch.branchCode || branch._id.slice(-6).toUpperCase()}
      </div>
    </button>
  );
});

export default function BranchGrid({ branches, onSelectBranch, selectedBranchId }) {
  if (!branches.length) {
    return (
      <div className="text-center py-8 text-gray-400 text-sm">No branches configured</div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {branches.map(branch => (
        <BranchCard
          key={branch._id}
          branch={branch}
          isSelected={branch._id === selectedBranchId}
          onSelect={onSelectBranch}
        />
      ))}
    </div>
  );
}
