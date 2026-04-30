import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { TicketCheck, ArrowRight, AlertTriangle } from 'lucide-react';
import api from '../../../services/api';

const PRIORITY_DOT: Record<string, string> = {
  CRITICAL: 'bg-red-500', HIGH: 'bg-amber-500', MEDIUM: 'bg-blue-500', LOW: 'bg-white/30',
};

export default function TicketsWidget() {
  const { data: tickets } = useQuery({
    queryKey: ['tickets', ''],
    queryFn: () => api.get('/baygrid/tickets').then(r => r.data.tickets),
  });

  const openTickets = tickets?.filter((t: any) => t.status !== 'COMPLETED' && t.status !== 'CLOSED') || [];
  const critical = openTickets.filter((t: any) => t.priority === 'CRITICAL');

  return (
    <div className={`rounded-xl border p-4 sm:p-5 ${critical.length > 0 ? 'bg-red-500/5 border-red-500/20' : 'bg-white/5 border-white/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <TicketCheck size={16} className={critical.length > 0 ? 'text-red-400' : 'text-primary'} />
          <h2 className="text-sm font-semibold text-white/60">Open Tickets</h2>
          {openTickets.length > 0 && (
            <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${critical.length > 0 ? 'bg-red-500 text-white' : 'bg-white/10 text-white/50'}`}>
              {openTickets.length}
            </span>
          )}
        </div>
        <Link to="/tickets" className="text-xs text-primary flex items-center gap-1 hover:text-primary-light">
          View All <ArrowRight size={12} />
        </Link>
      </div>

      {!openTickets.length ? (
        <p className="text-white/30 text-sm">No open tickets</p>
      ) : (
        <div className="space-y-1.5">
          {openTickets.slice(0, 5).map((t: any) => (
            <Link key={t.id} to="/tickets" className="flex items-center gap-2.5 py-1.5 text-sm hover:bg-white/5 -mx-2 px-2 rounded-lg transition">
              <div className={`w-2 h-2 rounded-full flex-shrink-0 ${PRIORITY_DOT[t.priority]}`} />
              <span className="text-white/80 truncate flex-1">{t.title}</span>
              <span className="text-xs text-white/20 flex-shrink-0">{t.category}</span>
            </Link>
          ))}
          {openTickets.length > 5 && (
            <p className="text-xs text-white/30 pt-1">+{openTickets.length - 5} more</p>
          )}
        </div>
      )}
    </div>
  );
}
