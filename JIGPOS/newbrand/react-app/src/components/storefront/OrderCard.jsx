// P40 — Order card: number, date, status badge, items, total, expandable detail
import { useState } from 'react';
import { formatCurrency } from '../../config';

const STATUS_COLORS = {
  pending: 'bg-or-gold text-white',
  confirmed: 'bg-blue-100 text-blue-700',
  processing: 'bg-or-gold text-white',
  shipped: 'bg-blue-100 text-blue-700',
  delivered: 'bg-or-gold text-white',
  completed: 'bg-or-gold-dark text-white',
  cancelled: 'bg-origin-red text-white',
  refunded: 'bg-gray-400 text-white',
};

export default function OrderCard({ order, onUploadProof }) {
  const [expanded, setExpanded] = useState(false);
  const status = order.status || 'pending';
  const date = order.createdAt ? new Date(order.createdAt).toLocaleDateString('en-ZA') : '-';
  const items = order.items || [];

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full flex items-center justify-between px-6 py-4 text-left hover:bg-gray-50 transition-colors"
      >
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-gray-400 uppercase tracking-wider">Order</p>
            <p className="font-semibold text-gray-900 text-sm">#{order._id?.slice(-8) || order.orderNumber || 'N/A'}</p>
          </div>
          <span className={`px-3 py-1 rounded-md text-xs font-bold uppercase ${STATUS_COLORS[status] || STATUS_COLORS.pending}`}>
            {status}
          </span>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-right hidden sm:block">
            <p className="text-xs text-gray-400">{date}</p>
            <p className="font-bold text-white text-sm">{formatCurrency(order.total || 0)}</p>
          </div>
          <svg className={`w-5 h-5 text-gray-400 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-6 pb-4 border-t border-gray-200">
          <div className="py-3 space-y-2">
            {items.map((item, i) => (
              <div key={i} className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-3">
                  <span className="text-gray-500">{item.quantity}x</span>
                  <span className="text-gray-900">{item.name}</span>
                </div>
                <span className="font-semibold">{formatCurrency((item.price || 0) * (item.quantity || 1))}</span>
              </div>
            ))}
          </div>

          <div className="flex items-center justify-between pt-3 border-t border-gray-100">
            <div className="text-sm text-gray-400">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </div>
            <div className="text-sm font-bold text-white">
              Total: {formatCurrency(order.total || 0)}
            </div>
          </div>

          {/* Upload proof for pending orders */}
          {(status === 'pending' || status === 'confirmed') && onUploadProof && (
            <button
              onClick={() => onUploadProof(order._id)}
              className="mt-3 w-full py-2 text-xs font-bold uppercase tracking-wider border-2 border-or-gold text-or-gold rounded-xl hover:bg-or-gold hover:text-gray-900 transition-all"
            >
              Upload Proof of Payment
            </button>
          )}
        </div>
      )}
    </div>
  );
}
