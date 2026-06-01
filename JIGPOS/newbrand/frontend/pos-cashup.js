// ===== POS CASHUP MODULE =====
// Daily cashup, cash counting, safe drops, banking, stock reconciliation

const DAY_END_ROLES = ['super_admin', 'owner', 'admin', 'branch_manager'];

let currentCashup = null;
let cashupDenominations = {
    r200: 0, r100: 0, r50: 0, r20: 0, r10: 0, r5: 0,
    r2: 0, r1: 0, c50: 0, c20: 0, c10: 0, c5: 0
};

// ==========================================
// DAY END ENTRY POINT
// ==========================================

async function openDayEnd() {
    // Navigate to dedicated day-end wizard page
    window.location.href = 'day-end.html';

    // Switch to status tab first (ensures tab divs are visible)
    switchDayEndTab('status');

    // Show loading state inside the status tab (not replacing the whole content area)
    document.getElementById('deTab_status').innerHTML = `
        <div style="text-align: center; padding: 40px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 2rem; color: var(--green);"></i>
            <p style="margin-top: 12px; color: #666;">Loading day end data...</p>
        </div>`;

    await loadTodayCashup();
}

function closeDayEndModal() {
    document.getElementById('dayEndModal').style.display = 'none';
}

// ==========================================
// TAB NAVIGATION
// ==========================================

function switchDayEndTab(tab) {
    // Update tab buttons
    document.querySelectorAll('.de-tab-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tab === tab);
    });

    // Update tab content
    document.querySelectorAll('.de-tab-content').forEach(el => {
        el.style.display = el.id === `deTab_${tab}` ? 'block' : 'none';
    });
}

// ==========================================
// LOAD TODAY'S CASHUP STATUS
// ==========================================

