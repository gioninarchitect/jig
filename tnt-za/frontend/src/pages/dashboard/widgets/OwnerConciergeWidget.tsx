import { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { Sparkles, RefreshCw, Clock, Loader2 } from 'lucide-react';
import MarkdownLite from '../../../components/MarkdownLite';
import api from '../../../services/api';

// =====================================================================
// OwnerConciergeWidget — Opus 4.7 morning brief on the Owner home.
//
// On-demand: click "Generate" → ~15s round-trip → markdown brief.
// Caches the latest brief locally so it doesn't refetch on every render.
// =====================================================================

interface BriefResponse {
  success: boolean;
  brief: string;
  generatedAt: string;
  thinkingSummary?: string;
  bundleSize?: number;
  usage?: any;
}

export default function OwnerConciergeWidget() {
  const [brief, setBrief] = useState<BriefResponse | null>(null);
  const [showThinking, setShowThinking] = useState(false);

  const gen = useMutation({
    mutationFn: () => api.get<BriefResponse>('/concierge/brief').then(r => r.data),
    onSuccess: (data) => setBrief(data),
  });

  const generatedAgo = brief
    ? Math.round((Date.now() - new Date(brief.generatedAt).getTime()) / 60000)
    : null;

  return (
    <div className="rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/[0.06] to-amber-500/[0.03] p-4 sm:p-5">
      <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/15 flex items-center justify-center">
            <Sparkles size={14} className="text-primary" />
          </div>
          <div>
            <div className="text-sm font-semibold text-white">Owner Concierge</div>
            <div className="text-[10px] text-white/40">Opus 4.7 · cross-unit synthesis</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {brief && generatedAgo !== null && (
            <span className="text-[10px] text-white/30 font-mono flex items-center gap-1">
              <Clock size={10} /> {generatedAgo === 0 ? 'just now' : `${generatedAgo}m ago`}
            </span>
          )}
          <button
            onClick={() => gen.mutate()}
            disabled={gen.isPending}
            className="px-2.5 py-1.5 bg-primary/15 hover:bg-primary/25 border border-primary/30 text-primary rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50"
          >
            {gen.isPending ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
            {gen.isPending ? 'Synthesising…' : brief ? 'Refresh' : 'Generate brief'}
          </button>
        </div>
      </div>

      {!brief && !gen.isPending && (
        <p className="text-sm text-white/40">
          Click <strong className="text-primary">Generate brief</strong> to receive a tight morning summary
          synthesised from every active unit, ticket queue, SMF status, and sign-off bottleneck.
        </p>
      )}

      {gen.isPending && (
        <div className="space-y-2">
          <div className="h-3 bg-white/5 rounded animate-pulse w-3/4" />
          <div className="h-3 bg-white/5 rounded animate-pulse w-full" />
          <div className="h-3 bg-white/5 rounded animate-pulse w-5/6" />
          <div className="h-3 bg-white/5 rounded animate-pulse w-2/3" />
        </div>
      )}

      {gen.error && (
        <div className="text-sm text-red-300 bg-red-500/5 border border-red-500/20 rounded-lg p-3">
          Brief failed: {(gen.error as any).response?.data?.error ?? (gen.error as Error).message}
        </div>
      )}

      {brief && (
        <>
          <MarkdownLite text={brief.brief} className="mt-1" />

          {brief.thinkingSummary && (
            <div className="mt-3 pt-3 border-t border-white/[0.06]">
              <button
                onClick={() => setShowThinking(s => !s)}
                className="text-[10px] text-white/30 hover:text-white/60 transition"
              >
                {showThinking ? 'Hide' : 'Show'} adaptive-thinking summary →
              </button>
              {showThinking && (
                <div className="mt-2 text-[11px] text-white/40 italic whitespace-pre-wrap leading-relaxed bg-white/[0.02] rounded-lg p-2.5">
                  {brief.thinkingSummary}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
