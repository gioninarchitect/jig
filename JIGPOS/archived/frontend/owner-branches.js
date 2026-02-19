// owner-branches.js — Branch management for owner dashboard
// Depends on: owner-auth.js (token), config.js (API_URL), dbc-utils.js (showToast)

// Global branch map for live feed name resolution
window._ownerBranchMap = {};

// Load branches with live stats from owner-stats endpoint
async function loadBranches() {
    loadOwnerBranchStats();
}

async function loadOwnerBranchStats() {
    const grid = document.getElementById('branchesGrid');

    try {
        const authToken = getToken() || token;
        console.log('[BRANCH-DEBUG] authToken exists:', !!authToken, 'length:', authToken?.length);
        const response = await fetch(`${API_URL}/branches/owner-stats`, {
            headers: { 'Authorization': `Bearer ${authToken}` }
        });

        console.log('[BRANCH-DEBUG] response status:', response.status, response.statusText);
        if (!response.ok) {
            const errBody = await response.text();
            console.error('[BRANCH-DEBUG] response body:', errBody);
            throw new Error('Failed to load branches');
        }

        const data = await response.json();
        const branches = data.branches || [];

        if (branches.length === 0) {
            grid.innerHTML = `
                <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--gray-500);">
                    <i class="fas fa-store" style="font-size: 3rem; margin-bottom: 1rem; color: var(--gray-200);"></i>
                    <p>No branches found. <a href="admin.html" style="color: var(--gold);">Add your first branch</a></p>
                </div>
            `;
            return;
        }

        // Build global branch map for live feed name resolution
        branches.forEach(b => { window._ownerBranchMap[b._id] = b.name; });

        // Populate live feed branch filter
        if (typeof populateBranchFilter === 'function') populateBranchFilter(branches);

        // Render camera grid
        if (typeof renderCameraGrid === 'function') renderCameraGrid(branches);

        // Update active branches count
        const activeBranches = branches.filter(b => b.isActive).length;
        const activeBranchesEl = document.getElementById('activeBranches');
        if (activeBranchesEl) activeBranchesEl.textContent = `${activeBranches}/${branches.length}`;

        const fmt = (n) => (n || 0).toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 });

        grid.innerHTML = branches.map(branch => {
            const tillIndicator = branch.openTills > 0
                ? `<span style="color: #22C55E;"><i class="fas fa-circle" style="font-size: 0.5rem;"></i> ${branch.openTills} till${branch.openTills > 1 ? 's' : ''} open</span>`
                : `<span style="color: var(--gray-500);"><i class="fas fa-circle" style="font-size: 0.5rem;"></i> No tills open</span>`;

            const cashupBadge = branch.pendingCashups > 0
                ? `<span style="background: var(--gold); color: var(--green-deep); padding: 2px 8px; border-radius: 10px; font-size: 0.7rem; font-weight: 700;">${branch.pendingCashups} cashup</span>`
                : '';

            return `
            <div class="branch-card" data-branch-id="${branch._id}">
                <div class="branch-header">
                    <span class="branch-name">${branch.name}</span>
                    <span class="branch-code">${branch.branchCode}</span>
                </div>
                <div class="branch-body">
                    <div class="branch-stats">
                        <div class="branch-stat">
                            <div class="branch-stat-value">R${fmt(branch.todaySales)}</div>
                            <div class="branch-stat-label">Today's Sales</div>
                        </div>
                        <div class="branch-stat">
                            <div class="branch-stat-value">${branch.todayTransactions}</div>
                            <div class="branch-stat-label">Transactions</div>
                        </div>
                        <div class="branch-stat">
                            <div class="branch-stat-value">${branch.staffCount}</div>
                            <div class="branch-stat-label">Staff</div>
                        </div>
                        <div class="branch-stat">
                            <div class="branch-stat-value">${branch.stockItems}</div>
                            <div class="branch-stat-label">Products</div>
                        </div>
                    </div>
                    <div class="branch-meta" style="display: flex; justify-content: space-between; align-items: center; padding: 0.5rem 0; font-size: 0.8rem; border-top: 1px solid var(--gray-200); margin-top: 0.5rem;">
                        ${tillIndicator}
                        ${cashupBadge}
                    </div>
                    <div class="branch-month-stat" style="font-size: 0.8rem; color: var(--gray-500); padding: 0.25rem 0;">
                        <i class="fas fa-calendar"></i> Month: R${fmt(branch.monthSales)} (${branch.monthTransactions} txns) | Stock value: R${fmt(branch.stockValue)}
                    </div>
                    <div class="branch-status">
                        <span class="status-dot ${branch.isActive ? 'active' : 'inactive'}"></span>
                        <span>${branch.isActive ? 'Open' : 'Closed'}</span>
                        ${branch.address ? `<span style="margin-left: auto; color: var(--gray-500); font-size: 0.8rem;"><i class="fas fa-map-marker-alt"></i> ${branch.address.suburb || branch.address.city || ''}</span>` : ''}
                    </div>
                    <div class="branch-actions">
                        <button class="branch-btn primary" onclick="viewBranch('${branch._id}')">
                            <i class="fas fa-eye"></i> View
                        </button>
                        <button class="branch-btn secondary" onclick="openPOS('${branch._id}')">
                            <i class="fas fa-cash-register"></i> POS
                        </button>
                    </div>
                </div>
            </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading branches:', error, error.stack);
        grid.innerHTML = `
            <div style="grid-column: 1/-1; text-align: center; padding: 3rem; color: var(--red);">
                <i class="fas fa-exclamation-circle" style="font-size: 2rem; margin-bottom: 1rem;"></i>
                <p>Failed to load branches: ${error.message}</p>
                <p style="font-size: 0.7rem; color: #999; margin-top: 0.5rem;">${error.stack?.split('\n')[1]?.trim() || ''}</p>
                <button onclick="loadBranches()" style="margin-top: 1rem; padding: 0.5rem 1rem; background: var(--gold); border: none; border-radius: 8px; cursor: pointer;">
                    <i class="fas fa-refresh"></i> Retry
                </button>
            </div>
        `;
    }
}

// View branch details
function viewBranch(branchId) {
    sessionStorage.setItem('selectedBranch', branchId);
    window.location.href = 'admin.html';
}

// Open POS for branch
function openPOS(branchId) {
    sessionStorage.setItem('selectedBranch', branchId);
    sessionStorage.setItem('adminToken', token);
    window.location.href = 'pos.html';
}

// Navigate with authentication token
function navigateWithAuth(page, hash) {
    // Store the token for the target page
    sessionStorage.setItem('adminToken', token);
    localStorage.setItem('token', token);

    // Navigate to the page
    const url = hash ? `${page}#${hash}` : page;
    window.location.href = url;
}

// ===== BRANCH MANAGEMENT =====

function showAddBranchModal() {
    document.getElementById('branchModal').style.display = 'flex';
}

function hideBranchModal() {
    document.getElementById('branchModal').style.display = 'none';
    document.getElementById('branchForm').reset();
}

document.getElementById('branchForm').addEventListener('submit', async function(e) {
    e.preventDefault();

    const branchData = {
        name: document.getElementById('branchName').value,
        branchCode: document.getElementById('branchCode').value,
        phone: document.getElementById('branchPhone').value,
        email: document.getElementById('branchEmail').value,
        address: {
            street: document.getElementById('branchStreet').value,
            city: document.getElementById('branchCity').value,
            province: document.getElementById('branchProvince').value,
            postalCode: document.getElementById('branchPostal').value,
            country: 'South Africa'
        },
        isActive: document.getElementById('branchStatus').value === 'true'
    };

    try {
        const res = await fetch(`${API_URL}/branches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(branchData)
        });

        if (res.ok) {
            showToast('Branch created successfully', 'success');
            hideBranchModal();
            await loadBranches();
        } else {
            const error = await res.json();
            throw new Error(error.message || 'Failed to create branch');
        }
    } catch (error) {
        showToast(error.message || 'Failed to create branch', 'error');
    }
});
