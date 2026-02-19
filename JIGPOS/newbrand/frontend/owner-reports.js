// owner-reports.js — Reports modal and data for owner dashboard
// Depends on: owner-auth.js (token), config.js (API_URL), dbc-utils.js (showToast)

// ===== REPORTS MODAL =====
function showReportsModal(activeTab) {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.classList.add('active');
        populateReportBranchFilter();
        loadReportsData();
        // Switch to requested tab if specified
        if (activeTab) {
            const tabEl = document.querySelector(`.report-tab[data-tab="${activeTab}"]`) ||
                          Array.from(document.querySelectorAll('.report-tab')).find(t => t.textContent.toLowerCase().includes(activeTab));
            if (tabEl) switchReportTab(activeTab, tabEl);
        }
    }
}

function populateReportBranchFilter() {
    const select = document.getElementById('reportBranchFilter');
    if (!select || !window._ownerBranchMap) return;
    // Keep "All Branches" and add each branch
    const existing = select.querySelectorAll('option:not([value="all"])');
    if (existing.length > 0) return; // Already populated
    Object.entries(window._ownerBranchMap).forEach(([id, name]) => {
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = name;
        select.appendChild(opt);
    });
}

function closeReportsModal() {
    const modal = document.getElementById('reportsModal');
    if (modal) {
        modal.classList.remove('active');
    }
}