async function loadTodayCashup() {
    try {
        const token = getToken();
        const branchId = getSelectedBranchId();

        const res = await fetch(`${API_URL}/pos/cashup/today?branchId=${branchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        if (!data.success) {
            showToast(data.message || 'Failed to load cashup', 'error');
            return;
        }

        if (data.cashup) {
            // Existing cashup found
            currentCashup = data.cashup;
            renderCashupStatus(data.cashup);
            renderSalesSummary(data.cashup);
            renderCashCount(data.cashup);
            renderSafeDrops(data.cashup);
            loadStockReconciliation();
        } else {
            // No cashup yet — show till status
            currentCashup = null;
            renderPreCashupStatus(data.tillSummary, data.message);
        }
    } catch (error) {
        console.error('Load cashup error:', error);
        document.getElementById('deTab_status').innerHTML = `
            <div style="text-align: center; padding: 40px; color: var(--red);">
                <i class="fas fa-exclamation-triangle" style="font-size: 2rem;"></i>
                <p style="margin-top: 12px;">Failed to load day end data</p>
                <p style="font-size: 0.8rem; color: #999; margin-top: 6px;">${error.message || 'Unknown error'}</p>
            </div>`;
    }
}

// ==========================================
// RENDER: PRE-CASHUP (tills still open / ready to start)
// ==========================================

function renderPreCashupStatus(tillSummary, message) {
    const statusEl = document.getElementById('deTab_status');
    const hasOpenTills = tillSummary && tillSummary.openSessions > 0;
    const hasClosedTills = tillSummary && tillSummary.closedSessions > 0;

    let sessionsHtml = '';
    if (tillSummary && tillSummary.sessions && tillSummary.sessions.length > 0) {
        sessionsHtml = tillSummary.sessions.map(s => {
            const statusClass = s.status === 'open' ? 'color: var(--gold); font-weight: 700;' : 'color: var(--green); font-weight: 700;';
            const openedBy = s.openedBy ? `${s.openedBy.firstName} ${s.openedBy.lastName}` : 'Unknown';
            const openTime = new Date(s.openedAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
            return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 10px; background: white; border-radius: 8px; margin-bottom: 6px;">
                <div>
                    <strong>${s.tillNumber || 'Till'}</strong>
                    <span style="color: #999; font-size: 0.85rem; margin-left: 8px;">${openedBy} @ ${openTime}</span>
                </div>
                <span style="${statusClass}">${s.status === 'open' ? 'OPEN' : 'CLOSED'}</span>
            </div>`;
        }).join('');
    }

    statusEl.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <i class="fas ${hasOpenTills ? 'fa-exclamation-circle' : 'fa-check-circle'}"
               style="font-size: 3rem; color: ${hasOpenTills ? 'var(--gold)' : 'var(--green)'}; margin-bottom: 10px;"></i>
            <h3 style="font-family: 'Barlow Condensed', sans-serif; color: var(--green-deep); font-size: 1.3rem; text-transform: uppercase;">${message || 'Till Status'}</h3>
        </div>

        ${sessionsHtml ? `
        <div style="margin-bottom: 20px;">
            <div style="font-weight: 600; margin-bottom: 8px; font-size: 0.9rem; color: #666;">Today's Till Sessions</div>
            ${sessionsHtml}
        </div>` : `
        <div style="text-align: center; padding: 20px; background: var(--cream); border-radius: 10px; margin-bottom: 20px;">
            <p style="color: #666;">No till sessions today</p>
        </div>`}

        ${!hasOpenTills && hasClosedTills ? `
        <button onclick="startDailyCashup()" style="width: 100%; padding: 16px; background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%); color: white; border: none; border-radius: 12px; font-size: 1.1rem; font-weight: 700; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase; letter-spacing: 1px;">
            <i class="fas fa-calculator"></i> Start Daily Cashup
        </button>` : ''}
    `;

    // Disable other tabs when no cashup exists
    document.querySelectorAll('.de-tab-btn').forEach(btn => {
        if (btn.dataset.tab !== 'status') {
            btn.style.opacity = currentCashup ? '1' : '0.4';
            btn.style.pointerEvents = currentCashup ? 'auto' : 'none';
        }
    });
}

// ==========================================
// START DAILY CASHUP
// ==========================================

async function startDailyCashup() {
    try {
        const token = getToken();
        const branchId = getSelectedBranchId();

        const res = await fetch(`${API_URL}/pos/cashup/start`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ branchId })
        });

        const data = await res.json();

        if (data.success) {
            currentCashup = data.cashup;
            showToast('Daily cashup started', 'success');

            // Enable all tabs
            document.querySelectorAll('.de-tab-btn').forEach(btn => {
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'auto';
            });

            renderCashupStatus(data.cashup);
            renderSalesSummary(data.cashup);
            renderCashCount(data.cashup);
            renderSafeDrops(data.cashup);
            loadStockReconciliation();
        } else {
            showToast(data.message || 'Failed to start cashup', 'error');
        }
    } catch (error) {
        console.error('Start cashup error:', error);
        showToast('Error starting cashup', 'error');
    }
}

// ==========================================
// RENDER: CASHUP STATUS
// ==========================================

function renderCashupStatus(cashup) {
    const statusEl = document.getElementById('deTab_status');
    const statusColors = {
        draft: { bg: 'var(--gold)', icon: 'fa-edit', label: 'Draft' },
        submitted: { bg: '#3B82F6', icon: 'fa-paper-plane', label: 'Submitted' },
        approved: { bg: 'var(--green)', icon: 'fa-check-circle', label: 'Approved' },
        rejected: { bg: 'var(--red)', icon: 'fa-times-circle', label: 'Rejected' }
    };

    const s = statusColors[cashup.status] || statusColors.draft;
    const preparedBy = cashup.preparedBy ? `${cashup.preparedBy.firstName || ''} ${cashup.preparedBy.lastName || ''}`.trim() : 'Unknown';
    const cashupDate = new Date(cashup.date).toLocaleDateString('en-ZA', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });

    statusEl.innerHTML = `
        <div style="text-align: center; margin-bottom: 20px;">
            <div style="display: inline-block; background: ${s.bg}; color: white; padding: 8px 20px; border-radius: 20px; font-weight: 700; font-size: 0.9rem; margin-bottom: 10px;">
                <i class="fas ${s.icon}"></i> ${s.label}
            </div>
            <h3 style="font-family: 'Barlow Condensed', sans-serif; color: var(--green-deep); font-size: 1.3rem; text-transform: uppercase;">
                ${cashup.cashupNumber || 'Daily Cashup'}
            </h3>
            <p style="color: #666; font-size: 0.85rem;">${cashupDate}</p>
            <p style="color: #999; font-size: 0.8rem;">Prepared by: ${preparedBy}</p>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-bottom: 20px;">
            <div style="background: white; padding: 14px; border-radius: 10px; text-align: center;">
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; color: var(--green);">R${(cashup.totalSales || 0).toFixed(2)}</div>
                <div style="font-size: 0.8rem; color: #666;">Total Sales</div>
            </div>
            <div style="background: white; padding: 14px; border-radius: 10px; text-align: center;">
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; color: var(--green);">${cashup.totalTransactions || 0}</div>
                <div style="font-size: 0.8rem; color: #666;">Transactions</div>
            </div>
            <div style="background: white; padding: 14px; border-radius: 10px; text-align: center;">
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; color: ${(cashup.totalVariance || 0) < 0 ? 'var(--red)' : 'var(--green)'};">
                    ${(cashup.totalVariance || 0) >= 0 ? '+' : ''}R${(cashup.totalVariance || 0).toFixed(2)}
                </div>
                <div style="font-size: 0.8rem; color: #666;">Variance</div>
            </div>
            <div style="background: white; padding: 14px; border-radius: 10px; text-align: center;">
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.8rem; color: var(--green);">${(cashup.tillSessions || []).length}</div>
                <div style="font-size: 0.8rem; color: #666;">Till Sessions</div>
            </div>
        </div>

        ${cashup.status === 'draft' ? `
        <div style="display: flex; gap: 10px;">
            <button onclick="submitCurrentCashup()" style="flex: 1; padding: 14px; background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%); color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer; font-family: 'Barlow Condensed', sans-serif; text-transform: uppercase; letter-spacing: 1px;">
                <i class="fas fa-paper-plane"></i> Submit for Approval
            </button>
        </div>` : ''}

        ${cashup.status === 'rejected' ? `
        <div style="background: rgba(220, 38, 38, 0.1); border: 1px solid var(--red); padding: 14px; border-radius: 10px; margin-bottom: 16px;">
            <div style="font-weight: 700; color: var(--red); margin-bottom: 4px;"><i class="fas fa-times-circle"></i> Rejected</div>
            <div style="font-size: 0.85rem; color: #666;">${cashup.approvalNotes || 'No reason given'}</div>
        </div>` : ''}
    `;

    // Enable all tabs when cashup exists
    document.querySelectorAll('.de-tab-btn').forEach(btn => {
        btn.style.opacity = '1';
        btn.style.pointerEvents = 'auto';
    });
}

// ==========================================
// RENDER: SALES SUMMARY
// ==========================================

function renderSalesSummary(cashup) {
    const el = document.getElementById('deTab_sales');
    el.innerHTML = `
        <div style="margin-bottom: 16px;">
            <div style="font-weight: 700; font-size: 1rem; color: var(--green-deep); margin-bottom: 12px;">
                <i class="fas fa-receipt"></i> Payment Breakdown
            </div>
            <div style="background: white; border-radius: 10px; overflow: hidden;">
                ${renderSalesRow('Cash', cashup.cashSales || 0, 'fa-money-bill-wave', 'var(--green)')}
                ${renderSalesRow('Card', cashup.cardSales || 0, 'fa-credit-card', '#3B82F6')}
                ${renderSalesRow('EFT', cashup.eftSales || 0, 'fa-university', '#8B5CF6')}
                ${renderSalesRow('InstaPay', cashup.instapaySales || 0, 'fa-bolt', 'var(--gold)')}
            </div>
        </div>

        <div style="background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%); padding: 16px; border-radius: 10px; text-align: center; color: white; margin-bottom: 16px;">
            <div style="font-size: 0.85rem; opacity: 0.8;">Total Sales</div>
            <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 2rem;">R${(cashup.totalSales || 0).toFixed(2)}</div>
            <div style="font-size: 0.8rem; opacity: 0.7;">${cashup.totalTransactions || 0} transactions</div>
        </div>

        ${(cashup.totalRefunds || 0) > 0 ? `
        <div style="background: rgba(220, 38, 38, 0.1); padding: 14px; border-radius: 10px; border-left: 4px solid var(--red);">
            <div style="display: flex; justify-content: space-between; align-items: center;">
                <div>
                    <div style="font-weight: 600; color: var(--red);"><i class="fas fa-undo"></i> Refunds</div>
                    <div style="font-size: 0.8rem; color: #666;">${cashup.refundCount || 0} refunds processed</div>
                </div>
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.4rem; color: var(--red);">-R${(cashup.totalRefunds || 0).toFixed(2)}</div>
            </div>
        </div>` : ''}

        <div style="margin-top: 16px;">
            <div style="font-weight: 700; font-size: 1rem; color: var(--green-deep); margin-bottom: 12px;">
                <i class="fas fa-cash-register"></i> Cash Flow
            </div>
            <div style="background: white; border-radius: 10px; overflow: hidden;">
                ${renderSalesRow('Opening Float', cashup.totalOpeningFloat || 0, 'fa-coins', 'var(--green)')}
                ${renderSalesRow('Cash Sales', cashup.cashSales || 0, 'fa-plus', 'var(--green)')}
                ${renderSalesRow('Cash Refunds', -(cashup.totalRefunds || 0), 'fa-minus', 'var(--red)')}
                ${renderSalesRow('Safe Drops', -(cashup.totalSafeDrops || 0), 'fa-vault', '#8B5CF6')}
            </div>
            <div style="background: var(--cream); padding: 14px; border-radius: 10px; margin-top: 8px; display: flex; justify-content: space-between; align-items: center; border: 2px solid var(--green);">
                <span style="font-weight: 700;">Expected Cash in Till</span>
                <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; color: var(--green);">R${(cashup.totalExpectedCash || 0).toFixed(2)}</span>
            </div>
        </div>
    `;
}

function renderSalesRow(label, amount, icon, color) {
    const isNeg = amount < 0;
    return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px 14px; border-bottom: 1px solid #f0ece4;">
        <div style="display: flex; align-items: center; gap: 10px;">
            <i class="fas ${icon}" style="color: ${color}; width: 20px; text-align: center;"></i>
            <span style="font-weight: 500;">${label}</span>
        </div>
        <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; color: ${isNeg ? 'var(--red)' : 'var(--green-deep)'};">
            ${isNeg ? '-' : ''}R${Math.abs(amount).toFixed(2)}
        </span>
    </div>`;
}

