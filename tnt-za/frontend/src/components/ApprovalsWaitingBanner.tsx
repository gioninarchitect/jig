import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { ArrowRight, FileSignature, Inbox, Stamp } from 'lucide-react';
import api from '../services/api';

// =====================================================================
// ApprovalsWaitingBanner — role-aware "you have N items to action"
//
// Renders only when the current user has actionable items waiting.
// Computes the right slice per role:
//   • RESPONSIBLE_PHARMACIST  → RP sign-offs pending
//   • TENANT_ADMIN/SUPER_ADMIN → final approvals pending
//   • FACILITY_MANAGER / HEAD_OF_CULTIVATION / PROCESSING_MANAGER
//                              → tickets unassigned in their domain
//
// Drop into any dashboard — banner self-suppresses when there's nothing.
// =====================================================================

type Slice = {
  count: number;
  title: string;
  subtitle: string;
  icon: any;
  to: string;
};

export default function ApprovalsWaitingBanner() {
  const { user } = useAuth();
  const role = user?.role;

  const { data: tickets } = useQuery({
    queryKey: ['tickets', ''],
    queryFn: () => api.get('/baygrid/tickets').then(r => r.data.tickets),
  });

  if (!tickets || !role) return null;

  const open = tickets.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED');

  // Determine the slice this user is responsible for
  let slice: Slice | null = null;

  if (role === 'RESPONSIBLE_PHARMACIST') {
    const rpPending = open.filter((t: any) => t.ticketType === 'RP_SIGNOFF' && !t.rpSignedAt);
    if (rpPending.length > 0) {
      slice = {
        count: rpPending.length,
        title: `${rpPending.length} RP sign-off${rpPending.length > 1 ? 's' : ''} pending`,
        subtitle: 'Batches, packets, deviations awaiting your sign-off',
        icon: Stamp,
        to: '/responsible-pharmacist',
      };
    }
  } else if (role === 'TENANT_ADMIN' || role === 'SUPER_ADMIN') {
    const finalPending = open.filter((t: any) =>
      (t.ticketType === 'REQUISITION' || t.ticketType === 'APPROVAL') && !t.approvedAt,
    );
    if (finalPending.length > 0) {
      slice = {
        count: finalPending.length,
        title: `${finalPending.length} approval${finalPending.length > 1 ? 's' : ''} waiting`,
        subtitle: 'Requisitions + compliance docs need your sign-off',
        icon: FileSignature,
        to: '/tickets',
      };
    }
  } else if (
    role === 'FACILITY_MANAGER' ||
    role === 'HEAD_OF_CULTIVATION' ||
    role === 'PROCESSING_MANAGER'
  ) {
    const unassigned = open.filter((t: any) => !t.assignedToId);
    if (unassigned.length > 0) {
      slice = {
        count: unassigned.length,
        title: `${unassigned.length} ticket${unassigned.length > 1 ? 's' : ''} need assignment`,
        subtitle: 'Route these to the right team member',
        icon: Inbox,
        to: '/tickets',
      };
    }
  }

  if (!slice) return null;

  return (
    <Link
      to={slice.to}
      className="block bg-primary/5 border border-primary/20 rounded-xl p-4 hover:bg-primary/10 transition"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
            <slice.icon size={16} className="text-primary" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-semibold text-primary truncate">{slice.title}</div>
            <div className="text-xs text-white/30 truncate">{slice.subtitle}</div>
          </div>
        </div>
        <ArrowRight size={16} className="text-primary flex-shrink-0" />
      </div>
    </Link>
  );
}
