/**
 * JIG Craft Cannabis - Orders Page
 *
 * Displays the client's order history with status and payment info.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { clients as clientsApi, type OrderData } from '../api';
import { formatRand, safeNum } from '../utils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-jig-amber/15 text-amber-400 border border-jig-amber/25',
  confirmed: 'bg-jig-purple/15 text-jig-purple-light border border-jig-purple/25',
  shipped: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  delivered: 'bg-jig-green/15 text-green-400 border border-jig-green/25',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-jig-amber/15 text-amber-400 border border-jig-amber/25',
  paid: 'bg-jig-green/15 text-green-400 border border-jig-green/25',
  overdue: 'bg-red-500/15 text-red-400 border border-red-500/25',
  partial: 'bg-orange-500/15 text-orange-400 border border-orange-500/25',
};

export default function OrdersPage() {
  const { client } = useAuth();
  const [orderList, setOrderList] = useState<OrderData[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    if (!client) return;
    clientsApi
      .orders(client.id, 50)
      .then(({ orders }) => setOrderList(orders))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [client]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-jig-gray-700 border-t-jig-purple" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <h1 className="mb-6 font-heading text-2xl font-bold uppercase tracking-wide text-jig-white">Orders</h1>

      {orderList.length === 0 ? (
        <div className="rounded-lg border border-white/[0.06] bg-jig-slate p-8 text-center">
          <p className="text-sm text-jig-gray-500">No orders yet.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {orderList.map((order) => (
            <div
              key={order.id}
              className="rounded-lg border border-white/[0.06] bg-jig-slate transition-all hover:border-white/[0.1]"
            >
              <button
                onClick={() => setExpanded(expanded === order.id ? null : order.id)}
                className="flex w-full items-center justify-between px-4 py-3 text-left"
              >
                <div className="flex items-center gap-4">
                  <div>
                    <p className="text-sm font-medium text-jig-white">
                      {order.id}
                    </p>
                    <p className="text-xs text-jig-gray-500">
                      {new Date(order.createdAt).toLocaleDateString('en-ZA', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${
                      STATUS_COLORS[order.status] || 'bg-white/[0.06] text-jig-gray-500'
                    }`}
                  >
                    {order.status}
                  </span>
                  <span
                    className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${
                      PAYMENT_COLORS[order.paymentStatus] || 'bg-white/[0.06] text-jig-gray-500'
                    }`}
                  >
                    {order.paymentStatus}
                  </span>
                  <span className="text-sm font-semibold text-jig-amber">
                    {formatRand(order.total)}
                  </span>
                  <Link
                    to={`/orders/${order.id}`}
                    onClick={(e) => e.stopPropagation()}
                    className="rounded border border-jig-purple/25 bg-jig-purple/10 px-2 py-0.5 font-heading text-[9px] font-semibold uppercase tracking-wider text-jig-purple-light hover:bg-jig-purple/20"
                  >
                    View
                  </Link>
                  <svg
                    className={`h-4 w-4 text-jig-gray-500 transition-transform ${
                      expanded === order.id ? 'rotate-180' : ''
                    }`}
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </button>

              {expanded === order.id && (
                <div className="border-t border-white/[0.06] px-4 py-3">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="text-left">
                        <th className="pb-2 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-jig-gray-500">Product</th>
                        <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-jig-gray-500">Qty</th>
                        <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-jig-gray-500">Unit Price</th>
                        <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-jig-gray-500">Line Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.04]">
                      {order.items.map((item, i) => (
                        <tr key={i}>
                          <td className="py-1.5 text-jig-gray-300">{item.name || item.productName}</td>
                          <td className="py-1.5 text-right text-jig-gray-300">{item.quantity}</td>
                          <td className="py-1.5 text-right text-jig-gray-300">
                            R{safeNum(item.unitPrice).toFixed(2)}
                          </td>
                          <td className="py-1.5 text-right font-medium text-jig-white">
                            R{safeNum(item.totalPrice || item.lineTotal).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="border-t border-white/[0.06]">
                      <tr>
                        <td colSpan={3} className="py-1.5 text-right text-xs text-jig-gray-500">
                          Subtotal
                        </td>
                        <td className="py-1.5 text-right text-sm text-jig-gray-300">
                          R{safeNum(order.subtotal).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="py-1.5 text-right text-xs text-jig-gray-500">
                          VAT (15%)
                        </td>
                        <td className="py-1.5 text-right text-sm text-jig-gray-300">
                          R{safeNum(order.vatAmount).toFixed(2)}
                        </td>
                      </tr>
                      <tr>
                        <td colSpan={3} className="py-1.5 text-right text-sm font-bold text-jig-white">
                          Total
                        </td>
                        <td className="py-1.5 text-right text-sm font-bold text-jig-amber">
                          R{safeNum(order.total).toFixed(2)}
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
