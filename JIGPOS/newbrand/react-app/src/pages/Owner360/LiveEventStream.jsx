// P22 — Live Event Stream for 360View
// Color-coded event feed from all branches, filterable

import { useState } from 'react';
import useLiveEvents from './hooks/useLiveEvents';

const SEVERITY_STYLES = {
  info: 'border-l-blue-400 bg-blue-50',
  success: 'border-l-jig-purple bg-jig-purple/5',
  warning: 'border-l-jig-amber bg-jig-amber/5',
  critical: 'border-l-jig-red bg-jig-red/5',
};

const SEVERITY_DOT = {
  info: 'bg-blue-400',
  success: 'bg-jig-purple',
  warning: 'bg-jig-amber',
  critical: 'bg-jig-red animate-pulse',
};

function formatEventType(type) {
  return (type || '').replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
}

function timeAgo(ts) {
  const diff = Date.now() - new Date(ts).getTime();
  if (diff < 60000) return 'just now';
  if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`;
  if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`;
  return new Date(ts).toLocaleDateString('en-ZA');
}

export default function LiveEventStream({ branchFilter = null }) {
  const [severityFilter, setSeverityFilter] = useState(null);
  const { events } = useLiveEvents({ branchFilter, severityFilter });

  const FILTERS = [
    { key: null, label: 'All' },
    { key: 'critical', label: 'Critical' },
    { key: 'warning', label: 'Warnings' },
    { key: 'success', label: 'Success' },
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Filter bar */}
      <div className="flex gap-1 mb-3">
        {FILTERS.map(f => (
          <button
            key={f.key || 'all'}
            onClick={() => setSeverityFilter(f.key)}
            className={`px-3 py-1 rounded text-xs font-bold transition-colors ${
              severityFilter === f.key
                ? 'bg-jig-purple text-white'
                : 'bg-gray-100 text-gray-500 hover:bg-gray-200'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Event list */}
      <div className="flex-1 overflow-y-auto space-y-1.5">
        {events.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">No events yet</div>
        ) : (
          events.map(evt => (
            <div
              key={evt.id}
              className={`p-2.5 rounded-lg border-l-4 ${SEVERITY_STYLES[evt.severity] || SEVERITY_STYLES.info}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-2 h-2 rounded-full shrink-0 ${SEVERITY_DOT[evt.severity] || SEVERITY_DOT.info}`} />
                  <span className="text-xs font-bold text-white truncate">
                    {formatEventType(evt.type)}
                  </span>
                </div>
                <span className="text-[10px] text-gray-400 shrink-0">{timeAgo(evt.timestamp)}</span>
              </div>
              <div className="ml-4 mt-0.5 flex items-center gap-2 text-[11px] text-gray-500">
                <span className="font-semibold">{evt.branchId?.slice(-6) || 'ALL'}</span>
                {evt.data?.total && <span>R{Number(evt.data.total).toFixed(0)}</span>}
                {evt.data?.saleNumber && <span>#{evt.data.saleNumber}</span>}
                {evt.data?.message && <span className="truncate">{evt.data.message}</span>}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
