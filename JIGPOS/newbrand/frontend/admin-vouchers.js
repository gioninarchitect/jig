// ===== ADMIN VOUCHERS MODULE =====

let currentVoucherFilter = 'all';
let allVouchers = [];

// Load vouchers when tab is opened
async function loadVouchers(status = 'all') {
    try {
        const token = sessionStorage.getItem('adminToken');
        const url = status === 'all'
            ? `${API_URL}/vouchers`
            : `${API_URL}/vouchers?status=${status}`;

        const response = await fetch(url, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load vouchers');
        }

        const data = await response.json();
        allVouchers = data.vouchers || [];

        // Update stats
        updateVoucherStats(allVouchers);

        // Display vouchers
        displayVouchers(allVouchers);
    } catch (error) {
        console.error('Load vouchers error:', error);
        showAdminToast('Error', 'Failed to load vouchers', 'error');
        document.getElementById('vouchersList').innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--green-light);">
                    Error loading vouchers. Please refresh the page.
                </td>
            </tr>
        `;
    }
}

// Update voucher stats
function updateVoucherStats(vouchers) {
    const total = vouchers.length;
    const active = vouchers.filter(v => v.status === 'active').length;
    const totalRedemptions = vouchers.reduce((sum, v) => sum + (v.redeemCount || 0), 0);
    const totalDiscount = vouchers.reduce((sum, v) => {
        const redemptionHistory = v.redemptionHistory || [];
        return sum + redemptionHistory.reduce((s, r) => s + (r.discountApplied || 0), 0);
    }, 0);

    document.getElementById('totalVouchers').textContent = total;
    document.getElementById('activeVouchers').textContent = active;
    document.getElementById('totalRedemptions').textContent = totalRedemptions;
    document.getElementById('totalDiscountGiven').textContent = `R${totalDiscount.toFixed(2)}`;
}

// Display vouchers in table
function displayVouchers(vouchers) {
    const tbody = document.getElementById('vouchersList');

    if (vouchers.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: var(--green-light);">
                    No vouchers found. Create your first voucher to get started.
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = vouchers.map(voucher => {
        const expiryDate = new Date(voucher.expiryDate);
        const isExpired = expiryDate < new Date();
        const statusBadge = getVoucherStatusBadge(voucher.status, isExpired);
        const typeDisplay = getVoucherTypeDisplay(voucher.type, voucher.value);

        return `
            <tr>
                <td><strong>${voucher.code}</strong></td>
                <td>${voucher.name}</td>
                <td>${typeDisplay}</td>
                <td>${formatVoucherValue(voucher.type, voucher.value)}</td>
                <td>${voucher.redeemCount || 0}${voucher.maxRedemptions ? `/${voucher.maxRedemptions}` : ''}</td>
                <td>${formatDate(expiryDate)}</td>
                <td>${statusBadge}</td>
                <td>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="action-btn view-btn" onclick="viewVoucherAnalytics('${voucher._id}')" title="View Analytics" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                            <i class="fas fa-chart-line"></i> Analytics
                        </button>
                        ${voucher.status === 'active' ? `
                            <button class="action-btn reject-btn" onclick="deactivateVoucher('${voucher._id}')" title="Deactivate" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                <i class="fas fa-ban"></i> Deactivate
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Get voucher status badge HTML
function getVoucherStatusBadge(status, isExpired) {
    if (isExpired && status === 'active') {
        return '<span class="badge badge-danger">Expired</span>';
    }

    switch (status) {
        case 'active':
            return '<span class="badge badge-success">Active</span>';
        case 'inactive':
            return '<span class="badge badge-secondary">Inactive</span>';
        case 'expired':
            return '<span class="badge badge-danger">Expired</span>';
        default:
            return '<span class="badge badge-secondary">' + status + '</span>';
    }
}

// Get voucher type display text
function getVoucherTypeDisplay(type, value) {
    switch (type) {
        case 'percentage':
            return 'Percentage';
        case 'fixed':
            return 'Fixed Amount';
        case 'free_shipping':
            return 'Free Shipping';
        case 'bogo':
            return 'BOGO';
        default:
            return type;
    }
}

// Format voucher value
function formatVoucherValue(type, value) {
    switch (type) {
        case 'percentage':
            return `${value}%`;
        case 'fixed':
            return `R${value.toFixed(2)}`;
        case 'free_shipping':
            return 'Free';
        case 'bogo':
            return 'BOGO';
        default:
            return value;
    }
}

// Filter vouchers by status
function filterVouchers(status) {
    currentVoucherFilter = status;

    // Update active tab
    document.querySelectorAll('#vouchers-tab .tab').forEach(tab => {
        tab.classList.remove('active');
    });
    document.querySelector(`#vouchers-tab .tab[data-status="${status}"]`).classList.add('active');

    // Filter and display
    if (status === 'all') {
        displayVouchers(allVouchers);
    } else {
        const filtered = allVouchers.filter(v => v.status === status);
        displayVouchers(filtered);
    }
}

// Show create voucher modal
function showCreateVoucherModal() {
    document.getElementById('createVoucherModal').style.display = 'flex';

    // Set default expiry to 30 days from now
    const defaultExpiry = new Date();
    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
    document.getElementById('expiryDate').value = formatDateTimeLocal(defaultExpiry);
}

// Close create voucher modal
function closeCreateVoucherModal() {
    document.getElementById('createVoucherModal').style.display = 'none';
    document.getElementById('createVoucherForm').reset();
}

// Generate random voucher code
function generateVoucherCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < 8; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    document.getElementById('voucherCode').value = code;
}

