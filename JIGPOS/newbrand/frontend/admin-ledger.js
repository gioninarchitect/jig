// ===== ADMIN LEDGER MODULE =====
let currentCashup = null;
let cashupHistory = [];

function initSmartLedger() {
    // Set default date to today
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('ledgerDateFilter').value = today;

    // Load branches for filter
    loadLedgerBranches();

    // Load cashup history
    loadCashupHistory();
}

async function loadLedgerBranches() {
    const token = sessionStorage.getItem('adminToken');
    const select = document.getElementById('ledgerBranchFilter');

    try {
        const response = await fetch(`${API_URL}/branches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        select.innerHTML = '<option value="">All Branches</option>';
        if (data.success && data.branches) {
            data.branches.forEach(branch => {
                select.innerHTML += `<option value="${branch._id}">${branch.name} (${branch.code})</option>`;
            });
        }
    } catch (error) {
        console.error('Load branches error:', error);
    }
}

async function loadCashupHistory() {
    const token = sessionStorage.getItem('adminToken');
    const branchId = document.getElementById('ledgerBranchFilter').value;
    const date = document.getElementById('ledgerDateFilter').value;
    const tbody = document.getElementById('cashupHistoryList');

    tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: var(--green-light);">Loading...</td></tr>';

    try {
        // Use /cashup/history endpoint (not /cashups)
        let url = `${API_URL}/pos/cashup/history?`;
        if (branchId) url += `branchId=${branchId}&`;
        if (date) {
            // Get cashups for the selected date and 7 days before
            const startDate = new Date(date);
            startDate.setDate(startDate.getDate() - 7);
            url += `startDate=${startDate.toISOString().split('T')[0]}&endDate=${date}`;
        }

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.cashups?.length > 0) {
            cashupHistory = data.cashups;
            displayCashupHistory(cashupHistory);

            // Load the selected date's cashup details
            const todaysCashup = data.cashups.find(c =>
                new Date(c.date).toISOString().split('T')[0] === date
            );
            if (todaysCashup) {
                loadCashupDetails(todaysCashup._id);
            } else {
                resetLedgerSummary();
                document.getElementById('ledgerEntriesList').innerHTML =
                    '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--green-light);">No cashup for selected date</td></tr>';
            }
        } else {
            tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: var(--green-light);">No cashups found</td></tr>';
            resetLedgerSummary();
        }
    } catch (error) {
        console.error('Load cashups error:', error);
        tbody.innerHTML = '<tr><td colspan="10" style="text-align: center; padding: 40px; color: #f87171;">Error loading cashups</td></tr>';
    }
}

function displayCashupHistory(cashups) {
    const tbody = document.getElementById('cashupHistoryList');

    tbody.innerHTML = cashups.map(c => {
        const date = new Date(c.date).toLocaleDateString();
        const varianceClass = Math.abs(c.totalVariance) > 50 ? 'color: var(--red);' :
                             Math.abs(c.totalVariance) > 0 ? 'color: var(--gold-dark);' : 'color: var(--green);';
        const statusColors = {
            draft: 'var(--green-light)',
            submitted: 'var(--gold)',
            approved: 'var(--green)',
            rejected: 'var(--red)'
        };

        return `
            <tr>
                <td><strong>${c.cashupNumber}</strong></td>
                <td>${c.branchId?.name || 'Unknown'}</td>
                <td>${date}</td>
                <td>R${(c.openingBalance || 0).toFixed(2)}</td>
                <td>R${(c.totalSales || 0).toFixed(2)}</td>
                <td>R${(c.bankingAmount || 0).toFixed(2)}</td>
                <td>R${(c.closingBalance || 0).toFixed(2)}</td>
                <td style="${varianceClass}">R${(c.totalVariance || 0).toFixed(2)}</td>
                <td><span style="background: ${statusColors[c.status]}; color: var(--cream); padding: 4px 10px; border-radius: 12px; font-size: 0.8rem;">${c.status?.toUpperCase()}</span></td>
                <td>
                    <div style="display:flex;gap:6px;align-items:center;">
                        <button class="action-btn view-btn" onclick="loadCashupDetails('${c._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                            <i class="fas fa-eye"></i> View
                        </button>
                        ${c.status === 'submitted' ? `
                        <button class="action-btn approve-btn" onclick="approveCashup('${c._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                            <i class="fas fa-check"></i> Approve
                        </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

async function loadCashupDetails(cashupId) {
    const token = sessionStorage.getItem('adminToken');

    try {
        // Use /cashup/:id/report endpoint for detailed view
        const response = await fetch(`${API_URL}/pos/cashup/${cashupId}/report`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await response.json();

        if (data.success && data.cashup) {
            currentCashup = data.cashup;
            updateLedgerSummary(currentCashup);
            displayLedgerEntries(currentCashup.ledger || []);
        }
    } catch (error) {
        console.error('Load cashup details error:', error);
    }
}

function updateLedgerSummary(cashup) {
    document.getElementById('ledgerOpeningBal').textContent = `R${(cashup.openingBalance || 0).toFixed(0)}`;
    document.getElementById('ledgerTotalSales').textContent = `R${(cashup.totalSales || 0).toFixed(0)}`;
    document.getElementById('ledgerBanking').textContent = `R${(cashup.bankingAmount || 0).toFixed(0)}`;
    document.getElementById('ledgerClosingBal').textContent = `R${(cashup.closingBalance || 0).toFixed(0)}`;
}

function resetLedgerSummary() {
    document.getElementById('ledgerOpeningBal').textContent = 'R0';
    document.getElementById('ledgerTotalSales').textContent = 'R0';
    document.getElementById('ledgerBanking').textContent = 'R0';
    document.getElementById('ledgerClosingBal').textContent = 'R0';
}

function displayLedgerEntries(entries) {
    const tbody = document.getElementById('ledgerEntriesList');

    if (!entries || entries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align: center; padding: 40px; color: var(--green-light);">No ledger entries</td></tr>';
        return;
    }

    const typeLabels = {
        opening_balance: 'Opening Balance',
        sale: 'Sale',
        refund: 'Refund',
        safe_drop: 'Safe Drop',
        banking: 'Banking',
        expense: 'Expense',
        adjustment: 'Adjustment',
        float_in: 'Float In',
        float_out: 'Float Out'
    };

    const typeColors = {
        opening_balance: 'var(--gold)',
        sale: 'var(--green)',
        refund: 'var(--red)',
        safe_drop: 'var(--gold-dark)',
        banking: 'var(--green-dark)',
        expense: 'var(--red)',
        adjustment: 'var(--gold)',
        float_in: 'var(--green-light)',
        float_out: 'var(--red)'
    };

    tbody.innerHTML = entries.map(entry => {
        const time = new Date(entry.timestamp).toLocaleTimeString();
        const isDebit = ['sale', 'float_in', 'opening_balance'].includes(entry.type) || (entry.type === 'adjustment' && entry.amount > 0);

        return `
            <tr style="border-bottom: 1px solid var(--cream);">
                <td style="padding: 12px;">${time}</td>
                <td style="padding: 12px;">
                    <span style="background: ${typeColors[entry.type] || 'var(--green-light)'}; color: var(--cream); padding: 3px 8px; border-radius: 4px; font-size: 0.8rem;">
                        ${typeLabels[entry.type] || entry.type}
                    </span>
                </td>
                <td style="padding: 12px;">${entry.description || entry.reference || '-'}</td>
                <td style="padding: 12px; text-align: right; color: var(--green);">
                    ${isDebit ? `R${Math.abs(entry.amount).toFixed(2)}` : '-'}
                </td>
                <td style="padding: 12px; text-align: right; color: var(--red);">
                    ${!isDebit ? `R${Math.abs(entry.amount).toFixed(2)}` : '-'}
                </td>
                <td style="padding: 12px; text-align: right; font-weight: bold;">
                    R${(entry.runningBalance || 0).toFixed(2)}
                </td>
            </tr>
        `;
    }).join('');
}

// ==========================================
// DAILY CASHUP WIZARD
// ==========================================
let currentCashupStep = 1;
let cashupData = {
    branchId: null,
    cashupId: null,
    tillSessions: [],
    totalSales: 0,
    totalExpected: 0,
    managerCashCount: {},
    managerCashTotal: 0,
    bankingAmount: 0,
    nextDayFloat: 500
};

async function createNewCashup() {
    // Get branch
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    cashupData.branchId = user.primaryBranch?._id || user.primaryBranch || user.branchId;

    if (!cashupData.branchId) {
        // Try to get from branches list
        const branchSelect = document.getElementById('reportsBranchSelect');
        if (branchSelect && branchSelect.value) {
            cashupData.branchId = branchSelect.value;
        } else {
            showAdminToast('Error', 'No branch selected', 'error');
            return;
        }
    }

    // Reset wizard state
    currentCashupStep = 1;
    cashupData.cashupId = null;
    cashupData.tillSessions = [];
    cashupData.totalSales = 0;
    cashupData.totalExpected = 0;
    cashupData.managerCashCount = {};
    cashupData.managerCashTotal = 0;

    // Show wizard modal
    document.getElementById('cashupWizardModal').style.display = 'flex';
    showCashupStep(1);

    // Load till status
    await checkTillsForCashup();
}

function closeCashupWizard() {
    document.getElementById('cashupWizardModal').style.display = 'none';
}

async function checkTillsForCashup() {
    const token = sessionStorage.getItem('adminToken');
    const listEl = document.getElementById('tillStatusList');
    const warningEl = document.getElementById('tillWarning');

    try {
        const res = await fetch(`${API_URL}/pos/cashup/today?branchId=${cashupData.branchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.cashup) {
            // Cashup already exists for today
            cashupData.cashupId = data.cashup._id;
            cashupData.totalSales = data.cashup.totalSales || 0;
            cashupData.totalExpected = data.cashup.totalExpectedCash || 0;

            listEl.innerHTML = `
                <div style="text-align: center; padding: 20px;">
                    <i class="fas fa-check-circle" style="font-size: 3rem; color: var(--green); margin-bottom: 15px;"></i>
                    <h4 style="color: var(--green-deep);">Cashup Already Started</h4>
                    <p style="color: #666;">Cashup #${data.cashup.cashupNumber || 'N/A'}</p>
                    <p style="color: #666;">Total Sales: R${(data.cashup.totalSales || 0).toFixed(2)}</p>
                </div>
            `;
            warningEl.style.display = 'none';
        } else if (data.tillSummary) {
            const { openSessions, closedSessions, sessions } = data.tillSummary;
            cashupData.tillSessions = sessions || [];

            if (openSessions > 0) {
                // Some tills still open
                listEl.innerHTML = `
                    <div style="text-align: center;">
                        <i class="fas fa-exclamation-circle" style="font-size: 2.5rem; color: var(--gold); margin-bottom: 15px;"></i>
                        <h4 style="color: var(--gold-dark);">${openSessions} Till(s) Still Open</h4>
                        <p style="color: #666;">Please close all tills before starting daily cashup.</p>
                    </div>
                    <div style="margin-top: 15px;">
                        ${sessions.filter(s => s.status === 'open').map(s => `
                            <div style="display: flex; justify-content: space-between; padding: 10px; background: rgba(217, 119, 6, 0.1); border-radius: 6px; margin-bottom: 8px;">
                                <span><i class="fas fa-cash-register"></i> ${s.tillNumber || 'Till'}</span>
                                <span style="color: var(--gold);">OPEN</span>
                            </div>
                        `).join('')}
                    </div>
                `;
                warningEl.style.display = 'block';
                warningEl.querySelector('#tillWarningText').textContent = 'Close all open tills to proceed with daily cashup.';
                document.getElementById('cashupNextBtn').disabled = true;
                document.getElementById('cashupNextBtn').style.opacity = '0.5';
            } else if (closedSessions === 0) {
                listEl.innerHTML = `
                    <div style="text-align: center;">
                        <i class="fas fa-info-circle" style="font-size: 2.5rem; color: var(--green-light); margin-bottom: 15px;"></i>
                        <h4 style="color: var(--green-deep);">No Till Sessions Today</h4>
                        <p style="color: #666;">No till sessions found for today.</p>
                    </div>
                `;
                warningEl.style.display = 'none';
                document.getElementById('cashupNextBtn').disabled = false;
                document.getElementById('cashupNextBtn').style.opacity = '1';
            } else {
                // All tills closed - ready to proceed
                const totalSales = sessions.reduce((sum, s) => sum + (s.totalSales || 0), 0);
                const totalCash = sessions.reduce((sum, s) => sum + (s.openingFloat || 0) + (s.totalCash || 0), 0);
                cashupData.totalSales = totalSales;
                cashupData.totalExpected = totalCash;

                listEl.innerHTML = `
                    <div style="text-align: center; margin-bottom: 20px;">
                        <i class="fas fa-check-circle" style="font-size: 2.5rem; color: var(--green); margin-bottom: 15px;"></i>
                        <h4 style="color: var(--green);">All Tills Closed</h4>
                        <p style="color: #666;">${closedSessions} till session(s) ready for cashup</p>
                    </div>
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                        <div style="background: var(--green); color: var(--cream); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 0.85rem;">Total Sales</div>
                            <div style="font-size: 1.5rem; font-weight: bold;">R ${totalSales.toFixed(2)}</div>
                        </div>
                        <div style="background: var(--gold); color: var(--green-deep); padding: 15px; border-radius: 8px; text-align: center;">
                            <div style="font-size: 0.85rem;">Expected Cash</div>
                            <div style="font-size: 1.5rem; font-weight: bold;">R ${totalCash.toFixed(2)}</div>
                        </div>
                    </div>
                `;
                warningEl.style.display = 'none';
                document.getElementById('cashupNextBtn').disabled = false;
                document.getElementById('cashupNextBtn').style.opacity = '1';
            }
        }
    } catch (error) {
        console.error('Check tills error:', error);
        listEl.innerHTML = '<p style="color: var(--red); text-align: center;">Error checking till status</p>';
    }
}

function showCashupStep(step) {
    // Hide all steps
    document.querySelectorAll('.cashup-wizard-step').forEach(el => el.style.display = 'none');
    // Show current step
    document.getElementById(`cashupStep${step}`).style.display = 'block';

    // Update indicators
    for (let i = 1; i <= 4; i++) {
        const indicator = document.getElementById(`cashupStep${i}Indicator`);
        indicator.style.opacity = i <= step ? '1' : '0.4';
        indicator.querySelector('div').style.background = i <= step ? 'var(--green)' : 'var(--green-light)';
    }

    // Update buttons
    document.getElementById('cashupPrevBtn').style.display = step > 1 ? 'block' : 'none';
    document.getElementById('cashupNextBtn').style.display = step < 4 ? 'block' : 'none';
    document.getElementById('cashupSubmitBtn').style.display = step === 4 ? 'block' : 'none';

    // If step 4, prepare review
    if (step === 4) {
        prepareReviewStep();
    }
}

async function nextCashupStep() {
    if (currentCashupStep === 1) {
        // Start cashup if not already started
        if (!cashupData.cashupId) {
            const token = sessionStorage.getItem('adminToken');
            try {
                const res = await fetch(`${API_URL}/pos/cashup/start`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ branchId: cashupData.branchId })
                });
                const data = await res.json();
                if (data.success) {
                    cashupData.cashupId = data.cashup._id;
                    cashupData.totalSales = data.cashup.totalSales || 0;
                    cashupData.totalExpected = data.cashup.totalExpectedCash || 0;
                } else {
                    showAdminToast('Error', data.message || 'Failed to start cashup', 'error');
                    return;
                }
            } catch (error) {
                showAdminToast('Error', 'Failed to start cashup', 'error');
                return;
            }
        }
    }

    currentCashupStep++;
    showCashupStep(currentCashupStep);
}

