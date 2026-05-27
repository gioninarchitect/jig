// inv-purchase-orders.js — Purchase Orders CRUD for inventory manager dashboard
// Depends on: config.js (API_URL), or-utils.js (showToast), or-auth.js (getToken)

// ==================== PURCHASE ORDERS CRUD ====================

async function loadPurchaseOrders() {
    const status = document.getElementById('poStatusFilter')?.value || '';
    const supplier = document.getElementById('poSupplierFilter')?.value || '';
    const search = document.getElementById('poSearch')?.value || '';

    try {
        let url = `${API_URL}/purchase-orders?`;
        if (status) url += `status=${status}&`;
        if (supplier) url += `supplier=${supplier}&`;
        if (search) url += `search=${search}&`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load purchase orders');

        const data = await response.json();
        const orders = data.purchaseOrders || [];

        // Update stats
        const pending = orders.filter(o => o.status === 'submitted').length;
        const approved = orders.filter(o => o.status === 'approved').length;
        const ordered = orders.filter(o => o.status === 'ordered').length;
        const received = orders.filter(o => o.status === 'received').length;

        document.getElementById('pendingPOCount').textContent = pending;
        document.getElementById('approvedPOCount').textContent = approved;
        document.getElementById('orderedPOCount').textContent = ordered;
        document.getElementById('receivedPOCount').textContent = received;

        renderPOTable(orders);
    } catch (error) {
        console.error('Error loading purchase orders:', error);
        renderPOTable([]);
    }
}