// ==========================================
// RENDER: CASH COUNT (Denomination Counting)
// ==========================================

function renderCashCount(cashup) {
    const el = document.getElementById('deTab_cash');
    const isEditable = cashup.status === 'draft';

    // Pre-fill from existing cashup
    if (cashup.managerCashCount) {
        Object.keys(cashupDenominations).forEach(key => {
            cashupDenominations[key] = cashup.managerCashCount[key] || 0;
        });
    }

    const denomData = [
        { key: 'r200', label: 'R200', value: 200 },
        { key: 'r100', label: 'R100', value: 100 },
        { key: 'r50', label: 'R50', value: 50 },
        { key: 'r20', label: 'R20', value: 20 },
        { key: 'r10', label: 'R10', value: 10 },
        { key: 'r5', label: 'R5', value: 5 },
        { key: 'r2', label: 'R2', value: 2 },
        { key: 'r1', label: 'R1', value: 1 },
        { key: 'c50', label: '50c', value: 0.50 },
        { key: 'c20', label: '20c', value: 0.20 },
        { key: 'c10', label: '10c', value: 0.10 },
        { key: 'c5', label: '5c', value: 0.05 }
    ];

    const denomRows = denomData.map(d => {
        const count = cashupDenominations[d.key] || 0;
        const total = (count * d.value).toFixed(2);
        return `<div style="display: grid; grid-template-columns: 60px 1fr 80px; gap: 8px; align-items: center; padding: 8px 0; border-bottom: 1px solid #f0ece4;">
            <span style="font-weight: 700; color: var(--green-deep);">${d.label}</span>
            <input type="number" min="0" value="${count}"
                   id="deCash_${d.key}"
                   onchange="updateCashupDenom('${d.key}', this.value)"
                   oninput="updateCashupDenom('${d.key}', this.value)"
                   ${!isEditable ? 'disabled' : ''}
                   style="width: 100%; padding: 8px 10px; border: 2px solid #222222; border-radius: 8px; font-size: 1rem; text-align: center; font-weight: 600; ${!isEditable ? 'opacity: 0.6;' : ''}">
            <span style="text-align: right; font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; color: var(--green);" id="deCashTotal_${d.key}">R${total}</span>
        </div>`;
    }).join('');

    const currentTotal = calculateCashupTotal();
    const expected = cashup.totalExpectedCash || 0;
    const variance = currentTotal - expected + (cashup.totalSafeDrops || 0);

    el.innerHTML = `
        <div style="font-weight: 700; font-size: 1rem; color: var(--green-deep); margin-bottom: 12px;">
            <i class="fas fa-calculator"></i> Manager Cash Count
        </div>

        <div style="background: white; border-radius: 10px; padding: 14px;">
            ${denomRows}
        </div>

        <div style="margin-top: 16px; display: grid; gap: 8px;">
            <div style="background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%); padding: 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; color: white;">
                <span style="font-weight: 600;">Counted Total</span>
                <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem;" id="deCashGrandTotal">R${currentTotal.toFixed(2)}</span>
            </div>
            <div style="background: var(--cream); padding: 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; border: 2px solid var(--green);">
                <span style="font-weight: 600;">Expected (incl. safe drops)</span>
                <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; color: var(--green);">R${expected.toFixed(2)}</span>
            </div>
            <div style="background: ${Math.abs(variance) > 100 ? 'rgba(220, 38, 38,0.1)' : Math.abs(variance) > 50 ? 'rgba(240, 165, 0,0.15)' : 'rgba(63, 192, 65,0.1)'}; padding: 14px; border-radius: 10px; display: flex; justify-content: space-between; align-items: center; border: 2px solid ${Math.abs(variance) > 100 ? 'var(--red)' : Math.abs(variance) > 50 ? 'var(--gold)' : 'var(--green)'};">
                <span style="font-weight: 600;">Variance</span>
                <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; color: ${variance < 0 ? 'var(--red)' : 'var(--green)'};" id="deCashVariance">
                    ${variance >= 0 ? '+' : ''}R${variance.toFixed(2)}
                </span>
            </div>
        </div>

        ${isEditable ? `
        <button onclick="saveCashCount()" style="width: 100%; margin-top: 16px; padding: 14px; background: var(--green); color: white; border: none; border-radius: 10px; font-weight: 700; font-size: 1rem; cursor: pointer;">
            <i class="fas fa-save"></i> Save Cash Count
        </button>` : ''}
    `;
}

