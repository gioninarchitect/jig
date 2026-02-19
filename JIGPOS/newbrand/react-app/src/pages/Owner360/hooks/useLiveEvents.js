// P22+P34 — Live event stream for 360View
// P34: Throttled to max 1fps UI updates, no polling (event-driven only)

import { useState, useEffect, useCallback, useRef } from 'react';
import eventBus from '../../../world-model/events';

const MAX_EVENTS = 50;
const THROTTLE_MS = 1000; // P34: max 1fps for event stream UI

const SEVERITY_MAP = {
  SALE_COMPLETED: 'info',
  SALE_VOIDED: 'warning',
  REFUND_PROCESSED: 'warning',
  TILL_OPENED: 'info',
  TILL_CLOSED: 'info',
  CASH_IN_OUT: 'info',
  DISCOUNT_APPLIED: 'info',
  STOCK_RECEIVED: 'success',
  STOCK_ADJUSTED: 'warning',
  STOCK_TRANSFERRED: 'info',
  BATCH_CREATED: 'info',
  BATCH_QA_RESULT: 'warning',
  STOCKTAKE_COMPLETED: 'success',
  REORDER_TRIGGERED: 'warning',
  SHIFT_STARTED: 'info',
  SHIFT_ENDED: 'info',
  BREAK_TAKEN: 'info',
  VARIANCE_DETECTED: 'critical',
  PURCHASE_LIMIT_CHECK: 'warning',
  SECTION21_VERIFICATION: 'warning',
  DOCUMENT_EXPIRY: 'critical',
  ORDER_PLACED: 'info',
  ORDER_PACKED: 'info',
  ORDER_DISPATCHED: 'success',
  PO_SUBMITTED: 'info',
  PO_APPROVED: 'success',
  APPROVAL_REQUESTED: 'warning',
  CUSTOMER_REGISTERED: 'info',
  WELLNESS_POINTS_EARNED: 'info',
  WELLNESS_TIER_CHANGED: 'success',
};

export default function useLiveEvents({ branchFilter = null, typeFilter = null, severityFilter = null } = {}) {
  const [events, setEvents] = useState([]);
  const throttleRef = useRef(null);
  const pendingRef = useRef(false);

  const loadEvents = useCallback(() => {
    const allHistory = eventBus.getHistory({ limit: MAX_EVENTS * 2 });

    let enriched = allHistory.map(evt => ({
      ...evt,
      severity: SEVERITY_MAP[evt.type] || 'info',
    }));

    if (branchFilter) {
      enriched = enriched.filter(e => e.branchId === branchFilter);
    }
    if (typeFilter) {
      enriched = enriched.filter(e => e.type === typeFilter);
    }
    if (severityFilter) {
      enriched = enriched.filter(e => e.severity === severityFilter);
    }

    enriched.sort((a, b) => b.timestamp - a.timestamp);
    setEvents(enriched.slice(0, MAX_EVENTS));
  }, [branchFilter, typeFilter, severityFilter]);

  // P34: Throttled update — max 1 UI refresh per second
  const throttledLoad = useCallback(() => {
    if (throttleRef.current) {
      pendingRef.current = true;
      return;
    }
    loadEvents();
    throttleRef.current = setTimeout(() => {
      throttleRef.current = null;
      if (pendingRef.current) {
        pendingRef.current = false;
        loadEvents();
      }
    }, THROTTLE_MS);
  }, [loadEvents]);

  // Initial load
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Subscribe to new events with throttle
  useEffect(() => {
    const unsub = eventBus.subscribe('*', throttledLoad);
    return () => {
      unsub();
      if (throttleRef.current) {
        clearTimeout(throttleRef.current);
        throttleRef.current = null;
      }
    };
  }, [throttledLoad]);

  return { events };
}
