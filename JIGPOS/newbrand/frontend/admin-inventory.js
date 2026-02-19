// ===== ADMIN INVENTORY MODULE =====

        async function loadInventory() {
            const tbody = document.getElementById('inventoryTableBody');
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px;">Loading inventory...</td></tr>';

            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/products`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (response.ok) {
                    const data = await response.json();
                    displayInventory(data.products || []);
                } else {
                    tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--green-light);">Failed to load inventory</td></tr>';
                }
            } catch (error) {
                console.error('Load inventory error:', error);
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--green-light);">Network error loading inventory</td></tr>';
            }
        }

        function displayInventory(products) {
            const tbody = document.getElementById('inventoryTableBody');

            if (products.length === 0) {
                tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; padding: 40px; color: var(--green-light);">No products found. Add your first product to get started.</td></tr>';
                return;
            }

            let html = '';
            products.forEach((product, index) => {
                const stockQty = product.inventory?.quantity || 0;
                const stockStatus = stockQty <= 0 ? 'Out of Stock' :
                                  stockQty <= 10 ? 'Low Stock' : 'In Stock';
                const stockClass = stockQty <= 0 ? 'status-rejected' :
                                 stockQty <= 10 ? 'status-pending' : 'status-active';

                html += `
                    <tr>
                        <td>
                            <img src="${product.image || '/images/jig-logo-nobg.png'}"
                                 style="width: 50px; height: 50px; object-fit: cover; border-radius: 5px; border: 1px solid var(--green);"
                                 onerror="this.src='/images/jig-logo-nobg.png'">
                        </td>
                        <td>${product.name}</td>
                        <td>${product.sku || 'N/A'}</td>
                        <td>${product.category || 'Uncategorized'}</td>
                        <td>R${product.price.toFixed(2)}</td>
                        <td>${product.inventory?.quantity || 0 || 0} units</td>
                        <td><span class="status-badge ${stockClass}">${stockStatus}</span></td>
                        <td>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button class="action-btn view-btn" onclick="editProduct('${product._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-pen"></i> Edit</button>
                                <button class="action-btn reject-btn" onclick="deleteProduct('${product._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;"><i class="fas fa-trash"></i></button>
                            </div>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        }

        function filterInventory() {
            const searchTerm = document.getElementById('inventorySearch').value.toLowerCase();
            const statusFilter = document.getElementById('inventoryStatusFilter').value;
            const categoryFilter = document.getElementById('categoryCategoryFilter').value;

            const rows = document.querySelectorAll('#inventoryTable tbody tr');
            rows.forEach(row => {
                if (row.cells.length < 8) return; // Skip empty/loading rows

                const name = row.cells[1].textContent.toLowerCase();
                const sku = row.cells[2].textContent.toLowerCase();
                const category = row.cells[3].textContent.toLowerCase();
                const stock = parseInt(row.cells[5].textContent);

                const matchesSearch = name.includes(searchTerm) || sku.includes(searchTerm) || category.includes(searchTerm);

                let matchesStatus = true;
                if (statusFilter === 'inStock') matchesStatus = stock > 10;
                if (statusFilter === 'lowStock') matchesStatus = stock > 0 && stock <= 10;
                if (statusFilter === 'outOfStock') matchesStatus = stock <= 0;

                const matchesCategory = categoryFilter === 'all' || category.includes(categoryFilter);

                row.style.display = (matchesSearch && matchesStatus && matchesCategory) ? '' : 'none';
            });
        }

        function openAddProductModal() {
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.id = 'productModal';
            modal.style.display = 'flex';
            modal.innerHTML = `
                <div class="modal-content" style="max-width: 800px;">
                    <button class="close-modal" onclick="closeProductModal()">×</button>
                    <h2 style="margin-bottom: 30px; color: var(--green-deep);">Add New Product</h2>

                    <form id="productForm" onsubmit="saveProduct(event)">
                        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Product Name *</label>
                                <input type="text" name="name" required style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--green-light);">SKU</label>
                                <input type="text" name="sku" style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Description</label>
                            <textarea name="description" rows="3" style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);"></textarea>
                        </div>

                        <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Category *</label>
                                <select name="category" required style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                                    <option value="">Select Category</option>
                                    <option value="lifestyle-cbd">JIG Wellness</option>
                                    <option value="flower">Flower (Medical)</option>
                                    <option value="oils">Oils</option>
                                    <option value="edibles">Edibles</option>
                                    <option value="accessories">Accessories</option>
                                    <option value="coffee">Coffee</option>
                                    <option value="vaporizers">Vaporizers</option>
                                </select>
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Price (R) *</label>
                                <input type="number" name="price" step="0.01" min="0" required style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                            </div>
                            <div>
                                <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Stock Quantity *</label>
                                <input type="number" name="stock" min="0" required style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                            </div>
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Image URL</label>
                            <input type="url" name="image" placeholder="https://example.com/image.jpg" style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                        </div>

                        <div style="margin-bottom: 20px;">
                            <label style="display: flex; align-items: center; color: var(--green-light); cursor: pointer;">
                                <input type="checkbox" name="featured" style="margin-right: 10px;">
                                Featured Product
                            </label>
                        </div>

                        <div style="display: flex; gap: 10px; justify-content: flex-end;">
                            <button type="button" class="action-btn reject-btn" onclick="closeProductModal()">Cancel</button>
                            <button type="submit" class="action-btn approve-btn">Add Product</button>
                        </div>
                    </form>
                </div>
            `;
            document.body.appendChild(modal);
        }

        function closeProductModal() {
            const modal = document.getElementById('productModal');
            if (modal) modal.remove();
        }

        async function saveProduct(event) {
            event.preventDefault();
            const formData = new FormData(event.target);
            const productData = {
                name: formData.get('name'),
                sku: formData.get('sku'),
                description: formData.get('description'),
                category: formData.get('category'),
                price: parseFloat(formData.get('price')),
                stock: parseInt(formData.get('stock')),
                image: formData.get('image') || '/images/jig-logo-nobg.png',
                featured: formData.get('featured') === 'on'
            };

            try {
                const response = await fetch(`${API_URL}/products`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify(productData)
                });

                if (response.ok) {
                    showAdminToast('Success', 'Product added successfully!', 'success');
                    closeProductModal();
                    loadInventory();
                } else {
                    const error = await response.json();
                    showAdminToast('Error', `Failed to add product: ${error.message || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('Save product error:', error);
                showAdminToast('Network Error', 'Please try again', 'error');
            }
        }

        async function editProduct(productId) {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`/api/v1/products/${productId}`, {
                    headers: token ? { 'Authorization': `Bearer ${token}` } : {}
                });
                if (!response.ok) {
                    showAdminToast('Error', 'Failed to load product details', 'error');
                    return;
                }

                const data = await response.json();
                const product = data.product;

                const modal = document.createElement('div');
                modal.className = 'modal';
                modal.id = 'productModal';
                modal.style.display = 'flex';
                modal.innerHTML = `
                    <div class="modal-content" style="max-width: 800px;">
                        <button class="close-modal" onclick="closeProductModal()">×</button>
                        <h2 style="margin-bottom: 30px; color: var(--green-deep);">Edit Product</h2>

                        <form id="productForm" onsubmit="updateProduct(event, '${productId}')">
                            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Product Name *</label>
                                    <input type="text" name="name" value="${product.name}" required style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; color: var(--green-light);">SKU</label>
                                    <input type="text" name="sku" value="${product.sku || ''}" style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                                </div>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Description</label>
                                <textarea name="description" rows="3" style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">${product.description || ''}</textarea>
                            </div>

                            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                                <div>
                                    <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Category *</label>
                                    <select name="category" required style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                                        <option value="lifestyle-cbd" ${product.category === 'lifestyle-cbd' ? 'selected' : ''}>JIG Wellness</option>
                                        <option value="flower" ${product.category === 'flower' ? 'selected' : ''}>Flower (Medical)</option>
                                        <option value="oils" ${product.category === 'oils' ? 'selected' : ''}>Oils</option>
                                        <option value="edibles" ${product.category === 'edibles' ? 'selected' : ''}>Edibles</option>
                                        <option value="accessories" ${product.category === 'accessories' ? 'selected' : ''}>Accessories</option>
                                        <option value="coffee" ${product.category === 'coffee' ? 'selected' : ''}>Coffee</option>
                                        <option value="vaporizers" ${product.category === 'vaporizers' ? 'selected' : ''}>Vaporizers</option>
                                    </select>
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Price (R) *</label>
                                    <input type="number" name="price" value="${product.price}" step="0.01" min="0" required style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                                </div>
                                <div>
                                    <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Stock Quantity *</label>
                                    <input type="number" name="stock" value="${product.inventory?.quantity || 0}" min="0" required style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                                </div>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; margin-bottom: 5px; color: var(--green-light);">Image URL</label>
                                <input type="url" name="image" value="${product.image || ''}" style="width: 100%; padding: 10px; background: white; border: 1px solid var(--green); border-radius: 5px; color: var(--green-deep);">
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: flex; align-items: center; color: var(--green-light); cursor: pointer;">
                                    <input type="checkbox" name="featured" ${product.featured ? 'checked' : ''} style="margin-right: 10px;">
                                    Featured Product
                                </label>
                            </div>

                            <div style="display: flex; gap: 10px; justify-content: flex-end;">
                                <button type="button" class="action-btn reject-btn" onclick="closeProductModal()">Cancel</button>
                                <button type="submit" class="action-btn approve-btn">Update Product</button>
                            </div>
                        </form>
                    </div>
                `;
                document.body.appendChild(modal);
            } catch (error) {
                console.error('Edit product error:', error);
                showAdminToast('Error', 'Failed to load product details', 'error');
            }
        }

        async function updateProduct(event, productId) {
            event.preventDefault();
            const formData = new FormData(event.target);
            const productData = {
                name: formData.get('name'),
                sku: formData.get('sku'),
                description: formData.get('description'),
                category: formData.get('category'),
                price: parseFloat(formData.get('price')),
                stock: parseInt(formData.get('stock')),
                image: formData.get('image'),
                featured: formData.get('featured') === 'on'
            };

            try {
                const response = await fetch(`/api/v1/products/${productId}`, {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${sessionStorage.getItem('adminToken')}`
                    },
                    body: JSON.stringify(productData)
                });

                if (response.ok) {
                    showAdminToast('Notification', 'Product updated successfully!', 'success');
                    closeProductModal();
                    loadInventory();
                } else {
                    const error = await response.json();
                    showAdminToast("Error", `Failed to update product: ${error.message || 'Unknown error'}`, 'error');
                }
            } catch (error) {
                console.error('Update product error:', error);
                showAdminToast('Notification', 'Network error. Please try again.', 'error');
            }
        }

        async function deleteProduct(productId) {
            showAdminConfirm(
                'Delete Product',
                'Are you sure you want to delete this product? This action cannot be undone.',
                async () => {
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`/api/v1/products/${productId}`, {
                            method: 'DELETE',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            }
                        });

                        if (response.ok) {
                            showAdminToast('Success', 'Product deleted successfully!', 'success');
                            loadInventory();
                        } else {
                            const error = await response.json();
                            showAdminToast('Error', `Failed to delete product: ${error.message || 'Unknown error'}`, 'error');
                        }
                    } catch (error) {
                        console.error('Delete product error:', error);
                        showAdminToast('Network Error', 'Please try again', 'error');
                    }
                }
            );
        }

        // ===== PRODUCT CSV BULK UPLOAD =====
        function downloadCSVTemplate() {
            window.open('/api/v1/products/template', '_blank');
        }

        async function handleCSVUpload(event) {
            const file = event.target.files[0];
            if (!file) return;

            showAdminConfirm(
                'Upload CSV',
                `Upload ${file.name}? This will import products from the CSV file. Duplicate SKUs will be skipped.`,
                async () => {
                    const formData = new FormData();
                    formData.append('csvFile', file);

                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/products/bulk-upload`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `Bearer ${token}`
                            },
                            body: formData
                        });

                        const data = await response.json();

                        if (data.success) {
                            let message = `Bulk upload completed! Imported: ${data.imported} products.`;
                            if (data.duplicates > 0) {
                                message += ` Skipped (duplicates): ${data.duplicates}.`;
                            }
                            if (data.errors > 0) {
                                message += ` Errors: ${data.errors}.`;
                            }
                            showAdminToast('Success', message, 'success');
                            loadInventory(); // Reload the inventory table
                        } else {
                            showAdminToast('Upload Failed', data.message, 'error');
                        }
                    } catch (error) {
                        console.error('CSV upload error:', error);
                        showAdminToast('Upload Failed', 'Error uploading CSV file', 'error');
                    }
                }
            );

            // Reset file input
            event.target.value = '';
        }

        async function exportProducts() {
            try {
                const token = sessionStorage.getItem('adminToken');
                window.open(`/api/v1/products/export?token=${token}`, '_blank');
            } catch (error) {
                console.error('Export error:', error);
                showAdminToast('Export Failed', 'Error exporting products', 'error');
            }
        }