// Update voucher value label based on type
function updateVoucherValueLabel() {
    const type = document.getElementById('voucherType').value;
    const label = document.getElementById('voucherValueLabel');

    switch (type) {
        case 'percentage':
            label.textContent = 'Percentage';
            document.getElementById('voucherValue').placeholder = 'e.g., 20';
            break;
        case 'fixed':
            label.textContent = 'Amount (R)';
            document.getElementById('voucherValue').placeholder = 'e.g., 50';
            break;
        case 'free_shipping':
            label.textContent = 'Value';
            document.getElementById('voucherValue').value = '0';
            document.getElementById('voucherValue').disabled = true;
            break;
        case 'bogo':
            label.textContent = 'Value';
            document.getElementById('voucherValue').value = '0';
            document.getElementById('voucherValue').disabled = true;
            break;
    }
}

// Create new voucher
async function createVoucher(event) {
    event.preventDefault();

    const formData = {
        code: document.getElementById('voucherCode').value.trim().toUpperCase() || undefined,
        name: document.getElementById('voucherName').value.trim(),
        description: document.getElementById('voucherDescription').value.trim() || undefined,
        type: document.getElementById('voucherType').value,
        value: parseFloat(document.getElementById('voucherValue').value),
        minPurchase: parseFloat(document.getElementById('minPurchase').value) || 0,
        maxDiscount: parseFloat(document.getElementById('maxDiscount').value) || undefined,
        startDate: document.getElementById('startDate').value || undefined,
        expiryDate: document.getElementById('expiryDate').value,
        redemptionLimit: document.getElementById('redemptionLimit').value,
        maxRedemptions: parseInt(document.getElementById('maxRedemptions').value) || undefined,
        internalNotes: document.getElementById('internalNotes').value.trim() || undefined
    };

    try {
        const token = sessionStorage.getItem('adminToken');

        const response = await fetch(`${API_URL}/vouchers`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(formData)
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Failed to create voucher');
        }

        const data = await response.json();

        showAdminToast('Success', `Voucher ${data.voucher.code} created successfully`, 'success');
        closeCreateVoucherModal();
        loadVouchers(currentVoucherFilter);
    } catch (error) {
        console.error('Create voucher error:', error);
        showAdminToast('Error', error.message, 'error');
    }
}

