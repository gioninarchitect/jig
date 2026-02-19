// P22 — Risk Heatmap for 360View
// Visual risk display across all branches using World Model risk scores

import { useDBCWorldModel } from '../../world-model/WorldModelContext';

const RISK_DOMAINS = ['regulatory', 'financial', 'inventory', 'staff', 'operational', 'customer'];

function riskColor(score) {
  if (score >= 70) return 'bg-jig-red';
  if (score >= 50) return 'bg-jig-red/60';
  if (score >= 30) return 'bg-jig-amber';
  if (score >= 15) return 'bg-jig-amber/50';
  return 'bg-jig-purple/40';
}

function riskTextColor(score) {
  if (score >= 50) return 'text-white';
  return 'text-white';
}

export default function RiskHeatmap({ branches }) {
  const { allBranches } = useDBCWorldModel();

  // Match real branches with World Model branch states
  const branchRisks = branches.filter(b => b.isActive).map(branch => {
    const worldState = allBranches[branch._id];
    const riskScore = worldState?.riskScore || {};
    return {
      id: branch._id,
      name: branch.name,
      overall: riskScore.overall || 0,
      domains: RISK_DOMAINS.reduce((acc, d) => {
        acc[d] = riskScore[d] || 0;
        return acc;
      }, {}),
    };
  });

  if (branchRisks.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        No active branches with risk data
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-2 px-2 text-jig-purple-light font-bold uppercase">Branch</th>
            <th className="text-center py-2 px-1 text-jig-purple-light font-bold uppercase">Overall</th>
            {RISK_DOMAINS.map(d => (
              <th key={d} className="text-center py-2 px-1 text-jig-purple-light font-bold uppercase text-[10px]">
                {d.slice(0, 5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {branchRisks.map(br => (
            <tr key={br.id} className="border-t border-gray-100">
              <td className="py-2 px-2 font-semibold text-white truncate max-w-[120px]">
                {br.name}
              </td>
              <td className="py-1 px-1 text-center">
                <span className={`inline-block w-10 py-1 rounded font-heading text-sm ${riskColor(br.overall)} ${riskTextColor(br.overall)}`}>
                  {br.overall}
                </span>
              </td>
              {RISK_DOMAINS.map(d => (
                <td key={d} className="py-1 px-1 text-center">
                  <span className={`inline-block w-8 py-0.5 rounded text-[10px] font-bold ${riskColor(br.domains[d])} ${riskTextColor(br.domains[d])}`}>
                    {br.domains[d]}
                  </span>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>

      {/* Legend */}
      <div className="flex items-center gap-4 mt-3 text-[10px] text-gray-400">
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-jig-purple/40" />
          <span>Low (0-15)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-jig-amber/50" />
          <span>Watch (15-30)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-jig-amber" />
          <span>Amber (30-50)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-jig-red/60" />
          <span>High (50-70)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-jig-red" />
          <span>Critical (70+)</span>
        </div>
      </div>
    </div>
  );
}
