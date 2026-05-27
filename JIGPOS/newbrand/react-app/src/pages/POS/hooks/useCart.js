// P21 — POS Cart Hook
// Cart state: items, quantities, totals, customer selection, purchase limits

import { useState, useCallback, useMemo } from 'react';
import api from '../../../services/api';
import { useToast } from '../../../components/ui/Toast';
import { VAT_RATE } from '../../../config';

export default function useCart() {
  const [items, setItems] = useState([]);
  const [customer, setCustomer] = useState(null); // null = walk-in
  const [purchaseLimit, setPurchaseLimit] = useState(null);
  const { addToast } = useToast();

  // ── Totals ───────────────────────────────────────────────────
  const totals = useMemo(() => {
    const subtotal = items.reduce((sum, item) => sum + item.price * item.quantity, 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;
    const itemCount = items.reduce((sum, item) => sum + item.quantity, 0);
    return { subtotal, vat, total, itemCount };
  }, [items]);

  // ── Add to Cart ──────────────────────────────────────────────
  const addItem = useCallback((product) => {
    const stock = product.inventory?.quantity || product.quantity || 0;
    if (stock <= 0) {
      addToast({ type: 'error', title: 'Out of Stock', message: `${product.name} is currently out of stock` });
      return;
    }

    setItems(prev => {
      const existing = prev.find(i => i._id === product._id);
      if (existing) {
        if (existing.quantity >= stock) {
          addToast({ type: 'warning', title: 'Stock Limit', message: `Only ${stock} units available` });
          return prev;
        }
        return prev.map(i => i._id === product._id ? { ...i, quantity: i.quantity + 1 } : i);
      }
      return [...prev, { ...product, quantity: 1 }];
    });

    addToast({ type: 'success', title: 'Added to Cart', message: `${product.name} added` });
  }, [addToast]);

  // ── Quantity Controls ────────────────────────────────────────
  const incrementQty = useCallback((index) => {
    setItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: item.quantity + 1 } : item));
  }, []);

  const decrementQty = useCallback((index) => {
    setItems(prev => {
      const item = prev[index];
      if (item.quantity <= 1) return prev.filter((_, i) => i !== index);
      return prev.map((it, i) => i === index ? { ...it, quantity: it.quantity - 1 } : it);
    });
  }, []);

  const updateQty = useCallback((index, qty) => {
    const val = parseInt(qty);
    if (!val || val <= 0) {
      setItems(prev => prev.filter((_, i) => i !== index));
    } else {
      setItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: val } : item));
    }
  }, []);

  const removeItem = useCallback((index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  }, []);

  const clearCart = useCallback(() => {
    setItems([]);
    setCustomer(null);
    setPurchaseLimit(null);
  }, []);

  // ── Customer Selection ───────────────────────────────────────
  const selectCustomer = useCallback(async (cust) => {
    setCustomer(cust);
    setPurchaseLimit(null);

    if (!cust) return; // walk-in

    try {
      const res = await api.get(`/patients/${cust._id}/limits`);
      if (res.data?.limits) {
        const limits = res.data.limits;
        const dayUsage = limits.currentDayUsage || 0;
        const dayLimit = limits.dailyLimit || 150;
        setPurchaseLimit({ dayUsage, dayLimit, exceeded: dayUsage >= dayLimit, warning: dayUsage >= dayLimit * 0.8 });
      }
    } catch {
      // No limits — not a Section 21 patient
    }
  }, []);

  const selectWalkIn = useCallback(() => {
    setCustomer(null);
    setPurchaseLimit(null);
  }, []);

  return {
    items,
    customer,
    purchaseLimit,
    totals,
    addItem,
    incrementQty,
    decrementQty,
    updateQty,
    removeItem,
    clearCart,
    selectCustomer,
    selectWalkIn,
  };
}
