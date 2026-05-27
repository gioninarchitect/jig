// P21 — POS Cash In/Out Modal
// Record cash movements (float top-ups, cash drops, petty cash)

import { useState } from 'react';
import { formatCurrency } from '../../config';
import Button from '../../components/ui/Button';

export default function CashInOut({ type, onSubmit, onClose }) {
  // type: 'in' | 'out'
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const isIn = type === 'in';

  const handleSubmit = async () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    if (!reason.trim()) return;

    setSubmitting(true);
    const ok = await onSubmit(val, reason);
    setSubmitting(false);
    if (ok) onClose();
  };

  const QUICK_AMOUNTS = isIn ? [100, 200, 500] : [50, 100, 200];
  const REASONS = isIn
    ? ['Float top-up', 'Change from bank', 'Cash from safe']
    : ['Cash drop to safe', 'Petty cash', 'Bank deposit run', 'Change for customer'];

  return (
    <div className="space-y-4">
      {/* Header icon */}
      <div className="text-center">
        <div className={`inline-flex items-center justify-center w-12 h-12 rounded-full ${isIn ? 'bg-or-gold/10' : 'bg-origin-red/10'}`}>
          <svg className={`w-6 h-6 ${isIn ? 'text-or-gold' : 'text-origin-red'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            {isIn
              ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
            }
          </svg>
        </div>
        <p className="text-xs text-or-gold-light mt-1">
          {isIn ? 'Add cash to the till drawer' : 'Remove cash from the till drawer'}
        </p>
      </div>

      {/* Amount */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Amount</label>
        <div className="flex items-center gap-2">
          <span className="font-heading text-lg text-white">R</span>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-or-gold/20 bg-white text-white text-lg font-heading outline-none focus:border-or-gold"
            placeholder="0.00"
            step="0.01"
            min="0"
            autoFocus
          />
        </div>
        {/* Quick amounts */}
        <div className="flex gap-2 mt-2">
          {QUICK_AMOUNTS.map(qa => (
            <button
              key={qa}
              onClick={() => setAmount(String(qa))}
              className="px-3 py-1 rounded-full bg-origin-slate border border-or-gold/20 text-xs font-bold text-white hover:border-or-gold transition-colors"
            >
              {formatCurrency(qa)}
            </button>
          ))}
        </div>
      </div>

      {/* Reason */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Reason</label>
        <input
          type="text"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-or-gold/20 bg-white text-white outline-none focus:border-or-gold"
          placeholder="Reason for cash movement..."
        />
        {/* Quick reasons */}
        <div className="flex flex-wrap gap-1 mt-2">
          {REASONS.map(r => (
            <button
              key={r}
              onClick={() => setReason(r)}
              className={`px-2 py-1 rounded text-xs transition-colors ${reason === r ? 'bg-or-gold text-white' : 'bg-origin-slate text-or-gold-light hover:text-white'}`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Submit */}
      <Button
        variant={isIn ? 'primary' : 'danger'}
        className="w-full"
        onClick={handleSubmit}
        disabled={submitting || !parseFloat(amount) || !reason.trim()}
      >
        {submitting ? 'Recording...' : `${isIn ? 'Add' : 'Remove'} ${amount ? formatCurrency(parseFloat(amount) || 0) : 'Cash'}`}
      </Button>

      <button onClick={onClose} className="w-full py-2 text-sm text-or-gold-light hover:text-origin-red transition-colors">
        Cancel
      </button>
    </div>
  );
}
