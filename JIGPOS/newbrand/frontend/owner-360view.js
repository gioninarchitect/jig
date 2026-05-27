// owner-360view.js — 360 View Command Centre for Owner Dashboard
// Depends on: owner-auth.js (token), config.js (API_URL), or-utils.js (showToast)
// Features: Risk Heatmap, Staff Scoreboard, Cross-Domain Alerts, Transfer Approvals

// ===== STATE =====
let riskNetworkData = null;
let crossDomainAlerts = [];
let staffLeaderboard = [];
let pendingTransfers = [];
let active360Tab = 'risk';
let staffBranchFilter = '';

// ===== RISK COLORS =====
function riskBg(score) {
    if (score >= 70) return '#DC2626';
    if (score >= 50) return 'rgba(220,38,38,0.6)';
    if (score >= 30) return '#F0A500';
    if (score >= 15) return 'rgba(240,165,0,0.5)';
    return 'rgba(63,192,65,0.4)';
}

function riskLabel(score) {
    if (score >= 70) return 'Critical';
    if (score >= 50) return 'High';
    if (score >= 30) return 'Amber';
    if (score >= 15) return 'Watch';
    return 'Low';
}

// ===== LOAD 360 DATA =====
async function load360Data() {
    await Promise.all([
        loadRiskNetwork(),
        loadCrossDomainAlerts(),
        loadPendingTransfers()
    ]);
    render360View();
}

async function loadRiskNetwork() {
    try {
        const res = await fetch(`${API_URL}/risk/network`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
                riskNetworkData = data.data;
            }
        }
    } catch (e) {
        console.log('Risk network not available:', e.message);
    }
}

async function loadCrossDomainAlerts() {
    try {
        const res = await fetch(`${API_URL}/risk/cross-domain`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
                crossDomainAlerts = data.data;
            }
        }
    } catch (e) {
        console.log('Cross-domain alerts not available:', e.message);
    }
}

