// P21 — POS Product Browser
// 3-tier filter (track → category → grow method/product type), quick-add, search

import { useState, useEffect, useCallback, useMemo } from 'react';
import api from '../../services/api';
import Modal from '../../components/ui/Modal';

const CATEGORY_ICONS = {
  flower: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z',
  cbd: 'M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75',
  edibles: 'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z',
  accessories: 'M7 2v11h3v9l7-12h-4l4-8z',
  concentrates: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z',
  topicals: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z',
  vapes: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z',
  oils: 'M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2z',
};

// Category-specific gradients matching vanilla pos.html
const CATEGORY_GRADIENTS = {
  flower:         { bg: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', text: 'white' },
  'pre-rolls':    { bg: 'linear-gradient(135deg, #D97706 0%, #B8922D 100%)', text: '#1E1E1E' },
  edibles:        { bg: 'linear-gradient(135deg, #4A7A5D 0%, #7C3AED 100%)', text: 'white' },
  concentrates:   { bg: 'linear-gradient(135deg, #6D28D9 0%, #1E1E1E 100%)', text: 'white' },
  accessories:    { bg: 'linear-gradient(135deg, #0A0A0A 0%, #e8e4da 100%)', text: '#1E1E1E' },
  vapes:          { bg: 'linear-gradient(135deg, #7C3AED 0%, #4A7A5D 100%)', text: 'white' },
  oils:           { bg: 'linear-gradient(135deg, #B8922D 0%, #D97706 100%)', text: '#1E1E1E' },
  'lifestyle-cbd':{ bg: 'linear-gradient(135deg, #4A7A5D 0%, #7C3AED 100%)', text: 'white' },
  cbd:            { bg: 'linear-gradient(135deg, #4A7A5D 0%, #7C3AED 100%)', text: 'white' },
  topicals:       { bg: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', text: 'white' },
};
const DEFAULT_GRADIENT = { bg: 'linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%)', text: 'white' };

const MAIN_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'flower', label: 'Flower' },
  { key: 'cbd', label: 'CBD' },
  { key: 'edibles', label: 'Edibles' },
  { key: 'accessories', label: 'Accessories' },
  { key: 'concentrates', label: 'Concentrates' },
  { key: 'topicals', label: 'Topicals' },
];

const GROW_METHODS = [
  { key: 'indoor', label: 'Indoor' },
  { key: 'greendoor', label: 'Greendoor' },
];

const PRODUCT_TYPES = [
  { key: 'pre-roll', label: 'Pre-Rolls' },
  { key: 'pre-pack', label: 'Pre-Packs (5g)' },
  { key: 'loose', label: 'Loose (1g)' },
];

