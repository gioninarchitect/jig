// P38 — Product card: image, strain badge, name, price, add to cart (vanilla-matched)
import { Link } from 'react-router-dom';
import { formatCurrency } from '../../config';
import { useCart } from '../../contexts/CartContext';

export default function ProductCard({ product }) {
  const { addItem } = useCart();
  const stock = product.inventory?.quantity ?? product.quantity ?? 0;
  const inStock = stock > 0;
  const image = product.images?.[0] || product.image;

  function handleAddToCart(e) {
    e.preventDefault();
    e.stopPropagation();
    if (!inStock) return;
    addItem(product, 1);
  }

  return (
    <Link
      to={`/products/${product._id}`}
      className="bg-white rounded-[10px] overflow-hidden group flex flex-col transition-all duration-300"
      style={{ boxShadow: '0 4px 15px rgba(58,95,72,0.08)', border: '1px solid rgba(58,95,72,0.1)' }}
      onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.style.boxShadow = '0 10px 30px rgba(58,95,72,0.15)'; }}
      onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 15px rgba(58,95,72,0.08)'; }}
    >
      {/* Image */}
      <div className="w-full h-[250px] bg-origin-slate overflow-hidden relative">
        {image ? (
          <img src={image} alt={product.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-gray-300">
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5a1.5 1.5 0 001.5-1.5V5.25a1.5 1.5 0 00-1.5-1.5H3.75a1.5 1.5 0 00-1.5 1.5v14.25a1.5 1.5 0 001.5 1.5z" />
            </svg>
          </div>
        )}
        {/* Strain badge — absolute top-left */}
        {product.strain && (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 text-[0.7rem] font-bold bg-or-gold text-gray-100 rounded">
            {product.strain}
          </span>
        )}
        {!inStock && (
          <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
            <span className="px-3 py-1 bg-origin-red text-white text-xs font-bold uppercase rounded-md">Out of Stock</span>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="p-4 flex-1 flex flex-col">
        <h3 className="text-[1.1rem] font-semibold text-or-gold-dark mb-1 truncate">{product.name}</h3>
        <p className="text-[1.25rem] font-bold mb-3" style={{ color: '#B8922D' }}>{formatCurrency(product.price)}</p>
        <div className="mt-auto">
          <button
            onClick={handleAddToCart}
            disabled={!inStock}
            className={`w-full py-3 text-sm font-semibold rounded-[5px] transition-colors ${
              inStock
                ? 'bg-or-gold text-gray-100 hover:bg-or-gold-dark'
                : 'bg-gray-400 text-gray-100 cursor-not-allowed'
            }`}
          >
            {inStock ? 'Add to Cart' : 'Out of Stock'}
          </button>
        </div>
      </div>
    </Link>
  );
}