function updateCashupDenom(key, val) {
    cashupDenominations[key] = parseInt(val) || 0;

    const denomValues = {
        r200: 200, r100: 100, r50: 50, r20: 20, r10: 10, r5: 5,
        r2: 2, r1: 1, c50: 0.50, c20: 0.20, c10: 0.10, c5: 0.05
    };

    const lineTotal = (cashupDenominations[key] * denomValues[key]).toFixed(2);
    const lineTotalEl = document.getElementById(`deCashTotal_${key}`);
    if (lineTotalEl) lineTotalEl.textContent = `R${lineTotal}`;

    const grandTotal = calculateCashupTotal();
    const grandEl = document.getElementById('deCashGrandTotal');
    if (grandEl) grandEl.textContent = `R${grandTotal.toFixed(2)}`;

    // Update variance
    if (currentCashup) {
        const expected = currentCashup.totalExpectedCash || 0;
        const variance = grandTotal - expected + (currentCashup.totalSafeDrops || 0);
        const varEl = document.getElementById('deCashVariance');
        if (varEl) {
            varEl.textContent = `${variance >= 0 ? '+' : ''}R${variance.toFixed(2)}`;
            varEl.style.color = variance < 0 ? 'var(--red)' : 'var(--green)';
        }
    }
}

function calculateCashupTotal() {
    const denomValues = {
        r200: 200, r100: 100, r50: 50, r20: 20, r10: 10, r5: 5,
        r2: 2, r1: 1, c50: 0.50, c20: 0.20, c10: 0.10, c5: 0.05
    };

    let total = 0;
    Object.keys(cashupDenominations).forEach(key => {
        total += (cashupDenominations[key] || 0) * denomValues[key];
    });
    return total;
}

// ==========================================
// SAVE CASH COUNT
// ==========================================

