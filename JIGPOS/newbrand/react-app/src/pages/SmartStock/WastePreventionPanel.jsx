// P24 — Waste Prevention Panel (near-expiry bundling, markdown tracking)
// Shows batches approaching expiry with actionable waste prevention suggestions.

import { formatCurrency } from '../../config';
import Badge from '../../components/ui/Badge';

const RISK_CONFIG = {
  critical: { badge: 'error', border: 'border-jig-red/30 bg-jig-red/5', label: 'Critical' },
  warning: { badge: 'warning', border: 'border-jig-amber/30 bg-jig-amber/5', label: 'Warning' },
  approaching: { badge: 'info', border: 'border-blue-200 bg-blue-50', label: 'Approaching' },
  watch: { badge: 'pending', border: 'border-gray-200 bg-white', label: 'Watch' },
};

export default function WastePreventionPanel({ wasteRisk }) {
  const { atRisk, actions, totalAtRiskValue } = wasteRisk || {};

  if (!atRisk?.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">No waste risk detected</div>
        <div className="text-xs text-gray-300 mt-1">All batches are within safe expiry windows</div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      <div className="grid grid-cols-3 gap-3">
        <div className="p-3 rounded-lg bg-jig-red/5 border border-jig-red/20 text-center">
          <div className="text-xs text-jig-red font-bold">At Risk</div>
          <div className="font-heading text-xl text-jig-red">{atRisk.length}</div>
          <div className="text-[10px] text-gray-400">batches</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-amber/5 border border-jig-amber/20 text-center">
          <div className="text-xs text-jig-amber-dark font-bold">Value at Risk</div>
          <div className="font-heading text-xl text-jig-amber-dark">{formatCurrency(totalAtRiskValue)}</div>
          <div className="text-[10px] text-gray-400">potential loss</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-purple/5 border border-jig-purple/20 text-center">
          <div className="text-xs text-jig-purple font-bold">Actions</div>
          <div className="font-heading text-xl text-jig-purple">{actions?.length || 0}</div>
          <div className="text-[10px] text-gray-400">suggestions</div>
        </div>
      </div>

      {/* Suggested actions */}
      {actions?.length > 0 && (
        <div>
          <div className="text-xs text-gray-500 font-bold uppercase mb-2">Suggested Actions</div>
          <div className="space-y-2">
            {actions.map((action, i) => (
              <div key={i} className={`p-3 rounded-lg border ${
                action.type === 'bundle' ? 'border-jig-amber/30 bg-jig-amber/5' :
                action.type === 'markdown' ? 'border-jig-red/20 bg-jig-red/5' :
                'border-blue-200 bg-blue-50'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge status={action.type === 'bundle' ? 'warning' : action.type === 'markdown' ? 'error' : 'info'}>
                      {action.type}
                    </Badge>
                    <span className="text-xs font-semibold text-white">{action.label}</span>
                  </div>
                  {action.suggestedDiscount && (
                    <span className="text-xs font-bold text-jig-red">{action.suggestedDiscount}% off</span>
                  )}
                </div>
                {action.items && (
                  <div className="mt-2 space-y-1">
                    {action.items.map((item, j) => (
                      <div key={j} className="flex items-center justify-between text-xs text-gray-500">
                        <span>{item.productName || item.batchId}</span>
                        <span className="text-jig-red font-bold">{item.daysUntilExpiry}d left</span>
                      </div>
                    ))}
                  </div>
                )}
                {action.daysLeft != null && (
                  <div className="text-[10px] text-gray-400 mt-1">{action.daysLeft} days until expiry</div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* At-risk batch list */}
      <div>
        <div className="text-xs text-gray-500 font-bold uppercase mb-2">At-Risk Batches</div>
        <div className="space-y-1">
          {atRisk.map((batch, i) => {
            const cfg = RISK_CONFIG[batch.riskLevel] || RISK_CONFIG.watch;
            return (
              <div key={batch.batchId || i} className={`p-3 rounded-lg border ${cfg.border}`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge status={cfg.badge}>{cfg.label}</Badge>
                    <span className="text-xs font-semibold text-white">
                      {batch.productName || batch.batchId}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-heading ${batch.daysUntilExpiry <= 3 ? 'text-jig-red' : batch.daysUntilExpiry <= 7 ? 'text-jig-amber-dark' : 'text-white'}`}>
                      {batch.daysUntilExpiry}d
                    </div>
                    <div className="text-[10px] text-gray-400">until expiry</div>
                  </div>
                </div>
                <div className="mt-2 grid grid-cols-3 gap-2 text-xs">
                  <div>
                    <span className="text-gray-400">Qty: </span>
                    <span className="font-bold text-white">{batch.remainingQuantity}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Value: </span>
                    <span className="font-bold text-white">{formatCurrency(batch.atRiskValue)}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Expires: </span>
                    <span className="font-bold text-white">
                      {new Date(batch.expiryDate).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
