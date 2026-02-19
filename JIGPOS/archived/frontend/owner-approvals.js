// owner-approvals.js — Pending approvals for owner dashboard
// Depends on: owner-auth.js (token), owner-core.js (formatTimeAgo)
// Depends on: config.js (API_URL), dbc-utils.js (showToast)

// ===== PENDING APPROVALS FUNCTIONS =====

let pendingPOs = [];
let pendingSuppliers = [];
let pendingBatches = [];
let pendingStockTakes = [];

async function loadPendingApprovals() {
    try {
        // Load pending POs
        const poRes = await fetch(`${API_URL}/purchase-orders?status=submitted`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (poRes.ok) {
            const data = await poRes.json();
            pendingPOs = data.purchaseOrders || [];
            document.getElementById('pendingPOCount').textContent = pendingPOs.length;
        }

        // Load pending supplier verifications
        const suppRes = await fetch(`${API_URL}/suppliers?complianceStatus=pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (suppRes.ok) {
            const data = await suppRes.json();
            pendingSuppliers = data.suppliers || [];
            document.getElementById('pendingSupplierCount').textContent = pendingSuppliers.length;
        }

        // Load pending batch QA
        const batchRes = await fetch(`${API_URL}/batches?qaStatus=pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (batchRes.ok) {
            const data = await batchRes.json();
            pendingBatches = data.batches || [];
            document.getElementById('pendingBatchCount').textContent = pendingBatches.length;
        }

        // Load pending stock takes
        const stRes = await fetch(`${API_URL}/stocktake/pending`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (stRes.ok) {
            const data = await stRes.json();
            pendingStockTakes = data.sessions || [];
            document.getElementById('pendingStockTakeCount').textContent = pendingStockTakes.length;
        }

        // Calculate total alerts
        const alertCount = pendingPOs.length + pendingSuppliers.length + pendingBatches.length + pendingStockTakes.length;
        document.getElementById('alertCount').textContent = alertCount;

    } catch (error) {
        console.error('Error loading pending approvals:', error);
    }
}

function showPendingPOs() {
    document.getElementById('approvalsPanelTitle').innerHTML = '<i class="fas fa-file-invoice-dollar"></i> Purchase Orders Awaiting Approval';
    const content = document.getElementById('approvalsPanelContent');

    if (pendingPOs.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-500);"><i class="fas fa-check-circle" style="font-size: 2rem; color: #22C55E; margin-bottom: 1rem;"></i><p>No purchase orders awaiting approval</p></div>';
    } else {
        content.innerHTML = pendingPOs.map(po => `
            <div style="background: var(--gray-50); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <strong style="color: var(--green-dark);">${po.poNumber || 'PO-' + po._id?.slice(-6)}</strong>
                        <p style="color: var(--gray-500); font-size: 0.85rem; margin: 0.25rem 0;">Supplier: ${po.supplier?.name || 'Unknown'}</p>
                    </div>
                    <span style="background: var(--gold); color: var(--green-deep); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">R${(po.total || 0).toFixed(2)}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--gray-700); margin-bottom: 0.75rem;">${po.items?.length || 0} items | Submitted ${formatTimeAgo(po.submittedAt || po.createdAt)}</p>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="approvePO('${po._id}')" style="flex: 1; padding: 0.5rem; background: #22C55E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-check"></i> Approve</button>
                    <button onclick="rejectPO('${po._id}')" style="flex: 1; padding: 0.5rem; background: var(--red); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-times"></i> Reject</button>
                    <button onclick="viewPODetails('${po._id}')" style="padding: 0.5rem 1rem; background: var(--gray-200); color: var(--gray-700); border: none; border-radius: 6px; cursor: pointer;"><i class="fas fa-eye"></i></button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('approvalsPanel').style.display = 'block';
}

function showPendingSuppliers() {
    document.getElementById('approvalsPanelTitle').innerHTML = '<i class="fas fa-building"></i> Supplier Verifications';
    const content = document.getElementById('approvalsPanelContent');

    if (pendingSuppliers.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-500);"><i class="fas fa-check-circle" style="font-size: 2rem; color: #22C55E; margin-bottom: 1rem;"></i><p>No suppliers pending verification</p></div>';
    } else {
        content.innerHTML = pendingSuppliers.map(supplier => `
            <div style="background: var(--gray-50); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <strong style="color: var(--green-dark);">${supplier.name}</strong>
                        <p style="color: var(--gray-500); font-size: 0.85rem; margin: 0.25rem 0;">Type: ${supplier.license?.type || 'Unknown'}</p>
                    </div>
                    <span style="background: var(--gold); color: var(--green-deep); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">${supplier.license?.number || 'No License'}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--gray-700); margin-bottom: 0.75rem;">
                    <i class="fas fa-envelope"></i> ${supplier.email || 'N/A'} |
                    <i class="fas fa-phone"></i> ${supplier.phone || 'N/A'}
                </p>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="verifySupplier('${supplier._id}')" style="flex: 1; padding: 0.5rem; background: #22C55E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-check"></i> Verify</button>
                    <button onclick="suspendSupplier('${supplier._id}')" style="flex: 1; padding: 0.5rem; background: var(--red); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-ban"></i> Suspend</button>
                    <button onclick="viewSupplierDocs('${supplier._id}')" style="padding: 0.5rem 1rem; background: var(--gray-200); color: var(--gray-700); border: none; border-radius: 6px; cursor: pointer;"><i class="fas fa-file-alt"></i></button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('approvalsPanel').style.display = 'block';
}

function showPendingBatches() {
    document.getElementById('approvalsPanelTitle').innerHTML = '<i class="fas fa-box"></i> Batch QA Reviews';
    const content = document.getElementById('approvalsPanelContent');

    if (pendingBatches.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-500);"><i class="fas fa-check-circle" style="font-size: 2rem; color: #22C55E; margin-bottom: 1rem;"></i><p>No batches pending QA review</p></div>';
    } else {
        content.innerHTML = pendingBatches.map(batch => `
            <div style="background: var(--gray-50); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <strong style="color: var(--green-dark);">${batch.batchId || 'BATCH-' + batch._id?.slice(-6)}</strong>
                        <p style="color: var(--gray-500); font-size: 0.85rem; margin: 0.25rem 0;">Product: ${batch.product?.name || 'Unknown'}</p>
                    </div>
                    <span style="background: var(--green); color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">${batch.remainingQuantity || 0} ${batch.unitOfMeasure || 'units'}</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--gray-700); margin-bottom: 0.75rem;">
                    THC: ${batch.cannabinoids?.thc || 0}% | CBD: ${batch.cannabinoids?.cbd || 0}% |
                    Expires: ${batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}
                </p>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="approveBatch('${batch._id}')" style="flex: 1; padding: 0.5rem; background: #22C55E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-check"></i> Approve</button>
                    <button onclick="rejectBatch('${batch._id}')" style="flex: 1; padding: 0.5rem; background: var(--red); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-times"></i> Reject</button>
                    <button onclick="viewBatchDetails('${batch._id}')" style="padding: 0.5rem 1rem; background: var(--gray-200); color: var(--gray-700); border: none; border-radius: 6px; cursor: pointer;"><i class="fas fa-flask"></i></button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('approvalsPanel').style.display = 'block';
}

function showPendingStockTakes() {
    document.getElementById('approvalsPanelTitle').innerHTML = '<i class="fas fa-clipboard-list"></i> Stock Take Approvals';
    const content = document.getElementById('approvalsPanelContent');

    if (pendingStockTakes.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-500);"><i class="fas fa-check-circle" style="font-size: 2rem; color: #22C55E; margin-bottom: 1rem;"></i><p>No stock takes pending approval</p></div>';
    } else {
        content.innerHTML = pendingStockTakes.map(session => `
            <div style="background: var(--gray-50); border-radius: 12px; padding: 1rem; margin-bottom: 1rem; border: 1px solid var(--gray-200);">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem;">
                    <div>
                        <strong style="color: var(--green-dark);">${session.branchId?.name || 'Unknown Branch'}</strong>
                        <p style="color: var(--gray-500); font-size: 0.85rem; margin: 0.25rem 0;">Type: ${session.stockTakeType || 'Full'} Stock Take</p>
                    </div>
                    <span style="background: #8B5CF6; color: white; padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.75rem; font-weight: 700;">${session.lineItems?.length || 0} items</span>
                </div>
                <p style="font-size: 0.85rem; color: var(--gray-700); margin-bottom: 0.75rem;">
                    <i class="fas fa-user"></i> ${session.submittedBy?.firstName || ''} ${session.submittedBy?.lastName || 'Staff'} |
                    <i class="fas fa-clock"></i> ${formatTimeAgo(session.submittedAt || session.startedAt)}
                </p>
                <div style="background: rgba(139,92,246,0.1); padding: 0.5rem; border-radius: 6px; margin-bottom: 0.75rem; font-size: 0.8rem;">
                    <span style="color: #22C55E;"><i class="fas fa-check"></i> ${session.lineItems?.filter(li => li.actualQty === li.expectedQty).length || 0} match</span> |
                    <span style="color: var(--gold);"><i class="fas fa-exclamation-triangle"></i> ${session.lineItems?.filter(li => li.actualQty !== li.expectedQty).length || 0} discrepancies</span>
                </div>
                <div style="display: flex; gap: 0.5rem;">
                    <button onclick="approveStockTake('${session._id}')" style="flex: 1; padding: 0.5rem; background: #22C55E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-check"></i> Approve</button>
                    <button onclick="rejectStockTake('${session._id}')" style="flex: 1; padding: 0.5rem; background: var(--red); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-times"></i> Reject</button>
                    <button onclick="viewStockTakeDetails('${session._id}')" style="padding: 0.5rem 1rem; background: var(--gray-200); color: var(--gray-700); border: none; border-radius: 6px; cursor: pointer;"><i class="fas fa-eye"></i></button>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('approvalsPanel').style.display = 'block';
}

function showSystemAlerts() {
    document.getElementById('approvalsPanelTitle').innerHTML = '<i class="fas fa-bell"></i> System Alerts';
    const content = document.getElementById('approvalsPanelContent');

    const alerts = [];
    if (pendingPOs.length > 0) alerts.push({ type: 'warning', icon: 'file-invoice-dollar', message: `${pendingPOs.length} purchase order(s) awaiting approval` });
    if (pendingSuppliers.length > 0) alerts.push({ type: 'warning', icon: 'building', message: `${pendingSuppliers.length} supplier(s) pending verification` });
    if (pendingBatches.length > 0) alerts.push({ type: 'info', icon: 'box', message: `${pendingBatches.length} batch(es) ready for QA review` });
    if (pendingStockTakes.length > 0) alerts.push({ type: 'warning', icon: 'clipboard-list', message: `${pendingStockTakes.length} stock take(s) pending approval` });

    if (alerts.length === 0) {
        content.innerHTML = '<div style="text-align: center; padding: 2rem; color: var(--gray-500);"><i class="fas fa-check-circle" style="font-size: 2rem; color: #22C55E; margin-bottom: 1rem;"></i><p>All systems operational - no alerts</p></div>';
    } else {
        content.innerHTML = alerts.map(alert => `
            <div style="background: ${alert.type === 'warning' ? 'rgba(212,175,55,0.1)' : 'rgba(99,102,241,0.1)'}; border-radius: 8px; padding: 1rem; margin-bottom: 0.75rem; border-left: 4px solid ${alert.type === 'warning' ? 'var(--gold)' : '#6366F1'};">
                <div style="display: flex; align-items: center; gap: 0.75rem;">
                    <i class="fas fa-${alert.icon}" style="color: ${alert.type === 'warning' ? 'var(--gold-dark)' : '#6366F1'};"></i>
                    <span>${alert.message}</span>
                </div>
            </div>
        `).join('');
    }

    document.getElementById('approvalsPanel').style.display = 'block';
}

function hideApprovalsPanel() {
    document.getElementById('approvalsPanel').style.display = 'none';
}

// ===== BRANDED CONFIRMATION MODAL (replaces browser confirm/prompt) =====

function showConfirmModal(title, message, onConfirm, options = {}) {
    const existing = document.getElementById('ownerConfirmModal');
    if (existing) existing.remove();

    const hasInput = options.inputLabel || false;
    const inputPlaceholder = options.inputPlaceholder || '';
    const confirmText = options.confirmText || 'Confirm';
    const confirmColor = options.confirmColor || '#22C55E';
    const cancelText = options.cancelText || 'Cancel';

    const modal = document.createElement('div');
    modal.id = 'ownerConfirmModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.5);z-index:1200;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;';
    modal.innerHTML = `
        <div style="background:var(--white);border-radius:16px;width:90%;max-width:420px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
            <div style="background:linear-gradient(135deg,var(--green) 0%,var(--green-dark) 100%);padding:1rem 1.25rem;display:flex;align-items:center;gap:0.75rem;">
                <i class="fas fa-shield-alt" style="color:var(--gold);font-size:1.2rem;"></i>
                <h3 style="color:var(--cream);margin:0;font-family:'Passion One',cursive;font-size:1.2rem;">${title}</h3>
            </div>
            <div style="padding:1.25rem;">
                <p style="color:var(--gray-700);margin-bottom:1rem;line-height:1.5;">${message}</p>
                ${hasInput ? `
                    <label style="display:block;font-weight:600;color:var(--green-dark);margin-bottom:0.5rem;font-size:0.9rem;">${options.inputLabel}</label>
                    <textarea id="confirmModalInput" rows="2" placeholder="${inputPlaceholder}" style="width:100%;padding:0.75rem;border:2px solid var(--gray-200);border-radius:8px;font-size:0.95rem;font-family:inherit;resize:vertical;"></textarea>
                ` : ''}
                <div style="display:flex;gap:0.75rem;margin-top:1.25rem;">
                    <button id="confirmModalOk" style="flex:1;padding:0.75rem;background:${confirmColor};color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:0.95rem;">
                        ${confirmText}
                    </button>
                    <button id="confirmModalCancel" style="flex:1;padding:0.75rem;background:var(--gray-200);color:var(--gray-700);border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:0.95rem;">
                        ${cancelText}
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);

    const cleanup = () => modal.remove();

    document.getElementById('confirmModalOk').addEventListener('click', () => {
        const inputVal = hasInput ? document.getElementById('confirmModalInput')?.value?.trim() : null;
        if (hasInput && !inputVal) {
            document.getElementById('confirmModalInput').style.borderColor = 'var(--red)';
            return;
        }
        cleanup();
        onConfirm(inputVal);
    });

    document.getElementById('confirmModalCancel').addEventListener('click', cleanup);
    modal.addEventListener('click', (e) => { if (e.target === modal) cleanup(); });
}

// ===== APPROVAL ACTIONS =====

async function approvePO(poId) {
    showConfirmModal('Approve Purchase Order', 'Are you sure you want to approve this purchase order?', async () => {
        try {
            const res = await fetch(`${API_URL}/purchase-orders/${poId}/approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Purchase order approved', 'success');
                await loadPendingApprovals();
                showPendingPOs();
            } else {
                throw new Error('Failed to approve');
            }
        } catch (error) {
            showToast('Failed to approve purchase order', 'error');
        }
    }, { confirmText: 'Approve', confirmColor: '#22C55E' });
}

