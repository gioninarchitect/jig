import React, { useState, useEffect } from 'react';
import { useAuth } from './app.jsx';
import { apiCall } from './utils.js';

// Cart Component
function Cart() {
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchCart();
        } else {
            setLoading(false);
        }
    }, [user]);

    const fetchCart = async () => {
        try {
            const data = await apiCall('/cart');
            setCartItems(data);
            calculateTotal(data);
        } catch (err) {
            console.error('Failed to fetch cart');
        } finally {
            setLoading(false);
        }
    };

    const calculateTotal = (items) => {
        const sum = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);
        setTotal(sum);
    };

    const updateQuantity = async (itemId, newQuantity) => {
        if (newQuantity <= 0) {
            await removeItem(itemId);
            return;
        }
        
        try {
            await apiCall(`/cart/update/${itemId}`, 'PUT', { quantity: newQuantity });
            fetchCart();
        } catch (err) {
            alert('Failed to update quantity');
        }
    };

    const removeItem = async (itemId) => {
        try {
            await apiCall(`/cart/remove/${itemId}`, 'DELETE');
            fetchCart();
        } catch (err) {
            alert('Failed to remove item');
        }
    };

    if (loading) return <div className="loading">Loading cart...</div>;
    
    if (!user) {
        return (
            <div className="cart-empty">
                <h2>Please login to view your cart</h2>
                <a href="/login" className="cta-button">Login</a>
            </div>
        );
    }

    if (cartItems.length === 0) {
        return (
            <div className="cart-empty">
                <h2>Your cart is empty</h2>
                <a href="/merchandise" className="cta-button">Shop Now</a>
            </div>
        );
    }

    return (
        <div className="cart-container">
            <h2>Shopping Cart</h2>
            <div className="cart-items">
                {cartItems.map(item => (
                    <div key={item.id} className="cart-item">
                        <img src={item.image_url} alt={item.name} />
                        <div className="item-details">
                            <h3>{item.name}</h3>
                            {item.size && <p>Size: {item.size}</p>}
                            {item.color && <p>Color: {item.color}</p>}
                        </div>
                        <div className="item-price">R{item.price}</div>
                        <div className="item-quantity">
                            <button onClick={() => updateQuantity(item.id, item.quantity - 1)}>-</button>
                            <span>{item.quantity}</span>
                            <button onClick={() => updateQuantity(item.id, item.quantity + 1)}>+</button>
                        </div>
                        <div className="item-total">R{item.price * item.quantity}</div>
                        <button className="remove-btn" onClick={() => removeItem(item.id)}>Remove</button>
                    </div>
                ))}
            </div>
            <div className="cart-summary">
                <h3>Total: R{total}</h3>
                <a href="/checkout" className="checkout-btn">Proceed to Checkout</a>
            </div>
        </div>
    );
}

// Checkout Component
function Checkout() {
    const [cartItems, setCartItems] = useState([]);
    const [total, setTotal] = useState(0);
    const [formData, setFormData] = useState({
        shippingAddress: '',
        city: '',
        postalCode: '',
        paymentMethod: 'eft'
    });
    const [loading, setLoading] = useState(false);
    const { user } = useAuth();

    useEffect(() => {
        fetchCart();
    }, []);

    const fetchCart = async () => {
        try {
            const data = await apiCall('/cart');
            setCartItems(data);
            const sum = data.reduce((acc, item) => acc + (item.price * item.quantity), 0);
            setTotal(sum);
        } catch (err) {
            console.error('Failed to fetch cart');
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        
        try {
            const order = await apiCall('/orders/create', 'POST', {
                items: cartItems.map(item => ({
                    productId: item.product_id,
                    quantity: item.quantity,
                    size: item.size,
                    color: item.color
                })),
                shippingAddress: {
                    address: formData.shippingAddress,
                    city: formData.city,
                    postalCode: formData.postalCode
                },
                billingAddress: {
                    address: formData.shippingAddress,
                    city: formData.city,
                    postalCode: formData.postalCode
                },
                paymentMethod: formData.paymentMethod
            });
            
            // Redirect to order confirmation
            window.location.href = `/order-confirmation/${order.id}`;
        } catch (err) {
            alert('Failed to create order');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="checkout-container">
            <h2>Checkout</h2>
            <div className="checkout-content">
                <div className="checkout-form">
                    <form onSubmit={handleSubmit}>
                        <h3>Shipping Information</h3>
                        <input
                            type="text"
                            placeholder="Shipping Address"
                            value={formData.shippingAddress}
                            onChange={(e) => setFormData({...formData, shippingAddress: e.target.value})}
                            required
                        />
                        <input
                            type="text"
                            placeholder="City"
                            value={formData.city}
                            onChange={(e) => setFormData({...formData, city: e.target.value})}
                            required
                        />
                        <input
                            type="text"
                            placeholder="Postal Code"
                            value={formData.postalCode}
                            onChange={(e) => setFormData({...formData, postalCode: e.target.value})}
                            required
                        />
                        
                        <h3>Payment Method</h3>
                        <select 
                            value={formData.paymentMethod}
                            onChange={(e) => setFormData({...formData, paymentMethod: e.target.value})}
                        >
                            <option value="eft">EFT Transfer</option>
                            <option value="crypto">Bitcoin</option>
                        </select>
                        
                        <button type="submit" disabled={loading} className="checkout-btn">
                            {loading ? 'Processing...' : 'Place Order'}
                        </button>
                    </form>
                </div>
                
                <div className="order-summary">
                    <h3>Order Summary</h3>
                    {cartItems.map(item => (
                        <div key={item.id} className="summary-item">
                            <span>{item.name} x {item.quantity}</span>
                            <span>R{item.price * item.quantity}</span>
                        </div>
                    ))}
                    <div className="summary-total">
                        <strong>Total:</strong>
                        <strong>R{total}</strong>
                    </div>
                </div>
            </div>
        </div>
    );
}

// Order History Component
function OrderHistory() {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const { user } = useAuth();

    useEffect(() => {
        if (user) {
            fetchOrders();
        }
    }, [user]);

    const fetchOrders = async () => {
        try {
            const data = await apiCall('/orders');
            setOrders(data);
        } catch (err) {
            console.error('Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="loading">Loading orders...</div>;
    
    if (orders.length === 0) {
        return (
            <div className="orders-empty">
                <h2>No orders yet</h2>
                <a href="/merchandise" className="cta-button">Start Shopping</a>
            </div>
        );
    }

    return (
        <div className="orders-container">
            <h2>Order History</h2>
            <div className="orders-list">
                {orders.map(order => (
                    <div key={order.id} className="order-card">
                        <div className="order-header">
                            <h3>Order #{order.order_number}</h3>
                            <span className={`status ${order.status}`}>{order.status}</span>
                        </div>
                        <div className="order-info">
                            <p>Date: {new Date(order.created_at).toLocaleDateString()}</p>
                            <p>Items: {order.item_count}</p>
                            <p>Total: R{order.total_amount}</p>
                        </div>
                        <a href={`/orders/${order.id}`} className="view-order">View Details</a>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default { Cart, Checkout, OrderHistory };