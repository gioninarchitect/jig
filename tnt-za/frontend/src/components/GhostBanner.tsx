import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { useGhostStore } from '../stores/ghostStore';
import Modal from './Modal';
import { Eye, X, Pencil, ScrollText, AlertTriangle } from 'lucide-react';

// =====================================================================
// GhostBanner — persistent strip when ghost mode is active.
//   • Amber  · view-only (default)
//   • Red    · act-as mode (writes allowed, dual-recorded)
// Shows real identity, ghost target, mode, exit + audit link.
// =====================================================================

export default function GhostBanner() {
  const realUser = useAuthStore(s => s.user);
  const ghost = useGhostStore(s => s.ghostUser);
  const actAs = useGhostStore(s => s.actAsMode);
  const exitGhost = useGhostStore(s => s.exitGhost);
  const enableActAs = useGhostStore(s => s.enableActAs);
  const disableActAs = useGhostStore(s => s.disableActAs);
  const qc = useQueryClient();
  const [confirmOpen, setConfirmOpen] = useState(false);

  if (!ghost) return null;

  function handleExit() {
    exitGhost();
    qc.invalidateQueries();
  }

  function confirmActAs() {
    enableActAs();
    setConfirmOpen(false);
    qc.invalidateQueries();
  }

  function returnToView() {
    disableActAs();
    qc.invalidateQueries();
  }

  const tone = actAs ? 'red' : 'amber';
  const styles = actAs
    ? { bar: 'bg-red-500/15 border-red-500/40', text: 'text-red-200', label: 'text-red-300', sub: 'text-red-200/70', subOff: 'text-red-200/50', btn: 'bg-red-500/25 hover:bg-red-500/35 text-red-100' }
    : { bar: 'bg-amber-500/15 border-amber-500/30', text: 'text-amber-200', label: 'text-amber-300', sub: 'text-amber-200/70', subOff: 'text-amber-200/50', btn: 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200' };

  return (
    <>
      <div className={`${styles.bar} border-b px-4 py-2 flex items-center justify-between gap-3 sticky top-0 z-40 flex-wrap`}>
        <div className="flex items-center gap-2 min-w-0">
          {actAs ? <AlertTriangle size={14} className={styles.label + ' flex-shrink-0'} />
                 : <Eye size={14} className={styles.label + ' flex-shrink-0'} />}
          <div className={`text-xs ${styles.text} leading-tight min-w-0`}>
            <span className="font-semibold">{actAs ? 'ACT-AS Mode' : 'Ghost Mode'}</span>
            <span className={`${styles.sub} mx-1.5`}>·</span>
            <span>{actAs ? 'acting as ' : 'viewing as '}<strong>{ghost.name}</strong> ({ghost.role.replace(/_/g, ' ')})</span>
            <span className={`${styles.subOff} hidden sm:inline mx-1.5`}>·</span>
            <span className={`${styles.subOff} hidden sm:inline`}>real: {realUser?.name}</span>
            {actAs && (
              <>
                <span className={`${styles.subOff} hidden md:inline mx-1.5`}>·</span>
                <span className={`${styles.subOff} hidden md:inline`}>writes recorded as both names</span>
              </>
            )}
          </div>
        </div>
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <Link
            to="/audit/ghost"
            className={`flex items-center gap-1 px-2 py-1 rounded-md ${styles.btn} text-xs font-semibold transition`}
            title="View ghost audit log"
          >
            <ScrollText size={11} /> Audit
          </Link>
          {actAs ? (
            <button
              onClick={returnToView}
              className={`flex items-center gap-1 px-2 py-1 rounded-md ${styles.btn} text-xs font-semibold transition`}
              title="Stop acting — return to view-only"
            >
              <Eye size={11} /> View only
            </button>
          ) : (
            <button
              onClick={() => setConfirmOpen(true)}
              className={`flex items-center gap-1 px-2 py-1 rounded-md ${styles.btn} text-xs font-semibold transition`}
              title="Escalate to act-as: writes allowed, dual-recorded"
            >
              <Pencil size={11} /> Act-as
            </button>
          )}
          <button
            onClick={handleExit}
            className={`flex items-center gap-1 px-2 py-1 rounded-md ${styles.btn} text-xs font-semibold transition`}
          >
            <X size={11} /> Exit
          </button>
        </div>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title="Switch to Act-As mode?"
      >
        <div className="space-y-3 text-sm">
          <p className="text-white/70">
            You are currently <strong>viewing as {ghost.name}</strong> in read-only ghost mode.
            Switching to <strong className="text-red-300">Act-As</strong> mode will:
          </p>
          <ul className="list-disc list-inside text-white/60 space-y-1 pl-2">
            <li>Allow you to perform writes (sign-offs, ticket creation, edits)</li>
            <li>Record every action in AuditLog as <strong>{realUser?.name}</strong> acting as <strong>{ghost.name}</strong></li>
            <li>Show a red banner so you and any reviewer can see Act-As is active</li>
            <li>Stay active until you click <em>"View only"</em> or <em>"Exit"</em></li>
          </ul>
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-xs text-red-200">
            <strong>Use sparingly.</strong> Act-As is for cases where you must complete an action on
            another person's behalf (sick day, sign-off backlog). Both names appear on the audit trail.
          </div>
          <div className="flex gap-2 pt-2">
            <button
              onClick={() => setConfirmOpen(false)}
              className="flex-1 py-3.5 bg-white/5 hover:bg-white/10 text-white/70 rounded-xl font-semibold transition min-h-[48px] text-base"
            >
              Cancel
            </button>
            <button
              onClick={confirmActAs}
              className="flex-1 py-3.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/40 text-red-200 rounded-xl font-semibold transition min-h-[48px] text-base"
            >
              Yes, act as {ghost.name.split(' ')[0]}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
}
