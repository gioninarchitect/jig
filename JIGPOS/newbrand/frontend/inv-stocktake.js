// inv-stocktake.js — Stocktake review & approval for inventory manager dashboard
// Depends on: config.js (API_URL), or-utils.js (showToast), or-auth.js (getToken), inv-core.js

let allStocktakeSessions = [];
let currentStocktakeSession = null;
let allDetailItems = [];

// ============================================================
// LOAD & RENDER STOCKTAKE LIST
// ============================================================

async function loadPendingStocktakes() {
    const tbody = document.getElementById('stocktakeReviewsTable');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4">
        <div class="spinner-border text-success" role="status"></div>
        <p class="mt-2 mb-0">Loading stocktake reviews...</p>
    </td></tr>`;

    try {
        // Build query params from filters
        const branchId = document.getElementById('stReviewBranchFilter')?.value || '';
        const status = document.getElementById('stReviewStatusFilter')?.value || '';

        let params = new URLSearchParams();
        if (branchId) params.append('branchId', branchId);
        if (status) params.append('status', status);

        // Fetch pending first, then history for other statuses
        let sessions = [];

        if (!status || status === 'pending_review') {
            const pendingRes = await fetch(`${API_URL}/stocktake/pending${branchId ? '?branchId=' + branchId : ''}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (pendingRes.ok) {
                const pendingData = await pendingRes.json();
                if (pendingData.success) {
                    sessions = sessions.concat(pendingData.sessions || []);
                }
            }
        }

        if (status && status !== 'pending_review') {
            const histParams = new URLSearchParams();
            if (branchId) histParams.append('branchId', branchId);
            histParams.append('status', status);
            histParams.append('limit', '50');

            const histRes = await fetch(`${API_URL}/stocktake/history?${histParams}`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (histRes.ok) {
                const histData = await histRes.json();
                if (histData.success) {
                    sessions = sessions.concat(histData.sessions || []);
                }
            }
        }

        // If no status filter, also fetch recent approved/rejected
        if (!status) {
            const histRes = await fetch(`${API_URL}/stocktake/history?limit=20`, {
                headers: { 'Authorization': 'Bearer ' + getToken() }
            });
            if (histRes.ok) {
                const histData = await histRes.json();
                if (histData.success) {
                    const existing = new Set(sessions.map(s => s._id));
                    (histData.sessions || []).forEach(s => {
                        if (!existing.has(s._id)) sessions.push(s);
                    });
                }
            }
        }

        allStocktakeSessions = sessions;

        // Update pending badge
        const pendingCount = sessions.filter(s => s.status === 'pending_review').length;
        updatePendingBadge(pendingCount);

        // Update alert
        const alert = document.getElementById('stPendingAlert');
        const alertText = document.getElementById('stPendingAlertText');
        if (pendingCount > 0) {
            alert.style.display = 'block';
            alertText.textContent = `${pendingCount} stocktake${pendingCount > 1 ? 's' : ''} awaiting your review`;
        } else {
            alert.style.display = 'none';
        }

        // Render table
        renderStocktakeTable(sessions);

        // Load branches for filter (once), then update badges
        await loadStocktakeBranchFilter();
        updateBranchBadges(allStocktakeSessions);

    } catch (error) {
        console.error('Error loading stocktakes:', error);
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-danger">
            <i class="fas fa-exclamation-triangle"></i> Failed to load stocktake reviews
        </td></tr>`;
    }
}

function renderStocktakeTable(sessions) {
    const tbody = document.getElementById('stocktakeReviewsTable');

    if (!sessions.length) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center py-4 text-muted">
            <i class="fas fa-clipboard-check" style="font-size: 2rem; opacity: 0.3; display: block; margin-bottom: 8px;"></i>
            No stocktake sessions found
        </td></tr>`;
        return;
    }

    tbody.innerHTML = sessions.map(s => {
        const branch = s.branchId?.name || s.branchId?.branchCode || '-';
        const type = (s.stockTakeType || 'full').charAt(0).toUpperCase() + (s.stockTakeType || 'full').slice(1);
        const total = s.totalItems || 0;
        const completed = s.completedItems || 0;
        const variance = s.itemsWithVariance || 0;
        const review = s.itemsRequiringReview || 0;
        const submittedBy = s.submittedBy ? `${s.submittedBy.firstName || ''} ${s.submittedBy.lastName || ''}`.trim() : '-';
        const submittedAt = s.submittedAt ? new Date(s.submittedAt).toLocaleDateString('en-ZA') : '-';
        const statusBadge = getStatusBadge(s.status);

        const varianceDisplay = variance > 0
            ? `<span class="text-warning">${variance} items</span>` + (review > 0 ? ` <span class="badge bg-danger">${review} flagged</span>` : '')
            : '<span class="text-success">None</span>';

        const actions = s.status === 'pending_review'
            ? `<button class="btn btn-sm btn-green" onclick="openStocktakeDetail('${s._id}')"><i class="fas fa-eye me-1"></i>Review</button>`
            : `<button class="btn btn-sm btn-outline-secondary" onclick="openStocktakeDetail('${s._id}')"><i class="fas fa-eye me-1"></i>View</button>`;

        return `<tr>
            <td><strong>${s.sessionNumber || '-'}</strong></td>
            <td>${branch}</td>
            <td>${type}</td>
            <td>${total}</td>
            <td>${completed}/${total}</td>
            <td>${varianceDisplay}</td>
            <td>${submittedBy}</td>
            <td>${submittedAt}</td>
            <td>${statusBadge}</td>
            <td>${actions}</td>
        </tr>`;
    }).join('');
}

