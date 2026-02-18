/**
 * JIG Craft Cannabis - Account Page
 *
 * Shows client profile, tier info, and tier progression.
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../auth';
import { intelligence } from '../api';
import { capitalize, formatRand, safeNum } from '../utils';

interface TierInfo {
  currentTier: string;
  lifetimeValue: number;
  nextTier: string | null;
  amountToNextTier: number;
}

const TIER_THRESHOLDS = [
  { tier: 'standard', min: 0, max: 100_000, color: 'bg-jig-gray-500' },
  { tier: 'silver', min: 100_000, max: 300_000, color: 'bg-jig-gray-300' },
  { tier: 'gold', min: 300_000, max: 750_000, color: 'bg-jig-amber' },
  { tier: 'platinum', min: 750_000, max: Infinity, color: 'bg-jig-purple' },
];

export default function AccountPage() {
  const { client } = useAuth();
  const [tierInfo, setTierInfo] = useState<TierInfo | null>(null);
  const [paymentInfo, setPaymentInfo] = useState<{
    reliability: number;
    avgDaysToPayment: number;
    overdueCount: number;
  } | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!client) return;
    Promise.all([
      intelligence.tier(client.id).catch(() => null),
      intelligence.paymentRisk(client.id).catch(() => null),
    ])
      .then(([tier, payment]) => {
        if (tier) setTierInfo(tier);
        if (payment) setPaymentInfo(payment);
      })
      .finally(() => setLoading(false));
  }, [client]);

  if (!client) return null;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-jig-gray-700 border-t-jig-purple" />
      </div>
    );
  }

  const currentThreshold = TIER_THRESHOLDS.find((t) => t.tier === client.tier);
  const progressPercent = currentThreshold
    ? Math.min(
        100,
        currentThreshold.max === Infinity
          ? 100
          : ((safeNum(client.lifetimeValue) - currentThreshold.min) /
              (currentThreshold.max - currentThreshold.min)) *
            100,
      )
    : 0;

  return (
    <div className="p-4 sm:p-6">
      <h1 className="mb-4 font-heading text-xl font-bold uppercase tracking-wide text-jig-white sm:mb-6 sm:text-2xl">Account</h1>

      <div className="grid gap-4 sm:gap-6 lg:grid-cols-2">
        {/* Profile card */}
        <div className="rounded-lg border border-white/[0.06] bg-jig-slate p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold uppercase tracking-wide text-jig-white">Profile</h2>
          <dl className="space-y-3 text-sm">
            {[
              ['Business Name', client.businessName],
              ['Contact', client.contactName],
              ['Email', client.email],
              ['Phone', client.phone],
              ['Location', `${client.city}, ${client.province}`],
              ['Member Since', new Date(client.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long' })],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between">
                <dt className="text-jig-gray-500">{label}</dt>
                <dd className="font-medium text-jig-white">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        {/* Tier card */}
        <div className="rounded-lg border border-white/[0.06] bg-jig-slate p-6">
          <h2 className="mb-4 font-heading text-lg font-semibold uppercase tracking-wide text-jig-white">Tier Status</h2>

          <div className="mb-6 text-center">
            <span
              className={`inline-block rounded px-4 py-1.5 font-heading text-sm font-bold uppercase tracking-wider tier-${client.tier}`}
            >
              {capitalize(client.tier)}
            </span>
          </div>

          <div className="mb-2 flex justify-between text-xs text-jig-gray-500">
            <span>{formatRand(currentThreshold?.min ?? 0)}</span>
            <span>
              {currentThreshold?.max === Infinity
                ? 'No limit'
                : formatRand(currentThreshold?.max ?? 0)}
            </span>
          </div>

          <div className="mb-4 h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div
              className={`h-full rounded-full transition-all ${currentThreshold?.color || 'bg-jig-gray-500'}`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-jig-gray-500">Lifetime Value</span>
              <span className="font-medium text-jig-amber">
                {formatRand(client.lifetimeValue)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-jig-gray-500">Total Orders</span>
              <span className="font-medium text-jig-white">{safeNum(client.totalOrders)}</span>
            </div>
            {tierInfo?.nextTier && (
              <div className="flex justify-between">
                <span className="text-jig-gray-500">
                  To reach {capitalize(tierInfo.nextTier)}
                </span>
                <span className="font-medium text-jig-purple-light">
                  {formatRand(tierInfo.amountToNextTier)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Payment reliability */}
        {paymentInfo && (
          <div className="rounded-lg border border-white/[0.06] bg-jig-slate p-6 lg:col-span-2">
            <h2 className="mb-4 font-heading text-lg font-semibold uppercase tracking-wide text-jig-white">Payment Record</h2>
            <div className="grid grid-cols-1 gap-4 xs:grid-cols-3">
              <div className="text-center">
                <p className="text-2xl font-bold text-jig-white">
                  {Math.round(safeNum(paymentInfo.reliability) * 100)}%
                </p>
                <p className="text-xs text-jig-gray-500">On-time Payment Rate</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold text-jig-white">
                  {safeNum(paymentInfo.avgDaysToPayment).toFixed(1)}
                </p>
                <p className="text-xs text-jig-gray-500">Avg Days to Payment</p>
              </div>
              <div className="text-center">
                <p
                  className={`text-2xl font-bold ${
                    safeNum(paymentInfo.overdueCount) > 0 ? 'text-red-400' : 'text-green-400'
                  }`}
                >
                  {safeNum(paymentInfo.overdueCount)}
                </p>
                <p className="text-xs text-jig-gray-500">Overdue Invoices</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
