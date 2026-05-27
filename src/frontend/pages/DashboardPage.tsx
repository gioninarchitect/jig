/**
 * PureGro Premium Cannabis Care - Dashboard
 *
 * Admin: overview of client base, churn risks, recent interventions.
 * Client: personal summary, order stats, recommendations.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { intelligence, clients as clientsApi, type ClientData } from '../api';
import { capitalize, formatRand, safeNum } from '../utils';

export default function DashboardPage() {
  const { client, isAdmin } = useAuth();

  if (isAdmin) return <AdminDashboard />;
  return <ClientDashboard clientId={client!.id} />;
}

// -- Client Dashboard --

function ClientDashboard({ clientId }: { clientId: string }) {
  const [summary, setSummary] = useState<{
    healthScore: number;
    tier: string;
    lifetimeValue: number;
    avgOrderValue: number;
    totalOrders: number;
    lastOrderDaysAgo: number;
    recommendations: string[];
    restockPredictions: { productName: string; predictedDate: string; confidence: number }[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    intelligence
      .summary(clientId)
      .then(setSummary)
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [clientId]);

  if (loading) return <PageLoader />;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide text-pg-white sm:mb-6 sm:text-2xl">
        Dashboard
      </h1>

      {summary && (
        <>
          <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-4 sm:mb-8">
            <StatCard label="Health Score" value={`${safeNum(summary.healthScore)}/100`} accent />
            <StatCard label="Tier" value={capitalize(summary.tier)} />
            <StatCard label="Total Orders" value={String(safeNum(summary.totalOrders))} />
            <StatCard label="Avg Order Value" value={formatRand(summary.avgOrderValue)} />
          </div>

          {summary.restockPredictions?.length > 0 && (
            <Section title="Restock Predictions">
              <div className="space-y-2">
                {summary.restockPredictions.map((p) => (
                  <div
                    key={p.productName}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-pg-dark px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-medium text-pg-white">{p.productName}</p>
                      <p className="text-xs text-pg-gray-500">
                        Predicted restock: {new Date(p.predictedDate).toLocaleDateString('en-ZA')}
                      </p>
                    </div>
                    <span className="text-xs text-pg-gray-500">
                      {Math.round(p.confidence * 100)}% confidence
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {summary.recommendations?.length > 0 && (
            <Section title="Recommendations">
              <ul className="space-y-2">
                {summary.recommendations.map((rec, i) => (
                  <li
                    key={i}
                    className="rounded-lg border border-white/[0.06] bg-pg-dark px-4 py-3 text-sm text-pg-gray-300"
                  >
                    {rec}
                  </li>
                ))}
              </ul>
            </Section>
          )}

          <div className="mt-6 flex flex-col gap-3 sm:mt-8 sm:flex-row sm:gap-4">
            <Link
              to="/catalog"
              className="rounded bg-pg-gradient px-6 py-2.5 text-center font-heading text-[13px] font-semibold uppercase tracking-[0.08em] text-pg-white transition-all hover:-translate-y-0.5 hover:shadow-pg-glow"
            >
              Browse Catalog
            </Link>
            <Link
              to="/orders"
              className="rounded border border-white/[0.15] bg-white/[0.04] px-6 py-2.5 text-center font-heading text-[13px] font-semibold uppercase tracking-[0.08em] text-pg-white transition-all hover:border-white/[0.3] hover:bg-white/[0.08]"
            >
              View Orders
            </Link>
          </div>
        </>
      )}

      {!summary && (
        <p className="text-sm text-pg-gray-500">
          Welcome to PureGro. Place your first order to see intelligence insights here.
        </p>
      )}
    </div>
  );
}

// -- Admin Dashboard --

function AdminDashboard() {
  const [clientList, setClientList] = useState<ClientData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    clientsApi
      .list({ limit: 20 })
      .then(({ clients }) => setClientList(clients))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <PageLoader />;

  const activeClients = clientList.filter((c) => c.status === 'active');
  const totalRevenue = clientList.reduce((sum, c) => sum + safeNum(c.lifetimeValue), 0);

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide text-pg-white sm:mb-6 sm:text-2xl">
        Admin Dashboard
      </h1>

      <div className="mb-6 grid grid-cols-1 gap-3 xs:grid-cols-2 sm:gap-4 lg:grid-cols-4 sm:mb-8">
        <StatCard label="Total Clients" value={String(clientList.length)} />
        <StatCard label="Active Clients" value={String(activeClients.length)} accent />
        <StatCard label="Total Revenue" value={formatRand(totalRevenue)} />
        <StatCard
          label="Avg Lifetime Value"
          value={clientList.length > 0 ? formatRand(totalRevenue / clientList.length) : 'R0.00'}
        />
      </div>

      <Section title="Clients">
        <div className="-mx-4 overflow-x-auto sm:mx-0">
        <div className="min-w-[600px] overflow-hidden rounded-lg border border-white/[0.06] bg-pg-dark sm:min-w-0">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/[0.06]">
              <tr>
                <th className="px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Business</th>
                <th className="px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Tier</th>
                <th className="px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Orders</th>
                <th className="px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Lifetime Value</th>
                <th className="px-4 py-3 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {clientList.map((c) => (
                <tr key={c.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <Link
                      to={`/admin/clients/${c.id}`}
                      className="font-medium text-pg-green hover:text-pg-green-light"
                    >
                      {c.businessName}
                    </Link>
                    <p className="text-xs text-pg-gray-500">{c.contactName}</p>
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
            </tbody>
          </table>
        </div>
        </div>
        <div className="mt-4">
          <Link
            to="/admin/clients"
            className="text-sm font-medium text-pg-green hover:text-pg-green-light"
          >
            View all clients
          </Link>
        </div>
      </Section>
    </div>
  );
}

// -- Shared Components --

function StatCard({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-pg-dark p-4 transition-all hover:border-pg-green/25">
      <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">{label}</p>
      <p className={`mt-1 text-xl font-bold ${accent ? 'text-pg-gradient' : 'text-pg-white'}`}>
        {value}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-4 font-heading text-lg font-semibold uppercase tracking-wide text-pg-white">{title}</h2>
      {children}
    </div>
  );
}

function PageLoader() {
  return (
    <div className="flex h-64 items-center justify-center">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
    </div>
  );
}
