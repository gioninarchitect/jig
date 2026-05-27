// dash-cart.js — Shopping cart CRUD (load, save, UI, remove, checkout, clear)
// Depends on: config.js (API_URL), or-utils.js (showNotification)
// Depends on: dash-products.js (updateCartCount)

// Shopping Cart Functions
let cart = [];

async function loadCart() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');

    if (token) {
        // Logged-in user: Load from MongoDB via Cart API
        try {
            const response = await fetch(`${API_URL}/cart`, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                const data = await response.json();
                // Transform API response to local cart format
                cart = (data.cart?.items || []).map(item => ({
                    productId: item.product?._id || item.product,
                    name: item.name,
                    price: item.price,
                    quantity: item.quantity,
                    image: item.image
                }));
            } else {
                console.error('Failed to load cart from API');
                cart = [];
            }
        } catch (error) {
            console.error('Error loading cart:', error);
            cart = [];
        }
    } else {
        // Guest user: Load from localStorage
        const savedCart = localStorage.getItem('cart');
        if (savedCart) {
            cart = JSON.parse(savedCart);
        }
    }

    updateCartUI();
}

function saveCart() {
    // For guest users, save to localStorage
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    if (!token) {
        localStorage.setItem('cart', JSON.stringify(cart));
    }
    // For logged-in users, cart is saved via API in addLifestyleProductToCart
}

function updateCartUI() {
    const cartItemsContainer = document.getElementById('cartItemsContainer');
    const cartTotal = document.getElementById('cartTotal');
    const cartBadge = document.getElementById('cartBadge');

    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);

    if (totalItems > 0) {
        cartBadge.style.display = 'flex';
        cartBadge.textContent = totalItems;
    } else {
        cartBadge.style.display = 'none';
    }

    if (cart.length === 0) {
        cartItemsContainer.innerHTML = '<p style="text-align: center; color: #737373; padding: 40px;">Your cart is empty</p>';
        cartTotal.textContent = 'R0.00';
    } else {
        const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        cartTotal.textContent = `R${total.toFixed(2)}`;

        cartItemsContainer.innerHTML = cart.map(item => `
            <div class="cart-item">
                <div class="cart-item-image">
                    <i class="fas fa-leaf"></i>
                </div>
                <div class="cart-item-details">
                    <h4 style="margin-bottom: 5px; color: #0E0E0E; font-size: 0.9rem;">${item.name}</h4>
                    <p style="color: #737373; font-size: 0.8rem; margin-bottom: 4px;">Qty: ${item.quantity}</p>
                    <p style="font-weight: 700; color: #0E0E0E;">R${(item.price * item.quantity).toFixed(2)}</p>
                </div>
                <button class="cart-item-remove" onclick="removeFromCart('${item.productId || item._id}')">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        `).join('');
    }
}

function toggleCart() {
    document.getElementById('cartSidebar').classList.toggle('active');
}

async function removeFromCart(productId) {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');

    if (token) {
        // Logged-in user: Find item index and call API
        const itemIndex = cart.findIndex(item => (item.productId || item._id) === productId);

        if (itemIndex !== -1) {
            try {
                const response = await fetch(`${API_URL}/cart/item/${itemIndex}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (response.ok) {
                    // Reload cart from API to ensure sync
                    await loadCart();
                    showNotification('Item removed from cart', 'success');
                } else {
                    showNotification('Failed to remove item', 'error');
                }
            } catch (error) {
                console.error('Error removing item:', error);
                showNotification('Error removing item', 'error');
            }
        }
    } else {
        // Guest user: Update localStorage
        cart = cart.filter(item => (item.productId || item._id) !== productId);
        saveCart();
        updateCartUI();
    }

    updateCartCount();
}

function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty. Add items before checking out.', 'info');
        return;
    }
    localStorage.setItem('checkoutCart', JSON.stringify(cart));
    window.location.href = '/order.html';
}

async function clearCart() {
    if (cart.length === 0) {
        showNotification('Cart is already empty', 'info');
        return;
    }

    const token = sessionStorage.getItem('token') || localStorage.getItem('token');

    if (token) {
        // Logged-in user: Call API to clear cart
        try {
            const response = await fetch(`${API_URL}/cart/clear`, {
                method: 'DELETE',
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (response.ok) {
                cart = [];
                updateCartUI();
                updateCartCount();
                showNotification('Cart cleared', 'success');
            } else {
                const data = await response.json();
                showNotification(data.message || 'Failed to clear cart', 'error');
            }
        } catch (error) {
            console.error('Error clearing cart:', error);
            showNotification('Error clearing cart', 'error');
        }
    } else {
        // Guest user: Clear localStorage
        cart = [];
        localStorage.removeItem('cart');
        updateCartUI();
        updateCartCount();
        showNotification('Cart cleared', 'success');
    }
}

// Load cart on page load
loadCart();
