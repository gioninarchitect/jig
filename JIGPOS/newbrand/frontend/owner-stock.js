// owner-stock.js — Stock operations overview for owner dashboard
// Depends on: config.js (API_URL), owner-auth.js (token), or-utils.js (showToast)

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
            <div style="text-align: center; padding: 1.5rem; color: var(--or-grey-2);">
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
        html += `<div style="text-align: center; padding: 1rem; color: var(--or-grey-2); font-size: 0.85rem;"><i class="fas fa-check-circle" style="color: #22C55E;"></i> All stock takes reviewed</div>`;
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
                        <span style="font-size: 0.7rem; color: var(--or-grey-2);">${timeAgo}</span>
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
        html += `<div style="text-align: center; padding: 1rem; color: var(--or-grey-2); font-size: 0.85rem;"><i class="fas fa-check-circle" style="color: #22C55E;"></i> No active transfers</div>`;
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
                        <i class="fas fa-arrow-right" style="font-size: 0.65rem; color: var(--or-grey-2);"></i>
                        ${from} <i class="fas fa-long-arrow-alt-right" style="color: var(--or-grey-2);"></i> ${to}
                        <span style="margin-left: 0.5rem; color: var(--or-grey-2);">(${itemCount} item${itemCount !== 1 ? 's' : ''})</span>
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
        html += `<div style="text-align: center; padding: 1rem; color: var(--or-grey-2); font-size: 0.85rem;">No stock take history yet</div>`;
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
                scheduled: 'var(--or-grey-2)'
            };
            const statusColor = statusColors[status] || 'var(--or-grey-2)';

            html += `
                <div style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-100);">
                    <div>
                        <span style="font-weight: 600; font-size: 0.85rem; color: var(--green-dark);">${branchName}</span>
                        <span style="font-size: 0.75rem; color: var(--or-grey-2); margin-left: 0.5rem;">${session.sessionNumber || ''}</span>
                        ${submitter ? `<span style="font-size: 0.75rem; color: var(--or-grey-2); margin-left: 0.5rem;">by ${submitter}</span>` : ''}
                    </div>
                    <div style="display: flex; align-items: center; gap: 0.75rem;">
                        <span style="font-size: 0.75rem; color: var(--or-grey-2);">${date}</span>
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

// ============================================
// STOCKTAKE COMPLIANCE OVERVIEW
// ============================================

async function loadStocktakeCompliance() {
    const container = document.getElementById('stocktakeComplianceContent');
    if (!container) return;

    try {
        const response = await fetch(`${API_URL}/stocktake/compliance/all-branches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (!data.success || !data.branches) {
            container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Could not load compliance data</p>';
            return;
        }

        const branches = data.branches;

        container.innerHTML = `
            <div style="display:grid;gap:8px;">
                ${branches.map(b => {
                    const dailyColor = b.dailyCompleted ? '#22c55e' : '#ef4444';
                    const dailyIcon = b.dailyCompleted ? 'check-circle' : 'times-circle';
                    const weeklyColor = b.weeklyCompleted ? '#22c55e' : (new Date().getDay() >= 3 ? '#f59e0b' : '#666');
                    const monthlyColor = b.monthlyCompleted ? '#22c55e' : (new Date().getDate() >= 15 ? '#f59e0b' : '#666');
                    const daysText = b.daysSinceLastHighValueCount === null ? 'Never' :
                        b.daysSinceLastHighValueCount === 0 ? 'Today' :
                        b.daysSinceLastHighValueCount + 'd ago';
                    const daysColor = b.daysSinceLastHighValueCount === 0 ? '#22c55e' :
                        b.daysSinceLastHighValueCount <= 1 ? '#f59e0b' : '#ef4444';

                    return `
                    <div style="display:flex;align-items:center;justify-content:space-between;padding:12px;background:rgba(255,255,255,0.03);border-radius:10px;border:1px solid rgba(255,255,255,0.06);">
                        <div>
                            <div style="font-weight:600;font-size:0.9rem;">${b.branchName}</div>
                            <div style="font-size:0.75rem;color:#888;margin-top:2px;">Last HV count: <span style="color:${daysColor}">${daysText}</span></div>
                        </div>
                        <div style="display:flex;gap:10px;align-items:center;">
                            <div style="text-align:center;" title="Daily high-value">
                                <i class="fas fa-${dailyIcon}" style="color:${dailyColor};font-size:1.1rem;"></i>
                                <div style="font-size:0.6rem;color:#888;margin-top:2px;">Daily</div>
                            </div>
                            <div style="text-align:center;" title="Weekly medium">
                                <i class="fas fa-${b.weeklyCompleted ? 'check-circle' : 'circle'}" style="color:${weeklyColor};font-size:1.1rem;"></i>
                                <div style="font-size:0.6rem;color:#888;margin-top:2px;">Weekly</div>
                            </div>
                            <div style="text-align:center;" title="Monthly full">
                                <i class="fas fa-${b.monthlyCompleted ? 'check-circle' : 'circle'}" style="color:${monthlyColor};font-size:1.1rem;"></i>
                                <div style="font-size:0.6rem;color:#888;margin-top:2px;">Monthly</div>
                            </div>
                        </div>
                    </div>`;
                }).join('')}
            </div>
        `;
    } catch (error) {
        console.error('Compliance load error:', error);
        if (container) container.innerHTML = '<p style="color:#999;text-align:center;padding:20px;">Error loading compliance</p>';
    }
}
