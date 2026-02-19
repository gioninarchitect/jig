// P22 — Branch Drill Down for 360View
// Detailed view of a single branch: KPIs, stock, staff, recent events

import { useState, useEffect } from 'react';
import api from '../../services/api';
import { formatCurrency } from '../../config';
import { useBranchState } from '../../world-model/WorldModelContext';
import LiveEventStream from './LiveEventStream';
import Badge from '../../components/ui/Badge';

export default function BranchDrillDown({ branch, onClose }) {
  const [staffList, setStaffList] = useState([]);
  const [loadingStaff, setLoadingStaff] = useState(false);
  const [tab, setTab] = useState('overview');

  // Get World Model state for this branch
  const branchWorldState = useBranchState(branch._id);

  const stats = branch.stats || {};

  // Load staff list
  useEffect(() => {
    if (!branch._id) return;
    setLoadingStaff(true);
    api.get(`/branches/${branch._id}/staff`)
      .then(res => setStaffList(res.data?.staff || res.data?.data || []))
      .catch(() => setStaffList([]))
      .finally(() => setLoadingStaff(false));
  }, [branch._id]);

  const TABS = [
    { key: 'overview', label: 'Overview' },
    { key: 'stock', label: 'Stock' },
    { key: 'staff', label: 'Staff' },
    { key: 'events', label: 'Events' },
  ];

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-heading text-xl text-white uppercase">{branch.name}</h3>
            <Badge status={branch.isActive ? 'active' : 'error'}>
              {branch.isActive ? (stats.isOpenNow ? 'OPEN' : 'CLOSED') : 'INACTIVE'}
            </Badge>
          </div>
          <div className="text-xs text-gray-400 mt-0.5">
            {branch.branchCode || ''} {branch.address?.suburb ? `- ${branch.address.suburb}, ${branch.address.city}` : ''}
          </div>
        </div>
        <button onClick={onClose} className="p-2 rounded-full hover:bg-gray-100 transition-colors">
          <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-jig-purple/5 border border-jig-purple/20">
          <div className="text-xs text-jig-purple-light">Today Revenue</div>
          <div className="font-heading text-lg text-white">{formatCurrency(stats.todayRevenue || 0)}</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-purple/5 border border-jig-purple/20">
          <div className="text-xs text-jig-purple-light">Orders</div>
          <div className="font-heading text-lg text-white">{stats.todayOrders || 0}</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-purple/5 border border-jig-purple/20">
          <div className="text-xs text-jig-purple-light">Stock Value</div>
          <div className="font-heading text-lg text-white">{formatCurrency(stats.inventoryValue || 0)}</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-purple/5 border border-jig-purple/20">
          <div className="text-xs text-jig-purple-light">Low Stock</div>
          <div className={`font-heading text-lg ${stats.lowStockItems > 2 ? 'text-jig-red' : 'text-white'}`}>
            {stats.lowStockItems || 0}
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded text-xs font-bold transition-colors ${
              tab === t.key ? 'bg-white text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {tab === 'overview' && (
        <div className="space-y-3">
          {/* Revenue breakdown */}
          <div className="p-4 rounded-lg bg-white border border-gray-200">
            <div className="text-xs text-jig-purple-light font-bold uppercase mb-3">Revenue Period</div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">Today</span>
                <span className="font-heading text-sm text-white">{formatCurrency(stats.todayRevenue || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">This Week</span>
                <span className="font-heading text-sm text-white">{formatCurrency(stats.weekRevenue || 0)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-sm text-gray-600">This Month</span>
                <span className="font-heading text-sm text-white">{formatCurrency(stats.monthRevenue || 0)}</span>
              </div>
            </div>
          </div>

          {/* World Model risk score */}
          {branchWorldState && (
            <div className="p-4 rounded-lg bg-white border border-gray-200">
              <div className="text-xs text-jig-purple-light font-bold uppercase mb-3">Risk Scores</div>
              <div className="grid grid-cols-3 gap-3">
                {Object.entries(branchWorldState.riskScore || {}).filter(([k]) => k !== 'overall').map(([domain, score]) => (
                  <div key={domain} className="text-center">
                    <div className={`font-heading text-lg ${score > 70 ? 'text-jig-red' : score > 40 ? 'text-jig-amber' : 'text-jig-purple'}`}>
                      {score}
                    </div>
                    <div className="text-[10px] text-gray-400 capitalize">{domain}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tills */}
          {branch.tills?.length > 0 && (
            <div className="p-4 rounded-lg bg-white border border-gray-200">
              <div className="text-xs text-jig-purple-light font-bold uppercase mb-2">Tills</div>
              <div className="space-y-1">
                {branch.tills.map(till => (
                  <div key={till.tillNumber} className="flex items-center justify-between text-sm">
                    <span className="text-gray-600">{till.name || till.tillNumber}</span>
                    <Badge status={till.isActive ? 'active' : 'error'}>
                      {till.isActive ? 'Active' : 'Inactive'}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'stock' && (
        <div className="p-4 rounded-lg bg-white border border-gray-200">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-jig-purple-light">Total SKUs</div>
              <div className="font-heading text-xl text-white">{stats.inventoryQuantity || 0}</div>
            </div>
            <div>
              <div className="text-xs text-jig-purple-light">Stock Value</div>
              <div className="font-heading text-xl text-white">{formatCurrency(stats.inventoryValue || 0)}</div>
            </div>
            <div>
              <div className="text-xs text-jig-purple-light">Low Stock Items</div>
              <div className={`font-heading text-xl ${stats.lowStockItems > 0 ? 'text-jig-red' : 'text-white'}`}>
                {stats.lowStockItems || 0}
              </div>
            </div>
            <div>
              <div className="text-xs text-jig-purple-light">Active Tills</div>
              <div className="font-heading text-xl text-white">{stats.activeTills || 0}</div>
            </div>
          </div>

          {/* World Model stock health */}
          {branchWorldState?.stockHealth && (
            <div className="mt-4 pt-4 border-t border-gray-100">
              <div className="text-xs text-jig-purple-light font-bold uppercase mb-2">Stock Health (World Model)</div>
              <div className="grid grid-cols-5 gap-2 text-center">
                {Object.entries(branchWorldState.stockHealth).map(([metric, val]) => (
                  <div key={metric}>
                    <div className={`font-heading text-sm ${val > 70 ? 'text-jig-purple' : val > 40 ? 'text-jig-amber' : 'text-jig-red'}`}>
                      {val}%
                    </div>
                    <div className="text-[10px] text-gray-400 capitalize">{metric}</div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {tab === 'staff' && (
        <div className="p-4 rounded-lg bg-white border border-gray-200">
          {loadingStaff ? (
            <div className="text-center py-4 text-gray-400 text-sm">Loading staff...</div>
          ) : staffList.length === 0 ? (
            <div className="text-center py-4 text-gray-400 text-sm">No staff assigned</div>
          ) : (
            <div className="space-y-2">
              {staffList.map(staff => (
                <div key={staff._id} className="flex items-center justify-between p-2 rounded bg-gray-50">
                  <div>
                    <div className="text-sm font-semibold text-white">
                      {staff.firstName || ''} {staff.lastName || ''}
                    </div>
                    <div className="text-xs text-gray-400">{staff.role?.replace(/_/g, ' ')}</div>
                  </div>
                  <Badge status={staff.isActive !== false ? 'active' : 'error'}>
                    {staff.isActive !== false ? 'Active' : 'Off'}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'events' && (
        <div className="h-64">
          <LiveEventStream branchFilter={branch._id} />
        </div>
      )}
    </div>
  );
}
