// ===== POS CART MODULE =====
// Cart management, quantity controls, totals, customer selection

// Perfect Joint variant SKUs
const PERFECT_JOINT_SKUS = ['PERFECT-JOINT-SINGLE', '222', '223'];

// Cart Functions
function addToCart(product) {
    // Intercept Perfect Joint — show variant selector
    if (PERFECT_JOINT_SKUS.includes(product.sku) || /perfect.?joint/i.test(product.name)) {
        showPerfectJointModal(product);
        return;
    }

    addToCartDirect(product);
}

function addToCartDirect(product) {
    // Check inventory.quantity (correct field from Product model)
    const stock = product.inventory?.quantity || product.quantity || 0;
    if (stock <= 0) {
        showToast('Out of Stock', `${product.name} is currently out of stock`, 'error');
        return;
    }

    const existingItem = cart.find(item => item._id === product._id);

    if (existingItem) {
        if (existingItem.quantity >= stock) {
            showToast('Stock Limit', `Only ${stock} units available`, 'warning');
            return;
        }
        existingItem.quantity++;
    } else {
        cart.push({
            ...product,
            quantity: 1
        });
    }

    showToast('Added to Cart', `${product.name} added successfully`, 'success');
    updateCart();
}

// Perfect Joint variant selector modal
function showPerfectJointModal() {
    document.getElementById('perfectJointModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'perfectJointModal';
    modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:16px;width:90%;max-width:380px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="background:linear-gradient(135deg,var(--green-deep,#8B6914),var(--green,#C9A84C));color:#fff;padding:18px 20px;text-align:center;">
                <div style="font-family:'Barlow Condensed', sans-serif;font-size:1.3rem;letter-spacing:1px;">Perfect Joint</div>
                <div style="font-size:0.85rem;opacity:0.8;margin-top:4px;">Select type</div>
            </div>
            <div style="padding:16px;display:flex;flex-direction:column;gap:10px;" id="pjVariants">
                <div style="text-align:center;color:#999;padding:12px;"><i class="fas fa-spinner fa-spin"></i> Loading variants...</div>
            </div>
            <div style="padding:0 16px 16px;">
                <button onclick="document.getElementById('perfectJointModal').remove()" style="width:100%;padding:12px;background:var(--cream,#0E0E0E);border:none;border-radius:10px;font-weight:600;color:var(--green-deep,#8B6914);cursor:pointer;font-size:0.95rem;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Load the 3 variants from the products already loaded
    const variants = [
        { sku: 'PERFECT-JOINT-SINGLE', label: 'Sheet', icon: 'fa-file', price: 1 },
        { sku: '223', label: 'Cone', icon: 'fa-ice-cream', price: 10 },
        { sku: '222', label: 'Box', icon: 'fa-box', price: 130 },
    ];

    // Find actual products from allProducts (loaded in pos-products.js)
    const container = document.getElementById('pjVariants');
    const buttons = [];

    for (const v of variants) {
        const prod = (allProducts || []).find(p => p.sku === v.sku);
        if (!prod) continue;
        const stock = prod.inventory?.quantity || prod.quantity || 0;
        const outOfStock = stock <= 0;

        buttons.push(`
            <button onclick="selectPerfectJointVariant('${v.sku}')" ${outOfStock ? 'disabled' : ''}
                style="display:flex;align-items:center;gap:14px;width:100%;padding:16px 18px;border:2px solid ${outOfStock ? '#ddd' : 'rgba(63, 192, 65,0.2)'};border-radius:12px;background:${outOfStock ? '#f5f5f5' : 'var(--cream,#0E0E0E)'};cursor:${outOfStock ? 'not-allowed' : 'pointer'};text-align:left;transition:all 0.15s;opacity:${outOfStock ? '0.5' : '1'}"
                ${outOfStock ? '' : 'onmouseenter="this.style.borderColor=\'var(--gold,#C9A84C)\';this.style.transform=\'scale(1.02)\'" onmouseleave="this.style.borderColor=\'rgba(63, 192, 65,0.2)\';this.style.transform=\'scale(1)\'"'}>
                <div style="width:48px;height:48px;border-radius:12px;background:${outOfStock ? '#eee' : 'var(--green,#C9A84C)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${v.icon}" style="color:${outOfStock ? '#999' : 'var(--gold,#C9A84C)'};font-size:1.2rem;"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:700;color:var(--green-deep,#8B6914);font-size:1.05rem;">${v.label}</div>
                    <div style="font-size:0.8rem;color:#888;margin-top:2px;">${outOfStock ? 'Out of stock' : stock + ' available'}</div>
                </div>
                <div style="font-weight:800;font-size:1.2rem;color:var(--green,#C9A84C);">R${v.price}</div>
            </button>
        `);
    }

    container.innerHTML = buttons.length ? buttons.join('') : '<div style="text-align:center;color:#999;padding:12px;">No Perfect Joint variants found</div>';
}

function selectPerfectJointVariant(sku) {
    const prod = (allProducts || []).find(p => p.sku === sku);
    if (prod) {
        addToCartDirect(prod);
    }
    document.getElementById('perfectJointModal')?.remove();
}

function updateCart() {
    const cartItems = document.getElementById('cartItems');
    const cartCount = document.getElementById('cartCount');
    const checkoutBtn = document.getElementById('checkoutBtn');

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="empty-cart">
                <i class="fas fa-shopping-cart"></i>
                <p>Cart is empty</p>
                <p style="font-size: 0.9rem; margin-top: 10px;">Tap products to add</p>
            </div>
        `;
        cartCount.textContent = '0';
        checkoutBtn.disabled = true;
    } else {
        cartItems.innerHTML = cart.map((item, index) => `
            <div class="cart-item">
                <div class="item-info">
                    <div class="item-name">${item.name}</div>
                    <div class="item-price">R ${item.price.toFixed(2)} each</div>
                </div>
                <div class="item-controls">
                    <button class="qty-btn" onclick="decrementQty(${index})">-</button>
                    <input class="qty-input" type="number" value="${item.quantity}" min="1" onchange="updateQty(${index}, this.value)">
                    <button class="qty-btn" onclick="incrementQty(${index})">+</button>
                    <button class="remove-btn" onclick="removeFromCart(${index})">×</button>
                </div>
            </div>
        `).join('');

        const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
        cartCount.textContent = totalItems;
        checkoutBtn.disabled = false;
    }

    updateTotals();
}

function incrementQty(index) {
    cart[index].quantity++;
    updateCart();
}

function decrementQty(index) {
    if (cart[index].quantity > 1) {
        cart[index].quantity--;
    } else {
        removeFromCart(index);
    }
    updateCart();
}

function updateQty(index, value) {
    const qty = parseInt(value);
    if (qty > 0) {
        cart[index].quantity = qty;
    } else {
        removeFromCart(index);
    }
    updateCart();
}

function removeFromCart(index) {
    cart.splice(index, 1);
    updateCart();
}

function clearCart() {
    cart = [];
    updateCart();
    showToast('Cart Cleared', 'All items removed', 'info');
}

function updateTotals() {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * VAT_RATE;
    const total = subtotal + vat;

    document.getElementById('subtotal').textContent = `R ${subtotal.toFixed(2)}`;
    document.getElementById('vat').textContent = `R ${vat.toFixed(2)}`;
    document.getElementById('total').textContent = `R ${total.toFixed(2)}`;
}

// ===== CUSTOMER SELECTION =====

let selectedCustomer = null;
let customerSearchTimeout = null;

function toggleCustomerSearch() {
    const panel = document.getElementById('customerSearchPanel');
    const chevron = document.getElementById('customerChevron');
    const isOpen = panel.style.display !== 'none';

    panel.style.display = isOpen ? 'none' : 'block';
    chevron.style.transform = isOpen ? '' : 'rotate(180deg)';

    if (!isOpen) {
        document.getElementById('customerSearchInput').focus();
    }
}

async function searchCustomers() {
    const query = document.getElementById('customerSearchInput').value.trim();
    const resultsDiv = document.getElementById('customerResults');

    // Always show walk-in option first
    let html = `
        <div class="customer-option ${!selectedCustomer ? 'selected' : ''}" onclick="selectWalkIn()">
            <i class="fas fa-walking"></i>
            <span>Walk-in Customer</span>
        </div>
    `;

    if (query.length < 2) {
        resultsDiv.innerHTML = html;
        return;
    }

    // Debounce search
    clearTimeout(customerSearchTimeout);
    customerSearchTimeout = setTimeout(async () => {
        try {
            const res = await fetch(`${API_URL}/users?search=${encodeURIComponent(query)}&role=user`, {
                headers: { 'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}` }
            });

            if (res.ok) {
                const data = await res.json();
                const users = data.users || data.data || [];

                users.forEach(user => {
                    const isSelected = selectedCustomer?._id === user._id;
                    html += `
                        <div class="customer-option ${isSelected ? 'selected' : ''}" onclick='selectCustomer(${JSON.stringify(user).replace(/'/g, "\\'")})'>
                            <i class="fas fa-user"></i>
                            <div>
                                <div style="font-weight: 600;">${user.firstName || ''} ${user.lastName || ''}</div>
                                <div style="font-size: 0.8rem; color: #666;">${user.email || user.phone || ''}</div>
                            </div>
                        </div>
                    `;
                });
            }
        } catch (error) {
            console.error('Customer search error:', error);
        }

        resultsDiv.innerHTML = html;
    }, 300);
}

