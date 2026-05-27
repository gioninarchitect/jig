export default function StatCard({ label, value, trend, trendLabel, className = '' }) {
  const isPositive = trend > 0;
  const isNegative = trend < 0;

  return (
    <div
      className={`
        bg-origin-slate rounded-2xl p-6 border border-or-gold relative overflow-hidden
        ${className}
      `}
    >
      {/* Gold top bar */}
      <div className="absolute top-0 left-0 w-full h-1 bg-or-gold" />

      <div className="flex items-end justify-between">
        <div>
          <div className="font-heading text-4xl text-white uppercase">{value}</div>
          <div className="text-sm text-or-gold-light mt-2 font-body">{label}</div>
        </div>

        {trend !== undefined && trend !== null && (
          <div className={`flex items-center gap-1 text-sm font-semibold ${isPositive ? 'text-success' : isNegative ? 'text-error' : 'text-gray-400'}`}>
            {isPositive && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
              </svg>
            )}
            {isNegative && (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            )}
            <span>{Math.abs(trend)}%</span>
            {trendLabel && <span className="text-xs text-gray-400 font-normal ml-1">{trendLabel}</span>}
          </div>
        )}
      </div>
    </div>
  );
}
