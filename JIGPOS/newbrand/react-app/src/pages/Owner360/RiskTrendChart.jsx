// P25 — Risk Trend Chart (risk trending over time)
// CSS-based sparkline/bar chart showing risk score history across domains.

import { useMemo } from 'react';

const DOMAIN_LABELS = {
  overall: { label: 'Overall', color: 'bg-origin-slate' },
  regulatory: { label: 'Regulatory', color: 'bg-red-500' },
  financial: { label: 'Financial', color: 'bg-green-500' },
  inventory: { label: 'Inventory', color: 'bg-blue-500' },
  staff: { label: 'Staff', color: 'bg-purple-500' },
  operational: { label: 'Operational', color: 'bg-gray-500' },
  customer: { label: 'Customer', color: 'bg-amber-500' },
};

/**
 * @param {Object} props
 * @param {Array} props.history — [{timestamp, scores: {overall, regulatory, ...}}]
 * @param {string} props.branchName
 */
export default function RiskTrendChart({ history, branchName }) {
  // Default to showing last 14 data points
  const data = useMemo(() => {
    if (!history?.length) return [];
    return history.slice(-14).map(entry => ({
      timestamp: entry.timestamp,
      label: formatDate(entry.timestamp),
      scores: entry.scores || entry,
    }));
  }, [history]);

  if (!data.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">No risk trend data</div>
        <div className="text-xs text-gray-300 mt-1">Trends populate as risk scores are calculated daily</div>
      </div>
    );
  }

  // Calculate trends (compare latest vs first)
  const trends = useMemo(() => {
    if (data.length < 2) return {};
    const first = data[0].scores;
    const last = data[data.length - 1].scores;
    const result = {};
    for (const domain of Object.keys(DOMAIN_LABELS)) {
      const start = first[domain] ?? 0;
      const end = last[domain] ?? 0;
      const diff = end - start;
      result[domain] = {
        current: end,
        change: diff,
        direction: diff > 5 ? 'rising' : diff < -5 ? 'falling' : 'stable',
      };
    }
    return result;
  }, [data]);

  return (
    <div className="space-y-4">
      {branchName && (
        <div className="text-xs text-gray-500 font-bold uppercase">{branchName} — Risk Trend</div>
      )}

      {/* Trend summary row */}
      <div className="grid grid-cols-3 sm:grid-cols-4 lg:grid-cols-7 gap-2">
        {Object.entries(DOMAIN_LABELS).map(([domain, cfg]) => {
          const trend = trends[domain];
          if (!trend) return null;
          return (
            <div key={domain} className="p-2 rounded-lg bg-origin-slate border border-or-gold/10 text-center">
              <div className="text-[10px] text-gray-400">{cfg.label}</div>
              <div className={`font-heading text-sm ${
                trend.current >= 70 ? 'text-origin-red' :
                trend.current >= 40 ? 'text-or-gold-dark' :
                'text-or-gold'
              }`}>
                {trend.current}
              </div>
              <div className={`text-[10px] font-bold ${
                trend.direction === 'rising' ? 'text-origin-red' :
                trend.direction === 'falling' ? 'text-or-gold' :
                'text-gray-400'
              }`}>
                {trend.direction === 'rising' ? '+' : trend.direction === 'falling' ? '' : ''}
                {trend.change !== 0 ? trend.change : '--'}
                {trend.direction === 'rising' ? ' UP' : trend.direction === 'falling' ? ' DOWN' : ''}
              </div>
            </div>
          );
        })}
      </div>

      {/* Chart area — stacked bar per time period */}
      <div className="overflow-x-auto">
        <div className="flex gap-1 items-end min-w-0" style={{ minHeight: 120 }}>
          {data.map((entry, i) => {
            const overall = entry.scores.overall ?? 0;
            const height = Math.max(overall, 2); // minimum visible height

            return (
              <div key={i} className="flex-1 min-w-[24px] group relative">
                {/* Bar */}
                <div className="w-full bg-gray-100 rounded-t overflow-hidden" style={{ height: 120 }}>
                  <div
                    className={`w-full rounded-t transition-all duration-300 absolute bottom-0 left-0 ${
                      overall >= 70 ? 'bg-origin-red/70' :
                      overall >= 40 ? 'bg-or-gold/70' :
                      'bg-or-gold/50'
                    }`}
                    style={{ height: `${(height / 100) * 120}px` }}
                  />
                </div>

                {/* Label */}
                <div className="text-center mt-1">
                  <div className="text-[9px] text-gray-400 truncate">{entry.label}</div>
                  <div className="text-[10px] font-bold text-white">{overall}</div>
                </div>

                {/* Tooltip on hover */}
                <div className="hidden group-hover:block absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-32 p-2 rounded-lg bg-white border border-gray-200 shadow-lg z-10">
                  <div className="text-[10px] font-bold text-white mb-1">{entry.label}</div>
                  {Object.entries(DOMAIN_LABELS).map(([d, cfg]) => {
                    const val = entry.scores[d];
                    if (val == null) return null;
                    return (
                      <div key={d} className="flex items-center justify-between text-[9px]">
                        <span className="flex items-center gap-1">
                          <span className={`w-1.5 h-1.5 rounded-full ${cfg.color}`} />
                          {cfg.label}
                        </span>
                        <span className={`font-bold ${
                          val >= 70 ? 'text-origin-red' : val >= 40 ? 'text-or-gold-dark' : 'text-or-gold'
                        }`}>{val}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Domain breakdown sparklines */}
      <div className="space-y-1">
        <div className="text-[10px] text-gray-400 font-bold uppercase">Domain Breakdown</div>
        {Object.entries(DOMAIN_LABELS).filter(([d]) => d !== 'overall').map(([domain, cfg]) => {
          const values = data.map(d => d.scores[domain] ?? 0);
          const max = Math.max(...values, 1);
          const latest = values[values.length - 1];

          return (
            <div key={domain} className="flex items-center gap-2">
              <div className="w-20 text-[10px] text-gray-500 shrink-0">{cfg.label}</div>
              {/* Mini sparkline */}
              <div className="flex-1 flex items-end gap-px h-4">
                {values.map((v, i) => (
                  <div
                    key={i}
                    className={`flex-1 rounded-sm ${cfg.color} opacity-${i === values.length - 1 ? '100' : '40'}`}
                    style={{ height: `${Math.max((v / max) * 16, 1)}px`, opacity: i === values.length - 1 ? 1 : 0.4 }}
                  />
                ))}
              </div>
              <div className={`w-8 text-right text-[10px] font-bold ${
                latest >= 70 ? 'text-origin-red' : latest >= 40 ? 'text-or-gold-dark' : 'text-or-gold'
              }`}>
                {latest}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function formatDate(timestamp) {
  const d = new Date(timestamp);
  return `${d.getDate()}/${d.getMonth() + 1}`;
}