async function loadStaffLeaderboard(branchId) {
    if (!branchId) return;
    try {
        const res = await fetch(`${API_URL}/risk/staff/leaderboard/${branchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            if (data.success && data.data) {
                staffLeaderboard = data.data;
            }
        }
    } catch (e) {
        console.log('Staff leaderboard not available:', e.message);
    }
}

async function loadPendingTransfers() {
    try {
        const res = await fetch(`${API_URL}/stock-transfers?status=pending&limit=20`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            pendingTransfers = data.transfers || [];
            const el = document.getElementById('pendingTransferCount');
            if (el) el.textContent = pendingTransfers.length;
        }
    } catch (e) {
        console.log('Transfers not available:', e.message);
    }
}

// ===== RENDER 360 VIEW =====
function render360View() {
    const container = document.getElementById('view360Content');
    if (!container) return;

    if (active360Tab === 'risk') renderRiskHeatmap(container);
    else if (active360Tab === 'staff') renderStaffBoard(container);
    else if (active360Tab === 'alerts') renderAlerts(container);
    else if (active360Tab === 'transfers') renderTransfers(container);

    // Update tab active states
    document.querySelectorAll('.view360-tab').forEach(tab => {
        tab.classList.toggle('active', tab.dataset.tab === active360Tab);
    });

    // Update alert badge
    const alertBadge = document.getElementById('alertsBadge360');
    if (alertBadge) {
        alertBadge.textContent = crossDomainAlerts.length;
        alertBadge.style.display = crossDomainAlerts.length > 0 ? 'inline-block' : 'none';
    }

    // Update transfer badge
    const trBadge = document.getElementById('transfersBadge360');
    if (trBadge) {
        trBadge.textContent = pendingTransfers.length;
        trBadge.style.display = pendingTransfers.length > 0 ? 'inline-block' : 'none';
    }
}

function switch360Tab(tab) {
    active360Tab = tab;
    render360View();
}

// ===== RISK HEATMAP =====
function renderRiskHeatmap(container) {
    const branches = riskNetworkData?.branches || [];

    if (!riskNetworkData) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--or-grey-2);"><i class="fas fa-chart-area" style="font-size:2rem;opacity:0.4;margin-bottom:0.75rem;"></i><p>Risk scoring is loading or not yet configured.</p><p style="font-size:0.8rem;margin-top:0.5rem;">Risk scores calculate from POS activity, approvals, and compliance data.</p></div>';
        return;
    }

    if (branches.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--or-grey-2);">No risk data available yet. Scores populate as branches generate POS activity.</div>';
        return;
    }

    const domains = ['regulatory', 'financial', 'inventory', 'staff', 'operational', 'customer'];
    const networkAvg = riskNetworkData.networkAverage;

    let html = '';

    // Network average badge
    if (networkAvg != null) {
        html += `<div style="display:flex;align-items:center;gap:0.75rem;margin-bottom:1rem;">
            <span style="font-size:0.75rem;color:var(--or-grey-2);font-weight:700;text-transform:uppercase;">Network Risk</span>
            <span style="background:${riskBg(networkAvg)};color:white;padding:0.4rem 1rem;border-radius:8px;font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;font-weight:700;">${networkAvg}</span>
            <span style="font-size:0.7rem;color:var(--or-grey-2);">/ 100 (${riskLabel(networkAvg)})</span>
        </div>`;
    }

    // Heatmap table
    html += '<div style="overflow-x:auto;"><table style="width:100%;font-size:0.8rem;border-collapse:collapse;">';
    html += '<thead><tr>';
    html += '<th style="text-align:left;padding:0.5rem;color:var(--or-gold);font-weight:700;text-transform:uppercase;font-size:0.7rem;">Branch</th>';
    html += '<th style="text-align:center;padding:0.5rem;color:var(--or-gold);font-weight:700;text-transform:uppercase;font-size:0.7rem;">Overall</th>';
    domains.forEach(d => {
        html += `<th style="text-align:center;padding:0.5rem;color:var(--or-gold);font-weight:700;text-transform:uppercase;font-size:0.65rem;">${d.slice(0, 5)}</th>`;
    });
    html += '</tr></thead><tbody>';

    branches.forEach(br => {
        html += `<tr style="border-top:1px solid var(--gray-200);">`;
        html += `<td style="padding:0.5rem;font-weight:600;color:var(--text-primary);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${br.name || br.branchCode || 'Unknown'}</td>`;
        html += `<td style="padding:0.3rem;text-align:center;"><span style="display:inline-block;width:40px;padding:0.25rem;border-radius:4px;font-family:'Barlow Condensed',sans-serif;font-size:0.9rem;font-weight:700;background:${riskBg(br.overall)};color:white;">${br.overall}</span></td>`;
        domains.forEach(d => {
            const val = br[d] || 0;
            html += `<td style="padding:0.3rem;text-align:center;"><span style="display:inline-block;width:32px;padding:0.15rem;border-radius:4px;font-size:0.7rem;font-weight:700;background:${riskBg(val)};color:white;">${val}</span></td>`;
        });
        html += '</tr>';
    });

    html += '</tbody></table></div>';

    // Legend
    html += `<div style="display:flex;flex-wrap:wrap;gap:0.75rem;margin-top:0.75rem;font-size:0.7rem;color:var(--or-grey-2);">
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(63,192,65,0.4);vertical-align:middle;margin-right:3px;"></span>Low (0-15)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(240,165,0,0.5);vertical-align:middle;margin-right:3px;"></span>Watch (15-30)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#F0A500;vertical-align:middle;margin-right:3px;"></span>Amber (30-50)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:rgba(220,38,38,0.6);vertical-align:middle;margin-right:3px;"></span>High (50-70)</span>
        <span><span style="display:inline-block;width:10px;height:10px;border-radius:2px;background:#DC2626;vertical-align:middle;margin-right:3px;"></span>Critical (70+)</span>
    </div>`;

    if (riskNetworkData.calculatedAt) {
        html += `<div style="font-size:0.7rem;color:var(--or-grey-3);margin-top:0.5rem;">Last calculated: ${new Date(riskNetworkData.calculatedAt).toLocaleTimeString('en-ZA')}</div>`;
    }

    container.innerHTML = html;
}

