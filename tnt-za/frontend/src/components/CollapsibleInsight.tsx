import { useState, ReactNode } from 'react';
import { ChevronDown } from 'lucide-react';

// =====================================================================
// CollapsibleInsight — accordion wrapper for non-urgent FM widgets
//
// Click header to expand. Stays collapsed by default to keep the home
// view tidy. Optional `summary` line shows a one-glance hint while
// collapsed (e.g. "3 readings due", "Yield: 24kg").
// =====================================================================

interface Props {
  title: string;
  icon?: any;
  summary?: string;
  defaultOpen?: boolean;
  children: ReactNode;
}

export default function CollapsibleInsight({
  title, icon: Icon, summary, defaultOpen = false, children,
}: Props) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <div className="bg-white/[0.02] border border-white/[0.06] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/[0.04] transition text-left"
      >
        {Icon && <Icon size={14} className="text-white/40 flex-shrink-0" />}
        <span className="text-sm font-medium text-white/70 flex-1">{title}</span>
        {summary && (
          <span className="text-[11px] text-white/30 font-mono">{summary}</span>
        )}
        <ChevronDown
          size={14}
          className={`text-white/30 transition-transform flex-shrink-0 ${open ? '' : '-rotate-90'}`}
        />
      </button>
      {open && (
        <div className="border-t border-white/[0.04] p-3 sm:p-4">
          {children}
        </div>
      )}
    </div>
  );
}
