import { useWorldState } from '../../../hooks/useWorldModel';
import { SkeletonTable } from '../../../components/Skeleton';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

const PHASE_COLORS: Record<string, string> = {
  SEEDLING: '#86EFAC', VEGETATIVE: '#4ADE80', FLOWERING: '#22C55E', HARVESTED: '#C9A84C',
  DRYING: '#E8A317', CURING: '#D97706', PROCESSING: '#A855F7', PACKAGED: '#0D6B3D',
};

export default function PhaseChartWidget() {
  const { data: state, isLoading } = useWorldState();
  const phaseData = state?.facility?.plantsByPhase
    ? Object.entries(state.facility.plantsByPhase).map(([phase, count]) => ({ phase, count: count as number }))
    : [];

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4 sm:p-5">
      <h2 className="text-sm font-semibold text-white/60 mb-4">Plant Phase Distribution</h2>
      {isLoading ? <SkeletonTable rows={3} /> : phaseData.length > 0 ? (
        <ResponsiveContainer width="100%" height={220}>
          <BarChart data={phaseData} layout="vertical" margin={{ left: 10 }}>
            <XAxis type="number" stroke="#555" fontSize={12} />
            <YAxis type="category" dataKey="phase" stroke="#555" fontSize={11} width={70} tick={{ fontSize: 10 }} />
            <Tooltip contentStyle={{ background: '#0D0D0D', border: '1px solid #333', borderRadius: 8 }} />
            <Bar dataKey="count" radius={[0, 6, 6, 0]}>
              {phaseData.map((d) => <Cell key={d.phase} fill={PHASE_COLORS[d.phase] || '#666'} />)}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      ) : <p className="text-white/30 text-sm">No plants registered yet</p>}
    </div>
  );
}
