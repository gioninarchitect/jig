// inv-mdc.js — Master Digital Catalogue (MDC) 4-stage pipeline
// Depends on: config.js (API_URL), dbc-utils.js (showToast), dbc-auth.js (getToken)
// Depends on: inv-core.js (formatTimeAgo, loadSectionData)
// Stages: Pending > QA > Approved > Live

let _mdcPipelineData = null;

// ============================================
// Load MDC pipeline data from API
// ============================================
async function loadMDCData() {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');

    try {
        const response = await fetch(`${API_URL}/mdc/pipeline`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!response.ok) throw new Error('Failed to load MDC pipeline');

        const data = await response.json();
        _mdcPipelineData = data;

        // Update stat cards
        document.getElementById('mdcPendingCount').textContent = data.counts.pending || 0;
        document.getElementById('mdcQaCount').textContent = data.counts.qa || 0;
        document.getElementById('mdcApprovedCount').textContent = data.counts.approved || 0;
        document.getElementById('mdcLiveCount').textContent = data.counts.live || 0;

        // Render pipeline board
        renderPipelineColumn('pending', data.stages.pending);
        renderPipelineColumn('qa', data.stages.qa);
        renderPipelineColumn('approved', data.stages.approved);
        renderPipelineColumn('live', data.stages.live);

    } catch (error) {
        console.error('Error loading MDC data:', error);
        document.getElementById('mdcPendingCount').textContent = '0';
        document.getElementById('mdcQaCount').textContent = '0';
        document.getElementById('mdcApprovedCount').textContent = '0';
        document.getElementById('mdcLiveCount').textContent = '0';
        ['pending', 'qa', 'approved', 'live'].forEach(stage => {
            const el = document.getElementById(`mdc-${stage}-list`);
            if (el) el.innerHTML = '<div class="text-center text-muted p-3"><i class="fas fa-inbox"></i> No products</div>';
        });
    }
}

// ============================================
// Render a pipeline column
// ============================================
function renderPipelineColumn(stage, products) {
    const container = document.getElementById(`mdc-${stage}-list`);
    if (!container) return;

    if (!products || products.length === 0) {
        container.innerHTML = '<div class="text-center text-muted p-3"><i class="fas fa-inbox"></i> No products</div>';
        return;
    }

    container.innerHTML = products.map(p => {
        const thumb = p.images && p.images.length > 0
            ? `<img src="${p.images[0].url}" alt="${p.name}" style="width:40px;height:40px;object-fit:cover;border-radius:4px;">`
            : '<div style="width:40px;height:40px;background:#eee;border-radius:4px;display:flex;align-items:center;justify-content:center;"><i class="fas fa-image" style="color:#999;"></i></div>';

        const trackBadge = p.track === 'medical'
            ? '<span class="badge" style="background:#DC2626;color:#fff;font-size:0.65rem;">Medical</span>'
            : p.track === 'lifestyle'
                ? '<span class="badge" style="background:#7C3AED;color:#fff;font-size:0.65rem;">Lifestyle</span>'
                : '<span class="badge" style="background:#999;color:#fff;font-size:0.65rem;">Untagged</span>';

        const actions = getMDCCardActions(stage, p._id);

        return `
            <div class="mdc-product-card" data-product-id="${p._id}">
                <div class="d-flex gap-2 align-items-start">
                    ${thumb}
                    <div class="flex-grow-1" style="min-width:0;">
                        <div class="fw-bold text-truncate" style="font-size:0.85rem;" title="${p.name}">${p.name}</div>
                        <div style="font-size:0.75rem;color:#666;">
                            ${p.sku || 'No SKU'} | ${p.category || 'N/A'} ${trackBadge}
                        </div>
                        <div style="font-size:0.75rem;color:#888;">R${(p.price || 0).toFixed(2)} | Stock: ${p.inventory?.quantity || 0}</div>
                        ${p.mdcNotes ? `<div style="font-size:0.7rem;color:#DC2626;margin-top:2px;"><i class="fas fa-comment-alt"></i> ${p.mdcNotes}</div>` : ''}
                    </div>
                </div>
                <div class="mt-2 d-flex gap-1 flex-wrap">${actions}</div>
            </div>
        `;
    }).join('');
}

