/**
 * Admin Loyalty Points Management
 * Functions for managing user wellness points, tier overrides, and transaction history
 */

// Global state for points management
let selectedUserId = null;
let selectedUserData = null;
let pointsTransactions = [];
let allUsers = [];

/**
 * Initialize loyalty points tab when loaded
 */
async function initLoyaltyPointsTab() {
    await loadPointsStats();
    await loadPointsTransactions();
    setupPointsUserSearch();
}

/**
 * Load points statistics for dashboard
 */
async function loadPointsStats() {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/loyalty/stats`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const stats = await response.json();
            document.getElementById('totalPointsIssued').textContent = stats.totalIssued.toLocaleString();
            document.getElementById('totalPointsRedeemed').textContent = stats.totalRedeemed.toLocaleString();
            document.getElementById('activePointsBalance').textContent = stats.activeBalance.toLocaleString();
        }
    } catch (error) {
        console.error('Error loading points stats:', error);
    }
}

/**
 * Setup user search with debounce
 */
function setupPointsUserSearch() {
    const searchInput = document.getElementById('pointsUserSearch');
    let debounceTimeout;

    searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimeout);
        const query = e.target.value.trim();

        if (query.length < 2) {
            document.getElementById('userSearchResults').style.display = 'none';
            return;
        }

        debounceTimeout = setTimeout(() => searchUsers(query), 300);
    });
}

/**
 * Search for users
 */
async function searchUsers(query) {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/users/search?q=${encodeURIComponent(query)}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const users = await response.json();
            displayUserSearchResults(users);
        }
    } catch (error) {
        console.error('Error searching users:', error);
    }
}

/**
 * Display user search results
 */
function displayUserSearchResults(users) {
    const resultsDiv = document.getElementById('userSearchResults');

    if (users.length === 0) {
        resultsDiv.innerHTML = '<div style="padding: 10px; color: #999;">No users found</div>';
        resultsDiv.style.display = 'block';
        return;
    }

    resultsDiv.innerHTML = users.map(user => `
        <div style="padding: 10px; border-bottom: 1px solid #333; cursor: pointer; hover: background: #333;"
             onclick="selectUser('${user._id}', '${user.email}', '${user.firstName || ''} ${user.lastName || ''}', ${user.loyalty?.points || 0}, '${user.loyalty?.tier || 'seedling'}')">
            <div style="font-weight: 500; color: #FFFFFF;">${user.firstName || ''} ${user.lastName || user.email}</div>
            <div style="font-size: 0.85rem; color: #999;">${user.email} | ${user.loyalty?.points || 0} points | ${user.loyalty?.tier || 'seedling'}</div>
        </div>
    `).join('');

    resultsDiv.style.display = 'block';
}

/**
 * Select a user for points adjustment
 */
function selectUser(userId, email, name, points, tier) {
    selectedUserId = userId;
    selectedUserData = { userId, email, name, points, tier };

    // Update selected user display
    document.getElementById('selectedUserInfo').innerHTML = `
        <div style="color: #FFFFFF; font-weight: 500;">${name || email}</div>
        <div style="font-size: 0.85rem; color: #999;">Current: ${points} points | Tier: ${tier}</div>
    `;

    // Update tier override display
    document.getElementById('tierOverrideUserInfo').innerHTML = `
        <div style="color: #FFFFFF; font-weight: 500;">${name || email}</div>
        <div style="font-size: 0.85rem; color: #999;">Current Tier: <span style="text-transform: capitalize;">${tier}</span></div>
    `;

    // Enable buttons
    document.getElementById('adjustPointsBtn').disabled = false;
    document.getElementById('tierOverrideSelect').disabled = false;
    document.getElementById('overrideTierBtn').disabled = false;

    // Set current tier in dropdown
    document.getElementById('tierOverrideSelect').value = tier;

    // Hide search results
    document.getElementById('userSearchResults').style.display = 'none';
}

/**
 * Adjust user points
 */
async function adjustUserPoints() {
    if (!selectedUserId) {
        showToast('Error', 'Please select a user first', 'error');
        return;
    }

    const amount = parseInt(document.getElementById('pointsAmount').value);
    const actionType = document.getElementById('pointsActionType').value;
    const reason = document.getElementById('pointsReason').value.trim();

    if (!amount || amount <= 0) {
        showToast('Error', 'Please enter a valid points amount', 'error');
        return;
    }

    if (!reason) {
        showToast('Error', 'Please provide a reason for the adjustment', 'error');
        return;
    }

    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/loyalty/adjust-points`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: selectedUserId,
                amount,
                actionType,
                reason
            })
        });

        if (response.ok) {
            const result = await response.json();
            showToast('Success', `Points adjusted successfully! New balance: ${result.newBalance}`, 'success');

            // Reset form
            document.getElementById('pointsAmount').value = '';
            document.getElementById('pointsReason').value = '';

            // Reload transactions and stats
            await loadPointsStats();
            await loadPointsTransactions();

            // Update selected user display with new balance
            if (selectedUserData) {
                selectedUserData.points = result.newBalance;
                document.getElementById('selectedUserInfo').innerHTML = `
                    <div style="color: #FFFFFF; font-weight: 500;">${selectedUserData.name || selectedUserData.email}</div>
                    <div style="font-size: 0.85rem; color: #999;">Current: ${result.newBalance} points | Tier: ${selectedUserData.tier}</div>
                `;
            }
        } else {
            const error = await response.json();
            showToast('Error', error.message || 'Failed to adjust points', 'error');
        }
    } catch (error) {
        console.error('Error adjusting points:', error);
        showToast('Error', 'Failed to adjust points', 'error');
    }
}

