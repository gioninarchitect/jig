// P22 — Risk Heatmap for 360View
// Wired to real backend: GET /risk/network returns per-branch risk scores

const RISK_DOMAINS = ['regulatory', 'financial', 'inventory', 'staff', 'operational', 'customer'];

function riskColor(score) {
  if (score >= 70) return 'bg-origin-red';
  if (score >= 50) return 'bg-origin-red/60';
  if (score >= 30) return 'bg-or-gold';
  if (score >= 15) return 'bg-or-gold/50';
  return 'bg-or-gold/40';
}

function riskTextColor(score) {
  if (score >= 50) return 'text-white';
  return 'text-white';
}

export default function RiskHeatmap({ branches, networkRisk, riskError }) {
  // If risk scoring is disabled, show clear message
  if (riskError === 'disabled') {
    return (
      <div className="text-center py-6">
        <div className="text-gray-400 text-sm">Risk Scoring is disabled</div>
        <div className="text-xs text-gray-300 mt-1">Enable in Super Admin &gt; World Model Config</div>
      </div>
    );
  }

  // Build heatmap from real backend data
  const branchRisks = networkRisk?.branches || [];

  if (branchRisks.length === 0) {
    return (
      <div className="text-center py-6 text-gray-400 text-sm">
        {networkRisk ? 'No risk data available yet. Risk scores calculate from POS activity.' : 'Loading risk data...'}
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      {/* Network average */}
      {networkRisk?.networkAverage != null && (
        <div className="flex items-center gap-3 mb-4 px-2">
          <span className="text-xs text-gray-400 uppercase font-bold">Network Risk</span>
          <span className={`inline-block px-3 py-1 rounded font-heading text-lg ${riskColor(networkRisk.networkAverage)} ${riskTextColor(networkRisk.networkAverage)}`}>
            {networkRisk.networkAverage}
          </span>
          <span className="text-[10px] text-gray-400">/ 100</span>
        </div>
      )}

      <table className="w-full text-xs">
        <thead>
          <tr>
            <th className="text-left py-2 px-2 text-or-gold-light font-bold uppercase">Branch</th>
            <th className="text-center py-2 px-1 text-or-gold-light font-bold uppercase">Overall</th>
            {RISK_DOMAINS.map(d => (
              <th key={d} className="text-center py-2 px-1 text-or-gold-light font-bold uppercase text-[10px]">
                {d.slice(0, 5)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {branchRisks.map(br => (
            <tr key={br.branchId} className="border-t border-gray-100">
              <td className="py-2 px-2 font-semibold text-white truncate max-w-[120px]">
                {br.name || br.branchCode || 'Unknown'}
              </td>
              <td className="py-1 px-1 text-center">
                <span className={`inline-block w-10 py-1 rounded font-heading text-sm ${riskColor(br.overall)} ${riskTextColor(br.overall)}`}>
                  {br.overall}
                </span>
              </td>
              {RISK_DOMAINS.map(d => (
                <td key={d} className="py-1 px-1 text-center">
                  <span className={`inline-block w-8 py-0.5 rounded text-[10px] font-bold ${riskColor(br[d] || 0)} ${riskTextColor(br[d] || 0)}`}>
                    {br[d] || 0}
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
          <div className="w-3 h-3 rounded bg-or-gold/40" />
          <span>Low (0-15)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-or-gold/50" />
          <span>Watch (15-30)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-or-gold" />
          <span>Amber (30-50)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-origin-red/60" />
          <span>High (50-70)</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="w-3 h-3 rounded bg-origin-red" />
          <span>Critical (70+)</span>
        </div>
      </div>

      {networkRisk?.calculatedAt && (
        <div className="text-[10px] text-gray-400 mt-2 px-2">
          Last calculated: {new Date(networkRisk.calculatedAt).toLocaleTimeString('en-ZA')}
        </div>
      )}
    </div>
  );
}