// ===== STAFF SCOREBOARD =====
async function renderStaffBoard(container) {
    // Use branches from risk network data or the global branch map
    let activeBranches = [];
    if (riskNetworkData?.branches?.length) {
        activeBranches = riskNetworkData.branches.map(b => ({ _id: b.branchId || b._id, name: b.name || b.branchCode }));
    } else if (window._ownerBranchMap) {
        activeBranches = Object.entries(window._ownerBranchMap).map(([id, name]) => ({ _id: id, name }));
    }

    if (!staffBranchFilter && activeBranches.length > 0) {
        staffBranchFilter = activeBranches[0]._id;
    }

    // Load leaderboard for selected branch
    if (staffBranchFilter && staffLeaderboard.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;"><i class="fas fa-spinner fa-spin" style="color:var(--or-gold);"></i> Loading staff scores...</div>';
        await loadStaffLeaderboard(staffBranchFilter);
    }

    let html = '';

    // Branch selector dropdown
    html += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1rem;">
        <span style="font-size:0.8rem;color:var(--or-grey-2);">Select branch to view staff performance</span>
        <select onchange="staffBranchFilter=this.value;staffLeaderboard=[];render360View();" style="padding:0.4rem 0.75rem;border:1px solid var(--border-dark);border-radius:8px;font-size:0.8rem;background:var(--surface-elevated);color:var(--text-primary);cursor:pointer;">
            ${activeBranches.map(b => `<option value="${b._id}" ${b._id === staffBranchFilter ? 'selected' : ''}>${b.name}</option>`).join('')}
        </select>
    </div>`;

    if (staffLeaderboard.length === 0) {
        html += '<div style="text-align:center;padding:2rem;color:var(--or-grey-2);"><p>No staff scores available yet.</p><p style="font-size:0.8rem;margin-top:0.25rem;">Scores populate as staff complete till sessions.</p></div>';
        container.innerHTML = html;
        return;
    }

    const tiers = {
        'Exceptional': { color: '#22C55E', bg: 'rgba(34,197,94,0.15)' },
        'Good': { color: 'var(--or-gold)', bg: 'rgba(63,192,65,0.1)' },
        'Satisfactory': { color: '#F0A500', bg: 'rgba(240,165,0,0.1)' },
        'Needs Improvement': { color: '#DC2626', bg: 'rgba(220,38,38,0.1)' }
    };

    // Tier summary
    html += '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.5rem;margin-bottom:1rem;">';
    Object.entries(tiers).forEach(([tier, cfg]) => {
        const count = staffLeaderboard.filter(s => s.tier === tier).length;
        html += `<div style="text-align:center;padding:0.5rem;border-radius:8px;background:var(--surface-elevated);border:1px solid var(--border-dark);">
            <div style="font-size:0.65rem;color:var(--or-grey-2);">${tier}</div>
            <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.25rem;color:var(--text-primary);">${count}</div>
        </div>`;
    });
    html += '</div>';

    // Leaderboard
    staffLeaderboard.forEach((entry, rank) => {
        const tierCfg = tiers[entry.tier] || tiers['Satisfactory'];
        const name = entry.firstName
            ? `${entry.firstName} ${entry.lastName || ''}`.trim()
            : `Staff #${(entry._id || '').slice(-6)}`;
        const scoreColor = entry.score >= 90 ? '#22C55E' : entry.score >= 75 ? 'var(--text-primary)' : entry.score >= 60 ? '#F0A500' : '#DC2626';
        const barColor = entry.score >= 90 ? '#22C55E' : entry.score >= 75 ? 'rgba(63,192,65,0.7)' : entry.score >= 60 ? '#F0A500' : '#DC2626';
        const rankBg = rank === 0 ? '#F0A500' : rank === 1 ? '#9CA3AF' : rank === 2 ? '#B45309' : 'var(--surface-elevated)';
        const rankColor = rank < 3 ? 'white' : 'var(--or-grey-2)';

        html += `<div style="border:1px solid var(--gray-200);border-radius:8px;margin-bottom:0.5rem;overflow:hidden;">
            <div style="padding:0.75rem;display:flex;align-items:center;justify-content:space-between;">
                <div style="display:flex;align-items:center;gap:0.75rem;">
                    <div style="width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;background:${rankBg};color:${rankColor};">${entry.rank || rank + 1}</div>
                    <div>
                        <div style="font-size:0.9rem;font-weight:600;color:var(--text-primary);">${name}</div>
                        <div style="display:flex;align-items:center;gap:0.5rem;margin-top:0.15rem;">
                            <span style="padding:0.1rem 0.5rem;border-radius:4px;font-size:0.65rem;font-weight:700;background:${tierCfg.bg};color:${tierCfg.color};">${entry.tier}</span>
                            <span style="font-size:0.65rem;color:var(--or-grey-2);">${entry.role || ''}</span>
                        </div>
                    </div>
                </div>
                <div style="text-align:right;">
                    <div style="font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;color:${scoreColor};">${entry.score}</div>
                    <div style="font-size:0.6rem;color:var(--or-grey-2);">/ 100</div>
                </div>
            </div>
            <div style="height:4px;background:var(--gray-100);"><div style="height:100%;width:${entry.score}%;background:${barColor};border-radius:0 2px 2px 0;transition:width 0.5s;"></div></div>
        </div>`;
    });

    container.innerHTML = html;
}

