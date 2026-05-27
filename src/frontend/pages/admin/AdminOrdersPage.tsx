/**
 * PureGro Premium Cannabis Care - Admin Orders Page
 *
 * Admin order management dashboard with filters, quick actions
 * (confirm, ship, deliver), and POP review.
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { orders as ordersApi, type OrderData, type PopData } from '../../api';
import { formatRand } from '../../utils';

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  confirmed: 'bg-pg-green/15 text-pg-green-light border border-pg-green/25',
  processing: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  shipped: 'bg-blue-500/15 text-blue-400 border border-blue-500/25',
  delivered: 'bg-puregro-green/15 text-green-400 border border-puregro-green/25',
  cancelled: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

const PAYMENT_COLORS: Record<string, string> = {
  pending: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  paid: 'bg-puregro-green/15 text-green-400 border border-puregro-green/25',
  overdue: 'bg-red-500/15 text-red-400 border border-red-500/25',
  partial: 'bg-orange-500/15 text-orange-400 border border-orange-500/25',
};

function formatDate(d: string | number | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

export default function AdminOrdersPage() {
  const [orderList, setOrderList] = useState<OrderData[]>([]);
  const [total, setTotal] = useState(0);
  const [pendingPops, setPendingPops] = useState<PopData[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [paymentFilter, setPaymentFilter] = useState('');
  const [search, setSearch] = useState('');
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Ship modal state
  const [shipModal, setShipModal] = useState<{ orderId: string } | null>(null);
  const [courierName, setCourierName] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');

  // POP review modal state
  const [popReview, setPopReview] = useState<PopData | null>(null);
  const [popNotes, setPopNotes] = useState('');

  const fetchOrders = () => {
    setLoading(true);
    ordersApi
      .list({
        status: statusFilter || undefined,
        paymentStatus: paymentFilter || undefined,
        search: search || undefined,
        limit: 100,
      })
      .then(({ orders, total: t }) => {
        setOrderList(orders);
        setTotal(t);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  const fetchPendingPops = () => {
    ordersApi.pendingPops().then(({ pops }) => setPendingPops(pops)).catch(() => {});
  };

  useEffect(() => {
    fetchOrders();
    fetchPendingPops();
  }, [statusFilter, paymentFilter]);

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    fetchOrders();
  };

  const handleConfirm = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await ordersApi.confirm(orderId);
      fetchOrders();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleShip = async () => {
    if (!shipModal) return;
    setActionLoading(shipModal.orderId);
    try {
      await ordersApi.ship(shipModal.orderId, courierName, trackingNumber);
      setShipModal(null);
      setCourierName('');
      setTrackingNumber('');
      fetchOrders();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handleDeliver = async (orderId: string) => {
    setActionLoading(orderId);
    try {
      await ordersApi.deliver(orderId);
      fetchOrders();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  const handlePopReview = async (status: 'approved' | 'rejected') => {
    if (!popReview) return;
    setActionLoading(popReview.id);
    try {
      await ordersApi.reviewPop(popReview.orderId, popReview.id, status, popNotes || undefined);
      setPopReview(null);
      setPopNotes('');
      fetchOrders();
      fetchPendingPops();
    } catch { /* ignore */ }
    setActionLoading(null);
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">
          Orders
        </h1>
        {pendingPops.length > 0 && (
          <span className="rounded bg-pg-gold/15 px-3 py-1 text-xs font-semibold text-amber-400 border border-pg-gold/25">
            {pendingPops.length} POP{pendingPops.length !== 1 ? 's' : ''} pending review
          </span>
        )}
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="rounded border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-sm text-pg-gray-300 outline-none focus:border-pg-green/50"
        >
          <option value="">All Statuses</option>
          <option value="pending">Pending</option>
          <option value="confirmed">Confirmed</option>
          <option value="shipped">Shipped</option>
          <option value="delivered">Delivered</option>
          <option value="cancelled">Cancelled</option>
        </select>

        <select
          value={paymentFilter}
          onChange={(e) => setPaymentFilter(e.target.value)}
          className="rounded border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-sm text-pg-gray-300 outline-none focus:border-pg-green/50"
        >
          <option value="">All Payments</option>
          <option value="pending">Payment Pending</option>
          <option value="paid">Paid</option>
          <option value="overdue">Overdue</option>
        </select>

        <form onSubmit={handleSearch} className="flex gap-2">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search orders or clients..."
            className="rounded border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 text-sm text-pg-gray-300 outline-none placeholder:text-puregro-gray-600 focus:border-pg-green/50"
          />
          <button
            type="submit"
            className="rounded border border-white/[0.12] bg-white/[0.04] px-3 py-1.5 font-heading text-[10px] font-medium uppercase tracking-wider text-puregro-gray-400 hover:bg-white/[0.08]"
          >
            Search
          </button>
        </form>
      </div>

      {/* Pending POPs Section */}
      {pendingPops.length > 0 && (
        <div className="mb-6 rounded-lg border border-pg-gold/25 bg-pg-gold/5 p-4">
          <h2 className="mb-3 font-heading text-[11px] font-semibold uppercase tracking-[0.15em] text-amber-400">
            Pending POP Reviews
          </h2>
          <div className="space-y-2">
            {pendingPops.map((pop) => (
              <div key={pop.id} className="flex items-center justify-between rounded border border-white/[0.06] bg-pg-dark p-3">
                <div>
                  <p className="text-sm font-medium text-pg-white">
                    {pop.orderId} - {pop.clientName}
                  </p>
                  <p className="text-xs text-pg-gray-500">
                    {pop.fileName} - {pop.orderTotal ? formatRand(pop.orderTotal) : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={pop.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-1 font-heading text-[10px] font-medium uppercase tracking-wider text-puregro-gray-400 hover:bg-white/[0.08]"
                  >
                    View
                  </a>
                  <button
                    onClick={() => { setPopReview(pop); setPopNotes(''); }}
                    className="rounded border border-pg-green/25 bg-pg-green/15 px-2 py-1 font-heading text-[10px] font-medium uppercase tracking-wider text-pg-green-light hover:bg-pg-green/25"
                  >
                    Review
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Orders Table */}
      {loading ? (
        <div className="flex h-32 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
        </div>
      ) : orderList.length === 0 ? (
        <div className="rounded-lg border border-white/[0.06] bg-pg-dark p-8 text-center">
          <p className="text-sm text-pg-gray-500">No orders found.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-lg border border-white/[0.06] bg-pg-dark">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/[0.06]">
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Order</th>
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Client</th>
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Date</th>
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Status</th>
                <th className="px-3 py-3 text-left font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Payment</th>
                <th className="px-3 py-3 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Total</th>
                <th className="px-3 py-3 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.04]">
              {orderList.map((order) => (
                <tr key={order.id} className="transition-colors hover:bg-white/[0.02]">
                  <td className="px-3 py-3">
                    <Link to={`/orders/${order.id}`} className="font-medium text-pg-green-light hover:underline">
                      {order.id}
                    </Link>
                    {order.poNumber && (
                      <p className="text-[10px] text-puregro-gray-600">{order.poNumber}</p>
                    )}
                  </td>
                  <td className="px-3 py-3 text-pg-gray-300">
                    {order.clientName || order.clientId.slice(0, 8)}
                  </td>
                  <td className="px-3 py-3 text-puregro-gray-400">{formatDate(order.createdAt)}</td>
                  <td className="px-3 py-3">
                    <span className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[order.status] || 'bg-white/[0.06] text-pg-gray-500'}`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-3 py-3">
                    <span className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${PAYMENT_COLORS[order.paymentStatus] || 'bg-white/[0.06] text-pg-gray-500'}`}>
                      {order.paymentStatus}
                    </span>
                  </td>
                  <td className="px-3 py-3 text-right font-semibold text-pg-gold">
                    {formatRand(order.total || order.totalAmount)}
                  </td>
                  <td className="px-3 py-3 text-right">
                    <div className="flex items-center justify-end gap-1">
                      {order.status === 'pending' && (
                        <button
                          onClick={() => handleConfirm(order.id)}
                          disabled={actionLoading === order.id}
                          className="rounded border border-puregro-green/25 bg-puregro-green/10 px-2 py-1 font-heading text-[9px] font-semibold uppercase tracking-wider text-green-400 transition-all hover:bg-puregro-green/20 disabled:opacity-50"
                        >
                          Confirm
                        </button>
                      )}
                      {order.status === 'confirmed' && (
                        <button
                          onClick={() => { setShipModal({ orderId: order.id }); setCourierName(''); setTrackingNumber(''); }}
                          className="rounded border border-blue-500/25 bg-blue-500/10 px-2 py-1 font-heading text-[9px] font-semibold uppercase tracking-wider text-blue-400 transition-all hover:bg-blue-500/20"
                        >
                          Ship
                        </button>
                      )}
                      {order.status === 'shipped' && (
                        <button
                          onClick={() => handleDeliver(order.id)}
                          disabled={actionLoading === order.id}
                          className="rounded border border-puregro-green/25 bg-puregro-green/10 px-2 py-1 font-heading text-[9px] font-semibold uppercase tracking-wider text-green-400 transition-all hover:bg-puregro-green/20 disabled:opacity-50"
                        >
                          Delivered
                        </button>
                      )}
                      <Link
                        to={`/orders/${order.id}`}
                        className="rounded border border-white/[0.12] bg-white/[0.04] px-2 py-1 font-heading text-[9px] font-semibold uppercase tracking-wider text-puregro-gray-400 transition-all hover:bg-white/[0.08]"
                      >
                        View
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {total > orderList.length && (
            <div className="border-t border-white/[0.06] px-3 py-2 text-center text-xs text-pg-gray-500">
              Showing {orderList.length} of {total} orders
            </div>
          )}
        </div>
      )}

      {/* Ship Modal */}
      {shipModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-md rounded-lg border border-white/[0.1] bg-pg-dark p-6">
            <h3 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide text-pg-white">
              Ship Order {shipModal.orderId}
            </h3>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                  Courier Name
                </label>
                <input
                  type="text"
                  value={courierName}
                  onChange={(e) => setCourierName(e.target.value)}
                  placeholder="e.g. The Courier Guy"
                  className="w-full rounded border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-pg-gray-300 outline-none placeholder:text-puregro-gray-600 focus:border-pg-green/50"
                />
              </div>
              <div>
                <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                  Tracking Number
                </label>
                <input
                  type="text"
                  value={trackingNumber}
                  onChange={(e) => setTrackingNumber(e.target.value)}
                  placeholder="e.g. TCG123456789"
                  className="w-full rounded border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-pg-gray-300 outline-none placeholder:text-puregro-gray-600 focus:border-pg-green/50"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setShipModal(null)}
                className="rounded border border-white/[0.12] bg-white/[0.04] px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-puregro-gray-400 hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={handleShip}
                disabled={!courierName || actionLoading === shipModal.orderId}
                className="rounded border border-blue-500/25 bg-blue-500/15 px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-blue-400 hover:bg-blue-500/25 disabled:opacity-50"
              >
                {actionLoading === shipModal.orderId ? 'Shipping...' : 'Mark Shipped'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* POP Review Modal */}
      {popReview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60">
          <div className="w-full max-w-lg rounded-lg border border-white/[0.1] bg-pg-dark p-6">
            <h3 className="mb-4 font-heading text-lg font-bold uppercase tracking-wide text-pg-white">
              Review Proof of Payment
            </h3>
            <div className="mb-4 rounded border border-white/[0.06] bg-white/[0.02] p-3">
              <p className="text-sm text-pg-gray-300">
                Order: <span className="font-medium text-pg-white">{popReview.orderId}</span>
              </p>
              <p className="text-sm text-pg-gray-300">
                Client: <span className="font-medium text-pg-white">{popReview.clientName}</span>
              </p>
              {popReview.orderTotal && (
                <p className="text-sm text-pg-gray-300">
                  Amount: <span className="font-semibold text-pg-gold">{formatRand(popReview.orderTotal)}</span>
                </p>
              )}
              <p className="mt-2 text-xs text-pg-gray-500">File: {popReview.fileName}</p>
            </div>

            {/* Preview */}
            <div className="mb-4">
              {popReview.mimeType.startsWith('image/') ? (
                <img
                  src={popReview.filePath}
                  alt="POP"
                  className="max-h-64 w-full rounded border border-white/[0.06] object-contain"
                />
              ) : (
                <a
                  href={popReview.filePath}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block rounded border border-white/[0.06] bg-white/[0.02] p-4 text-center text-sm text-pg-green-light hover:underline"
                >
                  Open PDF in new tab
                </a>
              )}
            </div>

            <div className="mb-4">
              <label className="mb-1 block font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
                Admin Notes (optional)
              </label>
              <textarea
                value={popNotes}
                onChange={(e) => setPopNotes(e.target.value)}
                rows={2}
                className="w-full rounded border border-white/[0.12] bg-white/[0.04] px-3 py-2 text-sm text-pg-gray-300 outline-none placeholder:text-puregro-gray-600 focus:border-pg-green/50"
                placeholder="e.g. Amount matches, reference confirmed"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setPopReview(null)}
                className="rounded border border-white/[0.12] bg-white/[0.04] px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-puregro-gray-400 hover:bg-white/[0.08]"
              >
                Cancel
              </button>
              <button
                onClick={() => handlePopReview('rejected')}
                disabled={actionLoading === popReview.id}
                className="rounded border border-red-500/25 bg-red-500/15 px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-red-400 hover:bg-red-500/25 disabled:opacity-50"
              >
                Reject
              </button>
              <button
                onClick={() => handlePopReview('approved')}
                disabled={actionLoading === popReview.id}
                className="rounded border border-puregro-green/25 bg-puregro-green/15 px-4 py-2 font-heading text-[11px] font-medium uppercase tracking-wider text-green-400 hover:bg-puregro-green/25 disabled:opacity-50"
              >
                Approve
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
