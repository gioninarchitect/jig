// P21 — POS Customer Search
// Walk-in toggle, debounced search, Section 21 purchase limit warnings

import { useState, useRef, useCallback } from 'react';
import api from '../../services/api';

export default function CustomerSearch({ customer, purchaseLimit, onSelectCustomer, onSelectWalkIn }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const timerRef = useRef(null);

  const search = useCallback((q) => {
    setQuery(q);
    if (q.length < 2) { setResults([]); return; }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/users?search=${encodeURIComponent(q)}&role=user`);
        const users = res.data?.users || res.data?.data || [];
        setResults(users);
      } catch {
        setResults([]);
      }
      setSearching(false);
    }, 300);
  }, []);

  const handleSelect = (cust) => {
    onSelectCustomer(cust);
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const handleWalkIn = () => {
    onSelectWalkIn();
    setOpen(false);
    setQuery('');
    setResults([]);
  };

  const displayName = customer
    ? `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email
    : 'Walk-in Customer';

  return (
    <div className="relative">
      {/* Selected customer bar */}
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-3 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-colors"
      >
        <div className="flex items-center gap-2">
          <svg className="w-4 h-4 text-or-gold" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          <span className="text-sm font-semibold">{displayName}</span>
        </div>
        <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* Purchase limit warning */}
      {purchaseLimit?.warning && (
        <div className={`mt-2 p-2 rounded text-xs ${purchaseLimit.exceeded ? 'bg-origin-red/15 border border-origin-red/30 text-origin-red-light' : 'bg-or-gold/15 border border-or-gold/30 text-or-gold'}`}>
          <div className="font-bold">{purchaseLimit.exceeded ? 'Patient has reached daily limit!' : 'Patient approaching daily limit'}</div>
          <div>{purchaseLimit.dayUsage}g / {purchaseLimit.dayLimit}g used today</div>
        </div>
      )}

      {/* Dropdown */}
      {open && (
        <div className="absolute top-full left-0 right-0 mt-1 bg-origin-slate border border-white/10 rounded-lg shadow-xl z-50 max-h-64 overflow-y-auto">
          {/* Search input */}
          <div className="p-2">
            <input
              type="text"
              value={query}
              onChange={(e) => search(e.target.value)}
              placeholder="Search by name, email, phone..."
              autoFocus
              className="w-full px-3 py-2 rounded bg-white/10 text-white text-sm placeholder-white/40 border border-white/10 outline-none focus:border-or-gold/50"
            />
          </div>

          {/* Walk-in option */}
          <button
            onClick={handleWalkIn}
            className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors ${!customer ? 'text-or-gold' : 'text-white'}`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            Walk-in Customer
          </button>

          {/* Results */}
          {searching && <div className="px-3 py-2 text-xs text-white/40">Searching...</div>}
          {results.map(u => (
            <button
              key={u._id}
              onClick={() => handleSelect(u)}
              className={`w-full flex items-center gap-2 px-3 py-2 text-sm text-left hover:bg-white/10 transition-colors ${customer?._id === u._id ? 'text-or-gold' : 'text-white'}`}
            >
              <svg className="w-4 h-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              <div className="min-w-0">
                <div className="font-semibold truncate">{u.firstName || ''} {u.lastName || ''}</div>
                <div className="text-xs text-white/50">{u.email || u.phone || ''}</div>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
