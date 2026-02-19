// inv-reorder.js — Auto reorder rules for inventory manager dashboard
// Depends on: config.js (API_URL), dbc-utils.js (showToast), dbc-auth.js (getToken)

// ========================================
// AUTO REORDER FUNCTIONS
// ========================================

let allProducts = [];
let allSuppliersList = [];

async function loadReorderRules() {
    const tableBody = document.getElementById('reorderRulesTable');
    tableBody.innerHTML = `
        <tr>
            <td colspan="9" class="text-center py-4">
                <div class="spinner-border text-success" role="status"></div>
                <p class="mt-2 mb-0">Loading reorder rules...</p>
            </td>
        </tr>
    `;

    try {
        // Fetch reorder rules
        const statusFilter = document.getElementById('reorderStatusFilter')?.value || '';
        const autoFilter = document.getElementById('reorderAutoFilter')?.value || '';

        let url = `${API_URL}/reorder-rules?`;
        if (statusFilter === 'active') url += 'isActive=true&';
        if (statusFilter === 'inactive') url += 'isActive=false&';
        if (autoFilter === 'auto') url += 'autoOrderEnabled=true&';
        if (autoFilter === 'manual') url += 'autoOrderEnabled=false&';

        const response = await fetch(url, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load reorder rules');

        const data = await response.json();
        const rules = data.rules || data.data || [];

        // Also load products for low stock alerts
        const productsRes = await fetch(`${API_URL}/products?limit=500`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const productsData = await productsRes.json();
        allProducts = productsData.products || productsData.data || [];

        if (rules.length === 0) {
            tableBody.innerHTML = `
                <tr>
                    <td colspan="9" class="text-center py-4">
                        <i class="fas fa-inbox" style="font-size: 2rem; opacity: 0.5;"></i>
                        <p class="mt-2 mb-0">No reorder rules configured yet.</p>
                        <button class="btn btn-green btn-sm mt-2" onclick="openAddReorderRuleModal()">
                            <i class="fas fa-plus"></i> Add First Rule
                        </button>
                    </td>
                </tr>
            `;
        } else {
            tableBody.innerHTML = rules.map(rule => {
                const product = rule.product || {};
                const supplier = rule.preferredSupplier || {};
                const currentStock = product.inventory?.quantity || 0;
                const isLowStock = currentStock <= rule.reorderPoint;

                return `
                    <tr class="${isLowStock ? 'table-danger' : ''}">
                        <td>
                            <strong>${product.name || 'Unknown'}</strong>
                            ${isLowStock ? '<span class="badge bg-danger ms-2">LOW</span>' : ''}
                        </td>
                        <td><code>${product.sku || '-'}</code></td>
                        <td>
                            <span class="${isLowStock ? 'text-danger fw-bold' : ''}">${currentStock}</span>
                        </td>
                        <td>${rule.reorderPoint}</td>
                        <td>${rule.reorderQuantity}</td>
                        <td>${supplier.name || 'Not set'}</td>
                        <td>
                            ${rule.autoOrderEnabled
                                ? '<span class="badge bg-success">Auto</span>'
                                : '<span class="badge bg-secondary">Manual</span>'}
                            ${rule.requiresApproval ? '<span class="badge bg-warning text-dark ms-1">Approval</span>' : ''}
                        </td>
                        <td>
                            ${rule.isActive
                                ? '<span class="badge bg-success">Active</span>'
                                : '<span class="badge bg-secondary">Inactive</span>'}
                        </td>
                        <td>
                            <div class="btn-group btn-group-sm">
                                <button class="btn btn-outline-primary" onclick="editReorderRule('${rule._id}')" title="Edit">
                                    <i class="fas fa-pencil-alt"></i>
                                </button>
                                <button class="btn btn-outline-success" onclick="triggerReorder('${rule._id}')" title="Trigger Now">
                                    <i class="fas fa-cart-plus"></i>
                                </button>
                                <button class="btn btn-outline-danger" onclick="deleteReorderRule('${rule._id}')" title="Delete">
                                    <i class="fas fa-trash"></i>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        // Load low stock alerts
        loadLowStockAlerts();

    } catch (error) {
        console.error('Error loading reorder rules:', error);
        tableBody.innerHTML = `
            <tr>
                <td colspan="9" class="text-center py-4 text-danger">
                    <i class="fas fa-exclamation-triangle"></i>
                    Failed to load reorder rules. ${error.message}
                </td>
            </tr>
        `;
    }
}

function loadLowStockAlerts() {
    const container = document.getElementById('lowStockAlerts');
    if (!container) return;

    // Filter products below their low stock threshold
    const lowStockProducts = allProducts.filter(p => {
        const qty = p.inventory?.quantity || 0;
        const threshold = p.inventory?.lowStockThreshold || 10;
        return qty <= threshold && p.status === 'active';
    });

    if (lowStockProducts.length === 0) {
        container.innerHTML = `
            <div class="col-12">
                <div class="alert alert-success">
                    <i class="fas fa-check-circle"></i> All products are above low stock thresholds.
                </div>
            </div>
        `;
    } else {
        container.innerHTML = lowStockProducts.map(p => `
            <div class="col-md-4 mb-3">
                <div class="card border-danger">
                    <div class="card-body">
                        <h6 class="card-title text-danger">
                            <i class="fas fa-exclamation-triangle"></i> ${p.name}
                        </h6>
                        <p class="card-text mb-1">
                            <small>SKU: ${p.sku || 'N/A'}</small>
                        </p>
                        <p class="card-text">
                            <strong>Stock: ${p.inventory?.quantity || 0}</strong>
                            <span class="text-muted">/ Threshold: ${p.inventory?.lowStockThreshold || 10}</span>
                        </p>
                        <button class="btn btn-danger btn-sm" onclick="quickCreateReorderRule('${p._id}')">
                            <i class="fas fa-plus"></i> Create Reorder Rule
                        </button>
                    </div>
                </div>
            </div>
        `).join('');
    }
}

async function openAddReorderRuleModal() {
    // Load products and suppliers for the modal
    try {
        const [productsRes, suppliersRes] = await Promise.all([
            fetch(`${API_URL}/products?status=active&limit=500`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            }),
            fetch(`${API_URL}/suppliers?status=active`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            })
        ]);

        const productsData = await productsRes.json();
        const suppliersData = await suppliersRes.json();

        allProducts = productsData.products || productsData.data || [];
        allSuppliersList = suppliersData.suppliers || suppliersData.data || [];

        // Create and show modal
        showReorderRuleModal(null);
    } catch (error) {
        console.error('Error loading data for modal:', error);
        showToast('error', 'Failed to load products and suppliers');
    }
}

function showReorderRuleModal(rule) {
    const isEdit = !!rule;
    const modalHtml = `
        <div class="modal fade" id="reorderRuleModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header" style="background: var(--green); color: white;">
                        <h5 class="modal-title">
                            <i class="fas fa-sync-alt"></i>
                            ${isEdit ? 'Edit Reorder Rule' : 'Add Reorder Rule'}
                        </h5>
                        <button type="button" class="btn-close btn-close-white" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="reorderRuleForm">
                            <input type="hidden" id="ruleId" value="${rule?._id || ''}">

                            <div class="mb-3">
                                <label class="form-label">Product *</label>
                                <select class="form-select" id="ruleProduct" required ${isEdit ? 'disabled' : ''}>
                                    <option value="">Select product...</option>
                                    ${allProducts.map(p => `
                                        <option value="${p._id}" ${rule?.product?._id === p._id ? 'selected' : ''}>
                                            ${p.name} (${p.sku || 'No SKU'}) - Stock: ${p.inventory?.quantity || 0}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Reorder Point *</label>
                                    <input type="number" class="form-control" id="ruleReorderPoint"
                                        value="${rule?.reorderPoint || 10}" min="0" required>
                                    <small class="text-muted">Trigger when stock drops to this level</small>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Reorder Quantity *</label>
                                    <input type="number" class="form-control" id="ruleReorderQty"
                                        value="${rule?.reorderQuantity || 50}" min="1" required>
                                    <small class="text-muted">How many to order</small>
                                </div>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Max Stock Level</label>
                                    <input type="number" class="form-control" id="ruleMaxStock"
                                        value="${rule?.maxStock || ''}" min="0">
                                    <small class="text-muted">Optional upper limit</small>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <label class="form-label">Lead Time (Days)</label>
                                    <input type="number" class="form-control" id="ruleLeadTime"
                                        value="${rule?.leadTimeDays || 3}" min="0">
                                </div>
                            </div>

                            <div class="mb-3">
                                <label class="form-label">Preferred Supplier</label>
                                <select class="form-select" id="ruleSupplier">
                                    <option value="">Select supplier...</option>
                                    ${allSuppliersList.map(s => `
                                        <option value="${s._id}" ${rule?.preferredSupplier?._id === s._id ? 'selected' : ''}>
                                            ${s.name}
                                        </option>
                                    `).join('')}
                                </select>
                            </div>

                            <div class="row">
                                <div class="col-md-6 mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="ruleAutoOrder"
                                            ${rule?.autoOrderEnabled ? 'checked' : ''}>
                                        <label class="form-check-label" for="ruleAutoOrder">
                                            Auto-create PO when triggered
                                        </label>
                                    </div>
                                </div>
                                <div class="col-md-6 mb-3">
                                    <div class="form-check form-switch">
                                        <input class="form-check-input" type="checkbox" id="ruleRequiresApproval"
                                            ${rule?.requiresApproval !== false ? 'checked' : ''}>
                                        <label class="form-check-label" for="ruleRequiresApproval">
                                            Requires approval
                                        </label>
                                    </div>
                                </div>
                            </div>

                            <div class="form-check form-switch mb-3">
                                <input class="form-check-input" type="checkbox" id="ruleIsActive"
                                    ${rule?.isActive !== false ? 'checked' : ''}>
                                <label class="form-check-label" for="ruleIsActive">
                                    Rule is active
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Cancel</button>
                        <button type="button" class="btn btn-green" onclick="saveReorderRule()">
                            <i class="fas fa-check"></i> ${isEdit ? 'Update Rule' : 'Create Rule'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;

    // Remove existing modal if any
    const existingModal = document.getElementById('reorderRuleModal');
    if (existingModal) existingModal.remove();

    // Add modal to page
    document.body.insertAdjacentHTML('beforeend', modalHtml);

    // Show modal
    const modal = new bootstrap.Modal(document.getElementById('reorderRuleModal'));
    modal.show();
}

async function saveReorderRule() {
    const ruleId = document.getElementById('ruleId').value;
    const isEdit = !!ruleId;

    const ruleData = {
        product: document.getElementById('ruleProduct').value,
        reorderPoint: parseInt(document.getElementById('ruleReorderPoint').value),
        reorderQuantity: parseInt(document.getElementById('ruleReorderQty').value),
        maxStock: document.getElementById('ruleMaxStock').value ? parseInt(document.getElementById('ruleMaxStock').value) : null,
        leadTimeDays: parseInt(document.getElementById('ruleLeadTime').value) || 3,
        preferredSupplier: document.getElementById('ruleSupplier').value || null,
        autoOrderEnabled: document.getElementById('ruleAutoOrder').checked,
        requiresApproval: document.getElementById('ruleRequiresApproval').checked,
        isActive: document.getElementById('ruleIsActive').checked
    };

    if (!ruleData.product && !isEdit) {
        showToast('error', 'Please select a product');
        return;
    }

    try {
        const url = isEdit ? `${API_URL}/reorder-rules/${ruleId}` : `${API_URL}/reorder-rules`;
        const method = isEdit ? 'PUT' : 'POST';

        const response = await fetch(url, {
            method,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify(ruleData)
        });

        if (!response.ok) {
            const err = await response.json();
            throw new Error(err.message || 'Failed to save rule');
        }

        showToast('success', isEdit ? 'Reorder rule updated' : 'Reorder rule created');
        bootstrap.Modal.getInstance(document.getElementById('reorderRuleModal')).hide();
        loadReorderRules();
    } catch (error) {
        console.error('Error saving reorder rule:', error);
        showToast('error', error.message);
    }
}

async function editReorderRule(ruleId) {
    try {
        const response = await fetch(`${API_URL}/reorder-rules/${ruleId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        if (!response.ok) throw new Error('Failed to load rule');

        const data = await response.json();
        const rule = data.rule || data.data;

        // Load products and suppliers
        await openAddReorderRuleModal();

        // Wait for modal to be ready, then populate
        setTimeout(() => {
            document.getElementById('ruleId').value = rule._id;
            document.getElementById('ruleProduct').value = rule.product?._id || rule.product;
            document.getElementById('ruleReorderPoint').value = rule.reorderPoint;
            document.getElementById('ruleReorderQty').value = rule.reorderQuantity;
            document.getElementById('ruleMaxStock').value = rule.maxStock || '';
            document.getElementById('ruleLeadTime').value = rule.leadTimeDays || 3;
            document.getElementById('ruleSupplier').value = rule.preferredSupplier?._id || rule.preferredSupplier || '';
            document.getElementById('ruleAutoOrder').checked = rule.autoOrderEnabled;
            document.getElementById('ruleRequiresApproval').checked = rule.requiresApproval !== false;
            document.getElementById('ruleIsActive').checked = rule.isActive !== false;
        }, 300);
    } catch (error) {
        console.error('Error loading reorder rule:', error);
        showToast('error', 'Failed to load rule for editing');
    }
}

function triggerReorder(ruleId) {
    _dbcShowConfirm('Create a purchase order for this product now?', async function() {
        try {
            const response = await fetch(`${API_URL}/reorder-rules/${ruleId}/trigger`, {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (!response.ok) throw new Error('Failed to trigger reorder');

            const data = await response.json();
            showToast('success', `Purchase order created: ${data.purchaseOrder?.poNumber || 'PO Created'}`);
            loadReorderRules();
        } catch (error) {
            console.error('Error triggering reorder:', error);
            showToast('error', 'Failed to create purchase order');
        }
    }, { title: 'Trigger Reorder', confirmText: 'Create PO', icon: 'fa-cart-plus', type: 'info' });
}

function deleteReorderRule(ruleId) {
    _dbcShowConfirm('Are you sure you want to delete this reorder rule?', async function() {
        try {
            const response = await fetch(`${API_URL}/reorder-rules/${ruleId}`, {
                method: 'DELETE',
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            if (!response.ok) throw new Error('Failed to delete rule');

            showToast('success', 'Reorder rule deleted');
            loadReorderRules();
        } catch (error) {
            console.error('Error deleting reorder rule:', error);
            showToast('error', 'Failed to delete rule');
        }
    }, { title: 'Delete Rule', confirmText: 'Delete', icon: 'fa-trash', type: 'danger' });
}

async function quickCreateReorderRule(productId) {
    try {
        // Load suppliers
        const suppliersRes = await fetch(`${API_URL}/suppliers?status=active`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const suppliersData = await suppliersRes.json();
        allSuppliersList = suppliersData.suppliers || suppliersData.data || [];

        // Find product
        const product = allProducts.find(p => p._id === productId);
        if (!product) {
            showToast('error', 'Product not found');
            return;
        }

        // Create a rule object to pre-populate modal
        const rule = {
            product: product,
            reorderPoint: product.inventory?.lowStockThreshold || 10,
            reorderQuantity: 50,
            autoOrderEnabled: false,
            requiresApproval: true,
            isActive: true
        };

        showReorderRuleModal(rule);
    } catch (error) {
        console.error('Error creating quick rule:', error);
        showToast('error', 'Failed to create rule');
    }
}

console.log('JIG Craft Cannabis Inventory Manager Dashboard initialized');
console.log('MDC Custodian Role: Full control over product catalog and branch distribution');
console.log('Supply Chain: Farmer -> QA -> Inventory -> PND (Packaging & Distribution) -> Stores');
