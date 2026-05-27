// inv-suppliers.js — Suppliers CRUD for inventory manager dashboard
// Depends on: config.js (API_URL), or-utils.js (showToast), or-auth.js (getToken)

// ==================== SUPPLIERS CRUD ====================

async function loadSuppliers() {
    const status = document.getElementById('supplierStatusFilter')?.value || '';
    const type = document.getElementById('supplierTypeFilter')?.value || '';
    const search = document.getElementById('supplierSearch')?.value || '';

    try {
        let url = `${API_URL}/suppliers?`;
        if (status) url += `complianceStatus=${status}&`;
        if (type) url += `type=${type}&`;
        if (search) url += `search=${search}&`;

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load suppliers');

        const data = await response.json();
        const suppliers = data.suppliers || [];

        renderSuppliersGrid(suppliers);

        // Update filter dropdowns for batches and POs
        updateSupplierFilters(suppliers);
    } catch (error) {
        console.error('Error loading suppliers:', error);
        renderSuppliersGrid([]);
    }
}

function updateSupplierFilters(suppliers) {
    const batchFilter = document.getElementById('batchSupplierFilter');
    const poFilter = document.getElementById('poSupplierFilter');

    if (batchFilter) {
        batchFilter.innerHTML = '<option value="">All Suppliers</option>';
        suppliers.forEach(s => {
            batchFilter.innerHTML += `<option value="${s._id}">${s.name}</option>`;
        });
    }

    if (poFilter) {
        poFilter.innerHTML = '<option value="">All Suppliers</option>';
        suppliers.forEach(s => {
            poFilter.innerHTML += `<option value="${s._id}">${s.name}</option>`;
        });
    }
}

