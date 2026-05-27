/**
 * PureGro Premium Cannabis Care - Admin Client List
 *
 * Full client list with search, status filter, and churn risk indicators.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { clients as clientsApi, type ClientData } from '../../api';
import { capitalize, formatRand, safeNum } from '../../utils';

export default function AdminClientsPage() {
  const [clientList, setClientList] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    clientsApi
      .list({ status: statusFilter || undefined, limit: 100 })
      .then(({ clients }) => setClientList(clients))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [statusFilter]);

  const filtered = clientList.filter((c) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (c.businessName || '').toLowerCase().includes(q) ||
      (c.contactName || '').toLowerCase().includes(q) ||
      (c.email || '').toLowerCase().includes(q) ||
      (c.city || '').toLowerCase().includes(q)
    );
  });

  return (
    <div className="p-6">
      <h1 className="mb-6 font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">Clients</h1>

      <div className="mb-6 flex items-center gap-4">
        <input
          type="text"
          placeholder="Search clients..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-64 rounded border border-white/[0.1] bg-pg-gray-900 px-3.5 py-2 text-sm text-pg-white outline-none transition-all placeholder:text-pg-gray-700 focus:border-pg-green focus:ring-2 focus:ring-pg-green/15"
        />
        <div className="flex gap-2">
          {['', 'active', 'pending', 'suspended'].map((status) => (
            <button
              key={status}
              onClick={() => setStatusFilter(status)}
              className={`rounded px-3 py-1.5 font-heading text-[11px] font-medium uppercase tracking-wider transition-all ${
                statusFilter === status
                  ? 'bg-pg-green text-pg-white'
                  : 'border border-white/[0.1] bg-white/[0.04] text-pg-gray-500 hover:border-white/[0.2] hover:text-pg-white'
              }`}
            >
              {status || 'All'}
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
                {['Business', 'Contact', 'Location', 'Tier', 'Orders', 'Lifetime Value', 'Status'].map((h) => (
                  <th key={h} className="px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {filtered.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/clients/${c.id}`}
                      className="font-medium text-pg-green hover:text-pg-green-light"
                    >
                      {c.businessName}
                    </Link>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-pg-gray-300">{c.contactName}</div>
                    <div className="text-xs text-pg-gray-500">{c.email}</div>
                  </td>
                  <td className="px-4 py-3 text-pg-gray-300">
                    {c.city}, {c.province}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider tier-${c.tier}`}>
                      {capitalize(c.tier)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-pg-gray-300">{safeNum(c.totalOrders)}</td>
                  <td className="px-4 py-3 text-pg-gold">{formatRand(c.lifetimeValue)}</td>
                  <td className="px-4 py-3">
                    <span className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider status-${c.status}`}>
                      {c.status}
                    </span>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-sm text-pg-gray-500">
                    No clients match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      <p className="mt-4 text-xs text-pg-gray-500">
        Showing {filtered.length} of {clientList.length} clients
      </p>
    </div>
  );
}