function getStatusBadge(status) {
    const map = {
        'scheduled': '<span class="badge" style="background: #6c757d;">Scheduled</span>',
        'in_progress': '<span class="badge" style="background: #0d6efd;">In Progress</span>',
        'pending_review': '<span class="badge" style="background: var(--gold, #C9A84C); color: #000;">Pending Review</span>',
        'approved': '<span class="badge" style="background: var(--green, #C9A84C);">Approved</span>',
        'rejected': '<span class="badge" style="background: #DC2626;">Rejected</span>'
    };
    return map[status] || `<span class="badge bg-secondary">${status}</span>`;
}

function updatePendingBadge(count) {
    const badge = document.getElementById('pendingStocktakeBadge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'inline-block';
    } else {
        badge.style.display = 'none';
    }
}

// ============================================================
// BRANCH FILTER
// ============================================================

let stBranchesLoaded = false;
let stBranchList = [];

async function loadStocktakeBranchFilter() {
    if (stBranchesLoaded) return;
    try {
        const response = await fetch(`${API_URL}/branches`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!response.ok) return;

        const data = await response.json();
        stBranchList = data.branches || data || [];

        // Build branch tabs
        const container = document.getElementById('stBranchTabs');
        if (container && stBranchList.length) {
            const label = document.querySelector('#stBranchTabs > span');
            const labelHtml = label ? label.outerHTML : '';
            container.innerHTML = labelHtml +
                `<button class="st-branch-tab active" onclick="selectStBranch('', this)">All<span class="tab-badge" id="stBadgeAll" style="display:none">0</span></button>` +
                stBranchList.map(b => {
                    const name = (b.name || b.branchCode || '').replace('Origin ', '');
                    return `<button class="st-branch-tab" data-branch-id="${b._id}" onclick="selectStBranch('${b._id}', this)">${name}<span class="tab-badge" id="stBadge-${b._id}" style="display:none">0</span></button>`;
                }).join('');
            stBranchesLoaded = true;
        }
    } catch (error) {
        console.error('Error loading branches for stocktake filter:', error);
    }
}

function selectStBranch(branchId, btn) {
    // Update hidden input
    const input = document.getElementById('stReviewBranchFilter');
    if (input) input.value = branchId;

    // Update tab active state
    const container = document.getElementById('stBranchTabs');
    if (container) {
        container.querySelectorAll('.st-branch-tab').forEach(b => b.classList.remove('active'));
    }
    if (btn) btn.classList.add('active');

    loadPendingStocktakes();
}

