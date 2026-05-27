// P26 — Compliance Timeline (history of all checks, blocks, passes)

import { useState, useEffect } from 'react';
import api from '../../services/api';
import Badge from '../../components/ui/Badge';

const RESULT_CONFIG = {
  BLOCKED: { badge: 'error', label: 'Blocked', color: 'border-origin-red/20 bg-origin-red/5' },
  WARNING: { badge: 'warning', label: 'Warning', color: 'border-or-gold/20 bg-or-gold/5' },
  PASSED: { badge: 'active', label: 'Passed', color: 'border-or-gold/20 bg-or-gold/5' },
};

export default function ComplianceTimeline() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [page, setPage] = useState(1);

  useEffect(() => {
    async function load() {
      try {
        const res = await api.get(`/compliance/log?page=${page}&limit=50`);
        setLogs(res.data?.logs || res.data?.data || []);
      } catch {
        // Endpoint may not exist yet — show empty state
        setLogs([]);
      }
      setLoading(false);
    }
    load();
  }, [page]);

  const filtered = filter === 'all' ? logs : logs.filter(l => l.result === filter);

  const counts = {
    all: logs.length,
    BLOCKED: logs.filter(l => l.result === 'BLOCKED').length,
    WARNING: logs.filter(l => l.result === 'WARNING').length,
    PASSED: logs.filter(l => l.result === 'PASSED').length,
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Filter bar */}
      <div className="flex gap-1 flex-wrap">
        {[
          { key: 'all', label: 'All' },
          { key: 'BLOCKED', label: 'Blocked' },
          { key: 'WARNING', label: 'Warnings' },
          { key: 'PASSED', label: 'Passed' },
        ].map(f => (
          <button
            key={f.key}
            onClick={() => setFilter(f.key)}
            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
              filter === f.key ? 'bg-or-gold text-white' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label} ({counts[f.key]})
          </button>
        ))}
      </div>

      {/* Timeline */}
      {filtered.length === 0 ? (
        <div className="text-center py-8 text-gray-400 text-sm">
          {logs.length === 0 ? 'No compliance logs yet — logs will appear as sales are processed' : 'No entries match this filter'}
        </div>
      ) : (
        <div className="relative">
          {/* Timeline line */}
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-200" />

          {filtered.map((log, i) => {
            const cfg = RESULT_CONFIG[log.result] || RESULT_CONFIG.PASSED;
            const timestamp = new Date(log.timestamp || log.createdAt);

            return (
              <div key={log._id || i} className="relative pl-10 pb-4">
                {/* Timeline dot */}
                <div className={`absolute left-2.5 top-2 w-3 h-3 rounded-full border-2 border-white ${
                  log.result === 'BLOCKED' ? 'bg-origin-red' :
                  log.result === 'WARNING' ? 'bg-or-gold' :
                  'bg-or-gold'
                }`} />

                {/* Entry card */}
                <div className={`p-3 rounded-lg border ${cfg.color}`}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Badge status={cfg.badge}>{cfg.label}</Badge>
                      <span className="text-xs text-gray-500">{log.type || 'SALE_VALIDATION'}</span>
                    </div>
                    <span className="text-[10px] text-gray-400">
                      {timestamp.toLocaleDateString('en-ZA')} {timestamp.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {/* Block details */}
                  {log.blocks?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {log.blocks.map((block, j) => (
                        <div key={j} className="text-xs text-origin-red">
                          {block.type}: {block.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Warning details */}
                  {log.warnings?.length > 0 && (
                    <div className="mt-1 space-y-0.5">
                      {log.warnings.map((warning, j) => (
                        <div key={j} className="text-xs text-or-gold-dark">
                          {warning.type}: {warning.message}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Context */}
                  <div className="mt-1 flex gap-3 text-[10px] text-gray-400">
                    {log.staffId && <span>Staff: {log.staffId.slice(-6)}</span>}
                    {log.customerId && <span>Customer: {log.customerId.slice(-6)}</span>}
                    {log.branchId && <span>Branch: {log.branchId.slice(-6)}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {logs.length >= 50 && (
        <div className="flex justify-center gap-2">
          <button
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1}
            className="px-3 py-1 rounded text-xs bg-gray-100 text-gray-500 hover:bg-gray-200 disabled:opacity-50"
          >
            Previous
          </button>
          <span className="px-3 py-1 text-xs text-gray-400">Page {page}</span>
          <button
            onClick={() => setPage(p => p + 1)}
            className="px-3 py-1 rounded text-xs bg-gray-100 text-gray-500 hover:bg-gray-200"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
