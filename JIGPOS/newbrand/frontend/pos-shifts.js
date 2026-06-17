// ===== POS SHIFTS MODULE =====
// Clock in/out, till sessions, breaks, cash operations, shift summary

// ==========================================
// CLOCK IN/OUT FUNCTIONS
// ==========================================
let currentShift = null;

async function checkShiftStatus() {
    try {
        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/staff-shifts/my-shifts?status=active`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.success && data.data.shifts && data.data.shifts.length > 0) {
            currentShift = data.data.shifts[0];
            updateClockUI(true);
        } else {
            currentShift = null;
            updateClockUI(false);
        }
    } catch (error) {
        console.log('Shift check error:', error);
    }
}

function updateClockUI(isClockedIn) {
    const btn = document.getElementById('clockBtn');
    const icon = document.getElementById('clockIcon');
    const status = document.getElementById('clockStatus');

    if (isClockedIn) {
        btn.style.background = 'var(--green)';
        btn.style.color = 'white';
        btn.title = 'Clock Out';
        icon.className = 'fas fa-clock';
        status.textContent = 'IN';
        status.style.color = 'white';
    } else {
        btn.style.background = 'var(--gold)';
        btn.style.color = 'var(--green-deep)';
        btn.title = 'Clock In';
        icon.className = 'far fa-clock';
        status.textContent = 'OUT';
        status.style.color = 'var(--green-deep)';
    }
}

async function toggleClock() {
    if (currentShift) {
        await clockOut();
    } else {
        await clockIn();
    }
}

async function clockIn() {
    try {
        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
        const branchId = getSelectedBranchId();
        if (!branchId) {
            showToast('No Branch Selected', 'Select a branch first', 'error');
            // If admin/owner, show the branch selector
            const user = JSON.parse(sessionStorage.getItem('user') || '{}');
            if (MULTI_BRANCH_ROLES.includes(user.role)) {
                showBranchSelector(token);
            }
            return;
        }

        const res = await fetch(`${API_URL}/staff-shifts/clock-in`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ branch: branchId })
        });

        const data = await res.json();
        if (data.success) {
            currentShift = data.data;
            updateClockUI(true);
            showToast('Clocked in successfully', 'success');
        } else {
            showToast(data.message || 'Failed to clock in', 'error');
        }
    } catch (error) {
        showToast('Error clocking in', 'error');
    }
}

async function clockOut() {
    _originShowConfirm('Are you sure you want to clock out?', async function() {
        try {
            const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
            const res = await fetch(`${API_URL}/staff-shifts/clock-out`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });

            const data = await res.json();
            if (data.success) {
                const hours = data.data.regularHours + data.data.overtimeHours;
                const pay = data.data.totalPay;
                showToast(`Clocked out. Hours: ${hours.toFixed(1)}, Pay: R${pay.toFixed(2)}`, 'success');
                currentShift = null;
                updateClockUI(false);
            } else {
                showToast(data.message || 'Failed to clock out', 'error');
            }
        } catch (error) {
            showToast('Error clocking out', 'error');
        }
    }, { title: 'Clock Out', confirmText: 'Clock Out', icon: 'fa-clock', type: 'warning' });
}

// ==========================================
// TILL SESSION MANAGEMENT (Day Start/End)
// ==========================================
let currentTillSession = null;

async function checkTillStatus() {
    try {
        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
        const branchId = getSelectedBranchId();

        if (!branchId) return;

        const res = await fetch(`${API_URL}/pos/till/active?branchId=${branchId}&tillNumber=TILL-01`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (data.success && data.session) {
            currentTillSession = data.session;
            updateTillStatusUI(true, data.session);
        } else {
            currentTillSession = null;
            updateTillStatusUI(false);
        }
    } catch (error) {
        console.log('Till status check error:', error);
    }
}

function updateTillStatusUI(isOpen, session = null) {
    const statusEl = document.getElementById('tillStatus');
    const statusText = document.getElementById('tillStatusText');

    if (isOpen && session) {
        statusEl.className = 'till-status open';
        statusText.textContent = `Till Open`;
    } else {
        statusEl.className = 'till-status closed';
        statusText.textContent = 'Shift Closed';
    }
}

function manageTillSession() {
    if (currentTillSession) {
        // Till is open - show close modal
        prepareCloseShiftModal();
        document.getElementById('closeShiftModal').style.display = 'flex';
    } else {
        // Till is closed - show open modal
        document.getElementById('openShiftModal').style.display = 'flex';
    }
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
}

async function openTillSession() {
    const openingFloat = parseFloat(document.getElementById('openingFloat').value) || 500;
    const tillNumber = document.getElementById('tillNumber').value || 'TILL-01';
    const openingNotes = document.getElementById('openingNotes').value;

    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
    const branchId = getSelectedBranchId();

    if (!branchId) {
        showToast('No Branch Selected', 'Select a branch first', 'error');
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        if (MULTI_BRANCH_ROLES.includes(user.role)) {
            showBranchSelector(token);
        }
        return;
    }

    try {
        const res = await fetch(`${API_URL}/pos/till/open`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                branchId,
                tillNumber,
                openingFloat,
                openingNotes
            })
        });

        const data = await res.json();

        if (data.success) {
            currentTillSession = data.session;
            updateTillStatusUI(true, data.session);
            closeModal('openShiftModal');
            showToast('Shift Opened', `Till ${tillNumber} is now open with R${openingFloat} float`, 'success');
        } else {
            showToast('Error', data.message || 'Failed to open shift', 'error');
        }
    } catch (error) {
        showToast('Error', 'Failed to open shift', 'error');
    }
}

function prepareCloseShiftModal() {
    if (!currentTillSession) return;

    // Populate the closing modal with session info
    document.getElementById('shiftStartTime').textContent = new Date(currentTillSession.openedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
    document.getElementById('shiftTransactions').textContent = currentTillSession.transactionCount || 0;
    document.getElementById('shiftTotalSales').textContent = `R ${(currentTillSession.totalSales || 0).toFixed(2)}`;
    document.getElementById('shiftCashSales').textContent = `R ${(currentTillSession.totalCash || 0).toFixed(2)}`;
    const _cardEl = document.getElementById('shiftCardSales');
    const _eftEl = document.getElementById('shiftEftSales');
    if (_cardEl) _cardEl.textContent = `R ${(currentTillSession.totalCard || 0).toFixed(2)}`;
    if (_eftEl) _eftEl.textContent = `R ${(currentTillSession.totalEFT || 0).toFixed(2)}`;

    // Calculate expected cash
    const expectedCash = (currentTillSession.openingFloat || 500) + (currentTillSession.totalCash || 0) - (currentTillSession.totalRefunds || 0);
    document.getElementById('expectedCashAmount').textContent = `R ${expectedCash.toFixed(2)}`;
    document.getElementById('expectedCashTotal').textContent = `R ${expectedCash.toFixed(2)}`;

    // Reset denomination inputs
    ['r200', 'r100', 'r50', 'r20', 'r10', 'r5', 'r2', 'r1', 'c50', 'c20', 'c10', 'c5'].forEach(denom => {
        const input = document.getElementById(`denom_${denom}`);
        if (input) input.value = 0;
        const total = document.getElementById(`total_${denom}`);
        if (total) total.textContent = 'R 0.00';
    });

    calculateCashTotal();
}

function calculateCashTotal() {
    const denominations = {
        r200: { value: 200, count: parseInt(document.getElementById('denom_r200')?.value) || 0 },
        r100: { value: 100, count: parseInt(document.getElementById('denom_r100')?.value) || 0 },
        r50: { value: 50, count: parseInt(document.getElementById('denom_r50')?.value) || 0 },
        r20: { value: 20, count: parseInt(document.getElementById('denom_r20')?.value) || 0 },
        r10: { value: 10, count: parseInt(document.getElementById('denom_r10')?.value) || 0 },
        r5: { value: 5, count: parseInt(document.getElementById('denom_r5')?.value) || 0 },
        r2: { value: 2, count: parseInt(document.getElementById('denom_r2')?.value) || 0 },
        r1: { value: 1, count: parseInt(document.getElementById('denom_r1')?.value) || 0 },
        c50: { value: 0.50, count: parseInt(document.getElementById('denom_c50')?.value) || 0 },
        c20: { value: 0.20, count: parseInt(document.getElementById('denom_c20')?.value) || 0 },
        c10: { value: 0.10, count: parseInt(document.getElementById('denom_c10')?.value) || 0 },
        c5: { value: 0.05, count: parseInt(document.getElementById('denom_c5')?.value) || 0 }
    };

    let totalCash = 0;

    // Update each denomination total
    Object.keys(denominations).forEach(key => {
        const { value, count } = denominations[key];
        const lineTotal = value * count;
        totalCash += lineTotal;

        const totalEl = document.getElementById(`total_${key}`);
        if (totalEl) {
            totalEl.textContent = `R ${lineTotal.toFixed(2)}`;
        }
    });

    // Update actual cash total
    document.getElementById('actualCashTotal').textContent = `R ${totalCash.toFixed(2)}`;

    // Get expected cash and calculate variance
    const expectedText = document.getElementById('expectedCashTotal')?.textContent || 'R 0.00';
    const expectedCash = parseFloat(expectedText.replace('R ', '').replace(',', '')) || 0;
    const variance = totalCash - expectedCash;

    // Update variance display
    const varianceEl = document.getElementById('varianceAmount');
    const summaryEl = document.getElementById('varianceSummary');
    const warningEl = document.getElementById('varianceWarning');

    varianceEl.textContent = `R ${variance.toFixed(2)}`;

    if (variance > 0) {
        varianceEl.className = 'variance-positive';
        varianceEl.textContent = `+R ${variance.toFixed(2)}`;
    } else if (variance < 0) {
        varianceEl.className = 'variance-negative';
    } else {
        varianceEl.className = '';
    }

    // Show warning if variance exceeds R50
    if (Math.abs(variance) > 50) {
        summaryEl.className = 'cash-summary warning';
        warningEl.style.display = 'block';
    } else {
        summaryEl.className = 'cash-summary';
        warningEl.style.display = 'none';
    }
}

async function closeTillSession(confirmed, approvalPin) {
    if (!currentTillSession) {
        showToast('Error', 'No active till session', 'error');
        return;
    }

    // Guard against accidental day-session close — require explicit confirmation
    if (!confirmed) {
        _originShowConfirm(
            'Close today\'s session? This ends trading for the day and runs the cash-up. Only do this at day end.',
            function () { closeTillSession(true); },
            { title: 'Close Day Session?', confirmText: 'Yes, Close The Day', cancelText: 'Cancel', icon: 'fa-lock', type: 'warning' }
        );
        return;
    }

    const denominations = {
        r200: parseInt(document.getElementById('denom_r200')?.value) || 0,
        r100: parseInt(document.getElementById('denom_r100')?.value) || 0,
        r50: parseInt(document.getElementById('denom_r50')?.value) || 0,
        r20: parseInt(document.getElementById('denom_r20')?.value) || 0,
        r10: parseInt(document.getElementById('denom_r10')?.value) || 0,
        r5: parseInt(document.getElementById('denom_r5')?.value) || 0,
        r2: parseInt(document.getElementById('denom_r2')?.value) || 0,
        r1: parseInt(document.getElementById('denom_r1')?.value) || 0,
        c50: parseInt(document.getElementById('denom_c50')?.value) || 0,
        c20: parseInt(document.getElementById('denom_c20')?.value) || 0,
        c10: parseInt(document.getElementById('denom_c10')?.value) || 0,
        c5: parseInt(document.getElementById('denom_c5')?.value) || 0
    };

    const closingNotes = document.getElementById('closingNotes')?.value || '';
    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');

    try {
        const res = await fetch(`${API_URL}/pos/till/close`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentTillSession._id,
                denominations,
                closingNotes,
                approvalPin
            })
        });

        const data = await res.json();

        if (data.success) {
            const session = data.session;
            const closedSessionId = currentTillSession._id;
            currentTillSession = null;
            updateTillStatusUI(false);
            closeModal('closeShiftModal');
            showDayEndReport(closedSessionId, session);
        } else if (data.requiresApproval) {
            // Variance over R50 — get a manager/admin PIN, then resubmit
            promptManagerPin(data.message, function (pin) {
                const notes = document.getElementById('closingNotes');
                if (notes && !notes.value.trim()) { showToast('Note Required', 'Add a closing note explaining the variance', 'warning'); return; }
                closeTillSession(true, pin);
            });
        } else {
            showToast('Error', data.message || 'Failed to close shift', 'error');
        }
    } catch (error) {
        showToast('Error', 'Failed to close shift', 'error');
    }
}

// Manager/admin PIN prompt for variance approval
function promptManagerPin(message, onPin) {
    document.getElementById('mgrPinModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'mgrPinModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10020;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:18px;width:92%;max-width:380px;overflow:hidden;">
            <div style="background:rgba(220,38,38,0.14);padding:16px 20px;border-bottom:1px solid #2a2a2a;color:#FAFAFA;font-weight:700;">Manager Approval Needed</div>
            <div style="padding:18px 20px;display:flex;flex-direction:column;gap:12px;">
                <div style="font-size:0.85rem;color:#ccc;">${message || 'Variance exceeds R50 — a manager/admin PIN is required to close.'}</div>
                <input id="mgrPinInput" type="password" inputmode="numeric" placeholder="••••••" style="padding:13px;font-size:1.3rem;letter-spacing:6px;text-align:center;background:#1d1d1d;border:1px solid #DC2626;border-radius:10px;color:#FAFAFA;">
            </div>
            <div style="display:flex;gap:10px;padding:0 20px 20px;">
                <button onclick="document.getElementById('mgrPinModal').remove()" style="flex:1;padding:13px;background:#262626;border:none;border-radius:11px;color:#FAFAFA;font-weight:600;cursor:pointer;">Cancel</button>
                <button id="mgrPinGo" style="flex:2;padding:13px;background:#DC2626;border:none;border-radius:11px;color:#fff;font-weight:700;cursor:pointer;">Approve & Close</button>
            </div>
        </div>`;
    document.body.appendChild(modal);
    document.getElementById('mgrPinGo').addEventListener('click', function () {
        const pin = document.getElementById('mgrPinInput').value;
        if (!pin) return;
        modal.remove();
        onPin(pin);
    });
}

// ==========================================
// DAY-END REPORT (PDF / CSV / auto-email)
// ==========================================
function showDayEndReport(sessionId, session) {
    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token') || '';
    const base = `${API_URL}/pos/till/${sessionId}`;
    const variance = session.variance || 0;
    document.getElementById('dayEndReportModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'dayEndReportModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10010;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `
        <div style="background:#141414;border:1px solid #2a2a2a;border-radius:18px;width:94%;max-width:440px;overflow:hidden;">
            <div style="background:rgba(201,168,76,0.14);padding:18px 20px;text-align:center;border-bottom:1px solid #2a2a2a;">
                <div style="font-size:1.3rem;font-weight:700;color:#FAFAFA;">Day Closed ✓</div>
                <div style="font-size:0.82rem;color:#888;margin-top:3px;">Z-Report ready</div>
            </div>
            <div style="padding:16px 20px;font-size:0.9rem;color:#ccc;">
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Total Sales</span><b style="color:#C9A84C;">R${(session.totalSales||0).toFixed(2)}</b></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Cash</span><span>R${(session.totalCash||0).toFixed(2)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>Card</span><span>R${(session.totalCard||0).toFixed(2)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;"><span>EFT</span><span>R${(session.totalEFT||0).toFixed(2)}</span></div>
                <div style="display:flex;justify-content:space-between;padding:4px 0;border-top:1px solid #2a2a2a;margin-top:4px;"><span>Variance</span><b style="color:${Math.abs(variance)>50?'#DC2626':'#22C55E'};">R${variance.toFixed(2)}</b></div>
                <div id="dayEndEmailMsg" style="font-size:0.8rem;color:#888;margin-top:10px;text-align:center;">Emailing report…</div>
            </div>
            <div style="display:flex;gap:10px;padding:0 20px 14px;">
                <button onclick="window.open('${base}/zreport.pdf?token=${encodeURIComponent(token)}','_blank')" style="flex:1;padding:13px;background:#262626;border:none;border-radius:11px;color:#FAFAFA;font-weight:600;cursor:pointer;"><i class="fas fa-file-pdf"></i> PDF</button>
                <button onclick="window.open('${base}/zreport.csv?token=${encodeURIComponent(token)}','_blank')" style="flex:1;padding:13px;background:#262626;border:none;border-radius:11px;color:#FAFAFA;font-weight:600;cursor:pointer;"><i class="fas fa-file-csv"></i> CSV</button>
            </div>
            <div style="padding:0 20px 20px;">
                <button onclick="document.getElementById('dayEndReportModal').remove()" style="width:100%;padding:13px;background:#C9A84C;border:none;border-radius:11px;color:#1A1A1A;font-weight:700;cursor:pointer;">Done</button>
            </div>
        </div>`;
    document.body.appendChild(modal);

    // Auto-email the report to the configured recipients
    fetch(`${base}/email-report`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({})
    }).then(r => r.json()).then(d => {
        const el = document.getElementById('dayEndReportMsg') || document.getElementById('dayEndEmailMsg');
        if (el) el.textContent = d.success ? ('✓ Emailed to ' + (d.recipients || []).join(', ')) : 'Email failed — use Download buttons';
        if (el && d.success) el.style.color = '#22C55E';
    }).catch(() => {
        const el = document.getElementById('dayEndEmailMsg');
        if (el) el.textContent = 'Email failed — use Download buttons';
    });
}

// ==========================================
// BREAK MANAGEMENT
// ==========================================
let onBreak = false;

async function toggleBreak() {
    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');

    if (onBreak) {
        // End break
        try {
            const res = await fetch(`${API_URL}/staff-shifts/break/end`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            const data = await res.json();
            if (data.success) {
                onBreak = false;
                updateBreakUI(false);
                showToast('Break Ended', 'Welcome back!', 'success');
            }
        } catch (error) {
            showToast('Error', 'Failed to end break', 'error');
        }
    } else {
        // Start break
        try {
            const res = await fetch(`${API_URL}/staff-shifts/break/start`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ type: 'short' })
            });
            const data = await res.json();
            if (data.success) {
                onBreak = true;
                updateBreakUI(true);
                showToast('On Break', 'Enjoy your break!', 'info');
            }
        } catch (error) {
            showToast('Error', 'Failed to start break', 'error');
        }
    }
}

