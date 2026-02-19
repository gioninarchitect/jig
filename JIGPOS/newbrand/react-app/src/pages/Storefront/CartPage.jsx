// P39 — Full cart page: items grid, qty controls, voucher, order summary (vanilla-matched)
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { formatCurrency } from '../../config';
import { useVoucher } from '../../hooks/useVoucher';

export default function CartPage() {
  const { items, removeItem, updateQty, subtotal, formattedSubtotal, itemCount } = useCart();
  const { discount, voucherCode, error: voucherError, loading: voucherLoading, validateVoucher, clearVoucher } = useVoucher();
  const [code, setCode] = useState('');

  const shipping = subtotal >= 100 ? 0 : 10;
  const total = subtotal - discount + shipping;

  function handleApplyVoucher(e) {
    e.preventDefault();
    validateVoucher(code, subtotal, items);
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <div
          className="bg-white rounded-[12px] p-16"
          style={{ boxShadow: '0 4px 20px rgba(58,95,72,0.1)' }}
        >
          <svg className="w-20 h-20 text-gray-300 mx-auto mb-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 100 4 2 2 0 000-4z" />
          </svg>
          <h2 className="font-heading text-[2rem] text-jig-purple-dark uppercase mb-4">Your Cart is Empty</h2>
          <p className="text-jig-purple-light mb-6">Looks like you haven't added any products yet.</p>
          <Link
            to="/products"
            className="inline-block px-8 py-4 font-heading text-[1.1rem] uppercase tracking-wide text-gray-100 rounded-[8px] hover:-translate-y-0.5 transition-all"
            style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 4px 15px rgba(58,95,72,0.3)' }}
          >
            Shop Now
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        <h1 className="font-heading text-[2.5rem] text-jig-purple-dark uppercase tracking-wide mb-8">
          Shopping Cart
        </h1>

        <div className="grid grid-cols-1 lg:grid-cols-[2fr_1fr] gap-8">
          {/* Cart items */}
          <div
            className="bg-white rounded-[12px] p-6 sm:p-8"
            style={{ boxShadow: '0 4px 20px rgba(58,95,72,0.1)', border: '1px solid rgba(58,95,72,0.1)' }}
          >
            {items.map((item, index) => (
              <div
                key={item._key || index}
                className="grid items-center gap-4 py-4"
                style={{
                  gridTemplateColumns: '100px 1fr auto auto auto',
                  borderBottom: index < items.length - 1 ? '1px solid rgba(58,95,72,0.1)' : 'none',
                }}
              >
                {/* Image */}
                <div className="w-[100px] h-[100px] bg-jig-slate rounded-[8px] overflow-hidden" style={{ border: '1px solid rgba(58,95,72,0.1)' }}>
                  {item.image ? (
                    <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-400 text-xs">No img</div>
                  )}
                </div>

                {/* Details */}
                <div className="min-w-0">
                  <h3 className="font-semibold text-jig-purple-dark truncate">{item.name}</h3>
                  <p className="text-sm text-jig-purple-light">{formatCurrency(item.price)} each</p>
                </div>

                {/* Qty controls */}
                <div className="flex items-center bg-jig-slate rounded-[8px]" style={{ border: '1px solid rgba(58,95,72,0.2)' }}>
                  <button
                    onClick={() => item.quantity > 1 ? updateQty(index, item.quantity - 1) : removeItem(index)}
                    className="px-3 py-2 text-jig-purple font-semibold text-lg hover:bg-jig-purple hover:text-gray-100 rounded-l-[7px] transition-all"
                  >
                    -
                  </button>
                  <span className="px-4 py-2 min-w-[40px] text-center text-jig-purple-dark font-semibold">{item.quantity}</span>
                  <button
                    onClick={() => updateQty(index, item.quantity + 1)}
                    disabled={item.quantity >= item.stock}
                    className="px-3 py-2 text-jig-purple font-semibold text-lg hover:bg-jig-purple hover:text-gray-100 rounded-r-[7px] transition-all disabled:opacity-30"
                  >
                    +
                  </button>
                </div>

                {/* Line total */}
                <span className="text-[1.2rem] font-bold text-jig-purple-dark">{formatCurrency(item.price * item.quantity)}</span>

                {/* Remove */}
                <button
                  onClick={() => removeItem(index)}
                  className="text-jig-red text-xl hover:scale-110 transition-transform"
                  title="Remove"
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          {/* Order Summary */}
          <div>
            <div
              className="bg-white rounded-[12px] p-8 sticky top-8"
              style={{ boxShadow: '0 4px 20px rgba(58,95,72,0.1)', border: '1px solid rgba(58,95,72,0.1)' }}
            >
              <h2 className="font-heading text-[1.5rem] text-jig-purple-dark uppercase tracking-wide mb-6">Order Summary</h2>

              <div className="space-y-4 text-white">
                <div className="flex justify-between">
                  <span>Subtotal</span>
                  <span className="font-semibold">{formattedSubtotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Shipping</span>
                  <span className="font-semibold">{shipping === 0 ? 'FREE' : formatCurrency(shipping)}</span>
                </div>
                {discount > 0 && (
                  <div className="flex justify-between text-jig-purple">
                    <span>Voucher ({voucherCode})</span>
                    <span className="font-semibold">-{formatCurrency(discount)}</span>
                  </div>
                )}
                <div className="flex justify-between text-[1.25rem] font-bold pt-4" style={{ borderTop: '2px solid #D97706' }}>
                  <span className="text-jig-purple-dark">Total</span>
                  <span className="text-jig-purple-dark">{formatCurrency(total)}</span>
                </div>
              </div>

              {subtotal < 100 && (
                <p className="text-xs text-jig-purple-light mt-3">
                  Add {formatCurrency(100 - subtotal)} more for free shipping.
                </p>
              )}

              {/* Voucher */}
              <div className="mt-6 pt-6" style={{ borderTop: '1px solid rgba(58,95,72,0.1)' }}>
                <form onSubmit={handleApplyVoucher}>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={code}
                      onChange={(e) => setCode(e.target.value)}
                      placeholder="Voucher Code"
                      className="flex-1 px-3 py-3 bg-jig-slate rounded-[8px] text-sm text-jig-purple-dark placeholder:text-jig-purple-light focus:outline-none focus:border-jig-purple"
                      style={{ border: '1px solid rgba(58,95,72,0.2)' }}
                    />
                    <button
                      type="submit"
                      disabled={voucherLoading}
                      className="px-6 py-3 text-sm font-semibold bg-jig-amber text-jig-purple-dark rounded-[8px] hover:bg-jig-amber-dark transition-colors disabled:opacity-50"
                    >
                      {voucherLoading ? '...' : 'Apply'}
                    </button>
                  </div>
                  {voucherError && <p className="text-xs text-jig-red mt-2">{voucherError}</p>}
                  {discount > 0 && (
                    <button onClick={clearVoucher} type="button" className="text-xs text-jig-red mt-2 hover:underline">Remove voucher</button>
                  )}
                </form>
              </div>

              <Link
                to="/checkout"
                className="block w-full mt-8 py-4 text-center font-heading text-[1.1rem] uppercase tracking-wide text-gray-100 rounded-[8px] hover:-translate-y-0.5 transition-all"
                style={{ background: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', boxShadow: '0 4px 15px rgba(58,95,72,0.3)' }}
              >
                Proceed to Checkout
              </Link>

              <Link to="/products" className="block text-center mt-4 text-sm text-jig-purple-light hover:text-jig-purple transition-colors">
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
