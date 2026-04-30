import { useRiskScores, useInferences } from '../../../hooks/useWorldModel';
import RiskGauge from '../../../components/RiskGauge';
import { AlertTriangle } from 'lucide-react';

export default function RiskGaugesWidget() {
  const { data: risk } = useRiskScores();
  const { data: inferences } = useInferences();

  return (
    <>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <RiskGauge label="Diversion Risk" score={risk?.diversionRiskScore} invert />
        <RiskGauge label="Compliance Score" score={risk?.complianceScore} />
        <RiskGauge label="Weight Integrity" score={risk?.weightIntegrityScore} />
      </div>

      {inferences && inferences.length > 0 && (
        <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
          <h2 className="text-sm font-semibold text-white/60 mb-3">Active Alerts</h2>
          <div className="space-y-2">
            {inferences.map((alert: any) => (
              <div key={alert.id} className={`flex items-start gap-3 p-3 rounded-lg border
                ${alert.severity === 'critical' ? 'border-red-500/30 bg-red-500/5' : alert.severity === 'warning' ? 'border-amber-500/30 bg-amber-500/5' : 'border-blue-500/30 bg-blue-500/5'}`}>
                <AlertTriangle size={16} className={alert.severity === 'critical' ? 'text-red-400' : alert.severity === 'warning' ? 'text-amber-400' : 'text-blue-400'} />
                <div>
                  <div className="text-sm font-medium text-white">{alert.name}</div>
                  <div className="text-xs text-white/50">{alert.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