function selectWalkIn() {
    selectedCustomer = null;
    document.getElementById('selectedCustomerName').textContent = 'Walk-in Customer';
    document.getElementById('purchaseLimitWarning').style.display = 'none';
    toggleCustomerSearch();
}

async function selectCustomer(customer) {
    selectedCustomer = customer;
    document.getElementById('selectedCustomerName').textContent = `${customer.firstName || ''} ${customer.lastName || ''}`.trim() || customer.email;

    // Check purchase limits for this customer
    try {
        const res = await fetch(`${API_URL}/purchase-limits/patients/${customer._id}/limits`, {
            headers: { 'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}` }
        });

        if (res.ok) {
            const data = await res.json();
            const limits = data.limits || {};
            const dayUsage = limits.currentDayUsage || 0;
            const dayLimit = limits.dailyLimit || 150;
            const warningThreshold = dayLimit * 0.8;

            if (dayUsage >= warningThreshold) {
                document.getElementById('purchaseLimitWarning').style.display = 'block';
                document.getElementById('limitWarningText').textContent =
                    dayUsage >= dayLimit ? 'Patient has reached daily limit!' : 'Patient approaching daily limit';
                document.getElementById('customerDayUsage').textContent = dayUsage + 'g';
                document.getElementById('customerDayLimit').textContent = dayLimit + 'g';

                if (dayUsage >= dayLimit) {
                    document.getElementById('purchaseLimitWarning').style.background = 'rgba(220, 38, 38, 0.15)';
                    document.getElementById('purchaseLimitWarning').style.borderColor = 'var(--red)';
                }
            } else {
                document.getElementById('purchaseLimitWarning').style.display = 'none';
            }
        }
    } catch (error) {
        console.error('Error checking purchase limits:', error);
    }

    toggleCustomerSearch();
}
