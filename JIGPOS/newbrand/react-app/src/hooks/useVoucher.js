// P39 — Voucher validation hook
import { useState, useCallback } from 'react';
import api from '../services/api';

export function useVoucher() {
  const [discount, setDiscount] = useState(0);
  const [voucherCode, setVoucherCode] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const validateVoucher = useCallback(async (code, cartTotal, cartItems) => {
    if (!code.trim()) {
      setError('Please enter a voucher code.');
      return 0;
    }
    setLoading(true);
    setError('');
    try {
      const res = await api.post('/vouchers/validate', {
        code: code.trim(),
        cartTotal,
        cartItems,
      });
      const disc = res.data.discount || res.data.amount || 0;
      setDiscount(disc);
      setVoucherCode(code.trim());
      return disc;
    } catch (err) {
      const msg = err.response?.data?.message || 'Invalid or expired voucher.';
      setError(msg);
      setDiscount(0);
      setVoucherCode('');
      return 0;
    } finally {
      setLoading(false);
    }
  }, []);

  const clearVoucher = useCallback(() => {
    setDiscount(0);
    setVoucherCode('');
    setError('');
  }, []);

  return { discount, voucherCode, error, loading, validateVoucher, clearVoucher };
}
