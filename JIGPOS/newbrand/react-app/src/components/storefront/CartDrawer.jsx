// P36 — Right-slide 450px cart drawer with item controls
import { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { formatCurrency } from '../../config';

export default function CartDrawer({ open, onClose }) {
  const { items, removeItem, updateQty, itemCount, formattedSubtotal } = useCart();

  // Lock body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  return (
    <>
      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 bg-black/50 z-[10000] animate-[fadeIn_0.2s_ease-out]"
          onClick={onClose}
        />
      )}

      {/* Drawer */}
      <div
        className={`fixed top-0 right-0 h-full w-full sm:w-[450px] bg-white z-[10001] shadow-[-8px_0_30px_rgba(0,0,0,0.15)] flex flex-col transition-transform duration-300 ease-[cubic-bezier(0.25,0.46,0.45,0.94)] ${
          open ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-origin-slate">
          <h2 className="font-heading text-xl text-white uppercase">
            Your Cart ({itemCount})
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full text-or-gold-dark hover:bg-or-gold/10 transition-colors text-xl"
          >
            &times;
          </button>
        </div>

        {/* Items */}
        <div className="flex-1 overflow-y-auto px-6 py-4">
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-center">
              <svg className="w-16 h-16 text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
              </svg>
              <p className="text-sm text-gray-500 mb-4">Your cart is empty</p>
              <Link
                to="/products"
                onClick={onClose}
                className="text-sm font-semibold text-or-gold hover:text-or-gold-dark transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item, index) => (
                <div key={item._key || index} className="flex gap-4 pb-4 border-b border-gray-100 last:border-0">
                  {/* Image */}
                  <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                    {item.image ? (
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                    )}
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-semibold text-gray-900 truncate">{item.name}</p>
                    <p className="text-sm text-or-gold font-bold mt-0.5">{formatCurrency(item.price)}</p>
                    {(item.size || item.color) && (
                      <p className="text-xs text-gray-400 mt-0.5">
                        {item.size && `Size: ${item.size}`}{item.size && item.color && ' / '}{item.color && `Color: ${item.color}`}
                      </p>
                    )}

                    {/* Qty controls */}
                    <div className="flex items-center gap-2 mt-2">
                      <button
                        onClick={() => item.quantity > 1 ? updateQty(index, item.quantity - 1) : removeItem(index)}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:border-or-gold hover:text-or-gold transition-colors text-sm"
                      >
                        -
                      </button>
                      <span className="text-sm font-semibold w-6 text-center">{item.quantity}</span>
                      <button
                        onClick={() => updateQty(index, item.quantity + 1)}
                        disabled={item.quantity >= item.stock}
                        className="w-7 h-7 flex items-center justify-center rounded-md border border-gray-300 text-gray-600 hover:border-or-gold hover:text-or-gold transition-colors text-sm disabled:opacity-40 disabled:cursor-not-allowed"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Line total + remove */}
                  <div className="flex flex-col items-end justify-between">
                    <span className="text-sm font-bold text-white">
                      {formatCurrency(item.price * item.quantity)}
                    </span>
                    <button
                      onClick={() => removeItem(index)}
                      className="text-xs text-gray-400 hover:text-origin-red transition-colors"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        {items.length > 0 && (
          <div className="px-6 py-4 border-t border-gray-200 bg-origin-slate space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-gray-600 uppercase tracking-wider">Subtotal</span>
              <span className="font-heading text-xl text-white">{formattedSubtotal}</span>
            </div>
            <Link
              to="/cart"
              onClick={onClose}
              className="block w-full py-3 text-center text-sm font-bold uppercase tracking-wider bg-gradient-to-br from-or-gold-light via-or-gold to-or-gold-dark text-white rounded-xl hover:shadow-lg transition-all"
            >
              View Cart
            </Link>
            <Link
              to="/checkout"
              onClick={onClose}
              className="block w-full py-3 text-center text-sm font-bold uppercase tracking-wider bg-gradient-to-br from-or-gold-light via-or-gold to-or-gold-dark text-gray-900 rounded-xl hover:shadow-lg transition-all"
            >
              Checkout
            </Link>
          </div>
        )}
      </div>
    </>
  );
}