async function saveCashCount() {
    if (!currentCashup) {
        showToast('No active cashup', 'error');
        return;
    }

    try {
        const token = getToken();
        const res = await fetch(`${API_URL}/pos/cashup/${currentCashup._id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                managerCashCount: cashupDenominations
            })
        });

        const data = await res.json();
        if (data.success) {
            currentCashup = data.cashup;
            showToast('Cash count saved', 'success');
            renderCashupStatus(data.cashup);
        } else {
            showToast(data.message || 'Failed to save', 'error');
        }
    } catch (error) {
        console.error('Save cash count error:', error);
        showToast('Error saving cash count', 'error');
    }
}

// ==========================================
// RENDER: SAFE DROPS
// ==========================================

function renderSafeDrops(cashup) {
    const el = document.getElementById('deTab_drops');
    const isEditable = cashup.status === 'draft';

    const drops = cashup.safeDrops || [];
    const dropsHtml = drops.length > 0
        ? drops.map((drop, i) => {
            const time = new Date(drop.time).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
            return `<div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; background: white; border-radius: 8px; margin-bottom: 6px;">
                <div>
                    <span style="font-weight: 600;">Drop #${i + 1}</span>
                    <span style="color: #999; font-size: 0.85rem; margin-left: 8px;">${time}</span>
                    ${drop.notes ? `<div style="font-size: 0.8rem; color: #666; margin-top: 2px;">${drop.notes}</div>` : ''}
                </div>
                <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.2rem; color: var(--green);">R${(drop.amount || 0).toFixed(2)}</span>
            </div>`;
        }).join('')
        : '<div style="text-align: center; padding: 20px; color: #999;">No safe drops recorded</div>';

    el.innerHTML = `
        <div style="font-weight: 700; font-size: 1rem; color: var(--green-deep); margin-bottom: 12px;">
            <i class="fas fa-vault"></i> Safe Drops
        </div>

        ${dropsHtml}

        <div style="background: var(--cream); padding: 14px; border-radius: 10px; margin: 12px 0; display: flex; justify-content: space-between; align-items: center; border: 2px solid var(--green);">
            <span style="font-weight: 700;">Total Safe Drops</span>
            <span style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem; color: var(--green);">R${(cashup.totalSafeDrops || 0).toFixed(2)}</span>
        </div>

        ${isEditable ? `
        <div style="margin-top: 16px; font-weight: 700; font-size: 0.9rem; color: var(--green-deep); margin-bottom: 10px;">
            <i class="fas fa-plus-circle"></i> Record New Safe Drop
        </div>
        <div style="background: white; padding: 14px; border-radius: 10px;">
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.85rem;">Amount (R)</label>
                <input type="number" id="safeDropAmount" min="0" step="10" placeholder="0.00"
                       style="width: 100%; padding: 10px; border: 2px solid #222222; border-radius: 8px; font-size: 1.1rem; text-align: center; font-weight: 700;">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.85rem;">Notes (optional)</label>
                <input type="text" id="safeDropNotes" placeholder="Reason for safe drop..."
                       style="width: 100%; padding: 10px; border: 2px solid #222222; border-radius: 8px; font-size: 0.9rem;">
            </div>
            <button onclick="recordSafeDrop()" style="width: 100%; padding: 12px; background: var(--green); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
                <i class="fas fa-vault"></i> Record Drop
            </button>
        </div>` : ''}

        <div style="margin-top: 20px; font-weight: 700; font-size: 1rem; color: var(--green-deep); margin-bottom: 12px;">
            <i class="fas fa-landmark"></i> Banking
        </div>
        <div style="background: white; padding: 14px; border-radius: 10px;">
            <div style="margin-bottom: 10px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.85rem;">Banking Amount (R)</label>
                <input type="number" id="bankingAmount" min="0" step="10" placeholder="0.00"
                       value="${cashup.bankingAmount || ''}"
                       ${!isEditable ? 'disabled' : ''}
                       style="width: 100%; padding: 10px; border: 2px solid #222222; border-radius: 8px; font-size: 1.1rem; text-align: center; font-weight: 700; ${!isEditable ? 'opacity: 0.6;' : ''}">
            </div>
            <div style="margin-bottom: 12px;">
                <label style="display: block; margin-bottom: 4px; font-weight: 600; font-size: 0.85rem;">Reference</label>
                <input type="text" id="bankingReference" placeholder="Deposit reference..."
                       value="${cashup.bankingReference || ''}"
                       ${!isEditable ? 'disabled' : ''}
                       style="width: 100%; padding: 10px; border: 2px solid #222222; border-radius: 8px; font-size: 0.9rem; ${!isEditable ? 'opacity: 0.6;' : ''}">
            </div>
            ${isEditable ? `
            <button onclick="saveBanking()" style="width: 100%; padding: 12px; background: var(--green); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
                <i class="fas fa-save"></i> Save Banking
            </button>` : ''}
        </div>
    `;
}

// ==========================================
// RECORD SAFE DROP
// ==========================================

async function recordSafeDrop() {
    if (!currentCashup) {
        showToast('No active cashup', 'error');
        return;
    }

    const amount = parseFloat(document.getElementById('safeDropAmount').value);
    const notes = document.getElementById('safeDropNotes').value;

    if (!amount || amount <= 0) {
        showToast('Enter a valid amount', 'error');
        return;
    }

    try {
        const token = getToken();
        const res = await fetch(`${API_URL}/pos/cashup/${currentCashup._id}/safe-drop`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ amount, notes })
        });

        const data = await res.json();
        if (data.success) {
            showToast(`Safe drop of R${amount.toFixed(2)} recorded`, 'success');
            // Reload cashup to get updated data
            await loadTodayCashup();
            switchDayEndTab('drops');
        } else {
            showToast(data.message || 'Failed to record safe drop', 'error');
        }
    } catch (error) {
        console.error('Safe drop error:', error);
        showToast('Error recording safe drop', 'error');
    }
}

// ==========================================
// SAVE BANKING
// ==========================================

async function saveBanking() {
    if (!currentCashup) {
        showToast('No active cashup', 'error');
        return;
    }

    const bankingAmount = parseFloat(document.getElementById('bankingAmount').value) || 0;
    const bankingReference = document.getElementById('bankingReference').value;

    try {
        const token = getToken();
        const res = await fetch(`${API_URL}/pos/cashup/${currentCashup._id}`, {
            method: 'PUT',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ bankingAmount, bankingReference })
        });

        const data = await res.json();
        if (data.success) {
            currentCashup = data.cashup;
            showToast('Banking details saved', 'success');
        } else {
            showToast(data.message || 'Failed to save banking', 'error');
        }
    } catch (error) {
        console.error('Save banking error:', error);
        showToast('Error saving banking', 'error');
    }
}

// ==========================================
// SUBMIT CASHUP FOR APPROVAL
// ==========================================

async function submitCurrentCashup() {
    if (!currentCashup) {
        showToast('No active cashup', 'error');
        return;
    }

    if (currentCashup.managerCashTotal === 0 && calculateCashupTotal() === 0) {
        showToast('Complete the cash count first', 'warning');
        switchDayEndTab('cash');
        return;
    }

    // Save cash count first if not saved
    if (calculateCashupTotal() > 0 && currentCashup.managerCashTotal !== calculateCashupTotal()) {
        await saveCashCount();
    }

    // ── High-Value Stocktake Gate ──────────────────
    // Block cashup submission if daily high-value count hasn't been done
    try {
        const branchId = getSelectedBranchId();
        if (branchId) {
            const compRes = await fetch(`${API_URL}/stocktake/compliance/${branchId}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const compData = await compRes.json();

            if (compData.success && !compData.compliance.dailyHighValue.completedToday) {
                // Show blocking modal
                showStocktakeGateModal();
                return;
            }
        }
    } catch (compError) {
        console.warn('Stocktake compliance check failed, allowing cashup:', compError);
        // Don't block cashup if compliance check itself fails
    }

    // Check variance
    const variance = (currentCashup.managerCashTotal || calculateCashupTotal()) - (currentCashup.totalExpectedCash || 0) + (currentCashup.totalSafeDrops || 0);

    if (Math.abs(variance) > 100) {
        // Show variance explanation form instead of browser prompt
        showVarianceExplanationForm(variance);
        return;
    }

    await doSubmitCashup('');
}