export default function ProductBrowser({ track, onAddToCart }) {
  const [allProducts, setAllProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [mainCategory, setMainCategory] = useState('all');
  const [growMethod, setGrowMethod] = useState(null);
  const [productType, setProductType] = useState(null);
  const [quickModal, setQuickModal] = useState(null); // { title, products }

  // ── Load Products ──────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [prodRes, menuRes] = await Promise.all([
          api.get('/products'),
          api.get('/menu').catch(() => ({ data: { success: false } })),
        ]);

        let products = prodRes.data?.success ? prodRes.data.products : [];
        const menuItems = menuRes.data?.success ? (menuRes.data.menuItems || []).map(item => ({
          ...item, isMenuItem: true, track: 'lifestyle', quantity: 999,
          category: item.venue === 'la-brewha' ? 'la-brewha' : 'bean-bud',
        })) : [];

        products = products.filter(p => {
          const t = p.track || 'lifestyle';
          return t === track || t === 'both';
        });

        if (!cancelled) setAllProducts([...products, ...menuItems]);
      } catch {
        if (!cancelled) setAllProducts([]);
      }
      if (!cancelled) setLoading(false);
    }
    load();
    return () => { cancelled = true; };
  }, [track]);

  // ── Filtering ──────────────────────────────────────────────
  const filtered = useMemo(() => {
    let list = [...allProducts];

    // In-stock only for POS
    list = list.filter(p => (p.inventory?.quantity || p.quantity || 0) > 0);

    // Search
    if (search) {
      const q = search.toLowerCase();
      list = list.filter(p => p.name?.toLowerCase().includes(q) || p.category?.toLowerCase().includes(q));
    }

    // Main category
    if (mainCategory !== 'all') {
      if (mainCategory === 'flower') {
        list = list.filter(p => p.category === 'flower');
      } else if (mainCategory === 'cbd') {
        list = list.filter(p => p.category === 'lifestyle-cbd' || p.category === 'cbd');
      } else {
        list = list.filter(p => p.category === mainCategory);
      }
    }

    // Grow method (flower only)
    if (growMethod && mainCategory === 'flower') {
      list = list.filter(p => {
        const tags = p.tags || [];
        const name = (p.name || '').toLowerCase();
        if (growMethod === 'indoor') return tags.includes('indoor') || name.includes('i.d') || name.includes('indoor');
        if (growMethod === 'greendoor') return tags.includes('greendoor') || name.includes('g.d') || name.includes('greendoor');
        return true;
      });
    }

    // Product type (flower only)
    if (productType && mainCategory === 'flower') {
      list = list.filter(p => {
        const tags = p.tags || [];
        const name = (p.name || '').toLowerCase();
        if (productType === 'pre-roll') return tags.includes('pre-roll') || name.includes('pre roll') || name.includes('preroll') || name.includes('joint');
        if (productType === 'pre-pack') return tags.includes('pre-pack') || name.includes('5g') || name.includes('pre pack');
        if (productType === 'loose') return tags.includes('loose') || name.includes('1g') || name.includes('loose');
        return true;
      });
    }

    return list;
  }, [allProducts, search, mainCategory, growMethod, productType]);

  // ── Quick Adds ─────────────────────────────────────────────
  const quickAddPreroll = useCallback(() => {
    const sheets = allProducts.filter(p => {
      const name = (p.name || '').toLowerCase();
      const price = p.price || 0;
      return (name.includes('single') || name.includes('r10') || p.sku === 'BLADES-SINGLE' || p.sku === 'STONERDAYZ-CONE') && price <= 15;
    });
    if (sheets.length === 1) { onAddToCart(sheets[0]); }
    else if (sheets.length > 1) { setQuickModal({ title: 'Rolling Papers & Cones (R10)', products: sheets }); }
    else {
      onAddToCart({ _id: 'quick-sheet-single', name: 'Sheet/Cone (Single)', price: 10, category: 'accessories', inventory: { quantity: 999 }, sku: 'BLADES-SINGLE' });
    }
  }, [allProducts, onAddToCart]);

  const quickAddGram = useCallback(() => {
    const flowers = allProducts.filter(p => p.category === 'flower' && (p.inventory?.quantity || 0) > 0).slice(0, 12);
    if (flowers.length === 0) return;
    setQuickModal({ title: 'Select Strain for 1g', products: flowers });
  }, [allProducts]);

  const quickAdd3g = useCallback(() => {
    const flowers = allProducts.filter(p => p.category === 'flower' && (p.inventory?.quantity || 0) > 0);
    if (flowers.length === 0) return;
    setQuickModal({ title: '3g Pack - Select Strain', products: flowers, is3g: true });
  }, [allProducts]);

  const quickAdd5g = useCallback(() => {
    const bags = allProducts.filter(p => p.name?.includes('5g') || p.tags?.includes('5g-bag'));
    if (bags.length === 1) { onAddToCart(bags[0]); }
    else if (bags.length > 1) { setQuickModal({ title: '5g Bags', products: bags }); }
  }, [allProducts, onAddToCart]);

  const handleQuickSelect = (product) => {
    if (quickModal?.is3g) {
      onAddToCart({ _id: 'pack-3g-' + product._id, name: product.name + ' (3g Pack)', price: (product.price || 0) * 3, category: 'flower', inventory: { quantity: 999 } });
    } else {
      onAddToCart(product);
    }
    setQuickModal(null);
  };

  // Reset sub-filters when main category changes
  const handleMainCategory = (cat) => {
    setMainCategory(cat);
    setGrowMethod(null);
    setProductType(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-3 border-jig-purple border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Search + Quick Adds */}
      <div className="mb-3 space-y-2">
        <div className="relative">
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search products..."
            className="w-full py-3 pl-4 pr-11 rounded-lg text-white text-sm outline-none"
            style={{ background: '#1e293b', border: '2px solid #334155', color: 'white' }}
            onFocus={(e) => { e.target.style.borderColor = '#D97706'; e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.2)'; }}
            onBlur={(e) => { e.target.style.borderColor = '#334155'; e.target.style.boxShadow = 'none'; }}
          />
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5" fill="none" stroke="#64748b" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button onClick={quickAddPreroll} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors" style={{ background: 'rgba(212,175,55,0.2)', color: '#D97706' }}>R10 Sheet</button>
          <button onClick={quickAddGram} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors" style={{ background: 'rgba(212,175,55,0.2)', color: '#D97706' }}>Gram</button>
          <button onClick={quickAdd3g} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors" style={{ background: 'rgba(212,175,55,0.2)', color: '#D97706' }}>3g Pack</button>
          <button onClick={quickAdd5g} className="shrink-0 px-3 py-1.5 rounded-full text-xs font-bold transition-colors" style={{ background: 'rgba(212,175,55,0.2)', color: '#D97706' }}>5g Bag</button>
        </div>
      </div>

      {/* Category Filters — Pill-shaped like vanilla */}
      <div className="space-y-2 mb-3">
        {/* Tier 1: Main Categories */}
        <div className="flex gap-1.5 overflow-x-auto pb-1">
          {MAIN_CATEGORIES.map(cat => (
            <button
              key={cat.key}
              onClick={() => handleMainCategory(cat.key)}
              className="shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold uppercase transition-all whitespace-nowrap"
              style={mainCategory === cat.key
                ? { background: 'linear-gradient(135deg, #D97706 0%, #B8922D 100%)', color: '#1a1a2e', border: '1px solid #D97706' }
                : { background: '#334155', color: '#ccc', border: '1px solid #475569' }
              }
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Tier 2: Grow Method (flower only) */}
        {mainCategory === 'flower' && (
          <div className="flex gap-1.5">
            {GROW_METHODS.map(gm => (
              <button
                key={gm.key}
                onClick={() => setGrowMethod(growMethod === gm.key ? null : gm.key)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={growMethod === gm.key
                  ? { background: '#D97706', color: '#1a1a2e', border: '1px solid #D97706' }
                  : { background: 'rgba(255,255,255,0.1)', color: '#ccc', border: '1px solid #475569' }
                }
              >
                {gm.label}
              </button>
            ))}
          </div>
        )}

        {/* Tier 3: Product Type (flower only, when grow method selected) */}
        {mainCategory === 'flower' && growMethod && (
          <div className="flex gap-1.5">
            {PRODUCT_TYPES.map(pt => (
              <button
                key={pt.key}
                onClick={() => setProductType(productType === pt.key ? null : pt.key)}
                className="px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all"
                style={productType === pt.key
                  ? { background: '#D97706', color: '#1a1a2e', border: '1px solid #D97706' }
                  : { background: 'rgba(255,255,255,0.1)', color: '#ccc', border: '1px solid #475569' }
                }
              >
                {pt.label}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Product Grid — Odyssey colourful tiles */}
      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="text-center py-10 text-sm" style={{ color: '#64748b' }}>No products in stock</div>
        ) : (
          <div className="grid gap-2.5" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))' }}>
            {filtered.map(product => {
              const stock = product.inventory?.quantity || product.quantity || 0;
              const isLow = stock > 0 && stock <= 10;
              const grad = CATEGORY_GRADIENTS[product.category] || DEFAULT_GRADIENT;
              return (
                <button
                  key={product._id}
                  onClick={() => onAddToCart(product)}
                  className="relative rounded-xl text-center transition-all hover:scale-[1.02] active:scale-[0.96]"
                  style={{
                    background: grad.bg,
                    color: grad.text,
                    padding: 12,
                    minHeight: 100,
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                    border: 'none',
                  }}
                >
                  {/* Stock badge */}
                  {isLow && (
                    <span className="absolute top-1.5 right-1.5 px-1.5 py-0.5 rounded-lg text-[10px] font-bold" style={{ background: 'rgba(255,255,255,0.9)', color: '#d97706' }}>LOW</span>
                  )}
                  {/* Icon */}
                  <div className="text-3xl mb-1.5" style={{ color: grad.text, textShadow: grad.text === 'white' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}>
                    <svg className="w-7 h-7 mx-auto" fill="currentColor" viewBox="0 0 24 24"><path d={CATEGORY_ICONS[product.category] || CATEGORY_ICONS.flower} /></svg>
                  </div>
                  {/* Name */}
                  <div className="font-bold text-[0.85rem] leading-tight mb-0.5" style={{ color: grad.text, textShadow: grad.text === 'white' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}>
                    {product.name}
                  </div>
                  {/* SKU */}
                  {product.sku && (
                    <div className="text-[0.6rem] tracking-wide mb-0.5" style={{ color: grad.text === 'white' ? 'rgba(255,255,255,0.6)' : 'rgba(30,51,40,0.5)' }}>
                      {product.sku}
                    </div>
                  )}
                  {/* Price */}
                  <div className="font-heading text-xl" style={{ color: grad.text, textShadow: grad.text === 'white' ? '0 1px 2px rgba(0,0,0,0.3)' : 'none' }}>
                    R{product.price?.toFixed(0)}
                  </div>
                  {/* Stock count */}
                  <div className="text-[0.65rem] font-semibold mt-0.5" style={{ color: grad.text === 'white' ? 'rgba(255,255,255,0.5)' : 'rgba(30,51,40,0.4)' }}>
                    {stock} in stock
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* Quick Select Modal */}
      {quickModal && (
        <Modal
          title={quickModal.title}
          open={true}
          onClose={() => setQuickModal(null)}
          size="lg"
        >
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[60vh] overflow-y-auto">
            {quickModal.products.map(p => (
              <button
                key={p._id}
                onClick={() => handleQuickSelect(p)}
                className="p-4 rounded-lg bg-jig-slate border-2 border-transparent hover:border-jig-amber transition-colors text-center"
              >
                <div className="font-heading text-sm text-white">{p.name}</div>
                <div className="text-sm font-bold text-jig-amber-dark mt-1">
                  {quickModal.is3g ? `R${((p.price || 0) * 3).toFixed(0)} (3g)` : `R${p.price}`}
                </div>
              </button>
            ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
