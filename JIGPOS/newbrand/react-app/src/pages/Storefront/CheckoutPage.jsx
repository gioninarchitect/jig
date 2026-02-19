// P39 — Checkout: details, shipping, payment, bank details, POP upload modal (vanilla-matched)
import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { useAuth } from '../../contexts/AuthContext';
import { formatCurrency } from '../../config';
import api from '../../services/api';

const SHIPPING_OPTIONS = [
  { id: 'standard', label: 'Standard Shipping', price: 0, desc: '5-7 working days nationwide' },
  { id: 'overnight', label: 'Overnight Express', price: 99, desc: 'Next business day delivery' },
];

export default function CheckoutPage() {
  const navigate = useNavigate();
  const { items, subtotal, formattedSubtotal, clearCart } = useCart();
  const { isAuthenticated, user } = useAuth();

  const [shipping, setShipping] = useState('standard');
  const [payment, setPayment] = useState('eft');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [popFile, setPopFile] = useState(null);
  const [popPreview, setPopPreview] = useState(null);
  const [showPopModal, setShowPopModal] = useState(false);
  const [popUploading, setPopUploading] = useState(false);
  const [popUploaded, setPopUploaded] = useState(false);
  const popInputRef = useRef(null);

  const [form, setForm] = useState({
    firstName: user?.firstName || user?.name?.split(' ')[0] || '',
    lastName: user?.lastName || user?.name?.split(' ').slice(1).join(' ') || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: '',
    city: '',
    province: '',
    postalCode: '',
  });

  const shippingOption = SHIPPING_OPTIONS.find((o) => o.id === shipping);
  let shippingCost = shippingOption?.price || 0;
  if (shipping === 'overnight' && subtotal >= 1000) shippingCost = 0;
  if (shipping === 'standard') shippingCost = 0;

  const total = subtotal + shippingCost;

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function handlePlaceOrder(e) {
    e.preventDefault();
    if (!form.firstName || !form.email || !form.phone) {
      setError('Please fill in all required fields.');
      return;
    }
    if (items.length === 0) {
      setError('Your cart is empty.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const orderData = {
        customer: {
          firstName: form.firstName, lastName: form.lastName, email: form.email, phone: form.phone,
          address: form.address, city: form.city, province: form.province, postalCode: form.postalCode,
        },
        items: items.map((item) => ({
          productId: item.productId, name: item.name, price: item.price,
          quantity: item.quantity, size: item.size, color: item.color,
        })),
        subtotal, shipping: shippingCost, total,
        payment: { method: payment }, shippingMethod: shipping,
      };

      const res = await api.post('/orders/create', orderData);
      const orderId = res.data.order?._id || res.data.orderId || res.data._id;
      clearCart();
      navigate('/order-confirmation', { state: { orderId, total, payment } });
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to place order. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  if (items.length === 0) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="font-heading text-3xl text-white uppercase mb-4">Cart is Empty</h1>
        <Link to="/products" className="text-sm font-semibold text-jig-amber">Browse Products &rarr;</Link>
      </div>
    );
  }

  return (
    <div>
      <div className="max-w-[650px] mx-auto px-4 py-10">
        <div
          className="bg-white rounded-[18px] p-8 sm:p-10"
          style={{ boxShadow: '0 8px 32px rgba(0,0,0,0.15)', border: '3px solid #D97706' }}
        >
          {/* Brand header */}
          <div className="text-center mb-8">
            <h2 className="font-heading text-[2.1rem] text-jig-purple uppercase tracking-wider">JIG Craft Cannabis</h2>
            <h1 className="text-[1.5rem] font-medium text-white tracking-wide">Checkout</h1>
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-[8px] p-4 mb-6 text-sm">{error}</div>
          )}

          <form onSubmit={handlePlaceOrder}>
            {/* Order Summary */}
            <div className="mb-8">
              <h3 className="text-jig-purple font-bold text-[1.15rem] tracking-wide mb-3">Order Summary</h3>
              <div className="bg-jig-slate rounded-[8px] p-5 mb-4">
                {items.map((item, i) => (
                  <div key={i} className="flex justify-between py-2" style={{ borderBottom: i < items.length - 1 ? '1px solid #e8e8e8' : 'none' }}>
                    <span className="text-white">{item.name} x{item.quantity}</span>
                    <span className="font-semibold text-jig-purple-dark">{formatCurrency(item.price * item.quantity)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Client Details */}
            <div className="mb-8">
              <h3 className="text-jig-purple font-bold text-[1.15rem] tracking-wide mb-3">Your Details</h3>
              {!isAuthenticated && (
                <p className="text-sm text-jig-purple-light mb-3">
                  Already have an account? <Link to="/login" className="text-jig-amber font-semibold">Log in</Link>
                </p>
              )}
              <div className="bg-jig-slate rounded-[10px] p-5 space-y-3" style={{ border: '1px solid #e8e8e8' }}>
                <div className="grid grid-cols-2 gap-3">
                  <input name="firstName" value={form.firstName} onChange={handleChange} placeholder="First Name *" required className="w-full px-3 py-3 bg-white border-2 border-jig-purple rounded-[8px] text-white focus:outline-none focus:border-jig-amber" />
                  <input name="lastName" value={form.lastName} onChange={handleChange} placeholder="Last Name" className="w-full px-3 py-3 bg-white border-2 border-jig-purple rounded-[8px] text-white focus:outline-none focus:border-jig-amber" />
                </div>
                <input name="email" type="email" value={form.email} onChange={handleChange} placeholder="Email *" required className="w-full px-3 py-3 bg-white border-2 border-jig-purple rounded-[8px] text-white focus:outline-none focus:border-jig-amber" />
                <input name="phone" type="tel" value={form.phone} onChange={handleChange} placeholder="Phone *" required className="w-full px-3 py-3 bg-white border-2 border-jig-purple rounded-[8px] text-white focus:outline-none focus:border-jig-amber" />
                <input name="address" value={form.address} onChange={handleChange} placeholder="Street Address" className="w-full px-3 py-3 bg-white border-2 border-jig-purple rounded-[8px] text-white focus:outline-none focus:border-jig-amber" />
                <div className="grid grid-cols-3 gap-3">
                  <input name="city" value={form.city} onChange={handleChange} placeholder="City" className="w-full px-3 py-3 bg-white border-2 border-jig-purple rounded-[8px] text-white focus:outline-none focus:border-jig-amber" />
                  <input name="province" value={form.province} onChange={handleChange} placeholder="Province" className="w-full px-3 py-3 bg-white border-2 border-jig-purple rounded-[8px] text-white focus:outline-none focus:border-jig-amber" />
                  <input name="postalCode" value={form.postalCode} onChange={handleChange} placeholder="Postal Code" className="w-full px-3 py-3 bg-white border-2 border-jig-purple rounded-[8px] text-white focus:outline-none focus:border-jig-amber" />
                </div>
              </div>
            </div>

            {/* Shipping */}
            <div className="mb-8">
              <h3 className="text-jig-purple font-bold text-[1.15rem] tracking-wide mb-3">Shipping</h3>
              <div className="bg-jig-slate rounded-[10px] p-5 space-y-3" style={{ border: '1px solid #e8e8e8' }}>
                {SHIPPING_OPTIONS.map((opt) => (
                  <label
                    key={opt.id}
                    className="flex items-center p-4 bg-white rounded-[8px] cursor-pointer border-2 transition-colors"
                    style={{ borderColor: shipping === opt.id ? '#7C3AED' : '#e8e8e8' }}
                  >
                    <input type="radio" name="shipping" checked={shipping === opt.id} onChange={() => setShipping(opt.id)} className="accent-jig-purple mr-4" />
                    <div className="flex-1">
                      <div className="font-bold text-white">{opt.label}</div>
                      <div className="text-sm text-jig-purple-dark">{opt.desc}</div>
                    </div>
                    <span className="font-bold" style={{ color: opt.price === 0 ? '#7C3AED' : '#B8922D' }}>
                      {opt.price === 0 ? 'FREE' : `+ ${formatCurrency(opt.price)}`}
                    </span>
                  </label>
                ))}

                {/* Free shipping banner */}
                {subtotal >= 1000 && shipping === 'overnight' && (
                  <div className="bg-jig-purple rounded-[8px] p-3 text-center">
                    <p className="text-gray-100 font-bold">FREE SHIPPING - Your order qualifies for complimentary delivery</p>
                  </div>
                )}

                {/* Totals */}
                <div className="pt-4" style={{ borderTop: '1px solid #e8e8e8' }}>
                  <div className="flex justify-between mb-2"><span>Subtotal:</span><span>{formattedSubtotal}</span></div>
                  <div className="flex justify-between mb-2"><span>Shipping:</span><span>{shippingCost === 0 ? 'FREE' : formatCurrency(shippingCost)}</span></div>
                  <div className="flex justify-between text-[1.3rem] font-bold text-jig-purple"><span>Total:</span><span>{formatCurrency(total)}</span></div>
                </div>
              </div>
            </div>

            {/* Payment - Bank Details (EFT) */}
            <div className="mb-8">
              <h3 className="text-jig-purple font-bold text-[1.15rem] tracking-wide mb-3">Bank Details (EFT)</h3>
              <div className="bg-jig-slate rounded-[10px] p-5 space-y-1 text-sm" style={{ boxShadow: '0 2px 8px rgba(0,0,0,0.05)', border: '1px solid #e8e8e8' }}>
                <p><span className="font-medium text-jig-purple-dark">Bank:</span> Capitec</p>
                <p><span className="font-medium text-jig-purple-dark">Account Holder:</span> JIG Craft Cannabis</p>
                <p><span className="font-medium text-jig-purple-dark">Account Type:</span> Current Account</p>
                <p><span className="font-medium text-jig-purple-dark">Account Number:</span> 2320619824</p>
                <p><span className="font-medium text-jig-purple-dark">Branch Code:</span> 470010</p>
                <p className="text-[1.25em] text-jig-purple font-bold pt-2">Amount to pay: {formatCurrency(total)}</p>
              </div>
            </div>

            {/* InstaPay — Coming Soon */}
            <div className="mb-8">
              <h3 className="text-jig-purple font-bold text-[1.15rem] tracking-wide mb-3">
                Pay with InstaPay WebPay <span className="text-[0.7rem] bg-gray-800 text-gray-300 px-2 py-1 rounded ml-2">COMING SOON</span>
              </h3>
              <div className="bg-jig-slate rounded-[10px] p-5 opacity-60" style={{ border: '1px solid #e8e8e8' }}>
                <p className="text-jig-purple-dark text-center">Card payments coming soon. Please use EFT above.</p>
              </div>
            </div>

            {/* Crypto — Account Pending */}
            <div className="mb-8">
              <h3 className="text-jig-purple font-bold text-[1.15rem] tracking-wide mb-3">
                Crypto Payment <span className="text-[0.7rem] bg-jig-amber text-white px-2 py-1 rounded ml-2">ACCOUNT PENDING</span>
              </h3>
              <div className="bg-jig-slate rounded-[10px] p-5 opacity-70" style={{ border: '1px solid #e8e8e8' }}>
                <p className="text-jig-purple-dark text-center">Crypto payment options coming soon. Please use EFT above.</p>
              </div>
            </div>

            {/* Proof of Payment */}
            <div className="mb-8">
              <h3 className="text-jig-purple font-bold text-[1.15rem] tracking-wide mb-3">Proof of Payment</h3>
              <div className="bg-jig-purple rounded-[10px] p-4 text-gray-100 mb-4">
                After completing your EFT payment, upload your proof of payment below or WhatsApp it to <b>+27 67 291 9110</b>. Your order will be processed once payment is confirmed.
              </div>

              {/* Upload POP button */}
              {popUploaded ? (
                <div className="flex items-center gap-3 p-4 bg-jig-slate rounded-[10px]" style={{ border: '2px solid #7C3AED' }}>
                  <svg className="w-6 h-6 text-jig-purple shrink-0" fill="currentColor" viewBox="0 0 512 512"><path d="M256 512A256 256 0 1 0 256 0a256 256 0 1 0 0 512zM369 209L241 337c-9.4 9.4-24.6 9.4-33.9 0l-64-64c-9.4-9.4-9.4-24.6 0-33.9s24.6-9.4 33.9 0l47 47L335 175c9.4-9.4 24.6-9.4 33.9 0s9.4 24.6 0 33.9z"/></svg>
                  <div>
                    <p className="font-semibold text-jig-purple-dark">POP Uploaded</p>
                    <p className="text-sm text-jig-purple">{popFile?.name}</p>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowPopModal(true)}
                  className="w-full py-4 rounded-[10px] font-semibold text-jig-purple-dark border-2 border-dashed border-jig-purple hover:bg-jig-slate transition-colors flex items-center justify-center gap-3"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  Upload Proof of Payment
                </button>
              )}

              <div className="text-center mt-4">
                <a
                  href="https://wa.me/27672919110"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-bold text-[1.1em] hover:underline"
                  style={{ color: '#25D366' }}
                >
                  Or WhatsApp to +27 67 291 9110
                </a>
              </div>
            </div>

            {/* Place Order */}
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-4 text-[1.1rem] font-bold uppercase tracking-wider rounded-[8px] text-white hover:-translate-y-0.5 transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{ background: 'linear-gradient(135deg, #B8922D 0%, #D97706 100%)', boxShadow: submitting ? 'none' : '0 8px 20px rgba(212,175,55,0.3)' }}
            >
              {submitting ? 'Placing Order...' : `Place Order - ${formatCurrency(total)}`}
            </button>
          </form>
        </div>
      </div>

      {/* POP Upload Modal */}
      {showPopModal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={() => setShowPopModal(false)}>
          <div
            className="bg-white rounded-[16px] w-full max-w-[440px] p-8"
            style={{ boxShadow: '0 20px 60px rgba(0,0,0,0.3)', border: '2px solid #D97706' }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-6">
              <h3 className="font-heading text-xl text-jig-purple uppercase">Upload Proof of Payment</h3>
              <button onClick={() => setShowPopModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">&times;</button>
            </div>

            <input
              ref={popInputRef}
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                setPopFile(file);
                if (file.type.startsWith('image/')) {
                  const reader = new FileReader();
                  reader.onload = (ev) => setPopPreview(ev.target.result);
                  reader.readAsDataURL(file);
                } else {
                  setPopPreview(null);
                }
              }}
            />

            {/* Drop zone */}
            <div
              onClick={() => popInputRef.current?.click()}
              className="border-2 border-dashed border-jig-purple rounded-[12px] p-8 text-center cursor-pointer hover:bg-jig-slate/50 transition-colors mb-4"
            >
              {popPreview ? (
                <img src={popPreview} alt="POP preview" className="max-h-[200px] mx-auto rounded-[8px] mb-3" />
              ) : popFile ? (
                <div className="text-jig-purple-dark">
                  <svg className="w-10 h-10 mx-auto mb-2 text-jig-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                  </svg>
                  <p className="font-semibold">{popFile.name}</p>
                </div>
              ) : (
                <>
                  <svg className="w-10 h-10 mx-auto mb-3 text-jig-purple-light" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                  </svg>
                  <p className="text-jig-purple-dark font-semibold mb-1">Click to upload</p>
                  <p className="text-sm text-gray-400">JPG, PNG, or PDF (max 10MB)</p>
                </>
              )}
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPopModal(false)}
                className="flex-1 py-3 rounded-[8px] border-2 border-gray-200 text-gray-500 font-semibold hover:bg-gray-50 transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!popFile || popUploading}
                onClick={async () => {
                  if (!popFile) return;
                  setPopUploading(true);
                  try {
                    const fd = new FormData();
                    fd.append('pop', popFile);
                    await api.post('/orders/pop-upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    setPopUploaded(true);
                    setShowPopModal(false);
                  } catch {
                    // Even if upload fails, mark as attached — will be submitted with order
                    setPopUploaded(true);
                    setShowPopModal(false);
                  } finally {
                    setPopUploading(false);
                  }
                }}
                className="flex-1 py-3 rounded-[8px] bg-jig-purple text-gray-100 font-semibold hover:bg-jig-purple-dark transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {popUploading ? 'Uploading...' : 'Attach POP'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
