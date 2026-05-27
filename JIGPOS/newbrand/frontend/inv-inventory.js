// inv-inventory.js — Inventory data, filters, stock levels, and export
// Depends on: config.js (API_URL), or-utils.js (showToast), or-auth.js (getToken)

// Store all products for filtering
let allInventoryProducts = [];

// Load inventory data from API
async function loadInventoryData() {
    try {
        const response = await fetch(`${API_URL}/products?limit=9999`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (!response.ok) throw new Error('Failed to load products');

        const data = await response.json();
        allInventoryProducts = data.products || [];

        // Update stats cards — split weight (flower) vs units (countable)
        const totalProducts = allInventoryProducts.length;
        let totalWeight = 0;
        let totalUnits = 0;
        allInventoryProducts.forEach(p => {
            const qty = p.inventory?.quantity || 0;
            if (qty <= 0) return;
            const cat = (p.category || '').toLowerCase();
            const tags = p.tags || [];
            const pType = (p.productType || '').toLowerCase();
            const name = (p.name || '').toLowerCase();
            const isFlower = cat === 'flower';
            const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack')
                || pType === 'pre-roll' || pType === 'pre-pack'
                || name.includes('pre roll') || name.includes('preroll')
                || name.includes('pre pack') || name.includes('joint');
            const isCountable = p.isCountable || p.unit === 'units' || !isFlower || isPreRollOrPack;
            if (isCountable) {
                totalUnits += qty;
            } else {
                totalWeight += qty;
            }
        });
        const lowStock = allInventoryProducts.filter(p => (p.inventory?.quantity || 0) <= 10 && (p.inventory?.quantity || 0) > 0).length;
        const categories = [...new Set(allInventoryProducts.map(p => p.category))].length;

        document.getElementById('totalProducts').textContent = totalProducts;
        const weightEl = document.getElementById('totalWeight');
        const unitsEl = document.getElementById('totalUnits');
        if (weightEl) weightEl.textContent = totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (unitsEl) unitsEl.textContent = totalUnits.toLocaleString();
        document.getElementById('lowStockCount').textContent = lowStock;
        document.getElementById('categoriesCount').textContent = categories;

        // Apply filters and render
        filterInventory();

    } catch (error) {
        console.error('Error loading inventory:', error);
    }
}

// Load branches for filter dropdown
async function loadBranchesForFilter() {
    try {
        const response = await fetch(`${API_URL}/branches`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!response.ok) return;

        const data = await response.json();
        const branches = data.branches || data || [];
        const select = document.getElementById('inventoryBranchFilter');
        if (select) {
            select.innerHTML = '<option value="">All Branches (Master)</option>' +
                branches.map(b => `<option value="${b._id}">${b.name}</option>`).join('');
        }
    } catch (error) {
        console.error('Error loading branches:', error);
    }
}

// Load branch-specific inventory when a branch is selected
async function loadBranchInventory() {
    const branchId = document.getElementById('inventoryBranchFilter')?.value || '';
    if (!branchId) {
        // "All Branches" — reload master product list
        loadInventoryData();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/branch-inventory?branchId=${branchId}&limit=9999`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });
        if (!response.ok) throw new Error('Failed to load branch inventory');

        const data = await response.json();
        const inventory = data.inventory || [];

        // Map branch inventory into the same format as allInventoryProducts
        allInventoryProducts = inventory
            .filter(item => item.productId)
            .map(item => ({
                _id: item.productId._id,
                name: item.productId.name,
                sku: item.productId.sku,
                category: item.productId.category,
                price: item.productId.price,
                supplier: item.productId.supplier || '',
                productType: item.productId.productType || '',
                tags: item.productId.tags || [],
                inventory: {
                    quantity: item.quantity || 0,
                    unit: item.unit || 'units'
                }
            }));

        // Update stats
        let totalWeight = 0, totalUnits = 0;
        allInventoryProducts.forEach(p => {
            const qty = p.inventory?.quantity || 0;
            if (qty <= 0) return;
            const isFlower = (p.category || '').toLowerCase() === 'flower';
            const isCountable = !isFlower || (p.tags || []).includes('pre-roll') || (p.tags || []).includes('pre-pack');
            if (isCountable) totalUnits += qty;
            else totalWeight += qty;
        });
        const lowStock = allInventoryProducts.filter(p => (p.inventory?.quantity || 0) <= 10 && (p.inventory?.quantity || 0) > 0).length;
        const categories = [...new Set(allInventoryProducts.map(p => p.category))].length;

        document.getElementById('totalProducts').textContent = allInventoryProducts.length;
        const weightEl = document.getElementById('totalWeight');
        const unitsEl = document.getElementById('totalUnits');
        if (weightEl) weightEl.textContent = totalWeight.toLocaleString(undefined, { maximumFractionDigits: 1 });
        if (unitsEl) unitsEl.textContent = totalUnits.toLocaleString();
        document.getElementById('lowStockCount').textContent = lowStock;
        document.getElementById('categoriesCount').textContent = categories;

        filterInventory();
    } catch (error) {
        console.error('Error loading branch inventory:', error);
        showToast('error', 'Failed to load branch inventory');
    }
}

// Category tab selection
let activeCategoryTab = '';

function selectCategoryTab(category, btnEl) {
    activeCategoryTab = category;
    // Update active state
    document.querySelectorAll('.inv-cat-tab').forEach(t => t.classList.remove('active'));
    if (btnEl) btnEl.classList.add('active');
    // Sync dropdown if it exists
    const dropdown = document.getElementById('inventoryCategoryFilter');
    if (dropdown) dropdown.value = category;
    filterInventory();
}

// Filter inventory based on selected criteria
function filterInventory() {
    const categoryFilter = activeCategoryTab || document.getElementById('inventoryCategoryFilter')?.value || '';
    const supplierFilter = document.getElementById('inventorySupplierFilter')?.value || '';
    const productTypeFilter = document.getElementById('inventoryProductTypeFilter')?.value || '';
    const branchFilter = document.getElementById('inventoryBranchFilter')?.value || '';
    const searchFilter = document.getElementById('inventorySearchInput')?.value?.toLowerCase() || '';

    let filtered = allInventoryProducts.filter(product => {
        // Category filter
        if (categoryFilter && product.category !== categoryFilter) return false;

        // Supplier filter (Indoor/Greendoor)
        if (supplierFilter && product.supplier !== supplierFilter) return false;

        // Product type filter (pre-roll/pre-pack/loose)
        if (productTypeFilter && product.productType !== productTypeFilter) return false;

        // Search filter
        if (searchFilter) {
            const searchIn = (product.name + ' ' + (product.sku || '') + ' ' + (product.category || '') + ' ' + (product.supplier || '')).toLowerCase();
            if (!searchIn.includes(searchFilter)) return false;
        }

        return true;
    });

    // Update count
    const countEl = document.getElementById('inventoryCount');
    if (countEl) countEl.textContent = `${filtered.length} items`;

    // Render filtered products
    const tableBody = document.getElementById('inventoryTableBody');
    if (!tableBody) return;

    tableBody.innerHTML = filtered.map(product => {
        const stock = product.inventory?.quantity || 0;
        const unit = product.inventory?.unit || 'units';
        const supplierDisplay = product.supplier === 'greendoor' ? 'Greendoor' : product.supplier === 'indoor' ? 'Indoor' : (product.supplier || '-');
        const productTypeDisplay = product.productType === 'pre-roll' ? 'Pre Roll' : product.productType === 'pre-pack' ? 'Pre Pack' : product.productType === 'loose' ? 'Loose' : (product.productType || '-');
        const statusBadge = stock > 20
            ? '<span class="badge bg-success">In Stock</span>'
            : stock > 0
                ? '<span class="badge bg-warning">Low</span>'
                : '<span class="badge bg-danger">Out</span>';

        const price = product.price || 0;
        const priceDisplay = price > 0 ? `R${price.toFixed(2)}` : '-';
        const escapedName = (product.name || '').replace(/'/g, "\\'");

        return `
            <tr>
                <td>
                    <strong>${product.name}</strong>
                    <br><small class="text-muted">${product.sku || ''}</small>
                </td>
                <td>
                    <span class="badge bg-secondary">${product.category || '-'}</span>
                    <span class="badge ${product.supplier === 'indoor' ? 'bg-info' : product.supplier === 'greendoor' ? 'bg-success' : 'bg-light text-dark'}">${supplierDisplay}</span>
                    ${productTypeDisplay !== '-' ? `<span class="badge bg-warning text-dark">${productTypeDisplay}</span>` : ''}
                </td>
                <td style="text-align: right; font-weight: 600;">${priceDisplay}</td>
                <td style="text-align: center;"><strong>${stock}</strong> ${unit}</td>
                <td style="text-align: center;">${statusBadge}</td>
                <td style="text-align: right; white-space: nowrap;">
                    <button class="btn btn-sm btn-outline-info" onclick="openProductEditModal('${product._id}')" title="Edit product details">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="btn btn-sm btn-outline-primary ms-1" onclick="openStockUpdateModal('${product._id}', '${escapedName}', ${stock})" title="Update stock">
                        <i class="fas fa-boxes-stacked"></i>
                    </button>
                </td>
            </tr>
        `;
    }).join('') || '<tr><td colspan="6" class="text-center text-muted">No products match filters</td></tr>';
}

// Open stock update modal for a product
function openStockUpdateModal(productId, productName, currentStock) {
    // Remove existing modal if any
    document.getElementById('stockUpdateModal')?.remove();

    const modalHtml = `
        <div id="stockUpdateModal" style="display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1060;align-items:center;justify-content:center;">
            <div style="background:#fff;border-radius:12px;width:90%;max-width:450px;padding:0;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="background:var(--green);color:var(--cream);padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <h5 style="margin:0;font-family:'Barlow Condensed', sans-serif;font-size:1.2rem;"><i class="fas fa-pencil-alt"></i> Update Stock</h5>
                    <button onclick="document.getElementById('stockUpdateModal').remove()" style="background:none;border:none;color:var(--cream);font-size:1.3rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:20px;">
                    <p style="margin:0 0 4px;font-weight:600;color:var(--green-dark);">${productName}</p>
                    <p style="margin:0 0 16px;font-size:0.85rem;color:#888;">Current stock: <strong>${currentStock}</strong></p>
                    <div style="margin-bottom:16px;">
                        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.85rem;color:var(--green-dark);">New Quantity</label>
                        <input type="number" id="stockUpdateQty" value="${currentStock}" min="0" style="width:100%;padding:10px;border:2px solid #222222;border-radius:8px;font-size:16px;">
                    </div>
                    <div style="margin-bottom:16px;">
                        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.85rem;color:var(--green-dark);">Reason</label>
                        <select id="stockUpdateReason" style="width:100%;padding:10px;border:2px solid #222222;border-radius:8px;font-size:14px;">
                            <option value="manual_adjustment">Manual Adjustment</option>
                            <option value="stock_count">Stock Count</option>
                            <option value="received_delivery">Received Delivery</option>
                            <option value="damaged">Damaged / Write-off</option>
                            <option value="returned">Customer Return</option>
                        </select>
                    </div>
                    <button onclick="submitStockUpdate('${productId}')" style="width:100%;padding:12px;background:var(--green);color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
                        <i class="fas fa-save"></i> Update Stock
                    </button>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('stockUpdateQty').focus();
}

// Submit stock update to API
async function submitStockUpdate(productId) {
    const qty = parseInt(document.getElementById('stockUpdateQty').value);
    const reason = document.getElementById('stockUpdateReason').value;

    if (isNaN(qty) || qty < 0) {
        showToast('error', 'Please enter a valid quantity');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify({
                'inventory.quantity': qty,
                stockUpdateReason: reason
            })
        });

        if (!response.ok) throw new Error('Failed to update stock');

        showToast('success', 'Stock updated successfully');
        document.getElementById('stockUpdateModal').remove();
        // Reload from branch or master depending on current filter
        const branchFilter = document.getElementById('inventoryBranchFilter')?.value || '';
        branchFilter ? loadBranchInventory() : loadInventoryData();
    } catch (error) {
        console.error('Error updating stock:', error);
        showToast('error', 'Failed to update stock');
    }
}