/**
 * Override user tier
 */
async function overrideUserTier() {
    if (!selectedUserId) {
        showToast('Error', 'Please select a user first', 'error');
        return;
    }

    const newTier = document.getElementById('tierOverrideSelect').value;

    if (!confirm(`Are you sure you want to override this user's tier to "${newTier}"? This will bypass the automatic tier calculation.`)) {
        return;
    }

    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/loyalty/override-tier`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                userId: selectedUserId,
                tier: newTier
            })
        });

        if (response.ok) {
            const result = await response.json();
            showToast('Success', `Tier overridden successfully! New tier: ${newTier}`, 'success');

            // Update selected user data
            if (selectedUserData) {
                selectedUserData.tier = newTier;
                document.getElementById('tierOverrideUserInfo').innerHTML = `
                    <div style="color: #FFFFFF; font-weight: 500;">${selectedUserData.name || selectedUserData.email}</div>
                    <div style="font-size: 0.85rem; color: #999;">Current Tier: <span style="text-transform: capitalize;">${newTier}</span></div>
                `;
            }
        } else {
            const error = await response.json();
            showToast('Error', error.message || 'Failed to override tier', 'error');
        }
    } catch (error) {
        console.error('Error overriding tier:', error);
        showToast('Error', 'Failed to override tier', 'error');
    }
}

/**
 * Load points transactions
 */
async function loadPointsTransactions() {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/loyalty/transactions?limit=100`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            pointsTransactions = data.transactions || [];
            displayPointsTransactions(pointsTransactions);
        }
    } catch (error) {
        console.error('Error loading points transactions:', error);
    }
}

/**
 * Display points transactions in table
 */
