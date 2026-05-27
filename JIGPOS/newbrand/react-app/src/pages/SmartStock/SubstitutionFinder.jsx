// P24 — Substitution Finder (cannabinoid-profile matching)
// When a product is unavailable, find profile-matched alternatives.

import { useState, useMemo } from 'react';
import { formatCurrency } from '../../config';
import { findSubstitutes } from '../../world-model/engines/stock-intelligence';

export default function SubstitutionFinder({ products }) {
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  // Filter products for the selector
  const filteredProducts = useMemo(() => {
    if (!products?.length) return [];
    const term = searchTerm.toLowerCase();
    return products
      .filter(p => p.cannabinoids?.thc || p.cannabinoids?.cbd) // Only products with cannabinoid data
      .filter(p => !term || p.name?.toLowerCase().includes(term) || p.sku?.toLowerCase().includes(term))
      .slice(0, 20);
  }, [products, searchTerm]);

  // Find substitutes for selected product
  const substitutes = useMemo(() => {
    if (!selectedProduct || !products?.length) return [];
    return findSubstitutes(selectedProduct, products, 8);
  }, [selectedProduct, products]);

  return (
    <div className="space-y-4">
      {/* Search & select product */}
      <div>
        <div className="text-xs text-gray-500 font-bold uppercase mb-2">
          Select a product to find cannabinoid-matched alternatives
        </div>
        <input
          type="text"
          placeholder="Search by name or SKU..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-or-gold/30"
        />

        {/* Product list */}
        {searchTerm && !selectedProduct && (
          <div className="mt-1 border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
            {filteredProducts.length === 0 ? (
              <div className="p-3 text-xs text-gray-400 text-center">No products with cannabinoid data</div>
            ) : (
              filteredProducts.map(p => (
                <button
                  key={p._id || p.productId}
                  onClick={() => { setSelectedProduct(p); setSearchTerm(''); }}
                  className="w-full px-3 py-2 text-left hover:bg-origin-slate border-b border-gray-100 last:border-0"
                >
                  <div className="text-xs font-semibold text-white">{p.name}</div>
                  <div className="text-[10px] text-gray-400">
                    THC: {p.cannabinoids?.thc || 0}% | CBD: {p.cannabinoids?.cbd || 0}%
                    {p.category && ` | ${p.category}`}
                  </div>
                </button>
              ))
            )}
          </div>
        )}
      </div>

      {/* Selected product */}
      {selectedProduct && (
        <div className="p-4 rounded-lg border border-or-gold/30 bg-origin-slate">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs text-gray-400 uppercase">Target Product</div>
              <div className="font-heading text-sm text-white">{selectedProduct.name}</div>
              <div className="flex items-center gap-3 mt-1 text-xs text-gray-500">
                <span>THC: <span className="font-bold text-white">{selectedProduct.cannabinoids?.thc || 0}%</span></span>
                <span>CBD: <span className="font-bold text-white">{selectedProduct.cannabinoids?.cbd || 0}%</span></span>
                {selectedProduct.category && <span>{selectedProduct.category}</span>}
                {selectedProduct.price && <span>{formatCurrency(selectedProduct.price)}</span>}
              </div>
            </div>
            <button
              onClick={() => setSelectedProduct(null)}
              className="px-2 py-1 rounded text-xs text-gray-500 hover:text-origin-red hover:bg-origin-red/5 transition-colors"
            >
              Clear
            </button>
          </div>
        </div>
      )}

      {/* Substitutes list */}
      {selectedProduct && substitutes.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 font-bold uppercase">
            {substitutes.length} alternatives found
          </div>
          {substitutes.map((sub, i) => (
            <div
              key={sub.productId || i}
              className={`p-3 rounded-lg border ${
                sub.similarity >= 80 ? 'border-or-gold/30 bg-or-gold/5' :
                sub.similarity >= 60 ? 'border-or-gold/20 bg-or-gold/5' :
                'border-gray-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2 min-w-0">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white shrink-0 ${
                    sub.similarity >= 80 ? 'bg-or-gold' :
                    sub.similarity >= 60 ? 'bg-or-gold' :
                    'bg-gray-400'
                  }`}>
                    {sub.similarity}%
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs font-semibold text-white truncate">{sub.name}</div>
                    <div className="text-[10px] text-gray-400">
                      {sub.sku && `${sub.sku} | `}
                      {sub.category}
                      {sub.sameCategory && ' (same category)'}
                    </div>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  {sub.price && <div className="text-xs font-bold text-white">{formatCurrency(sub.price)}</div>}
                  <div className={`text-[10px] font-bold ${sub.inStock ? 'text-or-gold' : 'text-origin-red'}`}>
                    {sub.inStock ? 'In Stock' : 'Out of Stock'}
                  </div>
                </div>
              </div>

              {/* Cannabinoid comparison */}
              <div className="grid grid-cols-4 gap-2 text-xs">
                <div>
                  <span className="text-gray-400">THC: </span>
                  <span className="font-bold text-white">{sub.thc}%</span>
                </div>
                <div>
                  <span className="text-gray-400">CBD: </span>
                  <span className="font-bold text-white">{sub.cbd}%</span>
                </div>
                <div>
                  <span className="text-gray-400">THC diff: </span>
                  <span className={`font-bold ${sub.thcDiff <= 2 ? 'text-or-gold' : sub.thcDiff <= 5 ? 'text-or-gold-dark' : 'text-origin-red'}`}>
                    {sub.thcDiff > 0 ? '+' : ''}{sub.thcDiff}%
                  </span>
                </div>
                <div>
                  <span className="text-gray-400">CBD diff: </span>
                  <span className={`font-bold ${sub.cbdDiff <= 2 ? 'text-or-gold' : sub.cbdDiff <= 5 ? 'text-or-gold-dark' : 'text-origin-red'}`}>
                    {sub.cbdDiff > 0 ? '+' : ''}{sub.cbdDiff}%
                  </span>
                </div>
              </div>

              {/* Similarity bar */}
              <div className="mt-2 h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    sub.similarity >= 80 ? 'bg-or-gold' :
                    sub.similarity >= 60 ? 'bg-or-gold' :
                    'bg-gray-400'
                  }`}
                  style={{ width: `${sub.similarity}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {selectedProduct && substitutes.length === 0 && (
        <div className="text-center py-8 text-gray-400 text-sm">
          No alternatives found with cannabinoid data
        </div>
      )}

      {!selectedProduct && (
        <div className="text-center py-8 text-gray-400 text-sm">
          Select a product above to find cannabinoid-matched substitutes
        </div>
      )}
    </div>
  );
}
