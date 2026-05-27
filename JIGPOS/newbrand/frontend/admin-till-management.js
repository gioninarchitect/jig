/**
 * Till Management System for Origin by ILCO Farming Admin POS
 * Handles shift open/close, cash reconciliation, and cash operations
 */

// Global till session state
let currentTillSession = null;
const BRANCH_ID = '507f1f77bcf86cd799439011'; // TODO: Get from user session
const TILL_NUMBER = 'TILL-01'; // TODO: Make configurable per terminal

// Initialize till status on page load
async function initializeTillManagement() {
    await checkActiveTillSession();
}

// Check for active till session
async function checkActiveTillSession() {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/pos/till/active?branchId=${BRANCH_ID}&tillNumber=${TILL_NUMBER}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        const data = await response.json();

        if (data.success && data.session) {
            currentTillSession = data.session;
            updateTillStatusUI(true);
        } else {
            currentTillSession = null;
            updateTillStatusUI(false);
        }
    } catch (error) {
        console.error('Error checking till session:', error);
        updateTillStatusUI(false);
    }
}

// Update till status indicator UI
function updateTillStatusUI(isOpen) {
    const statusEl = document.getElementById('posTillStatus');
    const statusTextEl = document.getElementById('posTillStatusText');

    // Early return if elements don't exist (page may not have POS tab visible)
    if (!statusEl || !statusTextEl) {
        return;
    }

    const statusIndicator = statusEl.querySelector('div');

    if (isOpen && currentTillSession) {
        statusEl.style.background = 'rgba(76, 175, 80, 0.2)';
        statusEl.style.borderColor = '#4caf50';
        if (statusIndicator) {
            statusIndicator.style.background = '#4caf50';
        }
        statusTextEl.innerHTML = '<i class="fas fa-unlock"></i> SHIFT OPEN';
        statusTextEl.style.color = '#4caf50';
    } else {
        statusEl.style.background = 'rgba(239, 68, 68, 0.2)';
        statusEl.style.borderColor = '#ef4444';
        if (statusIndicator) {
            statusIndicator.style.background = '#ef4444';
        }
        statusTextEl.innerHTML = '<i class="fas fa-lock"></i> SHIFT CLOSED';
        statusTextEl.style.color = '#ef4444';
    }
}

// Manage till session (called when clicking status indicator)
function managePOSTill() {
    if (currentTillSession) {
        // Shift is open - show close shift modal
        showCloseShiftModal();
    } else {
        // Shift is closed - show open shift modal
        showOpenShiftModal();
    }
}

// Show open shift modal
function showOpenShiftModal() {
    document.getElementById('posOpenShiftModal').style.display = 'flex';
}

// Show close shift modal
async function showCloseShiftModal() {
    if (!currentTillSession) {
        showAdminToast('No Active Shift', 'No active shift to close', 'warning');
        return;
    }

    // Populate shift summary
    document.getElementById('shiftStartTime').textContent = new Date(currentTillSession.openedAt).toLocaleString();
    document.getElementById('shiftTransactions').textContent = currentTillSession.transactionCount || 0;
    document.getElementById('shiftTotalSales').textContent = `R ${(currentTillSession.totalSales || 0).toFixed(2)}`;
    document.getElementById('shiftCashSales').textContent = `R ${(currentTillSession.totalCash || 0).toFixed(2)}`;

    const expectedCash = currentTillSession.currentExpectedCash || 0;
    document.getElementById('expectedCashAmount').textContent = `R ${expectedCash.toFixed(2)}`;
    document.getElementById('expectedCashTotal').textContent = `R ${expectedCash.toFixed(2)}`;

    // Reset denomination inputs
    const denominations = ['r200', 'r100', 'r50', 'r20', 'r10', 'r5', 'r2', 'r1', 'c50', 'c20', 'c10', 'c5'];
    denominations.forEach(denom => {
        document.getElementById(`denom_${denom}`).value = 0;
    });

    calculateCashTotal();

    document.getElementById('posCloseShiftModal').style.display = 'flex';
}

