import { useWorldState } from '../../../hooks/useWorldModel';
import StatCard from '../../../components/StatCard';
import { Leaf, Layers, AlertTriangle, Gauge } from 'lucide-react';

export default function StatCardsWidget() {
  const { data: state, isLoading } = useWorldState();
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
      <StatCard label="Active Plants" value={state?.facility?.totalPlants} icon={<Leaf size={20} />} loading={isLoading} />
      <StatCard label="Active Batches" value={state?.facility?.activeBatches} icon={<Layers size={20} />} loading={isLoading}
        sub={state?.lab ? `${state.lab.issuedCOAs} COAs issued` : undefined} />
      <StatCard label="Compliance Flags" value={state?.compliance?.openAnomalies} icon={<AlertTriangle size={20} />} loading={isLoading}
        danger={(state?.compliance?.openAnomalies ?? 0) > 0} />
      <StatCard label="INCB Quota" value={state?.facility?.quotaUsedPercent !== undefined ? `${state.facility.quotaUsedPercent.toFixed(0)}%` : undefined}
        icon={<Gauge size={20} />} loading={isLoading}
        sub={state?.facility ? `${state.facility.quotaUsedPercent > 85 ? 'WARNING' : 'Normal'}` : undefined} />
    </div>
  );
}
