// inv-reports.js — Reports module for inventory manager dashboard
// Depends on: config.js (API_URL), dbc-utils.js (showToast, getToken, apiCall)

// ==================== REPORTS ====================

let _reportBranches = [];

// Main entry — called by loadSectionData('reports')
async function loadReportsSection() {
    await loadReportBranches();
    setReportDatePreset('last30');
}

// Load branches for the report branch filter dropdown
async function loadReportBranches() {
    try {
        const data = await apiCall('/branches');
        _reportBranches = data.branches || data || [];
        const select = document.getElementById('reportBranchFilter');
        if (select) {
            select.innerHTML = '<option value="">All Branches</option>' +
                _reportBranches.map(b => `<option value="${b.branchCode || b._id}">${b.name}</option>`).join('');
        }
    } catch (err) {
        console.error('Error loading branches for reports:', err);
    }
}

// Quick date presets
function setReportDatePreset(preset) {
    const endDate = new Date();
    let startDate = new Date();

    switch (preset) {
        case 'today':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), endDate.getDate());
            break;
        case 'last7':
            startDate.setDate(endDate.getDate() - 7);
            break;
        case 'last30':
            startDate.setDate(endDate.getDate() - 30);
            break;
        case 'last90':
            startDate.setDate(endDate.getDate() - 90);
            break;
        case 'thisMonth':
            startDate = new Date(endDate.getFullYear(), endDate.getMonth(), 1);
            break;
        case 'lastMonth': {
            const lm = new Date(endDate.getFullYear(), endDate.getMonth() - 1, 1);
            startDate = lm;
            endDate.setTime(new Date(endDate.getFullYear(), endDate.getMonth(), 0).getTime());
            break;
        }
    }

    const startEl = document.getElementById('reportStartDate');
    const endEl = document.getElementById('reportEndDate');
    if (startEl) startEl.value = _formatDateInput(startDate);
    if (endEl) endEl.value = _formatDateInput(endDate);

    // Update active preset button
    document.querySelectorAll('.report-preset-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.dataset.preset === preset) btn.classList.add('active');
    });
}

function _formatDateInput(date) {
    return date.toISOString().split('T')[0];
}

// Build query params from filters
function getReportParams() {
    const startDate = document.getElementById('reportStartDate')?.value || '';
    const endDate = document.getElementById('reportEndDate')?.value || '';
    const branchCode = document.getElementById('reportBranchFilter')?.value || '';
    const params = new URLSearchParams();
    if (startDate) params.set('startDate', startDate);
    if (endDate) params.set('endDate', endDate);
    if (branchCode) params.set('branchCode', branchCode);
    return params;
}

// ==================== REPORT DISPATCHER ====================

function generateReport(type) {
    switch (type) {
        case 'inventory': generateInventoryReport(); break;
        case 'sales': generateSalesReport(); break;
        case 'section21': generateSection21Audit(); break;
        case 'orders': generateOrdersReport(); break;
        case 'staff': generateStaffReport(); break;
        default: showToast('error', 'Unknown report type: ' + type);
    }
}

// ==================== INVENTORY REPORT ====================

