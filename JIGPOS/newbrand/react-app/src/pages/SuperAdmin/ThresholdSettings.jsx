// P30+P31 — Threshold configuration with impact preview + reset to default

import { useState } from 'react';
import Badge from '../../components/ui/Badge';

const DEFAULTS = {
  tillVarianceAmber: 50,
  tillVarianceRed: 200,
  voidRefundFrequency: 5,
  shiftVarianceStreak: 3,
  lowStockDays: 7,
  criticalStockDays: 3,
  potencyDropPercent: 15,
  supplierConcentration: 60,
};

const UNITS = {
  tillVarianceAmber: 'R',
  tillVarianceRed: 'R',
  voidRefundFrequency: 'per shift',
  shiftVarianceStreak: 'shifts',
  lowStockDays: 'days',
  criticalStockDays: 'days',
  potencyDropPercent: '%',
  supplierConcentration: '%',
};

// Simulated impact estimation — in production this would call the backend
function estimateImpact(key, oldVal, newVal) {
  if (oldVal === newVal) return null;
  const wider = newVal > oldVal; // threshold relaxed
  const diff = Math.abs(newVal - oldVal);
  const pctChange = Math.round((diff / Math.max(oldVal, 1)) * 100);

  if (key === 'tillVarianceAmber' || key === 'tillVarianceRed') {
    const alertChange = Math.round(pctChange * 0.6);
    return wider
      ? `~${alertChange}% fewer alerts over last 30 days`
      : `~${alertChange}% more alerts over last 30 days`;
  }
  if (key === 'lowStockDays' || key === 'criticalStockDays') {
    return wider
      ? `Earlier warnings — more items flagged`
      : `Later warnings — fewer items flagged`;
  }
  if (key === 'potencyDropPercent') {
    return wider
      ? `Fewer markdowns triggered — higher degradation tolerated`
      : `More markdowns triggered — tighter quality control`;
  }
  if (key === 'voidRefundFrequency') {
    return wider
      ? `More voids tolerated before flagging staff`
      : `Stricter void monitoring — more staff alerts`;
  }
  if (key === 'shiftVarianceStreak') {
    return wider
      ? `Staff have more shifts before escalation`
      : `Faster escalation for repeat variances`;
  }
  if (key === 'supplierConcentration') {
    return wider
      ? `Higher single-supplier dependency allowed`
      : `Tighter supplier diversification required`;
  }
  return null;
}

const THRESHOLD_DEFS = [
  { key: 'tillVarianceAmber', label: 'Till Variance Amber', desc: 'Amber alert threshold for till variance', min: 10, max: 500, group: 'Staff' },
  { key: 'tillVarianceRed', label: 'Till Variance Red', desc: 'Red alert threshold for till variance', min: 50, max: 1000, group: 'Staff' },
  { key: 'voidRefundFrequency', label: 'Void/Refund Alert', desc: 'Voids per shift before flagging', min: 1, max: 20, group: 'Staff' },
  { key: 'shiftVarianceStreak', label: 'Variance Streak Alert', desc: 'Consecutive shifts with variance before escalation', min: 2, max: 10, group: 'Staff' },
  { key: 'lowStockDays', label: 'Low Stock Warning', desc: 'Days of stock remaining triggers warning', min: 1, max: 30, group: 'Inventory' },
  { key: 'criticalStockDays', label: 'Critical Stock Alert', desc: 'Days of stock remaining triggers critical alert', min: 1, max: 14, group: 'Inventory' },
  { key: 'potencyDropPercent', label: 'Potency Drop Alert', desc: 'Trigger markdown suggestion at this potency loss', min: 5, max: 50, group: 'Inventory' },
  { key: 'supplierConcentration', label: 'Supplier Concentration', desc: 'Amber when this % of stock from one supplier', min: 20, max: 100, group: 'Risk' },
];

export default function ThresholdSettings({ thresholds, onChange, disabled }) {
  const [hoveredKey, setHoveredKey] = useState(null);

  if (!thresholds) return null;

  function handleChange(key, value) {
    const num = Number(value);
    if (!isNaN(num)) {
      onChange({ [key]: num });
    }
  }

  function handleReset(key) {
    onChange({ [key]: DEFAULTS[key] });
  }

  // Group thresholds
  const groups = {};
  for (const def of THRESHOLD_DEFS) {
    if (!groups[def.group]) groups[def.group] = [];
    groups[def.group].push(def);
  }

  return (
    <div className="space-y-6">
      {Object.entries(groups).map(([group, items]) => (
        <div key={group}>
          <h4 className="font-heading text-sm text-white uppercase mb-3">{group} Thresholds</h4>
          <div className="bg-white rounded-xl border border-gray-200 divide-y divide-gray-100">
            {items.map(def => {
              const current = thresholds[def.key] ?? DEFAULTS[def.key];
              const isDefault = current === DEFAULTS[def.key];
              const impact = hoveredKey === def.key
                ? estimateImpact(def.key, DEFAULTS[def.key], current)
                : null;

              return (
                <div
                  key={def.key}
                  className="px-5 py-4"
                  onMouseEnter={() => setHoveredKey(def.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-jig-purple-dark">{def.label}</span>
                        <span className="text-[10px] text-gray-400">({UNITS[def.key]})</span>
                        {isDefault && (
                          <Badge status="info" className="text-[9px] py-0 px-1.5">DEFAULT</Badge>
                        )}
                        {!isDefault && (
                          <Badge status="warning" className="text-[9px] py-0 px-1.5">MODIFIED</Badge>
                        )}
                      </div>
                      <div className="text-[10px] text-gray-400">{def.desc}</div>
                    </div>
                    <div className="flex items-center gap-3">
                      <input
                        type="range"
                        min={def.min}
                        max={def.max}
                        value={current}
                        onChange={e => handleChange(def.key, e.target.value)}
                        disabled={disabled}
                        className="w-28 accent-jig-purple"
                      />
                      <input
                        type="number"
                        min={def.min}
                        max={def.max}
                        value={current}
                        onChange={e => handleChange(def.key, e.target.value)}
                        disabled={disabled}
                        className="w-16 px-2 py-1 border-2 border-gray-200 rounded-lg text-sm text-center
                          focus:outline-none focus:border-jig-amber disabled:opacity-50 disabled:cursor-not-allowed"
                      />
                      {!isDefault && !disabled && (
                        <button
                          onClick={() => handleReset(def.key)}
                          className="text-[10px] text-jig-red hover:text-jig-red-dark whitespace-nowrap"
                          title={`Reset to default (${DEFAULTS[def.key]})`}
                        >
                          Reset
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Network default reference */}
                  {!isDefault && (
                    <div className="text-[10px] text-gray-400 mt-1">
                      Network default: {DEFAULTS[def.key]} {UNITS[def.key]}
                    </div>
                  )}

                  {/* Impact preview on hover */}
                  {impact && !isDefault && (
                    <div className="mt-1.5 px-3 py-1.5 rounded-lg bg-jig-slate border border-jig-amber/20 text-[11px] text-jig-purple-dark">
                      If this threshold had been in effect last 30 days: {impact}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