async function rejectPO(poId) {
    showConfirmModal('Reject Purchase Order', 'This will cancel the purchase order and notify the submitter.', async (reason) => {
        try {
            const res = await fetch(`${API_URL}/purchase-orders/${poId}/cancel`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                showToast('Purchase order rejected', 'info');
                await loadPendingApprovals();
                showPendingPOs();
            } else {
                throw new Error('Failed to reject');
            }
        } catch (error) {
            showToast('Failed to reject purchase order', 'error');
        }
    }, { inputLabel: 'Rejection Reason', inputPlaceholder: 'Enter reason for rejection...', confirmText: 'Reject', confirmColor: 'var(--red)' });
}

function viewPODetails(poId) {
    const po = pendingPOs.find(p => p._id === poId);
    if (!po) {
        showToast('Purchase order not found', 'error');
        return;
    }

    const content = document.getElementById('approvalsPanelContent');
    const itemsHtml = (po.items || []).map((item, i) => `
        <div style="display: flex; justify-content: space-between; padding: 0.5rem 0; border-bottom: 1px solid var(--gray-200); font-size: 0.85rem;">
            <span>${i + 1}. ${item.product?.name || item.productName || 'Unknown'}</span>
            <span>x${item.quantity} @ R${(item.unitPrice || 0).toFixed(2)} = <strong>R${(item.totalPrice || item.quantity * item.unitPrice || 0).toFixed(2)}</strong></span>
        </div>
    `).join('');

    content.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <button onclick="showPendingPOs()" style="background: var(--gray-200); border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;"><i class="fas fa-arrow-left"></i> Back</button>
        </div>
        <h4 style="color: var(--green-dark); margin-bottom: 1rem;">${po.poNumber || 'PO-' + po._id?.slice(-6)}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
            <div><small style="color: var(--gray-500);">Supplier</small><div style="font-weight: 600;">${po.supplier?.name || 'Unknown'}</div></div>
            <div><small style="color: var(--gray-500);">Total</small><div style="font-weight: 700; color: var(--green);">R${(po.total || 0).toFixed(2)}</div></div>
            <div><small style="color: var(--gray-500);">Expected Delivery</small><div>${po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'TBD'}</div></div>
            <div><small style="color: var(--gray-500);">Submitted</small><div>${formatTimeAgo(po.submittedAt || po.createdAt)}</div></div>
        </div>
        <h5 style="color: var(--green); margin: 1rem 0 0.5rem;"><i class="fas fa-list"></i> Line Items (${po.items?.length || 0})</h5>
        <div style="background: var(--gray-50); border-radius: 8px; padding: 0.75rem;">
            ${itemsHtml}
            <div style="display: flex; justify-content: space-between; padding: 0.75rem 0 0; font-weight: 700;">
                <span>Total (incl. tax)</span>
                <span style="color: var(--green);">R${(po.total || 0).toFixed(2)}</span>
            </div>
        </div>
        ${po.deliveryNotes ? `<div style="margin-top: 0.75rem;"><small style="color: var(--gray-500);">Delivery Notes:</small><p style="font-size: 0.9rem;">${po.deliveryNotes}</p></div>` : ''}
        <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button onclick="approvePO('${po._id}')" style="flex: 1; padding: 0.75rem; background: #22C55E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-check"></i> Approve</button>
            <button onclick="rejectPO('${po._id}')" style="flex: 1; padding: 0.75rem; background: var(--red); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-times"></i> Reject</button>
        </div>
    `;
}

async function verifySupplier(supplierId) {
    showConfirmModal('Verify Supplier', 'Confirm this supplier meets compliance requirements?', async () => {
        try {
            const res = await fetch(`${API_URL}/suppliers/${supplierId}/verify`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Supplier verified successfully', 'success');
                await loadPendingApprovals();
                showPendingSuppliers();
            } else {
                throw new Error('Failed to verify');
            }
        } catch (error) {
            showToast('Failed to verify supplier', 'error');
        }
    }, { confirmText: 'Verify', confirmColor: '#22C55E' });
}

async function suspendSupplier(supplierId) {
    showConfirmModal('Suspend Supplier', 'This will suspend the supplier and block new orders.', async (reason) => {
        try {
            const res = await fetch(`${API_URL}/suppliers/${supplierId}`, {
                method: 'PUT',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ complianceStatus: 'suspended', notes: reason })
            });
            if (res.ok) {
                showToast('Supplier suspended', 'info');
                await loadPendingApprovals();
                showPendingSuppliers();
            } else {
                throw new Error('Failed to suspend');
            }
        } catch (error) {
            showToast('Failed to suspend supplier', 'error');
        }
    }, { inputLabel: 'Suspension Reason', inputPlaceholder: 'Enter reason for suspension...', confirmText: 'Suspend', confirmColor: 'var(--red)' });
}

async function viewSupplierDocs(supplierId) {
    const supplier = pendingSuppliers.find(s => s._id === supplierId);
    if (!supplier) {
        showToast('Supplier not found', 'error');
        return;
    }

    const content = document.getElementById('approvalsPanelContent');

    content.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <button onclick="showPendingSuppliers()" style="background: var(--gray-200); border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;"><i class="fas fa-arrow-left"></i> Back</button>
        </div>
        <h4 style="color: var(--green-dark); margin-bottom: 1rem;">${supplier.name}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
            <div><small style="color: var(--gray-500);">Email</small><div>${supplier.email || 'N/A'}</div></div>
            <div><small style="color: var(--gray-500);">Phone</small><div>${supplier.phone || 'N/A'}</div></div>
            <div><small style="color: var(--gray-500);">Address</small><div>${supplier.address?.city || ''} ${supplier.address?.province || ''}</div></div>
            <div><small style="color: var(--gray-500);">Payment Terms</small><div>${supplier.paymentTerms || 'N/A'}</div></div>
        </div>
        <hr>
        <h5 style="color: var(--green); margin: 1rem 0 0.5rem;"><i class="fas fa-certificate"></i> License & Compliance</h5>
        <div style="background: var(--gray-50); border-radius: 8px; padding: 1rem; margin-bottom: 1rem;">
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem;">
                <div><small style="color: var(--gray-500);">License Type</small><div style="font-weight: 600;">${supplier.license?.type || 'Not specified'}</div></div>
                <div><small style="color: var(--gray-500);">License Number</small><div style="font-weight: 600;">${supplier.license?.number || 'Not provided'}</div></div>
                <div><small style="color: var(--gray-500);">Expiry Date</small><div style="font-weight: 600; color: ${supplier.license?.expiryDate && new Date(supplier.license.expiryDate) < new Date() ? 'var(--red)' : 'var(--green)'};">${supplier.license?.expiryDate ? new Date(supplier.license.expiryDate).toLocaleDateString() : 'N/A'}</div></div>
                <div><small style="color: var(--gray-500);">Compliance Status</small><div style="font-weight: 600;">${supplier.complianceStatus || 'Pending'}</div></div>
            </div>
        </div>
        ${supplier.categories?.length ? `
            <h5 style="color: var(--green); margin: 1rem 0 0.5rem;"><i class="fas fa-tags"></i> Categories</h5>
            <div style="display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 1rem;">
                ${supplier.categories.map(c => `<span style="background: var(--green); color: var(--cream); padding: 0.25rem 0.75rem; border-radius: 20px; font-size: 0.8rem;">${c}</span>`).join('')}
            </div>
        ` : ''}
        ${supplier.notes ? `<div style="margin-top: 0.75rem;"><small style="color: var(--gray-500);">Notes:</small><p style="font-size: 0.9rem;">${supplier.notes}</p></div>` : ''}
        <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button onclick="verifySupplier('${supplier._id}')" style="flex: 1; padding: 0.75rem; background: #22C55E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-check"></i> Verify Supplier</button>
            <button onclick="suspendSupplier('${supplier._id}')" style="flex: 1; padding: 0.75rem; background: var(--red); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-ban"></i> Suspend</button>
        </div>
    `;
}

