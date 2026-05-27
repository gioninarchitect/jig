// P30 — Feature toggle cards for World Model features

import { useState } from 'react';
import Badge from '../../components/ui/Badge';

// Feature metadata — labels, descriptions, sub-toggles, number fields
const FEATURE_DEFS = {
  potencyDegradation: {
    label: 'Potency Degradation Engine',
    description: 'Track cannabinoid degradation over time. Suggests markdowns for aging stock.',
    subToggles: [
      { key: 'autoMarkdown', label: 'Auto-Markdown' },
    ],
    numbers: [
      { key: 'markdownThreshold', label: 'Markdown Threshold (%)', min: 5, max: 80 },
    ],
  },
  riskScoring: {
    label: 'Cross-Domain Risk Scoring',
    description: 'Correlate patterns across all operational domains.',
    numbers: [
      { key: 'alertThreshold', label: 'Alert Threshold (0-100)', min: 0, max: 100 },
    ],
    domains: {
      key: 'domains',
      items: [
        { key: 'regulatory', label: 'Regulatory Risk' },
        { key: 'financial', label: 'Financial Risk' },
        { key: 'inventory', label: 'Inventory Risk' },
        { key: 'staff', label: 'Staff Risk' },
        { key: 'operational', label: 'Operational Risk' },
        { key: 'customer', label: 'Customer Risk' },
      ],
    },
  },
  smartStock: {
    label: 'Smart Stock Control',
    description: 'AI-powered demand prediction and reorder intelligence.',
    subToggles: [
      { key: 'autoReorder', label: 'Auto-Reorder (draft POs)' },
      { key: 'interBranchTransfer', label: 'Inter-Branch Transfers' },
    ],
  },
  staffAccountability: {
    label: 'Staff Accountability',
    description: 'Per-employee scoring across all operational metrics.',
    subToggles: [
      { key: 'positiveReinforcement', label: 'Positive Reinforcement' },
    ],
    numbers: [
      { key: 'varianceThreshold', label: 'Variance Threshold (R)', min: 10, max: 1000 },
    ],
  },
  complianceCascade: {
    label: 'Compliance Cascade',
    description: 'Pre-sale blocking for regulatory violations.',
    subToggles: [
      { key: 'preSaleBlocking', label: 'Pre-Sale Blocking' },
      { key: 'auditAlerts', label: 'Audit Readiness Alerts' },
    ],
  },
  demandPrediction: {
    label: 'Demand Prediction',
    description: 'Cannabis-specific demand forecasting.',
    subToggles: [
      { key: 'paydayCycleAware', label: 'Payday Cycle Awareness' },
      { key: 'seasonalAdjust', label: 'Seasonal Adjustment' },
    ],
  },
};

function ToggleSwitch({ checked, onChange, disabled }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      className={`
        relative inline-flex h-7 w-12 shrink-0 rounded-full border-2 border-transparent
        transition-colors duration-200 cursor-pointer
        ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        ${checked ? 'bg-or-gold' : 'bg-gray-300'}
      `}
    >
      <span
        className={`
          pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md
          transition-transform duration-200
          ${checked ? 'translate-x-5' : 'translate-x-0'}
        `}
      />
    </button>
  );
}

export default function FeatureToggles({ features, onChange, disabled }) {
  const [expanded, setExpanded] = useState({});

  if (!features) return null;

  function toggleExpand(key) {
    setExpanded(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleMainToggle(featureKey, value) {
    onChange({ [featureKey]: { enabled: value } });
  }

  function handleSubToggle(featureKey, subKey, value) {
    onChange({ [featureKey]: { [subKey]: value } });
  }

  function handleNumberChange(featureKey, numKey, value) {
    const num = Number(value);
    if (!isNaN(num)) {
      onChange({ [featureKey]: { [numKey]: num } });
    }
  }

  function handleDomainToggle(featureKey, domainKey, value) {
    onChange({ [featureKey]: { domains: { ...features[featureKey]?.domains, [domainKey]: value } } });
  }

  return (
    <div className="space-y-4">
      {Object.entries(FEATURE_DEFS).map(([key, def]) => {
        const feature = features[key] || {};
        const isEnabled = feature.enabled || false;
        const isOpen = expanded[key] !== undefined ? expanded[key] : isEnabled;

        return (
          <div
            key={key}
            className={`
              rounded-2xl border-2 overflow-hidden transition-all duration-300
              ${isEnabled ? 'border-or-gold bg-white' : 'border-gray-200 bg-gray-50'}
            `}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-6 py-4 cursor-pointer"
              onClick={() => toggleExpand(key)}
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3">
                  <h3 className="font-heading text-lg text-white uppercase">{def.label}</h3>
                  <Badge status={isEnabled ? 'active' : 'pending'}>{isEnabled ? 'ON' : 'OFF'}</Badge>
                </div>
                <p className="text-xs text-gray-500 mt-1">{def.description}</p>
              </div>
              <div className="flex items-center gap-4 ml-4" onClick={e => e.stopPropagation()}>
                <ToggleSwitch checked={isEnabled} onChange={v => handleMainToggle(key, v)} disabled={disabled} />
              </div>
            </div>

            {/* Expanded body */}
            {isOpen && (
              <div className="px-6 pb-5 border-t border-gray-100 pt-4 space-y-3">
                {/* Sub-toggles */}
                {def.subToggles?.map(sub => (
                  <div key={sub.key} className="flex items-center justify-between py-1">
                    <span className="text-sm text-or-gold-dark">{sub.label}</span>
                    <ToggleSwitch
                      checked={feature[sub.key] || false}
                      onChange={v => handleSubToggle(key, sub.key, v)}
                      disabled={disabled || !isEnabled}
                    />
                  </div>
                ))}

                {/* Domain toggles (risk scoring) */}
                {def.domains && (
                  <div className="space-y-1">
                    <div className="text-xs text-gray-500 font-bold uppercase mt-2">Domains enabled</div>
                    {def.domains.items.map(d => (
                      <div key={d.key} className="flex items-center justify-between py-1 pl-2">
                        <span className="text-sm text-or-gold-dark">{d.label}</span>
                        <ToggleSwitch
                          checked={feature.domains?.[d.key] || false}
                          onChange={v => handleDomainToggle(key, d.key, v)}
                          disabled={disabled || !isEnabled}
                        />
                      </div>
                    ))}
                  </div>
                )}

                {/* Number inputs */}
                {def.numbers?.map(num => (
                  <div key={num.key} className="flex items-center justify-between py-1">
                    <span className="text-sm text-or-gold-dark">{num.label}</span>
                    <input
                      type="number"
                      min={num.min}
                      max={num.max}
                      value={feature[num.key] ?? ''}
                      onChange={e => handleNumberChange(key, num.key, e.target.value)}
                      disabled={disabled || !isEnabled}
                      className="w-20 px-3 py-1.5 border-2 border-gray-200 rounded-lg text-sm text-center
                        focus:outline-none focus:border-or-gold disabled:opacity-50 disabled:cursor-not-allowed"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
