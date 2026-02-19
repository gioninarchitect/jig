// ===== ADMIN ADVANCED MODULE =====
async function loadCampaigns() {
    const token = sessionStorage.getItem('adminToken');
    const tbody = document.getElementById('campaignsList');
    const typeFilter = document.getElementById('campaignTypeFilter')?.value || '';
    const statusFilter = document.getElementById('campaignStatusFilter')?.value || '';

    try {
        let url = `${API_URL}/campaigns`;
        const params = new URLSearchParams();
        if (typeFilter) params.append('type', typeFilter);
        if (statusFilter) params.append('status', statusFilter);
        if (params.toString()) url += `?${params.toString()}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.campaigns?.length > 0) {
            tbody.innerHTML = data.campaigns.map(c => `
                <tr>
                    <td><strong>${c.name}</strong></td>
                    <td><span class="status-badge">${c.type?.toUpperCase()}</span></td>
                    <td>${c.audience?.recipientCount || 0} recipients</td>
                    <td>${c.scheduledFor ? formatDate(c.scheduledFor) : '-'}</td>
                    <td><span class="status-badge status-${c.status}">${c.status?.toUpperCase()}</span></td>
                    <td>Sent: ${c.stats?.sent || 0} | Opened: ${c.stats?.opened || 0}</td>
                    <td>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <button class="action-btn view-btn" onclick="viewCampaign('${c._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-eye"></i> View</button>
                            ${c.status === 'draft' ? `<button class="action-btn approve-btn" onclick="sendCampaign('${c._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-paper-plane"></i> Send</button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--green-light);">No campaigns found. Create your first campaign!</td></tr>';
        }
    } catch (error) {
        console.error('Load campaigns error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#f87171;">Error loading campaigns</td></tr>';
    }
}

function openCreateCampaignModal() {
    showAdminToast('Coming Soon', 'Campaign creation modal coming soon', 'info');
}

// ===================== SUPPLIERS =====================
async function loadSuppliers() {
    const token = sessionStorage.getItem('adminToken');
    const tbody = document.getElementById('suppliersList');
    const statusFilter = document.getElementById('supplierStatusFilter')?.value || '';

    try {
        let url = `${API_URL}/suppliers`;
        if (statusFilter) url += `?status=${statusFilter}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.suppliers?.length > 0) {
            tbody.innerHTML = data.suppliers.map(s => `
                <tr>
                    <td>${s.supplierId || s._id.slice(-8)}</td>
                    <td><strong>${s.name}</strong></td>
                    <td>${s.contactPerson || '-'}<br><small>${s.email || ''}</small></td>
                    <td>${s.license?.number || 'N/A'}<br><small>Exp: ${s.license?.expiryDate ? formatDate(s.license.expiryDate) : 'N/A'}</small></td>
                    <td><span class="status-badge status-${s.complianceStatus}">${s.complianceStatus?.toUpperCase()}</span></td>
                    <td>${s.rating ? `${s.rating}/5` : 'Not rated'}</td>
                    <td>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <button class="action-btn view-btn" onclick="viewSupplier('${s._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-eye"></i> View</button>
                            ${s.complianceStatus === 'pending' ? `<button class="action-btn approve-btn" onclick="verifySupplier('${s._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-check-circle"></i> Verify</button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--green-light);">No suppliers found. Add your first supplier!</td></tr>';
        }
    } catch (error) {
        console.error('Load suppliers error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#f87171;">Error loading suppliers</td></tr>';
    }
}

function openCreateSupplierModal() {
    showAdminToast('Coming Soon', 'Supplier creation modal coming soon', 'info');
}

// ===================== PURCHASE ORDERS =====================
async function loadPurchaseOrders() {
    const token = sessionStorage.getItem('adminToken');
    const tbody = document.getElementById('purchaseOrdersList');
    const statusFilter = document.getElementById('poStatusFilter')?.value || '';

    try {
        let url = `${API_URL}/purchase-orders`;
        if (statusFilter) url += `?status=${statusFilter}`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.purchaseOrders?.length > 0) {
            tbody.innerHTML = data.purchaseOrders.map(po => `
                <tr>
                    <td><strong>${po.poNumber || po._id.slice(-8)}</strong></td>
                    <td>${po.supplier?.name || 'Unknown'}</td>
                    <td>${po.items?.length || 0} items</td>
                    <td>R${(po.total || 0).toFixed(2)}</td>
                    <td>${po.expectedDeliveryDate ? formatDate(po.expectedDeliveryDate) : '-'}</td>
                    <td><span class="status-badge status-${po.status}">${po.status?.toUpperCase()}</span></td>
                    <td>
                        <div style="display:flex;gap:6px;align-items:center;">
                            <button class="action-btn view-btn" onclick="viewPO('${po._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-eye"></i> View</button>
                            ${po.status === 'draft' ? `<button class="action-btn approve-btn" onclick="submitPO('${po._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-paper-plane"></i> Submit</button>` : ''}
                            ${po.status === 'submitted' ? `<button class="action-btn approve-btn" onclick="approvePO('${po._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-check"></i> Approve</button>` : ''}
                        </div>
                    </td>
                </tr>
            `).join('');
        } else {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--green-light);">No purchase orders found. Create your first PO!</td></tr>';
        }
    } catch (error) {
        console.error('Load POs error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;color:#f87171;">Error loading purchase orders</td></tr>';
    }
}

function openCreatePOModal() {
    showAdminToast('Coming Soon', 'Purchase order creation modal coming soon', 'info');
}

// Load data when tabs are opened
document.addEventListener('DOMContentLoaded', function() {
    // Add click handlers for new tabs
    const marketingTab = document.querySelector('[data-tab="marketing"]');
    if (marketingTab) marketingTab.addEventListener('click', loadCampaigns);

    const suppliersTab = document.querySelector('[data-tab="suppliers"]');
    if (suppliersTab) suppliersTab.addEventListener('click', loadSuppliers);

    const poTab = document.querySelector('[data-tab="purchase-orders"]');
    if (poTab) poTab.addEventListener('click', loadPurchaseOrders);

    const menuBoardsTab = document.querySelector('[data-tab="menu-boards"]');
    if (menuBoardsTab) menuBoardsTab.addEventListener('click', loadMenuBoards);

    const payrollTab = document.querySelector('[data-tab="payroll"]');
    if (payrollTab) payrollTab.addEventListener('click', initPayroll);

    const smartLedgerTab = document.querySelector('[data-tab="smart-ledger"]');
    if (smartLedgerTab) smartLedgerTab.addEventListener('click', initSmartLedger);
});
