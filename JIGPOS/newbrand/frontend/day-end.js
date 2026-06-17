// ===================================================================
// Origin Retail POS — Day End Wizard
// Controller (MVC): all API calls, state management, step navigation
// ===================================================================

'use strict';

// -------------------------------------------------------------------
// STATE
// -------------------------------------------------------------------
const State = {
    step: 1,
    sessionData:  null,   // from GET /api/pos/till/active
    closeData:    null,   // from POST /api/pos/till/close response
    cashupData:   null,   // from GET/POST cashup endpoints
    denominations: {},    // user-entered counts keyed by field id
    grandTotal:   0,      // live sum of denomination inputs
    safeDrop:     0,      // confirmed safe drop amount
    branchId:     null
};

// -------------------------------------------------------------------
// CONSTANTS
// -------------------------------------------------------------------
const FLOAT_AMOUNT   = 0;     // no float by default — store keeps none (set per store if adopted)
const VARIANCE_OK    = 5;     // ≤ R5 — green
const VARIANCE_WARN  = 50;    // R5–R50 — amber
                               // > R50  — red / manager required

const DENOM_IDS = ['R200','R100','R50','R20','R10','R5','R2','R1','c50','c20','c10','c5'];

const DENOM_VALUES = {
    R200: 200, R100: 100, R50: 50, R20: 20, R10: 10,
    R5: 5, R2: 2, R1: 1, c50: 0.5, c20: 0.2, c10: 0.1, c5: 0.05
};

// -------------------------------------------------------------------
// API HELPERS
// -------------------------------------------------------------------
function getToken() {
    return localStorage.getItem('token') || sessionStorage.getItem('adminToken') || '';
}

function getApiBase() {
    const h = window.location.hostname;
    if (h === 'localhost' || h === '127.0.0.1') return window.location.origin + '/api/v1';
    // Production: POS API is behind the /pos/api/ nginx prefix (same as Origin_CONFIG.API_URL)
    return window.location.origin + '/pos/api/v1';
}

async function apiGet(path) {
    const res = await fetch(getApiBase() + path, {
        headers: { 'Authorization': `Bearer ${getToken()}` }
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
        throw new Error(data.message || `API error ${res.status}`);
    }
    return data;
}

async function apiPost(path, body) {
    const res = await fetch(getApiBase() + path, {
        method: 'POST',
        headers: {
            'Authorization': `Bearer ${getToken()}`,
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(body)
    });
    const data = await res.json();
    if (!res.ok || data.success === false) {
        throw new Error(data.message || `API error ${res.status}`);
    }
    return data;
}

// In-page manager-approval modal for a cash variance over R50 (kiosk-safe — no window.prompt).
// Resolves to { note, pin } or null if cancelled.
function varianceOverride(prefillNote) {
    return new Promise(resolve => {
        const old = document.getElementById('varOverrideModal'); if (old) old.remove();
        const el = document.createElement('div');
        el.id = 'varOverrideModal';
        el.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.82);z-index:100000;display:flex;align-items:center;justify-content:center;padding:20px;';
        el.innerHTML = `<div style="background:#15130d;border:1px solid #C9A84C;border-radius:18px;max-width:400px;width:100%;padding:24px;font-family:'Inter',sans-serif;color:#F2ECDD;box-shadow:0 14px 50px rgba(0,0,0,.6);">
            <div style="font-family:'Cinzel',serif;color:#C9A84C;font-size:1.2rem;margin-bottom:6px;">Manager approval needed</div>
            <p style="color:#b8b1a0;font-size:.9rem;margin-bottom:16px;">The cash variance is over R50. Add a note and a manager / admin PIN to close the shift.</p>
            <label style="font-size:.7rem;color:#9a9486;letter-spacing:1px;display:block;margin-bottom:5px;">CLOSING NOTE</label>
            <textarea id="voNote" rows="2" style="width:100%;padding:11px;background:#1d1d1d;border:1px solid #2a2620;border-radius:10px;color:#fff;font-family:'Inter',sans-serif;margin-bottom:14px;resize:vertical;">${prefillNote || ''}</textarea>
            <label style="font-size:.7rem;color:#9a9486;letter-spacing:1px;display:block;margin-bottom:5px;">MANAGER / ADMIN PIN</label>
            <input id="voPin" type="password" inputmode="numeric" autocomplete="off" style="width:100%;padding:13px;background:#1d1d1d;border:1px solid #2a2620;border-radius:10px;color:#fff;letter-spacing:7px;font-size:1.25rem;text-align:center;">
            <div id="voMsg" style="color:#DC2626;font-size:.8rem;min-height:15px;margin-top:8px;"></div>
            <div style="display:flex;gap:10px;margin-top:14px;">
                <button id="voCancel" style="flex:1;padding:13px;background:#262626;border:none;border-radius:11px;color:#fff;font-weight:700;cursor:pointer;">Cancel</button>
                <button id="voOk" style="flex:2;padding:13px;background:#C9A84C;border:none;border-radius:11px;color:#1a1a1a;font-weight:800;cursor:pointer;">Approve &amp; Close</button>
            </div>
        </div>`;
        document.body.appendChild(el);
        setTimeout(() => { const n = document.getElementById('voNote'); if (n) n.focus(); }, 60);
        const finish = (val) => { el.remove(); resolve(val); };
        document.getElementById('voCancel').onclick = () => finish(null);
        document.getElementById('voOk').onclick = () => {
            const note = document.getElementById('voNote').value.trim();
            const pin = document.getElementById('voPin').value.trim();
            const msg = document.getElementById('voMsg');
            if (!note) { msg.textContent = 'Enter a closing note'; return; }
            if (!pin) { msg.textContent = 'Enter the manager / admin PIN'; return; }
            finish({ note, pin });
        };
        document.getElementById('voPin').addEventListener('keydown', e => { if (e.key === 'Enter') document.getElementById('voOk').click(); });
    });
}

// -------------------------------------------------------------------
// TOAST NOTIFICATION
// -------------------------------------------------------------------
let toastTimer = null;

function showToast(msg, type = 'info') {
    const el   = document.getElementById('toast');
    const icon = document.getElementById('toastIcon');
    const text = document.getElementById('toastMsg');

    const icons = {
        success: 'ph-check-circle',
        error:   'ph-x-circle',
        warning: 'ph-warning',
        info:    'ph-info'
    };

    el.className = `toast toast-${type} show`;
    icon.className = icons[type] || icons.info;
    text.textContent = msg;

    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
        el.classList.remove('show');
    }, type === 'error' ? 6000 : 3500);
}