async function approveBatch(batchId) {
    showConfirmModal('Approve Batch', 'Approve this batch for distribution? This will make it available for sale.', async () => {
        try {
            const res = await fetch(`${API_URL}/batches/${batchId}/qa-approve`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (res.ok) {
                showToast('Batch approved for distribution', 'success');
                await loadPendingApprovals();
                showPendingBatches();
            } else {
                throw new Error('Failed to approve');
            }
        } catch (error) {
            showToast('Failed to approve batch', 'error');
        }
    }, { confirmText: 'Approve', confirmColor: '#22C55E' });
}

async function rejectBatch(batchId) {
    showConfirmModal('Reject Batch', 'This batch will be marked as failed QA and removed from distribution.', async (reason) => {
        try {
            const res = await fetch(`${API_URL}/batches/${batchId}/qa-reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ reason })
            });
            if (res.ok) {
                showToast('Batch rejected', 'info');
                await loadPendingApprovals();
                showPendingBatches();
            } else {
                throw new Error('Failed to reject');
            }
        } catch (error) {
            showToast('Failed to reject batch', 'error');
        }
    }, { inputLabel: 'Rejection Reason', inputPlaceholder: 'Enter reason for rejection...', confirmText: 'Reject', confirmColor: 'var(--red)' });
}

function viewBatchDetails(batchId) {
    const batch = pendingBatches.find(b => b._id === batchId);
    if (!batch) {
        showToast('Batch not found', 'error');
        return;
    }

    const content = document.getElementById('approvalsPanelContent');
    const thc = batch.cannabinoids?.thc || 0;
    const cbd = batch.cannabinoids?.cbd || 0;
    const cbg = batch.cannabinoids?.cbg || 0;
    const cbn = batch.cannabinoids?.cbn || 0;

    content.innerHTML = `
        <div style="margin-bottom: 1rem;">
            <button onclick="showPendingBatches()" style="background: var(--gray-200); border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;"><i class="fas fa-arrow-left"></i> Back</button>
        </div>
        <h4 style="color: var(--green-dark); margin-bottom: 1rem;">${batch.batchId || 'BATCH-' + batch._id?.slice(-6)}</h4>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 1rem;">
            <div><small style="color: var(--gray-500);">Product</small><div style="font-weight: 600;">${batch.product?.name || 'Unknown'}</div></div>
            <div><small style="color: var(--gray-500);">Supplier</small><div>${batch.supplier?.name || 'Direct'}</div></div>
            <div><small style="color: var(--gray-500);">Quantity</small><div style="font-weight: 600;">${batch.remainingQuantity || 0} ${batch.unitOfMeasure || 'units'}</div></div>
            <div><small style="color: var(--gray-500);">Expiry</small><div>${batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</div></div>
        </div>
        <hr>
        <h5 style="color: var(--green); margin: 1rem 0 0.5rem;"><i class="fas fa-flask"></i> Cannabinoid Profile</h5>
        <div style="display: grid; grid-template-columns: repeat(4, 1fr); gap: 0.5rem; margin-bottom: 1rem;">
            <div style="text-align: center; background: var(--green); color: var(--cream); border-radius: 8px; padding: 0.75rem;">
                <div style="font-size: 1.25rem; font-weight: 700;">${thc}%</div>
                <small>THC</small>
            </div>
            <div style="text-align: center; background: var(--gold); color: var(--green-deep); border-radius: 8px; padding: 0.75rem;">
                <div style="font-size: 1.25rem; font-weight: 700;">${cbd}%</div>
                <small>CBD</small>
            </div>
            <div style="text-align: center; background: var(--gray-100); border-radius: 8px; padding: 0.75rem;">
                <div style="font-size: 1.25rem; font-weight: 700;">${cbg}%</div>
                <small>CBG</small>
            </div>
            <div style="text-align: center; background: var(--gray-100); border-radius: 8px; padding: 0.75rem;">
                <div style="font-size: 1.25rem; font-weight: 700;">${cbn}%</div>
                <small>CBN</small>
            </div>
        </div>
        ${batch.harvestDate ? `<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 0.75rem; margin-bottom: 0.75rem;"><div><small style="color: var(--gray-500);">Harvest Date:</small> ${new Date(batch.harvestDate).toLocaleDateString()}</div><div><small style="color: var(--gray-500);">Test Date:</small> ${batch.testDate ? new Date(batch.testDate).toLocaleDateString() : 'N/A'}</div></div>` : ''}
        ${batch.labCertificateUrl ? `<div style="margin-bottom: 1rem;"><a href="${batch.labCertificateUrl}" target="_blank" style="color: var(--green); text-decoration: none;"><i class="fas fa-file-pdf"></i> View Lab Certificate</a></div>` : ''}
        <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button onclick="approveBatch('${batch._id}')" style="flex: 1; padding: 0.75rem; background: #22C55E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-check"></i> Approve</button>
            <button onclick="rejectBatch('${batch._id}')" style="flex: 1; padding: 0.75rem; background: var(--red); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-times"></i> Reject</button>
        </div>
    `;
}

// ===== STOCK TAKE APPROVAL ACTIONS =====

async function approveStockTake(sessionId) {
    showConfirmModal('Approve Stock Take', 'Inventory will be updated to match the counted quantities. This action cannot be undone.', async () => {
        try {
            const res = await fetch(`${API_URL}/stocktake/session/${sessionId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'approve' })
            });
            if (res.ok) {
                showToast('Stock take approved - inventory updated', 'success');
                await loadPendingApprovals();
                showPendingStockTakes();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to approve');
            }
        } catch (error) {
            showToast(error.message || 'Failed to approve stock take', 'error');
        }
    }, { confirmText: 'Approve & Update', confirmColor: '#22C55E' });
}

