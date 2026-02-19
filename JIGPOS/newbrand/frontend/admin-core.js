// ===== ADMIN CORE MODULE =====
// Tab management, sidebar, modals, dashboard loading, UI utilities

// --- Points Management (stub — not yet implemented) ---
function adjustUserPoints() { showToast('Points adjustment coming soon', 'info'); }
function overrideUserTier() { showToast('Tier override coming soon', 'info'); }
function filterPointsTransactions() { /* search/filter stub */ }
function loadPointsTransactions() { showToast('Points transactions coming soon', 'info'); }
function exportPointsData() { showToast('Points export coming soon', 'info'); }
function expireOldPoints() { showToast('Points expiry coming soon', 'info'); }
function generatePointsReport() { showToast('Points report coming soon', 'info'); }

// Global variables (API_URL defined earlier in script)
let currentPaymentIndex = null;
let currentVoucherIndex = null;

// Load dashboard data
function loadDashboard() {
    const userRole = sessionStorage.getItem('userRole') || 'user';
    // loadPayments/loadVouchers/loadOrders are defined in admin-payments.js / admin-vouchers.js
    // which load after admin-core.js — guard against undefined on first run
    if (typeof loadPayments === 'function') loadPayments();
    // Only load vouchers for admin
    if (userRole === 'admin' && typeof loadVouchers === 'function') {
        loadVouchers();
    }
    if (typeof loadOrders === 'function') loadOrders();
    updateStats();
}

