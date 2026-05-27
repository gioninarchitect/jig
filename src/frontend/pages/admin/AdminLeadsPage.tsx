/**
 * PureGro Premium Cannabis Care - Admin Leads Page
 *
 * Lead pipeline with tier and status filters.
 */

import { useState, useEffect } from 'react';
import { leads as leadsApi, type LeadData } from '../../api';

const TIER_COLORS: Record<string, string> = {
  A: 'bg-puregro-green/15 text-green-400 border border-puregro-green/25',
  B: 'bg-pg-green/15 text-pg-green-light border border-pg-green/25',
  C: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  D: 'bg-white/[0.06] text-pg-gray-500 border border-white/[0.1]',
};

const STATUS_COLORS: Record<string, string> = {
  new: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  contacted: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  qualified: 'bg-puregro-green/15 text-green-400 border border-puregro-green/25',
  converted: 'bg-pg-gradient text-pg-white',
  lost: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

export default function AdminLeadsPage() {
  const [leadList, setLeadList] = useState<LeadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [tierFilter, setTierFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  useEffect(() => {
    leadsApi
      .list({
        tier: tierFilter || undefined,
        status: statusFilter || undefined,
      })
      .then(({ leads }) => setLeadList(leads))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [tierFilter, statusFilter]);

  return (
    <div className="p-6">
      <h1 className="mb-6 font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">Lead Pipeline</h1>

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <div className="flex items-center gap-2">
          <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Tier:</span>
          {['', 'A', 'B', 'C', 'D'].map((t) => (
            <button
              key={t}
              onClick={() => setTierFilter(t)}
              className={`rounded px-3 py-1.5 font-heading text-[11px] font-medium uppercase tracking-wider transition-all ${
                tierFilter === t
                  ? 'bg-pg-green text-pg-white'
                  : 'border border-white/[0.1] bg-white/[0.04] text-pg-gray-500 hover:border-white/[0.2] hover:text-pg-white'
              }`}
            >
              {t || 'All'}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <span className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Status:</span>
          {['', 'new', 'contacted', 'qualified', 'converted', 'lost'].map((s) => (
            <button
              key={s}
              onClick={() => setStatusFilter(s)}
              className={`rounded px-3 py-1.5 font-heading text-[11px] font-medium uppercase tracking-wider transition-all ${
                statusFilter === s
                  ? 'bg-pg-green text-pg-white'
                  : 'border border-white/[0.1] bg-white/[0.04] text-pg-gray-500 hover:border-white/[0.2] hover:text-pg-white'
              }`}
            >
              {s || 'All'}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
        </div>
      ) : (
        <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-pg-dark">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr>
                {['Business', 'Contact', 'Location', 'Tier', 'Status', 'Notes', 'Added'].map((h) => (
                  <th key={h} className="px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {leadList.map((lead) => (
                <tr key={lead.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3 font-medium text-pg-white">
                    {lead.businessName}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-pg-gray-300">{lead.contactName}</div>
                    <div className="text-xs text-pg-gray-500">{lead.email}</div>
                    <div className="text-xs text-pg-gray-500">{lead.phone}</div>
                  </td>
                  <td className="px-4 py-3 text-pg-gray-300">
                    {lead.city}, {lead.province}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 font-heading text-[10px] font-bold uppercase tracking-wider ${
                        TIER_COLORS[lead.estimatedTier] || 'bg-white/[0.06] text-pg-gray-500'
                      }`}
                    >
                      {lead.estimatedTier}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 font-heading text-[10px] font-medium uppercase tracking-wider ${
                        STATUS_COLORS[lead.status] || 'bg-white/[0.06] text-pg-gray-500'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-pg-gray-500">
                    {lead.notes}
                  </td>
                  <td className="px-4 py-3 text-xs text-pg-gray-500">
                    {new Date(lead.createdAt).toLocaleDateString('en-ZA')}
                  </td>
                </tr>
              ))}
              {leadList.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-pg-gray-500">
                    No leads match your filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-pg-gray-500">
        {leadList.length} lead{leadList.length !== 1 ? 's' : ''}
      </p>
    </div>
  );
}
