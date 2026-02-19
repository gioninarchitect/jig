// P23 — Potency Dashboard
// Inventory view for potency alerts, FIFO priority, markdown suggestions, bundles
// Feature-gated: only active if config.features.potencyDegradation.enabled

import { useState, useEffect, useMemo } from 'react';
import api from '../../services/api';
import { useWorldModelConfig } from '../../world-model/WorldModelContext';
import { formatCurrency } from '../../config';
import Badge from '../../components/ui/Badge';
import PotencyBadge from '../../components/PotencyBadge';
import {
  scanBatchesForPotencyAlerts,
  calculateFIFOPriority,
  identifyBundleCandidates,
  suggestMarkdownPercent,
} from '../../world-model/engines/potency';

export default function PotencyDashboard() {
  const config = useWorldModelConfig();
  const [batches, setBatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('alerts');

  const enabled = config?.features?.potencyDegradation?.enabled;

  // Load active batches
  useEffect(() => {
    if (!enabled) { setLoading(false); return; }
    async function load() {
      try {
        const res = await api.get('/batches?status=active&qaStatus=approved&limit=200');
        setBatches(res.data?.batches || res.data?.data || []);
      } catch {
        setBatches([]);
      }
      setLoading(false);
    }
    load();
  }, [enabled]);

  // Potency alerts
  const alerts = useMemo(() => {
    if (!enabled) return [];
    return scanBatchesForPotencyAlerts(batches, config);
  }, [batches, config, enabled]);

  // FIFO priority list
  const fifoPriority = useMemo(() => {
    if (!enabled) return [];
    return calculateFIFOPriority(batches, config).slice(0, 20);
  }, [batches, config, enabled]);

  // Bundle candidates
  const bundles = useMemo(() => {
    if (!enabled) return [];
    return identifyBundleCandidates(batches, config);
  }, [batches, config, enabled]);

  if (!enabled) {
    return (
      <div className="text-center py-12">
        <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <div className="text-sm text-gray-400">Potency Degradation Engine is disabled</div>
        <div className="text-xs text-gray-300 mt-1">Enable in Super Admin Config</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="w-8 h-8 border-3 border-jig-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const TABS = [
    { key: 'alerts', label: 'Alerts', count: alerts.length },
    { key: 'fifo', label: 'FIFO Priority', count: fifoPriority.length },
    { key: 'bundles', label: 'Bundle Deals', count: bundles.length },
  ];

  return (
    <div className="space-y-4">
      {/* Stats row */}
      <div className="grid grid-cols-4 gap-3">
        <div className="p-3 rounded-lg bg-jig-slate border border-jig-purple/20 text-center">
          <div className="text-xs text-jig-purple-light">Active Batches</div>
          <div className="font-heading text-xl text-white">{batches.length}</div>
        </div>
        <div className="p-3 rounded-lg bg-jig-slate border border-jig-purple/20 text-center">
          <div className="text-xs text-jig-purple-light">Markdown Alerts</div>
          <div className={`font-heading text-xl ${alerts.filter(a => a.category === 'markdown').length > 0 ? 'text-jig-red' : 'text-white'}`}>
            {alerts.filter(a => a.category === 'markdown').length}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-jig-slate border border-jig-purple/20 text-center">
          <div className="text-xs text-jig-purple-light">Retest Needed</div>
          <div className={`font-heading text-xl ${alerts.filter(a => a.suggestRetest).length > 0 ? 'text-jig-amber' : 'text-white'}`}>
            {alerts.filter(a => a.suggestRetest).length}
          </div>
        </div>
        <div className="p-3 rounded-lg bg-jig-slate border border-jig-purple/20 text-center">
          <div className="text-xs text-jig-purple-light">Bundle Deals</div>
          <div className="font-heading text-xl text-white">{bundles.length}</div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded text-xs font-bold uppercase transition-colors ${
              tab === t.key ? 'bg-white text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t.label}
            {t.count > 0 && (
              <span className="ml-1 px-1.5 py-0.5 rounded-full bg-jig-red/10 text-jig-red text-[10px]">{t.count}</span>
            )}
          </button>
        ))}
      </div>

      {/* Alerts Tab */}
      {tab === 'alerts' && (
        <div className="space-y-2">
          {alerts.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No potency alerts</div>
          ) : (
            alerts.map(alert => (
              <div
                key={alert.batchId}
                className={`p-4 rounded-lg border ${
                  alert.category === 'markdown' ? 'border-jig-red/30 bg-jig-red/5' : 'border-jig-amber/30 bg-jig-amber/5'
                }`}
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <Badge status={alert.category === 'markdown' ? 'warning' : 'info'}>
                        {alert.category === 'markdown' ? 'Markdown' : 'Retest'}
                      </Badge>
                      <span className="font-heading text-sm text-white">
                        {alert.productName || alert.batchId}
                      </span>
                    </div>
                    <div className="text-xs text-gray-500 mt-1">
                      Batch: {alert.batchId} | {alert.remainingQuantity} units remaining
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-heading text-lg text-jig-red">{alert.thcDropPercent}%</div>
                    <div className="text-[10px] text-gray-400">potency drop</div>
                  </div>
                </div>

                <div className="mt-3 grid grid-cols-4 gap-3 text-xs">
                  <div>
                    <div className="text-gray-400">Original THC</div>
                    <div className="font-bold text-white">{alert.originalTHC}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Est. Current</div>
                    <div className={`font-bold ${CONFIDENCE_STYLES[alert.confidenceLevel]}`}>~{alert.estimatedTHC}%</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Days Since Test</div>
                    <div className="font-bold text-white">{alert.daysSinceTest}</div>
                  </div>
                  <div>
                    <div className="text-gray-400">Confidence</div>
                    <div className={`font-bold ${CONFIDENCE_STYLES[alert.confidenceLevel]}`}>
                      {alert.confidenceLevel}
                    </div>
                  </div>
                </div>

                {alert.suggestMarkdown && (
                  <div className="mt-3 flex items-center gap-3">
                    <span className="text-xs text-jig-red font-bold">
                      Suggest {suggestMarkdownPercent(alert)}% markdown
                    </span>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* FIFO Priority Tab */}
      {tab === 'fifo' && (
        <div className="space-y-1">
          <div className="text-xs text-gray-400 mb-2">
            Sorted by degradation velocity — fastest-degrading batches sell first
          </div>
          {fifoPriority.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No active batches</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="text-left py-2 px-2 text-gray-500 font-bold">#</th>
                    <th className="text-left py-2 px-2 text-gray-500 font-bold">Batch</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-bold">THC</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-bold">Est.</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-bold">Drop</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-bold">Velocity</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-bold">Qty</th>
                    <th className="text-center py-2 px-2 text-gray-500 font-bold">Conf.</th>
                  </tr>
                </thead>
                <tbody>
                  {fifoPriority.map((batch, i) => (
                    <tr key={batch._id || batch.batchId} className="border-b border-gray-100 hover:bg-gray-50">
                      <td className="py-2 px-2 font-bold text-gray-400">{i + 1}</td>
                      <td className="py-2 px-2 font-semibold text-white truncate max-w-[150px]">
                        {batch.batchId || batch._id?.slice(-8)}
                      </td>
                      <td className="py-2 px-2 text-center">{batch.potency.originalTHC}%</td>
                      <td className="py-2 px-2 text-center font-bold">~{batch.potency.estimatedTHC}%</td>
                      <td className={`py-2 px-2 text-center font-bold ${batch.potency.thcDropPercent >= 15 ? 'text-jig-red' : batch.potency.thcDropPercent >= 5 ? 'text-jig-amber' : 'text-jig-purple'}`}>
                        {batch.potency.thcDropPercent}%
                      </td>
                      <td className="py-2 px-2 text-center text-gray-500">{batch.potency.degradationVelocity}%/d</td>
                      <td className="py-2 px-2 text-center">{batch.remainingQuantity || 0}</td>
                      <td className="py-2 px-2 text-center">
                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                          batch.potency.confidenceLevel === 'high' ? 'bg-jig-purple/10 text-jig-purple' :
                          batch.potency.confidenceLevel === 'medium' ? 'bg-jig-amber/10 text-jig-amber-dark' :
                          'bg-jig-red/10 text-jig-red'
                        }`}>
                          {batch.potency.confidenceLevel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Bundles Tab */}
      {tab === 'bundles' && (
        <div className="space-y-3">
          {bundles.length === 0 ? (
            <div className="text-center py-8">
              <div className="text-gray-400 text-sm">No bundle candidates</div>
              <div className="text-xs text-gray-300 mt-1">Need 2+ batches past markdown threshold</div>
            </div>
          ) : (
            bundles.map((bundle, i) => (
              <div key={i} className="p-4 rounded-lg border border-jig-amber/30 bg-jig-amber/5">
                <div className="flex items-center justify-between mb-3">
                  <span className="font-heading text-sm text-white">{bundle.label}</span>
                  <Badge status="warning">
                    {bundle.suggestedDiscount}% off
                  </Badge>
                </div>
                <div className="space-y-1">
                  {bundle.items.map(item => (
                    <div key={item.batchId} className="flex items-center justify-between text-xs">
                      <span className="text-gray-600">{item.productName || item.batchId}</span>
                      <span className="text-jig-red font-bold">{item.thcDropPercent}% drop</span>
                    </div>
                  ))}
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

const CONFIDENCE_STYLES = {
  high: 'text-jig-purple',
  medium: 'text-jig-amber-dark',
  low: 'text-jig-red',
  none: 'text-gray-400',
};