async function updateStats() {
    try {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            return;
        }

        // Fetch all orders
        const response = await fetch(`${API_URL}/orders/all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch stats');
        }

        const data = await response.json();
        const orders = data.orders || [];

        // Calculate stats
        const pendingCount = orders.filter(o => o.paymentStatus === 'pending').length;

        // Today's stats
        const today = new Date().toDateString();
        const todayOrders = orders.filter(o => new Date(o.createdAt).toDateString() === today);
        const todayRevenue = todayOrders.reduce((sum, o) => sum + (o.total || 0), 0);

        // Update display
        document.getElementById('pendingPayments').textContent = pendingCount;
        document.getElementById('todayRevenue').textContent = `R ${todayRevenue.toFixed(2)}`;

        // Fetch new members count for today
        try {
            const usersResponse = await fetch(`${API_URL}/users`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (usersResponse.ok) {
                const usersData = await usersResponse.json();
                const users = usersData.users || [];
                const todayStart = new Date();
                todayStart.setHours(0, 0, 0, 0);
                const newMembersToday = users.filter(u => new Date(u.createdAt) >= todayStart).length;
                document.getElementById('newMembers').textContent = newMembersToday;
            } else {
                document.getElementById('newMembers').textContent = '0';
            }
        } catch (userError) {
            console.warn('Could not fetch new members count:', userError);
            document.getElementById('newMembers').textContent = '0';
        }

        // Show alert if pending payments
        if (pendingCount > 0) {
            document.getElementById('alertBar').style.display = 'flex';
            document.getElementById('alertText').textContent = `You have ${pendingCount} pending payment approval${pendingCount > 1 ? 's' : ''} requiring immediate attention!`;
        }
    } catch (error) {
        console.error('Update stats error:', error);
    }
}

// DEPRECATED: Old localStorage-based cancelVoucher removed
// Use deactivateVoucher(voucherId) which uses the MongoDB API instead
function cancelVoucher() {
    showAdminToast('Info', 'Please use the Vouchers tab to manage vouchers', 'info');
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

function filterPayments() {
    // Implementation for filtering
}

function showVoucherTab(tab) {
    // Tab switching for vouchers
}

function logout() {
    clearAdminAuth();
    showAdminLogin();
    showAdminToast('Logged Out', 'You have been logged out successfully', 'info');
}

// Initialize dashboard — deferred so admin-payments.js etc. are loaded first
window.addEventListener('load', function() {
    loadDashboard();
    if (typeof loadInventory === 'function') loadInventory();
});

// Sidebar Toggle Functions
function toggleSidebar() {
    const sidebar = document.getElementById('sidebarDrawer');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');
}

function navigateToTab(tabName) {
    // Close sidebar
    toggleSidebar();

    // Navigate to tab
    showMainTab(tabName);

    // Toggle compact header mode for POS
    const adminNav = document.querySelector('.admin-nav');
    if (tabName === 'pos') {
        adminNav.classList.add('compact-mode');
    } else {
        adminNav.classList.remove('compact-mode');
    }

    // Update sidebar active state
    document.querySelectorAll('.sidebar-menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-tab') === tabName) {
            item.classList.add('active');
        }
    });
}

// Custom Confirm Modal (replaces browser confirm) - Professional Black & White Design
function showAdminConfirm(title, message, onConfirm, onCancel = null) {
    const existing = document.getElementById('adminConfirmModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'adminConfirmModal';
    modal.className = 'admin-modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        animation: modalFadeIn 0.2s ease-out;
    `;

    modal.innerHTML = `
        <style>
            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes modalSlideIn {
                from { transform: scale(0.95) translateY(-10px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
            .admin-modal-box {
                background: #0A0A0A !important;
                border: 2px solid #D97706 !important;
                border-radius: 16px;
                padding: 32px;
                max-width: 420px;
                width: 90%;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.25s ease-out;
            }
            .admin-modal-icon {
                width: 48px;
                height: 48px;
                background: #D97706 !important;
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                border: 2px solid #B45309;
            }
            .admin-modal-icon i {
                font-size: 20px;
                color: #0A0A0A !important;
            }
            .admin-modal-title {
                margin: 0 0 12px 0;
                color: #0A0A0A !important;
                font-size: 1.25rem;
                font-weight: 700;
                letter-spacing: -0.02em;
            }
            .admin-modal-message {
                margin: 0 0 28px 0;
                color: #7C3AED !important;
                font-size: 0.95rem;
                line-height: 1.5;
            }
            .admin-modal-buttons {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            .admin-modal-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.9rem;
                transition: all 0.15s ease;
            }
            .admin-modal-btn-cancel {
                background: #7C3AED !important;
                color: #0A0A0A !important;
                border: 1px solid #6D28D9;
            }
            .admin-modal-btn-cancel:hover {
                background: #6D28D9 !important;
            }
            .admin-modal-btn-confirm {
                background: #D97706 !important;
                color: #0A0A0A !important;
            }
            .admin-modal-btn-confirm:hover {
                background: #B45309 !important;
            }
        </style>
        <div class="admin-modal-box">
            <div class="admin-modal-icon">
                <i class="fas fa-question"></i>
            </div>
            <h3 class="admin-modal-title">${title}</h3>
            <p class="admin-modal-message">${message}</p>
            <div class="admin-modal-buttons">
                <button id="adminConfirmCancel" class="admin-modal-btn admin-modal-btn-cancel">Cancel</button>
                <button id="adminConfirmOk" class="admin-modal-btn admin-modal-btn-confirm">Confirm</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    document.getElementById('adminConfirmOk').onclick = () => {
        modal.remove();
        if (onConfirm) onConfirm();
    };

    document.getElementById('adminConfirmCancel').onclick = () => {
        modal.remove();
        if (onCancel) onCancel();
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    };
}

// Custom Prompt Modal (replaces browser prompt) - Professional Black & White Design
function showAdminPrompt(title, message, onSubmit, onCancel = null) {
    const existing = document.getElementById('adminPromptModal');
    if (existing) existing.remove();

    const modal = document.createElement('div');
    modal.id = 'adminPromptModal';
    modal.className = 'admin-modal-overlay';
    modal.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: rgba(0, 0, 0, 0.85);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 100000;
        animation: modalFadeIn 0.2s ease-out;
    `;

    modal.innerHTML = `
        <style>
            @keyframes modalFadeIn {
                from { opacity: 0; }
                to { opacity: 1; }
            }
            @keyframes modalSlideIn {
                from { transform: scale(0.95) translateY(-10px); opacity: 0; }
                to { transform: scale(1) translateY(0); opacity: 1; }
            }
            .admin-prompt-box {
                background: var(--cream);
                border: 2px solid var(--gold);
                border-radius: 16px;
                padding: 32px;
                max-width: 420px;
                width: 90%;
                box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                animation: modalSlideIn 0.25s ease-out;
            }
            .admin-prompt-icon {
                width: 48px;
                height: 48px;
                background: var(--green);
                border-radius: 50%;
                display: flex;
                align-items: center;
                justify-content: center;
                margin-bottom: 20px;
                border: 2px solid var(--green-dark);
            }
            .admin-prompt-icon i {
                font-size: 20px;
                color: var(--cream);
            }
            .admin-prompt-title {
                margin: 0 0 12px 0;
                color: var(--green-deep);
                font-size: 1.25rem;
                font-weight: 700;
                letter-spacing: -0.02em;
            }
            .admin-prompt-message {
                margin: 0 0 20px 0;
                color: var(--green-light);
                font-size: 0.95rem;
                line-height: 1.5;
            }
            .admin-prompt-input {
                width: 100%;
                padding: 14px 16px;
                background: white;
                border: 2px solid var(--green);
                border-radius: 8px;
                color: var(--green-deep);
                font-size: 0.95rem;
                margin-bottom: 24px;
                box-sizing: border-box;
                transition: border-color 0.15s ease;
            }
            .admin-prompt-input:focus {
                outline: none;
                border-color: var(--gold);
            }
            .admin-prompt-input::placeholder {
                color: var(--green-light);
            }
            .admin-prompt-buttons {
                display: flex;
                gap: 12px;
                justify-content: flex-end;
            }
            .admin-prompt-btn {
                padding: 12px 24px;
                border: none;
                border-radius: 8px;
                cursor: pointer;
                font-weight: 600;
                font-size: 0.9rem;
                transition: all 0.15s ease;
            }
            .admin-prompt-btn-cancel {
                background: var(--green-light);
                color: var(--cream);
                border: 1px solid var(--green);
            }
            .admin-prompt-btn-cancel:hover {
                background: var(--green);
            }
            .admin-prompt-btn-submit {
                background: var(--gold);
                color: var(--green-deep);
            }
            .admin-prompt-btn-submit:hover {
                background: var(--gold-dark);
            }
        </style>
        <div class="admin-prompt-box">
            <div class="admin-prompt-icon">
                <i class="fas fa-edit"></i>
            </div>
            <h3 class="admin-prompt-title">${title}</h3>
            <p class="admin-prompt-message">${message}</p>
            <input type="text" id="adminPromptInput" class="admin-prompt-input" placeholder="Enter your response...">
            <div class="admin-prompt-buttons">
                <button id="adminPromptCancel" class="admin-prompt-btn admin-prompt-btn-cancel">Cancel</button>
                <button id="adminPromptOk" class="admin-prompt-btn admin-prompt-btn-submit">Submit</button>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    setTimeout(() => document.getElementById('adminPromptInput').focus(), 100);

    document.getElementById('adminPromptOk').onclick = () => {
        const value = document.getElementById('adminPromptInput').value.trim();
        modal.remove();
        if (onSubmit) onSubmit(value);
    };

    document.getElementById('adminPromptCancel').onclick = () => {
        modal.remove();
        if (onCancel) onCancel();
    };

    // Allow Enter key to submit
    document.getElementById('adminPromptInput').onkeydown = (e) => {
        if (e.key === 'Enter') {
            const value = document.getElementById('adminPromptInput').value.trim();
            modal.remove();
            if (onSubmit) onSubmit(value);
        }
    };

    modal.onclick = (e) => {
        if (e.target === modal) {
            modal.remove();
            if (onCancel) onCancel();
        }
    };
}

// Tab Management Functions
function showMainTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.style.display = 'none';
    });

    // Remove active class from all tabs
    document.querySelectorAll('.tab-nav .tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected tab
    document.getElementById(tabName + '-tab').style.display = 'block';

    // Add active class to clicked tab
    event.target.classList.add('active');

    // Show stats grid ONLY on inventory tab
    const statsGrid = document.getElementById('adminStatsGrid');
    if (statsGrid) {
        statsGrid.style.display = tabName === 'inventory' ? 'grid' : 'none';
    }

    // Load data for specific tabs - wrapped in try-catch to prevent blocking
    try {
        if (tabName === 'inventory') {
            loadInventory();
        } else if (tabName === 'users') {
            loadUsers();
        } else if (tabName === 'payments') {
            loadPendingPOSPayments();
        } else if (tabName === 'wholesale') {
            loadWholesaleData();
        }
        // PAID MODULES DISABLED - not subscribed (modules, affiliates, vouchers, viral)
    } catch (error) {
        console.error('[showMainTab] Error loading tab data:', error);
    }
}

// POS Payment Management Functions
function showPaymentType(type) {
    // Hide all payment type sections
    document.querySelectorAll('.payment-type-section').forEach(section => {
        section.style.display = 'none';
    });

    // Remove active from all payment type tabs
    document.querySelectorAll('#payments-tab .tab-nav .tab').forEach(tab => {
        tab.classList.remove('active');
    });

    // Show selected type
    if (type === 'pos-eft') {
        document.getElementById('pos-eft-payments').style.display = 'block';
        loadPendingPOSPayments();
    } else if (type === 'membership') {
        document.getElementById('membership-payments').style.display = 'block';
    } else if (type === 'csv-export') {
        document.getElementById('csv-export').style.display = 'block';
    }

    // Add active to clicked tab
    event.target.classList.add('active');
}

// Auto-refresh every 30 seconds
setInterval(loadDashboard, 30000);

// ============================================
// WHOLESALE / B2B FUNCTIONS
// ============================================

let wholesaleData = { orders: [], customers: [] };

async function loadWholesaleData() {
    try {
        const token = sessionStorage.getItem('adminToken');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Load B2B orders
        const ordersRes = await fetch(`${API_URL}/orders/all?limit=50`, { headers });
        if (ordersRes.ok) {
            const data = await ordersRes.json();
            wholesaleData.orders = data.orders || [];
        }

        // Load B2B customers
        const customersRes = await fetch(`${API_URL}/b2b/customers`, { headers });
        if (customersRes.ok) {
            const data = await customersRes.json();
            wholesaleData.customers = data.customers || [];
        }

        renderWholesaleStats();
        renderWholesaleOrders();
    } catch (error) {
        console.error('[loadWholesaleData] Error:', error);
    }
}

function renderWholesaleStats() {
    const orders = wholesaleData.orders;
    const pending = orders.filter(o => o.status === 'pending' || o.status === 'processing').length;
    const overdue = orders.filter(o => o.paymentStatus === 'overdue').length;
    const outstanding = orders.filter(o => o.paymentStatus !== 'paid')
        .reduce((sum, o) => sum + (o.total || 0), 0);
    const thisMonth = orders.filter(o => {
        const orderDate = new Date(o.createdAt);
        const now = new Date();
        return orderDate.getMonth() === now.getMonth() && orderDate.getFullYear() === now.getFullYear();
    }).reduce((sum, o) => sum + (o.total || 0), 0);

    document.getElementById('b2bPendingCount').textContent = pending;
    document.getElementById('b2bOverdueCount').textContent = overdue;
    document.getElementById('b2bOutstanding').textContent = `R${outstanding.toLocaleString()}`;
    document.getElementById('b2bMonthRevenue').textContent = `R${thisMonth.toLocaleString()}`;
}

function renderWholesaleOrders() {
    const tbody = document.getElementById('b2bOrdersTable');
    const orders = wholesaleData.orders;

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" style="padding: 40px; text-align: center; color: var(--green-light);">
                    <i class="fas fa-file-invoice" style="font-size: 3rem; margin-bottom: 15px; opacity: 0.5;"></i>
                    <p>No B2B orders yet</p>
                    <button class="btn-primary" onclick="createB2BOrder()" style="margin-top: 15px;">
                        <i class="fas fa-plus"></i> Create First B2B Order
                    </button>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(order => {
        const statusColors = {
            pending: 'var(--gold)',
            processing: 'var(--green-light)',
            completed: 'var(--green)',
            cancelled: 'var(--red)'
        };
        const paymentColors = {
            pending: 'var(--gold)',
            paid: 'var(--green)',
            overdue: 'var(--red)',
            partial: 'orange'
        };

        return `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding: 15px; font-weight: 600;">#${order.orderNumber || order._id.slice(-6).toUpperCase()}</td>
                <td style="padding: 15px;">${order.customerName || order.customer?.businessName || 'Unknown'}</td>
                <td style="padding: 15px;">${new Date(order.createdAt).toLocaleDateString('en-ZA')}</td>
                <td style="padding: 15px; text-align: right; font-weight: bold;">R${(order.total || 0).toLocaleString()}</td>
                <td style="padding: 15px; text-align: center;">
                    <span style="background: ${statusColors[order.status] || '#999'}20; color: ${statusColors[order.status] || '#999'}; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">
                        ${order.status?.charAt(0).toUpperCase() + order.status?.slice(1) || 'Unknown'}
                    </span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    <span style="background: ${paymentColors[order.paymentStatus] || '#999'}20; color: ${paymentColors[order.paymentStatus] || '#999'}; padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: 500;">
                        ${order.paymentStatus?.charAt(0).toUpperCase() + order.paymentStatus?.slice(1) || 'Pending'}
                    </span>
                </td>
                <td style="padding: 15px; text-align: center;">
                    <button onclick="viewB2BOrder('${order._id}')" style="background: var(--green); color: white; border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer; margin-right: 5px;" title="View">
                        <i class="fas fa-eye"></i>
                    </button>
                    <button onclick="printB2BInvoice('${order._id}')" style="background: var(--gold); color: var(--green-deep); border: none; padding: 8px 12px; border-radius: 6px; cursor: pointer;" title="Print Invoice">
                        <i class="fas fa-print"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

function loadWholesaleCustomers() {
    const modal = document.getElementById('b2bCustomersModal');
    modal.style.display = 'flex';
    renderB2BCustomers();
}

function closeB2BCustomersModal() {
    document.getElementById('b2bCustomersModal').style.display = 'none';
}

function renderB2BCustomers() {
    const tbody = document.getElementById('b2bCustomersList');
    const customers = wholesaleData.customers;

    if (customers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="padding: 30px; text-align: center; color: #999;">
                    No B2B customers yet. Add your first wholesale customer.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = customers.map(customer => `
        <tr style="border-bottom: 1px solid #eee;">
            <td style="padding: 12px; font-weight: 600;">${customer.businessName}</td>
            <td style="padding: 12px;">
                <div>${customer.contactName || '-'}</div>
                <div style="font-size: 0.85rem; color: #666;">${customer.email || customer.phone || '-'}</div>
            </td>
            <td style="padding: 12px; text-align: right;">R${(customer.creditLimit || 0).toLocaleString()}</td>
            <td style="padding: 12px; text-align: right; ${customer.balance > 0 ? 'color: var(--red); font-weight: bold;' : ''}">
                R${(customer.balance || 0).toLocaleString()}
            </td>
            <td style="padding: 12px; text-align: center;">
                <span style="background: ${customer.status === 'active' ? 'var(--green)' : '#999'}20; color: ${customer.status === 'active' ? 'var(--green)' : '#999'}; padding: 4px 10px; border-radius: 15px; font-size: 0.8rem;">
                    ${customer.status || 'Active'}
                </span>
            </td>
            <td style="padding: 12px; text-align: center;">
                <button onclick="editB2BCustomer('${customer._id}')" style="background: var(--green-light); color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; margin-right: 5px;">
                    <i class="fas fa-edit"></i>
                </button>
                <button onclick="viewB2BCustomerHistory('${customer._id}')" style="background: var(--gold); color: var(--green-deep); border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer;">
                    <i class="fas fa-history"></i>
                </button>
            </td>
        </tr>
    `).join('');
}

function filterB2BCustomers() {
    const search = document.getElementById('b2bCustomerSearch').value.toLowerCase();
    const rows = document.querySelectorAll('#b2bCustomersList tr');
    rows.forEach(row => {
        const text = row.textContent.toLowerCase();
        row.style.display = text.includes(search) ? '' : 'none';
    });
}

function createB2BOrder() {
    // Redirect to wholesale POS
    window.location.href = 'wholesale-pos.html';
}

function openAddB2BCustomerModal() {
    showAdminToast('Coming Soon', 'Add B2B Customer modal coming soon', 'info');
}

function viewB2BOrder(orderId) {
    showAdminToast('Coming Soon', 'View B2B Order coming soon', 'info');
}

function printB2BInvoice(orderId) {
    showAdminToast('Coming Soon', 'Print B2B Invoice coming soon', 'info');
}

function editB2BCustomer(customerId) {
    showAdminToast('Coming Soon', 'Edit B2B Customer coming soon', 'info');
}

function viewB2BCustomerHistory(customerId) {
    showAdminToast('Coming Soon', 'View Customer History coming soon', 'info');
}