function updateBranchBadges(sessions) {
    // Count pending per branch
    const pending = {};
    let totalPending = 0;
    (sessions || []).forEach(s => {
        if (s.status === 'pending_review') {
            const bid = s.branchId?._id || s.branchId;
            pending[bid] = (pending[bid] || 0) + 1;
            totalPending++;
        }
    });

    // Update All badge
    const allBadge = document.getElementById('stBadgeAll');
    if (allBadge) {
        if (totalPending > 0) {
            allBadge.textContent = totalPending;
            allBadge.style.display = 'inline-block';
        } else {
            allBadge.style.display = 'none';
        }
    }

    // Update per-branch badges
    stBranchList.forEach(b => {
        const badge = document.getElementById('stBadge-' + b._id);
        if (badge) {
            const count = pending[b._id] || 0;
            if (count > 0) {
                badge.textContent = count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    });
}

// ============================================================
// STOCKTAKE DETAIL MODAL
// ============================================================

async function openStocktakeDetail(sessionId) {
    const modal = document.getElementById('stocktakeDetailModal');
    if (!modal) return;

    // Show modal
    modal.style.display = 'block';
    modal.classList.add('show');
    document.body.style.overflow = 'hidden';

    // Reset
    document.getElementById('stDetailSessionNum').textContent = 'Loading...';
    document.getElementById('stDetailSummary').innerHTML = '<div class="col-12 text-center"><div class="spinner-border text-success"></div></div>';
    document.getElementById('stDetailItemsTable').innerHTML = '';
    document.getElementById('stReviewNotes').value = '';

    try {
        const response = await fetch(`${API_URL}/stocktake/session/${sessionId}`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (!response.ok) throw new Error('Failed to load session');

        const data = await response.json();
        if (!data.success) throw new Error(data.message || 'Failed');

        currentStocktakeSession = data.session;
        allDetailItems = data.session.lineItems || [];

        renderStocktakeDetail(data.session);

    } catch (error) {
        console.error('Error loading stocktake detail:', error);
        document.getElementById('stDetailSessionNum').textContent = 'Error';
        document.getElementById('stDetailSummary').innerHTML = `<div class="col-12 text-center text-danger">
            <i class="fas fa-exclamation-triangle"></i> ${error.message}
        </div>`;
    }
}

function renderStocktakeDetail(session) {
    // Header
    document.getElementById('stDetailSessionNum').textContent =
        `${session.sessionNumber} — ${session.branchId?.name || 'Unknown Branch'}`;

    // Summary cards
    const total = session.totalItems || 0;
    const completed = session.completedItems || 0;
    const withVariance = session.itemsWithVariance || 0;
    const needsReview = session.itemsRequiringReview || 0;
    const completionPct = total > 0 ? Math.round((completed / total) * 100) : 0;

    document.getElementById('stDetailSummary').innerHTML = `
        <div class="col-3">
            <div class="card text-center p-3" style="border-left: 4px solid var(--green, #C9A84C);">
                <div style="font-size: 1.8rem; font-weight: 700; color: var(--green, #C9A84C);">${total}</div>
                <div class="text-muted" style="font-size: 0.8rem;">Total Items</div>
            </div>
        </div>
        <div class="col-3">
            <div class="card text-center p-3" style="border-left: 4px solid #0d6efd;">
                <div style="font-size: 1.8rem; font-weight: 700; color: #0d6efd;">${completionPct}%</div>
                <div class="text-muted" style="font-size: 0.8rem;">Completed (${completed}/${total})</div>
            </div>
        </div>
        <div class="col-3">
            <div class="card text-center p-3" style="border-left: 4px solid var(--gold, #C9A84C);">
                <div style="font-size: 1.8rem; font-weight: 700; color: var(--gold, #C9A84C);">${withVariance}</div>
                <div class="text-muted" style="font-size: 0.8rem;">With Variance</div>
            </div>
        </div>
        <div class="col-3">
            <div class="card text-center p-3" style="border-left: 4px solid #DC2626;">
                <div style="font-size: 1.8rem; font-weight: 700; color: #DC2626;">${needsReview}</div>
                <div class="text-muted" style="font-size: 0.8rem;">Needs Review</div>
            </div>
        </div>
    `;

    // Show/hide footer buttons based on status
    const footer = document.getElementById('stDetailFooter');
    if (session.status === 'pending_review') {
        footer.style.display = 'flex';
    } else {
        footer.style.display = 'none';
    }

    // Render line items
    renderDetailItems(allDetailItems);
}

function renderDetailItems(items) {
    const tbody = document.getElementById('stDetailItemsTable');

    if (!items.length) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center text-muted py-3">No items</td></tr>`;
        return;
    }

    // Sort: flagged items first, then by |variance| descending
    const sorted = [...items].sort((a, b) => {
        const aFlag = a.varianceAcceptable === false ? 0 : 1;
        const bFlag = b.varianceAcceptable === false ? 0 : 1;
        if (aFlag !== bFlag) return aFlag - bFlag;
        return Math.abs(b.variancePercent || 0) - Math.abs(a.variancePercent || 0);
    });

    tbody.innerHTML = sorted.map(item => {
        const variance = item.variance || 0;
        const variancePct = item.variancePercent || 0;
        const hasPhoto = !!(item.scalePhoto?.url || (item.unitPhotos && item.unitPhotos.length > 0));
        const unit = item.unit || 'units';

        // Color coding
        let varClass = 'text-success';
        let varIcon = '';
        if (variance !== 0) {
            if (item.varianceAcceptable === false) {
                varClass = 'text-danger fw-bold';
                varIcon = '<i class="fas fa-exclamation-circle me-1"></i>';
            } else {
                varClass = 'text-warning';
            }
        }

        // Validation status
        const statusMap = {
            'valid': '<span class="badge bg-success">Valid</span>',
            'invalid': '<span class="badge bg-danger">Invalid</span>',
            'requires_review': '<span class="badge bg-warning text-dark">Review</span>',
            'pending': '<span class="badge bg-secondary">Pending</span>'
        };
        const statusBadge = statusMap[item.validationStatus] || statusMap['pending'];

        // Photo indicator
        const photoIcon = hasPhoto
            ? '<i class="fas fa-camera text-success" title="Photo uploaded"></i>'
            : '<i class="fas fa-camera text-muted" title="No photo"></i>';

        return `<tr data-variance="${variance !== 0 ? 'yes' : 'no'}"
                    data-review="${item.varianceAcceptable === false || item.validationStatus === 'requires_review' ? 'yes' : 'no'}"
                    data-valid="${item.validationStatus === 'valid' ? 'yes' : 'no'}">
            <td>${item.productName || '-'}</td>
            <td><small class="text-muted">${item.sku || '-'}</small></td>
            <td>${item.category || '-'}</td>
            <td class="text-end">${formatQty(item.expectedQty, unit)}</td>
            <td class="text-end">${item.actualQty != null ? formatQty(item.actualQty, unit) : '<span class="text-muted">-</span>'}</td>
            <td class="text-end ${varClass}">${varIcon}${variance > 0 ? '+' : ''}${formatQty(variance, unit)}</td>
            <td class="text-end ${varClass}">${variancePct !== 0 ? (variancePct > 0 ? '+' : '') + variancePct.toFixed(1) + '%' : '0%'}</td>
            <td class="text-center">${photoIcon}</td>
            <td>${statusBadge}</td>
        </tr>`;
    }).join('');
}

function formatQty(qty, unit) {
    if (qty == null) return '-';
    if (unit === 'g') return qty.toLocaleString(undefined, { maximumFractionDigits: 1 }) + 'g';
    return qty.toLocaleString();
}

// ============================================================
// DETAIL ITEM FILTERS
// ============================================================

function filterStDetailItems(filter, btn) {
    // Update active button
    if (btn) {
        btn.closest('.d-flex').querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
    }

    const rows = document.querySelectorAll('#stDetailItemsTable tr');
    rows.forEach(row => {
        if (!row.dataset.variance) return; // skip non-data rows

        switch (filter) {
            case 'all':
                row.style.display = '';
                break;
            case 'variance':
                row.style.display = row.dataset.variance === 'yes' ? '' : 'none';
                break;
            case 'review':
                row.style.display = row.dataset.review === 'yes' ? '' : 'none';
                break;
            case 'valid':
                row.style.display = row.dataset.valid === 'yes' ? '' : 'none';
                break;
        }
    });
}

// ============================================================
// APPROVE / REJECT
// ============================================================

async function approveStocktake() {
    if (!currentStocktakeSession) return;

    const notes = document.getElementById('stReviewNotes')?.value || '';

    try {
        const response = await fetch(`${API_URL}/stocktake/session/${currentStocktakeSession._id}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': 'Bearer ' + getToken(),
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                action: 'approve',
                notes: notes,
                adjustInventory: true
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Stocktake Approved', `${currentStocktakeSession.sessionNumber} approved. Branch inventory updated.`, 'success');
            closeStocktakeDetail();
            loadPendingStocktakes();
        } else {
            showToast('Approval Failed', data.message || 'Could not approve stocktake', 'error');
        }
    } catch (error) {
        console.error('Error approving stocktake:', error);
        showToast('Error', 'Failed to approve stocktake', 'error');
    }
}

async function rejectStocktake() {
    if (!currentStocktakeSession) return;

    const notes = document.getElementById('stReviewNotes')?.value || '';

    if (!notes.trim()) {
        showToast('Notes Required', 'Please provide a reason for rejection', 'error');
        document.getElementById('stReviewNotes').focus();
        return;
    }

    _originShowConfirm('Reject this stocktake? The branch will need to recount.', async function() {
        try {
            const response = await fetch(`${API_URL}/stocktake/session/${currentStocktakeSession._id}/approve`, {
                method: 'POST',
                headers: {
                    'Authorization': 'Bearer ' + getToken(),
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: 'reject',
                    notes: notes
                })
            });

            const data = await response.json();

            if (data.success) {
                showToast('Stocktake Rejected', `${currentStocktakeSession.sessionNumber} sent back to branch for recount.`, 'info');
                closeStocktakeDetail();
                loadPendingStocktakes();
            } else {
                showToast('Rejection Failed', data.message || 'Could not reject stocktake', 'error');
            }
        } catch (error) {
            console.error('Error rejecting stocktake:', error);
            showToast('Error', 'Failed to reject stocktake', 'error');
        }
    }, { title: 'Reject Stocktake', confirmText: 'Reject', icon: 'fa-times-circle', type: 'danger' });
}

// ============================================================
// MODAL CONTROLS
// ============================================================

function closeStocktakeDetail() {
    const modal = document.getElementById('stocktakeDetailModal');
    if (modal) {
        modal.style.display = 'none';
        modal.classList.remove('show');
    }
    document.body.style.overflow = '';
    currentStocktakeSession = null;
    allDetailItems = [];
}

// Close modal on backdrop click
document.addEventListener('click', function(e) {
    const modal = document.getElementById('stocktakeDetailModal');
    if (modal && e.target === modal) {
        closeStocktakeDetail();
    }
});

// Close modal on Escape
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape') {
        closeStocktakeDetail();
    }
});

// ============================================================
// AUTO-LOAD PENDING COUNT ON DASHBOARD INIT
// ============================================================

async function loadStocktakePendingCount() {
    try {
        const response = await fetch(`${API_URL}/stocktake/pending`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!response.ok) return;
        const data = await response.json();
        if (data.success) {
            updatePendingBadge((data.sessions || []).length);
        }
    } catch (e) {
        // Silently fail — badge just stays hidden
    }
}

// Load pending count when dashboard loads (for badge visibility before navigating to section)
document.addEventListener('DOMContentLoaded', function() {
    // Small delay so auth completes first
    setTimeout(loadStocktakePendingCount, 2000);
});
