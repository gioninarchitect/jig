export function SkeletonCard() {
  return (
    <div className="bg-white/5 border border-white/10 rounded-xl p-5 animate-pulse">
      <div className="h-4 bg-white/10 rounded w-1/3 mb-3" />
      <div className="h-8 bg-white/10 rounded w-1/2 mb-2" />
      <div className="h-3 bg-white/5 rounded w-2/3" />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-pulse space-y-2">
      <div className="h-10 bg-white/5 rounded-lg" />
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="h-12 bg-white/[0.03] rounded-lg" />
      ))}
    </div>
  );
}

export function SkeletonPage() {
  return (
    <div className="animate-pulse space-y-6">
      <div className="h-8 bg-white/10 rounded w-1/4" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => <SkeletonCard key={i} />)}
      </div>
      <SkeletonTable />
    </div>
  );
}
