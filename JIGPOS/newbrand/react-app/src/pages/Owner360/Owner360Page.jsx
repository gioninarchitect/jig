// P22+P34 — Owner 360View Command Centre
// All panels wired to real backend APIs

import { useState, lazy, Suspense } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Modal from '../../components/ui/Modal';
import Badge from '../../components/ui/Badge';
import { useAuth } from '../../contexts/AuthContext';

// Hooks
import useAllBranches from './hooks/useAllBranches';
import useApprovals from './hooks/useApprovals';
import useRiskData from './hooks/useRiskData';
import useStaffLeaderboard from './hooks/useStaffLeaderboard';

// Components (eagerly loaded — always visible on 360View)
import NetworkStatusBar from './NetworkStatusBar';
import BranchGrid from './BranchGrid';
import LiveEventStream from './LiveEventStream';
import ApprovalQueue from './ApprovalQueue';
import InsightsBar from './InsightsBar';
import CrossDomainAlerts from './CrossDomainAlerts';

// Lazy-loaded components
const BranchDrillDown = lazy(() => import('./BranchDrillDown'));
const RiskHeatmap = lazy(() => import('./RiskHeatmap'));
const StockHealthMap = lazy(() => import('./StockHealthMap'));
const StaffScoreBoard = lazy(() => import('./StaffScoreBoard'));