function prevCashupStep() {
    if (currentCashupStep > 1) {
        currentCashupStep--;
        showCashupStep(currentCashupStep);
    }
}

function updateManagerTotal() {
    const denoms = {
        r200: 200, r100: 100, r50: 50, r20: 20, r10: 10, r5: 5, r2: 2, r1: 1
    };

    let total = 0;
    Object.keys(denoms).forEach(key => {
        const count = parseInt(document.getElementById(`mgr_${key}`)?.value) || 0;
        const lineTotal = count * denoms[key];
        total += lineTotal;
        document.getElementById(`mgr_${key}_total`).textContent = `R${lineTotal}`;
        cashupData.managerCashCount[key] = count;
    });

    cashupData.managerCashTotal = total;
    document.getElementById('managerCashTotal').textContent = `R ${total.toFixed(2)}`;
}

function prepareReviewStep() {
    const banking = parseFloat(document.getElementById('bankingAmount')?.value) || 0;
    const nextFloat = parseFloat(document.getElementById('nextDayFloat')?.value) || 500;
    cashupData.bankingAmount = banking;
    cashupData.nextDayFloat = nextFloat;

    // Calculate variance
    const variance = cashupData.managerCashTotal - cashupData.totalExpected;

    document.getElementById('reviewTotalSales').textContent = `R ${cashupData.totalSales.toFixed(2)}`;
    document.getElementById('reviewCashCounted').textContent = `R ${cashupData.managerCashTotal.toFixed(2)}`;
    document.getElementById('reviewBanking').textContent = `R ${banking.toFixed(2)}`;
    document.getElementById('reviewVariance').textContent = `R ${variance.toFixed(2)}`;

    // Style variance
    const varianceBox = document.getElementById('varianceBox');
    const varianceEl = document.getElementById('reviewVariance');
    if (variance > 0) {
        varianceEl.style.color = 'var(--green)';
        varianceEl.textContent = `+R ${variance.toFixed(2)}`;
    } else if (variance < 0) {
        varianceEl.style.color = 'var(--red)';
    } else {
        varianceEl.style.color = 'var(--green)';
    }

    // Show/hide explanation field
    if (Math.abs(variance) > 100) {
        document.getElementById('varianceExplanationBox').style.display = 'block';
    } else {
        document.getElementById('varianceExplanationBox').style.display = 'none';
    }
}