// Calculate cash total from denominations
function calculateCashTotal() {
    const denominations = {
        r200: 200,
        r100: 100,
        r50: 50,
        r20: 20,
        r10: 10,
        r5: 5,
        r2: 2,
        r1: 1,
        c50: 0.50,
        c20: 0.20,
        c10: 0.10,
        c5: 0.05
    };

    let total = 0;

    for (const [denom, value] of Object.entries(denominations)) {
        const count = parseInt(document.getElementById(`denom_${denom}`).value) || 0;
        const subtotal = count * value;
        total += subtotal;

        // Update individual denomination total
        document.getElementById(`total_${denom}`).textContent = `R ${subtotal.toFixed(2)}`;
    }

    // Update actual cash total
    document.getElementById('actualCashTotal').textContent = `R ${total.toFixed(2)}`;

    // Calculate variance
    const expectedCash = parseFloat(document.getElementById('expectedCashTotal').textContent.replace('R ', '')) || 0;
    const variance = total - expectedCash;

    const varianceEl = document.getElementById('varianceAmount');
    varianceEl.textContent = `R ${variance.toFixed(2)}`;

    // Update variance styling
    const varianceSummary = document.getElementById('varianceSummary');
    if (Math.abs(variance) <= 1) {
        varianceSummary.className = 'cash-summary';
        varianceEl.style.color = '#4caf50';
    } else if (Math.abs(variance) <= 50) {
        varianceSummary.className = 'cash-summary warning';
        varianceEl.style.color = '#ff9800';
    } else {
        varianceSummary.className = 'cash-summary error';
        varianceEl.style.color = '#ef4444';
    }

    // Show/hide variance warning
    const warningEl = document.getElementById('varianceWarning');
    if (Math.abs(variance) > 50) {
        warningEl.style.display = 'block';
    } else {
        warningEl.style.display = 'none';
    }
}

// Open till session
async function openTillSession() {
    const openingFloat = parseFloat(document.getElementById('openingFloat').value) || 500;
    const tillNumber = document.getElementById('tillNumber').value || TILL_NUMBER;
    const openingNotes = document.getElementById('openingNotes').value;

    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/pos/till/open`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                branchId: BRANCH_ID,
                tillNumber,
                openingFloat,
                openingNotes
            })
        });

        const data = await response.json();

        if (data.success) {
            currentTillSession = data.session;
            updateTillStatusUI(true);
            closeModal('posOpenShiftModal');

            showAdminToast('Shift Opened', `Shift ${data.session.sessionNumber} opened successfully with R${openingFloat} float`, 'success');
        } else {
            showAdminToast('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Error opening till session:', error);
        showAdminToast('Error', 'Failed to open shift. Please try again.', 'error');
    }
}

// Close till session
async function closeTillSession() {
    if (!currentTillSession) {
        showAdminToast('Error', 'No active shift to close', 'error');
        return;
    }

    // Collect denominations
    const denominations = {
        r200: parseInt(document.getElementById('denom_r200').value) || 0,
        r100: parseInt(document.getElementById('denom_r100').value) || 0,
        r50: parseInt(document.getElementById('denom_r50').value) || 0,
        r20: parseInt(document.getElementById('denom_r20').value) || 0,
        r10: parseInt(document.getElementById('denom_r10').value) || 0,
        r5: parseInt(document.getElementById('denom_r5').value) || 0,
        r2: parseInt(document.getElementById('denom_r2').value) || 0,
        r1: parseInt(document.getElementById('denom_r1').value) || 0,
        c50: parseInt(document.getElementById('denom_c50').value) || 0,
        c20: parseInt(document.getElementById('denom_c20').value) || 0,
        c10: parseInt(document.getElementById('denom_c10').value) || 0,
        c5: parseInt(document.getElementById('denom_c5').value) || 0
    };

    const closingNotes = document.getElementById('closingNotes').value;

    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/pos/till/close`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                sessionId: currentTillSession._id,
                denominations,
                closingNotes
            })
        });

        const data = await response.json();

        if (data.success) {
            const session = data.session;
            currentTillSession = null;
            updateTillStatusUI(false);
            closeModal('posCloseShiftModal');

            let message = `Shift ${session.sessionNumber} closed successfully\n\n`;
            message += `Total Sales: R${session.totalSales.toFixed(2)}\n`;
            message += `Transactions: ${session.transactionCount}\n`;
            message += `Expected Cash: R${session.expectedCash.toFixed(2)}\n`;
            message += `Actual Cash: R${session.actualCash.toFixed(2)}\n`;
            message += `Variance: R${session.variance.toFixed(2)}`;

            if (session.requiresApproval) {
                message += '\n\n⚠️ Manager approval required';
            }

            showAdminToast('Shift Closed', message, session.requiresApproval ? 'warning' : 'success');
        } else {
            showAdminToast('Error', data.message, 'error');
        }
    } catch (error) {
        console.error('Error closing till session:', error);
        showAdminToast('Error', 'Failed to close shift. Please try again.', 'error');
    }
}

// Show admin toast notification - uses the global function defined in admin.html
// DO NOT redefine showAdminToast here - it's already defined globally in admin.html

// Close modal
function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

// Initialize on DOMContentLoaded
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initializeTillManagement);
} else {
    initializeTillManagement();
}
