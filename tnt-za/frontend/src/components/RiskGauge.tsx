interface Props {
  label: string;
  score: number | undefined;
  invert?: boolean; // true = higher is worse (diversion risk)
}

export default function RiskGauge({ label, score, invert }: Props) {
  const s = score ?? 0;
  const color = invert
    ? s > 50 ? 'text-red-400' : s > 25 ? 'text-amber-400' : 'text-green-400'
    : s < 50 ? 'text-red-400' : s < 75 ? 'text-amber-400' : 'text-green-400';
  const barColor = invert
    ? s > 50 ? 'bg-red-500' : s > 25 ? 'bg-amber-500' : 'bg-green-500'
    : s < 50 ? 'bg-red-500' : s < 75 ? 'bg-amber-500' : 'bg-green-500';

  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-4">
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm text-white/50">{label}</span>
        <span className={`text-xl font-bold font-mono ${color}`}>{score ?? '—'}</span>
      </div>
      <div className="h-2 bg-white/10 rounded-full overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-700 ${barColor}`} style={{ width: `${s}%` }} />
      </div>
    </div>
  );
}
