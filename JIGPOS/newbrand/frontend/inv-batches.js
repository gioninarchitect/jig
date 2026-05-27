// inv-batches.js — Batches CRUD for inventory manager dashboard
// Depends on: config.js (API_URL), or-utils.js (showToast), or-auth.js (getToken)

// ==================== BATCHES CRUD ====================

async function loadBatches() {
    const status = document.getElementById('batchStatusFilter')?.value || '';
    const supplier = document.getElementById('batchSupplierFilter')?.value || '';
    const search = document.getElementById('batchSearch')?.value || '';

    try {
        let url = `${API_URL}/batches?`;
        if (status) url += `status=${status}&`;
        if (supplier) url += `supplier=${supplier}&`;
        if (search) url += `search=${search}&`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load batches');

        const data = await response.json();
        const batches = data.batches || [];

        // Update stats
        const pending = batches.filter(b => b.qaStatus === 'pending').length;
        const approved = batches.filter(b => b.qaStatus === 'approved').length;
        const rejected = batches.filter(b => b.qaStatus === 'rejected').length;
        const expired = batches.filter(b => b.qaStatus === 'expired').length;

        document.getElementById('pendingQACount').textContent = pending;
        document.getElementById('approvedBatchCount').textContent = approved;
        document.getElementById('rejectedBatchCount').textContent = rejected;
        document.getElementById('expiredBatchCount').textContent = expired;

        renderBatchesTable(batches);
    } catch (error) {
        console.error('Error loading batches:', error);
        renderBatchesTable([]);
    }
}

