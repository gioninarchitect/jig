// P36 — Global cart state: localStorage for anon, API sync for authenticated users
import { createContext, useContext, useState, useEffect, useCallback, useMemo } from 'react';
import api from '../services/api';
import { formatCurrency } from '../config';

const CartContext = createContext(null);

const STORAGE_KEY = 'pg_cart';

function loadLocalCart() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function saveLocalCart(items) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function CartProvider({ children }) {
  const [items, setItems] = useState(loadLocalCart);
  const [syncing, setSyncing] = useState(false);

  // Persist to localStorage on every change
  useEffect(() => {
    saveLocalCart(items);
  }, [items]);

  // Add item (or increment qty if already exists)
  const addItem = useCallback((product, quantity = 1, options = {}) => {
    setItems((prev) => {
      const key = `${product._id}_${options.size || ''}_${options.color || ''}`;
      const idx = prev.findIndex(
        (i) => i.productId === product._id && (i.size || '') === (options.size || '') && (i.color || '') === (options.color || '')
      );
      if (idx >= 0) {
        const updated = [...prev];
        updated[idx] = { ...updated[idx], quantity: updated[idx].quantity + quantity };
        return updated;
      }
      return [
        ...prev,
        {
          productId: product._id,
          name: product.name,
          price: product.price,
          image: product.images?.[0] || product.image || '',
          quantity,
          size: options.size || null,
          color: options.color || null,
          stock: product.inventory?.quantity ?? product.quantity ?? 99,
          _key: key,
        },
      ];
    });
  }, []);

  // Remove item by index
  const removeItem = useCallback((index) => {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Update quantity at index
  const updateQty = useCallback((index, quantity) => {
    if (quantity < 1) return;
    setItems((prev) => {
      const updated = [...prev];
      if (updated[index]) {
        updated[index] = { ...updated[index], quantity };
      }
      return updated;
    });
  }, []);

  // Clear entire cart
  const clearCart = useCallback(() => {
    setItems([]);
  }, []);

  // Sync localStorage cart to server after login
  const syncCartToServer = useCallback(async () => {
    const localItems = loadLocalCart();
    if (localItems.length === 0) return;
    setSyncing(true);
    try {
      await api.post('/cart/sync', { items: localItems });
    } catch {
      // Silent fail — local cart still works
    } finally {
      setSyncing(false);
    }
  }, []);

  // Computed values
  const subtotal = useMemo(() => {
    return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
  }, [items]);

  const itemCount = useMemo(() => {
    return items.reduce((count, item) => count + item.quantity, 0);
  }, [items]);

  const formattedSubtotal = useMemo(() => formatCurrency(subtotal), [subtotal]);

  const value = useMemo(
    () => ({
      items,
      addItem,
      removeItem,
      updateQty,
      clearCart,
      syncCartToServer,
      syncing,
      subtotal,
      itemCount,
      formattedSubtotal,
    }),
    [items, addItem, removeItem, updateQty, clearCart, syncCartToServer, syncing, subtotal, itemCount, formattedSubtotal]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
