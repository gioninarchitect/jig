// P25 — Staff Score Board (accountability scores, leaderboard)
// Wired to real backend: GET /risk/staff/leaderboard/:branchId

import { useState } from 'react';

const TIER_CONFIG = {
  Exceptional: { label: 'Exceptional', color: 'bg-or-gold text-white' },
  Good: { label: 'Good', color: 'bg-or-gold/20 text-white' },
  Satisfactory: { label: 'Satisfactory', color: 'bg-or-gold/20 text-or-gold-dark' },
  'Needs Improvement': { label: 'Needs Improvement', color: 'bg-origin-red/10 text-origin-red' },
};

const METRIC_LABELS = {
  tillAccuracy: 'Till Accuracy',
  voidRatio: 'Void/Refund',
  discountCompliance: 'Discount Compliance',
  speedConsistency: 'Speed',
  clockInCompliance: 'Attendance',
};

export default function StaffScoreBoard({ leaderboard, loading, error }) {
  const [expanded, setExpanded] = useState(null);

  if (error === 'disabled') {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">Staff Accountability is disabled</div>
        <div className="text-xs text-gray-300 mt-1">Enable in Super Admin &gt; World Model Config</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <div className="w-6 h-6 border-2 border-or-gold border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!leaderboard?.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">No staff scores available</div>
        <div className="text-xs text-gray-300 mt-1">Scores populate as staff complete till sessions</div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {/* Summary */}
      <div className="grid grid-cols-4 gap-2 text-center">
        {Object.entries(TIER_CONFIG).map(([tier, cfg]) => {
          const count = leaderboard.filter(s => s.tier === tier).length;
          return (
            <div key={tier} className="p-2 rounded-lg bg-origin-slate border border-or-gold/10">
              <div className="text-[10px] text-gray-400">{cfg.label}</div>
              <div className="font-heading text-lg text-white">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      {leaderboard.map((entry, rank) => {
        const tierCfg = TIER_CONFIG[entry.tier] || TIER_CONFIG.Satisfactory;
        const isExpanded = expanded === (entry._id || entry.staffId);
        const name = entry.firstName
          ? `${entry.firstName} ${entry.lastName || ''}`.trim()
          : `Staff #${(entry._id || '').slice(-6)}`;

        return (
          <div key={entry._id || rank} className="border border-gray-200 rounded-lg overflow-hidden">
            <button
              onClick={() => setExpanded(isExpanded ? null : (entry._id || entry.staffId))}
              className="w-full p-3 text-left hover:bg-origin-slate/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    rank === 0 ? 'bg-or-gold text-white' :
                    rank === 1 ? 'bg-gray-300 text-white' :
                    rank === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {entry.rank || rank + 1}
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-white">{name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tierCfg.color}`}>
                        {tierCfg.label}
                      </span>
                      <span className="text-[10px] text-gray-400">{entry.role}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`font-heading text-xl ${
                    entry.score >= 90 ? 'text-or-gold' :
                    entry.score >= 75 ? 'text-white' :
                    entry.score >= 60 ? 'text-or-gold-dark' :
                    'text-origin-red'
                  }`}>
                    {entry.score}
                  </div>
                  <div className="text-[10px] text-gray-400">/ 100</div>
                </div>
              </div>
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    entry.score >= 90 ? 'bg-or-gold' :
                    entry.score >= 75 ? 'bg-or-gold/70' :
                    entry.score >= 60 ? 'bg-or-gold' :
                    'bg-origin-red'
                  }`}
                  style={{ width: `${entry.score}%` }}
                />
              </div>
            </button>

            {isExpanded && entry.metrics && (
              <div className="px-3 pb-3 border-t border-gray-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {Object.entries(METRIC_LABELS).map(([key, label]) => {
                    const value = entry.metrics?.[key];
                    if (value == null) return null;
                    return (
                      <div key={key} className="p-2 rounded bg-origin-slate border border-or-gold/10">
                        <div className="text-[10px] text-gray-400 uppercase">{label}</div>
                        <div className={`font-heading text-sm ${
                          value >= 90 ? 'text-or-gold' :
                          value >= 75 ? 'text-white' :
                          value >= 60 ? 'text-or-gold-dark' :
                          'text-origin-red'
                        }`}>
                          {value}/100
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