function renderSuppliersGrid(suppliers) {
    const grid = document.getElementById('suppliersGrid');

    if (suppliers.length === 0) {
        grid.innerHTML = `
            <div class="col-12 text-center py-5">
                <i class="fas fa-building" style="font-size: 3rem; opacity: 0.5;"></i>
                <p class="mt-2">No suppliers found</p>
                <button class="btn btn-green" onclick="showCreateSupplierModal()">
                    <i class="fas fa-plus-circle"></i> Add First Supplier
                </button>
            </div>
        `;
        return;
    }

    grid.innerHTML = suppliers.map(supplier => {
        const statusBadge = {
            'active': '<span class="badge bg-success">Active</span>',
            'pending': '<span class="badge bg-warning">Pending</span>',
            'suspended': '<span class="badge bg-danger">Suspended</span>',
            'inactive': '<span class="badge bg-secondary">Inactive</span>'
        }[supplier.status] || '<span class="badge bg-secondary">Unknown</span>';

        const typeBadge = {
            'cultivator': '<span class="badge badge-lifestyle">Cultivator</span>',
            'processor': '<span class="badge badge-section21">Processor</span>',
            'distributor': '<span class="badge badge-both">Distributor</span>',
            'manufacturer': '<span class="badge bg-info">Manufacturer</span>',
            'importer': '<span class="badge bg-dark">Importer</span>'
        }[supplier.license?.type] || '';

        return `
            <div class="col-md-6 col-lg-4 mb-4">
                <div class="card h-100">
                    <div class="card-header bg-green d-flex justify-content-between align-items-center">
                        <span><i class="fas fa-building"></i> ${supplier.name}</span>
                        ${statusBadge}
                    </div>
                    <div class="card-body">
                        <p class="mb-2">${typeBadge}</p>
                        <p class="mb-1"><i class="fas fa-user"></i> ${supplier.contactPerson || 'No contact'}</p>
                        <p class="mb-1"><i class="fas fa-envelope"></i> ${supplier.email || 'No email'}</p>
                        <p class="mb-1"><i class="fas fa-phone"></i> ${supplier.phone || 'No phone'}</p>
                        <hr>
                        <div class="d-flex justify-content-between">
                            <small class="text-muted">Orders: ${supplier.totalOrders || 0}</small>
                            <small class="text-muted">Value: R${(supplier.totalValue || 0).toFixed(2)}</small>
                        </div>
                        ${supplier.rating ? `
                            <div class="mt-2">
                                ${'<i class="fas fa-star text-warning"></i>'.repeat(Math.floor(supplier.rating))}
                                ${supplier.rating % 1 >= 0.5 ? '<i class="fas fa-star-half-alt text-warning"></i>' : ''}
                                <span class="ms-1">(${supplier.rating.toFixed(1)})</span>
                            </div>
                        ` : ''}
                    </div>
                    <div class="card-footer bg-transparent">
                        <div class="btn-group w-100">
                            <button class="btn btn-outline-primary btn-sm" onclick="viewSupplier('${supplier._id}')">
                                <i class="fas fa-eye"></i> View
                            </button>
                            <button class="btn btn-outline-success btn-sm" onclick="editSupplier('${supplier._id}')">
                                <i class="fas fa-pencil-alt"></i> Edit
                            </button>
                            <button class="btn btn-outline-secondary btn-sm" onclick="viewSupplierOrders('${supplier._id}')">
                                <i class="fas fa-shopping-cart"></i> Orders
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function showCreateSupplierModal() {
    const modalHtml = `
        <div class="modal fade" id="supplierModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: var(--green); color: var(--cream);">
                        <h5 class="modal-title"><i class="fas fa-building"></i> Add New Supplier</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="supplierForm">
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Company Name *</label>
                                    <input type="text" class="form-control" id="supplierName" required>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Supplier Type *</label>
                                    <select class="form-select" id="supplierType" required>
                                        <option value="">Select Type</option>
                                        <option value="cultivator">Cultivator</option>
                                        <option value="processor">Processor</option>
                                        <option value="distributor">Distributor</option>
                                        <option value="manufacturer">Manufacturer</option>
                                        <option value="importer">Importer</option>
                                    </select>
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Contact Person</label>
                                    <input type="text" class="form-control" id="supplierContact">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Email</label>
                                    <input type="email" class="form-control" id="supplierEmail">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Phone</label>
                                    <input type="tel" class="form-control" id="supplierPhone">
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">License Number</label>
                                    <input type="text" class="form-control" id="supplierLicense">
                                </div>
                            </div>
                            <hr>
                            <h6 style="color: var(--green);">Address</h6>
                            <div class="row">
                                <div class="col-12 mb-3">
                                    <label class="form-label">Street Address</label>
                                    <input type="text" class="form-control" id="supplierStreet">
                                </div>
                            </div>
                            <div class="row">
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">City</label>
                                    <input type="text" class="form-control" id="supplierCity">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Province</label>
                                    <input type="text" class="form-control" id="supplierProvince">
                                </div>
                                <div class="col-md-4 mb-3">
                                    <label class="form-label">Postal Code</label>
                                    <input type="text" class="form-control" id="supplierPostal">
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Product Categories</label>
                                <div class="d-flex flex-wrap gap-2">
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="cat-flower" value="flower">
                                        <label class="form-check-label" for="cat-flower">Flower</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="cat-concentrates" value="concentrates">
                                        <label class="form-check-label" for="cat-concentrates">Concentrates</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="cat-edibles" value="edibles">
                                        <label class="form-check-label" for="cat-edibles">Edibles</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="cat-topicals" value="topicals">
                                        <label class="form-check-label" for="cat-topicals">Topicals</label>
                                    </div>
                                    <div class="form-check">
                                        <input class="form-check-input" type="checkbox" id="cat-accessories" value="accessories">
                                        <label class="form-check-label" for="cat-accessories">Accessories</label>
                                    </div>
                                </div>
                            </div>
                            <div class="mb-3">
                                <label class="form-label">Notes</label>
                                <textarea class="form-control" id="supplierNotes" rows="2"></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-green" onclick="saveSupplier()">
                            <i class="fas fa-save"></i> Save Supplier
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('supplierModal')?.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    const modal = new bootstrap.Modal(document.getElementById('supplierModal'));
    modal.show();
}

async function saveSupplier() {
    const categories = [];
    document.querySelectorAll('#supplierModal input[type="checkbox"]:checked').forEach(cb => {
        categories.push(cb.value);
    });

    const supplierData = {
        name: document.getElementById('supplierName').value,
        license: {
            type: document.getElementById('supplierType').value,
            number: document.getElementById('supplierLicense').value
        },
        contactPerson: document.getElementById('supplierContact').value,
        email: document.getElementById('supplierEmail').value,
        phone: document.getElementById('supplierPhone').value,
        address: {
            street: document.getElementById('supplierStreet').value,
            city: document.getElementById('supplierCity').value,
            province: document.getElementById('supplierProvince').value,
            postalCode: document.getElementById('supplierPostal').value,
            country: 'South Africa'
        },
        productCategories: categories,
        notes: document.getElementById('supplierNotes').value,
        status: 'active',
        complianceStatus: 'pending'
    };

    if (!supplierData.name || !supplierData.license.type) {
        showToast('error', 'Name and type are required');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/suppliers`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(supplierData)
        });

        if (!response.ok) throw new Error('Failed to create supplier');

        showToast('success', 'Supplier added successfully');
        bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide();
        loadSuppliers();
    } catch (error) {
        console.error('Error creating supplier:', error);
        showToast('error', 'Failed to add supplier');
    }
}

async function viewSupplier(supplierId) {
    try {
        const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load supplier');
        const data = await response.json();
        const s = data.supplier || data;

        const statusColor = { active: 'success', pending: 'warning', suspended: 'danger', inactive: 'secondary' }[s.status] || 'secondary';

        const modalHtml = `
        <div class="modal fade" id="viewSupplierModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: var(--green); color: var(--cream);">
                        <h5 class="modal-title"><i class="fas fa-building"></i> ${s.name}</h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <div class="row">
                            <div class="col-md-6">
                                <h6 style="color: var(--green);">Contact Details</h6>
                                <p class="mb-1"><i class="fas fa-user"></i> <strong>Contact:</strong> ${s.contactPerson || 'Not set'}</p>
                                <p class="mb-1"><i class="fas fa-envelope"></i> <strong>Email:</strong> ${s.email || 'Not set'}</p>
                                <p class="mb-1"><i class="fas fa-phone"></i> <strong>Phone:</strong> ${s.phone || 'Not set'}</p>
                                <p class="mb-1"><i class="fas fa-map-marker-alt"></i> <strong>Address:</strong> ${s.address?.street || ''} ${s.address?.city || ''} ${s.address?.province || ''} ${s.address?.postalCode || ''}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 style="color: var(--green);">Business Info</h6>
                                <p class="mb-1"><strong>Type:</strong> ${s.license?.type || 'Not set'}</p>
                                <p class="mb-1"><strong>License #:</strong> ${s.license?.number || 'Not set'}</p>
                                <p class="mb-1"><strong>Status:</strong> <span class="badge bg-${statusColor}">${s.status || 'unknown'}</span></p>
                                <p class="mb-1"><strong>Compliance:</strong> ${s.complianceStatus || 'pending'}</p>
                                <p class="mb-1"><strong>Payment Terms:</strong> ${s.paymentTerms || 'net30'}</p>
                            </div>
                        </div>
                        <hr>
                        <div class="row">
                            <div class="col-md-6">
                                <h6 style="color: var(--green);">Performance</h6>
                                <p class="mb-1"><strong>Total Orders:</strong> ${s.totalOrders || 0}</p>
                                <p class="mb-1"><strong>Total Value:</strong> R${(s.totalValue || 0).toFixed(2)}</p>
                                <p class="mb-1"><strong>Credit Limit:</strong> R${(s.creditLimit || 0).toFixed(2)}</p>
                                <p class="mb-1"><strong>Balance:</strong> R${(s.currentBalance || 0).toFixed(2)}</p>
                            </div>
                            <div class="col-md-6">
                                <h6 style="color: var(--green);">Categories</h6>
                                <p>${(s.productCategories || []).map(c => '<span class="badge bg-light text-dark me-1">' + c + '</span>').join('') || 'None assigned'}</p>
                                ${s.notes ? '<h6 style="color: var(--green); margin-top: 1rem;">Notes</h6><p>' + s.notes + '</p>' : ''}
                            </div>
                        </div>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                        <button type="button" class="btn btn-green" onclick="bootstrap.Modal.getInstance(document.getElementById('viewSupplierModal')).hide(); editSupplier('${s._id}')">
                            <i class="fas fa-pencil-alt"></i> Edit
                        </button>
                    </div>
                </div>
            </div>
        </div>`;

        document.getElementById('viewSupplierModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('viewSupplierModal')).show();
    } catch (error) {
        console.error('Error viewing supplier:', error);
        showToast('error', 'Failed to load supplier details');
    }
}

async function editSupplier(supplierId) {
    try {
        const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load supplier');
        const data = await response.json();
        const s = data.supplier || data;

        // Reuse create modal but pre-fill values
        showCreateSupplierModal();

        // Wait for modal to render then fill fields
        setTimeout(() => {
            const modal = document.getElementById('supplierModal');
            if (!modal) return;

            modal.querySelector('.modal-title').innerHTML = '<i class="fas fa-building"></i> Edit Supplier';

            document.getElementById('supplierName').value = s.name || '';
            document.getElementById('supplierType').value = s.license?.type || '';
            document.getElementById('supplierContact').value = s.contactPerson || '';
            document.getElementById('supplierEmail').value = s.email || '';
            document.getElementById('supplierPhone').value = s.phone || '';
            document.getElementById('supplierLicense').value = s.license?.number || '';
            document.getElementById('supplierStreet').value = s.address?.street || '';
            document.getElementById('supplierCity').value = s.address?.city || '';
            document.getElementById('supplierProvince').value = s.address?.province || '';
            document.getElementById('supplierPostal').value = s.address?.postalCode || '';
            document.getElementById('supplierNotes').value = s.notes || '';

            // Check category boxes
            (s.productCategories || []).forEach(cat => {
                const cb = document.getElementById('cat-' + cat);
                if (cb) cb.checked = true;
            });

            // Change save button to update
            const saveBtn = modal.querySelector('.btn-green[onclick="saveSupplier()"]');
            if (saveBtn) {
                saveBtn.setAttribute('onclick', `updateSupplier('${s._id}')`);
                saveBtn.innerHTML = '<i class="fas fa-save"></i> Update Supplier';
            }
        }, 300);
    } catch (error) {
        console.error('Error loading supplier for edit:', error);
        showToast('error', 'Failed to load supplier');
    }
}

async function updateSupplier(supplierId) {
    const categories = [];
    document.querySelectorAll('#supplierModal input[type="checkbox"]:checked').forEach(cb => {
        categories.push(cb.value);
    });

    const supplierData = {
        name: document.getElementById('supplierName').value,
        license: {
            type: document.getElementById('supplierType').value,
            number: document.getElementById('supplierLicense').value
        },
        contactPerson: document.getElementById('supplierContact').value,
        email: document.getElementById('supplierEmail').value,
        phone: document.getElementById('supplierPhone').value,
        address: {
            street: document.getElementById('supplierStreet').value,
            city: document.getElementById('supplierCity').value,
            province: document.getElementById('supplierProvince').value,
            postalCode: document.getElementById('supplierPostal').value,
            country: 'South Africa'
        },
        productCategories: categories,
        notes: document.getElementById('supplierNotes').value
    };

    if (!supplierData.name || !supplierData.license.type) {
        showToast('error', 'Name and type are required');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/suppliers/${supplierId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(supplierData)
        });

        if (!response.ok) throw new Error('Failed to update supplier');

        showToast('success', 'Supplier updated successfully');
        bootstrap.Modal.getInstance(document.getElementById('supplierModal')).hide();
        loadSuppliers();
    } catch (error) {
        console.error('Error updating supplier:', error);
        showToast('error', 'Failed to update supplier');
    }
}

async function viewSupplierOrders(supplierId) {
    try {
        const response = await fetch(`${API_URL}/purchase-orders?supplierId=${supplierId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        if (!response.ok) throw new Error('Failed to load orders');
        const data = await response.json();
        const orders = data.orders || [];

        const modalHtml = `
        <div class="modal fade" id="supplierOrdersModal" tabindex="-1">
            <div class="modal-dialog modal-lg">
                <div class="modal-content">
                    <div class="modal-header" style="background: var(--gold); color: var(--green-dark);">
                        <h5 class="modal-title"><i class="fas fa-shopping-cart"></i> Supplier Purchase Orders</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        ${orders.length === 0 ? `
                            <div class="text-center py-4">
                                <i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5;"></i>
                                <p class="mt-2 mb-0">No purchase orders found for this supplier</p>
                            </div>
                        ` : `
                            <div class="table-responsive">
                                <table class="table table-hover">
                                    <thead>
                                        <tr>
                                            <th>PO Number</th>
                                            <th>Items</th>
                                            <th>Total</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        ${orders.map(o => `
                                            <tr>
                                                <td>${o.poNumber || o._id?.substring(0,8)}</td>
                                                <td>${o.items?.length || 0}</td>
                                                <td>R${(o.totalAmount || 0).toFixed(2)}</td>
                                                <td><span class="badge bg-${o.status === 'received' ? 'success' : o.status === 'approved' ? 'primary' : o.status === 'cancelled' ? 'danger' : 'warning'}">${o.status}</span></td>
                                                <td>${o.createdAt ? new Date(o.createdAt).toLocaleDateString('en-ZA') : '-'}</td>
                                            </tr>
                                        `).join('')}
                                    </tbody>
                                </table>
                            </div>
                        `}
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-outline-secondary" data-bs-dismiss="modal">Close</button>
                    </div>
                </div>
            </div>
        </div>`;

        document.getElementById('supplierOrdersModal')?.remove();
        document.body.insertAdjacentHTML('beforeend', modalHtml);
        new bootstrap.Modal(document.getElementById('supplierOrdersModal')).show();
    } catch (error) {
        console.error('Error loading supplier orders:', error);
        showToast('error', 'Failed to load order history');
    }
}

// Initialize data on section change
document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function() {
        const target = this.getAttribute('href').substring(1);
        if (target === 'batches') loadBatches();
        if (target === 'purchase-orders') loadPurchaseOrders();
        if (target === 'suppliers') loadSuppliers();
    });
});