async function generateInventoryReport() {
    showToast('info', 'Generating inventory report...');
    try {
        const params = getReportParams();
        const data = await apiCall('/reports/inventory?' + params.toString());
        // API returns { success, data: { inventory: [...], summary: {}, filters: {} } }
        const reportData = data.data || data;
        const products = reportData.inventory || reportData.products || [];

        // Compute summary from product data
        const totalProducts = products.length;
        const totalValue = products.reduce(function(sum, p) {
            return sum + ((p.inventory?.quantity || 0) * (p.price || 0));
        }, 0);
        const lowStock = products.filter(function(p) { const q = p.inventory?.quantity || 0; return q > 0 && q <= 10; }).length;
        const outOfStock = products.filter(function(p) { return (p.inventory?.quantity || 0) === 0; }).length;

        const content = `
            <div class="row mb-4">
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--green);color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${totalProducts}</div>
                        <div style="font-size:12px;opacity:0.9;">Total Products</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--gold);color:var(--green-dark);padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${formatCurrency(totalValue)}</div>
                        <div style="font-size:12px;">Total Value</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:#f59e0b;color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${lowStock}</div>
                        <div style="font-size:12px;">Low Stock</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--red);color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${outOfStock}</div>
                        <div style="font-size:12px;">Out of Stock</div>
                    </div>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 style="margin:0;color:var(--green-dark);">Product Details (${totalProducts})</h6>
                <button class="btn btn-sm btn-outline-success" onclick="downloadReportCSV('/reports/inventory/csv')">
                    <i class="fas fa-download"></i> Download CSV
                </button>
            </div>
            <div style="max-height:400px;overflow-y:auto;">
                <table class="table table-sm table-hover">
                    <thead style="position:sticky;top:0;background:#f8f9fa;">
                        <tr>
                            <th>Product</th>
                            <th>SKU</th>
                            <th>Category</th>
                            <th class="text-end">Stock</th>
                            <th class="text-end">Value</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${products.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">No data available</td></tr>' :
                            products.slice(0, 200).map(p => {
                                const qty = p.inventory?.quantity || 0;
                                return `
                                <tr>
                                    <td>${p.name || '-'}</td>
                                    <td><small class="text-muted">${p.sku || '-'}</small></td>
                                    <td><span class="badge bg-secondary">${p.category || '-'}</span></td>
                                    <td class="text-end">${qty}</td>
                                    <td class="text-end">${formatCurrency(qty * (p.price || 0))}</td>
                                    <td>${_stockStatusBadge(qty)}</td>
                                </tr>
                                `;
                            }).join('')}
                    </tbody>
                </table>
            </div>
        `;

        showReportModal('Inventory Report', content);
    } catch (err) {
        console.error('Inventory report error:', err);
        showToast('error', 'Failed to generate inventory report');
    }
}

// ==================== SALES REPORT ====================

async function generateSalesReport() {
    showToast('info', 'Generating sales report...');
    try {
        const params = getReportParams();
        const data = await apiCall('/reports/sales?' + params.toString());
        // API returns { success, data: { salesReport: [{totalSales, totalOrders, averageOrderValue, ...}] } }
        const reportData = data.data || data;
        const summary = (reportData.salesReport || [])[0] || {};

        const totalSales = summary.totalSales || 0;
        const totalOrders = summary.totalOrders || 0;
        const avgOrderValue = summary.averageOrderValue || 0;
        const completedOrders = summary.completedOrders || 0;
        const totalDiscount = summary.totalDiscount || 0;
        const totalTax = summary.totalTax || 0;

        const content = `
            <div class="row mb-4">
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--green);color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${totalOrders}</div>
                        <div style="font-size:12px;opacity:0.9;">Total Orders</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--gold);color:var(--green-dark);padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${formatCurrency(totalSales)}</div>
                        <div style="font-size:12px;">Total Revenue</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:#17a2b8;color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${formatCurrency(avgOrderValue)}</div>
                        <div style="font-size:12px;">Avg Order Value</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:#22C55E;color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${completedOrders}</div>
                        <div style="font-size:12px;">Completed</div>
                    </div>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 style="margin:0;color:var(--green-dark);">Sales Summary</h6>
                <button class="btn btn-sm btn-outline-success" onclick="downloadReportCSV('/reports/sales/csv')">
                    <i class="fas fa-download"></i> Download CSV
                </button>
            </div>
            <table class="table table-sm">
                <tbody>
                    <tr><td class="fw-bold">Period</td><td>${reportData.period?.startDate || '-'} to ${reportData.period?.endDate || '-'}</td></tr>
                    <tr><td class="fw-bold">Total Revenue</td><td>${formatCurrency(totalSales)}</td></tr>
                    <tr><td class="fw-bold">Subtotal</td><td>${formatCurrency(summary.totalSubtotal || totalSales)}</td></tr>
                    <tr><td class="fw-bold">Discounts</td><td>${formatCurrency(totalDiscount)}</td></tr>
                    <tr><td class="fw-bold">Tax</td><td>${formatCurrency(totalTax)}</td></tr>
                    <tr><td class="fw-bold">Avg Order Value</td><td>${formatCurrency(avgOrderValue)}</td></tr>
                    <tr><td class="fw-bold">Total Orders</td><td>${totalOrders}</td></tr>
                    <tr><td class="fw-bold">Completed Orders</td><td>${completedOrders}</td></tr>
                    <tr><td class="fw-bold">Pending Orders</td><td>${summary.pendingOrders || 0}</td></tr>
                </tbody>
            </table>
        `;

        showReportModal('Sales Summary Report', content);
    } catch (err) {
        console.error('Sales report error:', err);
        showToast('error', 'Failed to generate sales report');
    }
}

