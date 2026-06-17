// ===== POS TRANSACTIONS — view session/day sales, admin-gated Void & Refund =====
// Anyone logged in can VIEW. Void/Refund require an owner/admin PIN.

let _txnSales = [];

function _txnToken() {
    return sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || localStorage.getItem('token') || '';
}

function _txnPm(s) {
    return (s.paymentMethod || (s.payments && s.payments[0] && s.payments[0].method) || '').toString();
}

function _txnBadge(status) {
    const map = {
        completed: ['#22C55E', 'COMPLETED'],
        voided: ['#DC2626', 'VOIDED'],
        refunded: ['#F59E0B', 'REFUNDED'],
        pending_payment: ['#94A3B8', 'PENDING'],
    };
    const [c, t] = map[status] || ['#94A3B8', (status || '').toUpperCase()];
    return `<span style="background:${c}22;color:${c};font-size:0.65rem;font-weight:700;padding:3px 8px;border-radius:6px;letter-spacing:0.5px;">${t}</span>`;
}

async function openTransactions() {
    const branchId = (typeof getSelectedBranchId === 'function' && getSelectedBranchId()) || '';
    document.getElementById('txnModal')?.remove();
    const modal = document.createElement('div');
    modal.id = 'txnModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.6);z-index:10000;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:#141414;border:1px solid #2a2a2a;border-radius:18px;width:94%;max-width:560px;max-height:88vh;display:flex;flex-direction:column;overflow:hidden;">
        <div style="background:rgba(201,168,76,0.12);padding:16px 20px;border-bottom:1px solid #2a2a2a;display:flex;justify-content:space-between;align-items:center;">
            <div><div style="font-size:1.15rem;font-weight:700;color:#FAFAFA;">Today's Transactions</div>
                 <div id="txnStats" style="font-size:0.8rem;color:#888;margin-top:2px;">Loading…</div></div>
            <button onclick="document.getElementById('txnModal').remove()" style="background:#262626;border:none;color:#FAFAFA;width:34px;height:34px;border-radius:50%;font-size:1.1rem;cursor:pointer;">&times;</button>
        </div>
        <div style="padding:10px 14px;"><input id="txnSearch" placeholder="Search slip number…" oninput="_txnRender()" style="width:100%;padding:11px 14px;background:#1d1d1d;border:1px solid #333;border-radius:10px;color:#FAFAFA;font-size:0.95rem;box-sizing:border-box;"></div>
        <div id="txnList" style="overflow-y:auto;padding:0 14px 14px;flex:1;"></div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

    try {
        const res = await fetch(`${API_URL}/pos/sales/today?branchId=${branchId}`, { headers: { 'Authorization': `Bearer ${_txnToken()}` } });
        const data = await res.json();
        _txnSales = data.sales || [];
        const active = _txnSales.filter(x => x.status !== 'voided' && x.status !== 'refunded');
        const net = active.reduce((a, x) => a + (x.totalAmount || 0), 0);
        const dropped = _txnSales.length - active.length;
        document.getElementById('txnStats').textContent =
            `${active.length} sale${active.length !== 1 ? 's' : ''} · R${net.toFixed(2)}` +
            (dropped ? ` · ${dropped} voided/refunded` : '');
        _txnRender();
    } catch (e) {
        document.getElementById('txnList').innerHTML = '<p style="color:#DC2626;text-align:center;padding:20px;">Could not load transactions.</p>';
    }
}

function _txnRender() {
    const q = (document.getElementById('txnSearch')?.value || '').toLowerCase().trim();
    const list = document.getElementById('txnList');
    const sales = _txnSales.filter(s => !q || String(s.saleNumber || '').toLowerCase().includes(q));
    if (!sales.length) { list.innerHTML = '<p style="color:#888;text-align:center;padding:24px;">No transactions.</p>'; return; }
    list.innerHTML = sales.map(s => {
        const t = new Date(s.createdAt).toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit' });
        const n = (s.items || []).reduce((a, i) => a + (i.quantity || 0), 0);
        const dim = (s.status === 'voided' || s.status === 'refunded') ? 'opacity:0.6;' : '';
        return `<div onclick="_txnDetail('${s._id}')" style="background:#1c1c1c;border:1px solid #2a2a2a;border-radius:10px;padding:12px 14px;margin-bottom:8px;cursor:pointer;${dim}">
            <div style="display:flex;justify-content:space-between;align-items:center;">
                <div><div style="font-weight:700;color:#FAFAFA;font-size:0.95rem;">#${s.saleNumber || '—'}</div>
                     <div style="font-size:0.75rem;color:#888;">${t} · ${n} item${n !== 1 ? 's' : ''} · ${_txnPm(s).toUpperCase()}</div></div>
                <div style="text-align:right;"><div style="font-weight:700;color:#C9A84C;font-family:'Cinzel',serif;">R${(s.totalAmount || 0).toFixed(2)}</div>
                     <div style="margin-top:3px;">${_txnBadge(s.status)}</div></div>
            </div></div>`;
    }).join('');
}

