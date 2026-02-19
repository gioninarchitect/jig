// P22 — Network Status Bar for 360View
// Branch online/offline indicators, active tills, staff count

import { formatCurrency } from '../../config';

export default function NetworkStatusBar({ branches, ownerStats }) {
  const active = branches.filter(b => b.isActive);
  const openNow = active.filter(b => b.stats?.isOpenNow);
  const totalTills = active.reduce((sum, b) => sum + (b.stats?.activeTills || 0), 0);
  const totalStaff = active.reduce((sum, b) => sum + (b.stats?.staffCount || 0), 0);
  const totalRevenue = ownerStats?.todayRevenue || active.reduce((sum, b) => sum + (b.stats?.todayRevenue || 0), 0);
  const totalOrders = ownerStats?.todayOrders || active.reduce((sum, b) => sum + (b.stats?.todayOrders || 0), 0);

  return (
    <div className="flex items-center gap-6 px-4 py-2 bg-jig-slate text-white rounded-xl">
      {/* Branches online */}
      <div className="flex items-center gap-2">
        <div className={`w-2.5 h-2.5 rounded-full ${openNow.length > 0 ? 'bg-jig-purple animate-pulse' : 'bg-gray-500'}`} />
        <span className="text-xs">
          <span className="font-heading text-sm">{openNow.length}</span>
          <span className="text-white/60">/{active.length} branches open</span>
        </span>
      </div>

      {/* Today's Revenue */}
      <div className="text-xs">
        <span className="text-white/60">Revenue: </span>
        <span className="font-heading text-sm">{formatCurrency(totalRevenue)}</span>
      </div>

      {/* Orders */}
      <div className="text-xs">
        <span className="text-white/60">Orders: </span>
        <span className="font-heading text-sm">{totalOrders}</span>
      </div>

      {/* Active Tills */}
      <div className="text-xs">
        <span className="text-white/60">Tills: </span>
        <span className="font-heading text-sm">{totalTills}</span>
      </div>

      {/* Staff on Shift */}
      <div className="text-xs">
        <span className="text-white/60">Staff: </span>
        <span className="font-heading text-sm">{totalStaff}</span>
      </div>

      {/* Low Stock */}
      {ownerStats?.lowStockCount > 0 && (
        <div className="text-xs">
          <span className="text-jig-amber font-bold">{ownerStats.lowStockCount} low stock</span>
        </div>
      )}
    </div>
  );
}