// ===== CROSS-DOMAIN ALERTS =====
function renderAlerts(container) {
    if (crossDomainAlerts.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--or-grey-2);"><i class="fas fa-check-circle" style="font-size:2rem;color:#22C55E;margin-bottom:0.75rem;"></i><p>No cross-domain alerts detected.</p><p style="font-size:0.8rem;margin-top:0.25rem;">The system monitors for patterns like theft indicators, expiry risks, and demand mismatches.</p></div>';
        return;
    }

    const severityIcon = {
        critical: { icon: 'fa-exclamation-circle', color: '#DC2626', bg: 'rgba(220,38,38,0.1)', border: '#DC2626' },
        high: { icon: 'fa-exclamation-triangle', color: '#F0A500', bg: 'rgba(240,165,0,0.1)', border: '#F0A500' },
        medium: { icon: 'fa-info-circle', color: '#6366F1', bg: 'rgba(99,102,241,0.1)', border: '#6366F1' },
        low: { icon: 'fa-flag', color: 'var(--or-grey-2)', bg: 'rgba(156,163,175,0.1)', border: '#9CA3AF' }
    };

    let html = '';
    crossDomainAlerts.forEach(alert => {
        const cfg = severityIcon[alert.severity] || severityIcon.medium;
        html += `<div style="background:${cfg.bg};border-left:4px solid ${cfg.border};border-radius:8px;padding:1rem;margin-bottom:0.75rem;">
            <div style="display:flex;align-items:flex-start;gap:0.75rem;">
                <i class="fas ${cfg.icon}" style="color:${cfg.color};font-size:1.1rem;margin-top:0.1rem;"></i>
                <div style="flex:1;">
                    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:0.25rem;">
                        <strong style="color:var(--text-primary);font-size:0.9rem;">${alert.type?.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Alert'}</strong>
                        <span style="font-size:0.65rem;font-weight:700;text-transform:uppercase;color:${cfg.color};padding:0.15rem 0.5rem;border-radius:4px;background:${cfg.bg};">${alert.severity}</span>
                    </div>
                    <p style="color:var(--or-grey-2);font-size:0.85rem;margin:0 0 0.25rem;">${alert.message || alert.description || ''}</p>
                    ${alert.branch ? `<span style="font-size:0.75rem;color:var(--or-gold);"><i class="fas fa-store"></i> ${alert.branch}</span>` : ''}
                    ${alert.createdAt ? `<span style="font-size:0.7rem;color:var(--or-grey-3);margin-left:0.75rem;">${formatTimeAgo(alert.createdAt)}</span>` : ''}
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// ===== TRANSFER APPROVALS =====
function renderTransfers(container) {
    if (pendingTransfers.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:2rem;color:var(--or-grey-2);"><i class="fas fa-check-circle" style="font-size:2rem;color:#22C55E;margin-bottom:0.75rem;"></i><p>No pending stock transfers.</p></div>';
        return;
    }

    let html = '';
    pendingTransfers.forEach(t => {
        const totalItems = (t.items || []).reduce((sum, i) => sum + (i.quantity || 0), 0);
        const totalValue = (t.items || []).reduce((sum, i) => sum + ((i.unitCost || 0) * (i.quantity || 0)), 0);
        const from = t.fromBranch?.name || 'HQ';
        const to = t.toBranch?.name || 'Branch';

        html += `<div style="background:var(--gray-50);border-radius:12px;padding:1rem;margin-bottom:0.75rem;border:1px solid var(--gray-200);">
            <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:0.5rem;">
                <div>
                    <strong style="color:var(--or-gold);">${t.transferNumber || 'TRF-' + (t._id || '').slice(-6)}</strong>
                    <p style="color:var(--or-grey-2);font-size:0.85rem;margin:0.25rem 0;">${from} <i class="fas fa-arrow-right" style="font-size:0.7rem;margin:0 0.25rem;"></i> ${to}</p>
                </div>
                <div style="text-align:right;">
                    ${totalValue > 0 ? `<span style="background:var(--or-gold);color:white;padding:0.25rem 0.75rem;border-radius:20px;font-size:0.75rem;font-weight:700;">R${totalValue.toFixed(2)}</span>` : ''}
                    <div style="font-size:0.75rem;color:var(--or-grey-2);margin-top:0.25rem;">${totalItems} items</div>
                </div>
            </div>
            ${t.priority === 'urgent' || t.priority === 'high' ? `<div style="font-size:0.75rem;color:#DC2626;margin-bottom:0.5rem;"><i class="fas fa-bolt"></i> ${t.priority.toUpperCase()} priority</div>` : ''}
            <p style="font-size:0.8rem;color:var(--or-grey-3);margin-bottom:0.75rem;">${formatTimeAgo(t.createdAt)}</p>
            <div style="display:flex;gap:0.5rem;">
                <button onclick="approveTransfer('${t._id}')" style="flex:1;padding:0.5rem;background:#22C55E;color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.85rem;"><i class="fas fa-check"></i> Approve</button>
                <button onclick="rejectTransfer('${t._id}')" style="flex:1;padding:0.5rem;background:var(--red);color:white;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:0.85rem;"><i class="fas fa-times"></i> Reject</button>
            </div>
        </div>`;
    });

    container.innerHTML = html;
}

// ===== TRANSFER ACTIONS =====
async function approveTransfer(transferId) {
    showConfirmModal('Approve Transfer', 'Approve this stock transfer for dispatch?', async () => {
        try {
            const res = await fetch(`${API_URL}/stock-transfers/${transferId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Transfer approved', 'success');
                await loadPendingTransfers();
                render360View();
            } else {
                throw new Error('Failed to approve');
            }
        } catch (e) {
            showToast('Failed to approve transfer', 'error');
        }
    }, { confirmText: 'Approve', confirmColor: '#22C55E' });
}

async function rejectTransfer(transferId) {
    showConfirmModal('Reject Transfer', 'This will cancel the transfer request.', async (reason) => {
        try {
            const res = await fetch(`${API_URL}/stock-transfers/${transferId}/reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                showToast('Transfer rejected', 'info');
                await loadPendingTransfers();
                render360View();
            } else {
                throw new Error('Failed to reject');
            }
        } catch (e) {
            showToast('Failed to reject transfer', 'error');
        }
    }, { inputLabel: 'Rejection Reason', inputPlaceholder: 'Why reject this transfer?', confirmText: 'Reject', confirmColor: 'var(--red)' });
}

// ===== AUTO-REFRESH =====
let refresh360Interval = null;

function start360Polling() {
    if (refresh360Interval) clearInterval(refresh360Interval);
    refresh360Interval = setInterval(load360Data, 60000); // 60s
}

function stop360Polling() {
    if (refresh360Interval) clearInterval(refresh360Interval);
}
