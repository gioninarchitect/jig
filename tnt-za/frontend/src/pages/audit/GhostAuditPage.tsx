import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Eye, AlertTriangle, ScrollText, Filter, RotateCcw } from 'lucide-react';
import { SkeletonTable } from '../../components/Skeleton';
import api from '../../services/api';

// =====================================================================
// /audit/ghost — Ghost Mode audit feed
//
// Shows every AuditLog row where ghost mode was active, with the real
// actor + ghost target hydrated. Filters: by real actor, by ghost
// target, by date range. Read-only.
// =====================================================================

interface UserRef { id: string; name: string; email: string; role: string; }
interface GhostAuditEntry {
  id: string;
  timestamp: string;
  action: string;
  entityType: string;
  entityId: string;
  ipAddress: string | null;
  hashChain: string;
  userId: string;
  ghostAsUserId: string;
  realActor: UserRef | null;
  ghostTarget: UserRef | null;
}

export default function GhostAuditPage() {
  const [realFilter, setRealFilter] = useState('');
  const [ghostFilter, setGhostFilter] = useState('');
  const [sinceFilter, setSinceFilter] = useState('');

  const { data, isLoading } = useQuery({
    queryKey: ['ghost-audit', realFilter, ghostFilter, sinceFilter],
    queryFn: () => api.get('/audit/ghost', {
      params: {
        realUserId: realFilter || undefined,
        ghostAsUserId: ghostFilter || undefined,
        since: sinceFilter || undefined,
      },
    }).then(r => r.data),
  });

  const entries = (data?.entries ?? []) as GhostAuditEntry[];

  // Pull a sorted unique list of users seen in the entries — for filter dropdowns
  const uniq = (arr: (UserRef | null)[]) => {
    const seen = new Map<string, UserRef>();
    arr.forEach(u => { if (u && !seen.has(u.id)) seen.set(u.id, u); });
    return Array.from(seen.values()).sort((a, b) => a.name.localeCompare(b.name));
  };
  const realActors = uniq(entries.map(e => e.realActor));
  const ghostTargets = uniq(entries.map(e => e.ghostTarget));

  const reset = () => { setRealFilter(''); setGhostFilter(''); setSinceFilter(''); };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <ScrollText size={20} className="text-amber-400" /> Ghost Mode Audit
          </h1>
          <p className="text-xs text-white/40 mt-0.5">
            Every action taken under Ghost Mode (view + act-as). Hash-chained, append-only.
          </p>
        </div>
        <div className="text-xs text-white/40 font-mono">
          {data ? `${entries.length} entries` : '—'}
        </div>
      </div>

      {/* Filter row */}
      <div className="bg-white/[0.03] border border-white/10 rounded-xl p-3 flex items-center gap-2 flex-wrap">
        <Filter size={14} className="text-white/30 flex-shrink-0" />

        <select
          value={realFilter}
          onChange={e => setRealFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 min-h-[34px]"
        >
          <option value="">All real actors</option>
          {realActors.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <select
          value={ghostFilter}
          onChange={e => setGhostFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 min-h-[34px]"
        >
          <option value="">All ghost targets</option>
          {ghostTargets.map(u => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select>

        <input
          type="date"
          value={sinceFilter}
          onChange={e => setSinceFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-white/5 border border-white/10 rounded-lg text-xs text-white/70 min-h-[34px]"
          title="Since (date)"
        />

        {(realFilter || ghostFilter || sinceFilter) && (
          <button
            onClick={reset}
            className="px-2.5 py-1.5 text-xs text-white/40 hover:text-white flex items-center gap-1 min-h-[34px]"
          >
            <RotateCcw size={11} /> Reset
          </button>
        )}
      </div>

      {/* Entries */}
      {isLoading ? (
        <SkeletonTable rows={6} />
      ) : entries.length === 0 ? (
        <div className="bg-white/[0.03] border border-white/10 rounded-xl p-8 text-center text-white/40">
          <Eye size={28} className="mx-auto mb-2 opacity-30" />
          <p className="text-sm">No ghost activity recorded yet</p>
          <p className="text-[11px] text-white/25 mt-1">
            When Flo / Ilse / Coenie use Ghost Mode, every action will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-white/[0.03] border-b border-white/[0.06]">
                <tr className="text-[10px] uppercase tracking-wider text-white/40">
                  <th className="text-left px-3 py-2.5 font-semibold">Timestamp</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Real Actor</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Ghosted As</th>
                  <th className="text-left px-3 py-2.5 font-semibold">Action</th>
                  <th className="text-left px-3 py-2.5 font-semibold hidden md:table-cell">Entity</th>
                  <th className="text-left px-3 py-2.5 font-semibold hidden lg:table-cell">IP</th>
                  <th className="text-left px-3 py-2.5 font-semibold hidden lg:table-cell">Hash</th>
                </tr>
              </thead>
              <tbody>
                {entries.map(e => {
                  // Action verbs that imply a write get a red mark = ACT-AS evidence
                  const isWrite = /CREATED|UPDATED|DELETED|SIGNED|APPROVED|REJECTED|CLOSED|RESOLVED/i.test(e.action);
                  return (
                    <tr key={e.id} className="border-b border-white/[0.04] last:border-0 hover:bg-white/[0.02]">
                      <td className="px-3 py-2 font-mono text-white/50 whitespace-nowrap">
                        {new Date(e.timestamp).toLocaleString('en-ZA', { dateStyle: 'short', timeStyle: 'medium' })}
                      </td>
                      <td className="px-3 py-2 text-white/80">
                        {e.realActor?.name ?? '—'}
                        <div className="text-[10px] text-white/30">{e.realActor?.role.replace(/_/g, ' ') ?? ''}</div>
                      </td>
                      <td className="px-3 py-2 text-amber-300">
                        → {e.ghostTarget?.name ?? '—'}
                        <div className="text-[10px] text-amber-200/40">{e.ghostTarget?.role.replace(/_/g, ' ') ?? ''}</div>
                      </td>
                      <td className="px-3 py-2">
                        <span className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wide ${isWrite ? 'bg-red-500/15 text-red-300' : 'bg-white/5 text-white/50'}`}>
                          {isWrite ? <span className="inline-flex items-center gap-1"><AlertTriangle size={9} /> {e.action}</span> : e.action}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-white/50 font-mono hidden md:table-cell">
                        {e.entityType}<span className="text-white/20">·</span>{e.entityId.slice(0, 8)}
                      </td>
                      <td className="px-3 py-2 text-white/30 font-mono hidden lg:table-cell">{e.ipAddress ?? '—'}</td>
                      <td className="px-3 py-2 text-white/20 font-mono text-[10px] hidden lg:table-cell" title={e.hashChain}>
                        {e.hashChain.slice(0, 8)}…
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