function showStocktakeGateModal() {
    // Remove existing if any
    const existing = document.getElementById('stocktakeGateOverlay');
    if (existing) existing.remove();

    const overlay = document.createElement('div');
    overlay.id = 'stocktakeGateOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.8);z-index:10000;display:flex;align-items:center;justify-content:center;padding:20px;';
    overlay.innerHTML = `
        <div style="background:#1A1A1A;border-radius:16px;max-width:420px;width:100%;border:2px solid #ef4444;overflow:hidden;">
            <div style="background:linear-gradient(135deg,#ef4444 0%,#dc2626 100%);padding:20px;text-align:center;">
                <i class="fas fa-lock" style="font-size:2.5rem;color:white;margin-bottom:8px;display:block;"></i>
                <h3 style="color:white;font-family:'Barlow Condensed',sans-serif;font-size:1.3rem;text-transform:uppercase;letter-spacing:1px;margin:0;">
                    Daily Stock Count Required
                </h3>
            </div>
            <div style="padding:24px;">
                <p style="color:#ccc;font-size:0.95rem;line-height:1.5;margin-bottom:16px;">
                    You cannot submit the day-end cashup until the <strong style="color:#ef4444;">daily high-value stock count</strong> has been completed and submitted.
                </p>
                <div style="background:rgba(63,192,65,0.1);border:1px solid rgba(63,192,65,0.3);border-radius:10px;padding:14px;margin-bottom:16px;">
                    <div style="font-weight:700;color:#C9A84C;font-size:0.85rem;margin-bottom:8px;">
                        <i class="fas fa-clipboard-list"></i> Required Categories:
                    </div>
                    <div style="display:flex;gap:8px;flex-wrap:wrap;">
                        <span style="padding:4px 10px;background:rgba(63,192,65,0.2);border-radius:6px;font-size:0.8rem;color:#C9A84C;">Flower</span>
                        <span style="padding:4px 10px;background:rgba(63,192,65,0.2);border-radius:6px;font-size:0.8rem;color:#C9A84C;">Pre-rolls</span>
                        <span style="padding:4px 10px;background:rgba(63,192,65,0.2);border-radius:6px;font-size:0.8rem;color:#C9A84C;">Concentrates</span>
                    </div>
                </div>
                <div style="display:flex;gap:10px;">
                    <button onclick="document.getElementById('stocktakeGateOverlay').remove();"
                        style="flex:1;padding:14px;background:#222;color:white;border:none;border-radius:10px;font-weight:600;cursor:pointer;font-family:'Barlow',sans-serif;">
                        Close
                    </button>
                    <button onclick="document.getElementById('stocktakeGateOverlay').remove(); window.open('stocktake-app.html','_blank');"
                        style="flex:1;padding:14px;background:#C9A84C;color:white;border:none;border-radius:10px;font-weight:700;cursor:pointer;font-family:'Barlow Condensed',sans-serif;text-transform:uppercase;letter-spacing:0.5px;">
                        <i class="fas fa-clipboard-check"></i> Open Stock Take
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.appendChild(overlay);
}

function showVarianceExplanationForm(variance) {
    const statusEl = document.getElementById('deTab_status');
    const existingForm = document.getElementById('varianceExplanationForm');
    if (existingForm) existingForm.remove();

    const formHtml = document.createElement('div');
    formHtml.id = 'varianceExplanationForm';
    formHtml.style.cssText = 'background: rgba(220, 38, 38,0.08); border: 2px solid var(--red); padding: 16px; border-radius: 12px; margin-top: 16px;';
    formHtml.innerHTML = `
        <div style="font-weight: 700; color: var(--red); margin-bottom: 8px;">
            <i class="fas fa-exclamation-triangle"></i> Variance of R${variance.toFixed(2)} exceeds R100
        </div>
        <p style="font-size: 0.85rem; color: #666; margin-bottom: 12px;">An explanation is required before submission.</p>
        <textarea id="varianceExplanation" rows="3" placeholder="Explain the variance..."
                  style="width: 100%; padding: 10px; border: 2px solid #222222; border-radius: 8px; font-family: 'Barlow', sans-serif; font-size: 0.9rem; resize: vertical; box-sizing: border-box;"></textarea>
        <div style="display: flex; gap: 8px; margin-top: 10px;">
            <button onclick="document.getElementById('varianceExplanationForm').remove();"
                    style="flex: 1; padding: 10px; background: white; border: 2px solid #222222; border-radius: 8px; font-weight: 600; cursor: pointer;">
                Cancel
            </button>
            <button onclick="submitWithExplanation()"
                    style="flex: 1; padding: 10px; background: var(--green); color: white; border: none; border-radius: 8px; font-weight: 700; cursor: pointer;">
                <i class="fas fa-paper-plane"></i> Submit
            </button>
        </div>
    `;
    statusEl.appendChild(formHtml);
    document.getElementById('varianceExplanation').focus();
}

async function submitWithExplanation() {
    const explanation = document.getElementById('varianceExplanation').value.trim();
    if (!explanation) {
        showToast('Explanation is required', 'error');
        return;
    }
    await doSubmitCashup(explanation);
}

async function doSubmitCashup(discrepancyExplanation) {
    try {
        const token = getToken();
        const body = {};
        if (discrepancyExplanation) {
            body.discrepancyExplanation = discrepancyExplanation;
        }

        const res = await fetch(`${API_URL}/pos/cashup/${currentCashup._id}/submit`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        const data = await res.json();
        if (data.success) {
            currentCashup = data.cashup;
            showToast('Cashup submitted for approval', 'success');
            renderCashupStatus(data.cashup);
            renderCashCount(data.cashup);
            renderSafeDrops(data.cashup);
        } else {
            showToast(data.message || 'Failed to submit cashup', 'error');
        }
    } catch (error) {
        console.error('Submit cashup error:', error);
        showToast('Error submitting cashup', 'error');
    }
}

// ==========================================
// STOCK RECONCILIATION (The Smart Link)
// ==========================================

async function loadStockReconciliation() {
    const el = document.getElementById('deTab_stock');
    el.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--green);"></i>
            <p style="margin-top: 8px; color: #666;">Loading stock reconciliation...</p>
        </div>`;

    try {
        const token = getToken();
        const branchId = getSelectedBranchId();

        const res = await fetch(`${API_URL}/reconciliation/${branchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();

        if (!data.success) {
            el.innerHTML = `<div style="text-align: center; padding: 20px; color: var(--red);">${data.message || 'Failed to load reconciliation'}</div>`;
            return;
        }

        if (!data.hasBaseline) {
            el.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i class="fas fa-clipboard-question" style="font-size: 2.5rem; color: #ccc; margin-bottom: 10px;"></i>
                    <h3 style="font-family: 'Barlow Condensed', sans-serif; color: var(--green-deep); margin-bottom: 6px;">No Baseline Stocktake</h3>
                    <p style="color: #666; font-size: 0.9rem;">Complete and approve a stocktake to establish a baseline for reconciliation.</p>
                    <a href="stocktake-app.html" style="display: inline-block; margin-top: 12px; padding: 8px 20px; background: var(--green); color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.85rem;">Start Stocktake</a>
                </div>`;
            return;
        }

        renderStockReconciliation(data);
    } catch (error) {
        console.error('Stock reconciliation error:', error);
        el.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--red);">Error loading stock reconciliation</div>';
    }
}

