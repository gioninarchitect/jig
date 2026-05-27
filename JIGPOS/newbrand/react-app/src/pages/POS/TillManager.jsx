// P21 — POS Till Manager
// Open/close modals, SA denomination grid, variance display

import { useState } from 'react';
import Modal from '../../components/ui/Modal';
import Button from '../../components/ui/Button';
import { DENOMINATIONS } from './hooks/useTill';
import { formatCurrency } from '../../config';

export default function TillManager({ session, till, onClose }) {
  // till = useTill() return value

  if (!session) {
    return <OpenTillModal till={till} onClose={onClose} />;
  }
  return <CloseTillModal session={session} till={till} onClose={onClose} />;
}

// ── Open Till Modal ─────────────────────────────────────────────

function OpenTillModal({ till, onClose }) {
  const [openingFloat, setOpeningFloat] = useState(500);
  const [tillNumber, setTillNumber] = useState('TILL-01');
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleOpen = async () => {
    setSubmitting(true);
    const ok = await till.openTill(openingFloat, tillNumber, notes);
    setSubmitting(false);
    if (ok) onClose();
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Opening Float</label>
        <div className="flex items-center gap-2">
          <span className="text-white font-heading text-lg">R</span>
          <input
            type="number"
            value={openingFloat}
            onChange={(e) => setOpeningFloat(parseFloat(e.target.value) || 0)}
            className="w-full px-3 py-2 rounded-lg border border-or-gold/20 bg-white text-white outline-none focus:border-or-gold focus:ring-2 focus:ring-or-gold/20"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Till Number</label>
        <select
          value={tillNumber}
          onChange={(e) => setTillNumber(e.target.value)}
          className="w-full px-3 py-2 rounded-lg border border-or-gold/20 bg-white text-white outline-none"
        >
          <option value="TILL-01">TILL-01</option>
          <option value="TILL-02">TILL-02</option>
          <option value="TILL-03">TILL-03</option>
        </select>
      </div>
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Notes (optional)</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-or-gold/20 bg-white text-white outline-none resize-none"
          placeholder="Opening notes..."
        />
      </div>
      <Button variant="primary" className="w-full" onClick={handleOpen} disabled={submitting}>
        {submitting ? 'Opening...' : 'Open Till'}
      </Button>
    </div>
  );
}

// ── Close Till Modal ────────────────────────────────────────────

function CloseTillModal({ session, till, onClose }) {
  const [closingNotes, setClosingNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleClose = async () => {
    setSubmitting(true);
    const result = await till.closeTill(closingNotes);
    setSubmitting(false);
    if (result) onClose();
  };

  const varianceAbs = Math.abs(till.variance);
  const varianceColor = till.variance === 0
    ? 'text-or-gold'
    : till.variance > 0
      ? 'text-blue-500'
      : 'text-origin-red';
  const needsApproval = varianceAbs > 50;

  return (
    <div className="space-y-4">
      {/* Session Summary */}
      <div className="grid grid-cols-2 gap-3 p-3 bg-origin-slate rounded-lg">
        <div>
          <div className="text-xs text-or-gold-light">Opened At</div>
          <div className="font-heading text-sm text-white">{new Date(session.openedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}</div>
        </div>
        <div>
          <div className="text-xs text-or-gold-light">Transactions</div>
          <div className="font-heading text-sm text-white">{session.transactionCount || 0}</div>
        </div>
        <div>
          <div className="text-xs text-or-gold-light">Total Sales</div>
          <div className="font-heading text-sm text-white">{formatCurrency(session.totalSales || 0)}</div>
        </div>
        <div>
          <div className="text-xs text-or-gold-light">Cash Sales</div>
          <div className="font-heading text-sm text-white">{formatCurrency(session.totalCash || 0)}</div>
        </div>
      </div>

      {/* Denomination Grid */}
      <div>
        <h4 className="font-heading text-sm text-white uppercase mb-2">Count Cash</h4>
        <div className="space-y-1.5">
          {DENOMINATIONS.map(d => {
            const lineTotal = d.value * (till.denomCounts[d.key] || 0);
            return (
              <div key={d.key} className="flex items-center gap-2">
                <span className="w-12 text-right text-xs font-bold text-white">{d.label}</span>
                <span className="text-xs text-or-gold-light">&times;</span>
                <input
                  type="number"
                  min="0"
                  value={till.denomCounts[d.key] || ''}
                  onChange={(e) => till.setDenomCount(d.key, e.target.value)}
                  className="w-16 px-2 py-1 rounded border border-or-gold/20 bg-white text-white text-sm text-center outline-none focus:border-or-gold"
                  placeholder="0"
                />
                <span className="text-xs text-or-gold-light">=</span>
                <span className="flex-1 text-right text-xs font-semibold text-white">{formatCurrency(lineTotal)}</span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cash Summary */}
      <div className={`p-3 rounded-lg border ${needsApproval ? 'bg-or-gold/10 border-or-gold/30' : 'bg-origin-slate border-or-gold/10'}`}>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-or-gold-light">Expected Cash</span>
          <span className="font-heading text-white">{formatCurrency(till.expectedCash)}</span>
        </div>
        <div className="flex justify-between text-sm mb-1">
          <span className="text-or-gold-light">Actual Cash</span>
          <span className="font-heading text-white">{formatCurrency(till.actualCash)}</span>
        </div>
        <div className="flex justify-between text-sm pt-2 border-t border-or-gold/10">
          <span className="font-bold text-white">Variance</span>
          <span className={`font-heading text-lg ${varianceColor}`}>
            {till.variance > 0 ? '+' : ''}{formatCurrency(till.variance)}
          </span>
        </div>
        {needsApproval && (
          <div className="mt-2 p-2 rounded bg-or-gold/20 text-xs text-or-gold-dark font-semibold text-center">
            Variance exceeds R50 — Manager approval will be required
          </div>
        )}
      </div>

      {/* Closing Notes */}
      <div>
        <label className="block text-sm font-semibold text-white mb-1">Closing Notes</label>
        <textarea
          value={closingNotes}
          onChange={(e) => setClosingNotes(e.target.value)}
          rows={2}
          className="w-full px-3 py-2 rounded-lg border border-or-gold/20 bg-white text-white outline-none resize-none"
          placeholder="Closing notes..."
        />
      </div>

      <Button variant="danger" className="w-full" onClick={handleClose} disabled={submitting}>
        {submitting ? 'Closing...' : 'Close Shift'}
      </Button>
    </div>
  );
}