async function loadReportsData() {
    const startDate = document.getElementById('reportStartDate')?.value || '';
    const endDate = document.getElementById('reportEndDate')?.value || '';
    const branchId = document.getElementById('reportBranchFilter')?.value || 'all';
    const dateParams = (startDate && endDate ? `&startDate=${startDate}&endDate=${endDate}` : '') +
                       (branchId !== 'all' ? `&branchId=${branchId}` : '');

    try {
        // Load sales from reports API
        const salesRes = await fetch(`${API_URL}/reports/sales?period=month${dateParams}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Load top products (with branch filter if set)
        const productBranch = branchId !== 'all' ? `&branchId=${branchId}` : '';
        const productsRes = await fetch(`${API_URL}/products?limit=10&sort=-sold${productBranch}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Load orders from reports API
        const ordersRes = await fetch(`${API_URL}/reports/orders?period=month${dateParams}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // Update reports UI
        if (salesRes.ok) {
            const salesData = await salesRes.json();
            updateSalesReport(salesData.data || salesData);
        } else {
            document.getElementById('salesReportContent').innerHTML =
                '<p class="report-empty">No sales data available yet</p>';
        }

        if (productsRes.ok) {
            const productsData = await productsRes.json();
            updateTopProductsReport(productsData.data || productsData.products || []);
        }

        if (ordersRes.ok) {
            const ordersData = await ordersRes.json();
            updateOrdersReport(ordersData.data || ordersData.orders || []);
        } else {
            document.getElementById('ordersReportContent').innerHTML =
                '<p class="report-empty">No orders data available yet</p>';
        }

    } catch (error) {
        console.error('Error loading reports:', error);
        showToast('Failed to load reports data', 'error');
    }
}

function updateSalesReport(data) {
    const container = document.getElementById('salesReportContent');
    if (!container) return;

    const totalRevenue = data.totalRevenue || data.total || 0;
    const totalOrders = data.totalOrders || data.count || 0;
    const avgOrder = totalOrders > 0 ? totalRevenue / totalOrders : 0;

    container.innerHTML = `
        <div class="report-stats-grid">
            <div class="report-stat">
                <div class="report-stat-value">R${totalRevenue.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</div>
                <div class="report-stat-label">Total Revenue (This Month)</div>
            </div>
            <div class="report-stat">
                <div class="report-stat-value">${totalOrders}</div>
                <div class="report-stat-label">Total Orders</div>
            </div>
            <div class="report-stat">
                <div class="report-stat-value">R${avgOrder.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</div>
                <div class="report-stat-label">Average Order Value</div>
            </div>
        </div>
    `;
}

function updateTopProductsReport(products) {
    const container = document.getElementById('topProductsContent');
    if (!container) return;

    if (!products.length) {
        container.innerHTML = '<p class="report-empty">No product data available</p>';
        return;
    }

    container.innerHTML = `
        <table class="report-table">
            <thead>
                <tr>
                    <th>#</th>
                    <th>Product</th>
                    <th>Price</th>
                    <th>Stock</th>
                    <th>Category</th>
                </tr>
            </thead>
            <tbody>
                ${products.slice(0, 10).map((p, i) => `
                    <tr>
                        <td>${i + 1}</td>
                        <td><strong>${p.name}</strong></td>
                        <td>R${(p.price || 0).toFixed(2)}</td>
                        <td>${p.inventory?.quantity || p.stock || 0}</td>
                        <td><span class="category-badge">${p.subcategory || p.category || 'N/A'}</span></td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

function updateOrdersReport(orders) {
    const container = document.getElementById('ordersReportContent');
    if (!container) return;

    // Calculate order status breakdown
    const statusCounts = {
        pending: 0,
        confirmed: 0,
        processing: 0,
        packed: 0,
        dispatched: 0,
        delivered: 0,
        cancelled: 0
    };

    let totalValue = 0;
    orders.forEach(order => {
        const status = order.status || 'pending';
        if (statusCounts.hasOwnProperty(status)) {
            statusCounts[status]++;
        }
        totalValue += order.total || 0;
    });

    container.innerHTML = `
        <div class="report-stats-grid">
            <div class="report-stat pending">
                <div class="report-stat-value">${statusCounts.pending}</div>
                <div class="report-stat-label">Pending</div>
            </div>
            <div class="report-stat processing">
                <div class="report-stat-value">${statusCounts.confirmed + statusCounts.processing}</div>
                <div class="report-stat-label">Processing</div>
            </div>
            <div class="report-stat success">
                <div class="report-stat-value">${statusCounts.delivered}</div>
                <div class="report-stat-label">Delivered</div>
            </div>
            <div class="report-stat danger">
                <div class="report-stat-value">${statusCounts.cancelled}</div>
                <div class="report-stat-label">Cancelled</div>
            </div>
        </div>
        <div class="report-summary">
            <p><strong>Total Orders:</strong> ${orders.length}</p>
            <p><strong>Total Value:</strong> R${totalValue.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</p>
        </div>
    `;
}

async function generateReport(type) {
    showToast(`Generating ${type} report...`, 'info');

    try {
        // Get date range
        const startDate = document.getElementById('reportStartDate')?.value || '';
        const endDate = document.getElementById('reportEndDate')?.value || '';
        const dateParams = startDate && endDate ? `?startDate=${startDate}&endDate=${endDate}` : '';

        let endpoint = '';
        let filename = '';
        const today = new Date().toISOString().split('T')[0];

        switch(type) {
            case 'sales-csv':
                endpoint = `/reports/sales/csv${dateParams}`;
                filename = `sales-report-${today}.csv`;
                break;
            case 'sales-pdf':
                // PDF not implemented yet, use CSV
                endpoint = `/reports/sales/csv${dateParams}`;
                filename = `sales-report-${today}.csv`;
                break;
            case 'inventory-csv':
                endpoint = `/reports/inventory/csv`;
                filename = `inventory-report-${today}.csv`;
                break;
            case 'inventory-pdf':
                endpoint = `/reports/inventory/csv`;
                filename = `inventory-report-${today}.csv`;
                break;
            case 'orders-csv':
                endpoint = `/reports/orders/csv${dateParams}`;
                filename = `orders-report-${today}.csv`;
                break;
            case 'orders-pdf':
                endpoint = `/reports/orders/csv${dateParams}`;
                filename = `orders-report-${today}.csv`;
                break;
            case 'staff-csv':
                endpoint = `/reports/staff/csv${dateParams}`;
                filename = `staff-report-${today}.csv`;
                break;
            case 'staff-pdf':
                endpoint = `/reports/staff/csv${dateParams}`;
                filename = `staff-report-${today}.csv`;
                break;
            case 'products-csv':
                endpoint = `/reports/products/csv${dateParams}`;
                filename = `top-products-${today}.csv`;
                break;
            case 'products-pdf':
                endpoint = `/reports/products/csv${dateParams}`;
                filename = `top-products-${today}.csv`;
                break;
            default:
                showToast('Unknown report type', 'error');
                return;
        }

        const response = await fetch(`${API_URL}${endpoint}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (response.ok) {
            const blob = await response.blob();
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = filename;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            showToast('Report downloaded successfully', 'success');
        } else {
            const error = await response.json().catch(() => ({}));
            showToast(error.message || 'Failed to generate report', 'error');
        }
    } catch (error) {
        console.error('Report generation error:', error);
        showToast('Error generating report. Please try again.', 'error');
    }
}

// Switch between report tabs
function switchReportTab(tabName, tabElement) {
    // Remove active from all tabs
    document.querySelectorAll('.report-tab').forEach(tab => tab.classList.remove('active'));
    // Add active to clicked tab
    tabElement.classList.add('active');

    // Hide all sections
    document.querySelectorAll('.report-section').forEach(section => section.classList.remove('active'));
    // Show selected section
    const sectionId = tabName + 'Section';
    const section = document.getElementById(sectionId);
    if (section) {
        section.classList.add('active');
    }

    // Load data for the section if needed
    if (tabName === 'inventory') {
        loadInventoryReport();
    } else if (tabName === 'staff') {
        loadStaffReport();
    }
}

// Refresh all reports with date range
async function refreshReports() {
    const startDate = document.getElementById('reportStartDate').value;
    const endDate = document.getElementById('reportEndDate').value;

    showToast('Refreshing reports...', 'info');
    await loadReportsData();
    await loadInventoryReport();
    await loadStaffReport();
    showToast('Reports refreshed', 'success');
}

// Load inventory report
async function loadInventoryReport() {
    const container = document.getElementById('inventoryReportContent');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const products = data.data || data.products || [];

            // Calculate inventory stats
            let totalStock = 0;
            let lowStockCount = 0;
            let outOfStockCount = 0;
            let totalValue = 0;

            products.forEach(p => {
                const qty = p.inventory?.quantity || p.stock || 0;
                const threshold = p.inventory?.lowStockThreshold || 10;
                totalStock += qty;
                totalValue += qty * (p.price || 0);
                if (qty === 0) outOfStockCount++;
                else if (qty <= threshold) lowStockCount++;
            });

            container.innerHTML = `
                <div class="report-stats-grid">
                    <div class="report-stat">
                        <div class="report-stat-value">${products.length}</div>
                        <div class="report-stat-label">Total Products</div>
                    </div>
                    <div class="report-stat success">
                        <div class="report-stat-value">${totalStock.toLocaleString()}</div>
                        <div class="report-stat-label">Total Units in Stock</div>
                    </div>
                    <div class="report-stat pending">
                        <div class="report-stat-value">${lowStockCount}</div>
                        <div class="report-stat-label">Low Stock Items</div>
                    </div>
                    <div class="report-stat danger">
                        <div class="report-stat-value">${outOfStockCount}</div>
                        <div class="report-stat-label">Out of Stock</div>
                    </div>
                </div>
                <div class="report-summary">
                    <p><strong>Total Inventory Value:</strong> R${totalValue.toLocaleString('en-ZA', {minimumFractionDigits: 2})}</p>
                    <p><strong>Average Stock per Product:</strong> ${products.length > 0 ? Math.round(totalStock / products.length) : 0} units</p>
                </div>
                ${lowStockCount > 0 ? `
                <h4 style="margin-top: 1.5rem; color: var(--green-dark);"><i class="fas fa-exclamation-triangle" style="color: #f39c12;"></i> Low Stock Alert</h4>
                <table class="report-table">
                    <thead>
                        <tr><th>Product</th><th>Current Stock</th><th>Threshold</th></tr>
                    </thead>
                    <tbody>
                        ${products.filter(p => {
                            const qty = p.inventory?.quantity || p.stock || 0;
                            const threshold = p.inventory?.lowStockThreshold || 10;
                            return qty > 0 && qty <= threshold;
                        }).slice(0, 10).map(p => `
                            <tr>
                                <td><strong>${p.name}</strong></td>
                                <td style="color: #f39c12; font-weight: 600;">${p.inventory?.quantity || p.stock || 0}</td>
                                <td>${p.inventory?.lowStockThreshold || 10}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
                ` : ''}
            `;
        }
    } catch (error) {
        console.error('Error loading inventory report:', error);
        container.innerHTML = '<p class="report-empty">Failed to load inventory data</p>';
    }
}

// Load staff report
async function loadStaffReport() {
    const container = document.getElementById('staffReportContent');
    if (!container) return;

    try {
        const res = await fetch(`${API_URL}/users`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (res.ok) {
            const data = await res.json();
            const users = data.users || data.data || [];

            // Filter staff roles
            const staffRoles = ['branch_assistant', 'branch_manager', 'packer', 'dispatch_manager', 'inventory_manager'];
            const staff = users.filter(u => staffRoles.includes(u.role));

            // Group by role
            const roleCounts = {};
            staff.forEach(s => {
                roleCounts[s.role] = (roleCounts[s.role] || 0) + 1;
            });

            const roleLabels = {
                'branch_assistant': 'Assistants',
                'branch_manager': 'Managers',
                'packer': 'Packers',
                'dispatch_manager': 'Dispatch',
                'inventory_manager': 'Inventory'
            };

            container.innerHTML = `
                <div class="report-stats-grid">
                    <div class="report-stat">
                        <div class="report-stat-value">${staff.length}</div>
                        <div class="report-stat-label">Total Staff</div>
                    </div>
                    ${Object.entries(roleCounts).map(([role, count]) => `
                        <div class="report-stat">
                            <div class="report-stat-value">${count}</div>
                            <div class="report-stat-label">${roleLabels[role] || role}</div>
                        </div>
                    `).join('')}
                </div>
                <h4 style="margin-top: 1.5rem; color: var(--green-dark);"><i class="fas fa-users"></i> Staff Directory</h4>
                <table class="report-table">
                    <thead>
                        <tr><th>Name</th><th>Email</th><th>Role</th><th>Status</th></tr>
                    </thead>
                    <tbody>
                        ${staff.slice(0, 15).map(s => `
                            <tr>
                                <td><strong>${s.firstName || ''} ${s.lastName || ''}</strong></td>
                                <td>${s.email}</td>
                                <td><span class="category-badge">${roleLabels[s.role] || s.role}</span></td>
                                <td><span style="color: ${s.isActive !== false ? 'var(--green)' : '#e74c3c'}; font-weight: 600;">
                                    ${s.isActive !== false ? 'Active' : 'Inactive'}
                                </span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        console.error('Error loading staff report:', error);
        container.innerHTML = '<p class="report-empty">Failed to load staff data</p>';
    }
}
