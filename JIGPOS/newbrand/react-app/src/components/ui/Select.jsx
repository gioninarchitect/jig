import { useState, useRef, useEffect } from 'react';

export default function Select({ label, options = [], value, onChange, placeholder = 'Select...', searchable = false, className = '' }) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');
  const ref = useRef(null);

  useEffect(() => {
    function handleClick(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const filtered = search
    ? options.filter((o) => (o.label || o.value || o).toLowerCase().includes(search.toLowerCase()))
    : options;

  const selected = options.find((o) => (o.value ?? o) === value);
  const displayLabel = selected ? (selected.label || selected.value || selected) : '';

  return (
    <div className={`mb-4 ${className}`} ref={ref}>
      {label && (
        <label className="block text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">
          {label}
        </label>
      )}
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen(!open)}
          className={`
            w-full px-4 py-3 bg-gray-50 border-2 rounded-xl text-base text-left
            font-body transition-all duration-300 flex items-center justify-between
            ${open ? 'border-jig-amber shadow-[0_0_0_4px_rgba(212,175,55,0.15)]' : 'border-gray-200'}
          `}
        >
          <span className={displayLabel ? 'text-gray-900' : 'text-gray-400'}>
            {displayLabel || placeholder}
          </span>
          <svg className={`w-4 h-4 text-gray-500 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {open && (
          <div className="absolute z-50 mt-1 w-full bg-white border border-gray-200 rounded-xl shadow-lg max-h-60 overflow-auto">
            {searchable && (
              <div className="p-2 border-b border-gray-100">
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search..."
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-jig-amber"
                  autoFocus
                />
              </div>
            )}
            {filtered.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-400">No options</div>
            ) : (
              filtered.map((opt) => {
                const val = opt.value ?? opt;
                const lbl = opt.label || opt.value || opt;
                const isActive = val === value;
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => { onChange(val); setOpen(false); setSearch(''); }}
                    className={`
                      w-full text-left px-4 py-3 text-sm transition-colors
                      ${isActive ? 'bg-jig-purple/10 text-jig-purple font-semibold' : 'hover:bg-jig-amber/10 text-gray-700'}
                    `}
                  >
                    {lbl}
                  </button>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
