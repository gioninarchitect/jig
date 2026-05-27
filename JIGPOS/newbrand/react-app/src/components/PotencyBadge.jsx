// P23 — Potency Badge (Customer Transparency Component)
// Shows lab-tested potency + estimated current potency for a batch.
// Feature-gated: only renders if config.features.potencyDegradation.enabled === true

import { useMemo } from 'react';
import { useWorldModelConfig } from '../world-model/WorldModelContext';
import { estimateCurrentPotency } from '../world-model/engines/potency';

const CONFIDENCE_STYLES = {
  high: 'text-or-gold',
  medium: 'text-or-gold-dark',
  low: 'text-origin-red',
  none: 'text-gray-400',
};

export default function PotencyBadge({ batch, compact = false }) {
  const config = useWorldModelConfig();

  const potency = useMemo(() => {
    if (!batch || !config?.features?.potencyDegradation?.enabled) return null;
    return estimateCurrentPotency(batch, config);
  }, [batch, config]);

  // Feature not enabled or no batch
  if (!potency) return null;

  // No cannabinoid data
  if (!potency.originalTHC && !potency.originalCBD) return null;

  const testDateStr = batch.testDate || batch.labTestDate;
  const testLabel = testDateStr
    ? new Date(testDateStr).toLocaleDateString('en-ZA', { month: 'short', year: 'numeric' })
    : null;

  const significantDrop = potency.thcDropPercent >= 3; // Only show estimate if meaningful
  const showRetest = potency.suggestRetest;

  if (compact) {
    return (
      <span className="inline-flex items-center gap-1 text-xs">
        <span className="text-gray-500">THC</span>
        <span className="font-bold text-white">{potency.originalTHC}%</span>
        {significantDrop && (
          <>
            <span className="text-gray-400">&rarr;</span>
            <span className={`font-bold ${CONFIDENCE_STYLES[potency.confidenceLevel]}`}>
              ~{potency.estimatedTHC}%
            </span>
          </>
        )}
      </span>
    );
  }

  return (
    <div className="inline-block rounded-lg border border-or-gold/20 bg-origin-slate overflow-hidden text-xs">
      {/* Lab tested values */}
      <div className="px-3 py-2 flex items-center gap-3">
        {/* THC */}
        <div>
          <span className="text-gray-500">THC: </span>
          <span className="font-heading text-sm text-white">{potency.originalTHC}%</span>
        </div>

        {/* CBD (if present) */}
        {potency.originalCBD > 0 && (
          <div>
            <span className="text-gray-500">CBD: </span>
            <span className="font-heading text-sm text-white">{potency.originalCBD}%</span>
          </div>
        )}

        {/* Test date */}
        {testLabel && (
          <div className="text-gray-400">
            Lab tested {testLabel}
          </div>
        )}
      </div>

      {/* Estimated current (only if significant change) */}
      {significantDrop && (
        <div className="px-3 py-1.5 bg-or-gold/5 border-t border-or-gold/10 flex items-center gap-3">
          <div>
            <span className="text-gray-500">Est. current: </span>
            <span className={`font-heading text-sm ${CONFIDENCE_STYLES[potency.confidenceLevel]}`}>
              ~{potency.estimatedTHC}% THC
            </span>
          </div>
          {potency.originalCBD > 0 && (
            <div>
              <span className={`font-heading text-sm ${CONFIDENCE_STYLES[potency.confidenceLevel]}`}>
                ~{potency.estimatedCBD}% CBD
              </span>
            </div>
          )}
          <div className="ml-auto">
            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
              potency.confidenceLevel === 'high' ? 'bg-or-gold/10 text-or-gold' :
              potency.confidenceLevel === 'medium' ? 'bg-or-gold/10 text-or-gold-dark' :
              'bg-origin-red/10 text-origin-red'
            }`}>
              {potency.confidenceLevel}
            </span>
          </div>
        </div>
      )}

      {/* Terpene retention */}
      {potency.terpeneRetention < 90 && (
        <div className="px-3 py-1 bg-white/50 border-t border-or-gold/5 text-[10px] text-gray-400">
          Terpene retention: ~{potency.terpeneRetention}%
        </div>
      )}

      {/* Retest warning */}
      {showRetest && (
        <div className="px-3 py-1.5 bg-or-gold/10 border-t border-or-gold/20 text-[10px] font-bold text-or-gold-dark">
          Lab retest recommended ({potency.daysSinceTest} days since last test)
        </div>
      )}

      {/* Markdown suggestion */}
      {potency.suggestMarkdown && (
        <div className="px-3 py-1.5 bg-origin-red/5 border-t border-origin-red/20 text-[10px] font-bold text-origin-red">
          Suggest {potency.suggestedMarkdownPercent}% markdown (potency drop: {potency.thcDropPercent}%)
        </div>
      )}
    </div>
  );
}
