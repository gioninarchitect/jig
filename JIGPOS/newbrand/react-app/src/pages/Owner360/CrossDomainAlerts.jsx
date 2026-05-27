// P25 — Cross-Domain Alerts (correlation engine alerts)
// Displays cross-domain rule detections with severity, affected domains, and actions.

import { useState, useMemo } from 'react';
import Badge from '../../components/ui/Badge';

const SEVERITY_STYLES = {
  critical: { badge: 'error', bg: 'border-origin-red/30 bg-origin-red/5', text: 'text-origin-red' },
  warning: { badge: 'warning', bg: 'border-or-gold/30 bg-or-gold/5', text: 'text-or-gold-dark' },
  info: { badge: 'info', bg: 'border-blue-200 bg-blue-50', text: 'text-blue-600' },
};

const DOMAIN_COLORS = {
  financial: 'bg-green-100 text-green-700',
  staff: 'bg-purple-100 text-purple-700',
  inventory: 'bg-blue-100 text-blue-700',
  compliance: 'bg-red-100 text-red-700',
  customer: 'bg-amber-100 text-amber-700',
  operational: 'bg-gray-100 text-gray-700',
};

export default function CrossDomainAlerts({ alerts }) {
  const [filter, setFilter] = useState('all');

  const filtered = useMemo(() => {
    if (!alerts?.length) return [];
    if (filter === 'all') return alerts;
    return alerts.filter(a => a.severity === filter);
  }, [alerts, filter]);

  const counts = useMemo(() => ({
    all: alerts?.length || 0,
    critical: alerts?.filter(a => a.severity === 'critical').length || 0,
    warning: alerts?.filter(a => a.severity === 'warning').length || 0,
  }), [alerts]);

  if (!alerts?.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">No cross-domain alerts</div>
        <div className="text-xs text-gray-300 mt-1">All domains operating normally</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex items-center gap-2">
        {['all', 'critical', 'warning'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filter === f ? 'bg-or-gold text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)} ({counts[f]})
          </button>
        ))}
      </div>

      {/* Alert cards */}
      {filtered.map((alert, i) => {
        const style = SEVERITY_STYLES[alert.severity] || SEVERITY_STYLES.info;

        return (
          <div key={`${alert.ruleId}-${i}`} className={`p-4 rounded-lg border ${style.bg}`}>
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Badge status={style.badge}>{alert.severity}</Badge>
                  <span className="font-heading text-sm text-white">{alert.name}</span>
                </div>
                {alert.branchName && (
                  <div className="text-[10px] text-gray-400">Branch: {alert.branchName}</div>
                )}
              </div>
              {alert.detectedAt && (
                <div className="text-[10px] text-gray-400 shrink-0">
                  {formatTimeAgo(alert.detectedAt)}
                </div>
              )}
            </div>

            {/* Affected domains */}
            <div className="flex flex-wrap gap-1 mb-2">
              {alert.domains?.map(d => (
                <span key={d} className={`px-2 py-0.5 rounded text-[10px] font-bold ${DOMAIN_COLORS[d] || 'bg-gray-100 text-gray-600'}`}>
                  {d}
                </span>
              ))}
            </div>

            {/* Data summary */}
            {alert.data && (
              <div className="text-xs text-gray-600 mb-2">
                {formatAlertData(alert)}
              </div>
            )}

            {/* Recommended action */}
            <div className="flex items-center gap-2 mt-2 p-2 rounded bg-white/60 border border-gray-200/50">
              <svg className="w-4 h-4 text-or-gold shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <span className="text-xs text-white font-semibold">{alert.action}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ─── Helpers ────────────────────────────────────────────────────

function formatTimeAgo(timestamp) {
  const diff = Date.now() - timestamp;
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return `${Math.floor(hours / 24)}d ago`;
}

function formatAlertData(alert) {
  switch (alert.ruleId) {
    case 'internal_theft_pattern':
      return `${alert.data.suspects?.length || 0} staff flagged, shrinkage rate: ${alert.data.shrinkageRate}%`;
    case 'receiving_fraud':
      return `Shrinkage: ${alert.data.shrinkageRate}%, ${alert.data.pendingTransfers} pending transfers`;
    case 'diversion_risk':
      return `${alert.data.repeaters?.length || 0} repeat offenders, ${alert.data.nearLimitCount} near limit`;
    case 'unrecorded_loss':
      return `Shrinkage: ${alert.data.shrinkageRate}%, ${alert.data.dailyTransactions} daily transactions`;
    case 'pricing_anomaly':
      return `Discount rate: ${alert.data.discountRate}%, ${alert.data.flaggedStaff?.length || 0} staff flagged`;
    default:
      return JSON.stringify(alert.data).slice(0, 100);
  }
}
