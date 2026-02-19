// P21 — POS Barcode Hook
// Listens for rapid keypress sequences (barcode scanner acts as keyboard).
// Detects sequence ending with Enter, matches against product SKU/barcode.

import { useEffect, useRef, useCallback } from 'react';

const SCAN_TIMEOUT = 100; // ms between keypresses to be considered a scan
const MIN_LENGTH = 4;     // minimum barcode length

export default function useBarcode(onScan) {
  const bufferRef = useRef('');
  const timerRef = useRef(null);

  const handleKeyDown = useCallback((e) => {
    // Ignore if user is typing in an input/textarea
    const tag = e.target.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;

    if (timerRef.current) clearTimeout(timerRef.current);

    if (e.key === 'Enter') {
      if (bufferRef.current.length >= MIN_LENGTH) {
        onScan(bufferRef.current);
      }
      bufferRef.current = '';
      return;
    }

    // Only accept printable characters
    if (e.key.length === 1) {
      bufferRef.current += e.key;
    }

    // Reset buffer if no keypress within timeout
    timerRef.current = setTimeout(() => {
      bufferRef.current = '';
    }, SCAN_TIMEOUT);
  }, [onScan]);

  useEffect(() => {
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [handleKeyDown]);
}
