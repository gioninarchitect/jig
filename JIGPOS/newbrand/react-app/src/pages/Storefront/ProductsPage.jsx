// P38 — Product catalogue: pill search, filters sidebar, sort, grouped grid, pagination (vanilla-matched)
import { useState, useEffect, useCallback, useMemo } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '../../hooks/useProducts';
import { useAuth } from '../../contexts/AuthContext';
import ProductCard from '../../components/storefront/ProductCard';
import ProductFilters from '../../components/storefront/ProductFilters';
import Pagination from '../../components/storefront/Pagination';
import api from '../../services/api';

const SORT_OPTIONS = [
  { label: 'Newest', value: '-createdAt' },
  { label: 'Price: Low to High', value: 'price' },
  { label: 'Price: High to Low', value: '-price' },
  { label: 'Best Selling', value: '-sold' },
];

const ANON_CATEGORIES = ['accessories', 'merchandise', 'apparel', 'gifts', 'grinders', 'papers', 'storage', 'pipes'];

const CATEGORY_INFO = {
  'flower': { name: 'Flower', icon: 'fa-leaf' },
  'pre-rolls': { name: 'Pre-Rolls', icon: 'fa-smoking' },
  'edibles': { name: 'Edibles', icon: 'fa-cookie-bite' },
  'oils': { name: 'Oils & Tinctures', icon: 'fa-droplet' },
  'vapes': { name: 'Vapes', icon: 'fa-wind' },
  'concentrates': { name: 'Concentrates', icon: 'fa-flask' },
  'topicals': { name: 'Topicals', icon: 'fa-pump-soap' },
  'accessories': { name: 'Accessories', icon: 'fa-toolbox' },
  'lifestyle-cbd': { name: 'Lifestyle CBD', icon: 'fa-heart' },
  'bundles': { name: 'Bundles & Deals', icon: 'fa-gift' },
  'vaporizers': { name: 'Vaporizers', icon: 'fa-cloud' },
  'merchandise': { name: 'Merchandise', icon: 'fa-shirt' },
};

const SUPPLIER_INFO = {
  'indoor': { name: 'Indoor', icon: 'fa-house', color: '#8B5CF6' },
  'greendoor': { name: 'Greendoor', icon: 'fa-door-open', color: '#10B981' },
};

const PRODUCT_TYPE_INFO = {
  'pre-roll': { name: 'Pre Rolls', icon: 'fa-joint', color: '#F8C242' },
  'pre-pack': { name: 'Pre Packs', icon: 'fa-box', color: '#3B82F6' },
  'loose': { name: 'Loose', icon: 'fa-cannabis', color: '#22C55E' },
};

const CATEGORY_ORDER = ['flower', 'pre-rolls', 'edibles', 'oils', 'vapes', 'concentrates', 'topicals', 'accessories', 'lifestyle-cbd', 'bundles', 'vaporizers', 'merchandise'];

