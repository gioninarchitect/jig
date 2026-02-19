// owner-core.js — Core dashboard functions for owner dashboard
// Depends on: owner-auth.js (token, userData, clearAuth, showLogin, showDashboard)
// Depends on: config.js (API_URL), dbc-utils.js (showToast)

function initDashboard() {
    // Set current date
    const dateEl = document.getElementById('currentDate');
    const now = new Date();
    dateEl.textContent = now.toLocaleDateString('en-ZA', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Load user data
    loadUserData();

    // KPI data loads on toggle (not auto)
    loadBranches();
    loadPendingApprovals();
    loadStaffOverview();
    loadBudgetData();

    // Initialize live feed WebSocket
    if (typeof initLiveFeed === 'function') initLiveFeed();
}

// Load user data
async function loadUserData() {
    try {
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            userData = JSON.parse(storedUser);
            document.getElementById('ownerName').textContent = userData.name || userData.firstName || 'Owner';
        }
    } catch (error) {
        console.error('Error loading user data:', error);
    }
}

// Load dashboard stats
// KPI Panel slide-in toggle
let ownerKpiOpen = false;
let ownerKpiLoaded = false;

function toggleOwnerKpi() {
    const panel = document.getElementById('ownerKpiPanel');
    const chevron = document.getElementById('ownerKpiChevron');
    const btn = document.getElementById('ownerKpiToggle');
    if (!panel) return;
    ownerKpiOpen = !ownerKpiOpen;
    panel.style.maxHeight = ownerKpiOpen ? '350px' : '0';
    if (chevron) chevron.style.transform = ownerKpiOpen ? 'rotate(180deg)' : 'rotate(0deg)';
    if (btn) btn.style.borderColor = ownerKpiOpen ? 'var(--gold)' : 'var(--gray-200)';
    if (ownerKpiOpen && !ownerKpiLoaded) { loadDashboardStats(); ownerKpiLoaded = true; }
}

async function loadDashboardStats() {
    try {
        const response = await fetch(`${API_URL}/dashboard/kpis`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.success) {
                updateOwnerKPIs(data.kpis);
            }
        }
    } catch (error) {
        console.error('Error loading KPIs:', error);
    }
}

function updateOwnerKPIs(kpis) {
    const fmt = (n) => (n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

    const revenueEl = document.getElementById('kpiRevenueMonth');
    if (revenueEl) revenueEl.textContent = `R${fmt(kpis.revenueMonth)}`;

    const transEl = document.getElementById('kpiTransactions');
    if (transEl) transEl.textContent = kpis.transactionsMonth || 0;

    const expEl = document.getElementById('kpiExpenses');
    if (expEl) expEl.textContent = `R${fmt(kpis.expensesMonth)}`;

    const lastEl = document.getElementById('kpiLastMonth');
    if (lastEl) lastEl.textContent = `R${fmt(kpis.revenueLastMonth)}`;

    const growthEl = document.getElementById('kpiGrowth');
    if (growthEl) {
        const pct = kpis.growthPercent || 0;
        const isPositive = pct >= 0;
        growthEl.className = `stat-change ${isPositive ? 'positive' : 'negative'}`;
        growthEl.innerHTML = `<i class="fas fa-arrow-${isPositive ? 'up' : 'down'}"></i> <span>${Math.abs(pct)}%</span> vs last month`;
    }

    const cashupEl = document.getElementById('kpiPendingCashups');
    if (cashupEl) {
        const count = kpis.pendingCashups || 0;
        cashupEl.innerHTML = `<i class="fas fa-clock"></i> <span>${count}</span> cashup${count !== 1 ? 's' : ''} pending`;
    }

    const plEl = document.getElementById('kpiPLIndicator');
    if (plEl) {
        const profit = (kpis.revenueMonth || 0) - (kpis.expensesMonth || 0);
        const isProfit = profit >= 0;
        plEl.className = `stat-change ${isProfit ? 'positive' : 'negative'}`;
        plEl.innerHTML = `<i class="fas fa-${isProfit ? 'arrow-up' : 'arrow-down'}"></i> Net: R${fmt(Math.abs(profit))}`;
    }
}

// showToast provided by /frontend/dbc-utils.js

// Logout
function logout() {
    clearAuth();
    showLogin();
    showToast('Logged Out', 'You have been logged out successfully', 'info');
}

// ===== SIDEBAR & CART DRAWER FUNCTIONS =====

function toggleSidebar() {
    document.getElementById('sidebarDrawer').classList.toggle('active');
    document.getElementById('sidebarOverlay').classList.toggle('active');
}

function toggleCart() {
    document.getElementById('cartDrawer').classList.toggle('active');
    document.getElementById('cartOverlay').classList.toggle('active');
    updateCartDisplay();
}

function updateCartDisplay() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const cartItems = document.getElementById('cartItems');
    const cartBadge = document.getElementById('cartBadge');
    const cartTotal = document.getElementById('cartTotal');

    // Update badge
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    cartBadge.textContent = totalItems;

    if (cart.length === 0) {
        cartItems.innerHTML = `
            <div class="cart-empty">
                <i class="fas fa-shopping-basket"></i>
                <p>Your cart is empty</p>
            </div>
        `;
        cartTotal.textContent = 'R0.00';
        return;
    }

    let total = 0;
    cartItems.innerHTML = cart.map((item, index) => {
        const itemTotal = item.price * (item.quantity || 1);
        total += itemTotal;
        return `
            <div class="cart-item">
                <img src="${item.image || '/images/DeBudChef-rLogo.png'}" alt="${item.name}" class="cart-item-image" onerror="this.src='/images/DeBudChef-rLogo.png'">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name}</div>
                    <div class="cart-item-price">R${item.price.toFixed(2)}</div>
                    <div class="cart-item-qty">
                        <button class="qty-btn" onclick="updateCartQty(${index}, -1)">-</button>
                        <span>${item.quantity || 1}</span>
                        <button class="qty-btn" onclick="updateCartQty(${index}, 1)">+</button>
                        <span class="cart-item-remove" onclick="removeFromCart(${index})">
                            <i class="fas fa-trash"></i>
                        </span>
                    </div>
                </div>
            </div>
        `;
    }).join('');

    cartTotal.textContent = `R${total.toFixed(2)}`;
}

