// owner-stock.js — Stock operations overview for owner dashboard
// Depends on: config.js (API_URL), owner-auth.js (token), dbc-utils.js (showToast)

async function loadStockOverview() {
    const container = document.getElementById('stockOverviewContent');
    if (!container) return;

    try {
        // Fetch stock data in parallel
        const [pendingRes, historyRes, transfersRes] = await Promise.all([
            fetch(`${API_URL}/stocktake/pending`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/stocktake/history?limit=5`, {
                headers: { 'Authorization': `Bearer ${token}` }
            }),
            fetch(`${API_URL}/stock-transfers?status=in_transit`, {
                headers: { 'Authorization': `Bearer ${token}` }
            })
        ]);

        let pendingSessions = [];
        let recentHistory = [];
        let activeTransfers = [];

        if (pendingRes.ok) {
            const data = await pendingRes.json();
            pendingSessions = data.sessions || [];
        }

        if (historyRes.ok) {
            const data = await historyRes.json();
            recentHistory = data.sessions || [];
        }

        if (transfersRes.ok) {
            const data = await transfersRes.json();
            activeTransfers = data.transfers || data.data || [];
        }

        // Update count badges
        const pendingBadge = document.getElementById('stockPendingCount');
        if (pendingBadge) pendingBadge.textContent = pendingSessions.length;

        const transferBadge = document.getElementById('stockTransferCount');
        if (transferBadge) transferBadge.textContent = activeTransfers.length;

        // Render the stock overview
        renderStockOverview(container, pendingSessions, recentHistory, activeTransfers);

    } catch (error) {
        console.error('Error loading stock overview:', error);
        container.innerHTML = `
            <div style="text-align: center; padding: 1.5rem; color: var(--gray-500);">
                <i class="fas fa-exclamation-triangle" style="font-size: 1.5rem; margin-bottom: 0.5rem; color: var(--gold);"></i>
                <p>Could not load stock data</p>
                <button onclick="loadStockOverview()" style="margin-top: 0.5rem; padding: 0.4rem 1rem; background: var(--gold); border: none; border-radius: 6px; cursor: pointer; font-size: 0.85rem;">Retry</button>
            </div>
        `;
    }
}

function renderStockOverview(container, pending, history, transfers) {
    let html = '<div class="stock-overview-grid">';

    // === Pending Approvals Card ===
    html += `
        <div class="stock-card">
            <div class="stock-card-header">
                <span><i class="fas fa-clipboard-check" style="color: var(--gold);"></i> Pending Approval</span>
                <span class="stock-badge ${pending.length > 0 ? 'badge-warning' : 'badge-ok'}">${pending.length}</span>
            </div>
            <div class="stock-card-body">
    `;

    if (pending.length === 0) {
        html += `<div style="text-align: center; padding: 1rem; color: var(--gray-500); font-size: 0.85rem;"><i class="fas fa-check-circle" style="color: #22C55E;"></i> All stock takes reviewed</div>`;
    } else {
        pending.slice(0, 3).forEach(session => {
            const branchName = session.branchId?.name || 'Unknown Branch';
            const itemCount = session.lineItems?.length || session.totalItems || 0;
            const varianceCount = session.lineItems?.filter(li => li.actualQty !== li.expectedQty).length || session.varianceItems || 0;
            const timeAgo = typeof formatTimeAgo === 'function' ? formatTimeAgo(session.submittedAt || session.startedAt) : '';

            html += `
                <div class="stock-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 0.85rem; color: var(--green-dark);">${branchName}</strong>
                        <span style="font-size: 0.7rem; color: var(--gray-500);">${timeAgo}</span>
                    </div>
                    <div style="display: flex; gap: 0.75rem; font-size: 0.8rem; color: var(--gray-700); margin-top: 0.25rem;">
                        <span><i class="fas fa-box"></i> ${itemCount} items</span>
                        <span style="color: ${varianceCount > 0 ? 'var(--gold-dark)' : '#22C55E'};">
                            <i class="fas fa-${varianceCount > 0 ? 'exclamation-triangle' : 'check'}"></i> ${varianceCount} variance${varianceCount !== 1 ? 's' : ''}
                        </span>
                    </div>
                </div>
            `;
        });

        if (pending.length > 3) {
            html += `<div style="text-align: center; font-size: 0.8rem; color: var(--gold); padding: 0.5rem; cursor: pointer;" onclick="showPendingStockTakes()">+ ${pending.length - 3} more pending</div>`;
        }
    }

    html += '</div></div>';

    // === Active Transfers Card ===
    html += `
        <div class="stock-card">
            <div class="stock-card-header">
                <span><i class="fas fa-truck" style="color: #6366F1;"></i> Active Transfers</span>
                <span class="stock-badge ${transfers.length > 0 ? 'badge-info' : 'badge-ok'}">${transfers.length}</span>
            </div>
            <div class="stock-card-body">
    `;

    if (transfers.length === 0) {
        html += `<div style="text-align: center; padding: 1rem; color: var(--gray-500); font-size: 0.85rem;"><i class="fas fa-check-circle" style="color: #22C55E;"></i> No active transfers</div>`;
    } else {
        transfers.slice(0, 3).forEach(transfer => {
            const from = transfer.fromBranch?.name || transfer.sourceBranch?.name || 'HQ';
            const to = transfer.toBranch?.name || transfer.destinationBranch?.name || 'Unknown';
            const itemCount = transfer.items?.length || 0;
            const status = transfer.status || 'in_transit';

            html += `
                <div class="stock-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <strong style="font-size: 0.85rem; color: var(--green-dark);">${transfer.transferNumber || ''}</strong>
                        <span class="stock-status-badge status-${status}">${status.replace(/_/g, ' ')}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--gray-700); margin-top: 0.25rem;">
                        <i class="fas fa-arrow-right" style="font-size: 0.65rem; color: var(--gray-500);"></i>
                        ${from} <i class="fas fa-long-arrow-alt-right" style="color: var(--gray-500);"></i> ${to}
                        <span style="margin-left: 0.5rem; color: var(--gray-500);">(${itemCount} item${itemCount !== 1 ? 's' : ''})</span>
                    </div>
                </div>
            `;
        });
    }

    html += '</div></div>';

    // === Recent Activity Card ===
    html += `
        <div class="stock-card" style="grid-column: 1 / -1;">
            <div class="stock-card-header">
                <span><i class="fas fa-history" style="color: var(--green);"></i> Recent Stock Takes</span>
                <button onclick="navigateWithAuth('admin.html', 'inventory')" style="background: none; border: 1px solid var(--gray-200); padding: 0.3rem 0.75rem; border-radius: 6px; font-size: 0.75rem; cursor: pointer; color: var(--gray-700);">
                    <i class="fas fa-external-link-alt"></i> Full History
                </button>
            </div>
            <div class="stock-card-body">
    `;

    if (history.length === 0) {
        html += `<div style="text-align: center; padding: 1rem; color: var(--gray-500); font-size: 0.85rem;">No stock take history yet</div>`;
    } else {
        html += '<div style="display: grid; gap: 0.5rem;">';
        history.forEach(session => {
            const branchName = session.branchId?.name || 'Unknown';
            const status = session.status || 'unknown';
            const date = session.createdAt ? new Date(session.createdAt).toLocaleDateString('en-ZA') : '';
            const submitter = session.submittedBy ? `${session.submittedBy.firstName || ''} ${session.submittedBy.lastName || ''}`.trim() : '';

            const statusColors = {
                approved: '#22C55E',
                rejected: 'var(--red)',
                pending_review: 'var(--gold)',
                in_progress: '#6366F1',
                scheduled: 'var(--gray-500)'
            };
            const statusColor = statusColors[status] || 'var(--gray-500)';

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-100);">
                    <div>
                        <span style="font-weight: 600; font-size: 0.85rem; color: var(--green-dark);">${branchName}</span>
                        <span style="font-size: 0.75rem; color: var(--gray-500); margin-left: 0.5rem;">${session.sessionNumber || ''}</span>
                        ${submitter ? `<span style="font-size: 0.75rem; color: var(--gray-500); margin-left: 0.5rem;">by ${submitter}</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 0.75rem; color: var(--gray-500);">${date}</span>
                        <span style="font-size: 0.7rem; font-weight: 700; color: ${statusColor}; text-transform: uppercase; letter-spacing: 0.05em;">${status.replace(/_/g, ' ')}</span>
                    </div>
                </div>
            `;
        });
        html += '</div>';
    }

    html += '</div></div>';
    html += '</div>';

    container.innerHTML = html;
}

// Quick action to start a stock take
function startStockTakeForBranch(branchId) {
    sessionStorage.setItem('selectedBranch', branchId);
    sessionStorage.setItem('adminToken', token);
    window.location.href = 'stocktake-app.html';
}
