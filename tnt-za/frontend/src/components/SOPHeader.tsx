import { FileText, Shield } from 'lucide-react';

// =====================================================================
// SOPHeader — standard pharma-GMP SOP stamp for any page
//
// The digital page IS the SOP of record. This stamp tells the auditor
// which paper SOP this page replaces, when it became effective, and
// who authorised + checks it. Sign-off + audit hash are recorded on
// each save by the existing audit chain (no work needed here).
// =====================================================================

interface SOPHeaderProps {
  sopNumber: string;          // e.g. "3-CUL-6"
  title: string;              // e.g. "Mother Bay Daily Check Sheet"
  effectiveDate: string;      // e.g. "17/10/2025"
  version?: string;           // e.g. "1.0"
  authorisedBy?: string;      // e.g. "Ilze Venter"
  checkedBy?: string;         // e.g. "Coenraad Venter (Responsible Pharmacist)"
  reportsTo?: string;         // e.g. "Head Grower"
  responsibility?: string;    // e.g. "Plant Technicians"
}

export default function SOPHeader({
  sopNumber, title, effectiveDate, version = '1.0',
  authorisedBy, checkedBy, reportsTo, responsibility,
}: SOPHeaderProps) {
  return (
    <div className="border border-amber-700/30 bg-gradient-to-r from-amber-950/30 via-zinc-900/40 to-amber-950/20 rounded-xl px-5 py-4 mb-6 print:break-inside-avoid">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        {/* Left — SOP identity */}
        <div className="flex items-start gap-3">
          <div className="mt-0.5 flex-shrink-0 w-9 h-9 rounded-lg bg-amber-700/15 border border-amber-700/30 flex items-center justify-center text-amber-400">
            <FileText size={16} />
          </div>
          <div>
            <div className="font-mono text-[10px] uppercase tracking-[0.2em] text-amber-500/80 mb-0.5">
              SOP {sopNumber} · v{version} · effective {effectiveDate}
            </div>
            <h2 className="font-semibold text-white text-sm leading-tight">
              {title}
            </h2>
            {(responsibility || reportsTo) && (
              <p className="text-xs text-white/40 mt-1 leading-snug">
                {responsibility && <>Responsibility: <span className="text-white/60">{responsibility}</span></>}
                {responsibility && reportsTo && <span className="text-white/20 mx-1">·</span>}
                {reportsTo && <>Reports to: <span className="text-white/60">{reportsTo}</span></>}
              </p>
            )}
          </div>
        </div>

        {/* Right — sign-off chain */}
        {(authorisedBy || checkedBy) && (
          <div className="flex flex-col gap-1.5 sm:items-end shrink-0 sm:max-w-xs">
            {authorisedBy && (
              <div className="flex items-center gap-2 text-[11px]">
                <span className="font-mono uppercase tracking-wider text-white/30 text-[9px]">Authorised</span>
                <span className="text-amber-300/90 font-medium">{authorisedBy}</span>
              </div>
            )}
            {checkedBy && (
              <div className="flex items-center gap-2 text-[11px]">
                <Shield size={11} className="text-amber-500/60" />
                <span className="font-mono uppercase tracking-wider text-white/30 text-[9px]">Checked</span>
                <span className="text-amber-300/90 font-medium">{checkedBy}</span>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
