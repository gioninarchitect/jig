import { useState, useRef, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useAuthStore } from '../stores/authStore';
import { useGhostStore, canGhost } from '../stores/ghostStore';
import { Eye, ChevronDown, X } from 'lucide-react';
import api from '../services/api';

// =====================================================================
// GhostSwitcher — header dropdown for the 3 ghost-allowed users.
// Picks any active user in the tenant and switches the UI's effective
// identity to that user.  Read-only enforced by backend.
// =====================================================================

export default function GhostSwitcher() {
  const realUser = useAuthStore(s => s.user);
  const ghostUser = useGhostStore(s => s.ghostUser);
  const setGhost = useGhostStore(s => s.setGhost);
  const exitGhost = useGhostStore(s => s.exitGhost);
  const qc = useQueryClient();

  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Click-outside to close
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  // Bail if real user isn't allowed to ghost
  if (!canGhost(realUser?.email)) return null;

  // Fetch users for the picker (only enabled when dropdown opens, to avoid load on every render)
  const { data: users } = useQuery({
    queryKey: ['users-ghost'],
    queryFn: () => api.get('/users').then(r => r.data.users as Array<{ id: string; name: string; email: string; role: string; active?: boolean }>),
    enabled: open,
  });

  function applyGhost(u: { id: string; name: string; email: string; role: string }) {
    setGhost({ id: u.id, name: u.name, email: u.email, role: u.role });
    setOpen(false);
    // Invalidate everything so the UI re-fetches as the ghost user
    qc.invalidateQueries();
  }

  function applyExit() {
    exitGhost();
    setOpen(false);
    qc.invalidateQueries();
  }

  const candidates = (users ?? [])
    .filter(u => u.active !== false && u.id !== realUser?.id)
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(o => !o)}
        className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium transition border ${
          ghostUser
            ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/20'
            : 'bg-white/5 border-white/10 text-white/50 hover:text-white hover:bg-white/10'
        }`}
        title={ghostUser ? `Ghosting as ${ghostUser.name}` : 'Ghost Mode — view as another user'}
      >
        <Eye size={12} />
        <span className="hidden sm:inline">
          {ghostUser ? `Ghost: ${ghostUser.name.split(' ')[0]}` : 'View as'}
        </span>
        <ChevronDown size={11} className={`transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-96 overflow-y-auto rounded-xl border border-white/10 bg-[#0F0F0F] shadow-2xl z-50">
          <div className="px-3 py-2 border-b border-white/5">
            <div className="text-[10px] tracking-wide uppercase text-white/30 font-semibold">Ghost Mode</div>
            <div className="text-[11px] text-white/40">View any user's dashboard. Read-only.</div>
          </div>

          {ghostUser && (
            <button
              onClick={applyExit}
              className="w-full flex items-center gap-2 px-3 py-2.5 text-sm text-amber-300 hover:bg-amber-500/10 transition border-b border-white/5"
            >
              <X size={14} /> Exit ghost (return to {realUser?.name})
            </button>
          )}

          {!users && (
            <div className="px-3 py-4 text-xs text-white/30">Loading users…</div>
          )}

          {candidates.length > 0 && (
            <ul className="py-1">
              {candidates.map(u => (
                <li key={u.id}>
                  <button
                    onClick={() => applyGhost(u)}
                    disabled={ghostUser?.id === u.id}
                    className={`w-full flex items-center gap-3 px-3 py-2 text-left transition ${
                      ghostUser?.id === u.id
                        ? 'bg-amber-500/10 text-amber-300 cursor-default'
                        : 'text-white/70 hover:bg-white/5 hover:text-white'
                    }`}
                  >
                    <div className="w-7 h-7 rounded-full bg-white/5 flex items-center justify-center text-[11px] font-bold flex-shrink-0">
                      {u.name?.[0] ?? '?'}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm truncate">{u.name}</div>
                      <div className="text-[10px] text-white/30 truncate">{u.role.replace(/_/g, ' ')}</div>
                    </div>
                    {ghostUser?.id === u.id && <span className="text-[10px] text-amber-300">active</span>}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
