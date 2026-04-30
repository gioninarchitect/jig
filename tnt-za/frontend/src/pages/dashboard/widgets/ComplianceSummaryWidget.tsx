import { useWorldState } from '../../../hooks/useWorldModel';
import { ShieldCheck, AlertTriangle, FileText, Scale } from 'lucide-react';

export default function ComplianceSummaryWidget() {
  const { data: state } = useWorldState();
  if (!state) return null;

  const items = [
    { label: 'Open Anomalies', value: state.compliance?.openAnomalies ?? 0, icon: AlertTriangle, danger: (state.compliance?.openAnomalies ?? 0) > 0 },
    { label: 'Critical Alerts', value: state.compliance?.criticalAlerts ?? 0, icon: ShieldCheck, danger: (state.compliance?.criticalAlerts ?? 0) > 0 },
    { label: 'Pending Destructions', value: state.compliance?.pendingDestructions ?? 0, icon: Scale, danger: false },
    { label: 'COAs Issued', value: state.lab?.issuedCOAs ?? 0, icon: FileText, danger: false },
  ];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <div className="flex items-center gap-2 mb-3">
        <ShieldCheck size={16} className="text-primary" />
        <h2 className="text-sm font-semibold text-white/60">SAHPRA Compliance</h2>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {items.map(item => (
          <div key={item.label} className={`rounded-lg p-3 border ${item.danger ? 'bg-red-500/5 border-red-500/20' : 'bg-white/[0.03] border-white/5'}`}>
            <div className="flex items-center gap-1.5 mb-1">
              <item.icon size={12} className={item.danger ? 'text-red-400' : 'text-white/30'} />
              <span className="text-[11px] text-white/40">{item.label}</span>
            </div>
            <div className={`text-xl font-bold font-mono ${item.danger ? 'text-red-400' : 'text-white'}`}>{item.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
