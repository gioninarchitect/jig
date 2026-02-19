// P21 — POS Payment Processor
// Cash, Card (Speedpoint), EFT, Split payment tabs
// Change calculation for cash, reference entry for card

import { useState, useMemo, useCallback } from 'react';
import api from '../../services/api';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../config';
import Button from '../../components/ui/Button';

const PAYMENT_METHODS = ['cash', 'card', 'eft', 'voucher', 'wellness_points'];

export default function PaymentProcessor({ total, items, track, customer, branchId, onSaleComplete, onClose }) {
  const { addToast } = useToast();
  const [tab, setTab] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  // Cash state
  const [cashTendered, setCashTendered] = useState('');
  const cashChange = useMemo(() => {
    const tendered = parseFloat(cashTendered) || 0;
    return tendered - total;
  }, [cashTendered, total]);

  // Card state
  const [cardReference, setCardReference] = useState('');
  const [cardNotes, setCardNotes] = useState('');

  // Split state
  const [splits, setSplits] = useState([{ method: 'cash', amount: 0 }]);
  const splitPaid = splits.reduce((s, p) => s + (parseFloat(p.amount) || 0), 0);
  const splitRemaining = total - splitPaid;

  // ── Complete Sale ──────────────────────────────────────────
  const completeSale = useCallback(async (paymentMethod, reference = null, paymentNotes = null, payments = null) => {
    setSubmitting(true);

    const saleData = {
      branchId,
      track,
      items: items.map(item => ({
        productId: item._id,
        name: item.name,
        sku: item.sku || '',
        quantity: item.quantity,
        unitPrice: item.price,
      })),
      customer: customer?._id || null,
      orderType: 'walk-in',
    };

    if (payments) {
      saleData.payments = payments;
    } else {
      saleData.paymentMethod = paymentMethod;
      saleData.paymentReference = reference;
      saleData.cardReference = paymentMethod === 'card' ? reference : null;
      saleData.paymentNotes = paymentNotes;
    }

    try {
      const res = await api.post('/pos/sale', saleData);
      if (res.data?.success) {
        onSaleComplete(res.data.sale);
      } else {
        addToast({ type: 'error', title: 'Sale Error', message: res.data?.message || 'Failed to complete sale' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Error completing sale. Please try again.' });
    }
    setSubmitting(false);
  }, [branchId, track, items, customer, onSaleComplete, addToast]);

  // ── Cash Payment ───────────────────────────────────────────
  const handleCash = () => {
    const tendered = parseFloat(cashTendered) || 0;
    if (tendered < total) {
      addToast({ type: 'error', title: 'Insufficient Cash', message: `Need ${formatCurrency(total)}, received ${formatCurrency(tendered)}` });
      return;
    }
    completeSale('cash');
  };

  // ── Card Payment ───────────────────────────────────────────
  const handleCard = () => {
    if (!cardReference.trim()) {
      addToast({ type: 'error', title: 'Reference Required', message: 'Enter the Speedpoint reference number' });
      return;
    }
    completeSale('card', cardReference, cardNotes);
  };

  // ── EFT Payment ────────────────────────────────────────────
  const handleEFT = () => {
    completeSale('eft', `EFT-${Date.now()}`);
  };

  // ── Split Payment ──────────────────────────────────────────
  const addSplit = () => setSplits(prev => [...prev, { method: 'card', amount: 0 }]);
  const removeSplit = (i) => setSplits(prev => prev.filter((_, idx) => idx !== i));
  const updateSplitMethod = (i, method) => setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, method } : s));
  const updateSplitAmount = (i, amount) => setSplits(prev => prev.map((s, idx) => idx === i ? { ...s, amount: parseFloat(amount) || 0 } : s));

  const handleSplit = () => {
    if (splitPaid < total) {
      addToast({ type: 'error', title: 'Insufficient Payment', message: 'Total payments must cover the order amount' });
      return;
    }
    const payments = splits.filter(p => p.amount > 0).map(p => ({
      method: p.method,
      amount: p.amount,
      reference: `${p.method.toUpperCase()}-${Date.now()}`,
      status: 'completed',
    }));
    completeSale(null, null, null, payments);
  };

  const TABS = [
    { key: 'cash', label: 'Cash' },
    { key: 'card', label: 'Card' },
    { key: 'eft', label: 'EFT' },
    { key: 'split', label: 'Split' },
  ];

  return (
    <div className="space-y-4">
      {/* Total */}
      <div className="text-center p-3 bg-jig-slate rounded-lg">
        <div className="text-xs text-jig-purple-light uppercase">Total Due</div>
        <div className="font-heading text-3xl text-white">{formatCurrency(total)}</div>
      </div>

      {/* Payment Tabs */}
      <div className="flex gap-1 bg-jig-purple/5 rounded-lg p-1">
        {TABS.map(t => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded text-xs font-bold uppercase transition-colors ${
              tab === t.key ? 'bg-jig-purple text-white' : 'text-jig-purple-light hover:bg-jig-purple/10'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Cash Tab */}
      {tab === 'cash' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Cash Tendered</label>
            <div className="flex items-center gap-2">
              <span className="font-heading text-lg text-white">R</span>
              <input
                type="number"
                value={cashTendered}
                onChange={(e) => setCashTendered(e.target.value)}
                className="w-full px-3 py-3 rounded-lg border border-jig-purple/20 bg-white text-white text-lg font-heading outline-none focus:border-jig-amber"
                placeholder="0.00"
                autoFocus
              />
            </div>
          </div>
          {cashTendered && (
            <div className={`p-3 rounded-lg text-center ${cashChange >= 0 ? 'bg-jig-purple/10' : 'bg-jig-red/10'}`}>
              <div className="text-xs text-jig-purple-light uppercase">Change</div>
              <div className={`font-heading text-2xl ${cashChange >= 0 ? 'text-jig-purple' : 'text-jig-red'}`}>
                {formatCurrency(Math.abs(cashChange))}
              </div>
            </div>
          )}
          <Button variant="primary" className="w-full" onClick={handleCash} disabled={submitting || (parseFloat(cashTendered) || 0) < total}>
            {submitting ? 'Processing...' : 'Complete Cash Payment'}
          </Button>
        </div>
      )}

      {/* Card Tab */}
      {tab === 'card' && (
        <div className="space-y-3">
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Speedpoint Reference</label>
            <input
              type="text"
              value={cardReference}
              onChange={(e) => setCardReference(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-jig-purple/20 bg-white text-white outline-none focus:border-jig-amber"
              placeholder="Enter reference from card machine receipt"
              autoFocus
            />
          </div>
          <div>
            <label className="block text-sm font-semibold text-white mb-1">Notes (optional)</label>
            <input
              type="text"
              value={cardNotes}
              onChange={(e) => setCardNotes(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-jig-purple/20 bg-white text-white outline-none"
              placeholder="Additional notes..."
            />
          </div>
          <Button variant="primary" className="w-full" onClick={handleCard} disabled={submitting || !cardReference.trim()}>
            {submitting ? 'Processing...' : 'Complete Card Payment'}
          </Button>
        </div>
      )}

      {/* EFT Tab */}
      {tab === 'eft' && (
        <div className="space-y-3">
          <div className="p-3 bg-jig-slate rounded-lg text-sm text-white">
            <div className="font-bold mb-2">Bank Details</div>
            <div>Bank: Standard Bank</div>
            <div>Account: JIG Craft Cannabis</div>
            <div>Number: 123456789</div>
            <div>Branch: 051001</div>
            <div className="mt-1 font-bold text-jig-amber-dark">Reference: SALE-{Date.now().toString().slice(-6)}</div>
          </div>
          <p className="text-xs text-jig-purple-light text-center">Payment will be pending admin approval</p>
          <Button variant="primary" className="w-full" onClick={handleEFT} disabled={submitting}>
            {submitting ? 'Processing...' : 'Submit EFT Payment'}
          </Button>
        </div>
      )}

      {/* Split Tab */}
      {tab === 'split' && (
        <div className="space-y-3">
          {splits.map((split, i) => (
            <div key={i} className="flex items-center gap-2">
              <select
                value={split.method}
                onChange={(e) => updateSplitMethod(i, e.target.value)}
                className="flex-1 px-2 py-2 rounded-lg border border-jig-purple/20 bg-white text-white text-sm outline-none"
              >
                {PAYMENT_METHODS.map(m => (
                  <option key={m} value={m}>{m.charAt(0).toUpperCase() + m.slice(1).replace('_', ' ')}</option>
                ))}
              </select>
              <div className="flex items-center gap-1">
                <span className="text-sm text-white">R</span>
                <input
                  type="number"
                  value={split.amount || ''}
                  onChange={(e) => updateSplitAmount(i, e.target.value)}
                  className="w-24 px-2 py-2 rounded-lg border border-jig-purple/20 bg-white text-white text-sm outline-none"
                  placeholder="0.00"
                  step="0.01"
                />
              </div>
              {splits.length > 1 && (
                <button onClick={() => removeSplit(i)} className="p-1 rounded text-jig-red hover:bg-jig-red/10">&times;</button>
              )}
            </div>
          ))}

          <button onClick={addSplit} className="w-full py-2 rounded-lg border border-dashed border-jig-purple/20 text-jig-purple-light text-sm hover:border-jig-amber/50 hover:text-jig-amber transition-colors">
            + Add Another Payment
          </button>

          <div className={`p-3 rounded-lg text-center ${splitRemaining <= 0 ? (splitRemaining < 0 ? 'bg-blue-50' : 'bg-jig-purple/10') : 'bg-jig-red/10'}`}>
            <div className="text-xs uppercase text-jig-purple-light">
              {splitRemaining <= 0 ? (splitRemaining < 0 ? 'Overpaid' : 'Fully Paid') : 'Remaining'}
            </div>
            <div className="font-heading text-xl text-white">{formatCurrency(Math.abs(splitRemaining))}</div>
          </div>

          {splitRemaining <= 0 && (
            <Button variant="primary" className="w-full" onClick={handleSplit} disabled={submitting}>
              {submitting ? 'Processing...' : 'Complete Split Payment'}
            </Button>
          )}
        </div>
      )}

      {/* Cancel */}
      <button onClick={onClose} className="w-full py-2 text-sm text-jig-purple-light hover:text-jig-red transition-colors">
        Cancel
      </button>
    </div>
  );
}
