// P41 — Full-screen search overlay with live results
import { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../config';
import api from '../../services/api';

export default function SearchOverlay({ open, onClose }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef(null);
  const debounceRef = useRef(null);

  // Focus input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 100);
      document.body.style.overflow = 'hidden';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  // Escape to close
  useEffect(() => {
    if (!open) return;
    function handleKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [open, onClose]);

  // Debounced search
  const search = useCallback((q) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!q.trim()) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await api.get('/products', { params: { search: q, limit: 5, status: 'active' } });
        const prods = res.data.products || res.data.data || res.data || [];
        setResults(Array.isArray(prods) ? prods : []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
  }, []);

  function handleChange(e) {
    setQuery(e.target.value);
    search(e.target.value);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[100000] bg-jig-slate/95 flex items-start justify-center pt-24 px-4 animate-[fadeIn_0.15s_ease-out]" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="w-full max-w-2xl">
        {/* Search input */}
        <div className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={handleChange}
            placeholder="Search products..."
            className="w-full px-6 py-4 bg-white rounded-2xl text-lg text-gray-900 placeholder:text-gray-400 focus:outline-none shadow-2xl pr-12"
          />
          <button onClick={onClose} className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 text-xl">&times;</button>
        </div>

        {/* Results */}
        {(loading || results.length > 0) && (
          <div className="mt-4 bg-white rounded-2xl shadow-2xl overflow-hidden">
            {loading ? (
              <div className="p-6 text-center">
                <div className="w-6 h-6 border-2 border-jig-purple border-t-transparent rounded-full animate-spin mx-auto" />
              </div>
            ) : (
              <div>
                {results.map((product) => (
                  <Link
                    key={product._id}
                    to={`/products/${product._id}`}
                    onClick={onClose}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-jig-slate transition-colors border-b border-gray-100 last:border-0"
                  >
                    <div className="w-12 h-12 bg-gray-100 rounded-lg overflow-hidden shrink-0">
                      {(product.images?.[0] || product.image) ? (
                        <img src={product.images?.[0] || product.image} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">-</div>
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{product.name}</p>
                      {product.category && <p className="text-xs text-gray-400 capitalize">{product.category}</p>}
                    </div>
                    <span className="text-sm font-bold text-jig-amber shrink-0">{formatCurrency(product.price)}</span>
                  </Link>
                ))}
                <Link
                  to={`/products?search=${encodeURIComponent(query)}`}
                  onClick={onClose}
                  className="block px-6 py-3 text-center text-sm font-semibold text-jig-amber hover:bg-jig-slate transition-colors"
                >
                  View all results &rarr;
                </Link>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