// ==================== PRODUCT EDIT MODAL ====================

function openProductEditModal(productId) {
    const product = allInventoryProducts.find(p => p._id === productId);
    if (!product) { showToast('error', 'Product not found'); return; }

    document.getElementById('productEditModal')?.remove();

    const cats = ['flower','pre-rolls','concentrates','edibles','vapes','oils','lifestyle-cbd','accessories'];
    const catOptions = cats.map(c => `<option value="${c}" ${product.category === c ? 'selected' : ''}>${c}</option>`).join('');

    const modalHtml = `
        <div id="productEditModal" style="display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.6);z-index:1060;align-items:flex-start;justify-content:center;padding:2rem 1rem;overflow-y:auto;">
            <div style="background:#0E0E0E;border-radius:12px;width:95%;max-width:500px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.4);border:1px solid #222;">
                <div style="background:var(--green);color:white;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <h5 style="margin:0;font-family:'Barlow Condensed',sans-serif;font-size:1.2rem;"><i class="fas fa-edit"></i> Edit Product</h5>
                    <button onclick="document.getElementById('productEditModal').remove()" style="background:none;border:none;color:white;font-size:1.3rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:20px;">
                    <div style="margin-bottom:14px;">
                        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.85rem;color:var(--or-gold);">Product Name</label>
                        <input type="text" id="editProductName" value="${product.name || ''}" style="width:100%;padding:10px;border:2px solid #333;border-radius:8px;font-size:15px;background:#1A1A1A;color:#FAFAFA;">
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div>
                            <label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.85rem;color:var(--or-gold);">SKU</label>
                            <input type="text" id="editProductSku" value="${product.sku || ''}" style="width:100%;padding:10px;border:2px solid #333;border-radius:8px;font-size:14px;background:#1A1A1A;color:#FAFAFA;">
                        </div>
                        <div>
                            <label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.85rem;color:var(--or-gold);">Category</label>
                            <select id="editProductCategory" style="width:100%;padding:10px;border:2px solid #333;border-radius:8px;font-size:14px;background:#1A1A1A;color:#FAFAFA;">
                                ${catOptions}
                            </select>
                        </div>
                    </div>
                    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:14px;">
                        <div>
                            <label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.85rem;color:var(--or-gold);">Retail Price (R)</label>
                            <input type="number" id="editProductPrice" value="${product.price || 0}" min="0" step="0.01" style="width:100%;padding:10px;border:2px solid #333;border-radius:8px;font-size:15px;background:#1A1A1A;color:#FAFAFA;">
                        </div>
                        <div>
                            <label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.85rem;color:var(--or-gold);">Cost Price (R)</label>
                            <input type="number" id="editProductCostPrice" value="${product.costPrice || 0}" min="0" step="0.01" style="width:100%;padding:10px;border:2px solid #333;border-radius:8px;font-size:15px;background:#1A1A1A;color:#FAFAFA;">
                        </div>
                    </div>
                    <div style="margin-bottom:14px;">
                        <label style="display:block;margin-bottom:6px;font-weight:600;font-size:0.85rem;color:var(--or-gold);">Description</label>
                        <textarea id="editProductDesc" rows="3" style="width:100%;padding:10px;border:2px solid #333;border-radius:8px;font-size:14px;background:#1A1A1A;color:#FAFAFA;resize:vertical;">${product.description || ''}</textarea>
                    </div>
                    <div style="display:flex;gap:10px;">
                        <button onclick="saveProductEdit('${product._id}')" style="flex:1;padding:12px;background:var(--green);color:white;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;">
                            <i class="fas fa-save"></i> Save Changes
                        </button>
                        <button onclick="document.getElementById('productEditModal').remove()" style="padding:12px 20px;background:none;border:2px solid #444;color:#FAFAFA;border-radius:8px;font-size:14px;cursor:pointer;">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    document.getElementById('editProductName').focus();
}

async function saveProductEdit(productId) {
    const name = document.getElementById('editProductName').value.trim();
    const sku = document.getElementById('editProductSku').value.trim();
    const category = document.getElementById('editProductCategory').value;
    const price = parseFloat(document.getElementById('editProductPrice').value) || 0;
    const costPrice = parseFloat(document.getElementById('editProductCostPrice').value) || 0;
    const description = document.getElementById('editProductDesc').value.trim();

    if (!name) { showToast('error', 'Product name is required'); return; }

    try {
        const response = await fetch(`${API_URL}/products/${productId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': 'Bearer ' + getToken()
            },
            body: JSON.stringify({ name, sku, category, price, costPrice, description })
        });

        if (!response.ok) throw new Error('Failed to update product');

        showToast('success', 'Product updated successfully');
        document.getElementById('productEditModal').remove();
        const branchFilter = document.getElementById('inventoryBranchFilter')?.value || '';
        branchFilter ? loadBranchInventory() : loadInventoryData();
    } catch (error) {
        console.error('Error updating product:', error);
        showToast('error', 'Failed to update product');
    }
}

