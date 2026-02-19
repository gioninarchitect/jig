// P25 — Staff Score Board (accountability scores, leaderboard)
// Displays staff performance leaderboard with composite scores and achievements.

import { useState, useEffect, useMemo } from 'react';
import Badge from '../../components/ui/Badge';
import { useWorldModelConfig } from '../../world-model/WorldModelContext';
import { calculateLeaderboard } from '../../world-model/engines/staff-accountability';

const TIER_CONFIG = {
  exceptional: { label: 'Exceptional', color: 'bg-jig-purple text-white' },
  good: { label: 'Good', color: 'bg-jig-purple/20 text-white' },
  satisfactory: { label: 'Satisfactory', color: 'bg-jig-amber/20 text-jig-amber-dark' },
  needs_improvement: { label: 'Needs Improvement', color: 'bg-jig-red/10 text-jig-red' },
};

const METRIC_LABELS = {
  tillAccuracy: 'Till Accuracy',
  voidRefundRatio: 'Void/Refund',
  discountCompliance: 'Discount Compliance',
  speedConsistency: 'Speed',
  stocktakeAccuracy: 'Stocktake Accuracy',
  clockInCompliance: 'Attendance',
};

const ACHIEVEMENT_ICONS = {
  target: '|O|',
  shield: '[+]',
  zap: '//',
  clock: '()',
  eye: '<>',
  star: '[*]',
};

export default function StaffScoreBoard({ branchState, staffList }) {
  const config = useWorldModelConfig();
  const [expanded, setExpanded] = useState(null);

  const enabled = config?.features?.staffAccountability?.enabled;

  // Calculate leaderboard
  const leaderboard = useMemo(() => {
    if (!enabled || !branchState || !staffList?.length) return [];
    const staffIds = staffList.map(s => s._id || s.staffId || s.id);
    return calculateLeaderboard(staffIds, branchState, config);
  }, [branchState, staffList, config, enabled]);

  // Map staff names
  const staffNames = useMemo(() => {
    const map = {};
    (staffList || []).forEach(s => {
      const id = s._id || s.staffId || s.id;
      map[id] = s.firstName ? `${s.firstName} ${s.lastName || ''}`.trim() : (s.name || id);
    });
    return map;
  }, [staffList]);

  if (!enabled) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">Staff Accountability is disabled</div>
        <div className="text-xs text-gray-300 mt-1">Enable in Super Admin Config</div>
      </div>
    );
  }

  if (!leaderboard.length) {
    return (
      <div className="text-center py-8">
        <div className="text-gray-400 text-sm">No staff scores available</div>
        <div className="text-xs text-gray-300 mt-1">Scores populate as staff activity is recorded</div>
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
            <div key={tier} className="p-2 rounded-lg bg-jig-slate border border-jig-purple/10">
              <div className="text-[10px] text-gray-400">{cfg.label}</div>
              <div className="font-heading text-lg text-white">{count}</div>
            </div>
          );
        })}
      </div>

      {/* Leaderboard */}
      {leaderboard.map((entry, rank) => {
        const tierCfg = TIER_CONFIG[entry.tier] || TIER_CONFIG.satisfactory;
        const isExpanded = expanded === entry.staffId;
        const name = staffNames[entry.staffId] || `Staff #${entry.staffId?.slice(-6)}`;

        return (
          <div key={entry.staffId} className="border border-gray-200 rounded-lg overflow-hidden">
            {/* Main row */}
            <button
              onClick={() => setExpanded(isExpanded ? null : entry.staffId)}
              className="w-full p-3 text-left hover:bg-jig-slate/50 transition-colors"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {/* Rank */}
                  <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                    rank === 0 ? 'bg-jig-amber text-white' :
                    rank === 1 ? 'bg-gray-300 text-white' :
                    rank === 2 ? 'bg-amber-600 text-white' :
                    'bg-gray-100 text-gray-500'
                  }`}>
                    {rank + 1}
                  </div>

                  <div>
                    <div className="text-sm font-semibold text-white">{name}</div>
                    <div className="flex items-center gap-1 mt-0.5">
                      <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${tierCfg.color}`}>
                        {tierCfg.label}
                      </span>
                      {entry.achievements?.slice(0, 3).map(a => (
                        <span key={a.id} className="px-1 py-0.5 rounded bg-jig-amber/10 text-jig-amber-dark text-[9px] font-bold" title={a.label}>
                          {ACHIEVEMENT_ICONS[a.icon] || a.icon} {a.label}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Score */}
                <div className="text-right">
                  <div className={`font-heading text-xl ${
                    entry.score >= 90 ? 'text-jig-purple' :
                    entry.score >= 75 ? 'text-white' :
                    entry.score >= 60 ? 'text-jig-amber-dark' :
                    'text-jig-red'
                  }`}>
                    {entry.score}
                  </div>
                  <div className="text-[10px] text-gray-400">/ 100</div>
                </div>
              </div>

              {/* Score bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    entry.score >= 90 ? 'bg-jig-purple' :
                    entry.score >= 75 ? 'bg-jig-purple/70' :
                    entry.score >= 60 ? 'bg-jig-amber' :
                    'bg-jig-red'
                  }`}
                  style={{ width: `${entry.score}%` }}
                />
              </div>
            </button>

            {/* Expanded details */}
            {isExpanded && (
              <div className="px-3 pb-3 border-t border-gray-100">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-3">
                  {Object.entries(METRIC_LABELS).map(([key, label]) => {
                    const metric = entry.metrics?.[key];
                    if (!metric) return null;
                    return (
                      <div key={key} className="p-2 rounded bg-jig-slate border border-jig-purple/10">
                        <div className="text-[10px] text-gray-400 uppercase">{label}</div>
                        <div className={`font-heading text-sm ${
                          metric.score >= 90 ? 'text-jig-purple' :
                          metric.score >= 75 ? 'text-white' :
                          metric.score >= 60 ? 'text-jig-amber-dark' :
                          'text-jig-red'
                        }`}>
                          {metric.score}/100
                        </div>
                        <div className="text-[10px] text-gray-400">{metric.details}</div>
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
