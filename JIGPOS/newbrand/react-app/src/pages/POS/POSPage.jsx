// P21 — POS Page (Main Orchestrator)
// Wires together: ProductBrowser, Cart, CustomerSearch, PaymentProcessor,
// ReceiptGenerator, TillManager, CashInOut, ShiftManager + hooks

import { useState, useCallback } from 'react';
import POSLayout from '../../layouts/POSLayout';
import Modal from '../../components/ui/Modal';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../components/ui/Toast';
import { formatCurrency } from '../../config';
import { useDBCWorldModel } from '../../world-model/WorldModelContext';
import { SALE_COMPLETED, CASH_IN_OUT } from '../../world-model/types';

// Hooks
import useCart from './hooks/useCart';
import useTill from './hooks/useTill';
import useBarcode from './hooks/useBarcode';

// Components
import ProductBrowser from './ProductBrowser';
import Cart from './Cart';
import CustomerSearch from './CustomerSearch';
import ShiftManager from './ShiftManager';
import PaymentProcessor from './PaymentProcessor';
import ReceiptGenerator from './ReceiptGenerator';
import TillManager from './TillManager';
import CashInOut from './CashInOut';

const TRACKS = [
  { key: 'lifestyle', label: 'Lifestyle' },
  { key: 'section21', label: 'Section 21' },
];

