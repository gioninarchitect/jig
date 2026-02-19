// P30 — Preview impact of config changes before saving

import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';

function computeDiff(original, pending) {
  const diffs = [];
  if (!original || !pending) return diffs;

  // Flatten and compare features
  if (pending.features) {
    for (const [fKey, fVal] of Object.entries(pending.features)) {
      const origF = original.features?.[fKey] || {};
      for (const [sKey, sVal] of Object.entries(fVal)) {
        if (typeof sVal === 'object' && sVal !== null) {
          for (const [dKey, dVal] of Object.entries(sVal)) {
            const origVal = origF[sKey]?.[dKey];
            if (origVal !== dVal) {
              diffs.push({
                path: `features.${fKey}.${sKey}.${dKey}`,
                from: origVal,
                to: dVal,
                type: typeof dVal === 'boolean' ? 'toggle' : 'value',
              });
            }
          }
        } else {
          const origVal = origF[sKey];
          if (origVal !== sVal) {
            diffs.push({
              path: `features.${fKey}.${sKey}`,
              from: origVal,
              to: sVal,
              type: typeof sVal === 'boolean' ? 'toggle' : 'value',
            });
          }
        }
      }
    }
  }

  // Compare thresholds
  if (pending.thresholds) {
    for (const [key, val] of Object.entries(pending.thresholds)) {
      if (original.thresholds?.[key] !== val) {
        diffs.push({
          path: `thresholds.${key}`,
          from: original.thresholds?.[key],
          to: val,
          type: 'value',
        });
      }
    }
  }

  return diffs;
}

export default function ConfigPreview({ open, onClose, original, pending, reason, onConfirm, saving }) {
  const diffs = computeDiff(original, pending);

  if (diffs.length === 0 && open) {
    return (
      <Modal open={open} onClose={onClose} title="No Changes" size="sm">
        <p className="text-sm text-gray-500">No configuration changes detected.</p>
        <div className="mt-4">
          <Button variant="ghost" size="sm" onClick={onClose}>Close</Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Confirm Config Change"
      size="lg"
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={onConfirm} disabled={saving}>
            {saving ? 'Saving...' : 'Confirm & Save'}
          </Button>
        </>
      }
    >
      <div className="space-y-4">
        {/* Summary */}
        <div className="flex items-center gap-2">
          <Badge status="warning">{diffs.length} CHANGE{diffs.length !== 1 ? 'S' : ''}</Badge>
          <span className="text-xs text-gray-500">will be applied globally</span>
        </div>

        {/* Diff table */}
        <div className="bg-gray-50 rounded-xl border border-gray-200 divide-y divide-gray-100">
          {diffs.map((d, i) => (
            <div key={i} className="flex items-center justify-between px-4 py-2.5">
              <span className="text-xs font-mono text-gray-600">{d.path}</span>
              <div className="flex items-center gap-2 text-xs">
                <span className={d.type === 'toggle' ? (d.from ? 'text-jig-purple' : 'text-jig-red') : 'text-gray-500'}>
                  {d.from === undefined ? '--' : String(d.from)}
                </span>
                <span className="text-gray-300">&rarr;</span>
                <span className={d.type === 'toggle' ? (d.to ? 'text-jig-purple font-bold' : 'text-jig-red font-bold') : 'text-white font-bold'}>
                  {String(d.to)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Reason */}
        {reason && (
          <div className="text-xs text-gray-500">
            <span className="font-bold">Reason: </span>"{reason}"
          </div>
        )}
      </div>
    </Modal>
  );
}