function renderPOTable(orders) {
    const tbody = document.getElementById('poTableBody');

    if (orders.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="7" class="text-center py-4">
                    <i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5;"></i>
                    <p class="mb-0 mt-2">No purchase orders found</p>
                </td>
            </tr>
        `;
        return;
    }

    tbody.innerHTML = orders.map(po => {
        const statusBadges = {
            'draft': '<span class="badge bg-secondary">Draft</span>',
            'submitted': '<span class="badge bg-warning">Submitted</span>',
            'approved': '<span class="badge bg-success">Approved</span>',
            'ordered': '<span class="badge bg-info">Ordered</span>',
            'partial': '<span class="badge bg-primary">Partial</span>',
            'received': '<span class="badge bg-success">Received</span>',
            'cancelled': '<span class="badge bg-danger">Cancelled</span>'
        };

        const itemCount = po.items?.length || 0;
        const expectedDate = po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'TBD';

        return `
            <tr>
                <td><strong>${po.poNumber || po._id?.slice(-8)}</strong></td>
                <td>${po.supplier?.name || 'Unknown'}</td>
                <td>${itemCount} item${itemCount !== 1 ? 's' : ''}</td>
                <td>R${(po.total || 0).toFixed(2)}</td>
                <td>${statusBadges[po.status] || statusBadges.draft}</td>
                <td>${expectedDate}</td>
                <td>
                    <div class="btn-group btn-group-sm">
                        <button class="btn btn-outline-primary" onclick="viewPO('${po._id}')" title="View">
                            <i class="fas fa-eye"></i>
                        </button>
                        ${po.status === 'draft' ? `
                            <button class="btn btn-outline-success" onclick="submitPO('${po._id}')" title="Submit">
                                <i class="fas fa-paper-plane"></i>
                            </button>
                            <button class="btn btn-outline-secondary" onclick="editPO('${po._id}')" title="Edit">
                                <i class="fas fa-pencil-alt"></i>
                            </button>
                        ` : ''}
                        ${po.status === 'ordered' || po.status === 'partial' ? `
                            <button class="btn btn-outline-success" onclick="receiveGoods('${po._id}')" title="Receive Goods">
                                <i class="fas fa-box-open"></i>
                            </button>
                        ` : ''}
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

function showCreatePOModal() {
    const modalHtml = `
        <div class="modal fade" id="poModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: var(--gold); color: var(--green-dark);">
                        <h5 class="modal-title"><i class="fas fa-cart-plus"></i> Create Purchase Order</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="poForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Supplier *</label>
                                    <select class="form-select" id="poSupplier" required onchange="loadSupplierProducts()">
                                        <option value="">Select Supplier</option>
                                    </select>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Expected Delivery Date</label>
                                    <input type="date" class="form-control" id="poExpectedDate">
                                </div>
                            </div>
                            <hr>
                            <h6 style="color: var(--green);">Line Items</h6>
                            <div id="poLineItems">
                                <div class="row mb-2 line-item">
                                    <div class="col-md-5">
                                        <select class="form-select" name="product">
                                            <option value="">Select Product</option>
                                        </select>
                                    </div>
                                    <div class="col-md-2">
                                        <input type="number" class="form-control" name="quantity" placeholder="Qty" min="1">
                                    </div>
                                    <div class="col-md-3">
                                        <input type="number" class="form-control" name="price" placeholder="Unit Price" step="0.01">
                                    </div>
                                    <div class="col-md-2">
                                        <button type="button" class="btn btn-outline-danger w-100" onclick="removeLineItem(this)">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                            <button type="button" class="btn btn-outline-success btn-sm mt-2" onclick="addLineItem()">
                                <i class="fas fa-plus"></i> Add Line Item
                            </button>
                            <hr>
                            <div class="mb-3">
                                <label class="form-label">Delivery Notes</label>
                                <textarea class="form-control" id="poNotes" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-outline-success" onclick="savePO('draft')">
                            <i class="fas fa-save"></i> Save Draft
                        </button>
                        <button type="button" class="btn btn-gold" onclick="savePO('submitted')">
                            <i class="fas fa-paper-plane"></i> Submit for Approval
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('poModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    loadPODropdowns();

    const modal = new bootstrap.Modal(document.getElementById('poModal'));
    modal.show();
}

async function loadPODropdowns() {
    try {
        const suppliersRes = await fetch(`${API_URL}/suppliers?status=active`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (suppliersRes.ok) {
            const data = await suppliersRes.json();
            const select = document.getElementById('poSupplier');
            (data.suppliers || []).forEach(s => {
                select.innerHTML += `<option value="${s._id}">${s.name}</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading PO dropdowns:', error);
    }
}

async function loadSupplierProducts() {
    const supplierId = document.getElementById('poSupplier').value;
    if (!supplierId) return;

    try {
        const res = await fetch(`${API_URL}/products`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (res.ok) {
            const data = await res.json();
            const products = data.products || [];
            const selects = document.querySelectorAll('#poLineItems select[name="product"]');
            selects.forEach(select => {
                const currentValue = select.value;
                select.innerHTML = '<option value="">Select Product</option>';
                products.forEach(p => {
                    select.innerHTML += `<option value="${p._id}">${p.name} - R${p.price?.toFixed(2) || '0.00'}</option>`;
                });
                select.value = currentValue;
            });
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function addLineItem() {
    const container = document.getElementById('poLineItems');
    const newItem = document.createElement('div');
    newItem.className = 'row mb-2 line-item';
    newItem.innerHTML = `
        <div class="col-md-5">
            <select class="form-select" name="product">
                <option value="">Select Product</option>
            </select>
        </div>
        <div class="col-md-2">
            <input type="number" class="form-control" name="quantity" placeholder="Qty" min="1">
        </div>
        <div class="col-md-3">
            <input type="number" class="form-control" name="price" placeholder="Unit Price" step="0.01">
        </div>
        <div class="col-md-2">
            <button type="button" class="btn btn-outline-danger w-100" onclick="removeLineItem(this)">
                <i class="fas fa-trash"></i>
            </button>
        </div>
    `;
    container.appendChild(newItem);
    loadSupplierProducts();
}

function removeLineItem(btn) {
    const items = document.querySelectorAll('#poLineItems .line-item');
    if (items.length > 1) {
        btn.closest('.line-item').remove();
    } else {
        showToast('warning', 'At least one line item is required');
    }
}

async function savePO(status) {
    const lineItems = [];
    document.querySelectorAll('#poLineItems .line-item').forEach(item => {
        const product = item.querySelector('[name="product"]').value;
        const quantity = parseInt(item.querySelector('[name="quantity"]').value);
        const unitPrice = parseFloat(item.querySelector('[name="price"]').value);
        if (product && quantity && unitPrice) {
            lineItems.push({ product, quantity, unitPrice, totalPrice: quantity * unitPrice });
        }
    });

    if (!document.getElementById('poSupplier').value || lineItems.length === 0) {
        showToast('error', 'Supplier and at least one line item are required');
        return;
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * VAT_RATE;
    const total = subtotal + tax;

    const poData = {
        supplier: document.getElementById('poSupplier').value,
        items: lineItems,
        subtotal,
        tax,
        total,
        status,
        expectedDeliveryDate: document.getElementById('poExpectedDate').value || null,
        deliveryNotes: document.getElementById('poNotes').value
    };

    try {
        const response = await fetch(`${API_URL}/purchase-orders`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(poData)
        });

        if (!response.ok) throw new Error('Failed to create PO');

        showToast('success', status === 'submitted' ? 'Purchase Order submitted for approval' : 'Purchase Order saved as draft');
        bootstrap.Modal.getInstance(document.getElementById('poModal')).hide();
        loadPurchaseOrders();
    } catch (error) {
        console.error('Error creating PO:', error);
        showToast('error', 'Failed to create purchase order');
    }
}

async function viewPO(poId) {
    try {
        const response = await fetch(`${API_URL}/purchase-orders/${poId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load PO');

        const data = await response.json();
        const po = data.purchaseOrder || data;

        const statusBadges = {
            'draft': '<span class="badge bg-secondary">Draft</span>',
            'submitted': '<span class="badge bg-warning">Submitted</span>',
            'approved': '<span class="badge bg-success">Approved</span>',
            'ordered': '<span class="badge bg-info">Ordered</span>',
            'partial': '<span class="badge bg-primary">Partial</span>',
            'received': '<span class="badge bg-success">Received</span>',
            'cancelled': '<span class="badge bg-danger">Cancelled</span>'
        };

        const itemsHtml = (po.items || []).map((item, i) => `
            <tr>
                <td>${i + 1}</td>
                <td>${item.product?.name || item.productName || 'Unknown'}</td>
                <td>${item.quantity}</td>
                <td>R${(item.unitPrice || 0).toFixed(2)}</td>
                <td>R${(item.totalPrice || item.quantity * item.unitPrice || 0).toFixed(2)}</td>
                <td>${item.receivedQuantity || 0}</td>
            </tr>
        `).join('');

        const modalHtml = `
            <div class="modal fade" id="viewPOModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header" style="background: var(--green); color: var(--cream);">
                            <h5 class="modal-title"><i class="fas fa-file-alt"></i> Purchase Order ${po.poNumber || po._id?.slice(-8)}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <small class="text-muted">Status</small>
                                    <div>${statusBadges[po.status] || statusBadges.draft}</div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Supplier</small>
                                    <div><strong>${po.supplier?.name || 'Unknown'}</strong></div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Expected Delivery</small>
                                    <div>${po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : 'TBD'}</div>
                                </div>
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <small class="text-muted">Created</small>
                                    <div>${new Date(po.createdAt).toLocaleDateString()}</div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Created By</small>
                                    <div>${po.createdBy?.firstName || ''} ${po.createdBy?.lastName || 'N/A'}</div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">PO Number</small>
                                    <div><strong>${po.poNumber || 'N/A'}</strong></div>
                                </div>
                            </div>
                            <hr>
                            <h6 style="color: var(--green);"><i class="fas fa-tasks"></i> Line Items</h6>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered">
                                    <thead style="background: var(--green); color: var(--cream);">
                                        <tr><th>#</th><th>Product</th><th>Qty</th><th>Unit Price</th><th>Total</th><th>Received</th></tr>
                                    </thead>
                                    <tbody>${itemsHtml}</tbody>
                                    <tfoot>
                                        <tr><td colspan="4" class="text-end"><strong>Subtotal</strong></td><td colspan="2">R${(po.subtotal || 0).toFixed(2)}</td></tr>
                                        <tr><td colspan="4" class="text-end"><strong>Tax (${VAT_RATE * 100}%)</strong></td><td colspan="2">R${(po.tax || 0).toFixed(2)}</td></tr>
                                        <tr style="background: var(--gold); color: var(--green-dark);"><td colspan="4" class="text-end"><strong>Total</strong></td><td colspan="2"><strong>R${(po.total || 0).toFixed(2)}</strong></td></tr>
                                    </tfoot>
                                </table>
                            </div>
                            ${po.deliveryNotes ? `<div class="mt-2"><small class="text-muted">Delivery Notes:</small><p>${po.deliveryNotes}</p></div>` : ''}
                        </div>
                        <div class="modal-footer">
                            ${po.status === 'draft' ? `<button class="btn btn-outline-success" onclick="bootstrap.Modal.getInstance(document.getElementById('viewPOModal')).hide(); submitPO('${po._id}')"><i class="fas fa-paper-plane"></i> Submit</button>` : ''}
                            ${po.status === 'ordered' || po.status === 'partial' ? `<button class="btn btn-outline-success" onclick="bootstrap.Modal.getInstance(document.getElementById('viewPOModal')).hide(); receiveGoods('${po._id}')"><i class="fas fa-box-open"></i> Receive Goods</button>` : ''}
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('viewPOModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('viewPOModal')).show();
    } catch (error) {
        console.error('Error loading PO:', error);
        showToast('error', 'Failed to load purchase order details');
    }
}

async function submitPO(poId) {
    _originShowConfirm('Submit this PO for approval?', async function() {
        try {
            const response = await fetch(`${API_URL}/purchase-orders/${poId}/submit`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (!response.ok) throw new Error('Failed to submit PO');

            showToast('success', 'Purchase Order submitted for approval');
            loadPurchaseOrders();
        } catch (error) {
            showToast('error', 'Failed to submit purchase order');
        }
    }, { title: 'Submit Purchase Order', confirmText: 'Submit', icon: 'fa-file-invoice', type: 'info' });
}

async function editPO(poId) {
    try {
        const response = await fetch(`${API_URL}/purchase-orders/${poId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load PO');

        const data = await response.json();
        const po = data.purchaseOrder || data;

        // Open the create modal
        showCreatePOModal();

        // Wait for modal to render, then pre-fill
        setTimeout(async () => {
            // Set supplier
            const supplierSelect = document.getElementById('poSupplier');
            if (supplierSelect && po.supplier?._id) {
                supplierSelect.value = po.supplier._id;
                await loadSupplierProducts();
            }

            // Set expected date
            if (po.expectedDeliveryDate) {
                document.getElementById('poExpectedDate').value = po.expectedDeliveryDate.slice(0, 10);
            }

            // Set notes
            if (po.deliveryNotes) {
                document.getElementById('poNotes').value = po.deliveryNotes;
            }

            // Set line items
            const container = document.getElementById('poLineItems');
            container.innerHTML = '';
            (po.items || []).forEach((item, i) => {
                const row = document.createElement('div');
                row.className = 'row mb-2 line-item';
                row.innerHTML = `
                    <div class="col-md-5">
                        <select class="form-select" name="product">
                            <option value="">Select Product</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <input type="number" class="form-control" name="quantity" placeholder="Qty" min="1" value="${item.quantity || ''}">
                    </div>
                    <div class="col-md-3">
                        <input type="number" class="form-control" name="price" placeholder="Unit Price" step="0.01" value="${item.unitPrice || ''}">
                    </div>
                    <div class="col-md-2">
                        <button type="button" class="btn btn-outline-danger w-100" onclick="removeLineItem(this)">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                container.appendChild(row);
            });

            // Load products into selects and set values
            await loadSupplierProducts();
            setTimeout(() => {
                const selects = container.querySelectorAll('select[name="product"]');
                (po.items || []).forEach((item, i) => {
                    if (selects[i] && (item.product?._id || item.product)) {
                        selects[i].value = item.product?._id || item.product;
                    }
                });
            }, 500);

            // Change modal title and save button to update mode
            document.querySelector('#poModal .modal-title').innerHTML = '<i class="fas fa-edit"></i> Edit Purchase Order';
            const footer = document.querySelector('#poModal .modal-footer');
            footer.innerHTML = `
                <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                <button type="button" class="btn btn-outline-success" onclick="updatePO('${po._id}', 'draft')">
                    <i class="fas fa-save"></i> Save Changes
                </button>
                <button type="button" class="btn btn-gold" onclick="updatePO('${po._id}', 'submitted')">
                    <i class="fas fa-paper-plane"></i> Save & Submit
                </button>
            `;
        }, 600);
    } catch (error) {
        console.error('Error loading PO for edit:', error);
        showToast('error', 'Failed to load purchase order');
    }
}

async function updatePO(poId, status) {
    const lineItems = [];
    document.querySelectorAll('#poLineItems .line-item').forEach(item => {
        const product = item.querySelector('[name="product"]').value;
        const quantity = parseInt(item.querySelector('[name="quantity"]').value);
        const unitPrice = parseFloat(item.querySelector('[name="price"]').value);
        if (product && quantity && unitPrice) {
            lineItems.push({ product, quantity, unitPrice, totalPrice: quantity * unitPrice });
        }
    });

    if (!document.getElementById('poSupplier').value || lineItems.length === 0) {
        showToast('error', 'Supplier and at least one line item are required');
        return;
    }

    const subtotal = lineItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const tax = subtotal * VAT_RATE;
    const total = subtotal + tax;

    const poData = {
        supplier: document.getElementById('poSupplier').value,
        items: lineItems,
        subtotal,
        tax,
        total,
        status,
        expectedDeliveryDate: document.getElementById('poExpectedDate').value || null,
        deliveryNotes: document.getElementById('poNotes').value
    };

    try {
        const response = await fetch(`${API_URL}/purchase-orders/${poId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(poData)
        });

        if (!response.ok) throw new Error('Failed to update PO');

        showToast('success', status === 'submitted' ? 'Purchase Order updated and submitted' : 'Purchase Order updated');
        bootstrap.Modal.getInstance(document.getElementById('poModal')).hide();
        loadPurchaseOrders();
    } catch (error) {
        console.error('Error updating PO:', error);
        showToast('error', 'Failed to update purchase order');
    }
}

async function receiveGoods(poId) {
    try {
        const response = await fetch(`${API_URL}/purchase-orders/${poId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load PO');

        const data = await response.json();
        const po = data.purchaseOrder || data;

        const itemsHtml = (po.items || []).map((item, i) => {
            const ordered = item.quantity || 0;
            const alreadyReceived = item.receivedQuantity || 0;
            const remaining = ordered - alreadyReceived;
            return `
                <tr>
                    <td>${item.product?.name || item.productName || 'Unknown'}</td>
                    <td class="text-center">${ordered}</td>
                    <td class="text-center">${alreadyReceived}</td>
                    <td>
                        <input type="number" class="form-control form-control-sm receive-qty" data-index="${i}" data-product="${item.product?._id || item.product}" min="0" max="${remaining}" value="${remaining}" style="width: 80px;">
                    </td>
                    <td>
                        <select class="form-select form-select-sm receive-condition" data-index="${i}" style="width: 120px;">
                            <option value="good">Good</option>
                            <option value="damaged">Damaged</option>
                            <option value="expired">Expired</option>
                        </select>
                    </td>
                    <td>
                        <input type="text" class="form-control form-control-sm receive-notes" data-index="${i}" placeholder="Notes..." style="width: 140px;">
                    </td>
                </tr>
            `;
        }).join('');

        const modalHtml = `
            <div class="modal fade" id="receiveGoodsModal" tabindex="-1">
                <div class="modal-dialog modal-xl">
                    <div class="modal-content">
                        <div class="modal-header" style="background: var(--green); color: var(--cream);">
                            <h5 class="modal-title"><i class="fas fa-box-open"></i> Receive Goods - ${po.poNumber || po._id?.slice(-8)}</h5>
                            <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="alert alert-info">
                                <i class="fas fa-info-circle"></i> Enter the quantity received for each item. Items in good condition will be added to inventory automatically.
                            </div>
                            <div class="row mb-3">
                                <div class="col-md-4">
                                    <small class="text-muted">Supplier</small>
                                    <div><strong>${po.supplier?.name || 'Unknown'}</strong></div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">PO Total</small>
                                    <div><strong>R${(po.total || 0).toFixed(2)}</strong></div>
                                </div>
                                <div class="col-md-4">
                                    <small class="text-muted">Delivery Reference</small>
                                    <input type="text" class="form-control form-control-sm" id="deliveryRef" placeholder="Invoice/delivery note #">
                                </div>
                            </div>
                            <div class="table-responsive">
                                <table class="table table-sm table-bordered">
                                    <thead style="background: var(--gold); color: var(--green-dark);">
                                        <tr><th>Product</th><th class="text-center">Ordered</th><th class="text-center">Already Received</th><th>Receiving</th><th>Condition</th><th>Notes</th></tr>
                                    </thead>
                                    <tbody>${itemsHtml}</tbody>
                                </table>
                            </div>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                            <button type="button" class="btn btn-green" onclick="processReceiveGoods('${po._id}')">
                                <i class="fas fa-check-double"></i> Confirm Receipt
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;

        document.getElementById('receiveGoodsModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('receiveGoodsModal')).show();
    } catch (error) {
        console.error('Error loading PO for receiving:', error);
        showToast('error', 'Failed to load purchase order');
    }
}

async function processReceiveGoods(poId) {
    const items = [];
    document.querySelectorAll('#receiveGoodsModal .receive-qty').forEach(input => {
        const index = input.dataset.index;
        const qty = parseInt(input.value) || 0;
        const condition = document.querySelector(`.receive-condition[data-index="${index}"]`)?.value || 'good';
        const notes = document.querySelector(`.receive-notes[data-index="${index}"]`)?.value || '';
        const product = input.dataset.product;
        if (qty > 0) {
            items.push({ product, receivedQuantity: qty, condition, notes });
        }
    });

    if (items.length === 0) {
        showToast('error', 'Enter received quantities for at least one item');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/purchase-orders/${poId}/receive`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                items,
                deliveryReference: document.getElementById('deliveryRef')?.value || ''
            })
        });

        if (!response.ok) throw new Error('Failed to record receipt');

        showToast('success', 'Goods received and inventory updated');
        bootstrap.Modal.getInstance(document.getElementById('receiveGoodsModal')).hide();
        loadPurchaseOrders();
    } catch (error) {
        console.error('Error processing receipt:', error);
        showToast('error', 'Failed to record goods receipt');
    }
}
