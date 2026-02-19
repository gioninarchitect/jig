// P21 — POS Till Hook
// Till session management: open, close, cash in/out, shift status, denominations

import { useState, useCallback, useEffect } from 'react';
import api from '../../../services/api';
import { useAuth } from '../../../contexts/AuthContext';
import { useToast } from '../../../components/ui/Toast';

// SA Denominations
export const DENOMINATIONS = [
  { key: 'r200', label: 'R200', value: 200 },
  { key: 'r100', label: 'R100', value: 100 },
  { key: 'r50', label: 'R50', value: 50 },
  { key: 'r20', label: 'R20', value: 20 },
  { key: 'r10', label: 'R10', value: 10 },
  { key: 'r5', label: 'R5', value: 5 },
  { key: 'r2', label: 'R2', value: 2 },
  { key: 'r1', label: 'R1', value: 1 },
  { key: 'c50', label: '50c', value: 0.50 },
  { key: 'c20', label: '20c', value: 0.20 },
  { key: 'c10', label: '10c', value: 0.10 },
  { key: 'c5', label: '5c', value: 0.05 },
];

function emptyDenomCounts() {
  const counts = {};
  DENOMINATIONS.forEach(d => { counts[d.key] = 0; });
  return counts;
}

export default function useTill() {
  const { user, activeBranch } = useAuth();
  const { addToast } = useToast();

  const [session, setSession] = useState(null);
  const [shift, setShift] = useState(null);
  const [onBreak, setOnBreak] = useState(false);
  const [denomCounts, setDenomCounts] = useState(emptyDenomCounts());

  const branchId = activeBranch || user?.primaryBranch?._id || user?.primaryBranch;

  // ── Check active till session on mount ───────────────────────
  const checkTillStatus = useCallback(async () => {
    if (!branchId) return;
    try {
      const res = await api.get(`/pos/till/active?branchId=${branchId}&tillNumber=TILL-01`);
      if (res.data?.success && res.data.session) {
        setSession(res.data.session);
      } else {
        setSession(null);
      }
    } catch {
      setSession(null);
    }
  }, [branchId]);

  // ── Check shift status on mount ──────────────────────────────
  const checkShiftStatus = useCallback(async () => {
    try {
      const res = await api.get('/staff-shifts/my-shifts?status=active');
      if (res.data?.success && res.data.data?.shifts?.length > 0) {
        setShift(res.data.data.shifts[0]);
      } else {
        setShift(null);
      }
    } catch {
      setShift(null);
    }
  }, []);

  useEffect(() => {
    checkTillStatus();
    checkShiftStatus();
  }, [checkTillStatus, checkShiftStatus]);

  // ── Open Till ────────────────────────────────────────────────
  const openTill = useCallback(async (openingFloat = 500, tillNumber = 'TILL-01', openingNotes = '') => {
    if (!branchId) {
      addToast({ type: 'error', title: 'No Branch', message: 'Select a branch first' });
      return false;
    }
    try {
      const res = await api.post('/pos/till/open', { branchId, tillNumber, openingFloat, openingNotes });
      if (res.data?.success) {
        setSession(res.data.session);
        addToast({ type: 'success', title: 'Shift Opened', message: `Till ${tillNumber} open with R${openingFloat} float` });
        return true;
      }
      addToast({ type: 'error', title: 'Error', message: res.data?.message || 'Failed to open shift' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to open shift' });
    }
    return false;
  }, [branchId, addToast]);

  // ── Close Till ───────────────────────────────────────────────
  const closeTill = useCallback(async (closingNotes = '') => {
    if (!session) {
      addToast({ type: 'error', title: 'Error', message: 'No active till session' });
      return null;
    }
    try {
      const res = await api.post('/pos/till/close', { sessionId: session._id, denominations: denomCounts, closingNotes });
      if (res.data?.success) {
        const closed = res.data.session;
        setSession(null);
        setDenomCounts(emptyDenomCounts());
        const varianceMsg = closed.variance !== 0 ? `Variance: R${closed.variance.toFixed(2)}` : 'Balanced';
        addToast({ type: closed.requiresApproval ? 'warning' : 'success', title: 'Shift Closed', message: `Sales: R${(closed.totalSales || 0).toFixed(2)} | ${varianceMsg}` });
        if (closed.requiresApproval) {
          addToast({ type: 'warning', title: 'Approval Required', message: 'Variance exceeds R50 — manager approval needed' });
        }
        return closed;
      }
      addToast({ type: 'error', title: 'Error', message: res.data?.message || 'Failed to close shift' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to close shift' });
    }
    return null;
  }, [session, denomCounts, addToast]);

  // ── Denomination Counting ────────────────────────────────────
  const setDenomCount = useCallback((key, count) => {
    setDenomCounts(prev => ({ ...prev, [key]: parseInt(count) || 0 }));
  }, []);

  const actualCash = DENOMINATIONS.reduce((sum, d) => sum + d.value * (denomCounts[d.key] || 0), 0);

  const expectedCash = session
    ? (session.openingFloat || 500) + (session.totalCash || 0) - (session.totalRefunds || 0)
    : 0;

  const variance = actualCash - expectedCash;

  // ── Cash In/Out ──────────────────────────────────────────────
  const cashIn = useCallback(async (amount, reason) => {
    if (!session) { addToast({ type: 'error', title: 'No Active Shift', message: 'Open a shift first' }); return false; }
    try {
      const res = await api.post('/pos/till/cash-in', { sessionId: session._id, amount, reason });
      if (res.data?.success) {
        addToast({ type: 'success', title: 'Cash Added', message: `R${amount.toFixed(2)} recorded` });
        await checkTillStatus();
        return true;
      }
      addToast({ type: 'error', title: 'Error', message: res.data?.message || 'Failed' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to record cash in' });
    }
    return false;
  }, [session, addToast, checkTillStatus]);

  const cashOut = useCallback(async (amount, reason) => {
    if (!session) { addToast({ type: 'error', title: 'No Active Shift', message: 'Open a shift first' }); return false; }
    try {
      const res = await api.post('/pos/till/cash-out', { sessionId: session._id, amount, reason });
      if (res.data?.success) {
        addToast({ type: 'success', title: 'Cash Removed', message: `R${amount.toFixed(2)} recorded` });
        await checkTillStatus();
        return true;
      }
      addToast({ type: 'error', title: 'Error', message: res.data?.message || 'Failed' });
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to record cash out' });
    }
    return false;
  }, [session, addToast, checkTillStatus]);

  // ── Clock In/Out ─────────────────────────────────────────────
  const clockIn = useCallback(async () => {
    if (!branchId) { addToast({ type: 'error', title: 'No Branch', message: 'Select a branch first' }); return; }
    try {
      const res = await api.post('/staff-shifts/clock-in', { branch: branchId });
      if (res.data?.success) {
        setShift(res.data.data);
        addToast({ type: 'success', title: 'Clocked In', message: 'Shift started' });
      } else {
        addToast({ type: 'error', title: 'Error', message: res.data?.message || 'Failed to clock in' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to clock in' });
    }
  }, [branchId, addToast]);

  const clockOut = useCallback(async () => {
    try {
      const res = await api.post('/staff-shifts/clock-out');
      if (res.data?.success) {
        setShift(null);
        setOnBreak(false);
        addToast({ type: 'success', title: 'Clocked Out', message: `Hours: ${(res.data.data.regularHours + res.data.data.overtimeHours).toFixed(1)}` });
      } else {
        addToast({ type: 'error', title: 'Error', message: res.data?.message || 'Failed to clock out' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: 'Failed to clock out' });
    }
  }, [addToast]);

  // ── Breaks ───────────────────────────────────────────────────
  const toggleBreak = useCallback(async () => {
    const endpoint = onBreak ? '/staff-shifts/break/end' : '/staff-shifts/break/start';
    const body = onBreak ? {} : { type: 'short' };
    try {
      const res = await api.post(endpoint, body);
      if (res.data?.success) {
        setOnBreak(!onBreak);
        addToast({ type: onBreak ? 'success' : 'info', title: onBreak ? 'Break Ended' : 'On Break', message: onBreak ? 'Welcome back!' : 'Enjoy your break!' });
      }
    } catch {
      addToast({ type: 'error', title: 'Error', message: `Failed to ${onBreak ? 'end' : 'start'} break` });
    }
  }, [onBreak, addToast]);

  return {
    session,
    shift,
    onBreak,
    branchId,
    // Till operations
    openTill,
    closeTill,
    checkTillStatus,
    // Denomination counting
    denomCounts,
    setDenomCount,
    actualCash,
    expectedCash,
    variance,
    // Cash operations
    cashIn,
    cashOut,
    // Shift operations
    clockIn,
    clockOut,
    checkShiftStatus,
    toggleBreak,
  };
}
