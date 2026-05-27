// P38 — Product filters: category, price range, in-stock. Vanilla-matched card
import { useState } from 'react';

export default function ProductFilters({ categories = [], category, onCategoryChange, minPrice, maxPrice, onPriceChange, inStockOnly, onStockChange }) {
  const [open, setOpen] = useState(false);

  const content = (
    <div className="space-y-8">
      {/* Category */}
      <div>
        <h3 className="font-heading text-[1.25rem] text-or-gold-dark tracking-wide mb-3">Category</h3>
        <div className="space-y-1.5">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="radio" name="category" checked={!category} onChange={() => onCategoryChange('')} className="accent-or-gold" />
            <span className="text-sm text-white">All Categories</span>
          </label>
          {categories.map((cat) => (
            <label key={cat} className="flex items-center gap-2 cursor-pointer">
              <input type="radio" name="category" checked={category === cat} onChange={() => onCategoryChange(cat)} className="accent-or-gold" />
              <span className="text-sm text-white capitalize">{cat}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Price Range */}
      <div>
        <h3 className="font-heading text-[1.25rem] text-or-gold-dark tracking-wide mb-3">Price Range</h3>
        <div className="flex gap-2 items-center text-white">
          <input
            type="number"
            placeholder="Min"
            value={minPrice}
            onChange={(e) => onPriceChange(e.target.value, maxPrice)}
            className="w-20 px-2 py-2 bg-origin-slate border border-or-gold-light rounded-[5px] text-sm text-white focus:outline-none focus:border-or-gold"
          />
          <span className="text-gray-400">-</span>
          <input
            type="number"
            placeholder="Max"
            value={maxPrice}
            onChange={(e) => onPriceChange(minPrice, e.target.value)}
            className="w-20 px-2 py-2 bg-origin-slate border border-or-gold-light rounded-[5px] text-sm text-white focus:outline-none focus:border-or-gold"
          />
        </div>
      </div>

      {/* In Stock */}
      <div>
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={inStockOnly} onChange={(e) => onStockChange(e.target.checked)} className="accent-or-gold w-4 h-4" />
          <span className="text-sm text-white">In Stock Only</span>
        </label>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop */}
      <div
        className="hidden lg:block bg-white rounded-[10px] p-6 sticky top-[100px]"
        style={{ boxShadow: '0 4px 20px rgba(58,95,72,0.1)', border: '1px solid rgba(58,95,72,0.1)' }}
      >
        {content}
      </div>

      {/* Mobile toggle */}
      <div className="lg:hidden">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex items-center justify-between px-4 py-3 bg-white rounded-[10px] text-sm font-semibold text-or-gold-dark"
          style={{ boxShadow: '0 4px 15px rgba(58,95,72,0.08)', border: '1px solid rgba(58,95,72,0.1)' }}
        >
          <span>Filters</span>
          <svg className={`w-4 h-4 transition-transform ${open ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>
        {open && (
          <div className="mt-3 bg-white rounded-[10px] p-6" style={{ boxShadow: '0 4px 20px rgba(58,95,72,0.1)', border: '1px solid rgba(58,95,72,0.1)' }}>
            {content}
          </div>
        )}
      </div>
    </>
  );
}
