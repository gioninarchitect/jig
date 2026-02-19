// dash-products.js — Lifestyle products, add to cart, medical portal, cart count
// Depends on: config.js (API_URL), dbc-utils.js (showNotification)
// Depends on: dash-core.js (showConfirmModal), dash-cart.js (loadCart, toggleCart)

// ===== LIFESTYLE PRODUCTS =====
let allLifestyleProducts = [];
let activeCategory = 'all';

async function loadLifestyleProducts() {
    const grid = document.getElementById('lifestyleProductsGrid');

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const response = await fetch('/api/v1/products?track=lifestyle&limit=500', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            // Filter out R0.00 and out-of-stock products
            allLifestyleProducts = (data.products || []).filter(p => p.price > 0 && (p.inventory?.quantity || 0) > 0);
            buildCategoryFilter(allLifestyleProducts);
            renderProducts(allLifestyleProducts);
        } else {
            grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--error-color); grid-column: 1 / -1;">Failed to load products</div>';
        }
    } catch (error) {
        console.error('Load lifestyle products error:', error);
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--error-color); grid-column: 1 / -1;">Network error loading products</div>';
    }
}

// Category label mapping — friendly names for customers
const categoryLabels = {
    'lifestyle-cbd': 'CBD',
    'cbd': 'CBD',
    'topicals': 'Topicals',
    'flower': 'Flower',
    'edibles': 'Edibles',
    'accessories': 'Accessories',
    'oils': 'Oils',
    'beverages': 'Beverages',
    'vaporizers': 'Vaporizers',
    'grinders': 'Grinders',
    'papers': 'Papers',
    'storage': 'Storage',
    'pipes': 'Pipes'
};

function friendlyCategory(raw) {
    if (!raw) return '';
    const key = raw.toLowerCase().trim();
    return categoryLabels[key] || raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase().replace(/-/g, ' ');
}

// Build category filter pills
function buildCategoryFilter(products) {
    const bar = document.getElementById('categoryFilterBar');
    if (!bar) return;

    // Collect unique friendly categories
    const cats = new Map();
    products.forEach(p => {
        const friendly = friendlyCategory(p.category);
        const key = (p.category || '').toLowerCase().trim();
        if (friendly && !cats.has(friendly)) {
            cats.set(friendly, key);
        }
    });

    if (cats.size <= 1) {
        bar.style.display = 'none';
        return;
    }

    let html = '<div class="category-filters">';
    html += '<button class="category-pill active" onclick="filterByCategory(\'all\', this)">All</button>';
    cats.forEach((rawKey, friendly) => {
        html += `<button class="category-pill" onclick="filterByCategory('${rawKey}', this)">${friendly}</button>`;
    });
    html += '</div>';
    bar.innerHTML = html;
    bar.style.display = 'block';
}

function filterByCategory(cat, btn) {
    activeCategory = cat;
    // Update pill active states
    document.querySelectorAll('.category-pill').forEach(p => p.classList.remove('active'));
    if (btn) btn.classList.add('active');

    if (cat === 'all') {
        renderProducts(allLifestyleProducts);
    } else {
        const filtered = allLifestyleProducts.filter(p => {
            const key = (p.category || '').toLowerCase().trim();
            return key === cat || friendlyCategory(p.category).toLowerCase() === friendlyCategory(cat).toLowerCase();
        });
        renderProducts(filtered);
    }
}

// Clean description — strip name/category echoes
function cleanDescription(product) {
    const desc = product.shortDescription || product.description || '';
    if (!desc) return '';
    // If description just echoes name + category, skip it
    const nameLower = product.name.toLowerCase();
    const descLower = desc.toLowerCase().trim();
    if (descLower.startsWith(nameLower)) return '';
    if (desc.length < 15) return '';
    return desc.length > 90 ? desc.substring(0, 90) + '...' : desc;
}

function renderProducts(products) {
    const grid = document.getElementById('lifestyleProductsGrid');

    if (products.length === 0) {
        grid.innerHTML = '<div style="text-align: center; padding: 2rem; color: #737373; grid-column: 1 / -1;">No products in this category</div>';
        return;
    }

    grid.innerHTML = products.map(product => {
        const hasImage = product.images && product.images.length > 0 && product.images[0].url;
        const imageHtml = hasImage
            ? `<img src="${product.images[0].url}" alt="${product.name}" onerror="this.style.display='none';this.nextElementSibling.style.display='block'">`
            : '';
        const placeholderDisplay = hasImage ? 'none' : 'block';
        const desc = cleanDescription(product);
        const descHtml = desc ? `<p class="product-card-desc">${desc}</p>` : '';
        return `
            <div class="product-card">
                <div class="product-card-image">
                    ${imageHtml}
                    <i class="fas fa-leaf placeholder-icon" style="display:${placeholderDisplay}"></i>
                </div>
                <div class="product-card-body">
                    <span class="product-card-category">${friendlyCategory(product.category)}</span>
                    <h3 class="product-card-title">${product.name}</h3>
                    ${descHtml}
                    <div class="product-card-price">R${product.price.toFixed(2)}</div>
                    <button class="product-card-btn" onclick="addLifestyleProductToCart('${product._id}')"><i class="fas fa-cart-plus"></i> Add to Cart</button>
                </div>
            </div>
        `;
    }).join('');
}

// Legacy alias
function displayLifestyleProducts(products) {
    allLifestyleProducts = products.filter(p => p.price > 0 && (p.inventory?.quantity || 0) > 0);
    buildCategoryFilter(allLifestyleProducts);
    renderProducts(allLifestyleProducts);
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

        const data = await response.json();

        if (!response.ok || !data.success) {
            const msg = data.message || 'Failed to add to cart';
            if (msg.toLowerCase().includes('stock')) {
                showNotification('This product is currently out of stock', 'error');
            } else {
                showNotification(msg, 'error');
            }
            return;
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