function updateCartQty(index, change) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart[index]) {
        cart[index].quantity = (cart[index].quantity || 1) + change;
        if (cart[index].quantity <= 0) {
            cart.splice(index, 1);
        }
        localStorage.setItem('cart', JSON.stringify(cart));
        updateCartDisplay();
    }
}

function removeFromCart(index) {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    cart.splice(index, 1);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartDisplay();
    showToast('Item removed from cart', 'info');
}

function goToCheckout() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    if (cart.length === 0) {
        showToast('Your cart is empty', 'error');
        return;
    }
    window.location.href = 'cart.html';
}

// Update cart badge on page load
document.addEventListener('DOMContentLoaded', function() {
    const cart = JSON.parse(localStorage.getItem('cart') || '[]');
    const totalItems = cart.reduce((sum, item) => sum + (item.quantity || 1), 0);
    document.getElementById('cartBadge').textContent = totalItems;
});

// Close drawers with Escape key
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        document.getElementById('sidebarDrawer').classList.remove('active');
        document.getElementById('sidebarOverlay').classList.remove('active');
        document.getElementById('cartDrawer').classList.remove('active');
        document.getElementById('cartOverlay').classList.remove('active');
        hideBranchModal();
        hideApprovalsPanel();
    }
});

function formatTimeAgo(dateString) {
    if (!dateString) return 'unknown';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'just now';
}

// ===== STAFF OVERVIEW =====

async function loadStaffOverview() {
    try {
        const res = await fetch(`${API_URL}/dashboard/staff-overview`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            if (data.success) {
                const d = data.data;
                document.getElementById('totalStaffCount').textContent = d.totalStaff;

                if (d.hasShiftData) {
                    document.getElementById('activeStaffCount').textContent = d.activeToday;
                    document.getElementById('breakStaffCount').textContent = d.onBreak;
                } else {
                    document.getElementById('activeStaffCount').textContent = d.totalStaff;
                    const breakLabel = document.getElementById('breakStaffLabel');
                    if (breakLabel) breakLabel.textContent = 'No shift data';
                    document.getElementById('breakStaffCount').textContent = '-';
                }
            }
        }
    } catch (error) {
        console.error('Error loading staff overview:', error);
    }
}