// ==================== SECTION 21 AUDIT REPORT ====================

async function generateSection21Audit() {
    showToast('info', 'Generating Section 21 audit...');
    try {
        const [statusData, expiringData] = await Promise.all([
            apiCall('/compliance/section21/status').catch(() => ({})),
            apiCall('/section21/admin/expiring').catch(() => ({ documents: [] }))
        ]);

        // /compliance/section21/status returns {total, approved, expired, complianceRate}
        // /section21/admin/expiring returns [] (array of docs)
        const complianceRate = statusData.complianceRate || 0;
        const totalPatients = statusData.total || 0;
        const activeCount = statusData.approved || 0;
        const expiredCount = statusData.expired || 0;
        const expiring = Array.isArray(expiringData) ? expiringData : (expiringData.documents || expiringData.expiring || []);

        const content = `
            <div class="row mb-4">
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--green);color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${totalPatients}</div>
                        <div style="font-size:12px;opacity:0.9;">Total Patients</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:#17a2b8;color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${activeCount}</div>
                        <div style="font-size:12px;">Active Authorizations</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--red);color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${expiredCount}</div>
                        <div style="font-size:12px;">Expired</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="padding:16px;border-radius:10px;text-align:center;border:2px solid ${complianceRate >= 80 ? 'var(--green)' : complianceRate >= 50 ? 'var(--gold)' : 'var(--red)'};">
                        <div style="font-size:24px;font-weight:bold;color:${complianceRate >= 80 ? 'var(--green)' : complianceRate >= 50 ? 'var(--gold)' : 'var(--red)'};">${complianceRate}%</div>
                        <div style="font-size:12px;color:#666;">Compliance Rate</div>
                    </div>
                </div>
            </div>
            ${expiring.length > 0 ? `
                <div class="alert" style="background:rgba(220, 38, 38,0.1);border:1px solid var(--red);color:var(--red);border-radius:8px;">
                    <i class="fas fa-exclamation-triangle"></i>
                    <strong>${expiring.length} document${expiring.length > 1 ? 's' : ''} expiring within 30 days</strong>
                </div>
                <div style="max-height:300px;overflow-y:auto;">
                    <table class="table table-sm table-hover">
                        <thead style="position:sticky;top:0;background:#f8f9fa;">
                            <tr>
                                <th>Patient</th>
                                <th>Document Type</th>
                                <th>Expiry Date</th>
                                <th>Days Left</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${expiring.map(d => {
                                const daysLeft = d.daysUntilExpiry || _daysUntil(d.expiryDate);
                                return `
                                    <tr>
                                        <td>${d.userName || d.patientName || d.email || '-'}</td>
                                        <td>${d.documentType || d.type || 'Section 21'}</td>
                                        <td>${d.expiryDate ? new Date(d.expiryDate).toLocaleDateString() : '-'}</td>
                                        <td><span class="badge ${daysLeft <= 7 ? 'bg-danger' : daysLeft <= 14 ? 'bg-warning text-dark' : 'bg-info'}">${daysLeft} days</span></td>
                                    </tr>
                                `;
                            }).join('')}
                        </tbody>
                    </table>
                </div>
            ` : '<div class="alert alert-jig"><i class="fas fa-check-circle"></i> No documents expiring in the next 30 days.</div>'}
        `;

        showReportModal('Section 21 Compliance Audit', content);
    } catch (err) {
        console.error('Section 21 audit error:', err);
        showToast('error', 'Failed to generate Section 21 audit');
    }
}

// ==================== ORDERS REPORT ====================

