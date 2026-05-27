// P30+P31 — Per-branch threshold & feature overrides with table view

import { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';

const THRESHOLD_DEFS = [
  { key: 'tillVarianceAmber', label: 'Till Variance Amber', unit: 'R', default: 50 },
  { key: 'tillVarianceRed', label: 'Till Variance Red', unit: 'R', default: 200 },
  { key: 'voidRefundFrequency', label: 'Void/Refund Alert', unit: 'per shift', default: 5 },
  { key: 'shiftVarianceStreak', label: 'Variance Streak', unit: 'shifts', default: 3 },
  { key: 'lowStockDays', label: 'Low Stock Warning', unit: 'days', default: 7 },
  { key: 'criticalStockDays', label: 'Critical Stock Alert', unit: 'days', default: 3 },
  { key: 'potencyDropPercent', label: 'Potency Drop Alert', unit: '%', default: 15 },
  { key: 'supplierConcentration', label: 'Supplier Concentration', unit: '%', default: 60 },
];

const FEATURE_KEYS = [
  { key: 'potencyDegradation', label: 'Potency Degradation' },
  { key: 'riskScoring', label: 'Risk Scoring' },
  { key: 'smartStock', label: 'Smart Stock' },
  { key: 'staffAccountability', label: 'Staff Accountability' },
  { key: 'complianceCascade', label: 'Compliance Cascade' },
  { key: 'demandPrediction', label: 'Demand Prediction' },
];

export default function BranchOverrides({ config, onSaveOverride, saving }) {
  const [branches, setBranches] = useState([]);
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [overrides, setOverrides] = useState({});
  const [reason, setReason] = useState('');
  const [loadingBranches, setLoadingBranches] = useState(true);
  const [editingThreshold, setEditingThreshold] = useState(null);

  useEffect(() => {
    async function loadBranches() {
      try {
        const res = await api.get('/branches?status=active&limit=50');
        setBranches(res.data?.data || res.data?.branches || []);
      } catch { setBranches([]); }
      setLoadingBranches(false);
    }
    loadBranches();
  }, []);

  function selectBranch(branch) {
    setSelectedBranch(branch);
    const existing = config?.branchOverrides?.[branch._id] || {};
    setOverrides(existing);
    setReason('');
    setEditingThreshold(null);
  }

  function handleFeatureToggle(featureKey, subKey, value) {
    setOverrides(prev => ({
      ...prev,
      features: {
        ...(prev.features || {}),
        [featureKey]: {
          ...(prev.features?.[featureKey] || {}),
          [subKey]: value,
        },
      },
    }));
  }

  function handleThresholdChange(key, value) {
    const num = Number(value);
    if (!isNaN(num)) {
      setOverrides(prev => ({
        ...prev,
        thresholds: { ...(prev.thresholds || {}), [key]: num },
      }));
    }
  }

  function handleThresholdReset(key) {
    setOverrides(prev => {
      const next = { ...(prev.thresholds || {}) };
      delete next[key];
      return { ...prev, thresholds: next };
    });
    setEditingThreshold(null);
  }

  function handleFeatureReset(key) {
    setOverrides(prev => {
      const next = { ...(prev.features || {}) };
      delete next[key];
      return { ...prev, features: next };
    });
  }

  async function handleSave() {
    if (!selectedBranch) return;
    await onSaveOverride(selectedBranch._id, overrides, reason);
    setReason('');
  }

  if (loadingBranches) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Count overrides for a branch
  function countOverrides(branchId) {
    const bo = config?.branchOverrides?.[branchId];
    if (!bo) return 0;
    const fc = bo.features ? Object.keys(bo.features).length : 0;
    const tc = bo.thresholds ? Object.keys(bo.thresholds).length : 0;
    return fc + tc;
  }

  return (
    <div className="space-y-6">
      {/* Branch selector */}
      <div>
        <h4 className="font-heading text-sm text-white uppercase mb-3">Select Branch</h4>
        {branches.length === 0 ? (
          <p className="text-sm text-gray-400">No active branches found</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {branches.map(branch => {
              const overrideCount = countOverrides(branch._id);
              const isSelected = selectedBranch?._id === branch._id;
              return (
                <button
                  key={branch._id}
                  onClick={() => selectBranch(branch)}
                  className={`
                    text-left p-4 rounded-xl border-2 transition-all duration-200
                    ${isSelected
                      ? 'border-or-gold bg-origin-slate shadow-md'
                      : 'border-gray-200 hover:border-or-gold/30 bg-white'}
                  `}
                >
                  <div className="font-heading text-sm text-white">{branch.name}</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">{branch.branchCode || branch.city || '--'}</div>
                  {overrideCount > 0 && (
                    <div className="flex items-center gap-2 mt-2">
                      <Badge status="warning">OVERRIDE</Badge>
                      <span className="text-[10px] text-gray-400">{overrideCount} setting{overrideCount !== 1 ? 's' : ''}</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Override editor — table view */}
      {selectedBranch && (
        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 bg-gray-50">
            <div className="flex items-center gap-3">
              <h4 className="font-heading text-lg text-white uppercase">{selectedBranch.name}</h4>
              <Badge status="info">BRANCH OVERRIDE</Badge>
            </div>
            <span className="text-[10px] text-gray-400">
              Use case: Adjust thresholds for new/training branches
            </span>
          </div>

          {/* Feature overrides table */}
          <div className="px-6 pt-4 pb-2">
            <div className="text-xs text-gray-500 font-bold uppercase mb-2">Feature Overrides</div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-400 uppercase">
                <th className="text-left px-6 py-2 font-medium">Feature</th>
                <th className="text-center px-4 py-2 font-medium">Network Default</th>
                <th className="text-center px-4 py-2 font-medium">Branch Override</th>
                <th className="text-right px-6 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {FEATURE_KEYS.map(def => {
                const globalEnabled = config?.features?.[def.key]?.enabled;
                const overrideVal = overrides?.features?.[def.key]?.enabled;
                const hasOverride = overrideVal !== undefined;
                return (
                  <tr key={def.key} className={`border-b border-gray-50 ${hasOverride ? 'bg-origin-slate/30' : ''}`}>
                    <td className="px-6 py-2.5 text-or-gold-dark">{def.label}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Badge status={globalEnabled ? 'active' : 'pending'} className="text-[9px]">
                        {globalEnabled ? 'ON' : 'OFF'}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      <select
                        value={overrideVal === true ? 'on' : overrideVal === false ? 'off' : 'inherit'}
                        onChange={e => {
                          const v = e.target.value;
                          if (v === 'inherit') {
                            handleFeatureReset(def.key);
                          } else {
                            handleFeatureToggle(def.key, 'enabled', v === 'on');
                          }
                        }}
                        className={`px-2 py-1 border rounded-lg text-xs focus:outline-none focus:border-or-gold
                          ${hasOverride ? 'border-or-gold bg-origin-slate font-bold' : 'border-gray-200'}`}
                      >
                        <option value="inherit">Inherit</option>
                        <option value="on">ON</option>
                        <option value="off">OFF</option>
                      </select>
                    </td>
                    <td className="px-6 py-2.5 text-right">
                      {hasOverride && (
                        <button
                          onClick={() => handleFeatureReset(def.key)}
                          className="text-[10px] text-origin-red hover:text-origin-red-dark"
                        >
                          Reset
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Threshold overrides table */}
          <div className="px-6 pt-5 pb-2">
            <div className="text-xs text-gray-500 font-bold uppercase mb-2">Threshold Overrides</div>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-[10px] text-gray-400 uppercase">
                <th className="text-left px-6 py-2 font-medium">Threshold</th>
                <th className="text-center px-4 py-2 font-medium">Network Default</th>
                <th className="text-center px-4 py-2 font-medium">Branch Override</th>
                <th className="text-right px-6 py-2 font-medium">Action</th>
              </tr>
            </thead>
            <tbody>
              {THRESHOLD_DEFS.map(def => {
                const globalVal = config?.thresholds?.[def.key] ?? def.default;
                const overrideVal = overrides?.thresholds?.[def.key];
                const hasOverride = overrideVal !== undefined;
                const isEditing = editingThreshold === def.key;

                return (
                  <tr key={def.key} className={`border-b border-gray-50 ${hasOverride ? 'bg-origin-slate/30' : ''}`}>
                    <td className="px-6 py-2.5">
                      <div className="text-or-gold-dark">{def.label}</div>
                      <div className="text-[10px] text-gray-400">{def.unit}</div>
                    </td>
                    <td className="px-4 py-2.5 text-center text-gray-500">
                      {globalVal} <span className="text-[10px] text-gray-300">{def.unit}</span>
                    </td>
                    <td className="px-4 py-2.5 text-center">
                      {isEditing ? (
                        <input
                          type="number"
                          autoFocus
                          value={overrideVal ?? ''}
                          placeholder={String(globalVal)}
                          onChange={e => {
                            if (e.target.value === '') {
                              handleThresholdReset(def.key);
                            } else {
                              handleThresholdChange(def.key, e.target.value);
                            }
                          }}
                          onBlur={() => setEditingThreshold(null)}
                          onKeyDown={e => e.key === 'Enter' && setEditingThreshold(null)}
                          className="w-20 px-2 py-1 border-2 border-or-gold rounded-lg text-sm text-center focus:outline-none"
                        />
                      ) : hasOverride ? (
                        <button
                          onClick={() => setEditingThreshold(def.key)}
                          className="px-2 py-0.5 rounded bg-origin-slate border border-or-gold/30 font-bold text-white text-xs"
                        >
                          {overrideVal} {def.unit}
                        </button>
                      ) : (
                        <button
                          onClick={() => setEditingThreshold(def.key)}
                          className="text-[10px] text-gray-300 hover:text-or-gold cursor-pointer"
                        >
                          -- (inherits)
                        </button>
                      )}
                    </td>
                    <td className="px-6 py-2.5 text-right">
                      {hasOverride ? (
                        <button
                          onClick={() => handleThresholdReset(def.key)}
                          className="text-[10px] text-origin-red hover:text-origin-red-dark"
                        >
                          Reset
                        </button>
                      ) : !isEditing ? (
                        <button
                          onClick={() => setEditingThreshold(def.key)}
                          className="text-[10px] text-or-gold hover:text-or-gold-dark"
                        >
                          Edit
                        </button>
                      ) : null}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* Reason + save */}
          <div className="px-6 py-4 border-t border-gray-100 bg-gray-50 flex items-center gap-3">
            <input
              type="text"
              placeholder="Reason for override (optional)"
              value={reason}
              onChange={e => setReason(e.target.value)}
              className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm
                focus:outline-none focus:border-or-gold placeholder:text-gray-400 bg-white"
            />
            <Button variant="primary" size="sm" onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Override'}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