function displayPointsTransactions(transactions) {
    const tbody = document.getElementById('pointsTransactionsList');

    if (transactions.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px; color: #666;">
                    <i class="fas fa-award" style="font-size: 3rem; margin-bottom: 10px; opacity: 0.3;"></i>
                    <p>No points transactions yet</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = transactions.map(tx => {
        const isPositive = tx.amount > 0;
        const amountClass = isPositive ? 'text-success' : 'text-danger';
        const typeIcon = tx.type === 'earned' ? '⬆️' :
                        tx.type === 'redeemed' ? '⬇️' :
                        tx.type === 'adjusted' ? '✏️' : '⏰';

        return `
            <tr>
                <td>${tx.userEmail || 'Unknown'}</td>
                <td><span style="font-size: 1.2rem;">${typeIcon}</span> ${tx.type}</td>
                <td><span class="${amountClass}" style="font-weight: 600;">${isPositive ? '+' : ''}${tx.amount}</span></td>
                <td>${tx.reason || '-'}</td>
                <td>${tx.orderId ? `<a href="#" onclick="viewOrder('${tx.orderId}')">${tx.orderId.substring(0, 8)}...</a>` : '-'}</td>
                <td>${new Date(tx.createdAt).toLocaleDateString()} ${new Date(tx.createdAt).toLocaleTimeString()}</td>
                <td>${tx.expiresAt ? new Date(tx.expiresAt).toLocaleDateString() : 'Never'}</td>
                <td>
                    <button class="action-btn" style="background: #2196F3; padding: 5px 10px; font-size: 0.85rem;"
                            onclick="viewTransactionDetails('${tx._id}')">
                        View
                    </button>
                </td>
            </tr>
        `;
    }).join('');
}

/**
 * Filter points transactions based on search and filters
 */
function filterPointsTransactions() {
    const search = document.getElementById('transactionSearch').value.toLowerCase();
    const typeFilter = document.getElementById('transactionTypeFilter').value;
    const dateFilter = document.getElementById('transactionDateFilter').value;

    let filtered = pointsTransactions.filter(tx => {
        // Search filter
        const matchesSearch = !search ||
            tx.userEmail?.toLowerCase().includes(search) ||
            tx.reason?.toLowerCase().includes(search);

        // Type filter
        const matchesType = typeFilter === 'all' || tx.type === typeFilter;

        // Date filter
        let matchesDate = true;
        if (dateFilter !== 'all') {
            const txDate = new Date(tx.createdAt);
            const now = new Date();

            if (dateFilter === 'today') {
                matchesDate = txDate.toDateString() === now.toDateString();
            } else if (dateFilter === 'week') {
                const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                matchesDate = txDate >= weekAgo;
            } else if (dateFilter === 'month') {
                const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                matchesDate = txDate >= monthAgo;
            }
        }

        return matchesSearch && matchesType && matchesDate;
    });

    displayPointsTransactions(filtered);
}

/**
 * Export points data to CSV
 */
function exportPointsData() {
    const csv = [
        ['User Email', 'Type', 'Amount', 'Reason', 'Order ID', 'Date', 'Expires'],
        ...pointsTransactions.map(tx => [
            tx.userEmail || '',
            tx.type,
            tx.amount,
            tx.reason || '',
            tx.orderId || '',
            new Date(tx.createdAt).toISOString(),
            tx.expiresAt ? new Date(tx.expiresAt).toISOString() : ''
        ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `points-transactions-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();

    showToast('Success', 'Points data exported successfully', 'success');
}

/**
 * Process expired points
 */
async function expireOldPoints() {
    if (!confirm('This will process all expired points. Continue?')) {
        return;
    }

    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/admin/loyalty/expire-points`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const result = await response.json();
            showToast('Success', `Expired ${result.expiredCount} points transactions`, 'success');
            await loadPointsStats();
            await loadPointsTransactions();
        } else {
            const error = await response.json();
            showToast('Error', error.message || 'Failed to process expired points', 'error');
        }
    } catch (error) {
        console.error('Error processing expired points:', error);
        showToast('Error', 'Failed to process expired points', 'error');
    }
}

/**
 * Generate points report
 */
function generatePointsReport() {
    // Calculate report statistics
    const totalIssued = pointsTransactions
        .filter(tx => tx.amount > 0)
        .reduce((sum, tx) => sum + tx.amount, 0);

    const totalRedeemed = Math.abs(pointsTransactions
        .filter(tx => tx.amount < 0)
        .reduce((sum, tx) => sum + tx.amount, 0));

    const byType = pointsTransactions.reduce((acc, tx) => {
        acc[tx.type] = (acc[tx.type] || 0) + 1;
        return acc;
    }, {});

    const report = `
WELLNESS POINTS REPORT
Generated: ${new Date().toLocaleString()}

SUMMARY:
- Total Points Issued: ${totalIssued.toLocaleString()}
- Total Points Redeemed: ${totalRedeemed.toLocaleString()}
- Active Balance: ${(totalIssued - totalRedeemed).toLocaleString()}
- Total Transactions: ${pointsTransactions.length}

BREAKDOWN BY TYPE:
${Object.entries(byType).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

RECENT TRANSACTIONS:
${pointsTransactions.slice(0, 10).map((tx, i) =>
    `${i + 1}. ${tx.userEmail} | ${tx.type} | ${tx.amount > 0 ? '+' : ''}${tx.amount} points | ${new Date(tx.createdAt).toLocaleDateString()}`
).join('\n')}
    `.trim();

    // Create and download report
    const blob = new Blob([report], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `points-report-${new Date().toISOString().split('T')[0]}.txt`;
    a.click();

    showToast('Success', 'Points report generated successfully', 'success');
}

/**
 * View transaction details
 */
function viewTransactionDetails(transactionId) {
    const tx = pointsTransactions.find(t => t._id === transactionId);
    if (!tx) return;

    alert(`
Transaction Details:
-------------------
User: ${tx.userEmail || 'Unknown'}
Type: ${tx.type}
Amount: ${tx.amount} points
Reason: ${tx.reason || 'N/A'}
Order ID: ${tx.orderId || 'N/A'}
Created: ${new Date(tx.createdAt).toLocaleString()}
${tx.expiresAt ? `Expires: ${new Date(tx.expiresAt).toLocaleString()}` : 'Never expires'}
    `.trim());
}

// Initialize when loyalty points tab is shown
document.addEventListener('DOMContentLoaded', () => {
    const observer = new MutationObserver((mutations) => {
        mutations.forEach((mutation) => {
            const loyaltyTab = document.getElementById('loyalty-points-tab');
            if (loyaltyTab && loyaltyTab.style.display !== 'none' && !loyaltyTab.dataset.initialized) {
                loyaltyTab.dataset.initialized = 'true';
                initLoyaltyPointsTab();
            }
        });
    });

    const loyaltyTab = document.getElementById('loyalty-points-tab');
    if (loyaltyTab) {
        observer.observe(loyaltyTab, { attributes: true, attributeFilter: ['style'] });
    }
});