function _txnDetail(saleId) {
    const s = _txnSales.find(x => x._id === saleId);
    if (!s) return;
    const canAct = s.status === 'completed';
    const items = (s.items || []).map(i =>
        `<div style="display:flex;justify-content:space-between;font-size:0.85rem;color:#ccc;padding:4px 0;">
            <span>${i.name} ×${i.quantity}</span><span>R${((i.unitPrice || 0) * (i.quantity || 0)).toFixed(2)}</span></div>`).join('');
    const modal = document.createElement('div');
    modal.id = 'txnDetailModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.65);z-index:10002;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:#141414;border:1px solid #2a2a2a;border-radius:18px;width:92%;max-width:440px;overflow:hidden;">
        <div style="background:rgba(201,168,76,0.12);padding:16px 20px;border-bottom:1px solid #2a2a2a;">
            <div style="font-weight:700;color:#FAFAFA;font-size:1.05rem;">Slip #${s.saleNumber} ${_txnBadge(s.status)}</div>
            <div style="font-size:0.78rem;color:#888;margin-top:3px;">${new Date(s.createdAt).toLocaleString('en-ZA')} · ${_txnPm(s).toUpperCase()}</div>
        </div>
        <div style="padding:16px 20px;max-height:40vh;overflow-y:auto;">${items}
            <div style="border-top:1px solid #2a2a2a;margin-top:8px;padding-top:8px;display:flex;justify-content:space-between;font-weight:700;color:#C9A84C;"><span>TOTAL</span><span>R${(s.totalAmount || 0).toFixed(2)}</span></div>
        </div>
        <div style="display:flex;gap:10px;padding:0 20px 20px;">
            <button onclick="document.getElementById('txnDetailModal').remove()" style="flex:1;padding:13px;background:#262626;border:none;border-radius:11px;color:#FAFAFA;font-weight:600;cursor:pointer;">Close</button>
            ${canAct ? `<button onclick="_txnVoid('${s._id}')" style="flex:1;padding:13px;background:#DC2626;border:none;border-radius:11px;color:#fff;font-weight:700;cursor:pointer;">Void</button>
            <button onclick="_txnRefund('${s._id}')" style="flex:1;padding:13px;background:#F59E0B;border:none;border-radius:11px;color:#1A1A1A;font-weight:700;cursor:pointer;">Refund</button>` : ''}
        </div>
    </div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function _txnAuthBox(title, color) {
    return `<label style="display:flex;flex-direction:column;gap:5px;font-size:0.75rem;color:#888;letter-spacing:0.5px;">REASON / NOTE
            <input id="txnNote" placeholder="e.g. rang up wrong item" style="padding:11px;background:#1d1d1d;border:1px solid #333;border-radius:10px;color:#FAFAFA;">
        </label>
        <label style="display:flex;flex-direction:column;gap:5px;font-size:0.75rem;color:${color};letter-spacing:0.5px;border-top:1px solid #2a2a2a;padding-top:12px;">ADMIN PIN TO APPROVE
            <input id="txnPin" type="password" inputmode="numeric" placeholder="••••••" style="padding:11px;font-size:1.15rem;letter-spacing:6px;background:#1d1d1d;border:1px solid ${color};border-radius:10px;color:#FAFAFA;">
        </label>
        <div id="txnMsg" style="font-size:0.8rem;color:#DC2626;min-height:15px;"></div>`;
}

// Prominent green confirmation shown only after a write is confirmed persisted in the DB.
function _posPersistConfirm(title, detail) {
    let el = document.getElementById('posPersistConfirm');
    if (!el) {
        el = document.createElement('div');
        el.id = 'posPersistConfirm';
        el.style.cssText = 'position:fixed;top:50%;left:50%;transform:translate(-50%,-50%) scale(.9);z-index:10050;background:#0f1a12;border:2px solid #22C55E;border-radius:16px;padding:22px 28px;text-align:center;box-shadow:0 12px 40px rgba(0,0,0,.55);opacity:0;transition:opacity .15s,transform .15s;pointer-events:none;max-width:90vw;';
        document.body.appendChild(el);
    }
    el.innerHTML = `<div style="font-size:2rem;color:#22C55E;line-height:1;">✓</div>
        <div style="font-family:'Cinzel',serif;color:#22C55E;font-size:1.15rem;margin-top:8px;">Saved!</div>
        <div style="color:#e6f5ec;margin-top:6px;font-size:.95rem;">${title}</div>
        <div style="color:#8fb89f;margin-top:4px;font-size:.82rem;">${detail || ''}</div>`;
    el.style.opacity = '1'; el.style.transform = 'translate(-50%,-50%) scale(1)';
    clearTimeout(window._ppcTimer); window._ppcTimer = setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translate(-50%,-50%) scale(.9)'; }, 2600);
}

function _txnVoid(saleId) {
    const s = _txnSales.find(x => x._id === saleId);
    const modal = document.createElement('div');
    modal.id = 'txnActionModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10003;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:#141414;border:1px solid #2a2a2a;border-radius:18px;width:92%;max-width:400px;overflow:hidden;">
        <div style="background:rgba(220,38,38,0.14);padding:15px 20px;border-bottom:1px solid #2a2a2a;color:#FAFAFA;font-weight:700;">Void Slip #${s.saleNumber} — R${(s.totalAmount||0).toFixed(2)}</div>
        <div style="padding:16px 20px;display:flex;flex-direction:column;gap:13px;">${_txnAuthBox('Void', '#DC2626')}</div>
        <div style="display:flex;gap:10px;padding:0 20px 20px;">
            <button onclick="document.getElementById('txnActionModal').remove()" style="flex:1;padding:13px;background:#262626;border:none;border-radius:11px;color:#FAFAFA;font-weight:600;cursor:pointer;">Cancel</button>
            <button onclick="_txnSubmit('${saleId}','void')" style="flex:2;padding:13px;background:#DC2626;border:none;border-radius:11px;color:#fff;font-weight:700;cursor:pointer;">Confirm Void</button>
        </div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

function _txnRefund(saleId) {
    const s = _txnSales.find(x => x._id === saleId);
    const rows = (s.items || []).map((i, idx) =>
        `<label style="display:flex;align-items:center;gap:10px;padding:7px 0;font-size:0.85rem;color:#ccc;">
            <input type="checkbox" class="txn-ref-item" data-idx="${idx}" checked style="width:18px;height:18px;accent-color:#F59E0B;">
            <span style="flex:1;">${i.name} ×${i.quantity}</span>
            <span>R${((i.unitPrice||0)*(i.quantity||0)).toFixed(2)}</span></label>`).join('');
    const modal = document.createElement('div');
    modal.id = 'txnActionModal';
    modal.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:10003;display:flex;align-items:center;justify-content:center;';
    modal.innerHTML = `<div style="background:#141414;border:1px solid #2a2a2a;border-radius:18px;width:92%;max-width:420px;overflow:hidden;">
        <div style="background:rgba(245,158,11,0.14);padding:15px 20px;border-bottom:1px solid #2a2a2a;color:#FAFAFA;font-weight:700;">Refund Slip #${s.saleNumber}</div>
        <div style="padding:14px 20px;display:flex;flex-direction:column;gap:11px;max-height:64vh;overflow-y:auto;">
            <div style="font-size:0.72rem;color:#888;letter-spacing:0.5px;">SELECT ITEMS TO REFUND</div>
            <div style="border:1px solid #2a2a2a;border-radius:10px;padding:6px 12px;">${rows}</div>
            ${_txnAuthBox('Refund', '#F59E0B')}
        </div>
        <div style="display:flex;gap:10px;padding:0 20px 20px;">
            <button onclick="document.getElementById('txnActionModal').remove()" style="flex:1;padding:13px;background:#262626;border:none;border-radius:11px;color:#FAFAFA;font-weight:600;cursor:pointer;">Cancel</button>
            <button onclick="_txnSubmit('${saleId}','refund')" style="flex:2;padding:13px;background:#F59E0B;border:none;border-radius:11px;color:#1A1A1A;font-weight:700;cursor:pointer;">Confirm Refund</button>
        </div></div>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });
}

async function _txnSubmit(saleId, type) {
    const s = _txnSales.find(x => x._id === saleId);
    const pin = document.getElementById('txnPin').value;
    const reason = document.getElementById('txnNote').value;
    const msg = document.getElementById('txnMsg');
    if (!pin) { msg.textContent = 'Enter an admin PIN to approve.'; return; }
    msg.style.color = '#888'; msg.textContent = 'Verifying admin…';

    let url, body;
    if (type === 'void') {
        url = `${API_URL}/pos/sale/${saleId}/quick-void`;
        body = { pin, reason };
    } else {
        const picked = Array.from(document.querySelectorAll('.txn-ref-item:checked')).map(c => s.items[+c.dataset.idx]);
        if (!picked.length) { msg.style.color = '#DC2626'; msg.textContent = 'Select at least one item.'; return; }
        const refundAmount = picked.reduce((a, i) => a + (i.unitPrice || 0) * (i.quantity || 0), 0);
        url = `${API_URL}/pos/sale/${saleId}/quick-refund`;
        body = { pin, reason, refundAmount, items: picked.map(i => ({ productId: i.productId, quantity: i.quantity })) };
    }
    try {
        const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${_txnToken()}` }, body: JSON.stringify(body) });
        const data = await res.json();
        if (!res.ok || !data.success) { msg.style.color = '#DC2626'; msg.textContent = data.message || 'Action failed'; return; }
        document.getElementById('txnActionModal')?.remove();
        document.getElementById('txnDetailModal')?.remove();
        // Flip the row status immediately so it shows VOIDED/REFUNDED without waiting for refetch
        if (s) s.status = (type === 'void') ? 'voided' : 'refunded';
        _txnRender();
        // Confirmed persisted: the backend reverses till totals + sets status synchronously before responding.
        _posPersistConfirm(`Slip #${s ? s.saleNumber : ''} ${type === 'void' ? 'voided' : 'refunded'}`, 'Till totals updated · recorded in the database');
        openTransactions(); // reload list from server
    } catch (e) {
        msg.style.color = '#DC2626'; msg.textContent = 'Network error — try again';
    }
}
