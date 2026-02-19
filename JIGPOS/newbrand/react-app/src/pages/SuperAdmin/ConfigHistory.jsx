// P30+P32 — Audit trail with revert, export, date range filter

import { useState, useEffect, useCallback } from 'react';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import Modal from '../../components/ui/Modal';
import api from '../../services/api';

function diffChanges(prev, next) {
  const changes = [];
  if (!prev || !next) return changes;

  if (prev.features && next.features) {
    for (const [fKey, fVal] of Object.entries(next.features)) {
      const prevF = prev.features[fKey] || {};
      if (typeof fVal === 'object' && fVal !== null) {
        for (const [sKey, sVal] of Object.entries(fVal)) {
          if (typeof sVal === 'object' && sVal !== null) {
            for (const [dKey, dVal] of Object.entries(sVal)) {
              if (prevF[sKey]?.[dKey] !== dVal) {
                changes.push({ path: `${fKey}.${sKey}.${dKey}`, from: prevF[sKey]?.[dKey], to: dVal });
              }
            }
          } else if (prevF[sKey] !== sVal) {
            changes.push({ path: `${fKey}.${sKey}`, from: prevF[sKey], to: sVal });
          }
        }
      }
    }
  }

  if (prev.thresholds && next.thresholds) {
    for (const [key, val] of Object.entries(next.thresholds)) {
      if (prev.thresholds[key] !== val) {
        changes.push({ path: `thresholds.${key}`, from: prev.thresholds[key], to: val });
      }
    }
  }

  return changes;
}