function updateBreakUI(isOnBreak) {
    const btn = document.getElementById('breakBtn');
    if (!btn) return;

    if (isOnBreak) {
        btn.style.background = 'var(--gold)';
        btn.innerHTML = '<i class="fas fa-play"></i>';
        btn.title = 'End Break';
    } else {
        btn.style.background = 'rgba(255,255,255,0.15)';
        btn.innerHTML = '<i class="fas fa-mug-hot"></i>';
        btn.title = 'Take Break';
    }
}

// ==========================================
// CASH IN/OUT OPERATIONS
// ==========================================
let currentCashOperation = null;

function showCashInModal() {
    if (!currentTillSession) {
        showToast('No Active Shift', 'Open a shift first', 'error');
        return;
    }
    currentCashOperation = 'in';
    document.getElementById('cashOperationTitle').textContent = 'Cash In';
    document.getElementById('cashOperationIcon').className = 'fas fa-arrow-down';
    document.getElementById('cashOperationIcon').style.color = 'var(--green)';
    document.getElementById('cashOperationDesc').textContent = 'Add cash to the till drawer';
    document.getElementById('cashOperationAmount').value = '';
    document.getElementById('cashOperationReason').value = '';
    document.getElementById('cashOperationModal').style.display = 'flex';
}

function showCashOutModal() {
    if (!currentTillSession) {
        showToast('No Active Shift', 'Open a shift first', 'error');
        return;
    }
    currentCashOperation = 'out';
    document.getElementById('cashOperationTitle').textContent = 'Cash Out';
    document.getElementById('cashOperationIcon').className = 'fas fa-arrow-up';
    document.getElementById('cashOperationIcon').style.color = 'var(--red)';
    document.getElementById('cashOperationDesc').textContent = 'Remove cash from the till drawer';
    document.getElementById('cashOperationAmount').value = '';
    document.getElementById('cashOperationReason').value = '';
    document.getElementById('cashOperationModal').style.display = 'flex';
}