// -------------------------------------------------------------------
// FORMATTING HELPERS
// -------------------------------------------------------------------
function fmtZAR(amount) {
    if (amount === null || amount === undefined || isNaN(amount)) return 'R 0.00';
    const abs = Math.abs(amount);
    const sign = amount < 0 ? '− ' : '';
    return sign + 'R ' + abs.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function fmtDate(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function fmtTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return d.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
}

function fmtDateTime(iso) {
    if (!iso) return '—';
    const d = new Date(iso);
    return fmtDate(iso) + ' ' + fmtTime(iso);
}

function setText(id, val) {
    const el = document.getElementById(id);
    if (el) el.textContent = val;
}

// -------------------------------------------------------------------
// PROGRESS BAR
// -------------------------------------------------------------------
function updateProgress(targetStep) {
    const steps = document.querySelectorAll('.progress-step');
    const lines = document.querySelectorAll('.progress-line');

    steps.forEach((el, idx) => {
        const n = idx + 1;
        el.classList.remove('active', 'completed');
        if (n < targetStep)       el.classList.add('completed');
        else if (n === targetStep) el.classList.add('active');
    });

    lines.forEach((el, idx) => {
        const n = idx + 1;
        el.classList.toggle('filled', n < targetStep);
    });
}

// -------------------------------------------------------------------
// STEP NAVIGATION
// -------------------------------------------------------------------
function goToStep(n) {
    const current = document.getElementById(`step${State.step}`);
    const next    = document.getElementById(`step${n}`);
    if (current) current.classList.remove('active');
    if (next)    next.classList.add('active');
    State.step = n;
    updateProgress(n);
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

// -------------------------------------------------------------------
// STEP 1 — DENOMINATION COUNTER
// -------------------------------------------------------------------
function initDenomCounter() {
    DENOM_IDS.forEach(id => {
        const input = document.getElementById(`d_${id}`);
        if (!input) return;
        input.addEventListener('input', () => onDenomInput(id, input));
    });
}

function onDenomInput(id, input) {
    const count = parseInt(input.value, 10) || 0;
    const value = DENOM_VALUES[id];
    const total = count * value;

    // Update line total
    const totalEl = document.getElementById(`t_${id}`);
    if (totalEl) {
        totalEl.textContent = fmtZAR(total);
        totalEl.classList.toggle('has-value', count > 0);
    }

    input.classList.toggle('has-value', count > 0);

    // Store in state
    State.denominations[id] = count;

    // Recalculate grand total
    recalcGrandTotal();
}

function recalcGrandTotal() {
    let sum = 0;
    DENOM_IDS.forEach(id => {
        const count = State.denominations[id] || 0;
        sum += count * DENOM_VALUES[id];
    });
    // Round to nearest cent to avoid floating point drift
    State.grandTotal = Math.round(sum * 100) / 100;

    const el = document.getElementById('grandTotalDisplay');
    if (el) el.textContent = fmtZAR(State.grandTotal);
}

async function step1Next() {
    if (State.grandTotal <= 0) {
        showToast('Please count the till first — enter at least one denomination.', 'warning');
        return;
    }

    const btn = document.getElementById('btnStep1Next');
    setLoading(btn, true);

    try {
        // Build denominations payload matching API spec
        const denomPayload = {
            R200: State.denominations['R200']  || 0,
            R100: State.denominations['R100']  || 0,
            R50:  State.denominations['R50']   || 0,
            R20:  State.denominations['R20']   || 0,
            R10:  State.denominations['R10']   || 0,
            R5:   State.denominations['R5']    || 0,
            R2:   State.denominations['R2']    || 0,
            R1:   State.denominations['R1']    || 0,
            c50:  State.denominations['c50']   || 0,
            c20:  State.denominations['c20']   || 0,
            c10:  State.denominations['c10']   || 0,
            c5:   State.denominations['c5']    || 0
        };

        const sessionId = State.sessionData?.session?._id || State.sessionData?._id;
        if (!sessionId) throw new Error('No active session found. Please start a POS session first.');

        const closeReq = (approvalPin, notes) => apiPost('/pos/till/close', {
            sessionId, denominations: denomPayload, closingNotes: notes || '', approvalPin: approvalPin || ''
        });
        let data;
        const note0 = document.getElementById('varianceNotes')?.value?.trim() || '';
        try {
            data = await closeReq('', note0);
        } catch (err) {
            // Variance over R50 — backend needs a manager/admin PIN + note. Use an IN-PAGE modal
            // (window.prompt is suppressed in kiosk mode, which left Ray unable to type).
            if ((err && err.requiresApproval) || /exceeds R50|manager\/admin PIN|approval/i.test(err?.message || '')) {
                while (true) {
                    const ov = await varianceOverride(note0);
                    if (!ov) { setLoading(btn, false); return; }   // cancelled — abort cleanly
                    try { data = await closeReq(ov.pin, ov.note); break; }
                    catch (e2) {
                        if (/invalid|PIN|approval|exceeds|note/i.test(e2?.message || '')) { showToast(e2.message || 'Invalid PIN — try again', 'error'); continue; }
                        throw e2;
                    }
                }
            } else { throw err; }
        }

        State.closeData = data.session || data;
        populateStep2();
        goToStep(2);
        if (typeof showToast === 'function') showToast('✓ Saved! Till session closed', 'success');

    } catch (err) {
        showToast(err.message || 'Failed to submit till count. Please try again.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

// -------------------------------------------------------------------
// STEP 2 — VARIANCE CHECK
// -------------------------------------------------------------------
function populateStep2() {
    const d = State.closeData;
    if (!d) return;

    const expected  = parseFloat(d.expectedCash || 0);
    const actual    = parseFloat(d.actualCash   || State.grandTotal);
    const variance  = parseFloat(d.variance     || (actual - expected));
    const totalSales= parseFloat(d.totalSales   || State.sessionData?.session?.totalSales || 0);
    const totalCash = parseFloat(d.totalCash    || 0);
    const totalCard = parseFloat(d.totalCard    || 0);
    const totalEFT  = parseFloat(d.totalEFT     || 0);
    const txCount   = parseInt(d.transactionCount || State.sessionData?.session?.transactionCount || 0);

    setText('v2Expected',   fmtZAR(expected));
    setText('v2Counted',    fmtZAR(actual));
    setText('v2Variance',   (variance >= 0 ? '' : '− ') + 'R ' + Math.abs(variance).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ','));
    setText('v2CashSales',  fmtZAR(totalCash));
    setText('v2Card',       fmtZAR(totalCard));
    setText('v2Eft',        fmtZAR(totalEFT));
    setText('v2TotalSales', fmtZAR(totalSales));
    setText('v2Transactions', txCount.toString());

    const absVariance = Math.abs(variance);
    const varRow      = document.getElementById('v2VarianceRow');
    const statusEl    = document.getElementById('v2Status');
    const notesField  = document.getElementById('varianceNotesField');

    // Clear previous state classes
    varRow.classList.remove('state-ok','state-warn','state-alert');
    statusEl.classList.remove('show','ok','warn','alert');

    if (absVariance <= VARIANCE_OK) {
        varRow.classList.add('state-ok');
        statusEl.className = 'variance-status show ok';
        statusEl.innerHTML = '<i class="ph-check-circle"></i> Within acceptable range';
        if (notesField) notesField.style.display = 'none';
    } else if (absVariance <= VARIANCE_WARN) {
        varRow.classList.add('state-warn');
        statusEl.className = 'variance-status show warn';
        statusEl.innerHTML = '<i class="ph-warning"></i> Minor variance — add a note';
        if (notesField) notesField.style.display = 'block';
    } else {
        varRow.classList.add('state-alert');
        statusEl.className = 'variance-status show alert';
        statusEl.innerHTML = '<i class="ph-siren"></i> Significant variance — manager approval required';
        if (notesField) notesField.style.display = 'block';
    }
}

async function step2Next() {
    const d           = State.closeData;
    const expected    = parseFloat(d?.expectedCash || 0);
    const actual      = parseFloat(d?.actualCash   || State.grandTotal);
    const absVariance = Math.abs(actual - expected);

    // Require note for variance > R5
    if (absVariance > VARIANCE_OK) {
        const notes = document.getElementById('varianceNotes')?.value?.trim();
        if (!notes) {
            showToast('A variance note is required before continuing.', 'warning');
            document.getElementById('varianceNotes')?.focus();
            return;
        }
        // Patch closing notes on the close data for the Z-report
        State.closeData.closingNotes = notes;
    }

    // Start or get today's cashup
    const btn = document.getElementById('btnStep2Next');
    setLoading(btn, true);

    try {
        if (!State.cashupData) {
            // Try to get today's cashup first
            try {
                const existing = await apiGet('/pos/cashup/today');
                if (existing.cashup) {
                    State.cashupData = existing.cashup;
                }
            } catch (_) { /* no cashup yet */ }
        }

        if (!State.cashupData) {
            // Create a new cashup
            const branchId = State.branchId || getBranchIdFallback();
            if (!branchId) throw new Error('Branch not selected. Please return to POS and select a branch.');
            const data = await apiPost('/pos/cashup/start', { branchId });
            State.cashupData = data.cashup;
        }

        populateStep3();
        goToStep(3);

    } catch (err) {
        showToast(err.message || 'Failed to start cashup. Please try again.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

// -------------------------------------------------------------------
// STEP 3 — SAFE DROP
// -------------------------------------------------------------------
function populateStep3() {
    const counted   = parseFloat(State.closeData?.actualCash || State.grandTotal);
    const dropAmt   = Math.max(0, counted - FLOAT_AMOUNT);

    setText('s3CashCounted', fmtZAR(counted));
    setText('s3DropAmount',  fmtZAR(dropAmt));

    const input = document.getElementById('safeDropAmount');
    if (input) input.value = dropAmt.toFixed(2);
}

async function step3Next() {
    const input  = document.getElementById('safeDropAmount');
    const descEl = document.getElementById('safeDropDescription');

    const amount = parseFloat(input?.value) || 0;
    const desc   = descEl?.value?.trim() || 'Daily safe drop';

    if (amount < 0) {
        showToast('Safe drop amount cannot be negative.', 'warning');
        return;
    }

    const cashupId = State.cashupData?._id;
    if (!cashupId) {
        showToast('Cashup session not found. Please restart the day-end process.', 'error');
        return;
    }

    const btn = document.getElementById('btnStep3Next');
    setLoading(btn, true);

    try {
        await apiPost(`/pos/cashup/${cashupId}/safe-drop`, {
            amount,
            description: desc
        });

        State.safeDrop = amount;
        populateStep4();
        goToStep(4);

    } catch (err) {
        showToast(err.message || 'Failed to record safe drop. Please try again.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

// -------------------------------------------------------------------
// STEP 4 — Z-REPORT
// -------------------------------------------------------------------
function populateStep4() {
    const session  = State.sessionData?.session || State.sessionData || {};
    const close    = State.closeData   || {};
    const cashup   = State.cashupData  || {};

    const now = new Date();

    // Header
    const branchName = getBranchName();
    setText('zr-branch',    branchName);
    setText('zr-date',      fmtDate(now.toISOString()));
    setText('zr-generated', fmtDateTime(now.toISOString()));

    // Sales summary
    const txCount    = parseInt(close.transactionCount  || session.transactionCount || cashup.totalTransactions || 0);
    const grossSales = parseFloat(close.totalSales       || session.totalSales       || cashup.totalSales        || 0);
    const refunds    = parseFloat(close.totalRefunds     || cashup.totalRefunds      || 0);
    const netSales   = grossSales - refunds;

    setText('zr-transactions', txCount.toString());
    setText('zr-grossSales',   fmtZAR(grossSales));
    setText('zr-refunds',      fmtZAR(refunds));
    setText('zr-netSales',     fmtZAR(netSales));

    // Payment methods
    const totalCash = parseFloat(close.totalCash || session.totalCash || 0);
    const totalCard = parseFloat(close.totalCard || session.totalCard || 0);
    const totalEft  = parseFloat(close.totalEFT  || session.totalEFT  || 0);

    setText('zr-cash', fmtZAR(totalCash));
    setText('zr-card', fmtZAR(totalCard));
    setText('zr-eft',  fmtZAR(totalEft));

    // Till reconciliation
    const openingFloat  = parseFloat(session.openingFloat != null ? session.openingFloat : FLOAT_AMOUNT);
    const expectedInTill= openingFloat + totalCash;
    const counted       = parseFloat(close.actualCash       || State.grandTotal);
    const variance      = counted - expectedInTill;
    const absVariance   = Math.abs(variance);

    setText('zr-openingFloat',   fmtZAR(openingFloat));
    setText('zr-cashSalesRecon', fmtZAR(totalCash));
    setText('zr-expectedInTill', fmtZAR(expectedInTill));
    setText('zr-counted',        fmtZAR(counted));

    const varEl  = document.getElementById('zr-variance');
    if (varEl) {
        varEl.textContent = (variance >= 0 ? '' : '− ') + 'R ' + absVariance.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        varEl.className = 'zr-val';
        if (absVariance <= VARIANCE_OK)        varEl.classList.add('ok');
        else if (absVariance <= VARIANCE_WARN) varEl.classList.add('warn');
        else                                   varEl.classList.add('alert');
    }

    // Safe drop
    const floatRemaining = counted - State.safeDrop;
    setText('zr-safeDropAmt',   fmtZAR(State.safeDrop));
    setText('zr-floatRemaining', fmtZAR(Math.max(0, floatRemaining)));
}

async function step4Next() {
    const cashupId = State.cashupData?._id;
    if (!cashupId) {
        showToast('Cashup session not found.', 'error');
        return;
    }

    const btn = document.getElementById('btnStep4Next');
    setLoading(btn, true);

    try {
        const notes = State.closeData?.closingNotes || '';
        await apiPost(`/pos/cashup/${cashupId}/submit`, { notes });

        populateStep5();
        goToStep(5);

    } catch (err) {
        showToast(err.message || 'Failed to submit day-end. Please try again.', 'error');
    } finally {
        setLoading(btn, false);
    }
}

// -------------------------------------------------------------------
// STEP 5 — DONE
// -------------------------------------------------------------------
function populateStep5() {
    const session  = State.sessionData?.session || State.sessionData || {};
    const close    = State.closeData || {};

    const totalSales = parseFloat(close.totalSales || session.totalSales || 0);
    const txCount    = parseInt(close.transactionCount || session.transactionCount || 0);

    setText('d5TotalSales',   fmtZAR(totalSales));
    setText('d5Transactions', txCount.toString());
    setText('d5SafeDrop',     fmtZAR(State.safeDrop));
}

// -------------------------------------------------------------------
// INIT — PAGE LOAD
// -------------------------------------------------------------------
async function initDayEnd() {
    updateProgress(1);
    initDenomCounter();
    resolveBranchId();

    // Keep auth alive across the page navigation so "Back to POS" never logs out
    const _t = getToken();
    if (_t) localStorage.setItem('token', _t);
    const _u = sessionStorage.getItem('user') || localStorage.getItem('user');
    if (_u) localStorage.setItem('user', _u);

    // Load session data
    try {
        const branchId = State.branchId || getBranchIdFallback();
        const data = await apiGet(`/pos/till/active?branchId=${branchId}&tillNumber=TILL-01`);
        State.sessionData = data;
        populateSessionCard(data);
    } catch (err) {
        showToast('Could not load active till session: ' + err.message, 'warning');
        hideSessionLoading();
    }

    // Check if cashup already started today (resume flow)
    try {
        const cashupData = await apiGet('/pos/cashup/today');
        if (cashupData?.cashup && cashupData.cashup.status !== 'completed') {
            State.cashupData = cashupData.cashup;
            // Cashup exists but not done — user may have refreshed mid-flow
            // Stay on step 1 so they can re-count; cashup will be reused
        }
    } catch (_) {
        // No cashup today — fine, will be created in step 2
    }
}

function populateSessionCard(data) {
    const session = data?.session || data;
    const loading = document.getElementById('sessionLoading');
    const grid    = document.getElementById('sessionGrid');

    if (loading) loading.style.display = 'none';
    if (grid)    grid.style.display = 'grid';

    setText('s1SessionNumber',    session?.sessionNumber   || '—');
    setText('s1TillNumber',       session?.tillNumber      || '—');
    setText('s1OpenedAt',         session?.openedAt ? fmtTime(session.openedAt) : '—');
    setText('s1TransactionCount', (session?.transactionCount || 0).toString());
    setText('s1TotalSales',       fmtZAR(session?.totalSales || 0));
}

function hideSessionLoading() {
    const loading = document.getElementById('sessionLoading');
    const grid    = document.getElementById('sessionGrid');
    if (loading) loading.style.display = 'none';
    if (grid) {
        grid.style.display = 'grid';
        // Show blank state
        ['s1SessionNumber','s1TillNumber','s1OpenedAt','s1TransactionCount'].forEach(id => setText(id, '—'));
        setText('s1TotalSales', 'R 0.00');
    }
}

// -------------------------------------------------------------------
// BRANCH ID HELPERS
// -------------------------------------------------------------------
function resolveBranchId() {
    // Try several sources in priority order
    const fromSession = JSON.parse(sessionStorage.getItem('selectedBranch') || 'null');
    const fromLocal   = JSON.parse(localStorage.getItem('selectedBranch')   || 'null');
    const fromUser    = JSON.parse(sessionStorage.getItem('user')            || localStorage.getItem('user') || 'null');

    State.branchId = fromSession?._id
        || fromLocal?._id
        || (fromUser?.primaryBranch && (fromUser.primaryBranch._id || fromUser.primaryBranch))
        || fromUser?.branchId
        || '69a5848c4d2f6747055eca16'; // Potchefstroom — single-branch fallback so it's never empty
}

function getBranchIdFallback() {
    resolveBranchId();
    return State.branchId;
}

function getBranchName() {
    const fromSession = JSON.parse(sessionStorage.getItem('selectedBranch') || 'null');
    const fromLocal   = JSON.parse(localStorage.getItem('selectedBranch')   || 'null');
    return fromSession?.name || fromLocal?.name || 'Potchefstroom';
}

// -------------------------------------------------------------------
// BUTTON LOADING STATE
// -------------------------------------------------------------------
function setLoading(btn, isLoading) {
    if (!btn) return;
    btn.disabled = isLoading;
    if (isLoading) {
        btn.dataset.origHtml = btn.innerHTML;
        btn.innerHTML = '<i class="ph-circle-notch spin"></i> Processing…';
    } else if (btn.dataset.origHtml) {
        btn.innerHTML = btn.dataset.origHtml;
    }
}

// -------------------------------------------------------------------
// PUBLIC API (called from HTML onclick attributes)
// -------------------------------------------------------------------
const DayEnd = {
    goToStep,
    step1Next,
    step2Next,
    step3Next,
    step4Next
};

// -------------------------------------------------------------------
// BOOT
// -------------------------------------------------------------------
document.addEventListener('DOMContentLoaded', initDayEnd);
