// st-receiving.js — Stock receiving module (embedded tab in stocktake-app)
// Depends on: config.js (API_URL), or-utils.js (showToast, getToken)
// Depends on: st-auth.js (currentUser)

let recvItems = [];
let recvAllProducts = [];
let recvCurrentBranch = null;

async function recvInit() {
    if (recvAllProducts.length === 0) {
        await recvLoadProducts();
    }
    recvCurrentBranch = currentUser?.branch || { _id: currentUser?.branchId || currentUser?.primaryBranch };
}

async function recvLoadProducts() {
    try {
        const response = await fetch(`${API_URL}/products?status=active&limit=500`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();
        if (data.success) {
            recvAllProducts = data.products || [];
        }
    } catch (error) {
        console.error('Error loading products:', error);
    }
}

function recvSearchProducts(query) {
    if (!query || query.length < 2) {
        document.getElementById('recvProductResults').innerHTML = '';
        return;
    }

    const q = query.toLowerCase();
    const matches = recvAllProducts.filter(p =>
        p.name.toLowerCase().includes(q) ||
        (p.sku && p.sku.toLowerCase().includes(q))
    ).slice(0, 10);

    const html = matches.map(p => `
        <div style="padding: 0.75rem; border-bottom: 1px solid var(--border); cursor: pointer; display: flex; justify-content: space-between; align-items: center;" onclick="recvAddProduct('${p._id}')">
            <div>
                <div style="font-weight: 500; color: var(--text-primary);">${p.name}</div>
                <div style="font-size: 0.75rem; color: var(--text-secondary);">${p.sku || 'No SKU'}</div>
            </div>
            <i class="fas fa-plus" style="color: var(--primary);"></i>
        </div>
    `).join('');

    document.getElementById('recvProductResults').innerHTML = html || '<p style="padding: 1rem; color: var(--text-secondary);">No products found</p>';
}

function recvAddProduct(productId) {
    const product = recvAllProducts.find(p => p._id === productId);
    if (!product) return;

    if (recvItems.find(i => i.productId === productId)) {
        showToast('Product already added', 'info');
        return;
    }

    recvItems.push({
        productId: product._id,
        name: product.name,
        sku: product.sku || '',
        receivedQty: null,
        lotId: ''
    });

    document.getElementById('recvProductSearch').value = '';
    document.getElementById('recvProductResults').innerHTML = '';
    recvRenderItems();
    showToast(`Added ${product.name}`, 'success');
}

function recvRenderItems() {
    const container = document.getElementById('recvItemsList');

    if (recvItems.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem 1rem; color: var(--text-secondary);">
                <i class="fas fa-box-open" style="font-size: 3rem; margin-bottom: 1rem; opacity: 0.5; display: block;"></i>
                <p>Search and add products above</p>
            </div>`;
        document.getElementById('recvItemCount').textContent = '0 items';
        document.getElementById('recvSubmitBtn').disabled = true;
        return;
    }

    container.innerHTML = recvItems.map((item, idx) => `
        <div style="padding: 1rem; border-bottom: 1px solid var(--border);">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                <div>
                    <div style="font-weight: 600; color: var(--text-primary);">${item.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary);">${item.sku}</div>
                </div>
                <button onclick="recvRemoveItem(${idx})" style="background: var(--danger); color: white; border: none; padding: 0.4rem 0.6rem; border-radius: 6px; cursor: pointer;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center; margin-bottom: 0.5rem;">
                <label style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">Lot/Batch:</label>
                <input type="text" value="${item.lotId || ''}"
                    onchange="recvUpdateLotId(${idx}, this.value)" placeholder="e.g. LOT-2026-0322"
                    style="flex: 1; padding: 0.6rem; background: var(--bg-input); border: 1px solid ${item.lotId ? 'var(--success)' : 'var(--warning)'}; border-radius: 8px; color: var(--text-primary); font-size: 0.9rem;">
                ${!item.lotId ? '<i class="fas fa-exclamation-triangle" style="color: var(--warning); font-size: 0.8rem;" title="Lot ID recommended for traceability"></i>' : '<i class="fas fa-check-circle" style="color: var(--success); font-size: 0.8rem;"></i>'}
            </div>
            <div style="display: flex; gap: 0.5rem; align-items: center;">
                <label style="font-size: 0.8rem; color: var(--text-secondary); white-space: nowrap;">Qty (g):</label>
                <input type="number" step="0.01" value="${item.receivedQty || ''}"
                    onchange="recvUpdateQty(${idx}, this.value)" placeholder="0.00"
                    style="flex: 1; padding: 0.75rem; background: var(--bg-input); border: 1px solid var(--border); border-radius: 8px; color: var(--text-primary); font-size: 1.1rem; font-weight: 600; text-align: center;">
            </div>
        </div>
    `).join('');

    document.getElementById('recvItemCount').textContent = `${recvItems.length} items`;
    const allFilled = recvItems.every(i => i.receivedQty !== null && i.receivedQty > 0);
    document.getElementById('recvSubmitBtn').disabled = !allFilled;
}

function recvUpdateLotId(index, value) {
    recvItems[index].lotId = value.trim();
    recvRenderItems();
}

function recvUpdateQty(index, value) {
    const qty = parseFloat(value);
    recvItems[index].receivedQty = isNaN(qty) ? null : qty;
    const allFilled = recvItems.every(i => i.receivedQty !== null && i.receivedQty > 0);
    document.getElementById('recvSubmitBtn').disabled = !allFilled;
}

function recvRemoveItem(index) {
    recvItems.splice(index, 1);
    recvRenderItems();
}

async function recvSubmitReceiving() {
    const branchId = recvCurrentBranch?._id || currentUser?.branchId || currentUser?.primaryBranch;
    if (!branchId) {
        showToast('No branch assigned', 'error');
        return;
    }

    const btn = document.getElementById('recvSubmitBtn');
    btn.disabled = true;
    btn.querySelector('span').textContent = 'Processing...';

    try {
        const response = await fetch(`${API_URL}/stock-transfers/quick-receive`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${getToken()}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                branchId,
                items: recvItems.map(item => ({
                    productId: item.productId,
                    quantity: item.receivedQty,
                    lotId: item.lotId || null
                })),
                notes: 'Quick add receiving'
            })
        });

        const data = await response.json();
        if (data.success) {
            showToast('Stock received! Inventory updated.', 'success');
            recvItems = [];
            recvRenderItems();
        } else {
            showToast(data.message || 'Error receiving stock', 'error');
        }
    } catch (error) {
        console.error('Submit error:', error);
        showToast('Error: ' + error.message, 'error');
    }

    btn.disabled = false;
    btn.querySelector('span').textContent = 'Complete';
}

function recvCancelReceiving() {
    recvItems = [];
    recvRenderItems();
    switchMode('stocktake');
}
