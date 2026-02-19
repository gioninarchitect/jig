import React, { useState, useEffect } from 'react';
import { useAuth } from './app.jsx';
import { apiCall } from './utils.js';

// Product Card Component
function ProductCard({ product, onAddToCart }) {
    const [loading, setLoading] = useState(false);
    
    const handleAddToCart = async () => {
        setLoading(true);
        await onAddToCart(product);
        setLoading(false);
    };
    
    return (
        <div className="product-card">
            <div className="product-image">
                <img src={product.image_url} alt={product.name} />
            </div>
            <div className="product-info">
                <h3 className="product-title">{product.name}</h3>
                <p className="product-description">{product.description}</p>
                <div className="product-price">R{product.price}</div>
                <button 
                    className="add-to-cart" 
                    onClick={handleAddToCart}
                    disabled={loading}
                >
                    {loading ? 'Adding...' : 'Add to Cart'}
                </button>
            </div>
        </div>
    );
}

// Merchandise Products Component
function Merchandise({ featured = false }) {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        fetchProducts();
    }, []);

    const fetchProducts = async () => {
        try {
            const data = await apiCall('/products/merchandise');
            setProducts(featured ? data.slice(0, 3) : data);
        } catch (err) {
            setError('Failed to load products');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (product) => {
        if (!user) {
            window.location.href = '/login';
            return;
        }
        
        try {
            await apiCall('/cart/add', 'POST', {
                productId: product.id,
                quantity: 1
            });
            // Show success feedback
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'ADDED!';
            button.style.background = '#059669';
            setTimeout(() => {
                button.textContent = originalText;
                button.style.background = '';
            }, 1000);
        } catch (err) {
            alert('Failed to add to cart');
        }
    };

    if (loading) return <div className="loading">Loading products...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <section className="products" id="products">
            <div className="container">
                <h2 className="section-title">Gas Station Collection</h2>
                <div className="product-grid">
                    {products.map(product => (
                        <ProductCard 
                            key={product.id}
                            product={product}
                            onAddToCart={addToCart}
                        />
                    ))}
                </div>
                {featured && (
                    <div className="view-all">
                        <a href="/merchandise" className="cta-button">View All Products</a>
                    </div>
                )}
            </div>
        </section>
    );
}

// Lifestyle Products Component
function Lifestyle() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        if (user?.isLifestyleMember) {
            fetchLifestyleProducts();
        }
    }, [user]);

    const fetchLifestyleProducts = async () => {
        try {
            const data = await apiCall('/products/lifestyle');
            setProducts(data);
        } catch (err) {
            setError('Failed to load lifestyle products');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async (product) => {
        try {
            await apiCall('/cart/add', 'POST', {
                productId: product.id,
                quantity: 1
            });
            // Show success
            alert('Added to cart!');
        } catch (err) {
            alert('Failed to add to cart');
        }
    };

    if (!user?.isLifestyleMember) {
        return (
            <div className="lifestyle-locked">
                <h2>Exclusive Lifestyle Collection</h2>
                <p>This collection is exclusively available to Lifestyle Members</p>
                <button className="cta-button">Become a Lifestyle Member</button>
            </div>
        );
    }

    if (loading) return <div className="loading">Loading lifestyle products...</div>;
    if (error) return <div className="error">{error}</div>;

    return (
        <section className="products lifestyle-products">
            <div className="container">
                <h2 className="section-title">Exclusive Lifestyle Collection</h2>
                <p className="section-subtitle">Premium pieces for Lifestyle Members only</p>
                <div className="product-grid">
                    {products.map(product => (
                        <ProductCard 
                            key={product.id}
                            product={product}
                            onAddToCart={addToCart}
                        />
                    ))}
                </div>
            </div>
        </section>
    );
}

// Product Detail Component
function ProductDetail({ productId }) {
    const [product, setProduct] = useState(null);
    const [loading, setLoading] = useState(true);
    const [quantity, setQuantity] = useState(1);
    const [selectedSize, setSelectedSize] = useState('');
    const [selectedColor, setSelectedColor] = useState('');
    const { user } = useAuth();

    useEffect(() => {
        fetchProduct();
    }, [productId]);

    const fetchProduct = async () => {
        try {
            const data = await apiCall(`/products/${productId}`);
            setProduct(data);
            if (data.sizes?.length > 0) setSelectedSize(data.sizes[0]);
            if (data.colors?.length > 0) setSelectedColor(data.colors[0]);
        } catch (err) {
            console.error('Failed to load product');
        } finally {
            setLoading(false);
        }
    };

    const addToCart = async () => {
        if (!user) {
            window.location.href = '/login';
            return;
        }

        try {
            await apiCall('/cart/add', 'POST', {
                productId: product.id,
                quantity,
                size: selectedSize,
                color: selectedColor
            });
            alert('Added to cart!');
        } catch (err) {
            alert('Failed to add to cart');
        }
    };

    if (loading) return <div className="loading">Loading...</div>;
    if (!product) return <div className="error">Product not found</div>;

    return (
        <div className="product-detail">
            <div className="product-images">
                <img src={product.image_url} alt={product.name} />
            </div>
            <div className="product-info-detail">
                <h1>{product.name}</h1>
                <p className="description">{product.description}</p>
                <div className="price">R{product.price}</div>
                
                {product.sizes?.length > 0 && (
                    <div className="options">
                        <label>Size:</label>
                        <select value={selectedSize} onChange={(e) => setSelectedSize(e.target.value)}>
                            {product.sizes.map(size => (
                                <option key={size} value={size}>{size}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                {product.colors?.length > 0 && (
                    <div className="options">
                        <label>Color:</label>
                        <select value={selectedColor} onChange={(e) => setSelectedColor(e.target.value)}>
                            {product.colors.map(color => (
                                <option key={color} value={color}>{color}</option>
                            ))}
                        </select>
                    </div>
                )}
                
                <div className="quantity">
                    <button onClick={() => setQuantity(Math.max(1, quantity - 1))}>-</button>
                    <span>{quantity}</span>
                    <button onClick={() => setQuantity(quantity + 1)}>+</button>
                </div>
                
                <button className="add-to-cart-detail" onClick={addToCart}>
                    Add to Cart
                </button>
            </div>
        </div>
    );
}

export default { Merchandise, Lifestyle, ProductDetail };