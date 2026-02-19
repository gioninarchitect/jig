// P39 — Order confirmation: order number, items, total, payment instructions
import { Link, useLocation } from 'react-router-dom';
import { formatCurrency } from '../../config';

export default function OrderConfirmationPage() {
  const { state } = useLocation();
  const orderId = state?.orderId || 'N/A';
  const total = state?.total || 0;
  const payment = state?.payment || 'eft';

  return (
    <div className="max-w-2xl mx-auto px-4 py-16 sm:py-24">
      {/* Success icon */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-jig-purple/10 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-10 h-10 text-jig-purple" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <h1 className="font-heading text-3xl text-white uppercase mb-2">Order Placed!</h1>
        <p className="text-gray-500">Thank you for your order. We'll process it once payment is confirmed.</p>
      </div>

      {/* Order details */}
      <div className="bg-white rounded-xl p-6 border border-gray-200 mb-6">
        <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
          <div>
            <p className="text-xs text-gray-500 uppercase tracking-wider">Order Number</p>
            <p className="font-heading text-xl text-white">{orderId}</p>
          </div>
          <div className="text-right">
            <p className="text-xs text-gray-500 uppercase tracking-wider">Total</p>
            <p className="font-heading text-xl text-jig-amber">{formatCurrency(total)}</p>
          </div>
        </div>

        {payment === 'eft' && (
          <div>
            <h3 className="text-xs font-bold text-gray-600 uppercase tracking-wider mb-3">Payment Instructions</h3>
            <div className="bg-jig-slate rounded-xl p-4 border border-gray-200 space-y-2 text-sm">
              <p className="text-gray-600">Please make an EFT payment to the following account:</p>
              <div className="space-y-1 text-gray-700">
                <p><span className="font-semibold">Bank:</span> Capitec</p>
                <p><span className="font-semibold">Account Number:</span> 2320619824</p>
                <p><span className="font-semibold">Branch Code:</span> 470010</p>
                <p><span className="font-semibold">Reference:</span> {orderId}</p>
              </div>
              <div className="mt-3 pt-3 border-t border-gray-200">
                <p className="text-gray-600">After payment, please send proof of payment to:</p>
                <p className="font-semibold text-gray-700 mt-1">Email: payments@jig.cleva-ai.co.za</p>
                <p className="font-semibold text-gray-700">WhatsApp: +27 (0) 60 000 0000</p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3">
        <Link
          to="/products"
          className="flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider border-2 border-jig-purple text-jig-purple rounded-xl hover:bg-jig-purple hover:text-white transition-all"
        >
          Back to Shop
        </Link>
        <Link
          to="/my-account"
          className="flex-1 py-3 text-center text-sm font-bold uppercase tracking-wider bg-gradient-to-br from-jig-amber-light via-jig-amber to-jig-amber-dark text-gray-900 rounded-xl hover:shadow-lg transition-all"
        >
          View My Orders
        </Link>
      </div>
    </div>
  );
}