async function rejectStockTake(sessionId) {
    showConfirmModal('Reject Stock Take', 'The stock take will be sent back to staff for recount.', async (reason) => {
        try {
            const res = await fetch(`${API_URL}/stocktake/session/${sessionId}/approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ action: 'reject', reason })
            });
            if (res.ok) {
                showToast('Stock take rejected - staff notified', 'info');
                await loadPendingApprovals();
                showPendingStockTakes();
            } else {
                const data = await res.json();
                throw new Error(data.error || 'Failed to reject');
            }
        } catch (error) {
            showToast(error.message || 'Failed to reject stock take', 'error');
        }
    }, { inputLabel: 'Rejection Reason', inputPlaceholder: 'Enter reason for rejection...', confirmText: 'Reject', confirmColor: 'var(--red)' });
}

function viewStockTakeDetails(sessionId) {
    const session = pendingStockTakes.find(s => s._id === sessionId);
    if (!session) {
        showToast('Stock take not found', 'error');
        return;
    }

    const content = document.getElementById('approvalsPanelContent');
    const discrepancies = session.lineItems?.filter(li => li.actualQty !== li.expectedQty) || [];
    const matches = session.lineItems?.filter(li => li.actualQty === li.expectedQty) || [];

    let html = `
        <div style="margin-bottom: 1rem;">
            <button onclick="showPendingStockTakes()" style="background: var(--gray-200); border: none; padding: 0.5rem 1rem; border-radius: 6px; cursor: pointer;"><i class="fas fa-arrow-left"></i> Back</button>
        </div>
        <h4 style="color: var(--green-dark); margin-bottom: 1rem;">${session.branchId?.name || 'Unknown Branch'} - ${session.stockTakeType || 'Full'} Stock Take</h4>
        <p style="font-size: 0.85rem; color: var(--gray-500); margin-bottom: 1rem;">Submitted by ${session.submittedBy?.firstName || ''} ${session.submittedBy?.lastName || 'Staff'} on ${new Date(session.submittedAt || session.startedAt).toLocaleString()}</p>
    `;

    if (discrepancies.length > 0) {
        html += `<h5 style="color: var(--gold); margin: 1rem 0 0.5rem;"><i class="fas fa-exclamation-triangle"></i> Discrepancies (${discrepancies.length})</h5>`;
        html += discrepancies.map(li => `
            <div style="background: rgba(212,175,55,0.1); border-radius: 8px; padding: 0.75rem; margin-bottom: 0.5rem; border-left: 3px solid var(--gold);">
                <strong>${li.productId?.name || li.productName || 'Unknown Product'}</strong>
                <div style="display: flex; justify-content: space-between; font-size: 0.85rem; margin-top: 0.25rem;">
                    <span>Expected: <strong>${li.expectedQty}</strong></span>
                    <span>Counted: <strong style="color: ${li.actualQty > li.expectedQty ? '#22C55E' : 'var(--red)'};">${li.actualQty}</strong></span>
                    <span>Variance: <strong style="color: ${li.actualQty > li.expectedQty ? '#22C55E' : 'var(--red)'};">${li.actualQty - li.expectedQty > 0 ? '+' : ''}${li.actualQty - li.expectedQty}</strong></span>
                </div>
                ${li.notes ? `<p style="font-size: 0.8rem; color: var(--gray-500); margin-top: 0.25rem;"><i class="fas fa-sticky-note"></i> ${li.notes}</p>` : ''}
            </div>
        `).join('');
    }

    if (matches.length > 0) {
        html += `<h5 style="color: #22C55E; margin: 1rem 0 0.5rem;"><i class="fas fa-check-circle"></i> Matched Items (${matches.length})</h5>`;
        html += `<div style="background: rgba(34,197,94,0.1); border-radius: 8px; padding: 0.75rem; font-size: 0.85rem;">`;
        html += matches.map(li => `<span style="display: inline-block; background: #22C55E; color: white; padding: 0.25rem 0.5rem; border-radius: 4px; margin: 0.125rem;">${li.productId?.name || li.productName || 'Unknown'}: ${li.actualQty}</span>`).join(' ');
        html += `</div>`;
    }

    html += `
        <div style="display: flex; gap: 0.5rem; margin-top: 1.5rem;">
            <button onclick="approveStockTake('${session._id}')" style="flex: 1; padding: 0.75rem; background: #22C55E; color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-check"></i> Approve & Update Inventory</button>
            <button onclick="rejectStockTake('${session._id}')" style="flex: 1; padding: 0.75rem; background: var(--red); color: white; border: none; border-radius: 6px; cursor: pointer; font-weight: 600;"><i class="fas fa-times"></i> Reject</button>
        </div>
    `;

    content.innerHTML = html;
}
