// P22 — Aggregated approval queue for 360View
// Fetches pending approvals from all domains: POs, cashups, stocktakes, payments, batches

import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../../services/api';

const POLL_INTERVAL = 30000; // 30s refresh

const APPROVAL_SOURCES = [
  {
    key: 'purchaseOrders',
    label: 'Purchase Orders',
    endpoint: '/purchase-orders?status=pending&limit=20',
    extract: (res) => (res.data?.purchaseOrders || res.data?.data || []).map(po => ({
      id: po._id,
      type: 'purchase_order',
      title: `PO #${po.poNumber || po._id.slice(-6)}`,
      subtitle: po.supplier?.name || 'Unknown Supplier',
      amount: po.totalAmount || po.grandTotal || 0,
      branch: po.deliveryBranch?.name || '',
      priority: po.priority || 'normal',
      createdAt: po.createdAt,
      raw: po,
    })),
    approveEndpoint: (id) => `/purchase-orders/${id}/approve`,
    rejectEndpoint: (id) => `/purchase-orders/${id}/reject`,
  },
  {
    key: 'transfers',
    label: 'Transfers',
    endpoint: '/stock-transfers?status=pending&limit=20',
    extract: (res) => (res.data?.transfers || res.data?.data || []).map(t => {
      const totalItems = (t.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
      const totalValue = (t.items || []).reduce((sum, i) => sum + ((i.unitCost || 0) * (i.quantity || 0)), 0);
      return {
        id: t._id,
        type: 'transfer',
        title: `Transfer ${t.transferNumber || t._id.slice(-6)}`,
        subtitle: `${t.fromBranch?.name || 'HQ'} → ${t.toBranch?.name || 'Branch'}  (${totalItems} items)`,
        amount: totalValue || null,
        branch: t.toBranch?.name || '',
        priority: t.priority || 'normal',
        createdAt: t.createdAt,
        raw: t,
      };
    }),
    approveEndpoint: (id) => `/stock-transfers/${id}/approve`,
    rejectEndpoint: (id) => `/stock-transfers/${id}/reject`,
  },
  {
    key: 'batches',
    label: 'Batch QA',
    endpoint: '/batches?qaStatus=pending&limit=20',
    extract: (res) => (res.data?.batches || res.data?.data || []).map(b => ({
      id: b._id,
      type: 'batch',
      title: `Batch ${b.batchId || b._id.slice(-6)}`,
      subtitle: b.product?.name || b.productName || 'Unknown Product',
      amount: null,
      branch: b.currentLocation?.name || '',
      priority: 'normal',
      createdAt: b.createdAt,
      raw: b,
    })),
    approveEndpoint: (id) => `/batches/${id}/qa-approve`,
    rejectEndpoint: (id) => `/batches/${id}/qa-reject`,
  },
  {
    key: 'cashups',
    label: 'Cashups',
    endpoint: '/pos/cashup/pending',
    extract: (res) => (res.data?.cashups || res.data?.data || []).map(c => ({
      id: c._id,
      type: 'cashup',
      title: `Cashup ${new Date(c.date || c.createdAt).toLocaleDateString('en-ZA')}`,
      subtitle: c.branch?.name || c.tillNumber || '',
      amount: c.totalSales || 0,
      branch: c.branch?.name || '',
      priority: Math.abs(c.variance || 0) > 50 ? 'high' : 'normal',
      createdAt: c.createdAt,
      raw: c,
    })),
    approveEndpoint: (id) => `/pos/cashup/${id}/approve`,
  },
  {
    key: 'stocktakes',
    label: 'Stock Takes',
    endpoint: '/stocktake/pending',
    extract: (res) => (res.data?.sessions || res.data?.data || []).map(s => ({
      id: s._id,
      type: 'stocktake',
      title: `Stocktake ${s.sessionNumber || s._id.slice(-6)}`,
      subtitle: s.branch?.name || '',
      amount: null,
      branch: s.branch?.name || '',
      priority: 'normal',
      createdAt: s.createdAt,
      raw: s,
    })),
    approveEndpoint: (id) => `/stocktake/session/${id}/approve`,
  },
  {
    key: 'payments',
    label: 'Pending Payments',
    endpoint: '/pos/payments/pending',
    extract: (res) => (res.data?.payments || res.data?.data || []).map(p => ({
      id: p._id || p.saleId,
      type: 'payment',
      title: `Payment ${p.saleNumber || p._id?.slice(-6) || ''}`,
      subtitle: p.paymentMethod || 'EFT',
      amount: p.amount || p.totalAmount || 0,
      branch: p.branch?.name || '',
      priority: 'normal',
      createdAt: p.createdAt,
      raw: p,
    })),
    approveEndpoint: (id) => `/pos/payment/${id}/approve`,
  },
];

export default function useApprovals() {
  const [approvals, setApprovals] = useState([]);
  const [counts, setCounts] = useState({});
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef(null);

  const load = useCallback(async () => {
    const results = await Promise.allSettled(
      APPROVAL_SOURCES.map(src =>
        api.get(src.endpoint).then(res => ({
          key: src.key,
          items: src.extract(res),
        })).catch(() => ({ key: src.key, items: [] }))
      )
    );

    const all = [];
    const newCounts = {};

    results.forEach(r => {
      if (r.status === 'fulfilled') {
        const { key, items } = r.value;
        newCounts[key] = items.length;
        all.push(...items);
      }
    });

    // Sort: critical first, then by date (newest first)
    all.sort((a, b) => {
      const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
      const pDiff = (priorityOrder[a.priority] || 2) - (priorityOrder[b.priority] || 2);
      if (pDiff !== 0) return pDiff;
      return new Date(b.createdAt) - new Date(a.createdAt);
    });

    setApprovals(all);
    setCounts(newCounts);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    intervalRef.current = setInterval(load, POLL_INTERVAL);
    return () => clearInterval(intervalRef.current);
  }, [load]);

  const totalCount = approvals.length;

  const findSource = useCallback((itemType) => {
    const typeToKey = {
      purchase_order: 'purchaseOrders',
      transfer: 'transfers',
      batch: 'batches',
      cashup: 'cashups',
      stocktake: 'stocktakes',
      payment: 'payments',
    };
    return APPROVAL_SOURCES.find(s => s.key === typeToKey[itemType]);
  }, []);

  const approve = useCallback(async (item, notes = '') => {
    const source = findSource(item.type);
    if (!source?.approveEndpoint) return false;

    try {
      const res = await api.post(source.approveEndpoint(item.id), { notes });
      if (res.data?.success) {
        await load();
        return true;
      }
    } catch { /* handled by caller */ }
    return false;
  }, [load, findSource]);

  const reject = useCallback(async (item, reason = '') => {
    const source = findSource(item.type);
    if (!source?.rejectEndpoint) return false;

    try {
      const res = await api.post(source.rejectEndpoint(item.id), { reason });
      if (res.data?.success) {
        await load();
        return true;
      }
    } catch { /* handled by caller */ }
    return false;
  }, [load, findSource]);

  return { approvals, counts, totalCount, loading, approve, reject, refresh: load };
}