// ============================================
// Get action buttons for each stage
// ============================================
function getMDCCardActions(stage, productId) {
    switch (stage) {
        case 'pending':
            return `
                <button class="btn btn-sm btn-gold" onclick="mdcAdvance('${productId}')">
                    <i class="fas fa-arrow-right"></i> Send to QA
                </button>
                <button class="btn btn-sm btn-outline-secondary" onclick="openPricingToolFor('${productId}')">
                    <i class="fas fa-calculator"></i>
                </button>
            `;
        case 'qa':
            return `
                <button class="btn btn-sm btn-green" onclick="mdcAdvance('${productId}')">
                    <i class="fas fa-check"></i> Approve
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="mdcReject('${productId}')">
                    <i class="fas fa-times"></i> Reject
                </button>
            `;
        case 'approved':
            return `
                <button class="btn btn-sm btn-green" onclick="openStockAllocatorFor('${productId}')">
                    <i class="fas fa-sitemap"></i> Allocate
                </button>
                <button class="btn btn-sm btn-gold" onclick="mdcGoLive('${productId}')">
                    <i class="fas fa-broadcast-tower"></i> Go Live
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="mdcReject('${productId}')">
                    <i class="fas fa-times"></i>
                </button>
            `;
        case 'live':
            return `
                <button class="btn btn-sm btn-outline-secondary" onclick="openStockAllocatorFor('${productId}')">
                    <i class="fas fa-sitemap"></i> Reallocate
                </button>
                <button class="btn btn-sm btn-outline-danger" onclick="mdcReject('${productId}')">
                    <i class="fas fa-undo"></i> Pull Back
                </button>
            `;
        default:
            return '';
    }
}

// ============================================
// Stage transition actions
// ============================================
async function mdcAdvance(productId) {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_URL}/mdc/products/${productId}/advance`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showToast('success', `Product moved to ${data.newStage}`);
        loadMDCData();
    } catch (err) {
        showToast('error', err.message || 'Failed to advance product');
    }
}

function mdcReject(productId) {
    _dbcShowPrompt('Rejection reason:', async function(notes) {
        const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
        try {
            const res = await fetch(`${API_URL}/mdc/products/${productId}/reject`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ notes: notes || 'Rejected - needs review' })
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.message);
            showToast('success', 'Product sent back to pending');
            loadMDCData();
        } catch (err) {
            showToast('error', err.message || 'Failed to reject product');
        }
    }, { title: 'Reject Product', icon: 'fa-times-circle', placeholder: 'Enter reason...', required: false });
}

async function mdcGoLive(productId) {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_URL}/mdc/products/${productId}/go-live`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showToast('success', `Product is LIVE on ${data.branchCount} branches`);
        loadMDCData();
    } catch (err) {
        showToast('error', err.message || 'Failed to go live');
    }
}

// ============================================
// Pricing Tool
// ============================================
function openPricingTool() {
    // Load all products that need pricing review
    openPricingModal();
}

function openPricingToolFor(productId) {
    openPricingModal(productId);
}

