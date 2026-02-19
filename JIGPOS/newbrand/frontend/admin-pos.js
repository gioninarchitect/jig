// ===== ADMIN POS MODULE =====
// Point of Sale system: products, cart, checkout, payments, refunds, barcode scanner

        // Sale Complete Modal - Professional Black & White Design
        function showSaleCompleteModal(saleData) {
            const { saleNumber, saleId, total, paymentMethod, customerPhone } = saleData;

            const existing = document.getElementById('saleCompleteModal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'saleCompleteModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0, 0, 0, 0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 100000;
                animation: modalFadeIn 0.2s ease-out;
            `;

            modal.innerHTML = `
                <style>
                    @keyframes modalFadeIn {
                        from { opacity: 0; }
                        to { opacity: 1; }
                    }
                    @keyframes modalSlideIn {
                        from { transform: scale(0.95) translateY(-10px); opacity: 0; }
                        to { transform: scale(1) translateY(0); opacity: 1; }
                    }
                    @keyframes checkmarkPop {
                        0% { transform: scale(0); }
                        50% { transform: scale(1.2); }
                        100% { transform: scale(1); }
                    }
                    .sale-complete-box {
                        background: var(--cream);
                        border: 2px solid var(--gold);
                        border-radius: 20px;
                        padding: 40px;
                        max-width: 480px;
                        width: 90%;
                        text-align: center;
                        box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
                        animation: modalSlideIn 0.3s ease-out;
                    }
                    .sale-complete-icon {
                        width: 80px;
                        height: 80px;
                        background: var(--green);
                        border-radius: 50%;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        margin: 0 auto 24px auto;
                        animation: checkmarkPop 0.4s ease-out 0.2s both;
                    }
                    .sale-complete-icon i {
                        font-size: 40px;
                        color: var(--cream);
                    }
                    .sale-complete-title {
                        margin: 0 0 8px 0;
                        color: var(--green-deep);
                        font-size: 1.75rem;
                        font-weight: 700;
                    }
                    .sale-complete-subtitle {
                        margin: 0 0 32px 0;
                        color: var(--green-light);
                        font-size: 1rem;
                    }
                    .sale-complete-details {
                        background: white;
                        border: 1px solid var(--green);
                        border-radius: 12px;
                        padding: 20px;
                        margin-bottom: 32px;
                    }
                    .sale-detail-row {
                        display: flex;
                        justify-content: space-between;
                        padding: 8px 0;
                        border-bottom: 1px solid var(--cream);
                    }
                    .sale-detail-row:last-child {
                        border-bottom: none;
                        padding-top: 12px;
                        margin-top: 4px;
                        border-top: 2px solid var(--gold);
                    }
                    .sale-detail-label {
                        color: var(--green-light);
                        font-size: 0.9rem;
                    }
                    .sale-detail-value {
                        color: var(--green-deep);
                        font-weight: 600;
                        font-size: 0.95rem;
                    }
                    .sale-detail-row:last-child .sale-detail-value {
                        font-size: 1.25rem;
                        color: var(--gold-dark);
                    }
                    .sale-complete-actions {
                        display: grid;
                        grid-template-columns: 1fr 1fr;
                        gap: 12px;
                        margin-bottom: 20px;
                    }
                    .sale-action-btn {
                        padding: 14px 20px;
                        border: 2px solid var(--green);
                        border-radius: 10px;
                        background: var(--green-light);
                        color: var(--cream);
                        font-size: 0.9rem;
                        font-weight: 600;
                        cursor: pointer;
                        transition: all 0.15s ease;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 8px;
                    }
                    .sale-action-btn:hover {
                        background: var(--green);
                        border-color: var(--gold);
                    }
                    .sale-action-btn i {
                        font-size: 1.1rem;
                    }
                    .sale-done-btn {
                        width: 100%;
                        padding: 16px;
                        background: var(--gold);
                        color: var(--green-deep);
                        border: none;
                        border-radius: 10px;
                        font-size: 1rem;
                        font-weight: 700;
                        cursor: pointer;
                        transition: all 0.15s ease;
                    }
                    .sale-done-btn:hover {
                        background: var(--gold-dark);
                    }
                </style>
                <div class="sale-complete-box">
                    <div class="sale-complete-icon">
                        <i class="fas fa-check"></i>
                    </div>
                    <h2 class="sale-complete-title">Sale Complete</h2>
                    <p class="sale-complete-subtitle">Transaction processed successfully</p>

                    <div class="sale-complete-details">
                        <div class="sale-detail-row">
                            <span class="sale-detail-label">Sale Number</span>
                            <span class="sale-detail-value">${saleNumber}</span>
                        </div>
                        <div class="sale-detail-row">
                            <span class="sale-detail-label">Payment Method</span>
                            <span class="sale-detail-value">${paymentMethod}</span>
                        </div>
                        ${customerPhone ? `
                        <div class="sale-detail-row">
                            <span class="sale-detail-label">Customer</span>
                            <span class="sale-detail-value">${customerPhone}</span>
                        </div>
                        ` : ''}
                        <div class="sale-detail-row">
                            <span class="sale-detail-label">Total Amount</span>
                            <span class="sale-detail-value">R ${total.toFixed(2)}</span>
                        </div>
                    </div>

                    <div class="sale-complete-actions">
                        <button class="sale-action-btn" onclick="downloadInvoiceFromModal('${saleId}', '${saleNumber}')">
                            <i class="fas fa-download"></i> Download Invoice
                        </button>
                        <button class="sale-action-btn" onclick="emailInvoiceFromModal('${saleId}', '${saleNumber}', '${customerPhone || ''}')">
                            <i class="fas fa-envelope"></i> Email Invoice
                        </button>
                        <button class="sale-action-btn" onclick="printReceiptFromModal('${saleId}', '${saleNumber}')" style="opacity: 0.6;">
                            <i class="fas fa-print"></i> Print Receipt <span style="font-size: 0.7rem; color: #888;">(Soon)</span>
                        </button>
                        <button class="sale-action-btn" onclick="copyReceiptFromModal('${saleId}', '${saleNumber}')">
                            <i class="fas fa-copy"></i> Copy Receipt
                        </button>
                    </div>

                    <button class="sale-done-btn" onclick="closeSaleCompleteModal()">Done</button>
                </div>
            `;

            document.body.appendChild(modal);
        }

        function closeSaleCompleteModal() {
            const modal = document.getElementById('saleCompleteModal');
            if (modal) modal.remove();
        }

        function downloadInvoiceFromModal(saleId, saleNumber) {
            downloadInvoice(saleId, saleNumber);
            showAdminToast('Download Started', 'Invoice is being downloaded...', 'success');
        }

        async function emailInvoiceFromModal(saleId, saleNumber, customerPhone) {
            // Prompt for email if not available
            if (!customerPhone || !customerPhone.includes('@')) {
                showAdminPrompt(
                    'Email Invoice',
                    'Enter customer email address:',
                    async (email) => {
                        if (email && email.includes('@')) {
                            await sendInvoiceEmail(saleId, saleNumber, email);
                        } else {
                            showAdminToast('Invalid Email', 'Please enter a valid email address', 'error');
                        }
                    }
                );
            } else {
                await sendInvoiceEmail(saleId, saleNumber, customerPhone);
            }
        }

        async function sendInvoiceEmail(saleId, saleNumber, email) {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/pos/sale/${saleId}/email`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ email: email })
                });

                if (response.ok) {
                    showAdminToast('Email Sent', `Invoice sent to ${email}`, 'success');
                } else {
                    const error = await response.json();
                    showAdminToast('Email Failed', error.message || 'Could not send email', 'error');
                }
            } catch (error) {
                console.error('Email invoice error:', error);
                showAdminToast('Email Failed', 'Could not send invoice email', 'error');
            }
        }

        function printReceiptFromModal(saleId, saleNumber) {
            // Future Development - Thermal printer integration
            showAdminToast('Future Development', 'Thermal printer integration coming soon.\nUse Download Invoice for now.', 'info');
        }

        async function copyReceiptFromModal(saleId, saleNumber) {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/pos/sale/${saleId}/receipt-text`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });

                if (response.ok) {
                    const data = await response.json();
                    await navigator.clipboard.writeText(data.receiptText || `Sale: ${saleNumber}`);
                    showAdminToast('Copied', 'Receipt copied to clipboard', 'success');
                } else {
                    // Fallback - copy basic info
                    await navigator.clipboard.writeText(`Sale: ${saleNumber}`);
                    showAdminToast('Copied', 'Sale number copied to clipboard', 'success');
                }
            } catch (error) {
                // Fallback
                try {
                    await navigator.clipboard.writeText(`Sale: ${saleNumber}`);
                    showAdminToast('Copied', 'Sale number copied to clipboard', 'success');
                } catch (e) {
                    showAdminToast('Copy Failed', 'Could not copy to clipboard', 'error');
                }
            }
        }

        // ===== POINT OF SALE SYSTEM =====
        let posCart = [];
        let posProducts = [];
        let posFilteredProducts = [];
        let posCurrentCategory = 'all';

        async function loadPOSProducts() {
            try {
                // Using global API_URL
                const token = sessionStorage.getItem("adminToken") || localStorage.getItem("token");

                // Load products
                const productsResponse = await fetch(`${API_URL}/products`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!productsResponse.ok) throw new Error('Failed to load products');
                const productsData = await productsResponse.json();
                const products = productsData.products || productsData.data || productsData;

                // Load menu items (Morija Roastery, Thaba Cafe)
                let menuItems = [];
                try {
                    const menuResponse = await fetch(`${API_URL}/menu`, {
                        headers: { 'Authorization': `Bearer ${token}` }
                    });
                    if (menuResponse.ok) {
                        const menuData = await menuResponse.json();
                        const menuArray = menuData.items || menuData.data || menuData;
                        if (Array.isArray(menuArray)) {
                            menuItems = menuArray.map(item => ({
                                ...item,
                                _id: item._id,
                                name: item.name,
                                price: item.price,
                                category: item.venue === 'bean-and-bud' ? 'bean' : 'brewha',
                                inventory: { quantity: 999, trackQuantity: false },
                                isMenuItem: true
                            }));
                        }
                    }
                } catch (menuError) {
                    console.warn('Menu items not available:', menuError);
                }

                // Combine products and menu items
                posProducts = [...products, ...menuItems];
                posFilteredProducts = posProducts;
                displayPOSProducts();
            } catch (error) {
                console.error('Error loading POS products:', error);
                document.getElementById('posProductGrid').innerHTML = '<div style="text-align: center; padding: 40px; grid-column: 1 / -1; color: var(--green-light);">Failed to load products</div>';
            }
        }

        function displayPOSProducts() {
            const grid = document.getElementById('posProductGrid');

            if (posFilteredProducts.length === 0) {
                grid.innerHTML = '<div style="text-align: center; padding: 40px; grid-column: 1 / -1; color: var(--green-light);">No products found</div>';
                return;
            }

            grid.innerHTML = posFilteredProducts.map(product => {
                const imageUrl = product.images && product.images.length > 0 ? product.images[0].url : '/images/jig-logo-nobg.png';
                const isMedical = product.name.toLowerCase().includes('medical');
                const inStock = (product.inventory?.quantity || 0) > 0;
                const userRole = sessionStorage.getItem('userRole') || 'user';
                const isPatient = userRole === 'patient';
                const canPurchase = inStock && (!isMedical || isPatient);
                const showGrayedOut = isMedical && !isPatient;

                return `
                    <div onclick="${canPurchase ? `addToPOSCart('${product._id}')` : showGrayedOut ? `showAdminToast('Restricted', 'Section 21 Approval Required', 'warning')` : ''}"
                         style="background: ${showGrayedOut ? 'var(--cream)' : inStock ? 'white' : 'var(--cream)'}; border: 2px solid ${showGrayedOut ? 'var(--red)' : inStock ? 'var(--green)' : 'var(--green-light)'}; border-radius: 10px; padding: 10px; cursor: ${canPurchase ? 'pointer' : 'not-allowed'}; transition: all 0.2s; opacity: ${showGrayedOut || !inStock ? '0.4' : '1'};"
                         onmouseover="if(${canPurchase}) this.style.borderColor='var(--gold)'"
                         onmouseout="if(${canPurchase}) this.style.borderColor='var(--green)'">
                        <div style="width: 100%; height: 100px; background: rgba(124, 58, 237,0.05); border-radius: 6px; display: flex; align-items: center; justify-content: center; margin-bottom: 8px;">
                            <img src="${imageUrl}" style="max-width: 100%; max-height: 100%; object-fit: contain; ${showGrayedOut ? 'filter: grayscale(100%)' : ''}" onerror="this.src='/images/jig-logo-nobg.png'">
                        </div>
                        <div style="font-size: 0.9rem; font-weight: bold; margin-bottom: 4px; color: ${showGrayedOut ? 'var(--red)' : 'var(--green-deep)'}; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${product.name}">
                            ${product.name}
                        </div>
                        <div style="font-size: 1.1rem; font-weight: bold; color: var(--gold-dark); margin-bottom: 4px;">
                            R${product.price.toFixed(2)}
                        </div>
                        <div style="font-size: 0.75rem; color: ${showGrayedOut ? 'var(--red)' : inStock ? 'var(--green)' : 'var(--green-light)'};">
                            ${showGrayedOut ? 'Section 21 Required' : inStock ? `${product.inventory?.quantity || 0} in stock` : 'Out of stock'}
                        </div>
                    </div>
                `;
            }).join('');
        }

        function filterPOSByCategory(category) {
            posCurrentCategory = category;
            filterPOSProducts();
        }

        // Handle barcode scanning with Enter key
        function handlePOSSearch(event) {
            const searchInput = document.getElementById('posSearch');
            const searchTerm = searchInput.value.trim();

            // If Enter key pressed and search term exists
            if (event.key === 'Enter' && searchTerm) {
                // Try to find exact SKU match first
                const product = posProducts.find(p =>
                    (p.sku || '').toLowerCase() === searchTerm.toLowerCase()
                );

                if (product) {
                    // Exact SKU match - add to cart immediately
                    addToPOSCart(product._id);

                    // Visual feedback
                    searchInput.style.borderColor = 'var(--green)';
                    searchInput.value = '';

                    setTimeout(() => {
                        searchInput.style.borderColor = 'var(--green)';
                        searchInput.focus();
                    }, 300);
                } else {
                    // No exact match - show filtered results
                    searchInput.style.borderColor = 'var(--gold)';
                    setTimeout(() => {
                        searchInput.style.borderColor = 'var(--green)';
                    }, 300);
                }
            }

            // Always filter as user types
            filterPOSProducts();
        }

        // Open mobile camera for barcode/QR scanning
        function openBarcodeScanner() {
            const modal = document.getElementById('barcodeScannerModal');
            if (!modal) {
                // Create modal if it doesn't exist
                const modalHTML = `
                    <div id="barcodeScannerModal" class="modal" style="display: flex;">
                        <div class="modal-content" style="max-width: 600px; text-align: center;">
                            <button class="close-modal" onclick="closeBarcodeScanner()">&times;</button>
                            <h2 style="color: var(--green-deep); margin-bottom: 20px;"><i class="fas fa-camera"></i> Scan Barcode</h2>
                            <video id="barcodeScannerVideo" style="width: 100%; max-width: 500px; border-radius: 8px; background: var(--green-deep); margin-bottom: 15px;"></video>
                            <p style="color: var(--green-light); margin-bottom: 10px;">Point camera at product barcode or QR code</p>
                            <button onclick="closeBarcodeScanner()" class="action-btn reject-btn" style="width: 100%;">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            }

            // Start camera
            startBarcodeCamera();
        }

        async function startBarcodeCamera() {
            const video = document.getElementById('barcodeScannerVideo');
            const modal = document.getElementById('barcodeScannerModal');

            try {
                // Request camera access (rear camera preferred on mobile)
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { facingMode: 'environment' }
                });

                video.srcObject = stream;
                video.play();
                modal.style.display = 'flex';

                // Install barcode detection library if not already loaded
                if (typeof BarcodeDetector === 'undefined') {
                    // Fallback: Use HTML5 QR Code library
                    if (!window.Html5QrcodeScanner) {
                        const script = document.createElement('script');
                        script.src = 'https://unpkg.com/html5-qrcode';
                        document.head.appendChild(script);

                        script.onload = () => {
                            initQRScanner(video);
                        };
                    } else {
                        initQRScanner(video);
                    }
                } else {
                    // Use native Barcode Detection API
                    initNativeBarcodeScanner(video);
                }
            } catch (error) {
                console.error('Camera access error:', error);
                showAdminToast('Camera Access', 'Please grant camera permissions and try again', 'error');
                closeBarcodeScanner();
            }
        }

        function initNativeBarcodeScanner(video) {
            const barcodeDetector = new BarcodeDetector({ formats: ['ean_13', 'qr_code', 'code_128'] });

            const detectBarcode = async () => {
                if (video.readyState === video.HAVE_ENOUGH_DATA) {
                    try {
                        const barcodes = await barcodeDetector.detect(video);
                        if (barcodes.length > 0) {
                            const code = barcodes[0].rawValue;
                            handleScannedCode(code);
                            return;
                        }
                    } catch (error) {
                        console.error('Barcode detection error:', error);
                    }
                }

                // Continue scanning if modal still open
                if (document.getElementById('barcodeScannerModal').style.display === 'flex') {
                    requestAnimationFrame(detectBarcode);
                }
            };

            detectBarcode();
        }

        function initQRScanner(video) {
            // Simpler fallback: manual capture
            const captureBtn = document.createElement('button');
            captureBtn.textContent = 'Capture & Decode';
            captureBtn.className = 'action-btn approve-btn';
            captureBtn.style.width = '100%';
            captureBtn.style.marginTop = '10px';

            captureBtn.onclick = () => {
                const canvas = document.createElement('canvas');
                canvas.width = video.videoWidth;
                canvas.height = video.videoHeight;
                const ctx = canvas.getContext('2d');
                ctx.drawImage(video, 0, 0);

                // Here you would use a library like jsQR to decode
                showAdminToast('Barcode Scanner', 'Enter SKU manually for now', 'info');
                closeBarcodeScanner();
            };

            document.querySelector('#barcodeScannerModal .modal-content').appendChild(captureBtn);
        }

        function handleScannedCode(code) {
            // Try to find product by SKU
            const product = posProducts.find(p => (p.sku || '').toLowerCase() === code.toLowerCase());

            if (product) {
                addToPOSCart(product._id);
                closeBarcodeScanner();

                // Show success feedback
                const searchInput = document.getElementById('posSearch');
                searchInput.value = product.name;
                searchInput.style.borderColor = 'var(--green)';
                setTimeout(() => {
                    searchInput.value = '';
                    searchInput.style.borderColor = 'var(--green)';
                }, 1500);
            } else {
                showAdminToast('Not Found', `Product not found: ${code}`, 'error');
            }
        }

        function closeBarcodeScanner() {
            const video = document.getElementById('barcodeScannerVideo');
            const modal = document.getElementById('barcodeScannerModal');

            if (video && video.srcObject) {
                video.srcObject.getTracks().forEach(track => track.stop());
                video.srcObject = null;
            }

            if (modal) {
                modal.style.display = 'none';
            }
        }

        function filterPOSProducts() {
            const searchTerm = document.getElementById('posSearch').value.toLowerCase();
            const userRole = sessionStorage.getItem('userRole') || 'user';
            const canSeeMedical = ['admin', 'store_manager', 'branch_assistant', 'patient'].includes(userRole);

            posFilteredProducts = posProducts.filter(product => {
                const isMedical = product.name.toLowerCase().includes('medical');

                // Hide medical products from regular users
                if (isMedical && !canSeeMedical) {
                    return false;
                }

                const matchesSearch = product.name.toLowerCase().includes(searchTerm) ||
                                    (product.sku || '').toLowerCase().includes(searchTerm);

                let matchesCategory = posCurrentCategory === 'all';
                if (!matchesCategory) {
                    if (posCurrentCategory === 'bean') {
                        matchesCategory = product.category === 'bean-and-bud';
                    } else if (posCurrentCategory === 'brewha') {
                        matchesCategory = product.category === 'la-brewha';
                    } else {
                        matchesCategory = product.category.toLowerCase().includes(posCurrentCategory);
                    }
                }

                return matchesSearch && matchesCategory;
            });

            displayPOSProducts();
        }

        function addToPOSCart(productId) {
            const product = posProducts.find(p => p._id === productId);
            if (!product || (product.inventory?.quantity || 0) === 0) return;

            const existingItem = posCart.find(item => item.productId === productId);

            if (existingItem) {
                if (existingItem.quantity < (product.inventory?.quantity || 0)) {
                    existingItem.quantity++;
                } else {
                    showAdminToast('Stock Warning', `Only ${product.inventory?.quantity || 0} units available`, 'warning');
                    return;
                }
            } else {
                posCart.push({
                    productId: product._id,
                    name: product.name,
                    price: product.price,
                    quantity: 1,
                    maxStock: product.inventory?.quantity || 0
                });
            }

            updatePOSCart();
        }

        function updatePOSCart() {
            const cartContainer = document.getElementById('posCartItems');

            if (posCart.length === 0) {
                cartContainer.innerHTML = '<div style="text-align: center; padding: 40px; color: var(--green-light);">Cart is empty<br><small>Click products to add</small></div>';
                document.getElementById('posSubtotal').textContent = 'R0.00';
                document.getElementById('posDiscount').textContent = '-R0.00';
                document.getElementById('posTotal').textContent = 'R0.00';
                return;
            }

            cartContainer.innerHTML = posCart.map((item, index) => `
                <div style="background: white; border-radius: 6px; padding: 12px; margin-bottom: 10px; border: 1px solid var(--green);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
                        <div style="font-weight: bold; color: var(--green-deep); flex: 1;">${item.name}</div>
                        <button onclick="removePOSItem(${index})" style="background: var(--red); border: none; color: var(--cream); width: 24px; height: 24px; border-radius: 4px; cursor: pointer; font-size: 0.9rem;">\u00d7</button>
                    </div>
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div style="display: flex; align-items: center; gap: 8px; background: var(--cream); border: 1px solid var(--green); border-radius: 4px; padding: 4px;">
                            <button onclick="updatePOSQuantity(${index}, -1)" style="background: none; border: none; color: var(--green-deep); cursor: pointer; padding: 4px 8px; font-size: 1.1rem;">\u2212</button>
                            <span style="color: var(--green-deep); min-width: 30px; text-align: center; font-weight: bold;">${item.quantity}</span>
                            <button onclick="updatePOSQuantity(${index}, 1)" style="background: none; border: none; color: var(--green-deep); cursor: pointer; padding: 4px 8px; font-size: 1.1rem;">+</button>
                        </div>
                        <div style="font-weight: bold; color: var(--gold-dark);">R${(item.price * item.quantity).toFixed(2)}</div>
                    </div>
                </div>
            `).join('');

            calculatePOSTotal();
        }

        function updatePOSQuantity(index, change) {
            const item = posCart[index];
            const newQuantity = item.quantity + change;

            if (newQuantity <= 0) {
                removePOSItem(index);
            } else if (newQuantity <= item.maxStock) {
                item.quantity = newQuantity;
                updatePOSCart();
            } else {
                showAdminToast('Stock Warning', `Only ${item.maxStock} units available`, 'warning');
            }
        }

        function removePOSItem(index) {
            posCart.splice(index, 1);
            updatePOSCart();
        }

        function calculatePOSTotal() {
            const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            let discount = 0;

            // Apply discount if coupon is valid (would be validated server-side in production)
            const couponCode = document.getElementById('posCouponCode').value.toUpperCase();
            if (couponCode === 'STORE10') {
                discount = subtotal * 0.1;
            } else if (couponCode === 'STAFF20') {
                discount = subtotal * 0.2;
            }

            const total = subtotal - discount;

            document.getElementById('posSubtotal').textContent = `R${subtotal.toFixed(2)}`;
            document.getElementById('posDiscount').textContent = `-R${discount.toFixed(2)}`;
            document.getElementById('posTotal').textContent = `R${total.toFixed(2)}`;
        }

        function applyPOSCoupon() {
            calculatePOSTotal();
        }

        function clearPOSCart() {
            if (posCart.length === 0) return;

            showAdminConfirm(
                'Clear Cart',
                'Clear entire cart? This action cannot be undone.',
                () => {
                    posCart = [];
                    document.getElementById('posCouponCode').value = '';
                    document.getElementById('posCustomerPhone').value = '';
                    updatePOSCart();
                    showAdminToast('Cart Cleared', 'Cart has been cleared', 'success');
                }
            );
        }

        async function processPOSCheckout() {
            if (posCart.length === 0) {
                showAdminToast('Empty Cart', 'Cart is empty', 'warning');
                return;
            }

            const customerPhone = document.getElementById('posCustomerPhone').value;
            const couponCode = document.getElementById('posCouponCode').value;
            const subtotal = posCart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
            let discount = 0;

            if (couponCode.toUpperCase() === 'STORE10') discount = subtotal * 0.1;
            if (couponCode.toUpperCase() === 'STAFF20') discount = subtotal * 0.2;

            const total = subtotal - discount;

            // Show payment method selection modal
            showPaymentMethodModal(total, customerPhone, couponCode, discount, subtotal);
        }

        // Show payment method selection modal
        function showPaymentMethodModal(total, customerPhone, couponCode, discount, subtotal) {
            const modal = document.getElementById('paymentMethodModal');
            if (!modal) {
                // Create modal dynamically with JIG branding
                const modalHTML = `
                    <div id="paymentMethodModal" class="modal" style="display: flex;">
                        <div class="modal-content" style="max-width: 500px; background: #0A0A0A !important; border: 2px solid #D97706 !important;">
                            <button class="close-modal" onclick="closePaymentMethodModal()" style="color: #0A0A0A;">&times;</button>
                            <h2 style="color: #0A0A0A; margin-bottom: 10px; text-align: center;">
                                <i class="fas fa-credit-card"></i> Select Payment Method
                            </h2>
                            <p style="color: #7C3AED; font-size: 1.5rem; font-weight: bold; text-align: center; margin-bottom: 25px;">
                                Total: R<span id="paymentModalTotal">${total.toFixed(2)}</span>
                            </p>
                            <div id="paymentMethodButtons" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px;">
                                <button onclick="completeCheckoutWithMethod('cash')" class="action-btn"
                                        style="background: #7C3AED; color: #0A0A0A; padding: 25px; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; gap: 10px; border: 2px solid #6D28D9;">
                                    <i class="fas fa-money-bill-wave" style="font-size: 2rem;"></i>
                                    <span>Cash</span>
                                </button>
                                <button onclick="showCardReferenceInput()" class="action-btn"
                                        style="background: #A855F7; color: #0A0A0A; padding: 25px; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; gap: 10px; border: 2px solid #7C3AED;">
                                    <i class="fas fa-credit-card" style="font-size: 2rem;"></i>
                                    <span>Card (Speedpoint)</span>
                                </button>
                                <button onclick="completeCheckoutWithMethod('eft')" class="action-btn"
                                        style="background: #6D28D9; color: #0A0A0A; padding: 25px; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; gap: 10px; border: 2px solid #0A0A0A;">
                                    <i class="fas fa-exchange-alt" style="font-size: 2rem;"></i>
                                    <span>EFT</span>
                                </button>
                                <button onclick="completeCheckoutWithMethod('account')" class="action-btn"
                                        style="background: #D97706; color: #0A0A0A; padding: 25px; font-size: 1.1rem; display: flex; flex-direction: column; align-items: center; gap: 10px; border: 2px solid #B45309;">
                                    <i class="fas fa-user-tag" style="font-size: 2rem;"></i>
                                    <span>On Account</span>
                                </button>
                            </div>
                            <!-- Speedpoint Card Reference Input (hidden by default) -->
                            <div id="cardReferenceSection" style="display: none; margin-bottom: 20px;">
                                <div style="background: #A855F7; padding: 15px; border-radius: 8px; margin-bottom: 15px;">
                                    <p style="color: #0A0A0A; text-align: center; margin-bottom: 10px;">
                                        <i class="fas fa-credit-card"></i> Process card on Speedpoint machine
                                    </p>
                                    <p style="color: #D97706; text-align: center; font-size: 1.3rem; font-weight: bold;">
                                        R${total.toFixed(2)}
                                    </p>
                                </div>
                                <label style="display: block; color: #7C3AED; font-weight: bold; margin-bottom: 8px;">
                                    Speedpoint Reference Number *
                                </label>
                                <input type="text" id="cardReferenceNumber" placeholder="Enter reference from receipt..."
                                       style="width: 100%; padding: 15px; font-size: 1.1rem; border: 2px solid #7C3AED; border-radius: 8px; margin-bottom: 15px; text-transform: uppercase;">
                                <label style="display: block; color: #7C3AED; font-weight: bold; margin-bottom: 8px;">
                                    Notes (Optional)
                                </label>
                                <input type="text" id="cardPaymentNotes" placeholder="e.g., Customer name, card type..."
                                       style="width: 100%; padding: 12px; font-size: 1rem; border: 2px solid #7C3AED; border-radius: 8px; margin-bottom: 15px;">
                                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 10px;">
                                    <button onclick="hideCardReferenceInput()" class="action-btn"
                                            style="background: #0A0A0A; color: #0A0A0A; border: 2px solid #7C3AED; padding: 12px;">
                                        <i class="fas fa-arrow-left"></i> Back
                                    </button>
                                    <button onclick="completeCardPayment()" class="action-btn"
                                            style="background: #7C3AED; color: #0A0A0A; border: 2px solid #6D28D9; padding: 12px;">
                                        <i class="fas fa-check"></i> Complete Sale
                                    </button>
                                </div>
                            </div>
                            <button onclick="closePaymentMethodModal()" class="action-btn" style="width: 100%; background: #DC2626; color: #0A0A0A; border: 2px solid #B91C1C;">
                                <i class="fas fa-times"></i> Cancel
                            </button>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHTML);
            } else {
                // Update total if modal already exists
                document.getElementById('paymentModalTotal').textContent = total.toFixed(2);
                modal.style.display = 'flex';
            }

            // Store checkout data in temporary global variable for completion
            window.pendingCheckout = { total, customerPhone, couponCode, discount, subtotal };
        }

        // Close payment method modal
        function closePaymentMethodModal() {
            const modal = document.getElementById('paymentMethodModal');
            if (modal) {
                modal.style.display = 'none';
            }
            // Reset card reference section if exists
            hideCardReferenceInput();
            window.pendingCheckout = null;
        }

        // Show card reference input for Speedpoint
        function showCardReferenceInput() {
            const buttonsSection = document.getElementById('paymentMethodButtons');
            const cardSection = document.getElementById('cardReferenceSection');
            if (buttonsSection) buttonsSection.style.display = 'none';
            if (cardSection) cardSection.style.display = 'block';
            // Focus the input
            setTimeout(() => {
                const input = document.getElementById('cardReferenceNumber');
                if (input) input.focus();
            }, 100);
        }

        // Hide card reference input and show payment buttons
        function hideCardReferenceInput() {
            const buttonsSection = document.getElementById('paymentMethodButtons');
            const cardSection = document.getElementById('cardReferenceSection');
            if (buttonsSection) buttonsSection.style.display = 'grid';
            if (cardSection) cardSection.style.display = 'none';
            // Clear the inputs
            const refInput = document.getElementById('cardReferenceNumber');
            const notesInput = document.getElementById('cardPaymentNotes');
            if (refInput) refInput.value = '';
            if (notesInput) notesInput.value = '';
        }

        // Complete card payment with Speedpoint reference
        function completeCardPayment() {
            const referenceInput = document.getElementById('cardReferenceNumber');
            const notesInput = document.getElementById('cardPaymentNotes');
            const reference = referenceInput ? referenceInput.value.trim().toUpperCase() : '';
            const notes = notesInput ? notesInput.value.trim() : '';

            if (!reference) {
                showAdminToast('Reference Required', 'Please enter the Speedpoint reference number', 'error');
                referenceInput?.focus();
                return;
            }

            // Store the card reference and notes, then complete checkout
            window.pendingCheckout.cardReference = reference;
            window.pendingCheckout.paymentNotes = notes;
            completeCheckoutWithMethod('card');
        }

        // Complete checkout with selected payment method
        async function completeCheckoutWithMethod(method) {
            if (!window.pendingCheckout) return;

            const { total, customerPhone, couponCode, discount, subtotal } = window.pendingCheckout;

            // Close payment modal
            closePaymentMethodModal();

            try {
                const token = sessionStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

                // Prepare sale data for POS endpoint
                // Get branch from user session (uses primaryBranch from User model)
                const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
                const userBranchId = user.primaryBranch || user.branchId || sessionStorage.getItem('activeBranchId');

                // Determine track based on cart contents (medical if any Section 21 products)
                const hasMedicalProducts = posCart.some(item => item.requiresSection21 === true);

                if (!userBranchId) {
                    showAdminToast('Branch Required', 'No branch assigned to your account. Please contact admin.', 'error');
                    return;
                }

                const saleData = {
                    branchId: userBranchId,
                    track: hasMedicalProducts ? 'medical' : 'lifestyle',
                    items: posCart.map(item => ({
                        productId: item._id,
                        name: item.name,
                        sku: item.sku || '',
                        quantity: item.quantity,
                        unitPrice: item.price,
                        discount: 0
                    })),
                    orderType: 'walk-in',
                    customerInfo: {
                        phone: customerPhone || 'Walk-in'
                    },
                    paymentMethod: method,
                    // Card payment details (Speedpoint)
                    cardReference: window.pendingCheckout?.cardReference || null,
                    paymentNotes: window.pendingCheckout?.paymentNotes || null
                };

                const response = await fetch(`${API_URL}/pos/sale`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify(saleData)
                });

                if (!response.ok) {
                    const errorData = await response.json();
                    throw new Error(errorData.message || 'Failed to create sale');
                }

                const result = await response.json();
                const saleNumber = result.sale?.saleNumber || `POS${Date.now()}`;
                const saleId = result.sale?._id;

                // Clear cart and refresh
                posCart = [];
                document.getElementById('posCouponCode').value = '';
                document.getElementById('posCustomerPhone').value = '';
                updatePOSCart();
                loadPOSProducts();

                // Show Sale Complete Modal with options
                showSaleCompleteModal({
                    saleNumber: saleNumber,
                    saleId: saleId,
                    total: total,
                    paymentMethod: method.toUpperCase(),
                    customerPhone: customerPhone
                });

            } catch (error) {
                console.error('Checkout error:', error);
                showAdminToast('Error', 'Error processing sale. Please try again.', 'error');
            }
        }

        // Download invoice PDF
        async function downloadInvoice(orderId, orderNumber) {
            try {
                const token = sessionStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/pos/sale/${orderId}/invoice`, {
                    method: 'GET',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    throw new Error('Failed to generate invoice');
                }

                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${orderNumber}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                showAdminToast('Invoice Downloaded', `Invoice ${orderNumber} has been downloaded`, 'success');
            } catch (error) {
                console.error('Invoice download error:', error);
                showAdminToast('Invoice Error', 'Could not download invoice. Please try again.', 'error');
            }
        }

        // Show refund modal
        function showRefundModal() {
            const modal = document.getElementById('refundModal');
            if (!modal) {
                // Create modal dynamically
                const modalHTML = `
                    <div id="refundModal" class="modal" style="display: flex;">
                        <div class="modal-content" style="max-width: 600px;">
                            <button class="close-modal" onclick="closeRefundModal()">&times;</button>
                            <h2 style="color: var(--green-deep); margin-bottom: 20px;">
                                <i class="fas fa-undo"></i> Process Refund
                            </h2>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; color: var(--green-light); margin-bottom: 8px;">Sale Number or Invoice Number</label>
                                <input type="text" id="refundSaleNumber" placeholder="Enter sale number (e.g., SALE-2024-001)"
                                       style="width: 100%; padding: 12px; background: white; border: 2px solid var(--green); border-radius: 6px; color: var(--green-deep); font-size: 1rem;">
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; color: var(--green-light); margin-bottom: 8px;">Refund Reason *</label>
                                <select id="refundReason" style="width: 100%; padding: 12px; background: white; border: 2px solid var(--green); border-radius: 6px; color: var(--green-deep); font-size: 1rem;">
                                    <option value="">Select reason...</option>
                                    <option value="defective_product">Defective Product</option>
                                    <option value="wrong_item">Wrong Item Received</option>
                                    <option value="customer_request">Customer Request</option>
                                    <option value="pricing_error">Pricing Error</option>
                                    <option value="quality_issue">Quality Issue</option>
                                    <option value="other">Other</option>
                                </select>
                            </div>

                            <div id="otherReasonDiv" style="margin-bottom: 20px; display: none;">
                                <label style="display: block; color: var(--green-light); margin-bottom: 8px;">Specify Reason</label>
                                <textarea id="refundReasonOther" placeholder="Please specify the reason for refund"
                                          style="width: 100%; padding: 12px; background: white; border: 2px solid var(--green); border-radius: 6px; color: var(--green-deep); font-size: 1rem; min-height: 80px;"></textarea>
                            </div>

                            <div style="margin-bottom: 20px;">
                                <label style="display: block; color: var(--green-light); margin-bottom: 8px;">Refund Amount (leave blank for full refund)</label>
                                <input type="number" id="refundAmount" placeholder="R 0.00" step="0.01" min="0"
                                       style="width: 100%; padding: 12px; background: white; border: 2px solid var(--green); border-radius: 6px; color: var(--green-deep); font-size: 1rem;">
                            </div>

                            <div style="display: flex; gap: 10px;">
                                <button onclick="processRefund()" class="action-btn approve-btn" style="flex: 1; padding: 15px; font-size: 1.1rem;">
                                    <i class="fas fa-check"></i> Process Refund
                                </button>
                                <button onclick="closeRefundModal()" class="action-btn reject-btn" style="flex: 1; padding: 15px; font-size: 1.1rem;">
                                    <i class="fas fa-times"></i> Cancel
                                </button>
                            </div>
                        </div>
                    </div>
                `;
                document.body.insertAdjacentHTML('beforeend', modalHTML);

                // Add event listener for reason dropdown
                document.getElementById('refundReason').addEventListener('change', function() {
                    const otherDiv = document.getElementById('otherReasonDiv');
                    if (this.value === 'other') {
                        otherDiv.style.display = 'block';
                    } else {
                        otherDiv.style.display = 'none';
                    }
                });
            } else {
                modal.style.display = 'flex';
            }

            // Clear form
            document.getElementById('refundSaleNumber').value = '';
            document.getElementById('refundReason').value = '';
            document.getElementById('refundReasonOther').value = '';
            document.getElementById('refundAmount').value = '';
            document.getElementById('otherReasonDiv').style.display = 'none';
        }

        // Close refund modal
        function closeRefundModal() {
            const modal = document.getElementById('refundModal');
            if (modal) {
                modal.style.display = 'none';
            }
        }

        // Process refund
        async function processRefund() {
            const saleNumber = document.getElementById('refundSaleNumber').value.trim();
            let reason = document.getElementById('refundReason').value;
            const reasonOther = document.getElementById('refundReasonOther').value.trim();
            const refundAmount = parseFloat(document.getElementById('refundAmount').value) || null;

            // Validation
            if (!saleNumber) {
                showAdminToast('Validation Error', 'Please enter a sale number', 'error');
                return;
            }

            if (!reason) {
                showAdminToast('Validation Error', 'Please select a refund reason', 'error');
                return;
            }

            if (reason === 'other' && !reasonOther) {
                showAdminToast('Validation Error', 'Please specify the refund reason', 'error');
                return;
            }

            if (reason === 'other') {
                reason = reasonOther;
            }

            try {
                const token = sessionStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');

                // First, find the sale by sale number
                const searchResponse = await fetch(`${API_URL}/pos/sales?saleNumber=${saleNumber}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!searchResponse.ok) {
                    throw new Error('Sale not found');
                }

                const searchData = await searchResponse.json();
                const sale = searchData.sales?.[0];

                if (!sale) {
                    showAdminToast('Not Found', `Sale ${saleNumber} not found`, 'error');
                    return;
                }

                // Process refund
                const refundResponse = await fetch(`${API_URL}/pos/sale/${sale._id}/refund`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({
                        reason: reason,
                        refundAmount: refundAmount,
                        items: sale.items
                    })
                });

                if (!refundResponse.ok) {
                    const errorData = await refundResponse.json();
                    throw new Error(errorData.message || 'Failed to process refund');
                }

                const result = await refundResponse.json();

                showAdminToast(
                    'Refund Processed',
                    `Sale ${result.sale.saleNumber} has been refunded\nAmount: R ${result.sale.refundAmount.toFixed(2)}\nInventory restored`,
                    'success'
                );

                closeRefundModal();

                // Refresh POS products to update inventory
                loadPOSProducts();

            } catch (error) {
                console.error('Refund error:', error);
                showAdminToast('Refund Error', error.message || 'Failed to process refund. Please try again.', 'error');
            }
        }

        // Load POS products when POS tab is opened
        document.addEventListener('DOMContentLoaded', () => {
            const originalShowMainTab = window.showMainTab;
            window.showMainTab = function(tabName) {
                originalShowMainTab(tabName);
                if (tabName === 'pos' && posProducts.length === 0) {
                    loadPOSProducts();
                }
                if (tabName === 'vouchers') {
                    loadVouchers();
                }
            };
        });
