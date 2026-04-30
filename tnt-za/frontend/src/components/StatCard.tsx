import { ReactNode } from 'react';
import { SkeletonCard } from './Skeleton';

interface Props {
  label: string;
  value: string | number | undefined;
  icon: ReactNode;
  loading?: boolean;
  danger?: boolean;
  sub?: string;
}

export default function StatCard({ label, value, icon, loading, danger, sub }: Props) {
  if (loading) return <SkeletonCard />;
  return (
    <div className={`rounded-xl border p-5 ${danger ? 'bg-red-500/10 border-red-500/30' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm text-white/50">{label}</span>
        <span className={danger ? 'text-red-400' : 'text-primary'}>{icon}</span>
      </div>
      <div className={`text-3xl font-bold font-mono ${danger ? 'text-red-400' : 'text-white'}`}>{value ?? '—'}</div>
      {sub && <div className="text-xs text-white/40 mt-1">{sub}</div>}
    </div>
  );
}
