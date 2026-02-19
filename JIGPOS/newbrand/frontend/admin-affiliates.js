// ===== ADMIN AFFILIATES MODULE =====

// Affiliate Management Functions - MongoDB Backend
async function loadAffiliates() {
    const tbody = document.getElementById('affiliatesList');

    try {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: var(--green-light);">Please login to view affiliates</td></tr>';
            return;
        }

        const response = await fetch(`${API_URL}/affiliate/admin/all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch affiliates');
        }

        const data = await response.json();
        const affiliates = data.affiliates || [];

        let html = '';
        affiliates.forEach((affiliate) => {
            const totalSales = affiliate.metrics?.totalSales || 0;
            const totalCommission = affiliate.metrics?.totalCommission || 0;

            html += `
                <tr>
                    <td>
                        <div>
                            <div style="font-weight: bold;">${affiliate.fullName || affiliate.username}</div>
                            <div style="color: var(--green-light); font-size: 0.9rem;">@${affiliate.username}</div>
                            <div style="color: var(--green-light); font-size: 0.85rem;">${affiliate.email}</div>
                        </div>
                    </td>
                    <td>
                        <span class="voucher-code">${affiliate.affiliateCode || 'N/A'}</span>
                    </td>
                    <td>
                        <span style="text-transform: capitalize; color: var(--green-deep);">
                            ${affiliate.affiliateType || 'standard'}
                        </span>
                    </td>
                    <td style="font-weight: bold;">R${totalSales.toLocaleString()}</td>
                    <td style="font-weight: bold; color: var(--green-deep);">R${totalCommission.toLocaleString()}</td>
                    <td>
                        <span class="status-badge status-${affiliate.status || 'pending'}">
                            ${(affiliate.status || 'pending').toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <div style="display:flex;gap:6px;align-items:center;">
                            ${affiliate.status === 'pending' ?
                                `<button class="action-btn approve-btn" onclick="approveAffiliate('${affiliate._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-check"></i> Approve</button>` :
                                `<button class="action-btn view-btn" onclick="viewAffiliateDetails('${affiliate._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-eye"></i> View</button>`
                            }
                            <button class="action-btn reject-btn" onclick="suspendAffiliate('${affiliate._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-ban"></i> Suspend</button>
                        </div>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="7" style="text-align: center; color: var(--green-light);">No affiliates found</td></tr>';

        // Update stats
        if (data.stats) {
            document.getElementById('totalAffiliates').textContent = data.stats.total;
            document.getElementById('activeAffiliates').textContent = data.stats.active;
            document.getElementById('pendingAffiliates').textContent = data.stats.pending;
            document.getElementById('totalCommissions').textContent = 'R' + data.stats.totalCommissions.toLocaleString();
        }
    } catch (error) {
        console.error('Load affiliates error:', error);
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; color: #f87171;">Error loading affiliates from database</td></tr>';
    }
}

async function approveAffiliate(affiliateId) {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/affiliate/admin/approve/${affiliateId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();
        if (data.success) {
            showAdminToast('Success', 'Affiliate approved successfully', 'success');
            loadAffiliates();
        } else {
            showAdminToast('Error', data.error || 'Failed to approve affiliate', 'error');
        }
    } catch (error) {
        console.error('Approve affiliate error:', error);
        showAdminToast('Error', 'Failed to approve affiliate', 'error');
    }
}

async function suspendAffiliate(affiliateId) {
    showAdminConfirm(
        'Suspend Affiliate',
        'Are you sure you want to suspend this affiliate?',
        () => {
            showAdminPrompt(
                'Suspension Reason',
                'Enter reason for suspension (optional):',
                async (reason) => {
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/affiliate/admin/suspend/${affiliateId}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ reason: reason || '' })
                        });

                        const data = await response.json();
                        if (data.success) {
                            showAdminToast('Success', 'Affiliate suspended successfully', 'success');
                            loadAffiliates();
                        } else {
                            showAdminToast('Error', data.error || 'Failed to suspend affiliate', 'error');
                        }
                    } catch (error) {
                        console.error('Suspend affiliate error:', error);
                        showAdminToast('Error', 'Failed to suspend affiliate', 'error');
                    }
                },
                async () => {
                    // User cancelled prompt but confirmed suspension - proceed without reason
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/affiliate/admin/suspend/${affiliateId}`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`,
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({ reason: '' })
                        });

                        const data = await response.json();
                        if (data.success) {
                            showAdminToast('Success', 'Affiliate suspended successfully', 'success');
                            loadAffiliates();
                        } else {
                            showAdminToast('Error', data.error || 'Failed to suspend affiliate', 'error');
                        }
                    } catch (error) {
                        console.error('Suspend affiliate error:', error);
                        showAdminToast('Error', 'Failed to suspend affiliate', 'error');
                    }
                }
            );
        }
    );
}

async function viewAffiliateDetails(affiliateId) {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/affiliate/admin/all`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();
        const affiliate = data.affiliates.find(a => a._id === affiliateId);

        if (affiliate) {
            const details = `
Affiliate Details:
Name: ${affiliate.fullName || 'N/A'}
Username: ${affiliate.username}
Email: ${affiliate.email}
Phone: ${affiliate.phone || 'N/A'}
Type: ${affiliate.affiliateType}
Code: ${affiliate.affiliateCode}
Status: ${affiliate.status}
Commission Rate: ${affiliate.commissionRate}%

Social Media:
- Instagram: ${affiliate.socialMedia?.instagram || 'N/A'}
- TikTok: ${affiliate.socialMedia?.tiktok || 'N/A'}
- YouTube: ${affiliate.socialMedia?.youtube || 'N/A'}

Metrics:
- Total Sales: R${affiliate.metrics?.totalSales || 0}
- Total Commission: R${affiliate.metrics?.totalCommission || 0}
- Total Orders: ${affiliate.metrics?.totalOrders || 0}
            `;
            showAdminToast('Details', details, 'info');
        }
    } catch (error) {
        console.error('View affiliate error:', error);
        showAdminToast('Error', 'Failed to load affiliate details', 'error');
    }
}

function filterAffiliates() {
    // Implement filtering logic if needed
    loadAffiliates();
}