function renderBatchesTable(batches) {
    const tbody = document.getElementById('batchesTableBody');

    if (batches.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" class="text-center py-4">
                    <i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5;"></i>
                    <p class="mb-0 mt-2">No batches found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = batches.map(batch => {
        const statusBadge = {
            'pending': '<span class="badge bg-warning">Pending QA</span>',
            'approved': '<span class="badge bg-success">Approved</span>',
            'rejected': '<span class="badge bg-danger">Rejected</span>',
            'expired': '<span class="badge bg-secondary">Expired</span>'
        }[batch.qaStatus] || '<span class="badge bg-secondary">Unknown</span>';

        const thc = batch.cannabinoids?.thc || 0;
        const cbd = batch.cannabinoids?.cbd || 0;
        const expiryDate = batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A';

        return `
            <tr>
                <td><strong>${batch.batchId || batch._id?.slice(-8)}</strong></td>
                <td>${batch.product?.name || 'Unknown Product'}</td>
                <td>${batch.supplier?.name || 'Direct'}</td>
                <td>THC: ${thc}% / CBD: ${cbd}%</td>
                <td>${batch.remainingQuantity || 0} ${batch.unitOfMeasure || 'units'}</td>
                <td>${statusBadge}</td>
                <td>${expiryDate}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewBatch('${batch._id}')" title="View Details">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${batch.qaStatus === 'pending' ? `
                            <button class="btn btn-outline-success" onclick="approveBatch('${batch._id}')" title="Approve">
                                <i class="fas fa-check-circle"></i>
                            </button>
                            <button class="btn btn-outline-danger" onclick="rejectBatch('${batch._id}')" title="Reject">
                                <i class="fas fa-times-circle"></i>
                            </button>
                        ` : ''}
                        <button class="btn btn-outline-secondary" onclick="printBatchLabel('${batch._id}')" title="Print Label">
                            <i class="fas fa-print"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function showCreateBatchModal() {
    // Create modal HTML dynamically
    const modalHtml = `
        <div class="modal fade" id="batchModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: var(--green); color: var(--cream);">
                        <h5 class="modal-title"><i class="fas fa-boxes-stacked"></i> Create New Batch</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="batchForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Product *</label>
                                    <select class="form-select" id="batchProduct" required>
                                        <option value="">Select Product</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Supplier</label>
                                    <select class="form-select" id="batchSupplier">
                                        <option value="">Select Supplier</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Initial Quantity *</label>
                                    <input type="number" class="form-control" id="batchQuantity" required min="1">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Unit of Measure</label>
                                    <select class="form-select" id="batchUnit">
                                        <option value="grams">Grams</option>
                                        <option value="units">Units</option>
                                        <option value="ml">Milliliters</option>
                                    </select>
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Expiry Date</label>
                                    <input type="date" class="form-control" id="batchExpiry">
                                </div>
                            </div>
                            <hr>
                            <h6 style="color: var(--green);">Cannabinoid Profile</h6>
                            <div class="row">
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">THC %</label>
                                    <input type="number" class="form-control" id="batchTHC" step="0.1" min="0" max="100">
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">CBD %</label>
                                    <input type="number" class="form-control" id="batchCBD" step="0.1" min="0" max="100">
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">CBG %</label>
                                    <input type="number" class="form-control" id="batchCBG" step="0.1" min="0" max="100">
                                </div>
                                <div class="col-md-3 mb-3">
                                    <label class="form-label">CBN %</label>
                                    <input type="number" class="form-control" id="batchCBN" step="0.1" min="0" max="100">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Harvest Date</label>
                                    <input type="date" class="form-control" id="batchHarvest">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Test Date</label>
                                    <input type="date" class="form-control" id="batchTestDate">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Lab Certificate URL</label>
                                <input type="url" class="form-control" id="batchLabCert" placeholder="https://...">
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-green" onclick="saveBatch()">
                            <i class="fas fa-save"></i> Create Batch
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    document.getElementById('batchModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Load products and suppliers for dropdowns
    loadBatchDropdowns();

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('batchModal'));
    modal.show();
}

async function loadBatchDropdowns() {
    try {
        // Load products
        const productsRes = await fetch(`${API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (productsRes.ok) {
            const data = await productsRes.json();
            const select = document.getElementById('batchProduct');
            (data.products || []).forEach(p => {
                select.innerHTML += `<option value="${p._id}">${p.name} (${p.sku || 'No SKU'})</option>`;
            });
        }

        // Load suppliers
        const suppliersRes = await fetch(`${API_URL}/suppliers`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (suppliersRes.ok) {
            const data = await suppliersRes.json();
            const select = document.getElementById('batchSupplier');
            (data.suppliers || []).forEach(s => {
                select.innerHTML += `<option value="${s._id}">${s.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading dropdowns:', error);
    }
}

async function saveBatch() {
    const batchData = {
        product: document.getElementById('batchProduct').value,
        supplier: document.getElementById('batchSupplier').value || null,
        initialQuantity: parseInt(document.getElementById('batchQuantity').value),
        remainingQuantity: parseInt(document.getElementById('batchQuantity').value),
        unitOfMeasure: document.getElementById('batchUnit').value,
        expiryDate: document.getElementById('batchExpiry').value || null,
        cannabinoids: {
            thc: parseFloat(document.getElementById('batchTHC').value) || 0,
            cbd: parseFloat(document.getElementById('batchCBD').value) || 0,
            cbg: parseFloat(document.getElementById('batchCBG').value) || 0,
            cbn: parseFloat(document.getElementById('batchCBN').value) || 0
        },
        harvestDate: document.getElementById('batchHarvest').value || null,
        testDate: document.getElementById('batchTestDate').value || null,
        labCertificateUrl: document.getElementById('batchLabCert').value || null,
        qaStatus: 'pending'
    };

    if (!batchData.product || !batchData.initialQuantity) {
        showToast('error', 'Product and quantity are required');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/batches`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(batchData)
        });

        if (!response.ok) throw new Error('Failed to create batch');

        showToast('success', 'Batch created successfully');
        bootstrap.Modal.getInstance(document.getElementById('batchModal')).hide();
        loadBatches();
    } catch (error) {
        console.error('Error creating batch:', error);
        showToast('error', 'Failed to create batch');
    }
}

async function viewBatch(batchId) {
    try {
        const response = await fetch(`${API_URL}/batches/${batchId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load batch');

        const data = await response.json();
        const batch = data.batch || data;

        const statusBadge = {
            'pending': '<span class="badge bg-warning">Pending QA</span>',
            'approved': '<span class="badge bg-success">Approved</span>',
            'rejected': '<span class="badge bg-danger">Rejected</span>',
            'expired': '<span class="badge bg-secondary">Expired</span>'
        }[batch.qaStatus] || '<span class="badge bg-secondary">Unknown</span>';

        const thc = batch.cannabinoids?.thc || 0;
        const cbd = batch.cannabinoids?.cbd || 0;
        const cbg = batch.cannabinoids?.cbg || 0;
        const cbn = batch.cannabinoids?.cbn || 0;

        const modalHtml = `
            <div class="modal fade" id="viewBatchModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header" style="background: var(--green); color: var(--cream);">
                            <h5 class="modal-title"><i class="fas fa-boxes-stacked"></i> Batch ${batch.batchId || batch._id?.slice(-8)}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <small class="text-muted">QA Status</small>
                                    <div>${statusBadge}</div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Product</small>
                                    <div><strong>${batch.product?.name || 'Unknown'}</strong></div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Supplier</small>
                                    <div>${batch.supplier?.name || 'Direct / Unknown'}</div>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-3">
                                    <small class="text-muted">Initial Qty</small>
                                    <div><strong>${batch.initialQuantity || 0}</strong> ${batch.unitOfMeasure || 'units'}</div>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Remaining</small>
                                    <div><strong>${batch.remainingQuantity || 0}</strong> ${batch.unitOfMeasure || 'units'}</div>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Expiry Date</small>
                                    <div>${batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</div>
                                </div>
                                <div class="col-md-3">
                                    <small class="text-muted">Created</small>
                                    <div>${new Date(batch.createdAt).toLocaleDateString()}</div>
                                </div>
                            </div>
                            <hr>
                            <h6 style="color: var(--green);"><i class="fas fa-clipboard-list"></i> Cannabinoid Profile</h6>
                            <div class="row mb-3">
                                <div class="col-md-3 text-center">
                                    <div style="background: var(--green); color: var(--cream); border-radius: 8px; padding: 0.75rem;">
                                        <div style="font-size: 1.5rem; font-weight: 700;">${thc}%</div>
                                        <small>THC</small>
                                    </div>
                                </div>
                                <div class="col-md-3 text-center">
                                    <div style="background: var(--gold); color: var(--green-dark); border-radius: 8px; padding: 0.75rem;">
                                        <div style="font-size: 1.5rem; font-weight: 700;">${cbd}%</div>
                                        <small>CBD</small>
                                    </div>
                                </div>
                                <div class="col-md-3 text-center">
                                    <div style="background: #f0f0f0; border-radius: 8px; padding: 0.75rem;">
                                        <div style="font-size: 1.5rem; font-weight: 700;">${cbg}%</div>
                                        <small>CBG</small>
                                    </div>
                                </div>
                                <div class="col-md-3 text-center">
                                    <div style="background: #f0f0f0; border-radius: 8px; padding: 0.75rem;">
                                        <div style="font-size: 1.5rem; font-weight: 700;">${cbn}%</div>
                                        <small>CBN</small>
                                    </div>
                                </div>
                            </div>
                            ${batch.harvestDate ? `<div class="row mb-2"><div class="col-md-6"><small class="text-muted">Harvest Date:</small> ${new Date(batch.harvestDate).toLocaleDateString()}</div><div class="col-md-6"><small class="text-muted">Test Date:</small> ${batch.testDate ? new Date(batch.testDate).toLocaleDateString() : 'N/A'}</div></div>` : ''}
                            ${batch.labCertificateUrl ? `<div class="mb-2"><small class="text-muted">Lab Certificate:</small> <a href="${batch.labCertificateUrl}" target="_blank" class="text-decoration-none"><i class="fas fa-file-pdf"></i> View Certificate</a></div>` : ''}
                            ${batch.qaRejectReason ? `<div class="alert alert-danger mt-2"><strong>Rejection Reason:</strong> ${batch.qaRejectReason}</div>` : ''}
                        </div>
                        <div class="modal-footer">
                            ${batch.qaStatus === 'pending' ? `
                                <button class="btn btn-outline-success" onclick="bootstrap.Modal.getInstance(document.getElementById('viewBatchModal')).hide(); approveBatch('${batch._id}')"><i class="fas fa-check-circle"></i> Approve</button>
                                <button class="btn btn-outline-danger" onclick="bootstrap.Modal.getInstance(document.getElementById('viewBatchModal')).hide(); rejectBatch('${batch._id}')"><i class="fas fa-times-circle"></i> Reject</button>
                            ` : ''}
                            <button class="btn btn-outline-secondary" onclick="printBatchLabel('${batch._id}')"><i class="fas fa-print"></i> Print Label</button>
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('viewBatchModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('viewBatchModal')).show();
    } catch (error) {
        console.error('Error loading batch:', error);
        showToast('error', 'Failed to load batch details');
    }
}

async function approveBatch(batchId) {
    _originShowConfirm('Approve this batch for distribution?', async function() {
        try {
            const response = await fetch(`${API_URL}/batches/${batchId}/qa-approve`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                }
            });

            if (!response.ok) throw new Error('Failed to approve batch');

            showToast('success', 'Batch approved - Ready for distribution');
            loadBatches();
        } catch (error) {
            console.error('Error approving batch:', error);
            showToast('error', 'Failed to approve batch');
        }
    }, { title: 'Approve Batch', confirmText: 'Approve', icon: 'fa-check-circle', type: 'success' });
}

async function rejectBatch(batchId) {
    _originShowPrompt('Please enter the reason for rejecting this batch:', async function(reason) {
        try {
            const response = await fetch(`${API_URL}/batches/${batchId}/qa-reject`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ reason })
            });

            if (!response.ok) throw new Error('Failed to reject batch');

            showToast('warning', 'Batch rejected');
            loadBatches();
        } catch (error) {
            console.error('Error rejecting batch:', error);
            showToast('error', 'Failed to reject batch');
        }
    }, { title: 'Reject Batch', submitText: 'Reject', icon: 'fa-times-circle', placeholder: 'Reason for rejection...' });
}

async function printBatchLabel(batchId) {
    try {
        const response = await fetch(`${API_URL}/batches/${batchId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load batch');

        const data = await response.json();
        const batch = data.batch || data;

        const labelWindow = window.open('', '_blank', 'width=400,height=300');
        labelWindow.document.write(`
            <!DOCTYPE html>
            <html>
            <head><title>Batch Label - ${batch.batchId || batch._id?.slice(-8)}</title>
            <style>
                body { font-family: 'Courier New', monospace; padding: 10mm; margin: 0; }
                .label { border: 2px solid #000; padding: 8mm; width: 80mm; }
                .label h2 { margin: 0 0 4mm; font-size: 14px; text-align: center; border-bottom: 1px solid #000; padding-bottom: 4mm; }
                .label .row { display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 2mm; }
                .label .row strong { font-size: 12px; }
                .label .qr { text-align: center; margin-top: 4mm; font-size: 10px; color: #666; }
                @media print { body { padding: 0; } }
            </style>
            </head>
            <body>
                <div class="label">
                    <h2>Origin - BATCH LABEL</h2>
                    <div class="row"><span>Batch ID:</span><strong>${batch.batchId || batch._id?.slice(-8)}</strong></div>
                    <div class="row"><span>Product:</span><strong>${batch.product?.name || 'Unknown'}</strong></div>
                    <div class="row"><span>THC/CBD:</span><strong>${batch.cannabinoids?.thc || 0}% / ${batch.cannabinoids?.cbd || 0}%</strong></div>
                    <div class="row"><span>Quantity:</span><strong>${batch.remainingQuantity || 0} ${batch.unitOfMeasure || 'units'}</strong></div>
                    <div class="row"><span>Expiry:</span><strong>${batch.expiryDate ? new Date(batch.expiryDate).toLocaleDateString() : 'N/A'}</strong></div>
                    <div class="row"><span>QA Status:</span><strong>${(batch.qaStatus || 'pending').toUpperCase()}</strong></div>
                    <div class="qr">Origin by ILCO Farming | www.origin.cleva-ai.co.za</div>
                </div>
                <script>window.print();</script>
            </body>
            </html>
        `);
        labelWindow.document.close();
    } catch (error) {
        console.error('Error generating label:', error);
        showToast('error', 'Failed to generate batch label');
    }
}