function SvgIcon({ d }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

const menuItems = [
  { key: 'overview', label: 'Command Centre', icon: <SvgIcon d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /> },
  { key: '360view', label: '360 View', icon: <SvgIcon d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /> },
  { key: 'branches', label: 'Branches', icon: <SvgIcon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
  { key: 'analytics', label: 'Analytics', icon: <SvgIcon d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" /> },
  { key: 'staff', label: 'Staff', icon: <SvgIcon d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" /> },
  { key: 'financials', label: 'Financials', icon: <SvgIcon d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z" /> },
];

const LazySpinner = () => (
  <div className="flex justify-center py-8">
    <div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" />
  </div>
);

export default function Owner360Page() {
  const { user } = useAuth();
  const { branches, ownerStats, loading, refresh } = useAllBranches();
  const approvals = useApprovals();
  const { networkRisk, crossDomainAlerts, error: riskError } = useRiskData();

  // Staff leaderboard — use first active branch as default
  const firstBranch = branches.find(b => b.isActive);
  const [staffBranchId, setStaffBranchId] = useState(null);
  const activeBranchId = staffBranchId || firstBranch?._id;
  const staffData = useStaffLeaderboard(activeBranchId);

  const [selectedBranch, setSelectedBranch] = useState(null);
  const [activePanel, setActivePanel] = useState('branches');

  const PANELS = [
    { key: 'branches', label: 'Branches' },
    { key: 'risk', label: 'Risk', badge: networkRisk?.networkAverage },
    { key: 'stock', label: 'Stock' },
    { key: 'staff', label: 'Staff' },
  ];

  return (
    <DashboardLayout title="360 View" menuItems={menuItems} user={user}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-2xl text-white uppercase">360 View</h2>
          <Badge status="active">LIVE</Badge>
        </div>
        <button
          onClick={refresh}
          className="px-3 py-1.5 rounded-lg bg-or-gold/10 text-or-gold text-xs font-bold hover:bg-or-gold/20 transition-colors"
        >
          Refresh
        </button>
      </div>

      {/* Network Status Bar */}
      <div className="mb-6">
        <NetworkStatusBar branches={branches} ownerStats={ownerStats} />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="w-8 h-8 border-3 border-or-gold border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* LEFT COLUMN: Main panels (2/3 width) */}
          <div className="lg:col-span-2 space-y-6">
            {/* Panel Tabs */}
            <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
              {PANELS.map(p => (
                <button
                  key={p.key}
                  onClick={() => setActivePanel(p.key)}
                  className={`flex-1 py-2 rounded text-xs font-bold uppercase transition-colors flex items-center justify-center gap-1 ${
                    activePanel === p.key
                      ? 'bg-white text-white shadow-sm'
                      : 'text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {p.label}
                  {p.badge != null && p.badge > 0 && (
                    <span className={`ml-1 px-1.5 py-0.5 rounded-full text-[10px] font-bold ${
                      p.badge >= 50 ? 'bg-origin-red text-white' :
                      p.badge >= 30 ? 'bg-or-gold text-white' :
                      'bg-or-gold/20 text-or-gold'
                    }`}>
                      {p.badge}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Branch Grid */}
            {activePanel === 'branches' && (
              <BranchGrid
                branches={branches}
                selectedBranchId={selectedBranch?._id}
                onSelectBranch={setSelectedBranch}
              />
            )}

            {/* Risk Heatmap */}
            {activePanel === 'risk' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-heading text-sm text-white uppercase mb-4">Risk Heatmap</h3>
                <Suspense fallback={<LazySpinner />}>
                  <RiskHeatmap
                    branches={branches}
                    networkRisk={networkRisk}
                    riskError={riskError}
                  />
                </Suspense>
              </div>
            )}

            {/* Stock Health */}
            {activePanel === 'stock' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <h3 className="font-heading text-sm text-white uppercase mb-4">Stock Health</h3>
                <Suspense fallback={<LazySpinner />}>
                  <StockHealthMap branches={branches} />
                </Suspense>
              </div>
            )}

            {/* Staff Scoreboard */}
            {activePanel === 'staff' && (
              <div className="bg-white rounded-xl border border-gray-200 p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-heading text-sm text-white uppercase">Staff Scoreboard</h3>
                  {/* Branch selector for staff */}
                  <select
                    value={activeBranchId || ''}
                    onChange={(e) => setStaffBranchId(e.target.value)}
                    className="text-xs bg-origin-slate text-white border border-or-gold/20 rounded px-2 py-1"
                  >
                    {branches.filter(b => b.isActive).map(b => (
                      <option key={b._id} value={b._id}>{b.name}</option>
                    ))}
                  </select>
                </div>
                <Suspense fallback={<LazySpinner />}>
                  <StaffScoreBoard
                    leaderboard={staffData.leaderboard}
                    loading={staffData.loading}
                    error={staffData.error}
                  />
                </Suspense>
              </div>
            )}

            {/* Insights Bar */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-heading text-sm text-white uppercase mb-3">
                Intelligence
                <span className="ml-2 text-[10px] text-or-gold font-body normal-case">World Model</span>
              </h3>
              <InsightsBar />
            </div>
          </div>

          {/* RIGHT COLUMN: Approvals + Alerts + Events (1/3 width) */}
          <div className="space-y-6">
            {/* Approval Queue */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm text-white uppercase">Approvals</h3>
                {approvals.totalCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-origin-red text-white text-xs font-bold">
                    {approvals.totalCount}
                  </span>
                )}
              </div>
              <div className="h-[280px]">
                <ApprovalQueue
                  approvals={approvals.approvals}
                  counts={approvals.counts}
                  onApprove={approvals.approve}
                  onReject={approvals.reject}
                />
              </div>
            </div>

            {/* Cross-Domain Alerts */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-heading text-sm text-white uppercase">Alerts</h3>
                {crossDomainAlerts.length > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-origin-red text-white text-xs font-bold">
                    {crossDomainAlerts.length}
                  </span>
                )}
              </div>
              <div className="h-[250px] overflow-y-auto">
                <CrossDomainAlerts alerts={crossDomainAlerts} />
              </div>
            </div>

            {/* Live Event Stream */}
            <div className="bg-white rounded-xl border border-gray-200 p-4">
              <h3 className="font-heading text-sm text-white uppercase mb-3">Live Events</h3>
              <div className="h-[300px]">
                <LiveEventStream />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Branch Drill-Down Modal */}
      <Modal
        open={!!selectedBranch}
        onClose={() => setSelectedBranch(null)}
        title={null}
        size="xl"
      >
        {selectedBranch && (
          <Suspense fallback={<LazySpinner />}>
            <BranchDrillDown
              branch={selectedBranch}
              onClose={() => setSelectedBranch(null)}
            />
          </Suspense>
        )}
      </Modal>
    </DashboardLayout>
  );
}
