/**
 * PureGro Premium Cannabis Care - Order Detail Page
 *
 * Full order detail with status timeline, line items, delivery info,
 * PO/Invoice numbers, POP upload, and POP status list.
 */

import { useState, useEffect, useRef } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { orders as ordersApi, type OrderData, type PopData } from '../api';
import { formatRand, safeNum } from '../utils';

const STATUS_STEPS = ['pending', 'confirmed', 'shipped', 'delivered'] as const;

const STATUS_COLORS: Record<string, string> = {
  pending: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  confirmed: 'bg-pg-green/15 text-pg-green-light border border-pg-green/25',
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

const POP_COLORS: Record<string, string> = {
  pending: 'bg-pg-gold/15 text-amber-400 border border-pg-gold/25',
  approved: 'bg-puregro-green/15 text-green-400 border border-puregro-green/25',
  rejected: 'bg-red-500/15 text-red-400 border border-red-500/25',
};

function formatDate(d: string | number | undefined): string {
  if (!d) return '-';
  return new Date(d).toLocaleDateString('en-ZA', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAdmin } = useAuth();
  const [order, setOrder] = useState<OrderData | null>(null);
  const [pops, setPops] = useState<PopData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!id) return;
    Promise.all([
      ordersApi.getById(id).then(({ order: o }) => setOrder(o)),
      ordersApi.getPops(id).then(({ pops: p }) => setPops(p)),
    ])
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [id]);

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file || !id) return;

    setUploading(true);
    setUploadError('');
    try {
      const { pop } = await ordersApi.uploadPop(id, file);
      setPops((prev) => [pop, ...prev]);
      if (fileRef.current) fileRef.current.value = '';
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-6 w-6 animate-spin rounded-full border-2 border-pg-gray-700 border-t-pg-green" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="p-6">
        <p className="text-sm text-pg-gray-500">Order not found.</p>
      </div>
    );
  }

  const currentStep = STATUS_STEPS.indexOf(order.status as typeof STATUS_STEPS[number]);

  return (
    <div className="p-6">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div>
          <Link to="/orders" className="mb-2 inline-block text-xs text-pg-green hover:underline">
            &larr; Back to Orders
          </Link>
          <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-pg-white">
            Order {order.id}
          </h1>
          <div className="mt-1 flex items-center gap-3">
            {order.poNumber && (
              <span className="text-xs text-pg-gray-500">PO: {order.poNumber}</span>
            )}
            {order.invoiceNumber && (
              <span className="text-xs text-pg-gray-500">Invoice: {order.invoiceNumber}</span>
            )}
          </div>
        </div>
        <div className="flex items-center gap-3">
          <span className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${STATUS_COLORS[order.status] || 'bg-white/[0.06] text-pg-gray-500'}`}>
            {order.status}
          </span>
          <span className={`rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider ${PAYMENT_COLORS[order.paymentStatus] || 'bg-white/[0.06] text-pg-gray-500'}`}>
            {order.paymentStatus}
          </span>
          {order.invoiceNumber && (
            <Link
              to={`/orders/${order.id}/invoice`}
              className="rounded border border-pg-green/25 bg-pg-green/15 px-3 py-1.5 font-heading text-[11px] font-medium uppercase tracking-wider text-pg-green-light transition-all hover:bg-pg-green/25"
            >
              View Invoice
            </Link>
          )}
        </div>
      </div>

      {/* Status Timeline */}
      {order.status !== 'cancelled' && (
        <div className="mb-6 rounded-lg border border-white/[0.06] bg-pg-dark p-4">
          <h2 className="mb-4 font-heading text-[11px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
            Order Timeline
          </h2>
          <div className="flex items-center justify-between">
            {STATUS_STEPS.map((step, i) => {
              const isCompleted = i <= currentStep;
              const isCurrent = i === currentStep;
              const timestamps: Record<string, string | undefined> = {
                pending: order.createdAt,
                confirmed: order.confirmedAt,
                shipped: order.shippedAt,
                delivered: order.deliveredAt,
              };

              return (
                <div key={step} className="flex flex-1 items-center">
                  <div className="flex flex-col items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full border-2 text-xs font-bold transition-all ${
                        isCompleted
                          ? 'border-pg-green bg-pg-green/20 text-pg-green-light'
                          : 'border-white/[0.12] bg-white/[0.04] text-puregro-gray-600'
                      } ${isCurrent ? 'ring-2 ring-pg-green/30 ring-offset-2 ring-offset-pg-dark' : ''}`}
                    >
                      {isCompleted ? (
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      ) : (
                        i + 1
                      )}
                    </div>
                    <p className={`mt-1.5 text-center font-heading text-[10px] font-semibold uppercase tracking-wider ${isCompleted ? 'text-pg-green-light' : 'text-puregro-gray-600'}`}>
                      {step}
                    </p>
                    {timestamps[step] && (
                      <p className="mt-0.5 text-center text-[10px] text-puregro-gray-600">
                        {formatDate(timestamps[step])}
                      </p>
                    )}
                  </div>
                  {i < STATUS_STEPS.length - 1 && (
                    <div className={`mx-2 h-0.5 flex-1 ${i < currentStep ? 'bg-pg-green/40' : 'bg-white/[0.08]'}`} />
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Line Items */}
        <div className="lg:col-span-2">
          <div className="rounded-lg border border-white/[0.06] bg-pg-dark p-4">
            <h2 className="mb-3 font-heading text-[11px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
              Line Items
            </h2>
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Product</th>
                  <th className="pb-2 font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">SKU</th>
                  <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Qty</th>
                  <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Unit Price</th>
                  <th className="pb-2 text-right font-heading text-[10px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.04]">
                {order.items.map((item, i) => (
                  <tr key={i}>
                    <td className="py-2 text-pg-gray-300">{item.name || item.productName}</td>
                    <td className="py-2 text-xs text-pg-gray-500">{item.sku}</td>
                    <td className="py-2 text-right text-pg-gray-300">{item.quantity}</td>
                    <td className="py-2 text-right text-pg-gray-300">{formatRand(item.unitPrice)}</td>
                    <td className="py-2 text-right font-medium text-pg-white">{formatRand(item.totalPrice || item.lineTotal)}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot className="border-t border-white/[0.06]">
                <tr>
                  <td colSpan={4} className="py-1.5 text-right text-xs text-pg-gray-500">Subtotal</td>
                  <td className="py-1.5 text-right text-sm text-pg-gray-300">{formatRand(order.subtotal)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-1.5 text-right text-xs text-pg-gray-500">VAT (15%)</td>
                  <td className="py-1.5 text-right text-sm text-pg-gray-300">{formatRand(order.vatAmount)}</td>
                </tr>
                <tr>
                  <td colSpan={4} className="py-1.5 text-right text-sm font-bold text-pg-white">Total</td>
                  <td className="py-1.5 text-right text-sm font-bold text-pg-gold">{formatRand(order.total || order.totalAmount)}</td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Delivery Info */}
          <div className="rounded-lg border border-white/[0.06] bg-pg-dark p-4">
            <h2 className="mb-3 font-heading text-[11px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
              Delivery
            </h2>
            {order.deliveryAddress && (
              <div className="mb-3 text-sm text-pg-gray-300">
                <p>{order.deliveryAddress.street}</p>
                <p>{order.deliveryAddress.city}, {order.deliveryAddress.province}</p>
                <p>{order.deliveryAddress.postalCode}</p>
              </div>
            )}
            {order.deliveryNotes && (
              <p className="mb-3 text-xs text-pg-gray-500">Notes: {order.deliveryNotes}</p>
            )}
            {order.courierName && (
              <div className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
                <p className="text-xs text-pg-gray-500">Courier</p>
                <p className="text-sm font-medium text-pg-white">{order.courierName}</p>
                {order.trackingNumber && (
                  <>
                    <p className="mt-1 text-xs text-pg-gray-500">Tracking #</p>
                    <p className="text-sm font-medium text-pg-green-light">{order.trackingNumber}</p>
                  </>
                )}
              </div>
            )}
          </div>

          {/* POP Upload */}
          <div className="rounded-lg border border-white/[0.06] bg-pg-dark p-4">
            <h2 className="mb-3 font-heading text-[11px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
              Proof of Payment
            </h2>

            {order.paymentStatus !== 'paid' && (
              <div className="mb-3">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,application/pdf"
                  className="mb-2 block w-full text-xs text-pg-gray-500 file:mr-2 file:rounded file:border file:border-white/[0.12] file:bg-white/[0.04] file:px-3 file:py-1.5 file:font-heading file:text-[10px] file:font-medium file:uppercase file:tracking-wider file:text-puregro-gray-400 hover:file:bg-white/[0.08]"
                />
                {uploadError && <p className="mb-2 text-xs text-red-400">{uploadError}</p>}
                <button
                  onClick={handleUpload}
                  disabled={uploading}
                  className="w-full rounded border border-pg-green/25 bg-pg-green/15 px-3 py-1.5 font-heading text-[11px] font-medium uppercase tracking-wider text-pg-green-light transition-all hover:bg-pg-green/25 disabled:opacity-50"
                >
                  {uploading ? 'Uploading...' : 'Upload POP'}
                </button>
              </div>
            )}

            {pops.length === 0 ? (
              <p className="text-xs text-puregro-gray-600">No proof of payment uploaded yet.</p>
            ) : (
              <div className="space-y-2">
                {pops.map((pop) => (
                  <div key={pop.id} className="rounded border border-white/[0.06] bg-white/[0.02] p-2">
                    <div className="flex items-center justify-between">
                      <a
                        href={pop.filePath}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-xs font-medium text-pg-green-light hover:underline"
                      >
                        {pop.fileName}
                      </a>
                      <span className={`rounded px-1.5 py-0.5 font-heading text-[9px] font-semibold uppercase tracking-wider ${POP_COLORS[pop.status] || 'bg-white/[0.06] text-pg-gray-500'}`}>
                        {pop.status}
                      </span>
                    </div>
                    <p className="mt-1 text-[10px] text-puregro-gray-600">
                      {formatFileSize(pop.fileSize)} - {formatDate(pop.uploadedAt)}
                    </p>
                    {pop.adminNotes && (
                      <p className="mt-1 text-[10px] text-pg-gray-500">Note: {pop.adminNotes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Order Info */}
          <div className="rounded-lg border border-white/[0.06] bg-pg-dark p-4">
            <h2 className="mb-3 font-heading text-[11px] font-semibold uppercase tracking-[0.15em] text-pg-gray-500">
              Order Info
            </h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-pg-gray-500">Created</span>
                <span className="text-pg-gray-300">{formatDate(order.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-pg-gray-500">Payment Method</span>
                <span className="text-pg-gray-300 uppercase">{order.paymentMethod}</span>
              </div>
              {order.paidAt && (
                <div className="flex justify-between">
                  <span className="text-pg-gray-500">Paid At</span>
                  <span className="text-pg-gray-300">{formatDate(order.paidAt)}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
