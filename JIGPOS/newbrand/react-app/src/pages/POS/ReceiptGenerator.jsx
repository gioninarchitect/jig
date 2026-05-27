// P21 — POS Receipt Generator
// Post-sale modal: print, download PDF, email receipt

import { useState } from 'react';
import api from '../../services/api';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../config';
import Button from '../../components/ui/Button';

export default function ReceiptGenerator({ sale, onClose }) {
  const { addToast } = useToast();
  const [email, setEmail] = useState(sale?.customerEmail || '');
  const [sending, setSending] = useState(false);

  if (!sale) return null;

  const handlePrint = () => {
    const token = localStorage.getItem('token') || '';
    const printWindow = window.open(
      `/api/v1/pos/sale/${sale._id}/receipt?print=true&token=${encodeURIComponent(token)}`,
      '_blank'
    );
    if (printWindow) {
      printWindow.onload = () => setTimeout(() => printWindow.print(), 500);
    }
  };

  const handleDownload = () => {
    const token = localStorage.getItem('token') || '';
    window.open(
      `/api/v1/pos/sale/${sale._id}/receipt?download=true&token=${encodeURIComponent(token)}`,
      '_blank'
    );
  };

  const handleEmail = async () => {
    if (!email.trim()) {
      addToast({ type: 'error', title: 'Email Required', message: 'Enter a customer email address' });
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      addToast({ type: 'error', title: 'Invalid Email', message: 'Enter a valid email address' });
      return;
    }

    setSending(true);
    try {
      const res = await api.post(`/pos/sale/${sale._id}/email`, { email, type: 'receipt' });
      if (res.data?.success) {
        addToast({ type: 'success', title: 'Email Sent', message: `Receipt sent to ${email}` });
      } else {
        addToast({ type: 'error', title: 'Email Failed', message: res.data?.message || 'Could not send email' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to send receipt email' });
    }
    setSending(false);
  };

  return (
    <div className="space-y-4">
      {/* Sale Summary */}
      <div className="text-center p-4 bg-or-gold/10 rounded-lg">
        <svg className="w-12 h-12 mx-auto mb-2 text-or-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
        </svg>
        <div className="font-heading text-xl text-white uppercase">Sale Complete</div>
        <div className="text-sm text-or-gold-light mt-1">#{sale.saleNumber}</div>
        <div className="font-heading text-3xl text-white mt-2">
          {formatCurrency(sale.totalAmount || 0)}
        </div>
      </div>

      {/* Receipt Actions */}
      <div className="grid grid-cols-2 gap-3">
        <button
          onClick={handlePrint}
          className="flex flex-col items-center gap-2 p-4 rounded-lg bg-origin-slate border border-or-gold/20 hover:border-or-gold transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
          </svg>
          <span className="text-xs font-bold text-white uppercase">Print</span>
        </button>

        <button
          onClick={handleDownload}
          className="flex flex-col items-center gap-2 p-4 rounded-lg bg-origin-slate border border-or-gold/20 hover:border-or-gold transition-colors"
        >
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <span className="text-xs font-bold text-white uppercase">Download</span>
        </button>
      </div>

      {/* Email Receipt */}
      <div className="space-y-2">
        <label className="block text-sm font-semibold text-white">Email Receipt</label>
        <div className="flex gap-2">
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1 px-3 py-2 rounded-lg border border-or-gold/20 bg-white text-white outline-none focus:border-or-gold"
            placeholder="customer@email.com"
          />
          <Button variant="secondary" onClick={handleEmail} disabled={sending}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
        </div>
      </div>

      {/* Done */}
      <Button variant="primary" className="w-full" onClick={onClose}>
        New Sale
      </Button>
    </div>
  );
}