function renderStockReconciliation(data) {
    const el = document.getElementById('deTab_stock');
    const items = data.items || [];
    const summary = data.summary || {};
    const baselineDate = new Date(data.baselineDate).toLocaleDateString('en-ZA', { day: 'numeric', month: 'short', year: 'numeric' });

    if (items.length === 0) {
        el.innerHTML = `
            <div style="text-align: center; padding: 30px;">
                <i class="fas fa-box-open" style="font-size: 2.5rem; color: #ccc; margin-bottom: 10px;"></i>
                <h3 style="font-family: 'Barlow Condensed', sans-serif; color: var(--green-deep); margin-bottom: 6px;">No Items to Reconcile</h3>
                <p style="color: #666; font-size: 0.9rem;">Baseline stocktake from ${baselineDate} had no items.</p>
            </div>`;
        return;
    }

    const discrepancies = items.filter(i => i.variance !== 0);
    const totalSold = items.reduce((sum, i) => sum + i.sold, 0);
    const fmtR = (v) => 'R' + Math.abs(v).toLocaleString('en-ZA', { minimumFractionDigits: 2 });

    let tableRows = items.map(item => {
        const hasVariance = item.variance !== 0;
        const rowBg = hasVariance ? 'background: rgba(220, 38, 38, 0.06);' : '';
        const varColor = item.variance > 0 ? 'var(--green)' : item.variance < 0 ? 'var(--red)' : 'var(--green)';
        return `<tr style="${rowBg}">
            <td style="padding: 10px 8px; border-bottom: 1px solid #f0ece4;">
                <div style="font-weight: 600; font-size: 0.85rem;">${item.name}</div>
                ${item.sku ? `<div style="font-size: 0.7rem; color: #999;">${item.sku}</div>` : ''}
            </td>
            <td style="padding: 10px 6px; border-bottom: 1px solid #f0ece4; text-align: center; font-weight: 600;">${item.baselineQty}</td>
            <td style="padding: 10px 6px; border-bottom: 1px solid #f0ece4; text-align: center; color: var(--red); font-weight: 600;">${item.sold > 0 ? '-' + item.sold : '0'}</td>
            <td style="padding: 10px 6px; border-bottom: 1px solid #f0ece4; text-align: center; color: var(--green); font-weight: 600;">${item.transferredIn > 0 ? '+' + item.transferredIn : '0'}</td>
            <td style="padding: 10px 6px; border-bottom: 1px solid #f0ece4; text-align: center; font-weight: 600;">${item.expected}</td>
            <td style="padding: 10px 6px; border-bottom: 1px solid #f0ece4; text-align: center; font-weight: 700;">${item.actual}</td>
            <td style="padding: 10px 6px; border-bottom: 1px solid #f0ece4; text-align: center; font-weight: 700; color: ${varColor};">
                ${hasVariance ? (item.variance > 0 ? '+' : '') + item.variance : '<i class="fas fa-check" style="color: var(--green);"></i>'}
            </td>
        </tr>`;
    }).join('');

    el.innerHTML = `
        <div style="font-weight: 700; font-size: 1rem; color: var(--green-deep); margin-bottom: 4px;">
            <i class="fas fa-boxes-stacked"></i> Rolling Stock Reconciliation
        </div>
        <div style="font-size: 0.8rem; color: #888; margin-bottom: 12px;">
            Baseline from stocktake on <strong>${baselineDate}</strong> (${data.daysSinceBaseline} day${data.daysSinceBaseline !== 1 ? 's' : ''} ago)
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 8px; margin-bottom: 16px;">
            <div style="background: white; padding: 12px; border-radius: 10px; text-align: center;">
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; color: var(--green);">${summary.totalItems}</div>
                <div style="font-size: 0.75rem; color: #666;">Products</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 10px; text-align: center;">
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; color: var(--green);">${totalSold}</div>
                <div style="font-size: 0.75rem; color: #666;">Units Sold</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 10px; text-align: center;">
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; color: ${summary.discrepancies > 0 ? 'var(--red)' : 'var(--green)'};">${summary.discrepancies}</div>
                <div style="font-size: 0.75rem; color: #666;">Discrepancies</div>
            </div>
            <div style="background: white; padding: 12px; border-radius: 10px; text-align: center;">
                <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.5rem; color: ${summary.totalVarianceValue < 0 ? 'var(--red)' : 'var(--green)'};">${fmtR(summary.totalVarianceValue)}</div>
                <div style="font-size: 0.75rem; color: #666;">Variance Value</div>
            </div>
        </div>

        <div style="overflow-x: auto; -webkit-overflow-scrolling: touch;">
            <table style="width: 100%; border-collapse: collapse; background: white; border-radius: 10px; overflow: hidden; min-width: 600px;">
                <thead>
                    <tr style="background: var(--green-deep); color: white;">
                        <th style="padding: 10px 8px; text-align: left; font-size: 0.8rem; font-weight: 600;">Product</th>
                        <th style="padding: 10px 6px; text-align: center; font-size: 0.8rem; font-weight: 600;">Baseline</th>
                        <th style="padding: 10px 6px; text-align: center; font-size: 0.8rem; font-weight: 600;">Sold</th>
                        <th style="padding: 10px 6px; text-align: center; font-size: 0.8rem; font-weight: 600;">Transfers</th>
                        <th style="padding: 10px 6px; text-align: center; font-size: 0.8rem; font-weight: 600;">Expected</th>
                        <th style="padding: 10px 6px; text-align: center; font-size: 0.8rem; font-weight: 600;">Actual</th>
                        <th style="padding: 10px 6px; text-align: center; font-size: 0.8rem; font-weight: 600;">Var</th>
                    </tr>
                </thead>
                <tbody>
                    ${tableRows}
                </tbody>
            </table>
        </div>

        ${discrepancies.length > 0 ? `
        <div style="margin-top: 12px; background: rgba(220, 38, 38, 0.1); border: 1px solid var(--red); padding: 12px; border-radius: 10px;">
            <div style="font-weight: 700; color: var(--red); font-size: 0.9rem; margin-bottom: 4px;">
                <i class="fas fa-exclamation-triangle"></i> ${discrepancies.length} Discrepanc${discrepancies.length === 1 ? 'y' : 'ies'} Found
            </div>
            <div style="font-size: 0.8rem; color: #666; margin-bottom: 8px;">
                Stock levels differ from expected since the ${baselineDate} stocktake. Investigate possible shrinkage, damage, or counting errors.
            </div>
            <a href="stocktake-app.html" style="display: inline-block; padding: 6px 16px; background: var(--red); color: white; border-radius: 8px; text-decoration: none; font-weight: 600; font-size: 0.8rem;">Create Stocktake Session</a>
        </div>` : `
        <div style="margin-top: 12px; background: rgba(63, 192, 65, 0.1); border: 1px solid var(--green); padding: 12px; border-radius: 10px;">
            <div style="font-weight: 700; color: var(--green); font-size: 0.9rem;">
                <i class="fas fa-check-circle"></i> All Stock Balanced
            </div>
            <div style="font-size: 0.8rem; color: #666;">Stock levels match expected quantities since the ${baselineDate} stocktake.</div>
        </div>`}
    `;
}

