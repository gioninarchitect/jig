// P22 — Cross-Branch Insights Bar for 360View
// Uses World Model cross-branch intelligence to surface actionable insights

import { useDBCWorldModel } from '../../world-model/WorldModelContext';

const SEVERITY_STYLES = {
  low: 'border-l-blue-400 bg-blue-50 text-blue-800',
  medium: 'border-l-jig-amber bg-jig-amber/10 text-jig-amber-dark',
  high: 'border-l-jig-red bg-jig-red/5 text-jig-red',
  critical: 'border-l-jig-red bg-jig-red/10 text-jig-red-dark',
};

const SEVERITY_ICON = {
  low: 'M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
  medium: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  high: 'M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z',
  critical: 'M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z',
};

export default function InsightsBar() {
  const { riskAlerts, crossDomainInsights, crossBranchInsights } = useDBCWorldModel();

  // Combine all insights, prioritize by severity
  const allInsights = [
    ...crossBranchInsights.map(i => ({ ...i, source: 'cross-branch' })),
    ...crossDomainInsights.map(i => ({ ...i, source: 'cross-domain' })),
    ...riskAlerts.slice(0, 5).map(r => ({
      type: r.type,
      severity: r.severity,
      message: r.message,
      source: 'risk',
      branchId: r.branchId,
    })),
  ];

  // Sort critical first
  const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
  allInsights.sort((a, b) => (severityOrder[a.severity] || 3) - (severityOrder[b.severity] || 3));

  if (allInsights.length === 0) {
    return (
      <div className="p-4 rounded-lg bg-jig-purple/5 border border-jig-purple/20 text-center">
        <svg className="w-8 h-8 mx-auto mb-2 text-jig-purple/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <div className="text-sm text-jig-purple-light">All clear across the network</div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {allInsights.slice(0, 8).map((insight, i) => (
        <div
          key={`${insight.type}-${i}`}
          className={`p-3 rounded-lg border-l-4 ${SEVERITY_STYLES[insight.severity] || SEVERITY_STYLES.low}`}
        >
          <div className="flex items-start gap-2">
            <svg className="w-4 h-4 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={SEVERITY_ICON[insight.severity] || SEVERITY_ICON.low} />
            </svg>
            <div className="min-w-0">
              <div className="text-xs font-semibold">{insight.message}</div>
              <div className="text-[10px] opacity-60 mt-0.5">
                {insight.source === 'cross-branch' && 'Cross-Branch'}
                {insight.source === 'cross-domain' && 'Cross-Domain'}
                {insight.source === 'risk' && 'Risk Pattern'}
                {insight.branchId && ` - ${insight.branchId.slice(-6)}`}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
