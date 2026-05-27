import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// =====================================================================
// Ghost Mode store
//
//   ghostUser   — the user being viewed-as (null when off)
//   actAsMode   — when true, writes are ALLOWED but recorded as
//                 "real-actor acting as ghost-target" in AuditLog
//
// Default: read-only ghost. Owner explicitly escalates to act-as via
// the GhostBanner confirm modal.
// =====================================================================

export interface GhostUser {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface GhostState {
  ghostUser: GhostUser | null;
  isGhost: boolean;
  actAsMode: boolean;
  setGhost: (u: GhostUser) => void;
  enableActAs: () => void;
  disableActAs: () => void;
  exitGhost: () => void;
}

export const useGhostStore = create<GhostState>()(
  persist(
    (set) => ({
      ghostUser: null,
      isGhost: false,
      actAsMode: false,
      setGhost: (u) => set({ ghostUser: u, isGhost: true, actAsMode: false }),
      enableActAs: () => set({ actAsMode: true }),
      disableActAs: () => set({ actAsMode: false }),
      exitGhost: () => set({ ghostUser: null, isGhost: false, actAsMode: false }),
    }),
    { name: 'tnt-ghost' },
  ),
);

// Ghost-allowed emails — must match backend GHOST_ALLOWED_EMAILS exactly
export const GHOST_ALLOWED_EMAILS = [
  'florisolivier7@gmail.com',
  'ilse@ilcofarming.co.za',
  'coenie@ilcofarming.co.za',
] as const;

export function canGhost(email?: string | null): boolean {
  if (!email) return false;
  return (GHOST_ALLOWED_EMAILS as readonly string[]).includes(email);
}
