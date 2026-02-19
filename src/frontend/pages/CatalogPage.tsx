/**
 * JIG Craft Cannabis - Product Catalog
 *
 * Browse products with category filter.
 * Client sees their tier-specific pricing.
 */

import { useState, useEffect, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { products as productsApi, orders as ordersApi, type ProductData } from '../api';
import { capitalize, formatRand } from '../utils';

const CATEGORIES = [
  { value: '', label: 'All Products' },
  { value: 'flower', label: 'FLOS' },
];

interface CartItem {
  product: ProductData;
  quantity: number;
}

export default function CatalogPage() {
  const { client } = useAuth();
  const navigate = useNavigate();
  const [productList, setProductList] = useState<ProductData[]>([]);
  const [category, setCategory] = useState('');
  const [loading, setLoading] = useState(true);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [ordering, setOrdering] = useState(false);
  const [orderSuccess, setOrderSuccess] = useState('');
  const [cartOpen, setCartOpen] = useState(false);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    try {
      const { products } = await productsApi.list(category || undefined);
      setProductList(products);
    } catch {
      // Silent fail
    } finally {
      setLoading(false);
    }
  }, [category]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const getTierPrice = (product: ProductData): number => {
    const tier = client?.tier || 'standard';
    const tierLabel = tier.charAt(0).toUpperCase() + tier.slice(1);
    const tierPrice = product.priceTiers?.find((t) => t.tierName === tierLabel);
    return tierPrice?.price ?? product.priceTiers?.[0]?.price ?? 0;
  };

  const getMinQty = (product: ProductData): number => {
    const maxMin = product.priceTiers?.reduce((max, t) => Math.max(max, t.minQuantity), 0) ?? 0;
    return maxMin > 1 ? maxMin : 1;
  };

  const getQtyStep = (product: ProductData): number => {
    // Bulk products (unit = grams) step in larger increments
    const minQty = getMinQty(product);
    if (product.unit === 'grams' && minQty >= 250) return 50;
    return 1;
  };

  const addToCart = (product: ProductData) => {
    const minQty = getMinQty(product);
    const step = getQtyStep(product);
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + step } : i,
        );
      }
      return [...prev, { product, quantity: minQty }];
    });
    setCartOpen(true);
  };

  const updateQuantity = (productId: string, quantity: number) => {
    const item = cart.find((i) => i.product.id === productId);
    const minQty = item ? getMinQty(item.product) : 1;
    if (quantity < minQty) {
      setCart((prev) => prev.filter((i) => i.product.id !== productId));
    } else {
      setCart((prev) =>
        prev.map((i) =>
          i.product.id === productId ? { ...i, quantity } : i,
        ),
      );
    }
  };

  const cartTotal = cart.reduce(
    (sum, item) => sum + getTierPrice(item.product) * item.quantity,
    0,
  );

  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;
    setOrdering(true);
    setOrderSuccess('');

    try {
      const { order } = await ordersApi.create(
        cart.map((item) => ({
          productId: item.product.id,
          quantity: item.quantity,
        })),
      );
      setCart([]);
      setCartOpen(false);
      navigate(`/orders/${order.id}`);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Order failed');
    } finally {
      setOrdering(false);
    }
  };

  return (
    <div className="p-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="font-heading text-2xl font-bold uppercase tracking-wide text-jig-white">
          Product Catalog
        </h1>
        {client?.tier && (
          <span className={`rounded px-3 py-1 font-heading text-[10px] font-semibold uppercase tracking-wider tier-${client.tier}`}>
            {capitalize(client.tier)} Pricing
          </span>
        )}
      </div>

      {/* Verification required banner */}
      {client && client.status !== 'active' && (
        <div className="mb-6 rounded-lg border border-jig-amber/30 bg-jig-amber/10 px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <svg className="h-5 w-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <span className="text-sm text-amber-400">
                Verification pending - complete it to fast-track your orders.
              </span>
            </div>
            <Link
              to="/verification"
              className="rounded bg-jig-amber/20 px-3 py-1 font-heading text-[10px] font-semibold uppercase tracking-wider text-amber-400 transition-colors hover:bg-jig-amber/30"
            >
              Verify Now
            </Link>
          </div>
        </div>
      )}

      {orderSuccess && (
        <div className="mb-6 rounded-lg border border-jig-green/30 bg-jig-green/10 px-4 py-3 text-sm text-green-400">
          {orderSuccess}
        </div>
      )}

      {/* Category filter */}
      <div className="mb-6 flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.value}
            onClick={() => setCategory(cat.value)}
            className={`rounded px-4 py-1.5 font-heading text-[12px] font-medium uppercase tracking-[0.08em] transition-all ${
              category === cat.value
                ? 'bg-jig-purple text-jig-white'
                : 'border border-white/[0.1] bg-white/[0.04] text-jig-gray-500 hover:border-white/[0.2] hover:text-jig-white'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Product grid */}
      {loading ? (
        <div className="flex h-40 items-center justify-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-jig-gray-700 border-t-jig-purple" />
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {productList.map((product, idx) => (
            <ProductCard
              key={product.id}
              product={product}
              price={getTierPrice(product)}
              onAdd={() => addToCart(product)}
              inCart={cart.some((i) => i.product.id === product.id)}
              index={idx}
            />
          ))}
          {productList.length === 0 && (
            <p className="col-span-full text-center text-sm text-jig-gray-500">
              No products in this category.
            </p>
          )}
        </div>
      )}

      {/* Floating cart button */}
      {cart.length > 0 && !cartOpen && (
        <button
          onClick={() => setCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-jig-gradient shadow-jig-glow transition-transform hover:scale-105"
        >
          <svg className="h-6 w-6 text-jig-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
          </svg>
          <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full bg-jig-amber text-xs font-bold text-jig-black">
            {cart.reduce((sum, i) => sum + i.quantity, 0)}
          </span>
        </button>
      )}

      {/* Cart slide-in drawer */}
      <div
        className={`fixed inset-0 z-50 transition-opacity duration-300 ${
          cartOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'
        }`}
      >
        {/* Backdrop */}
        <div
          className="absolute inset-0 bg-black/60"
          onClick={() => setCartOpen(false)}
        />

        {/* Drawer */}
        <div
          className={`absolute right-0 top-0 flex h-full w-full max-w-md flex-col border-l border-white/[0.06] bg-jig-slate transition-transform duration-300 ease-in-out ${
            cartOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-white/[0.06] px-5 py-4">
            <h2 className="font-heading text-lg font-semibold uppercase tracking-wide text-jig-white">
              Cart ({cart.reduce((sum, i) => sum + i.quantity, 0)})
            </h2>
            <button
              onClick={() => setCartOpen(false)}
              className="flex h-8 w-8 items-center justify-center rounded-md text-jig-gray-500 transition-colors hover:bg-white/[0.06] hover:text-jig-white"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Cart items */}
          <div className="flex-1 overflow-y-auto p-5">
            {cart.length === 0 ? (
              <p className="text-center text-sm text-jig-gray-500">Your cart is empty.</p>
            ) : (
              <div className="space-y-4">
                {cart.map((item) => (
                  <div
                    key={item.product.id}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-3"
                  >
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-jig-white">{item.product.name}</p>
                        <p className="mt-0.5 text-xs text-jig-gray-500">
                          R{getTierPrice(item.product).toFixed(2)} / {item.product.unit}
                        </p>
                      </div>
                      <button
                        onClick={() => updateQuantity(item.product.id, 0)}
                        className="ml-2 text-jig-gray-500 transition-colors hover:text-red-400"
                        title="Remove"
                      >
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                        </svg>
                      </button>
                    </div>
                    <div className="mt-2 flex items-center gap-3">
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity - getQtyStep(item.product))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-white/[0.15] text-xs text-jig-gray-300 transition-colors hover:bg-white/[0.06]"
                      >
                        -
                      </button>
                      <span className="min-w-[3rem] text-center text-sm font-medium text-jig-white">
                        {item.quantity}{item.product.unit === 'grams' ? 'g' : ''}
                      </span>
                      <button
                        onClick={() => updateQuantity(item.product.id, item.quantity + getQtyStep(item.product))}
                        className="flex h-7 w-7 items-center justify-center rounded border border-white/[0.15] text-xs text-jig-gray-300 transition-colors hover:bg-white/[0.06]"
                      >
                        +
                      </button>
                      <span className="ml-auto text-sm font-medium text-jig-amber">
                        R{(getTierPrice(item.product) * item.quantity).toFixed(2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Footer totals */}
          {cart.length > 0 && (
            <div className="border-t border-white/[0.06] p-5">
              <div className="mb-1 flex justify-between text-sm">
                <span className="text-jig-gray-500">Subtotal</span>
                <span className="font-medium text-jig-gray-300">R{cartTotal.toFixed(2)}</span>
              </div>
              <div className="mb-3 flex justify-between text-sm">
                <span className="text-jig-gray-500">VAT (15%)</span>
                <span className="font-medium text-jig-gray-300">R{(cartTotal * 0.15).toFixed(2)}</span>
              </div>
              <div className="mb-4 flex justify-between text-base font-bold">
                <span className="text-jig-white">Total</span>
                <span className="text-jig-amber">R{(cartTotal * 1.15).toFixed(2)}</span>
              </div>

              <button
                onClick={handlePlaceOrder}
                disabled={ordering}
                className="w-full rounded bg-jig-gradient px-4 py-2.5 font-heading text-[13px] font-semibold uppercase tracking-[0.08em] text-jig-white transition-all hover:-translate-y-0.5 hover:shadow-jig-glow disabled:opacity-50 disabled:hover:translate-y-0"
              >
                {ordering ? 'Placing Order...' : 'Place Order'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

const PRODUCT_IMAGES = ['/km/km01.png', '/km/km02.png', '/km/km-flos.png'];

function ProductCard({
  product,
  price,
  onAdd,
  inCart,
  index,
}: {
  product: ProductData;
  price: number;
  onAdd: () => void;
  inCart: boolean;
  index: number;
}) {
  const categoryLabel = product.category === 'flower' ? 'FLOS' : product.category;
  const imgSrc = PRODUCT_IMAGES[index % PRODUCT_IMAGES.length];

  return (
    <div className="group rounded-lg border border-white/[0.06] bg-jig-slate transition-all hover:border-jig-purple/30 hover:shadow-lg hover:shadow-black/20">
      {/* Product image */}
      <div className="relative h-40 overflow-hidden rounded-t-lg bg-jig-black">
        <img
          src={imgSrc}
          alt={product.name}
          className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-jig-slate/80 to-transparent" />
        <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
          <span className="rounded px-2 py-0.5 font-heading text-[10px] font-semibold uppercase tracking-wider bg-jig-green/15 text-green-400 border border-jig-green/25 backdrop-blur-sm">
            {categoryLabel}
          </span>
          {product.subcategory && (
            <span className="rounded px-2 py-0.5 font-heading text-[10px] font-medium uppercase tracking-wider bg-black/40 text-jig-gray-300 border border-white/[0.1] backdrop-blur-sm">
              {product.subcategory}
            </span>
          )}
        </div>
        {product.stockQuantity <= 10 && (
          <span className="absolute right-2 top-2 rounded bg-jig-amber/20 px-2 py-0.5 text-[10px] font-semibold text-jig-amber backdrop-blur-sm">
            Low stock
          </span>
        )}
      </div>

      <div className="p-4">
        <h3 className="mb-1 text-sm font-semibold text-jig-white">{product.name}</h3>
        <p className="mb-1 text-xs text-jig-gray-500">{product.strain}</p>

        <div className="mb-2 flex gap-3 text-xs text-jig-gray-500">
          {product.thcContent && <span>THC {product.thcContent}</span>}
          {product.cbdContent && <span>CBD {product.cbdContent}</span>}
        </div>

        <p className="mb-3 line-clamp-2 text-xs text-jig-gray-500">{product.description}</p>

        <div className="flex items-center justify-between">
          <div>
            <span className="text-lg font-bold text-jig-amber">R{price.toFixed(2)}</span>
            <span className="ml-1 text-xs text-jig-gray-500">/ {product.unit}</span>
          </div>
          <button
            onClick={onAdd}
            className={`rounded px-3 py-1.5 font-heading text-[11px] font-semibold uppercase tracking-wider transition-all ${
              inCart
                ? 'border border-white/[0.15] bg-white/[0.06] text-jig-gray-300 hover:bg-white/[0.1]'
                : 'bg-jig-purple text-jig-white hover:bg-jig-purple-light'
            }`}
          >
            {inCart ? 'Add More' : 'Add to Cart'}
          </button>
        </div>
      </div>
    </div>
  );
}