function entriesToCSV(entries) {
  const rows = [['Date', 'Changed By', 'Type', 'Reason', 'Changes'].join(',')];
  for (const entry of entries) {
    const user = entry.changedBy;
    const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'System';
    const date = new Date(entry.changedAt).toISOString();
    const changes = diffChanges(entry.previousValue, entry.newValue);
    const changeStr = changes.map(c => `${c.path}: ${c.from} -> ${c.to}`).join('; ');
    rows.push([
      `"${date}"`,
      `"${userName}"`,
      `"${entry.changeType}"`,
      `"${(entry.reason || '').replace(/"/g, '""')}"`,
      `"${changeStr.replace(/"/g, '""')}"`,
    ].join(','));
  }
  return rows.join('\n');
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ConfigHistory({ fetchHistory, onConfigReverted }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [revertTarget, setRevertTarget] = useState(null);
  const [reverting, setReverting] = useState(false);

  const loadEntries = useCallback(async () => {
    setLoading(true);
    const result = await fetchHistory(page, 20, dateFrom, dateTo);
    setEntries(result.data || []);
    setTotal(result.total || 0);
    setLoading(false);
  }, [fetchHistory, page, dateFrom, dateTo]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  async function handleRevert() {
    if (!revertTarget) return;
    setReverting(true);
    try {
      await api.post(`/config/world-model/revert/${revertTarget._id}`);
      setRevertTarget(null);
      await loadEntries();
      onConfigReverted?.();
    } catch {
      // error handling via toast in parent
    }
    setReverting(false);
  }

  function handleExportCSV() {
    if (entries.length === 0) return;
    const csv = entriesToCSV(entries);
    const dateStr = new Date().toISOString().slice(0, 10);
    downloadCSV(csv, `config-history-${dateStr}.csv`);
  }

  function handleDateFilter() {
    setPage(1);
    // loadEntries will fire via useEffect
  }

  function clearDateFilter() {
    setDateFrom('');
    setDateTo('');
    setPage(1);
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Toolbar — date filter + export */}
      <div className="flex flex-wrap items-end gap-3 p-4 bg-white rounded-xl border border-gray-200">
        <div>
          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">From</label>
          <input
            type="date"
            value={dateFrom}
            onChange={e => setDateFrom(e.target.value)}
            className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-xs focus:outline-none focus:border-jig-amber"
          />
        </div>
        <div>
          <label className="block text-[10px] text-gray-500 font-bold uppercase mb-1">To</label>
          <input
            type="date"
            value={dateTo}
            onChange={e => setDateTo(e.target.value)}
            className="px-3 py-1.5 border-2 border-gray-200 rounded-lg text-xs focus:outline-none focus:border-jig-amber"
          />
        </div>
        <button
          onClick={handleDateFilter}
          className="px-3 py-1.5 text-xs bg-jig-purple text-white rounded-lg hover:bg-jig-purple-dark transition-colors"
        >
          Filter
        </button>
        {(dateFrom || dateTo) && (
          <button
            onClick={clearDateFilter}
            className="px-3 py-1.5 text-xs text-gray-500 hover:text-jig-red transition-colors"
          >
            Clear
          </button>
        )}
        <div className="flex-1" />
        <button
          onClick={handleExportCSV}
          disabled={entries.length === 0}
          className="px-3 py-1.5 text-xs border border-gray-200 rounded-lg hover:bg-jig-slate disabled:opacity-40 transition-colors"
        >
          Export CSV
        </button>
        <span className="text-[10px] text-gray-400">{total} records</span>
      </div>

      {/* Entries */}
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 py-8 text-center">No configuration changes recorded yet</p>
      ) : (
        entries.map((entry, i) => {
          const changes = diffChanges(entry.previousValue, entry.newValue);
          const user = entry.changedBy;
          const userName = user ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.email : 'System';
          const date = new Date(entry.changedAt).toLocaleString('en-ZA');
          const isRevert = entry.reason?.startsWith('Reverted change from');

          return (
            <div key={entry._id || i} className={`bg-white rounded-xl border overflow-hidden ${isRevert ? 'border-jig-amber/40' : 'border-gray-200'}`}>
              {/* Timeline bar */}
              <div className="h-1 bg-gradient-to-r from-jig-purple to-jig-amber" />

              <div className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-white">{userName}</span>
                    <Badge status={entry.changeType === 'branch_override' ? 'warning' : 'info'}>
                      {entry.changeType === 'branch_override' ? 'BRANCH' : 'GLOBAL'}
                    </Badge>
                    {isRevert && <Badge status="pending">REVERT</Badge>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-[10px] text-gray-400">{date}</span>
                    {!isRevert && (
                      <button
                        onClick={() => setRevertTarget(entry)}
                        className="text-[10px] text-jig-red hover:text-jig-red-dark font-medium"
                      >
                        Revert
                      </button>
                    )}
                  </div>
                </div>

                {entry.reason && (
                  <p className="text-xs text-gray-500 italic mb-2">"{entry.reason}"</p>
                )}

                {entry.branchId && (
                  <div className="text-xs text-gray-400 mb-2">
                    Branch: {typeof entry.branchId === 'object' ? entry.branchId.name : entry.branchId}
                  </div>
                )}

                {changes.length > 0 && (
                  <div className="space-y-1 mt-2 p-3 bg-gray-50 rounded-lg">
                    {changes.slice(0, 10).map((ch, ci) => (
                      <div key={ci} className="flex items-center gap-2 text-xs">
                        <span className="text-gray-500 font-mono">{ch.path}</span>
                        <span className="text-jig-red line-through">{String(ch.from ?? 'null')}</span>
                        <span className="text-gray-400">&rarr;</span>
                        <span className="text-jig-purple font-medium">{String(ch.to ?? 'null')}</span>
                      </div>
                    ))}
                    {changes.length > 10 && (
                      <span className="text-[10px] text-gray-400">+{changes.length - 10} more changes</span>
                    )}
                  </div>
                )}

                {changes.length === 0 && (
                  <p className="text-xs text-gray-400">Configuration updated (no diff available)</p>
                )}
              </div>
            </div>
          );
        })
      )}

      {/* Pagination */}
      {total > 20 && (
        <div className="flex items-center justify-center gap-2 pt-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-jig-slate"
          >
            Prev
          </button>
          <span className="text-xs text-gray-500">Page {page} of {Math.ceil(total / 20)}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            disabled={page >= Math.ceil(total / 20)}
            className="px-3 py-1 text-xs border border-gray-200 rounded-lg disabled:opacity-40 hover:bg-jig-slate"
          >
            Next
          </button>
        </div>
      )}

      {/* Revert confirmation modal */}
      <Modal
        open={!!revertTarget}
        onClose={() => setRevertTarget(null)}
        title="Revert Configuration Change"
        size="md"
        footer={
          <>
            <Button variant="ghost" size="sm" onClick={() => setRevertTarget(null)} disabled={reverting}>
              Cancel
            </Button>
            <Button variant="danger" size="sm" onClick={handleRevert} disabled={reverting}>
              {reverting ? 'Reverting...' : 'Confirm Revert'}
            </Button>
          </>
        }
      >
        {revertTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              This will restore the configuration to its state <strong>before</strong> this change was made.
            </p>
            <div className="p-3 bg-gray-50 rounded-lg">
              <div className="text-xs text-gray-500">
                <strong>Date:</strong> {new Date(revertTarget.changedAt).toLocaleString('en-ZA')}
              </div>
              {revertTarget.reason && (
                <div className="text-xs text-gray-500 mt-1">
                  <strong>Reason:</strong> "{revertTarget.reason}"
                </div>
              )}
              <div className="text-xs text-gray-500 mt-1">
                <strong>Type:</strong> {revertTarget.changeType === 'branch_override' ? 'Branch Override' : 'Global Change'}
              </div>
            </div>
            <p className="text-xs text-jig-red">
              A new history entry will be created recording this revert. Config will propagate to all sessions.
            </p>
          </div>
        )}
      </Modal>
    </div>
  );
}
