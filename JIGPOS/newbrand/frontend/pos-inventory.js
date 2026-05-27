// ===== POS INVENTORY MODULE =====
// Quick stock management from POS terminal

// ===== INVENTORY MANAGEMENT =====
function showInventoryModal() {
    document.getElementById('inventoryModal').classList.add('active');
    populateProductSelect();
}

function closeInventoryModal() {
    document.getElementById('inventoryModal').classList.remove('active');
}

function populateProductSelect() {
    const select = document.getElementById('stockProductSelect');
    select.innerHTML = '<option value="">Select Product...</option>';
    allProducts.forEach(p => {
        const stock = p.inventory?.quantity || 0;
        select.innerHTML += `<option value="${p._id}">${p.name} (Current: ${stock})</option>`;
    });
}

async function updateStock() {
    const productId = document.getElementById('stockProductSelect').value;
    const quantity = parseInt(document.getElementById('stockQuantity').value);

    if (!productId || !quantity || quantity < 1) {
        showToast('Error', 'Please select a product and enter quantity', 'error');
        return;
    }

    try {
        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/products/${productId}/stock`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ quantity, action: 'add' })
        });

        const data = await res.json();
        if (data.success) {
            showToast('Stock Updated', `Added ${quantity} units successfully`, 'success');
            document.getElementById('stockQuantity').value = '';
            loadProducts(); // Refresh products
            populateProductSelect();
        } else {
            showToast('Error', data.message || 'Failed to update stock', 'error');
        }
    } catch (err) {
        console.error('Stock update error:', err);
        showToast('Error', 'Failed to update stock', 'error');
    }
}

async function addNewProduct() {
    const name = document.getElementById('newProductName').value.trim();
    const price = parseFloat(document.getElementById('newProductPrice').value);
    const quantity = parseInt(document.getElementById('newProductQty').value);
    const subcategory = document.getElementById('newProductSubcat').value;

    if (!name || !price || !quantity) {
        showToast('Error', 'Please fill in all fields', 'error');
        return;
    }

    // Generate SKU from name
    const sku = 'Origin-' + name.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 10) + '-' + Date.now().toString().slice(-4);

    const productData = {
        name,
        sku,
        price,
        category: subcategory.includes('accessories') ? 'accessories' : 'flower',
        subcategory,
        track: 'lifestyle',
        inventory: { quantity, lowStockThreshold: 10, trackQuantity: true },
        status: 'active',
        isPublished: true
    };

    try {
        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
        const res = await fetch(`${API_URL}/products`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(productData)
        });

        const data = await res.json();
        if (data.success) {
            showToast('Product Added', `${name} added successfully`, 'success');
            document.getElementById('newProductName').value = '';
            document.getElementById('newProductPrice').value = '';
            document.getElementById('newProductQty').value = '';
            loadProducts(); // Refresh products
            closeInventoryModal();
        } else {
            showToast('Error', data.message || 'Failed to add product', 'error');
        }
    } catch (err) {
        console.error('Add product error:', err);
        showToast('Error', 'Failed to add product', 'error');
    }
}