export default function POSPage() {
  const { user, logout } = useAuth();
  const { addToast } = useToast();
  const { emitEvent } = useDBCWorldModel();

  // Core hooks
  const cart = useCart();
  const till = useTill();

  // Track selector (lifestyle vs Section 21)
  const [track, setTrack] = useState('lifestyle');

  // Modal state
  const [modal, setModal] = useState(null);
  // 'payment' | 'receipt' | 'tillOpen' | 'tillClose' | 'cashIn' | 'cashOut' | null
  const [completedSale, setCompletedSale] = useState(null);

  const branchId = till.branchId;

  // ── Barcode Scanner ─────────────────────────────────────────────
  useBarcode((barcode) => {
    // TODO: P22 can enhance with barcode-to-product lookup
    addToast({ type: 'info', title: 'Barcode Scanned', message: barcode });
  });

  // ── Checkout Flow ───────────────────────────────────────────────
  const handleCheckout = useCallback(() => {
    if (cart.items.length === 0) {
      addToast({ type: 'error', title: 'Cart Empty', message: 'Add products before checkout' });
      return;
    }
    if (!till.session) {
      addToast({ type: 'error', title: 'No Active Shift', message: 'Open a till first' });
      return;
    }
    if (cart.purchaseLimit?.exceeded) {
      addToast({ type: 'error', title: 'Purchase Limit', message: 'Patient has reached daily limit' });
      return;
    }
    setModal('payment');
  }, [cart.items.length, cart.purchaseLimit, till.session, addToast]);

  // ── Sale Complete ───────────────────────────────────────────────
  const handleSaleComplete = useCallback((sale) => {
    setCompletedSale(sale);
    setModal('receipt');
    cart.clearCart();

    // Emit World Model event
    emitEvent(SALE_COMPLETED, branchId, {
      saleId: sale._id,
      saleNumber: sale.saleNumber,
      total: sale.totalAmount,
      items: sale.items?.length || 0,
      paymentMethod: sale.paymentMethod || 'split',
      customer: sale.customer || null,
      track,
    });
  }, [cart, branchId, track, emitEvent]);

  // ── Receipt Done → New Sale ─────────────────────────────────────
  const handleNewSale = useCallback(() => {
    setCompletedSale(null);
    setModal(null);
  }, []);

  // ── Till Open/Close with World Model events ─────────────────────
  const handleTillModalClose = useCallback(() => {
    setModal(null);
    // Refresh till status after open/close
    till.checkTillStatus();
  }, [till]);

  // ── Cash In/Out handlers ────────────────────────────────────────
  const handleCashIn = useCallback(async (amount, reason) => {
    const ok = await till.cashIn(amount, reason);
    if (ok) {
      emitEvent(CASH_IN_OUT, branchId, { type: 'in', amount, reason });
    }
    return ok;
  }, [till, branchId, emitEvent]);

  const handleCashOut = useCallback(async (amount, reason) => {
    const ok = await till.cashOut(amount, reason);
    if (ok) {
      emitEvent(CASH_IN_OUT, branchId, { type: 'out', amount, reason });
    }
    return ok;
  }, [till, branchId, emitEvent]);

  // ── Header — Odyssey navy style ─────────────────────────────────
  const header = (
    <>
      <div className="flex items-center gap-4">
        <span className="font-heading text-2xl uppercase" style={{ letterSpacing: '2px' }}>POS</span>
        <span className="text-sm opacity-90 flex items-center gap-1.5">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
          {user?.primaryBranch?.name || 'No Branch'}
        </span>

        {/* Track Selector — Odyssey gold active tabs */}
        <div className="flex gap-2 ml-2">
          {TRACKS.map(t => (
            <button
              key={t.key}
              onClick={() => setTrack(t.key)}
              className="px-4 py-1.5 rounded-lg font-heading text-sm uppercase transition-all"
              style={track === t.key
                ? { background: 'linear-gradient(135deg, #D97706 0%, #B8922D 100%)', color: '#1a1a2e', letterSpacing: '1px' }
                : { background: '#334155', color: 'white', letterSpacing: '1px' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Shift Manager */}
        <ShiftManager
          shift={till.shift}
          onBreak={till.onBreak}
          onClockIn={till.clockIn}
          onClockOut={till.clockOut}
          onToggleBreak={till.toggleBreak}
        />

        {/* Till Status */}
        <button
          onClick={() => setModal(till.session ? 'tillClose' : 'tillOpen')}
          className="px-3 py-1.5 rounded-lg text-xs font-bold transition-colors"
          style={till.session
            ? { background: 'rgba(34,197,94,0.8)', color: 'white' }
            : { background: 'rgba(166,52,41,0.8)', color: 'white' }
          }
        >
          {till.session ? 'Till Open' : 'Open Till'}
        </button>

        {/* Cash In/Out (only when till is open) */}
        {till.session && (
          <div className="flex gap-1">
            <button
              onClick={() => setModal('cashIn')}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
              title="Cash In"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </button>
            <button
              onClick={() => setModal('cashOut')}
              className="flex items-center justify-center rounded-lg transition-colors"
              style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.15)', color: 'white', border: 'none' }}
              title="Cash Out"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 10l7-7m0 0l7 7m-7-7v18" />
              </svg>
            </button>
          </div>
        )}

        {/* User + Logout */}
        <span className="text-sm flex items-center gap-2">
          <svg className="w-4 h-4 opacity-70" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg>
          {user?.firstName}
        </span>
        <button onClick={logout} className="hover:underline text-xs" style={{ color: '#D97706' }}>Logout</button>
      </div>
    </>
  );

  return (
    <POSLayout header={header}>
      {/* Odyssey layout: Cart LEFT, Products RIGHT (flex-row-reverse) */}
      <div className="flex h-full flex-row-reverse">
        {/* RIGHT: Product Browser */}
        <div className="flex-1 p-4 overflow-hidden flex flex-col" style={{ background: '#1a1a2e' }}>
          {/* Customer Search */}
          <div className="mb-3">
            <CustomerSearch
              customer={cart.customer}
              purchaseLimit={cart.purchaseLimit}
              onSelectCustomer={cart.selectCustomer}
              onSelectWalkIn={cart.selectWalkIn}
            />
          </div>

          {/* Products */}
          <div className="flex-1 overflow-hidden">
            <ProductBrowser track={track} onAddToCart={cart.addItem} />
          </div>
        </div>

        {/* LEFT: Cart Panel (380px fixed, dark navy) */}
        <div className="flex flex-col" style={{ width: 380, background: '#0f172a', borderRight: '3px solid #D97706', boxShadow: '4px 0 16px rgba(0,0,0,0.2)' }}>
          <Cart
            items={cart.items}
            totals={cart.totals}
            onIncrement={cart.incrementQty}
            onDecrement={cart.decrementQty}
            onUpdateQty={cart.updateQty}
            onRemove={cart.removeItem}
            onClear={cart.clearCart}
            onCheckout={handleCheckout}
          />
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────── */}

      {/* Payment Modal */}
      <Modal
        open={modal === 'payment'}
        onClose={() => setModal(null)}
        title="Payment"
        size="md"
      >
        <PaymentProcessor
          total={cart.totals.total}
          items={cart.items}
          track={track}
          customer={cart.customer}
          branchId={branchId}
          onSaleComplete={handleSaleComplete}
          onClose={() => setModal(null)}
        />
      </Modal>

      {/* Receipt Modal */}
      <Modal
        open={modal === 'receipt'}
        onClose={handleNewSale}
        title="Receipt"
        size="md"
      >
        <ReceiptGenerator
          sale={completedSale}
          onClose={handleNewSale}
        />
      </Modal>

      {/* Open/Close Till Modal */}
      <Modal
        open={modal === 'tillOpen' || modal === 'tillClose'}
        onClose={() => setModal(null)}
        title={till.session ? 'Close Shift' : 'Open Till'}
        size={till.session ? 'lg' : 'md'}
      >
        <TillManager
          session={modal === 'tillClose' ? till.session : null}
          till={till}
          onClose={handleTillModalClose}
        />
      </Modal>

      {/* Cash In Modal */}
      <Modal
        open={modal === 'cashIn'}
        onClose={() => setModal(null)}
        title="Cash In"
        size="sm"
      >
        <CashInOut
          type="in"
          onSubmit={handleCashIn}
          onClose={() => setModal(null)}
        />
      </Modal>

      {/* Cash Out Modal */}
      <Modal
        open={modal === 'cashOut'}
        onClose={() => setModal(null)}
        title="Cash Out"
        size="sm"
      >
        <CashInOut
          type="out"
          onSubmit={handleCashOut}
          onClose={() => setModal(null)}
        />
      </Modal>
    </POSLayout>
  );
}