async function openPricingModal(singleProductId) {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    const modal = document.getElementById('mdcPricingModal');
    const body = document.getElementById('mdcPricingBody');
    body.innerHTML = '<div class="text-center p-4"><i class="fas fa-hourglass-half fa-spin"></i> Loading...</div>';
    modal.style.display = 'flex';

    try {
        let url = `${API_URL}/mdc/products?limit=100`;
        if (singleProductId) url = `${API_URL}/products/${singleProductId}`;

        const res = await fetch(url, { headers: { 'Authorization': `Bearer ${token}` } });
        const data = await res.json();

        let products = singleProductId ? [data.product || data] : (data.products || []);

        if (products.length === 0) {
            body.innerHTML = '<div class="text-center p-4 text-muted">No products found</div>';
            return;
        }

        body.innerHTML = `
            <table class="table table-sm" style="font-size:0.85rem;">
                <thead>
                    <tr><th>Product</th><th>SKU</th><th>Price (R)</th><th>Compare At (R)</th><th>Cost (R)</th><th></th></tr>
                </thead>
                <tbody>
                    ${products.map(p => `
                        <tr data-product-id="${p._id}">
                            <td class="text-truncate" style="max-width:150px;" title="${p.name}">${p.name}</td>
                            <td>${p.sku || ''}</td>
                            <td><input type="number" class="form-control form-control-sm pricing-price" value="${p.price || 0}" step="0.01" min="0" style="width:90px;"></td>
                            <td><input type="number" class="form-control form-control-sm pricing-compare" value="${p.compareAtPrice || ''}" step="0.01" min="0" style="width:90px;"></td>
                            <td><input type="number" class="form-control form-control-sm pricing-cost" value="${p.costPrice || ''}" step="0.01" min="0" style="width:90px;"></td>
                            <td><button class="btn btn-sm btn-green" onclick="savePricing('${p._id}', this)"><i class="fas fa-check"></i></button></td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        `;
    } catch (err) {
        body.innerHTML = `<div class="text-center p-4 text-danger">Error: ${err.message}</div>`;
    }
}

async function savePricing(productId, btn) {
    const row = btn.closest('tr');
    const price = parseFloat(row.querySelector('.pricing-price').value);
    const compareAtPrice = parseFloat(row.querySelector('.pricing-compare').value) || undefined;
    const costPrice = parseFloat(row.querySelector('.pricing-cost').value) || undefined;

    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_URL}/products/${productId}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ price, compareAtPrice, costPrice })
        });
        if (!res.ok) throw new Error('Failed to update');
        btn.innerHTML = '<i class="fas fa-check-circle" style="color:#7C3AED;"></i>';
        setTimeout(() => { btn.innerHTML = '<i class="fas fa-check"></i>'; }, 2000);
    } catch (err) {
        showToast('error', 'Failed to save pricing: ' + err.message);
    }
}

function closePricingModal() {
    document.getElementById('mdcPricingModal').style.display = 'none';
}

// ============================================
// Bulk Track Tagger
// ============================================
async function openBulkTagTool() {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    const modal = document.getElementById('mdcBulkTagModal');
    const body = document.getElementById('mdcBulkTagBody');
    body.innerHTML = '<div class="text-center p-4"><i class="fas fa-hourglass-half fa-spin"></i> Loading untagged products...</div>';
    modal.style.display = 'flex';

    try {
        // Fetch products that need track classification (no track or pending stage)
        const res = await fetch(`${API_URL}/mdc/products?limit=100`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        const products = (data.products || []).filter(p => !p.track);

        if (products.length === 0) {
            body.innerHTML = '<div class="text-center p-4 text-muted"><i class="fas fa-check-circle" style="font-size:2rem;color:#7C3AED;"></i><p class="mt-2">All products have been tagged</p></div>';
            return;
        }

        body.innerHTML = `
            <div class="mb-3">
                <label class="form-label fw-bold">Select products to tag:</label>
                <div class="form-check mb-2">
                    <input class="form-check-input" type="checkbox" id="bulkTagSelectAll" onchange="toggleBulkTagAll(this.checked)">
                    <label class="form-check-label" for="bulkTagSelectAll">Select All (${products.length})</label>
                </div>
            </div>
            <div style="max-height:300px;overflow-y:auto;border:1px solid #ddd;border-radius:4px;padding:8px;">
                ${products.map(p => `
                    <div class="form-check mb-1">
                        <input class="form-check-input bulk-tag-check" type="checkbox" value="${p._id}" id="btag-${p._id}">
                        <label class="form-check-label" for="btag-${p._id}" style="font-size:0.85rem;">
                            ${p.name} <span class="text-muted">(${p.sku || 'No SKU'})</span>
                        </label>
                    </div>
                `).join('')}
            </div>
            <div class="mt-3">
                <label class="form-label fw-bold">Assign track:</label>
                <div class="d-flex gap-2">
                    <button class="btn btn-green flex-fill" onclick="submitBulkTag('lifestyle')">
                        <i class="fas fa-leaf"></i> Lifestyle
                    </button>
                    <button class="btn btn-section21 flex-fill" onclick="submitBulkTag('medical')">
                        <i class="fas fa-prescription"></i> Medical
                    </button>
                </div>
            </div>
        `;
    } catch (err) {
        body.innerHTML = `<div class="text-center p-4 text-danger">Error: ${err.message}</div>`;
    }
}

function toggleBulkTagAll(checked) {
    document.querySelectorAll('.bulk-tag-check').forEach(cb => cb.checked = checked);
}

async function submitBulkTag(track) {
    const selected = Array.from(document.querySelectorAll('.bulk-tag-check:checked')).map(cb => cb.value);
    if (selected.length === 0) {
        showToast('warning', 'Select at least one product');
        return;
    }

    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_URL}/mdc/products/bulk-tag`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productIds: selected, track })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showToast('success', `${data.modifiedCount} products tagged as ${track}`);
        closeBulkTagModal();
        loadMDCData();
    } catch (err) {
        showToast('error', err.message || 'Failed to tag products');
    }
}