async function generateOrdersReport() {
    showToast('info', 'Generating orders report...');
    try {
        const params = getReportParams();
        const data = await apiCall('/reports/orders?' + params.toString());
        // API returns { success, data: { ordersByStatus: [...], paymentMethods: [...], summary: {...} } }
        const reportData = data.data || data;
        const summary = reportData.summary || {};
        const ordersByStatus = reportData.ordersByStatus || [];
        const paymentMethods = reportData.paymentMethods || [];

        const totalOrders = summary.totalOrders || 0;
        const totalRevenue = summary.totalRevenue || 0;
        const avgOrderValue = summary.averageOrderValue || 0;

        const content = `
            <div class="row mb-4">
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--green);color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${totalOrders}</div>
                        <div style="font-size:12px;opacity:0.9;">Total Orders</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:var(--gold);color:var(--green-dark);padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${formatCurrency(totalRevenue)}</div>
                        <div style="font-size:12px;">Total Revenue</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:#17a2b8;color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${formatCurrency(avgOrderValue)}</div>
                        <div style="font-size:12px;">Avg Order Value</div>
                    </div>
                </div>
                <div class="col-6 col-md-3 mb-2">
                    <div style="background:#6366F1;color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${summary.paidOrders || 0}</div>
                        <div style="font-size:12px;">Paid Orders</div>
                    </div>
                </div>
            </div>

            <div class="row">
                <div class="col-md-6 mb-3">
                    <h6 style="color:var(--green-dark);">Orders by Status</h6>
                    <table class="table table-sm table-hover">
                        <thead style="background:#f8f9fa;">
                            <tr><th>Status</th><th class="text-end">Count</th><th class="text-end">Amount</th><th class="text-end">Avg</th></tr>
                        </thead>
                        <tbody>
                            ${ordersByStatus.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">No orders</td></tr>' :
                                ordersByStatus.map(function(o) {
                                    const status = o._id?.status || o.status || '-';
                                    return '<tr><td>' + _orderStatusBadge(status) + '</td><td class="text-end">' + (o.count || 0) + '</td><td class="text-end">' + formatCurrency(o.totalAmount || 0) + '</td><td class="text-end">' + formatCurrency(o.averageAmount || 0) + '</td></tr>';
                                }).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="col-md-6 mb-3">
                    <div class="d-flex justify-content-between align-items-center mb-2">
                        <h6 style="color:var(--green-dark);margin:0;">Payment Methods</h6>
                        <button class="btn btn-sm btn-outline-success" onclick="downloadReportCSV('/reports/orders/csv')">
                            <i class="fas fa-download"></i> CSV
                        </button>
                    </div>
                    <table class="table table-sm table-hover">
                        <thead style="background:#f8f9fa;">
                            <tr><th>Method</th><th>Status</th><th class="text-end">Count</th><th class="text-end">Amount</th></tr>
                        </thead>
                        <tbody>
                            ${paymentMethods.length === 0 ? '<tr><td colspan="4" class="text-center text-muted">No payment data</td></tr>' :
                                paymentMethods.map(function(pm) {
                                    const method = pm._id?.method || pm.method || '-';
                                    const status = pm._id?.status || pm.status || '-';
                                    return '<tr><td><span class="badge bg-secondary">' + method + '</span></td><td>' + _orderStatusBadge(status) + '</td><td class="text-end">' + (pm.count || 0) + '</td><td class="text-end">' + formatCurrency(pm.totalAmount || 0) + '</td></tr>';
                                }).join('')}
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        showReportModal('Orders Report', content);
    } catch (err) {
        console.error('Orders report error:', err);
        showToast('error', 'Failed to generate orders report');
    }
}

// ==================== STAFF REPORT ====================

async function generateStaffReport() {
    showToast('info', 'Generating staff report...');
    try {
        const params = getReportParams();
        const data = await apiCall('/reports/staff?' + params.toString());
        // API returns { success, data: { staff: [...], summary: {totalStaff, totalSales, ...} } }
        const reportData = data.data || data;
        const staff = reportData.staff || [];
        const staffSummary = reportData.summary || {};
        const totalStaff = staffSummary.totalStaff || staff.length;

        const content = `
            <div class="row mb-4">
                <div class="col-6 col-md-4 mb-2">
                    <div style="background:var(--green);color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${totalStaff}</div>
                        <div style="font-size:12px;opacity:0.9;">Total Staff</div>
                    </div>
                </div>
                <div class="col-6 col-md-4 mb-2">
                    <div style="background:var(--gold);color:var(--green-dark);padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${staff.filter(s => s.salesCount || s.transactions).length}</div>
                        <div style="font-size:12px;">Active Sellers</div>
                    </div>
                </div>
                <div class="col-12 col-md-4 mb-2">
                    <div style="background:#17a2b8;color:white;padding:16px;border-radius:10px;text-align:center;">
                        <div style="font-size:24px;font-weight:bold;">${formatCurrency(staff.reduce((sum, s) => sum + (s.totalRevenue || s.revenue || 0), 0))}</div>
                        <div style="font-size:12px;">Total Revenue</div>
                    </div>
                </div>
            </div>
            <div class="d-flex justify-content-between align-items-center mb-3">
                <h6 style="margin:0;color:var(--green-dark);">Staff Performance</h6>
                <button class="btn btn-sm btn-outline-success" onclick="downloadReportCSV('/reports/staff/csv')">
                    <i class="fas fa-download"></i> Download CSV
                </button>
            </div>
            <div style="max-height:400px;overflow-y:auto;">
                <table class="table table-sm table-hover">
                    <thead style="position:sticky;top:0;background:#f8f9fa;">
                        <tr>
                            <th>Staff Member</th>
                            <th>Role</th>
                            <th>Branch</th>
                            <th class="text-end">Sales</th>
                            <th class="text-end">Revenue</th>
                            <th class="text-end">Avg Sale</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${staff.length === 0 ? '<tr><td colspan="6" class="text-center text-muted">No staff data for this period</td></tr>' :
                            staff.map(s => `
                                <tr>
                                    <td><strong>${s.name || ((s.firstName || '') + ' ' + (s.lastName || '')).trim() || s.email || '-'}</strong></td>
                                    <td><span class="badge bg-secondary">${s.role || '-'}</span></td>
                                    <td>${s.branchName || s.branch || '-'}</td>
                                    <td class="text-end">${s.salesCount || s.transactions || 0}</td>
                                    <td class="text-end">${formatCurrency(s.totalRevenue || s.revenue || 0)}</td>
                                    <td class="text-end">${formatCurrency(s.averageSale || s.avgSale || 0)}</td>
                                </tr>
                            `).join('')}
                    </tbody>
                </table>
            </div>
        `;

        showReportModal('Staff Performance Report', content);
    } catch (err) {
        console.error('Staff report error:', err);
        showToast('error', 'Failed to generate staff report');
    }
}

// ==================== CSV DOWNLOAD ====================

function downloadReportCSV(endpoint) {
    const params = getReportParams();
    const token = getToken();
    params.set('token', token);
    const url = `${API_URL}${endpoint}?${params.toString()}`;
    window.open(url, '_blank');
}

// ==================== REPORT MODAL ====================

function showReportModal(title, content) {
    // Remove existing modal
    document.getElementById('reportModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'reportModal';
    modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1060;align-items:center;justify-content:center;padding:20px;';
    modal.innerHTML = `
        <div style="background:#fff;border-radius:12px;width:100%;max-width:900px;max-height:90vh;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);display:flex;flex-direction:column;">
            <div style="background:var(--green);color:var(--cream);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;flex-shrink:0;">
                <h5 style="margin:0;font-family:'Oswald', sans-serif;font-size:1.2rem;"><i class="fas fa-file-alt"></i> ${title}</h5>
                <button onclick="closeReportModal()" style="background:none;border:none;color:var(--cream);font-size:1.3rem;cursor:pointer;"><i class="fas fa-times"></i></button>
            </div>
            <div style="padding:20px;overflow-y:auto;flex:1;">
                ${content}
            </div>
        </div>
    `;

    // Close on backdrop click
    modal.addEventListener('click', function(e) {
        if (e.target === modal) closeReportModal();
    });

    document.body.appendChild(modal);
}

function closeReportModal() {
    document.getElementById('reportModal')?.remove();
}

// ==================== HELPERS ====================

function _stockStatusBadge(qty) {
    if (qty <= 0) return '<span class="badge bg-danger">Out</span>';
    if (qty <= 10) return '<span class="badge bg-warning text-dark">Low</span>';
    return '<span class="badge bg-success">OK</span>';
}

function _orderStatusBadge(status) {
    const map = {
        'completed': '<span class="badge bg-success">Completed</span>',
        'pending': '<span class="badge bg-warning text-dark">Pending</span>',
        'processing': '<span class="badge bg-info">Processing</span>',
        'cancelled': '<span class="badge bg-danger">Cancelled</span>',
        'refunded': '<span class="badge bg-secondary">Refunded</span>'
    };
    return map[(status || '').toLowerCase()] || `<span class="badge bg-secondary">${status || '-'}</span>`;
}

function _daysUntil(dateStr) {
    if (!dateStr) return 0;
    const now = new Date();
    const target = new Date(dateStr);
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}