async function submitCashOperation() {
    const amount = parseFloat(document.getElementById('cashOperationAmount').value);
    const reason = document.getElementById('cashOperationReason').value;

    if (!amount || amount <= 0) {
        showToast('Invalid Amount', 'Enter a valid amount', 'error');
        return;
    }

    if (!reason) {
        showToast('Reason Required', 'Please provide a reason', 'error');
        return;
    }

    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
    const endpoint = currentCashOperation === 'in' ? 'cash-in' : 'cash-out';

    try {
        const res = await fetch(`${API_URL}/pos/till/${endpoint}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                sessionId: currentTillSession._id,
                amount,
                reason
            })
        });

        const data = await res.json();

        if (data.success) {
            closeModal('cashOperationModal');
            showToast(currentCashOperation === 'in' ? 'Cash Added' : 'Cash Removed', `R${amount.toFixed(2)} recorded`, 'success');
            // Refresh till status
            checkTillStatus();
        } else {
            showToast('Error', data.message || 'Failed to record cash operation', 'error');
        }
    } catch (error) {
        showToast('Error', 'Failed to record cash operation', 'error');
    }
}

// ==========================================
// SHIFT SUMMARY
// ==========================================
async function showShiftSummary() {
    if (!currentTillSession) {
        showToast('No Active Shift', 'Open a shift to see summary', 'info');
        return;
    }

    // Refresh till status to get latest data
    await checkTillStatus();

    if (!currentTillSession) return;

    const session = currentTillSession;

    // Calculate duration
    const startTime = new Date(session.openedAt);
    const now = new Date();
    const durationMs = now - startTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));

    // Update summary modal
    document.getElementById('shiftSummaryTime').textContent = `Shift started at ${startTime.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' })}`;
    document.getElementById('shiftSummaryDuration').textContent = `${hours}h ${minutes}m`;
    document.getElementById('summaryTransactions').textContent = session.transactionCount || 0;
    document.getElementById('summaryTotalSales').textContent = `R ${(session.totalSales || 0).toFixed(2)}`;
    document.getElementById('summaryCash').textContent = `R ${(session.totalCash || 0).toFixed(2)}`;
    document.getElementById('summaryCard').textContent = `R ${(session.totalCard || 0).toFixed(2)}`;
    document.getElementById('summaryInstapay').textContent = `R ${(session.totalInstapay || 0).toFixed(2)}`;
    document.getElementById('summaryEFT').textContent = `R ${(session.totalEFT || 0).toFixed(2)}`;

    // Voided/refunded transparency — count + amount from today's sales
    try {
        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
        const branchId = getSelectedBranchId();
        const r = await fetch(`${API_URL}/pos/sales/today?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${token}` } });
        const d = await r.json();
        const voided = (d.sales || []).filter(s => s.status === 'voided' || s.status === 'refunded');
        const vAmt = voided.reduce((a, s) => a + (s.totalAmount || 0), 0);
        const el = document.getElementById('summaryVoided');
        if (el) el.textContent = `${voided.length} · R ${vAmt.toFixed(2)}`;
    } catch (e) { /* non-fatal */ }

    document.getElementById('shiftSummaryModal').style.display = 'flex';
}
