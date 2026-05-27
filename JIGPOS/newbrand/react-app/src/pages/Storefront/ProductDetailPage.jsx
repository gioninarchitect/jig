// P38 — Product detail: image gallery, size/color selectors, features, cannabinoids, qty, add/buy, related (vanilla-matched)
import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useProduct } from '../../hooks/useProducts';
import { useCart } from '../../contexts/CartContext';
import { formatCurrency } from '../../config';
import api from '../../services/api';

export default function ProductDetailPage() {
  const { id } = useParams();
  const { product, loading, error } = useProduct(id);
  const { addItem } = useCart();
  const [qty, setQty] = useState(1);
  const [related, setRelated] = useState([]);
  const [added, setAdded] = useState(false);
  const [selectedSize, setSelectedSize] = useState(null);
  const [selectedColor, setSelectedColor] = useState(null);
  const [sizeError, setSizeError] = useState(false);
  const [colorError, setColorError] = useState(false);

  const stock = product?.inventory?.quantity ?? product?.quantity ?? 0;
  const inStock = stock > 0;
  const images = product?.images?.length ? product.images : product?.image ? [product.image] : [];
  const [activeImg, setActiveImg] = useState(0);

  // Reset selections when product changes
  useEffect(() => {
    setSelectedSize(null);
    setSelectedColor(null);
    setSizeError(false);
    setColorError(false);
    setQty(1);
    setAdded(false);
    setActiveImg(0);
  }, [id]);

  useEffect(() => {
    if (!product?.category) return;
    api
      .get('/products', { params: { category: product.category, limit: 4, status: 'active' } })
      .then((res) => {
        const prods = res.data.products || res.data.data || res.data || [];
        setRelated((Array.isArray(prods) ? prods : []).filter((p) => p._id !== product._id).slice(0, 4));
      })
      .catch(() => setRelated([]));
  }, [product?.category, product?._id]);

  function handleAdd() {
    if (!product || !inStock) return;

    // Validate size selection
    if (product.sizes?.length && !selectedSize) {
      setSizeError(true);
      return;
    }
    // Validate color selection
    if (product.colors?.length && !selectedColor) {
      setColorError(true);
      return;
    }

    addItem(product, qty, { size: selectedSize, color: selectedColor });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  function handleBuyNow() {
    if (!product || !inStock) return;

    if (product.sizes?.length && !selectedSize) {
      setSizeError(true);
      return;
    }
    if (product.colors?.length && !selectedColor) {
      setColorError(true);
      return;
    }

    addItem(product, qty, { size: selectedSize, color: selectedColor });
  }

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-[60vh]">
        <div className="w-10 h-10 border-3 border-origin-slate border-t-or-gold rounded-full animate-spin" />
      </div>
    );
  }

  if (error || !product) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-20 text-center">
        <h1 className="font-heading text-3xl text-origin-red uppercase mb-4">Product Not Found</h1>
        <p className="text-gray-500 mb-6">{error || 'This product could not be loaded.'}</p>
        <Link to="/products" className="text-sm font-semibold text-or-gold hover:text-or-gold-dark">&larr; Back to Products</Link>
      </div>
    );
  }

  return (
    <div>
      {/* Breadcrumb */}
      <div className="max-w-[1400px] mx-auto px-4 sm:px-8 py-6 text-or-gold">
        <div className="flex items-center gap-2 text-sm">
          <Link to="/home" className="opacity-70 hover:opacity-100 hover:text-or-gold-dark transition-all">Home</Link>
          <span className="opacity-50">/</span>
          <Link to="/products" className="opacity-70 hover:opacity-100 hover:text-or-gold-dark transition-all">Products</Link>
          <span className="opacity-50">/</span>
          <span className="text-white truncate">{product.name}</span>
        </div>
      </div>

      {/* Product */}
      <section className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-16">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
          {/* Image Gallery — sticky */}
          <div className="sticky top-[100px] h-fit">
            {/* Main Image */}
            <div
              className="w-full h-[500px] bg-white rounded-[12px] overflow-hidden mb-4"
              style={{ boxShadow: '0 4px 20px rgba(58,95,72,0.1)', border: '1px solid rgba(58,95,72,0.1)' }}
            >
              {images[activeImg] ? (
                <img src={images[activeImg]} alt={product.name} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-300">
                  <svg className="w-20 h-20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
                  </svg>
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {images.length > 1 && (
              <div className="flex gap-4 overflow-x-auto">
                {images.map((img, i) => (
                  <button
                    key={i}
                    onClick={() => setActiveImg(i)}
                    className="w-20 h-20 rounded-[8px] overflow-hidden shrink-0 bg-white transition-all"
                    style={{
                      opacity: i === activeImg ? 1 : 0.6,
                      border: i === activeImg ? '2px solid #F0A500' : '2px solid transparent',
                    }}
                  >
                    <img src={img} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info */}
          <div>
            {product.category && (
              <span className="inline-block px-3 py-1 text-xs font-bold uppercase tracking-wider bg-or-gold/10 text-or-gold rounded-md mb-3">
                {product.category}
              </span>
            )}
            <h1 className="font-heading text-[2.5rem] text-or-gold-dark uppercase tracking-wide mb-4">{product.name}</h1>

            <div className="flex items-center gap-4 mb-4">
              <span className="text-[2rem] font-bold text-or-gold">{formatCurrency(product.price)}</span>
              {product.comparePrice && (
                <>
                  <span className="text-lg text-or-gold opacity-50 line-through">{formatCurrency(product.comparePrice)}</span>
                  <span className="px-3 py-1 text-sm font-semibold bg-or-gold text-white rounded-[5px]">
                    {Math.round((1 - product.price / product.comparePrice) * 100)}% OFF
                  </span>
                </>
              )}
            </div>

            {/* Stock status */}
            <div
              className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-[5px] mb-6"
              style={{ border: '1px solid rgba(58,95,72,0.1)' }}
            >
              <div className={`w-2.5 h-2.5 rounded-full ${inStock ? (stock <= 10 ? 'bg-or-gold-dark' : 'bg-or-gold') : 'bg-red-600'}`} />
              <span className={`text-sm font-semibold ${inStock ? (stock <= 10 ? 'text-or-gold-dark' : 'text-or-gold') : 'text-red-600'}`}>
                {inStock ? (stock <= 10 ? `Only ${stock} left!` : 'In Stock') : 'Out of Stock'}
              </span>
            </div>

            {/* Description */}
            {product.description && (
              <div className="mb-8">
                <h3 className="font-heading text-[1.5rem] text-or-gold-dark uppercase mb-3">Description</h3>
                <p className="text-white leading-relaxed">{product.description}</p>
              </div>
            )}

            {/* Size Selector */}
            {product.sizes?.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-or-gold-dark uppercase tracking-wider mb-2">
                  Size:
                </label>
                <div className="flex flex-wrap gap-4">
                  {product.sizes.map((size) => (
                    <button
                      key={size}
                      onClick={() => { setSelectedSize(size); setSizeError(false); }}
                      className="px-4 py-2 text-sm font-semibold rounded-[5px] transition-all"
                      style={{
                        border: selectedSize === size ? '2px solid #C9A84C' : '2px solid #C9A84C',
                        background: selectedSize === size ? '#C9A84C' : 'transparent',
                        color: selectedSize === size ? '#0E0E0E' : '#1A1A1A',
                      }}
                      onMouseEnter={(e) => {
                        if (selectedSize !== size) {
                          e.currentTarget.style.borderColor = '#F0A500';
                          e.currentTarget.style.background = 'rgba(212,175,55,0.1)';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (selectedSize !== size) {
                          e.currentTarget.style.borderColor = '#C9A84C';
                          e.currentTarget.style.background = 'transparent';
                        }
                      }}
                    >
                      {size}
                    </button>
                  ))}
                </div>
                {sizeError && (
                  <p className="mt-2 text-sm text-origin-red font-semibold">Please select a size before adding to cart.</p>
                )}
              </div>
            )}

            {/* Color Selector */}
            {product.colors?.length > 0 && (
              <div className="mb-6">
                <label className="block text-sm font-semibold text-or-gold-dark uppercase tracking-wider mb-2">
                  Color:
                </label>
                <div className="flex flex-wrap gap-3">
                  {product.colors.map((color) => (
                    <button
                      key={color}
                      onClick={() => { setSelectedColor(color); setColorError(false); }}
                      title={color}
                      className="w-10 h-10 rounded-full transition-all"
                      style={{
                        background: color,
                        border: selectedColor === color ? '3px solid #F0A500' : '2px solid rgba(58,95,72,0.2)',
                        boxShadow: selectedColor === color ? '0 0 0 2px #0E0E0E, 0 0 0 4px #F0A500' : 'none',
                      }}
                    />
                  ))}
                </div>
                {colorError && (
                  <p className="mt-2 text-sm text-origin-red font-semibold">Please select a color before adding to cart.</p>
                )}
              </div>
            )}

            {/* Cannabinoid info */}
            {(product.thc || product.cbd) && (
              <div className="mb-8">
                <h3 className="font-heading text-[1.5rem] text-or-gold-dark uppercase mb-3">Cannabinoid Profile</h3>
                <div className="grid grid-cols-2 gap-4">
                  {product.thc && (
                    <div className="bg-origin-slate rounded-[10px] p-4 border border-gray-200 text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">THC</div>
                      <div className="font-heading text-2xl text-white">{product.thc}%</div>
                    </div>
                  )}
                  {product.cbd && (
                    <div className="bg-origin-slate rounded-[10px] p-4 border border-gray-200 text-center">
                      <div className="text-xs text-gray-500 uppercase tracking-wider mb-1">CBD</div>
                      <div className="font-heading text-2xl text-white">{product.cbd}%</div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Features */}
            {product.features?.length > 0 && (
              <div className="mb-8">
                <h3 className="font-heading text-[1.5rem] text-or-gold-dark uppercase mb-3">Features</h3>
                <div className="grid grid-cols-2 gap-3">
                  {product.features.map((feature, i) => (
                    <div key={i} className="flex items-center gap-2 text-white">
                      <span className="text-or-gold font-bold">&#10003;</span>
                      <span>{feature}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Details (strain) */}
            {product.strain && (
              <div className="mb-8">
                <h3 className="font-heading text-[1.5rem] text-or-gold-dark uppercase mb-3">Details</h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex items-center gap-2 text-white">
                    <span className="text-or-gold font-bold">&#10003;</span>
                    <span>Strain: {product.strain}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Quantity + Buttons */}
            <div className="flex items-center gap-4 mb-6">
              <div className="flex items-center border-2 border-or-gold rounded-[5px] overflow-hidden">
                <button onClick={() => setQty(Math.max(1, qty - 1))} className="px-4 py-3 text-or-gold-dark font-semibold text-lg hover:bg-or-gold/10 transition-colors">-</button>
                <span className="w-[60px] py-3 text-center font-semibold text-or-gold-dark">{qty}</span>
                <button onClick={() => setQty(Math.min(stock, qty + 1))} disabled={qty >= stock} className="px-4 py-3 text-or-gold-dark font-semibold text-lg hover:bg-or-gold/10 transition-colors disabled:opacity-30">+</button>
              </div>
              <button
                onClick={handleAdd}
                disabled={!inStock}
                className={`flex-1 py-4 text-[1.1rem] font-semibold uppercase tracking-wide rounded-[5px] transition-all ${
                  added
                    ? 'bg-or-gold-dark text-gray-100'
                    : inStock
                      ? 'bg-or-gold text-gray-100 hover:bg-or-gold-dark'
                      : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                }`}
              >
                {added ? 'Added to Cart!' : inStock ? 'Add to Cart' : 'Out of Stock'}
              </button>
            </div>

            {/* Buy Now */}
            {inStock && (
              <Link
                to="/checkout"
                onClick={handleBuyNow}
                className="block w-full py-4 text-center text-[1.1rem] font-semibold uppercase tracking-wide rounded-[5px] border-2 border-or-gold text-or-gold-dark hover:bg-or-gold hover:text-white transition-all mb-6"
              >
                Buy Now
              </Link>
            )}
          </div>
        </div>
      </section>

      {/* Related Products */}
      {related.length > 0 && (
        <section className="max-w-[1400px] mx-auto px-4 sm:px-8 pb-16">
          <h2 className="font-heading text-[2rem] text-or-gold-dark uppercase mb-8">Related Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-8">
            {related.map((p) => (
              <Link
                key={p._id}
                to={`/products/${p._id}`}
                className="bg-white rounded-[12px] overflow-hidden transition-all duration-300"
                style={{ boxShadow: '0 4px 20px rgba(58,95,72,0.1)', border: '1px solid rgba(58,95,72,0.1)' }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 8px 30px rgba(58,95,72,0.15)'; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 20px rgba(58,95,72,0.1)'; }}
              >
                <div className="w-full h-[200px] bg-origin-slate overflow-hidden">
                  {(p.images?.[0] || p.image) ? (
                    <img src={p.images?.[0] || p.image} alt={p.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">No image</div>
                  )}
                </div>
                <div className="p-4">
                  <h3 className="font-semibold text-or-gold-dark mb-1 truncate">{p.name}</h3>
                  <p className="font-bold text-or-gold">{formatCurrency(p.price)}</p>
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