export default function ProductsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();

  const [page, setPage] = useState(Number(searchParams.get('page')) || 1);
  const [category, setCategory] = useState(searchParams.get('category') || '');
  const [search, setSearch] = useState(searchParams.get('search') || '');
  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');
  const [sort, setSort] = useState(searchParams.get('sort') || '-createdAt');
  const [minPrice, setMinPrice] = useState(searchParams.get('minPrice') || '');
  const [maxPrice, setMaxPrice] = useState(searchParams.get('maxPrice') || '');
  const [inStockOnly, setInStockOnly] = useState(false);
  const [categories, setCategories] = useState([]);

  const { products, loading, totalPages, total } = useProducts({ page, category, search, sort, minPrice, maxPrice });

  useEffect(() => {
    api.get('/products/categories')
      .then((res) => {
        const cats = res.data.categories || res.data || [];
        setCategories(Array.isArray(cats) ? cats : []);
      })
      .catch(() => setCategories([]));
  }, []);

  const visibleProducts = products.filter((p) => {
    if (inStockOnly && (p.inventory?.quantity ?? p.quantity ?? 0) <= 0) return false;
    if (!isAuthenticated) {
      const cat = (p.category || '').toLowerCase();
      return ANON_CATEGORIES.some((ac) => cat.includes(ac));
    }
    if (p.section21 && user?.role === 'user' && !user?.section21Approved) return false;
    return true;
  });

  // Group products by category, then within flower by supplier and type
  const groupedProducts = useMemo(() => {
    const grouped = {};
    visibleProducts.forEach((p) => {
      const cat = (p.category || 'other').toLowerCase();
      if (!grouped[cat]) grouped[cat] = [];
      grouped[cat].push(p);
    });

    // Sort categories by defined order
    const sortedCategories = Object.keys(grouped).sort((a, b) => {
      const aIdx = CATEGORY_ORDER.indexOf(a);
      const bIdx = CATEGORY_ORDER.indexOf(b);
      if (aIdx === -1 && bIdx === -1) return grouped[b].length - grouped[a].length;
      if (aIdx === -1) return 1;
      if (bIdx === -1) return -1;
      return aIdx - bIdx;
    });

    return sortedCategories.map((cat) => {
      const catProducts = grouped[cat];
      const catInfo = CATEGORY_INFO[cat] || { name: cat.charAt(0).toUpperCase() + cat.slice(1), icon: 'fa-tag' };

      // For flower category: group by supplier then type
      if (cat === 'flower') {
        const bySupplier = { indoor: [], greendoor: [], other: [] };
        catProducts.forEach((p) => {
          const supplier = p.supplier || (
            p.tags?.includes('indoor') ? 'indoor' :
            p.tags?.includes('greendoor') ? 'greendoor' :
            'other'
          );
          if (bySupplier[supplier]) bySupplier[supplier].push(p);
          else bySupplier.other.push(p);
        });

        const suppliers = Object.entries(bySupplier)
          .filter(([, items]) => items.length > 0)
          .map(([supplier, items]) => {
            const supInfo = SUPPLIER_INFO[supplier] || { name: supplier, icon: 'fa-store', color: '#6B7280' };
            const byType = { 'pre-roll': [], 'pre-pack': [], 'loose': [], other: [] };
            items.forEach((p) => {
              const pType = p.productType || 'loose';
              if (byType[pType]) byType[pType].push(p);
              else byType.other.push(p);
            });
            const types = Object.entries(byType)
              .filter(([, typeItems]) => typeItems.length > 0)
              .map(([type, typeItems]) => ({
                type,
                info: PRODUCT_TYPE_INFO[type] || { name: type, icon: 'fa-box', color: '#6B7280' },
                products: typeItems,
              }));
            return { supplier, info: supInfo, types, count: items.length };
          });

        return { category: cat, info: catInfo, count: catProducts.length, isFlower: true, suppliers };
      }

      return { category: cat, info: catInfo, count: catProducts.length, isFlower: false, products: catProducts };
    });
  }, [visibleProducts]);

  useEffect(() => {
    const params = {};
    if (page > 1) params.page = page;
    if (category) params.category = category;
    if (search) params.search = search;
    if (sort !== '-createdAt') params.sort = sort;
    if (minPrice) params.minPrice = minPrice;
    if (maxPrice) params.maxPrice = maxPrice;
    setSearchParams(params, { replace: true });
  }, [page, category, search, sort, minPrice, maxPrice, setSearchParams]);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    setSearch(searchInput);
    setPage(1);
  }, [searchInput]);

  // If searching or filtering by category, show flat grid (no grouping)
  const showGrouped = !search && !category;

  return (
    <div>
      {/* Search Section */}
      <section className="py-8 bg-or-gold">
        <div className="max-w-[600px] mx-auto px-4">
          <form onSubmit={handleSearch} className="relative">
            <input
              type="text"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Search products..."
              className="w-full py-4 pl-6 pr-14 bg-origin-slate border-2 border-or-gold rounded-full text-white placeholder:text-gray-400 focus:outline-none focus:border-or-gold-light transition-all"
              style={{ boxShadow: '0 0 0 0 transparent' }}
              onFocus={(e) => { e.target.style.boxShadow = '0 0 0 3px rgba(212,175,55,0.2)'; }}
              onBlur={(e) => { e.target.style.boxShadow = '0 0 0 0 transparent'; }}
            />
            <button
              type="submit"
              className="absolute right-[5px] top-1/2 -translate-y-1/2 w-10 h-10 bg-or-gold rounded-full flex items-center justify-center text-or-gold-dark hover:bg-or-gold-dark transition-colors"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
              </svg>
            </button>
          </form>
        </div>
      </section>

      {/* Content */}
      <section className="py-8 sm:py-12 bg-origin-slate">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row gap-8">
            {/* Sidebar */}
            <aside className="lg:w-[250px] shrink-0">
              <ProductFilters
                categories={categories}
                category={category}
                onCategoryChange={(c) => { setCategory(c); setPage(1); }}
                minPrice={minPrice}
                maxPrice={maxPrice}
                onPriceChange={(min, max) => { setMinPrice(min); setMaxPrice(max); setPage(1); }}
                inStockOnly={inStockOnly}
                onStockChange={(v) => setInStockOnly(v)}
              />
            </aside>

            {/* Main */}
            <div className="flex-1">
              {/* Sort + count */}
              <div className="flex items-center justify-between mb-8">
                <h2 className="font-heading text-[1.75rem] text-or-gold-dark tracking-wide">
                  {loading ? 'Loading...' : `${visibleProducts.length} Product${visibleProducts.length !== 1 ? 's' : ''}`}
                </h2>
                <select
                  value={sort}
                  onChange={(e) => { setSort(e.target.value); setPage(1); }}
                  className="px-4 py-2 bg-white border border-or-gold-light rounded-[5px] text-sm text-white cursor-pointer focus:outline-none focus:border-or-gold transition-colors"
                >
                  {SORT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Grid */}
              {loading ? (
                <div className="flex justify-center py-16">
                  <div className="w-10 h-10 border-3 border-origin-slate border-t-or-gold rounded-full animate-spin" />
                </div>
              ) : visibleProducts.length === 0 ? (
                <div className="text-center py-16">
                  <p className="text-gray-400 mb-2">No products found.</p>
                  <p className="text-sm text-gray-400">Try adjusting your filters or search.</p>
                </div>
              ) : showGrouped ? (
                /* Grouped display — category sections with supplier/type sub-groups */
                <div className="space-y-0">
                  {groupedProducts.map((group) => (
                    <div key={group.category}>
                      {/* Category Header */}
                      <div className="mt-8 first:mt-0 mb-4 pb-2" style={{ borderBottom: '3px solid #F0A500' }}>
                        <h3
                          className="flex items-center gap-3"
                          style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.75rem', color: '#8B6914' }}
                        >
                          <i className={`fas ${group.info.icon}`} style={{ color: '#F0A500' }} />
                          {group.info.name}
                          <span style={{ fontSize: '0.9rem', color: '#6B7280', fontWeight: 'normal' }}>
                            ({group.count})
                          </span>
                        </h3>
                      </div>

                      {group.isFlower ? (
                        /* Flower: supplier > type > products */
                        group.suppliers.map((sup) => (
                          <div key={sup.supplier} className="mb-6">
                            {/* Supplier Header */}
                            <div
                              className="mb-3 mt-6 pl-2"
                              style={{ borderLeft: `4px solid ${sup.info.color}` }}
                            >
                              <h4
                                className="flex items-center gap-2"
                                style={{ fontFamily: "'Barlow Condensed', sans-serif", fontSize: '1.35rem', color: sup.info.color }}
                              >
                                <i className={`fas ${sup.info.icon}`} />
                                {sup.info.name}
                                <span style={{ fontSize: '0.85rem', color: '#6B7280', fontWeight: 'normal' }}>
                                  ({sup.count})
                                </span>
                              </h4>
                            </div>

                            {sup.types.map((typeGroup) => (
                              <div key={typeGroup.type} className="mb-4">
                                {/* Product Type Header */}
                                <div className="mb-2 pl-6">
                                  <h5
                                    className="flex items-center gap-1.5"
                                    style={{
                                      fontFamily: "'Barlow Condensed', sans-serif",
                                      fontSize: '1rem',
                                      color: typeGroup.info.color,
                                      fontWeight: 600,
                                    }}
                                  >
                                    <i className={`fas ${typeGroup.info.icon}`} style={{ fontSize: '0.85rem' }} />
                                    {typeGroup.info.name}
                                    <span style={{ fontSize: '0.8rem', color: '#6B7280', fontWeight: 'normal' }}>
                                      ({typeGroup.products.length})
                                    </span>
                                  </h5>
                                </div>

                                {/* Product Grid */}
                                <div
                                  className="grid gap-8"
                                  style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}
                                >
                                  {typeGroup.products.map((product) => (
                                    <ProductCard key={product._id} product={product} />
                                  ))}
                                </div>
                              </div>
                            ))}
                          </div>
                        ))
                      ) : (
                        /* Non-flower: flat product grid */
                        <div
                          className="grid gap-8"
                          style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}
                        >
                          {group.products.map((product) => (
                            <ProductCard key={product._id} product={product} />
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                /* Flat grid — when searching or filtered by category */
                <div className="grid gap-8" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))' }}>
                  {visibleProducts.map((product) => (
                    <ProductCard key={product._id} product={product} />
                  ))}
                </div>
              )}

              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