// Deactivate voucher
async function deactivateVoucher(voucherId) {
    showAdminConfirm(
        'Deactivate Voucher',
        'Are you sure you want to deactivate this voucher? It will no longer be usable.',
        async () => {
            try {
                const token = sessionStorage.getItem('adminToken');

                const response = await fetch(`${API_URL}/vouchers/${voucherId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.error || 'Failed to deactivate voucher');
                }

                showAdminToast('Success', 'Voucher deactivated successfully', 'success');
                loadVouchers(currentVoucherFilter);
            } catch (error) {
                console.error('Deactivate voucher error:', error);
                showAdminToast('Error', error.message, 'error');
            }
        }
    );
}

// View voucher analytics
async function viewVoucherAnalytics(voucherId) {
    document.getElementById('voucherAnalyticsModal').style.display = 'flex';
    document.getElementById('analyticsContent').innerHTML = '<i class="fas fa-spinner fa-spin"></i> Loading analytics...';

    try {
        const token = sessionStorage.getItem('adminToken');

        const response = await fetch(`${API_URL}/vouchers/${voucherId}/analytics`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to load analytics');
        }

        const data = await response.json();
        const analytics = data.analytics;

        document.getElementById('analyticsContent').innerHTML = `
            <div style="margin-bottom: 20px;">
                <h4>${analytics.code} - ${analytics.name}</h4>
                <p style="color: #666;">${getVoucherStatusBadge(analytics.status, false)}</p>
            </div>

            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card">
                    <div class="stat-value">${analytics.totalRedemptions}</div>
                    <div class="stat-label">Total Redemptions</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${analytics.uniqueCustomers}</div>
                    <div class="stat-label">Unique Customers</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">R${analytics.totalDiscountGiven.toFixed(2)}</div>
                    <div class="stat-label">Total Discount</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">R${analytics.totalRevenue.toFixed(2)}</div>
                    <div class="stat-label">Total Revenue</div>
                </div>
            </div>

            <div class="stats-grid" style="margin-bottom: 20px;">
                <div class="stat-card">
                    <div class="stat-value">R${analytics.averageOrderValue.toFixed(2)}</div>
                    <div class="stat-label">Avg Order Value</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">R${analytics.averageDiscount.toFixed(2)}</div>
                    <div class="stat-label">Avg Discount</div>
                </div>
            </div>

            ${analytics.redemptionHistory.length > 0 ? `
                <h4 style="margin-top: 20px;">Recent Redemptions</h4>
                <table style="width: 100%; margin-top: 10px;">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Customer</th>
                            <th>Order Total</th>
                            <th>Discount</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${analytics.redemptionHistory.slice(0, 10).map(r => `
                            <tr>
                                <td>${formatDate(new Date(r.redeemedAt))}</td>
                                <td>${r.userId?.email || 'Unknown'}</td>
                                <td>R${r.orderTotal.toFixed(2)}</td>
                                <td>R${r.discountApplied.toFixed(2)}</td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            ` : '<p style="color: var(--green-light); text-align: center; margin-top: 20px;">No redemptions yet</p>'}
        `;
    } catch (error) {
        console.error('View analytics error:', error);
        document.getElementById('analyticsContent').innerHTML = `
            <p style="color: #d9534f; text-align: center;">Failed to load analytics. Please try again.</p>
        `;
    }
}

// Close voucher analytics modal
function closeVoucherAnalyticsModal() {
    document.getElementById('voucherAnalyticsModal').style.display = 'none';
}

async function resendVoucher() {
    const modal = document.getElementById('voucherAnalyticsModal');
    const voucherId = modal?.dataset?.voucherId;
    if (!voucherId) { showToast('No voucher selected', 'warning'); return; }
    try {
        const token = sessionStorage.getItem('adminToken');
        const res = await fetch(`${API_URL}/vouchers/${voucherId}/resend`, {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success) {
            showToast('Voucher resent to customer email', 'success');
        } else {
            showToast(data.message || 'Could not resend voucher', 'error');
        }
    } catch (err) {
        showToast('Error resending voucher', 'error');
    }
}

// Format datetime for input field
function formatDateTimeLocal(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
}

// Format date for display
function formatDate(date) {
    return new Date(date).toLocaleDateString('en-ZA', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}