async function submitCashup() {
    if (!cashupData.cashupId) {
        showAdminToast('Error', 'No cashup started', 'error');
        return;
    }

    const variance = cashupData.managerCashTotal - cashupData.totalExpected;
    const discrepancyExplanation = document.getElementById('discrepancyExplanation')?.value || '';
    const notes = document.getElementById('cashupNotes')?.value || '';

    // Validate if variance > R100 requires explanation
    if (Math.abs(variance) > 100 && !discrepancyExplanation) {
        showAdminToast('Explanation Required', 'Please explain the variance > R100', 'warning');
        return;
    }

    const token = sessionStorage.getItem('adminToken');

    try {
        // Update cashup with manager count
        const updateRes = await fetch(`${API_URL}/pos/cashup/${cashupData.cashupId}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                managerCashCount: cashupData.managerCashCount,
                bankingAmount: cashupData.bankingAmount,
                bankingReference: document.getElementById('bankingReference')?.value || '',
                nextDayFloat: cashupData.nextDayFloat,
                notes
            })
        });

        const updateData = await updateRes.json();
        if (!updateData.success) {
            showAdminToast('Error', updateData.message || 'Failed to update cashup', 'error');
            return;
        }

        // Submit for approval
        const submitRes = await fetch(`${API_URL}/pos/cashup/${cashupData.cashupId}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ discrepancyExplanation })
        });

        const submitData = await submitRes.json();
        if (submitData.success) {
            showAdminToast('Submitted', 'Cashup submitted for approval', 'success');
            closeCashupWizard();
            loadCashupHistory();
        } else {
            showAdminToast('Error', submitData.message || 'Failed to submit cashup', 'error');
        }
    } catch (error) {
        console.error('Submit cashup error:', error);
        showAdminToast('Error', 'Failed to submit cashup', 'error');
    }
}

async function approveCashup(cashupId) {
    const token = sessionStorage.getItem('adminToken');

    showAdminConfirm(
        'Approve Cashup',
        'Are you sure you want to approve this daily cashup?',
        async () => {
            try {
                const response = await fetch(`${API_URL}/pos/cashup/${cashupId}/approve`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ action: 'approve' })
                });
                const data = await response.json();

                if (data.success) {
                    showAdminToast('Approved', 'Cashup approved successfully', 'success');
                    loadCashupHistory();
                } else {
                    showAdminToast('Error', data.message || 'Failed to approve cashup', 'error');
                }
            } catch (error) {
                console.error('Approve cashup error:', error);
                showAdminToast('Error', 'Failed to approve cashup', 'error');
            }
        }
    );
}