// Export inventory to CSV
function exportInventory() {
    const categoryFilter = document.getElementById('inventoryCategoryFilter')?.value || '';
    const supplierFilter = document.getElementById('inventorySupplierFilter')?.value || '';
    const productTypeFilter = document.getElementById('inventoryProductTypeFilter')?.value || '';

    let filtered = allInventoryProducts.filter(product => {
        if (categoryFilter && product.category !== categoryFilter) return false;
        if (supplierFilter && product.supplier !== supplierFilter) return false;
        if (productTypeFilter && product.productType !== productTypeFilter) return false;
        return true;
    });

    // Create CSV
    const headers = ['Name', 'SKU', 'Category', 'Supplier', 'Product Type', 'Stock', 'Unit', 'Price'];
    const rows = filtered.map(p => {
        return [
            p.name,
            p.sku || '',
            p.category || '',
            p.supplier === 'greendoor' ? 'Greendoor' : p.supplier === 'indoor' ? 'Indoor' : (p.supplier || ''),
            p.productType === 'pre-roll' ? 'Pre Roll' : p.productType === 'pre-pack' ? 'Pre Pack' : p.productType === 'loose' ? 'Loose' : (p.productType || ''),
            p.inventory?.quantity || 0,
            p.inventory?.unit || 'units',
            p.price || 0
        ];
    });

    const csv = [headers.join(','), ...rows.map(r => r.map(v => `"${v}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `origin-inventory-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    showToast('success', 'Inventory exported successfully');
}

// Load stock levels with low stock alerts
async function loadStockLevels() {
    try {
        const response = await fetch(`${API_URL}/products?limit=9999`, {
            headers: { 'Authorization': 'Bearer ' + getToken() }
        });

        if (!response.ok) throw new Error('Failed to load products');

        const data = await response.json();
        const products = data.products || [];

        // Get low stock threshold from settings
        const threshold = parseInt(document.getElementById('lowStockThreshold')?.value) || 10;

        // Separate products by stock level
        const lowStock = products.filter(p => {
            const qty = p.inventory?.quantity || 0;
            return qty > 0 && qty <= threshold;
        });
        const outOfStock = products.filter(p => (p.inventory?.quantity || 0) === 0);
        const inStock = products.filter(p => (p.inventory?.quantity || 0) > threshold);

        const grid = document.getElementById('stockLevelsGrid');
        grid.innerHTML = `
            <div class="col-md-4 mb-3">
                <div class="card border-danger">
                    <div class="card-header bg-danger text-white">
                        <i class="fas fa-exclamation-triangle"></i> Out of Stock (${outOfStock.length})
                    </div>
                    <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                        ${outOfStock.length === 0 ? '<p class="text-muted">No items out of stock</p>' :
                            outOfStock.map(p => `
                                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                                    <div>
                                        <strong>${p.name}</strong>
                                        <br><small class="text-muted">SKU: ${p.sku || 'N/A'}</small>
                                    </div>
                                    <span class="badge bg-danger">0 units</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card border-warning">
                    <div class="card-header bg-warning text-dark">
                        <i class="fas fa-exclamation-circle"></i> Low Stock (${lowStock.length})
                    </div>
                    <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                        ${lowStock.length === 0 ? '<p class="text-muted">No low stock items</p>' :
                            lowStock.map(p => `
                                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                                    <div>
                                        <strong>${p.name}</strong>
                                        <br><small class="text-muted">SKU: ${p.sku || 'N/A'}</small>
                                    </div>
                                    <span class="badge bg-warning text-dark">${p.inventory?.quantity || 0} units</span>
                                </div>
                            `).join('')
                        }
                    </div>
                </div>
            </div>
            <div class="col-md-4 mb-3">
                <div class="card border-success">
                    <div class="card-header bg-success text-white">
                        <i class="fas fa-check-circle"></i> In Stock (${inStock.length})
                    </div>
                    <div class="card-body" style="max-height: 300px; overflow-y: auto;">
                        ${inStock.length === 0 ? '<p class="text-muted">No items in stock</p>' :
                            inStock.slice(0, 10).map(p => `
                                <div class="d-flex justify-content-between align-items-center border-bottom py-2">
                                    <div>
                                        <strong>${p.name}</strong>
                                        <br><small class="text-muted">SKU: ${p.sku || 'N/A'}</small>
                                    </div>
                                    <span class="badge bg-success">${p.inventory?.quantity || 0} units</span>
                                </div>
                            `).join('') +
                            (inStock.length > 10 ? `<p class="text-muted text-center mt-2">+ ${inStock.length - 10} more items</p>` : '')
                        }
                    </div>
                </div>
            </div>
        `;

        // Show alert if there are low stock or out of stock items
        if (outOfStock.length > 0 || lowStock.length > 0) {
            showToast('warning', `Stock Alert: ${outOfStock.length} items out of stock, ${lowStock.length} items low stock`);
        }

    } catch (error) {
        console.error('Error loading stock levels:', error);
        document.getElementById('stockLevelsGrid').innerHTML = `
            <div class="col-12">
                <div class="alert alert-danger">
                    <i class="fas fa-exclamation-triangle"></i> Failed to load stock levels. Please try again.
                </div>
            </div>
        `;
    }
}

// NOTE: generateReport(type) is now in inv-reports.js

// ==================== SETTINGS (persisted to DB) ====================

// Load settings from API and populate inputs
async function loadSettings() {
    try {
        const data = await apiCall('/inventory-settings');
        const settings = data.settings || {};

        const lowStockEl = document.getElementById('lowStockThreshold');
        const reorderEl = document.getElementById('reorderPoint');
        if (lowStockEl && settings.lowStockThreshold != null) lowStockEl.value = settings.lowStockThreshold;
        if (reorderEl && settings.reorderPoint != null) reorderEl.value = settings.reorderPoint;

        // Notification checkboxes
        if (settings.notifications) {
            const checks = {
                'notifyLowStock': settings.notifications.lowStock,
                'notifyNewUploads': settings.notifications.newUploads,
                'notifyQAResults': settings.notifications.qaResults,
                'notifyPNDComplete': settings.notifications.pndComplete
            };
            Object.keys(checks).forEach(function(id) {
                const el = document.getElementById(id);
                if (el && checks[id] !== undefined) el.checked = checks[id];
            });
        }
    } catch (e) {
        console.error('Error loading settings:', e);
    }
}

// Save threshold settings to DB
async function saveThresholds() {
    const lowStock = parseInt(document.getElementById('lowStockThreshold')?.value) || 10;
    const reorder = parseInt(document.getElementById('reorderPoint')?.value) || 20;

    const payload = {
        lowStockThreshold: lowStock,
        reorderPoint: reorder,
        notifications: {
            lowStock: document.getElementById('notifyLowStock')?.checked !== false,
            newUploads: document.getElementById('notifyNewUploads')?.checked !== false,
            qaResults: document.getElementById('notifyQAResults')?.checked !== false,
            pndComplete: document.getElementById('notifyPNDComplete')?.checked !== false
        }
    };

    try {
        await apiCall('/inventory-settings', 'PUT', payload);
        showToast('success', `Settings saved — Low Stock: ${lowStock}, Reorder Point: ${reorder}`);

        // If stock levels section is visible, refresh it with new thresholds
        const stockSection = document.getElementById('stock-section');
        if (stockSection && stockSection.style.display !== 'none' && stockSection.classList.contains('active')) {
            loadStockLevels();
        }
    } catch (err) {
        console.error('Error saving settings:', err);
        showToast('error', 'Failed to save settings');
    }
}
