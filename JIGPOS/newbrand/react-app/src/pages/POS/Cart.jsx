// P21 — POS Cart Component
// Odyssey dark navy theme — gold checkout, 1.8rem total, gold qty buttons

import { formatCurrency } from '../../config';

export default function Cart({ items, totals, onIncrement, onDecrement, onUpdateQty, onRemove, onClear, onCheckout }) {
  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16" style={{ color: '#64748b' }}>
        <svg className="w-12 h-12 mb-3 opacity-40" fill="none" stroke="#D97706" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
        </svg>
        <p className="font-heading text-lg uppercase" style={{ color: '#94a3b8' }}>Cart is empty</p>
        <p className="text-sm mt-1" style={{ color: '#64748b' }}>Tap products to add</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Cart Header */}
      <div className="px-4 py-3 flex items-center justify-between" style={{ borderBottom: '2px solid #334155' }}>
        <span className="font-heading text-lg uppercase text-white tracking-wide">Cart</span>
        <span className="text-xs font-semibold" style={{ color: '#D97706' }}>{totals.itemCount} items</span>
      </div>

      {/* Items */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {items.map((item, index) => (
          <div key={item._id + '-' + index} className="flex items-center justify-between p-3 rounded-lg" style={{ background: '#1e293b', border: '1px solid #334155' }}>
            <div className="flex-1 min-w-0 mr-3">
              <div className="font-bold text-sm text-white truncate">{item.name}</div>
              <div className="text-xs" style={{ color: '#D97706' }}>{formatCurrency(item.price)} each</div>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => onDecrement(index)}
                className="flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
                style={{ width: 28, height: 28, borderRadius: 6, background: '#D97706', color: '#1a1a2e', fontWeight: 700, fontSize: '1rem', border: 'none' }}
              >-</button>
              <input
                type="number"
                value={item.quantity}
                onChange={(e) => onUpdateQty(index, e.target.value)}
                className="text-center text-white text-sm font-bold outline-none"
                style={{ width: 40, height: 28, borderRadius: 6, background: '#334155', border: 'none' }}
                min="1"
              />
              <button
                onClick={() => onIncrement(index)}
                className="flex items-center justify-center transition-all hover:opacity-80 active:scale-90"
                style={{ width: 28, height: 28, borderRadius: 6, background: '#D97706', color: '#1a1a2e', fontWeight: 700, fontSize: '1rem', border: 'none' }}
              >+</button>
              <button
                onClick={() => onRemove(index)}
                className="flex items-center justify-center transition-all hover:opacity-80 active:scale-90 ml-1"
                style={{ width: 28, height: 28, borderRadius: 6, background: '#dc2626', color: 'white', fontWeight: 700, fontSize: '1rem', border: 'none' }}
              >&times;</button>
            </div>
          </div>
        ))}
      </div>

      {/* Summary — dark panel */}
      <div className="px-4 py-3 space-y-1" style={{ background: '#1e293b', borderTop: '2px solid #334155' }}>
        <div className="flex justify-between text-sm" style={{ color: '#94a3b8' }}>
          <span>Subtotal</span>
          <span>{formatCurrency(totals.subtotal)}</span>
        </div>
        <div className="flex justify-between text-sm" style={{ color: '#94a3b8' }}>
          <span>VAT (15%)</span>
          <span>{formatCurrency(totals.vat)}</span>
        </div>
        <div className="flex justify-between font-heading uppercase pt-2" style={{ fontSize: '1.8rem', color: '#D97706', borderTop: '2px solid #334155' }}>
          <span>Total</span>
          <span>{formatCurrency(totals.total)}</span>
        </div>
      </div>

      {/* Actions — gold checkout */}
      <div className="p-3 flex flex-col gap-2" style={{ background: '#0f172a', borderTop: '2px solid #D97706' }}>
        <button
          onClick={onCheckout}
          className="w-full py-3.5 rounded-lg font-heading text-lg uppercase tracking-wider transition-all hover:scale-[1.02] active:scale-[0.97]"
          style={{
            background: 'linear-gradient(135deg, #D97706 0%, #B8922D 100%)',
            color: '#1a1a2e',
            fontWeight: 700,
            letterSpacing: '1px',
            border: 'none',
            boxShadow: '0 2px 8px rgba(212,175,55,0.3)',
          }}
        >
          Checkout ({totals.itemCount})
        </button>
        <button
          onClick={onClear}
          className="w-full py-2 rounded-lg text-sm transition-colors hover:opacity-80"
          style={{ background: '#334155', color: 'white', border: 'none' }}
        >
          Clear Cart
        </button>
      </div>
    </div>
  );
}
