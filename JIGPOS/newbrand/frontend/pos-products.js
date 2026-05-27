// ===== POS PRODUCTS MODULE =====
// Product loading, display, categories, filtering, quick-add functions

// Track Selection
function selectTrack(track) {
    currentTrack = track;
    document.querySelectorAll('.track-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.track === track);
    });

    // Show/hide Section 21 verification panel for medical track
    const section21Panel = document.getElementById('section21VerificationPanel');
    if (section21Panel) {
        section21Panel.style.display = track === 'medical' ? 'block' : 'none';
    }

    loadProducts();
}

// Open Medical Services Portal (White-Label)
function openMedicalServicesPortal() {
    const iframeContainer = document.getElementById('medicalServicesIframeContainer');
    const placeholder = document.getElementById('medicalServicesPlaceholder');
    const iframe = document.getElementById('medicalServicesIframe');

    // Configuration: Set MEDICAL_PORTAL_URL when provider is ready
    const MEDICAL_PORTAL_URL = window.MEDICAL_PORTAL_URL || null;

    if (MEDICAL_PORTAL_URL) {
        placeholder.style.display = 'none';
        iframe.src = MEDICAL_PORTAL_URL;
        iframe.style.display = 'block';
    } else {
        showToast('Coming Soon', 'Medical services portal integration pending', 'info');
    }
}

// Load Products
async function loadProducts() {
    const grid = document.getElementById('productGrid');
    grid.innerHTML = '<div class="loading active"><div class="spinner"></div><p>Loading products...</p></div>';

    try {
        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
        const headers = token ? { 'Authorization': `Bearer ${token}` } : {};

        // Load both products and menu items (branch-filtered stock)
        const branchId = typeof getSelectedBranchId === 'function' ? getSelectedBranchId() : '';
        const branchParam = branchId ? `?branchId=${branchId}&limit=500` : '?limit=500';
        const [productsRes, menuRes] = await Promise.all([
            fetch(`${API_URL}/products${branchParam}`, { headers }),
            fetch(`${API_URL}/menu`, { headers })
        ]);

        const productsData = await productsRes.json();
        const menuData = await menuRes.json();

        // Combine products and menu items
        let products = productsData.success ? productsData.products : [];
        const menuItems = menuData.success ? menuData.menuItems.map(item => ({
            ...item,
            _id: item._id,
            name: item.name,
            price: item.price,
            category: item.venue === 'la-brewha' ? 'la-brewha' : 'bean-bud',
            image: item.image || '/images/menu/default.jpg',
            isMenuItem: true,
            track: 'lifestyle',
            quantity: 999 // Menu items don't track stock
        })) : [];

        // Filter by track (lifestyle or medical)
        // Products with track='both' show in both tracks
        products = products.filter(p => {
            const productTrack = p.track || 'lifestyle';
            return productTrack === currentTrack || productTrack === 'both';
        });

        // Hide zero-stock products when branch-filtered
        if (branchId) {
            products = products.filter(p => {
                const qty = p.inventory?.quantity || 0;
                return qty > 0;
            });
        }

        allProducts = [...products, ...menuItems];
        displayProducts(allProducts);
        loadCategories();

        if (allProducts.length === 0) {
            grid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No products found for ' + currentTrack + ' track</p>';
        }
    } catch (error) {
        console.error('Load products error:', error);
        grid.innerHTML = '<p style="text-align: center; color: #F44336; padding: 40px;">Error loading products</p>';
    }
}

// Category hierarchy state
let selectedMainCategory = 'all';
let selectedGrowMethod = null;
let selectedProductType = null;

function loadCategories() {
    // Categories are now static in HTML - just reset state
    selectedMainCategory = 'all';
    selectedGrowMethod = null;
    selectedProductType = null;
}

