// owner-wholesale.js — B2B wholesale orders & customers for owner dashboard
// Depends on: owner-auth.js (token), owner-core.js (formatTimeAgo)
// Depends on: config.js (API_URL), dbc-utils.js (showToast)

// ===== WHOLESALE / B2B FUNCTIONS =====
let wholesaleOrders = [];
let wholesaleCustomers = [];

async function loadWholesaleData() {
    try {
        const token = localStorage.getItem('token');
        const headers = { 'Authorization': `Bearer ${token}` };

        // Load B2B orders
        const ordersRes = await fetch(`${API_URL}/wholesale/orders?limit=20`, { headers });
        if (ordersRes.ok) {
            const data = await ordersRes.json();
            wholesaleOrders = data.orders || [];
        }

        // Load B2B customers
        const customersRes = await fetch(`${API_URL}/wholesale/customers?limit=20`, { headers });
        if (customersRes.ok) {
            const data = await customersRes.json();
            wholesaleCustomers = data.customers || [];
        }
    } catch (error) {
        console.error('Error loading wholesale data:', error);
    }
}

async function showWholesaleOrders() {
    await loadWholesaleData();
    document.getElementById('approvalsPanelTitle').innerHTML = '<i class="fas fa-file-invoice-dollar"></i> B2B Orders';
    const content = document.getElementById('approvalsPanelContent');

    if (wholesaleOrders.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-500);"><i class="fas fa-inbox" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>No B2B orders yet</p><a href="wholesale-pos.html" class="btn-primary" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; text-decoration: none;">Create B2B Order</a></div>';
    } else {
        const pending = wholesaleOrders.filter(o => o.status === 'pending' || o.status === 'pending_approval');
        const overdue = wholesaleOrders.filter(o => o.paymentStatus === 'overdue');

        content.innerHTML = `
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem;">
                <div style="background: rgba(217, 119, 6,0.1); padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--gold-dark);">${pending.length}</div>
                    <div style="font-size: 0.8rem; color: var(--gray-600);">Pending</div>
                </div>
                <div style="background: rgba(220, 38, 38,0.1); padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--red);">${overdue.length}</div>
                    <div style="font-size: 0.8rem; color: var(--gray-600);">Overdue</div>
                </div>
                <div style="background: rgba(124, 58, 237,0.1); padding: 1rem; border-radius: 8px; text-align: center;">
                    <div style="font-size: 1.5rem; font-weight: 700; color: var(--green);">${wholesaleOrders.length}</div>
                    <div style="font-size: 0.8rem; color: var(--gray-600);">Total</div>
                </div>
            </div>
            <div style="max-height: 400px; overflow-y: auto;">
                ${wholesaleOrders.slice(0, 10).map(order => `
                    <div style="background: white; border: 1px solid var(--gray-200); border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 0.5rem;">
                            <div>
                                <strong>${order.orderNumber || 'WO-' + order._id?.slice(-6)}</strong>
                                <div style="font-size: 0.85rem; color: var(--gray-600);">${order.customer?.businessName || 'Unknown Customer'}</div>
                            </div>
                            <span style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; background: ${order.status === 'completed' ? 'rgba(34,197,94,0.1)' : order.status === 'pending' ? 'rgba(217, 119, 6,0.1)' : 'rgba(99,102,241,0.1)'}; color: ${order.status === 'completed' ? '#22C55E' : order.status === 'pending' ? 'var(--gold-dark)' : '#6366F1'};">
                                ${order.status || 'pending'}
                            </span>
                        </div>
                        <div style="display: flex; justify-content: space-between; font-size: 0.85rem;">
                            <span style="color: var(--gray-500);">${formatTimeAgo(order.createdAt)}</span>
                            <strong style="color: var(--green);">R${(order.totalAmount || 0).toLocaleString()}</strong>
                        </div>
                    </div>
                `).join('')}
            </div>
            <div style="margin-top: 1rem; text-align: center;">
                <a href="wholesale-pos.html" class="btn-primary" style="display: inline-block; padding: 0.75rem 1.5rem; text-decoration: none;">Open Wholesale POS</a>
            </div>
        `;
    }

    document.getElementById('approvalsPanel').style.display = 'block';
}

async function showWholesaleCustomers() {
    await loadWholesaleData();
    document.getElementById('approvalsPanelTitle').innerHTML = '<i class="fas fa-building"></i> B2B Customers';
    const content = document.getElementById('approvalsPanelContent');

    if (wholesaleCustomers.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-500);"><i class="fas fa-building" style="font-size: 2rem; margin-bottom: 1rem;"></i><p>No B2B customers yet</p><a href="wholesale-pos.html" class="btn-primary" style="display: inline-block; margin-top: 1rem; padding: 0.75rem 1.5rem; text-decoration: none;">Add B2B Customer</a></div>';
    } else {
        content.innerHTML = `
            <div style="margin-bottom: 1rem; font-size: 0.9rem; color: var(--gray-600);">${wholesaleCustomers.length} B2B customer(s)</div>
            <div style="max-height: 450px; overflow-y: auto;">
                ${wholesaleCustomers.map(customer => `
                    <div style="background: white; border: 1px solid var(--gray-200); border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem;">
                        <div style="display: flex; justify-content: space-between; align-items: center;">
                            <div>
                                <strong>${customer.businessName || 'Unnamed'}</strong>
                                <div style="font-size: 0.85rem; color: var(--gray-600);">${customer.contactPerson || ''} ${customer.contactEmail ? '• ' + customer.contactEmail : ''}</div>
                            </div>
                            <span style="padding: 0.25rem 0.75rem; border-radius: 12px; font-size: 0.75rem; background: ${customer.status === 'active' ? 'rgba(34,197,94,0.1)' : 'rgba(217, 119, 6,0.1)'}; color: ${customer.status === 'active' ? '#22C55E' : 'var(--gold-dark)'};">
                                ${customer.status || 'pending'}
                            </span>
                        </div>
                        <div style="margin-top: 0.5rem; font-size: 0.85rem; color: var(--gray-500);">
                            Credit: R${(customer.creditLimit || 0).toLocaleString()} • Terms: ${customer.paymentTerms || '30'} days
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    document.getElementById('approvalsPanel').style.display = 'block';
}