function closeBulkTagModal() {
    document.getElementById('mdcBulkTagModal').style.display = 'none';
}

// ============================================
// Branch Stock Allocator
// ============================================
function openStockAllocator() {
    // Open allocator for first approved product if any
    if (_mdcPipelineData && _mdcPipelineData.stages.approved.length > 0) {
        openStockAllocatorFor(_mdcPipelineData.stages.approved[0]._id);
    } else {
        showToast('info', 'No approved products ready for allocation');
    }
}

async function openStockAllocatorFor(productId) {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    const modal = document.getElementById('mdcAllocatorModal');
    const body = document.getElementById('mdcAllocatorBody');
    body.innerHTML = '<div class="text-center p-4"><i class="fas fa-hourglass-half fa-spin"></i> Loading allocation data...</div>';
    modal.style.display = 'flex';
    modal.dataset.productId = productId;

    try {
        const res = await fetch(`${API_URL}/mdc/products/${productId}/allocation`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        const { product, allocations, branches } = data;
        document.getElementById('mdcAllocatorTitle').textContent = `Allocate: ${product.name} (${product.sku})`;

        // Build allocation map
        const allocMap = {};
        allocations.forEach(a => {
            allocMap[a.branchId._id || a.branchId] = {
                quantity: a.quantity,
                overridePrice: a.overridePrice
            };
        });

        body.innerHTML = `
            <table class="table table-sm" style="font-size:0.85rem;">
                <thead>
                    <tr>
                        <th>Branch</th>
                        <th>Code</th>
                        <th>Type</th>
                        <th>Qty</th>
                        <th>Price Override (R)</th>
                    </tr>
                </thead>
                <tbody>
                    ${branches.map(b => {
                        const alloc = allocMap[b._id] || {};
                        return `
                            <tr data-branch-id="${b._id}">
                                <td>${b.name}</td>
                                <td><span class="badge bg-secondary">${b.branchCode}</span></td>
                                <td>${b.type}</td>
                                <td><input type="number" class="form-control form-control-sm alloc-qty" value="${alloc.quantity || 0}" min="0" style="width:80px;"></td>
                                <td><input type="number" class="form-control form-control-sm alloc-price" value="${alloc.overridePrice || ''}" step="0.01" min="0" placeholder="Default: R${(product.price || 0).toFixed(2)}" style="width:130px;"></td>
                            </tr>
                        `;
                    }).join('')}
                </tbody>
            </table>
            <div class="d-flex justify-content-between mt-3">
                <small class="text-muted">Base price: R${(product.price || 0).toFixed(2)}</small>
                <button class="btn btn-green" onclick="submitAllocation()">
                    <i class="fas fa-check-circle"></i> Save Allocation
                </button>
            </div>
        `;
    } catch (err) {
        body.innerHTML = `<div class="text-center p-4 text-danger">Error: ${err.message}</div>`;
    }
}

async function submitAllocation() {
    const modal = document.getElementById('mdcAllocatorModal');
    const productId = modal.dataset.productId;
    const rows = modal.querySelectorAll('tbody tr');
    const branches = [];

    rows.forEach(row => {
        const branchId = row.dataset.branchId;
        const quantity = parseInt(row.querySelector('.alloc-qty').value) || 0;
        const priceVal = row.querySelector('.alloc-price').value;
        const overridePrice = priceVal ? parseFloat(priceVal) : undefined;
        if (quantity > 0) {
            branches.push({ branchId, quantity, overridePrice });
        }
    });

    if (branches.length === 0) {
        showToast('warning', 'Allocate to at least one branch');
        return;
    }

    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_URL}/mdc/products/${productId}/allocate`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ branches })
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);
        showToast('success', `Allocated to ${data.allocations.length} branches (Total: ${data.totalQuantity} units)`);
        closeAllocatorModal();
        loadMDCData();
    } catch (err) {
        showToast('error', err.message || 'Failed to allocate');
    }
}

function closeAllocatorModal() {
    document.getElementById('mdcAllocatorModal').style.display = 'none';
}

// ============================================
// MDC Report
// ============================================
async function generateMDCReport() {
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');
    try {
        const res = await fetch(`${API_URL}/mdc/pipeline`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.message);

        // Build CSV
        const rows = [['Name', 'SKU', 'Category', 'Track', 'Price', 'Stock', 'MDC Stage', 'Notes']];
        ['pending', 'qa', 'approved', 'live'].forEach(stage => {
            (data.stages[stage] || []).forEach(p => {
                rows.push([
                    `"${(p.name || '').replace(/"/g, '""')}"`,
                    p.sku || '',
                    p.category || '',
                    p.track || '',
                    (p.price || 0).toFixed(2),
                    p.inventory?.quantity || 0,
                    stage,
                    `"${(p.mdcNotes || '').replace(/"/g, '""')}"`
                ]);
            });
        });

        const csv = rows.map(r => r.join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `mdc-report-${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);

        showToast('success', `MDC Report downloaded (${rows.length - 1} products)`);
    } catch (err) {
        showToast('error', 'Failed to generate report: ' + err.message);
    }
}

// ============================================
// Legacy functions kept for compatibility
// ============================================
function refreshPendingUploads() {
    showToast('info', 'Refreshing MDC pipeline...');
    loadMDCData();
}

function bulkApproveUploads() {
    openBulkTagTool();
}

function updateMDCCounters() {
    // No-op, counters updated by loadMDCData
}

function sendToPND(batchId, track) {
    showToast('info', `Product ${batchId} queued for distribution`);
}

// Tag product with track - PERSISTS TO DATABASE (kept for backward compat)
async function tagProduct(productId, track) {
    const trackValue = track === 'section21' ? 'medical' : track === 'both' ? 'lifestyle' : track;
    const token = sessionStorage.getItem('token') || sessionStorage.getItem('adminToken');

    try {
        const res = await fetch(`${API_URL}/mdc/products/bulk-tag`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
            body: JSON.stringify({ productIds: [productId], track: trackValue })
        });
        if (!res.ok) throw new Error('Failed to tag product');
        showToast('success', `Product tagged as ${track}`);
        loadMDCData();
    } catch (err) {
        showToast('error', 'Failed to tag product: ' + err.message);
    }
}
