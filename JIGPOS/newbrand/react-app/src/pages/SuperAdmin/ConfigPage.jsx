// P30 — Super Admin Configuration Panel (main layout)
// Feature toggles, threshold settings, branch overrides, audit history.

import { useState, useRef } from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import { useAuth } from '../../contexts/AuthContext';
import Tabs from '../../components/ui/Tabs';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import FeatureToggles from './FeatureToggles';
import ThresholdSettings from './ThresholdSettings';
import BranchOverrides from './BranchOverrides';
import ConfigHistory from './ConfigHistory';
import ConfigPreview from './ConfigPreview';
import useWorldModelConfig from './hooks/useWorldModelConfig';

function SvgIcon({ d }) {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={d} /></svg>;
}

const MENU_ITEMS = [
  { key: 'features', label: 'Features', icon: <SvgIcon d="M13 10V3L4 14h7v7l9-11h-7z" /> },
  { key: 'thresholds', label: 'Thresholds', icon: <SvgIcon d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /> },
  { key: 'branches', label: 'Branches', icon: <SvgIcon d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /> },
  { key: 'history', label: 'History', icon: <SvgIcon d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /> },
];

const TABS = [
  { key: 'features', label: 'Feature Toggles' },
  { key: 'thresholds', label: 'Thresholds' },
  { key: 'branches', label: 'Branch Overrides' },
  { key: 'history', label: 'Change History' },
];

export default function SuperAdminConfigPage() {
  const { user } = useAuth();
  const {
    config,
    loading,
    saving,
    error,
    updateConfig,
    setBranchOverride,
    fetchHistory,
    fetchConfig,
  } = useWorldModelConfig();

  const [tab, setTab] = useState('features');
  const [pendingChanges, setPendingChanges] = useState(null);
  const [reason, setReason] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const originalRef = useRef(null);

  // Track pending feature changes
  function handleFeatureChange(updates) {
    setPendingChanges(prev => {
      const next = { ...(prev || {}), features: { ...(prev?.features || {}) } };
      for (const [key, val] of Object.entries(updates)) {
        next.features[key] = { ...(next.features[key] || {}), ...val };
      }
      return next;
    });
  }

  // Track pending threshold changes
  function handleThresholdChange(updates) {
    setPendingChanges(prev => ({
      ...(prev || {}),
      thresholds: { ...(prev?.thresholds || {}), ...updates },
    }));
  }

  // Get merged view for display (config + pending)
  function getMergedFeatures() {
    if (!config?.features) return {};
    if (!pendingChanges?.features) return config.features;
    const merged = {};
    for (const [key, val] of Object.entries(config.features)) {
      const override = pendingChanges.features[key];
      if (override) {
        merged[key] = { ...val };
        for (const [sk, sv] of Object.entries(override)) {
          if (typeof sv === 'object' && sv !== null && typeof merged[key][sk] === 'object') {
            merged[key][sk] = { ...merged[key][sk], ...sv };
          } else {
            merged[key][sk] = sv;
          }
        }
      } else {
        merged[key] = val;
      }
    }
    return merged;
  }

  function getMergedThresholds() {
    if (!config?.thresholds) return {};
    if (!pendingChanges?.thresholds) return config.thresholds;
    return { ...config.thresholds, ...pendingChanges.thresholds };
  }

  // Preview before save
  function handlePreview() {
    if (!pendingChanges) return;
    originalRef.current = {
      features: config?.features || {},
      thresholds: config?.thresholds || {},
    };
    setPreviewOpen(true);
  }

  // Confirm and save
  async function handleConfirmSave() {
    try {
      await updateConfig(pendingChanges, reason);
      setPendingChanges(null);
      setReason('');
      setPreviewOpen(false);
      await fetchConfig();
    } catch {
      // error is set in hook
    }
  }

  // Branch override save
  async function handleBranchOverrideSave(branchId, overrides, overrideReason) {
    await setBranchOverride(branchId, overrides, overrideReason);
    await fetchConfig();
  }

  const hasPending = pendingChanges && (
    (pendingChanges.features && Object.keys(pendingChanges.features).length > 0) ||
    (pendingChanges.thresholds && Object.keys(pendingChanges.thresholds).length > 0)
  );

  if (loading) {
    return (
      <DashboardLayout title="Config" menuItems={MENU_ITEMS} user={user}>
        <div className="flex justify-center py-16">
          <div className="w-10 h-10 border-3 border-or-gold border-t-transparent rounded-full animate-spin" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout title="Config" menuItems={MENU_ITEMS} user={user}>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <h2 className="font-heading text-2xl text-white uppercase">World Model Config</h2>
          <Badge status="processing">v{config?.version || 1}</Badge>
        </div>
        {hasPending && (
          <div className="flex items-center gap-2">
            <Badge status="warning">UNSAVED</Badge>
            <Button variant="ghost" size="sm" onClick={() => setPendingChanges(null)}>
              Discard
            </Button>
            <Button variant="primary" size="sm" onClick={handlePreview}>
              Review & Save
            </Button>
          </div>
        )}
      </div>

      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-origin-red/10 border border-origin-red/20 text-sm text-origin-red">
          {error}
        </div>
      )}

      {/* Tabs */}
      <Tabs tabs={TABS} activeTab={tab} onChange={setTab} className="mb-6" />

      {/* Tab content */}
      {tab === 'features' && (
        <div className="space-y-4">
          <FeatureToggles
            features={getMergedFeatures()}
            onChange={handleFeatureChange}
            disabled={saving}
          />
          {hasPending && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <input
                type="text"
                placeholder="Reason for change (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm
                  focus:outline-none focus:border-or-gold placeholder:text-gray-400"
              />
              <Button variant="primary" size="sm" onClick={handlePreview}>
                Review & Save
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === 'thresholds' && (
        <div className="space-y-4">
          <ThresholdSettings
            thresholds={getMergedThresholds()}
            onChange={handleThresholdChange}
            disabled={saving}
          />
          {hasPending && (
            <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
              <input
                type="text"
                placeholder="Reason for change (optional)"
                value={reason}
                onChange={e => setReason(e.target.value)}
                className="flex-1 px-4 py-2 border-2 border-gray-200 rounded-lg text-sm
                  focus:outline-none focus:border-or-gold placeholder:text-gray-400"
              />
              <Button variant="primary" size="sm" onClick={handlePreview}>
                Review & Save
              </Button>
            </div>
          )}
        </div>
      )}

      {tab === 'branches' && (
        <BranchOverrides
          config={config}
          onSaveOverride={handleBranchOverrideSave}
          saving={saving}
        />
      )}

      {tab === 'history' && (
        <ConfigHistory fetchHistory={fetchHistory} onConfigReverted={() => fetchConfig()} />
      )}

      {/* Preview modal */}
      <ConfigPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        original={originalRef.current}
        pending={pendingChanges}
        reason={reason}
        onConfirm={handleConfirmSave}
        saving={saving}
      />
    </DashboardLayout>
  );
}