// ==========================================
// CASHUP HISTORY
// ==========================================

async function loadCashupHistory() {
    const el = document.getElementById('deTab_history');
    el.innerHTML = `
        <div style="text-align: center; padding: 20px;">
            <i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--green);"></i>
        </div>`;

    try {
        const token = getToken();
        const branchId = getSelectedBranchId();

        const res = await fetch(`${API_URL}/pos/cashup/history?branchId=${branchId}&limit=14`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await res.json();
        if (!data.success) {
            el.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--red);">Failed to load history</div>';
            return;
        }

        const cashups = data.cashups || [];
        if (cashups.length === 0) {
            el.innerHTML = `
                <div style="text-align: center; padding: 30px;">
                    <i class="fas fa-history" style="font-size: 2rem; color: #ccc;"></i>
                    <p style="margin-top: 10px; color: #666;">No cashup history yet</p>
                </div>`;
            return;
        }

        const rows = cashups.map(c => {
            const dateStr = new Date(c.date).toLocaleDateString('en-ZA', { day: '2-digit', month: 'short' });
            const statusColors = {
                draft: 'var(--gold)', submitted: '#3B82F6', approved: 'var(--green)', rejected: 'var(--red)'
            };
            const statusColor = statusColors[c.status] || '#999';
            const preparedBy = c.preparedBy ? `${c.preparedBy.firstName} ${c.preparedBy.lastName}` : '';

            return `<div style="display: grid; grid-template-columns: 60px 1fr 80px 60px; gap: 8px; align-items: center; padding: 12px; background: white; border-radius: 8px; margin-bottom: 6px;">
                <div style="font-weight: 700; font-size: 0.85rem;">${dateStr}</div>
                <div>
                    <div style="font-weight: 600; font-size: 0.85rem;">${c.cashupNumber || '-'}</div>
                    <div style="font-size: 0.75rem; color: #999;">${preparedBy}</div>
                </div>
                <div style="font-family: 'Barlow Condensed', sans-serif; text-align: right; font-size: 1rem; color: var(--green);">R${(c.totalSales || 0).toFixed(0)}</div>
                <div style="text-align: center;">
                    <span style="display: inline-block; width: 10px; height: 10px; border-radius: 50%; background: ${statusColor};"></span>
                </div>
            </div>`;
        }).join('');

        el.innerHTML = `
            <div style="font-weight: 700; font-size: 1rem; color: var(--green-deep); margin-bottom: 12px;">
                <i class="fas fa-history"></i> Recent Cashups
            </div>

            <div style="display: grid; grid-template-columns: 60px 1fr 80px 60px; gap: 8px; padding: 0 12px; margin-bottom: 8px;">
                <div style="font-size: 0.75rem; color: #999; font-weight: 600;">Date</div>
                <div style="font-size: 0.75rem; color: #999; font-weight: 600;">Cashup</div>
                <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-align: right;">Sales</div>
                <div style="font-size: 0.75rem; color: #999; font-weight: 600; text-align: center;">Status</div>
            </div>

            ${rows}

            ${data.totals ? `
            <div style="margin-top: 12px; background: linear-gradient(135deg, var(--green) 0%, var(--green-dark) 100%); padding: 14px; border-radius: 10px; color: white; display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                <div style="text-align: center;">
                    <div style="font-size: 0.8rem; opacity: 0.8;">Period Sales</div>
                    <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem;">R${(data.totals.totalSales || 0).toFixed(2)}</div>
                </div>
                <div style="text-align: center;">
                    <div style="font-size: 0.8rem; opacity: 0.8;">Total Variance</div>
                    <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.3rem;">${(data.totals.totalVariance || 0) >= 0 ? '+' : ''}R${(data.totals.totalVariance || 0).toFixed(2)}</div>
                </div>
            </div>` : ''}
        `;
    } catch (error) {
        console.error('History error:', error);
        el.innerHTML = '<div style="text-align: center; padding: 20px; color: var(--red);">Error loading history</div>';
    }
}

// ==========================================
// ROLE-BASED VISIBILITY
// ==========================================

function initDayEndButton() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const btn = document.getElementById('dayEndBtn');
    if (btn) {
        btn.style.display = DAY_END_ROLES.includes(user.role) ? '' : 'none';
    }
}

// Initialize on page load — try multiple times to catch async auth
if (typeof window !== 'undefined') {
    document.addEventListener('DOMContentLoaded', () => {
        setTimeout(initDayEndButton, 800);
        setTimeout(initDayEndButton, 2000);
    });
}
