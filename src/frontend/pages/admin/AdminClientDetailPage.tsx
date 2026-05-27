/**
 * PureGro Premium Cannabis Care - Admin Client Intelligence Detail
 *
 * Full HEADCASE EVOLVE intelligence view for a single client.
 */

import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  intelligence,
  clients as clientsApi,
  type ClientData,
  type IntelligenceSummary,
  type PatternData,
  type InterventionData,
  type EventLogEntry,
} from '../../api';
import { capitalize, formatRand, safeNum } from '../../utils';

export default function AdminClientDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientData | null>(null);
  const [summary, setSummary] = useState<IntelligenceSummary | null>(null);
  const [churnData, setChurnData] = useState<{
    risk: string;
    score: number;
    factors: Record<string, number>;
  } | null>(null);
  const [events, setEvents] = useState<EventLogEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;

    Promise.all([
      clientsApi.getById(id),
      intelligence.summary(id).catch(() => null),
      intelligence.churn(id).catch(() => null),
      clientsApi.events(id, 20).catch(() => ({ events: [] })),
    ])
      .then(([clientRes, summaryRes, churnRes, eventsRes]) => {
        setClient(clientRes.client);
        if (summaryRes) setSummary(summaryRes);
        if (churnRes) setChurnData(churnRes);
        setEvents(eventsRes.events);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="p-6">
        <p className="text-sm text-pg-gray-500">Client not found.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-start justify-between">
        <div>
          <Link
            to="/admin/clients"
            className="mb-2 inline-block text-xs text-pg-gray-500 transition-colors hover:text-pg-green"
          >
            &larr; Back to Clients
          </Link>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">{client.businessName}</h1>
          <p className="text-sm text-pg-gray-500">
            {client.contactName} &middot; {client.email} &middot; {client.city},{' '}
            {client.province}
          </p>
        </div>
        <span className={`rounded px-3 py-1 font-heading text-sm font-bold uppercase tracking-wider tier-${client.tier}`}>
          {capitalize(client.tier)}
        </span>
      </div>

      {summary && (
        <>
          {/* Top-level metrics */}
          <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-5">
            <MetricCard
              label="Health Score"
              value={`${safeNum(summary.healthScore)}`}
              subtext="/100"
              color={
                safeNum(summary.healthScore) >= 70
                  ? 'text-green-400'
                  : safeNum(summary.healthScore) >= 40
                    ? 'text-amber-400'
                    : 'text-red-400'
              }
            />
            <MetricCard
              label="Churn Risk"
              value={summary.churnRisk || 'N/A'}
              badge={summary.churnRisk ? `badge-${summary.churnRisk}` : undefined}
            />
            <MetricCard label="Total Orders" value={String(safeNum(summary.totalOrders))} />
            <MetricCard label="Avg Order Value" value={formatRand(summary.avgOrderValue)} />
            <MetricCard
              label="Order Frequency"
              value={`${safeNum(summary.orderFrequencyDays)}d`}
              subtext="avg interval"
            />
          </div>

          {/* Churn Factors */}
          {churnData && (
            <Section title={`Churn Analysis (Score: ${safeNum(churnData.score)}/100)`}>
              <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                {Object.entries(churnData.factors).map(([factor, score]) => (
                  <div
                    key={factor}
                    className="rounded-lg border border-white/[0.06] bg-pg-dark p-3"
                  >
                    <p className="text-xs text-pg-gray-500">{formatFactorName(factor)}</p>
                    <div className="mt-1 flex items-center gap-2">
                      <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/[0.06]">
                        <div
                          className={`h-full rounded-full ${
                            score > 15
                              ? 'bg-red-500'
                              : score > 8
                                ? 'bg-amber-500'
                                : 'bg-green-500'
                          }`}
                          style={{ width: `${Math.min(100, score * 2.5)}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-pg-gray-300">
                        {score.toFixed(1)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Restock Predictions */}
          {summary.restockPredictions.length > 0 && (
            <Section title="Restock Predictions">
              <div className="overflow-hidden rounded-lg border border-white/[0.06] bg-pg-dark">
                <table className="w-full text-left text-sm">
                  <thead className="border-b border-white/[0.06]">
                    <tr>
                      {['Product', 'Predicted Date', 'Avg Interval', 'Confidence'].map((h) => (
                        <th key={h} className="px-4 py-2 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/[0.04]">
                    {summary.restockPredictions.map((p) => (
                      <tr key={p.productId}>
                        <td className="px-4 py-2 text-pg-white">{p.productName}</td>
                        <td className="px-4 py-2 text-pg-gray-300">
                          {new Date(p.predictedDate).toLocaleDateString('en-ZA')}
                        </td>
                        <td className="px-4 py-2 text-pg-gray-300">{p.avgInterval}d</td>
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            <div className="h-2 w-16 overflow-hidden rounded-full bg-white/[0.06]">
                              <div
                                className="h-full rounded-full bg-puregro-green"
                                style={{ width: `${p.confidence * 100}%` }}
                              />
                            </div>
                            <span className="text-xs text-pg-gray-500">
                              {Math.round(p.confidence * 100)}%
                            </span>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>
          )}

          {/* Detected Patterns */}
          {summary.patterns.length > 0 && (
            <Section title="Detected Patterns">
              <div className="space-y-2">
                {summary.patterns.map((p: PatternData) => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-pg-dark px-4 py-3"
                  >
                    <div>
                      <span className="mr-2 rounded bg-pg-green/15 px-2 py-0.5 text-xs font-medium text-pg-green-light">
                        {p.patternType}
                      </span>
                      <span className="text-sm text-pg-gray-300">{p.description}</span>
                    </div>
                    <span className="text-xs text-pg-gray-500">
                      {Math.round(p.confidence * 100)}% &middot;{' '}
                      {new Date(p.detectedAt).toLocaleDateString('en-ZA')}
                    </span>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Active Interventions */}
          {summary.activeInterventions.length > 0 && (
            <Section title="Active Interventions">
              <div className="space-y-2">
                {summary.activeInterventions.map((int: InterventionData) => (
                  <div
                    key={int.id}
                    className="rounded-lg border border-white/[0.06] bg-pg-dark px-4 py-3"
                  >
                    <div className="flex items-center gap-2">
                      <span
                        className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${
                          int.priority === 'critical'
                            ? 'badge-critical'
                            : int.priority === 'high'
                              ? 'badge-high'
                              : int.priority === 'medium'
                                ? 'badge-medium'
                                : 'badge-low'
                        }`}
                      >
                        {int.priority}
                      </span>
                      <span className="text-sm font-medium text-pg-white">{int.type}</span>
                    </div>
                    <p className="mt-1 text-xs text-pg-gray-500">
                      Trigger: {int.trigger} &middot; Action: {int.action}
                    </p>
                  </div>
                ))}
              </div>
            </Section>
          )}

          {/* Recommendations */}
          {summary.recommendations.length > 0 && (
            <Section title="AI Recommendations">
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
        </>
      )}

      {/* Event Log */}
      {events.length > 0 && (
        <Section title="Recent Events">
          <div className="space-y-1">
            {events.map((evt: EventLogEntry) => (
              <div
                key={evt.id}
                className="flex items-center justify-between rounded-lg px-4 py-2 text-sm transition-colors hover:bg-white/[0.02]"
              >
                <div className="flex items-center gap-3">
                  <span className="rounded bg-pg-green/15 px-2 py-0.5 font-mono text-xs text-pg-green-light">
                    {evt.eventType}
                  </span>
                  <span className="text-pg-gray-500">
                    {JSON.stringify(evt.payload).slice(0, 80)}
                    {JSON.stringify(evt.payload).length > 80 ? '...' : ''}
                  </span>
                </div>
                <span className="text-xs text-pg-gray-500">
                  {new Date(evt.createdAt).toLocaleString('en-ZA')}
                </span>
              </div>
            ))}
          </div>
        </Section>
      )}
    </div>
  );
}

// -- Helpers --

function MetricCard({
  label,
  value,
  subtext,
  color,
  badge,
}: {
  label: string;
  value: string;
  subtext?: string;
  color?: string;
  badge?: string;
}) {
  return (
    <div className="rounded-lg border border-white/[0.06] bg-pg-dark p-4 transition-all hover:border-pg-green/25">
      <p className="font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">{label}</p>
      {badge ? (
        <span className={`mt-1 inline-block rounded px-2 py-0.5 font-heading text-sm font-bold uppercase tracking-wider ${badge}`}>
          {value}
        </span>
      ) : (
        <p className={`mt-1 text-xl font-bold ${color || 'text-pg-white'}`}>
          {value}
          {subtext && (
            <span className="ml-0.5 text-sm font-normal text-pg-gray-500">{subtext}</span>
          )}
        </p>
      )}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-8">
      <h2 className="mb-3 font-heading text-lg font-semibold uppercase tracking-wide text-pg-white">{title}</h2>
      {children}
    </div>
  );
}

function formatFactorName(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (c) => c.toUpperCase())
    .trim();
}