function selectMainCategory(category) {
    selectedMainCategory = category;
    selectedGrowMethod = null;
    selectedProductType = null;

    // Update active state on main row
    document.querySelectorAll('#mainCategoryRow .category-tab').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.cat === category);
    });

    // Show/hide grow method row
    const growMethodRow = document.getElementById('growMethodRow');
    const productTypeRow = document.getElementById('productTypeRow');

    if (category === 'flower') {
        growMethodRow.style.display = 'flex';
        document.querySelectorAll('#growMethodRow .cat-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('#productTypeRow .cat-btn').forEach(btn => btn.classList.remove('active'));
    } else {
        growMethodRow.style.display = 'none';
    }
    productTypeRow.style.display = 'none';

    applyFilters();
}

function selectGrowMethod(method) {
    selectedGrowMethod = method || null;
    selectedProductType = null;

    document.querySelectorAll('#growMethodRow .cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.grow === method);
    });

    const productTypeRow = document.getElementById('productTypeRow');
    productTypeRow.style.display = 'flex';
    document.querySelectorAll('#productTypeRow .cat-btn').forEach(btn => btn.classList.remove('active'));

    applyFilters();
}

function selectProductType(type) {
    selectedProductType = type || null;

    document.querySelectorAll('#productTypeRow .cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    applyFilters();
}

function applyFilters() {
    let filtered = [...allProducts];

    // Main category filter
    if (selectedMainCategory !== 'all') {
        if (selectedMainCategory === 'flower') {
            filtered = filtered.filter(p => p.category === 'flower');
        } else if (selectedMainCategory === 'cbd') {
            filtered = filtered.filter(p => p.category === 'lifestyle-cbd' || p.category === 'cbd');
        } else {
            filtered = filtered.filter(p => p.category === selectedMainCategory);
        }
    }

    // Grow method filter (Indoor/Greendoor)
    if (selectedGrowMethod) {
        filtered = filtered.filter(p => {
            const tags = p.tags || [];
            const name = (p.name || '').toLowerCase();
            if (selectedGrowMethod === 'indoor') {
                return tags.includes('indoor') || name.includes('i.d') || name.includes('indoor');
            } else if (selectedGrowMethod === 'greendoor') {
                return tags.includes('greendoor') || name.includes('g.d') || name.includes('greendoor');
            }
            return true;
        });
    }

    // Product type filter (Pre Rolls/Pre Packs/Loose)
    if (selectedProductType) {
        filtered = filtered.filter(p => {
            const tags = p.tags || [];
            const name = (p.name || '').toLowerCase();
            if (selectedProductType === 'pre-roll') {
                return tags.includes('pre-roll') || name.includes('pre roll') || name.includes('preroll') || name.includes('joint');
            } else if (selectedProductType === 'pre-pack') {
                return tags.includes('pre-pack') || name.includes('5g') || name.includes('pre pack') || name.includes('prepack');
            } else if (selectedProductType === 'loose') {
                return tags.includes('loose') || name.includes('1g') || name.includes('loose') || (!name.includes('5g') && !name.includes('pre'));
            }
            return true;
        });
    }

    displayProducts(filtered);
}

function displayProducts(products) {
    const grid = document.getElementById('productGrid');

    // Filter out products with no stock - they shouldn't show in POS
    const inStockProducts = products.filter(p => {
        const stock = p.inventory?.quantity || p.quantity || 0;
        return stock > 0;
    });

    if (inStockProducts.length === 0) {
        grid.innerHTML = '<p style="text-align: center; color: #999; padding: 40px;">No products in stock</p>';
        return;
    }

    grid.innerHTML = inStockProducts.map(product => {
        const stock = product.inventory?.quantity || 0;
        const stockClass = stock > 10 ? 'stock-in' : 'stock-low';
        const stockText = stock <= 10 ? 'LOW' : '';

        return `
            <div class="product-card" data-category="${product.category}" onclick='addToCart(${JSON.stringify(product)})'>
                ${stockText ? `<span class="stock-badge ${stockClass}">${stockText}</span>` : ''}
                <div class="product-icon">${getProductIcon(product.category)}</div>
                <div class="product-name">${product.name}</div>
                <div class="product-sku">SKU: ${product.sku || '—'}${product.barcode ? ` | ${product.barcode}` : ''}</div>
                <div class="product-price">R${product.price.toFixed(0)}</div>
                <div class="product-stock">${stock.toFixed(1)}</div>
            </div>
        `;
    }).join('');
}

function getProductIcon(category) {
    const icons = {
        'flower': '<i class="fas fa-cannabis"></i>',
        'pre-rolls': '<i class="fas fa-joint"></i>',
        'edibles': '<i class="fas fa-cookie-bite"></i>',
        'concentrates': '<i class="fas fa-eye-dropper"></i>',
        'topicals': '<i class="fas fa-pump-medical"></i>',
        'accessories': '<i class="fas fa-cannabis"></i>',
        'glassware': '<i class="fas fa-wine-glass"></i>',
        'vaporizers': '<i class="fas fa-smoking"></i>',
        'lifestyle-cbd': '<i class="fas fa-leaf"></i>',
        'coffee': '<i class="fas fa-coffee"></i>',
        'merchandise': '<i class="fas fa-tshirt"></i>',
        'bundles': '<i class="fas fa-gift"></i>',
        'la-brewha': '<i class="fas fa-mug-hot"></i>',
        'bean-bud': '<i class="fas fa-seedling"></i>'
    };
    return icons[category] || '<i class="fas fa-cannabis"></i>';
}

function searchProducts() {
    const searchTerm = document.getElementById('productSearch').value.toLowerCase();
    const filtered = allProducts.filter(p =>
        p.name.toLowerCase().includes(searchTerm) ||
        p.category.toLowerCase().includes(searchTerm)
    );
    displayProducts(filtered);
}

function filterCategory(filter) {
    currentCategory = filter;
    document.querySelectorAll('.category-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    event.target.classList.add('active');

    let filtered;
    if (filter === 'all') {
        filtered = allProducts;
    } else if (filter.startsWith('tag:')) {
        const tagValue = filter.split(':')[1];
        filtered = allProducts.filter(p => p.tags && p.tags.includes(tagValue));
    } else if (filter.startsWith('subcategory:')) {
        const subcatValue = filter.split(':')[1];
        filtered = allProducts.filter(p => p.subcategory === subcatValue);
    } else if (filter.startsWith('category:')) {
        const catValue = filter.split(':')[1];
        filtered = allProducts.filter(p => p.category === catValue);
    } else {
        // Fallback to old behavior
        filtered = allProducts.filter(p => p.category === filter);
    }
    displayProducts(filtered);
}

// Quick Add Functions - Common items
function quickAddPreroll() {
    // Fixed 3-item selector: Sheet (R1), Cone (R10), Box (R130)
    const variants = [
        { sku: 'PERFECT-JOINT-SINGLE', label: 'Sheet', icon: 'fa-file', price: 1 },
        { sku: '223', label: 'Cone', icon: 'fa-ice-cream', price: 10 },
        { sku: '222', label: 'Box', icon: 'fa-box', price: 130 },
    ];

    document.getElementById('quickPrerollModal')?.remove();

    const modal = document.createElement('div');
    modal.id = 'quickPrerollModal';
    modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:10000;align-items:center;justify-content:center;';

    const buttons = [];
    for (const v of variants) {
        const prod = (allProducts || []).find(p => p.sku === v.sku);
        const stock = prod ? (prod.inventory?.quantity || prod.quantity || 0) : 0;
        const outOfStock = stock <= 0;

        buttons.push(`
            <button onclick="quickPrerollSelect('${v.sku}', ${v.price})" ${outOfStock ? 'disabled' : ''}
                style="display:flex;align-items:center;gap:14px;width:100%;padding:16px 18px;border:2px solid ${outOfStock ? '#333' : 'rgba(63,192,65,0.2)'};border-radius:12px;background:${outOfStock ? '#222' : '#222'};cursor:${outOfStock ? 'not-allowed' : 'pointer'};text-align:left;transition:all 0.15s;opacity:${outOfStock ? '0.5' : '1'}"
                ${outOfStock ? '' : 'onmouseenter="this.style.borderColor=\'#C9A84C\';this.style.transform=\'scale(1.02)\'" onmouseleave="this.style.borderColor=\'rgba(63,192,65,0.2)\';this.style.transform=\'scale(1)\'"'}>
                <div style="width:48px;height:48px;border-radius:12px;background:${outOfStock ? '#333' : 'rgba(63,192,65,0.15)'};display:flex;align-items:center;justify-content:center;flex-shrink:0;">
                    <i class="fas ${v.icon}" style="color:${outOfStock ? '#666' : '#C9A84C'};font-size:1.2rem;"></i>
                </div>
                <div style="flex:1;">
                    <div style="font-weight:700;color:#FAFAFA;font-size:1.05rem;">${v.label}</div>
                    <div style="font-size:0.8rem;color:#999;margin-top:2px;">${outOfStock ? 'Out of stock' : stock + ' available'}</div>
                </div>
                <div style="font-weight:800;font-size:1.2rem;color:#C9A84C;">R${v.price}</div>
            </button>
        `);
    }

    modal.innerHTML = `
        <div style="background:#1A1A1A;border-radius:16px;width:90%;max-width:380px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.5);border:1px solid #333;">
            <div style="background:linear-gradient(135deg,#8B6914,#C9A84C);color:#fff;padding:18px 20px;text-align:center;">
                <div style="font-family:'Barlow Condensed', sans-serif;font-size:1.3rem;letter-spacing:1px;">Rolling Papers & Cones</div>
                <div style="font-size:0.85rem;opacity:0.8;margin-top:4px;">Select type</div>
            </div>
            <div style="padding:16px;display:flex;flex-direction:column;gap:10px;">
                ${buttons.join('')}
            </div>
            <div style="padding:0 16px 16px;">
                <button onclick="document.getElementById('quickPrerollModal').remove()" style="width:100%;padding:12px;background:#333;border:none;border-radius:10px;font-weight:600;color:#FAFAFA;cursor:pointer;font-size:0.95rem;">Cancel</button>
            </div>
        </div>
    `;
    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}

function quickPrerollSelect(sku, fallbackPrice) {
    const prod = (allProducts || []).find(p => p.sku === sku);
    if (prod) {
        // Use product price if set, otherwise use fallback
        if (!prod.price || prod.price === 0) prod.price = fallbackPrice;
        addToCartDirect(prod);
    } else {
        // Product not in allProducts — create a quick item
        addToCartDirect({
            _id: 'quick-preroll-' + sku,
            name: sku === 'PERFECT-JOINT-SINGLE' ? 'Perfect Joint Sheet' : sku === '223' ? 'Perfect Joint Cone' : 'Perfect Joint Box',
            price: fallbackPrice,
            category: 'accessories',
            inventory: { quantity: 999 },
            sku: sku
        });
    }
    document.getElementById('quickPrerollModal')?.remove();
}

function quickAdd3gRack() {
    // Show modal to select strain for 3g rack
    const flowers = allProducts.filter(p =>
        p.category === 'flower' &&
        (p.name?.includes('3g') || p.tags?.includes('3g'))
    );

    if (flowers.length > 0) {
        showQuickSelectModal(flowers, '3g Pack');
    } else {
        // Show all flower products and let them pick
        const allFlower = allProducts.filter(p => p.category === 'flower');
        if (allFlower.length > 0) {
            show3gPackModal(allFlower);
        } else {
            showToast('No Flower', 'No flower products found', 'error');
        }
    }
}

function show3gPackModal(flowers) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'quick3gModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <span class="modal-title">3g Pack - Select Strain</span>
                <button class="modal-close" onclick="close3gModal()">&times;</button>
            </div>
            <div class="modal-body" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px; max-height: 60vh; overflow-y: auto;">
                ${flowers.map(f => `
                    <div onclick="add3gPackToCart('${f._id}', '${f.name.replace(/'/g, "\\'")}', ${f.price || 0})" style="padding: 15px; background: var(--cream); border-radius: 10px; cursor: pointer; text-align: center; border: 2px solid transparent; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='transparent'">
                        <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; color: var(--green-deep);">${f.name}</div>
                        <div style="font-size: 0.9rem; color: var(--gold-dark); font-weight: bold;">R${((f.price || 0) * 3).toFixed(0)} (3g)</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function close3gModal() {
    document.getElementById('quick3gModal')?.remove();
}

function add3gPackToCart(productId, name, pricePerGram) {
    const packItem = {
        _id: 'pack-3g-' + productId,
        name: name + ' (3g Pack)',
        price: pricePerGram * 3,
        category: 'flower',
        quantity: 1,
        inventory: { quantity: 999 }
    };
    addToCart(packItem);
    close3gModal();
}

function quickAddGram() {
    // Show a modal to select which strain for 1g
    showQuickGramModal();
}

function quickAdd5gBag() {
    // Filter to 5g bags
    const bags = allProducts.filter(p =>
        p.name?.includes('5g') ||
        p.tags?.includes('5g-bag')
    );

    if (bags.length === 1) {
        addToCart(bags[0]);
    } else if (bags.length > 1) {
        showQuickSelectModal(bags, '5g Bags');
    } else {
        showToast('No 5g Bags', 'No 5g bag products found in inventory', 'error');
    }
}

function showQuickGramModal() {
    // Get flower products sorted by stock
    const flowers = allProducts.filter(p => p.category === 'flower' && p.inventory?.quantity > 0)
        .sort((a, b) => (b.inventory?.quantity || 0) - (a.inventory?.quantity || 0))
        .slice(0, 12);

    if (flowers.length === 0) {
        showToast('No Flower', 'No flower products in stock', 'error');
        return;
    }

    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'quickGramModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <span class="modal-title">Select Strain for 1g</span>
                <button class="modal-close" onclick="closeQuickModal()">&times;</button>
            </div>
            <div class="modal-body" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">
                ${flowers.map(f => `
                    <div onclick="addGramItem('${f._id}')" style="padding: 15px; background: var(--cream); border-radius: 10px; cursor: pointer; text-align: center; border: 2px solid transparent; transition: all 0.2s;" onmouseover="this.style.borderColor='var(--gold)'" onmouseout="this.style.borderColor='transparent'">
                        <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1.1rem; color: var(--green-deep);">${f.name}</div>
                        <div style="font-size: 0.85rem; color: #666;">R${f.price}/g</div>
                        <div style="font-size: 0.8rem; color: ${f.tags?.includes('indoor') ? '#0ea5e9' : '#22c55e'};">${f.tags?.includes('indoor') ? 'Indoor' : f.tags?.includes('greendoor') ? 'Greendoor' : ''}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function showQuickSelectModal(products, title) {
    const modal = document.createElement('div');
    modal.className = 'modal active';
    modal.id = 'quickSelectModal';
    modal.innerHTML = `
        <div class="modal-content" style="max-width: 700px;">
            <div class="modal-header">
                <span class="modal-title">Select ${title}</span>
                <button class="modal-close" onclick="closeQuickModal()">&times;</button>
            </div>
            <div class="modal-body" style="display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 12px;">
                ${products.map(p => `
                    <div onclick="quickSelectProduct('${p._id}')" style="padding: 15px; background: #222; border-radius: 10px; cursor: pointer; text-align: center; border: 2px solid #333; transition: all 0.2s;" onmouseover="this.style.borderColor='#C9A84C'" onmouseout="this.style.borderColor='#333'">
                        <div style="font-family: 'Barlow Condensed', sans-serif; font-size: 1rem; color: #FAFAFA;">${p.name}</div>
                        <div style="font-size: 0.9rem; color: #C9A84C; font-weight: bold;">R${p.price}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
    document.body.appendChild(modal);
}

function addGramItem(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (product) {
        addToCart(product);
    }
    closeQuickModal();
}

function quickSelectProduct(productId) {
    const product = allProducts.find(p => p._id === productId);
    if (product) {
        addToCart(product);
    }
    closeQuickModal();
}

function closeQuickModal() {
    document.getElementById('quickGramModal')?.remove();
    document.getElementById('quickSelectModal')?.remove();
}
