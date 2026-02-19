// dash-products.js — Product catalogue, add to cart, cart count
// Depends on: config.js (API_URL), dbc-utils.js (showNotification)
// Depends on: dash-core.js (showConfirmModal), dash-cart.js (loadCart, toggleCart)

// ===== PRODUCTS =====
async function loadLifestyleProducts() {
    const grid = document.getElementById('lifestyleProductsGrid');

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const headers = {};
        if (token) headers['Authorization'] = `Bearer ${token}`;

        const response = await fetch(`${API_URL}/products?track=lifestyle`, { headers });

        if (response.ok) {
            const data = await response.json();
            displayLifestyleProducts(data.products || []);
        } else {
            grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--error-color); grid-column: 1 / -1;">Failed to load products</div>';
        }
    } catch (error) {
        console.error('Load products error:', error);
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--error-color); grid-column: 1 / -1;">Network error loading products</div>';
    }
}

function displayLifestyleProducts(products) {
    const grid = document.getElementById('lifestyleProductsGrid');

    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--text-muted); grid-column: 1 / -1;">No lifestyle products available at this time</div>';
        return;
    }

    grid.innerHTML = products.map(product => {
        const imageUrl = product.images && product.images.length > 0
            ? product.images[0].url
            : '/images/DeBudChef-rLogo.png';

        return `
            <div style="background: var(--bg-tertiary); border-radius: 12px; padding: 1.5rem; border: 1px solid var(--border-color); cursor: pointer; transition: all 0.3s; height: 100%;" onclick="viewLifestyleProduct('${product._id}')">
                <div style="width: 100%; height: 150px; background: rgba(255, 255, 255, 0.05); border-radius: 8px; display: flex; align-items: center; justify-content: center; margin-bottom: 1rem;">
                    <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain;" onerror="this.src='/images/DeBudChef-rLogo.png'">
                </div>
                <div style="background: rgba(74, 74, 74, 0.2); color: #f5f5f5; padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; display: inline-block; margin-bottom: 0.5rem;">
                    ${product.category.toUpperCase()}
                </div>
                <h3 style="margin-bottom: 0.5rem; font-size: 1.1rem;">${product.name}</h3>
                <p style="color: var(--text-muted); font-size: 0.875rem; margin-bottom: 1rem; line-height: 1.4;">
                    ${product.shortDescription || product.description.substring(0, 80) + '...'}
                </p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto;">
                    <span style="font-size: 1.25rem; font-weight: 600; color: var(--primary-color);">R${product.price.toFixed(2)}</span>
                    <button class="btn btn-primary" style="padding: 0.5rem 1rem; font-size: 0.875rem;" onclick="event.stopPropagation(); addLifestyleProductToCart('${product._id}')">Add to Cart</button>
                </div>
            </div>
        `;
    }).join('');
}

async function viewLifestyleProduct(productId) {
    // TODO: Show product detail modal
    console.log('View lifestyle product:', productId);
}

async function addLifestyleProductToCart(productId) {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');

        if (!token) {
            // Guest user - use localStorage
            const response = await fetch(`${API_URL}/products/${productId}`);
            if (!response.ok) throw new Error('Failed to fetch product');

            const data = await response.json();
            const product = data.data || data;

            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const existingItem = cart.find(item => item.productId === productId);

            if (existingItem) {
                existingItem.quantity++;
            } else {
                cart.push({
                    productId: product._id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    image: product.images && product.images.length > 0 ? product.images[0].url : '/images/DeBudChef-rLogo.png'
                });
            }

            localStorage.setItem('cart', JSON.stringify(cart));
            updateCartCount();
            showNotification(`${product.name} added to cart!`, 'success');
            toggleCart(); // Open cart drawer to show added item
            return;
        }

        // Logged-in user - use Cart API
        const response = await fetch(`${API_URL}/cart/add`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                productId: productId,
                quantity: 1
            })
        });

        if (!response.ok) throw new Error('Failed to add to cart');

        const data = await response.json();

        if (!data.success) {
            throw new Error(data.message || 'Failed to add to cart');
        }

        // Reload cart from MongoDB to update display
        await loadCart();

        // Show success notification
        showNotification('Product added to cart!', 'success');

        // Open cart drawer to show added item
        toggleCart();
    } catch (error) {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add product to cart', 'error');
    }
}

// ===== MY HEALTH PORTAL =====
function openMedicalPortal(section) {
    // Third-party Section 21 integration - show pending modal for demo
    const sectionLabels = {
        appointments: 'Book Appointment',
        prescriptions: 'My Prescriptions',
        upload: 'Upload Documents'
    };

    const sectionLabel = sectionLabels[section] || section;

    // Show integration pending modal
    showConfirmModal(
        'Third-Party Integration',
        `The "${sectionLabel}" feature requires integration with a licensed Section 21 medical cannabis provider. This integration is pending final configuration.`,
        'fa-clock',
        function() {
            // Close modal - no action needed
        },
        'OK',
        null  // No cancel button
    );
}

// Theme toggle removed - using clean black & white theme only

// Update cart count
async function updateCartCount() {
    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
    const cartCountEl = document.getElementById('cartCount');

    if (!cartCountEl) return;

    try {
        if (!token) {
            // Guest user - use localStorage
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            cartCountEl.textContent = count;
            cartCountEl.style.display = count > 0 ? 'flex' : 'none';
            return;
        }

        // Logged-in user - fetch from API
        const response = await fetch(`${API_URL}/cart`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const count = data.cart?.items?.reduce((total, item) => total + (item.quantity || 1), 0) || 0;
            cartCountEl.textContent = count;
            cartCountEl.style.display = count > 0 ? 'flex' : 'none';
        } else {
            // Fallback to localStorage if API fails
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
            cartCountEl.textContent = count;
            cartCountEl.style.display = count > 0 ? 'flex' : 'none';
        }
    } catch (error) {
        console.error('Error updating cart count:', error);
        // Fallback to localStorage
        const cart = JSON.parse(localStorage.getItem('cart') || '[]');
        const count = cart.reduce((total, item) => total + (item.quantity || 1), 0);
        cartCountEl.textContent = count;
        cartCountEl.style.display = count > 0 ? 'flex' : 'none';
    }
}

// Load page
window.addEventListener('DOMContentLoaded', () => {
    // Update cart count
    updateCartCount();

    // Listen for cart updates
    window.addEventListener('storage', updateCartCount);
});
