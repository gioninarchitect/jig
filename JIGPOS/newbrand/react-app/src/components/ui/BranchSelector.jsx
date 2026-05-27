import { useState, useRef, useEffect } from 'react';

export default function BranchSelector({ branches = [], currentBranch, onChange }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const current = branches.find((b) => b._id === currentBranch);

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 px-3 py-2 rounded-xl bg-or-gold/10 text-white hover:bg-or-gold/20 transition-colors text-sm font-semibold"
      >
        <svg className="w-4 h-4 text-or-gold" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
        </svg>
        <span className="hidden sm:inline">{current?.name || 'All Branches'}</span>
        <svg className={`w-3 h-3 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <button
            onClick={() => { onChange(null); setOpen(false); }}
            className={`
              w-full text-left px-4 py-3 text-sm transition-colors
              ${!currentBranch ? 'bg-or-gold/10 text-or-gold font-semibold' : 'hover:bg-or-gold/10 text-gray-700'}
            `}
          >
            All Branches
          </button>
          {branches.map((b) => (
            <button
              key={b._id}
              onClick={() => { onChange(b._id); setOpen(false); }}
              className={`
                w-full text-left px-4 py-3 text-sm transition-colors border-t border-gray-50
                ${currentBranch === b._id ? 'bg-or-gold/10 text-or-gold font-semibold' : 'hover:bg-or-gold/10 text-gray-700'}
              `}
            >
              <div>{b.name}</div>
              {b.branchCode && <div className="text-xs text-gray-400">{b.branchCode}</div>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
