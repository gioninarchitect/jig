// st-counting.js — Data loading, rendering, category filtering, progress, batch mode
// Depends on: config.js (API_URL), dbc-utils.js (showToast)
// Depends on: st-auth.js (currentUser, currentSession, currentItems, currentFilter)

// ============================================
// VIEW MODE STATE
// ============================================

let viewMode = 'card'; // 'card' or 'batch'

// ============================================
// FUZZY SEARCH (Levenshtein distance)
// ============================================

function levenshteinDistance(a, b) {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;
    const matrix = [];
    for (let i = 0; i <= b.length; i++) matrix[i] = [i];
    for (let j = 0; j <= a.length; j++) matrix[0][j] = j;
    for (let i = 1; i <= b.length; i++) {
        for (let j = 1; j <= a.length; j++) {
            if (b[i - 1] === a[j - 1]) {
                matrix[i][j] = matrix[i - 1][j - 1];
            } else {
                matrix[i][j] = Math.min(
                    matrix[i - 1][j - 1] + 1,
                    matrix[i][j - 1] + 1,
                    matrix[i - 1][j] + 1
                );
            }
        }
    }
    return matrix[b.length][a.length];
}

function fuzzyMatch(query, text, threshold) {
    if (!query || !text) return false;
    query = query.toLowerCase();
    text = text.toLowerCase();
    if (text.includes(query)) return true;
    // Check each word in the text against query
    const words = text.split(/\s+/);
    for (const word of words) {
        // Allow distance proportional to word length (max 2 for short words, 3 for longer)
        const maxDist = threshold || (query.length <= 3 ? 1 : query.length <= 6 ? 2 : 3);
        if (levenshteinDistance(query, word.substring(0, query.length + 2)) <= maxDist) {
            return true;
        }
    }
    return false;
}

// ============================================
// DATA LOADING & RENDERING
// ============================================

function loadSessionData() {
    if (!currentSession) return;

    // Update header info
    document.getElementById('sessionNumber').textContent = currentSession.sessionNumber;
    document.getElementById('branchName').textContent = currentSession.branchId?.name || 'Unknown';

    // Load items
    currentItems = currentSession.lineItems || [];

    // Populate category filter dropdown
    populateCategoryFilter();

    renderItems();
    updateProgress();
}

// Category hierarchy state
let selectedCategory = 'all';
let selectedGrowMethod = null;
let selectedProductType = null;

function selectMainCategory(category) {
    selectedCategory = category;
    selectedGrowMethod = null;
    selectedProductType = null;

    // Update button states
    document.querySelectorAll('#mainCategoryRow .cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.filter === category);
    });

    // Show/hide grow method row for flower
    const growMethodRow = document.getElementById('growMethodRow');
    const productTypeRow = document.getElementById('productTypeRow');

    if (category === 'flower') {
        growMethodRow.style.display = 'flex';
        productTypeRow.style.display = 'flex';
    } else {
        growMethodRow.style.display = 'none';
        productTypeRow.style.display = 'none';
    }

    // Reset sub-button states
    document.querySelectorAll('#growMethodRow .cat-btn').forEach(btn => btn.classList.remove('active'));
    document.querySelectorAll('#productTypeRow .cat-btn').forEach(btn => btn.classList.remove('active'));

    renderItems();
}

function selectGrowMethod(method) {
    selectedGrowMethod = method;
    selectedProductType = null;

    // Update button states
    document.querySelectorAll('#growMethodRow .cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.growmethod === method);
    });

    // Show product type row
    document.getElementById('productTypeRow').style.display = 'flex';

    // Reset product type buttons
    document.querySelectorAll('#productTypeRow .cat-btn').forEach(btn => btn.classList.remove('active'));

    renderItems();
}

function selectProductType(type) {
    selectedProductType = type;

    // Update button states
    document.querySelectorAll('#productTypeRow .cat-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });

    renderItems();
}

function populateCategoryFilter() {
    // Initial category button setup — updateCategoryProgress() keeps it live
    if (!currentItems || currentItems.length === 0) return;
    updateCategoryProgress();
}

function renderItems() {
    const container = document.getElementById('itemsContainer');
    const searchTerm = document.getElementById('searchInput')?.value?.toLowerCase() || '';

    let filteredItems = currentItems.filter(item => {
        // Smart search — matches name, SKU, tags, POS codes, and splits words
        // Supports fuzzy matching for typos
        if (searchTerm) {
            const nameLower = (item.productName || '').toLowerCase();
            const skuLower = (item.sku || '').toLowerCase();
            const tagsStr = (item.tags || []).join(' ').toLowerCase();
            const typeStr = (item.productType || '').toLowerCase();
            const searchable = nameLower + ' ' + skuLower + ' ' + tagsStr + ' ' + typeStr;

            // Single letter = "starts with" filter (A-Z jump)
            if (searchTerm.length === 1 && /^[a-z]$/.test(searchTerm)) {
                if (!nameLower.startsWith(searchTerm)) return false;
                // Pass — continue to category/status filters below
            } else {
                // POS code search — if search is purely numeric, match against SKU digits
                if (/^\d+$/.test(searchTerm)) {
                    const skuDigits = skuLower.replace(/\D/g, '');
                    if (skuDigits.includes(searchTerm) || skuLower.includes(searchTerm)) {
                        // Numeric match found, skip text filters for this item
                    } else {
                        return false;
                    }
                } else {
                    // Smart aliases
                    const aliases = {
                        'jb': 'just blaze', 'pb': 'premium blend', 'preroll': 'pre-roll',
                        'moonstick': 'moon stick', 'hc': 'honey-comb', 'bcp': 'black cherry punch',
                        'gsc': 'girl scout', 'id': 'i.d', 'gd': 'g.d', 'nfs': 'not for sale'
                    };

                    // Split search into words, expand aliases, ALL words must match
                    const words = searchTerm.split(/\s+/).map(w => aliases[w] || w);
                    // Try exact match first
                    let match = words.every(word => searchable.includes(word));
                    // If no exact match, try fuzzy matching (only for queries 3+ chars)
                    if (!match && searchTerm.length >= 3) {
                        match = words.every(word => fuzzyMatch(word, searchable));
                    }
                    if (!match) return false;
                }
            }
        }

        // Main category filter
        if (selectedCategory !== 'all') {
            const itemCat = (item.category || '').toLowerCase();
            if (itemCat !== selectedCategory.toLowerCase()) {
                return false;
            }
        }

        // Grow method filter (for flower) - check multiple sources
        if (selectedGrowMethod) {
            const tags = item.tags || [];
            const tagsLower = tags.map(t => (t || '').toLowerCase());
            const hasInTags = tagsLower.includes(selectedGrowMethod.toLowerCase());
            const hasInField = (item.growMethod || '').toLowerCase() === selectedGrowMethod.toLowerCase();

            // Also check product name for I.D (Indoor) or G.D (Greendoor)
            const itemName = (item.productName || '').toLowerCase();
            let hasInName = false;
            if (selectedGrowMethod === 'indoor') {
                hasInName = itemName.includes('i.d') || itemName.includes('i.d.') || itemName.includes('indoor');
            } else if (selectedGrowMethod === 'greendoor') {
                hasInName = itemName.includes('g.d') || itemName.includes('g.d.') || itemName.includes('greendoor');
            }

            if (!hasInTags && !hasInField && !hasInName) {
                return false;
            }
        }

        // Product type filter - check productType field or name patterns
        if (selectedProductType) {
            const itemName = (item.productName || '').toLowerCase();
            const itemType = (item.productType || '').toLowerCase();
            const tags = item.tags || [];
            const tagsLower = tags.map(t => (t || '').toLowerCase());

            if (selectedProductType === 'pre-roll') {
                const isPreRoll = itemType === 'pre-roll' || tagsLower.includes('pre-roll') ||
                    itemName.includes('pre roll') || itemName.includes('preroll') || itemName.includes('joint');
                if (!isPreRoll) return false;
            } else if (selectedProductType === 'pre-pack') {
                const isPrePack = itemType === 'pre-pack' || tagsLower.includes('pre-pack') ||
                    itemName.includes('5g') || itemName.includes('3g') || itemName.includes('pre pack') || itemName.includes('prepack');
                if (!isPrePack) return false;
            } else if (selectedProductType === 'loose') {
                const isPreRoll = itemType === 'pre-roll' || tagsLower.includes('pre-roll') ||
                    itemName.includes('pre roll') || itemName.includes('preroll') || itemName.includes('joint');
                const isPrePack = itemType === 'pre-pack' || tagsLower.includes('pre-pack') ||
                    itemName.includes('5g') || itemName.includes('3g') || itemName.includes('pre pack');
                if (isPreRoll || isPrePack) return false;
            }
        }

        // Status filter (bottom nav)
        if (currentFilter === 'pending' && item.validationStatus !== 'pending') {
            return false;
        }
        if (currentFilter === 'variance' && item.variance === 0) {
            return false;
        }

        return true;
    });

    // Derive isCountable for all filtered items
    filteredItems.forEach(item => {
        const cat = (item.category || '').toLowerCase();
        const tags = item.tags || [];
        const pType = (item.productType || '').toLowerCase();
        const nameLower = (item.productName || '').toLowerCase();
        const isFlower = cat === 'flower';
        const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack')
            || tags.includes('just-blaze')
            || pType === 'pre-roll' || pType === 'pre-pack'
            || nameLower.includes('pre-roll') || nameLower.includes('pre roll') || nameLower.includes('preroll')
            || nameLower.includes('pre-pack') || nameLower.includes('pre pack') || nameLower.includes('prepack')
            || nameLower.includes('just blaze') || nameLower.includes('jb ')
            || nameLower.includes('joint') || nameLower.includes('moon stick')
            || nameLower.includes('gold roll') || nameLower.includes('singles')
            || nameLower.includes('perfect joint') || nameLower.includes('mj roll');
        item.isCountable = !isFlower || isPreRollOrPack;
        if (item.isCountable && item.unit === 'g') {
            item.unit = 'units';
        }
    });

    if (filteredItems.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-box-open"></i>
                <h3>No Items Found</h3>
                <p>Try adjusting your search or filter</p>
            </div>
        `;
        return;
    }

    // Route to batch or card view
    if (viewMode === 'batch') {
        renderBatchMode(filteredItems, container);
    } else {
        renderCardMode(filteredItems, container);
    }
}

// ============================================
// CARD MODE (original detailed view)
// ============================================

function renderCardMode(filteredItems, container) {
    container.innerHTML = filteredItems.map((item, index) => {
        const actualIndex = currentItems.indexOf(item);
        const hasPhoto = item.scalePhoto?.url || (item.unitPhotos && item.unitPhotos.length > 0);

        const statusClass = item.validationStatus === 'valid' ? 'completed' :
                           item.validationStatus === 'invalid' ? 'invalid' :
                           item.variance !== 0 ? 'has-variance' : '';

        const varianceClass = item.variance > 0 ? 'positive' :
                             item.variance < 0 ? 'negative' : 'zero';

        // Photo label changes based on Quick Count Mode
        const photoRequired = !item.isCountable; // Weighable items always need scale photo
        const photoLabel = item.isCountable
            ? `Unit Photo ${photoRequired ? '(Required)' : '(Optional)'}`
            : 'Scale Photo (Required)';

        return `
            <div class="item-card ${statusClass}" id="item-${actualIndex}">
                <div class="item-header" onclick="toggleItem(${actualIndex})">
                    <div class="item-info">
                        <h3>${item.productName}</h3>
                        <div class="item-meta">
                            SKU: ${item.sku || 'N/A'} | ${item.category || 'General'}
                        </div>
                    </div>
                    <div class="item-status">
                        <span class="status-badge status-${item.validationStatus}">${item.validationStatus}</span>
                        <span class="expected-qty">Expected: ${item.expectedQty} ${item.unit}</span>
                    </div>
                </div>
                <div class="item-details">
                    <!-- Photo Capture -->
                    ${item.isCountable ? `
                    <div class="detail-section photo-accordion" style="border-radius:8px;overflow:hidden;">
                        <div class="photo-accordion-header" onclick="event.stopPropagation(); togglePhotoAccordion(${actualIndex})" style="display:flex;align-items:center;justify-content:space-between;cursor:pointer;padding:8px 0;">
                            <label style="pointer-events:none;margin:0;display:flex;align-items:center;gap:6px;">
                                <i class="fas fa-camera"></i> ${photoLabel}
                                ${hasPhoto ? '<span style="color:var(--gold,#D97706);font-size:0.75rem;margin-left:4px;"><i class="fas fa-check-circle"></i> Captured</span>' : ''}
                            </label>
                            <i class="fas fa-chevron-down photo-accordion-icon" id="photo-icon-${actualIndex}" style="transition:transform 0.2s;font-size:0.8rem;color:#8faa97;"></i>
                        </div>
                        <div class="photo-accordion-body" id="photo-body-${actualIndex}" style="max-height:0;overflow:hidden;transition:max-height 0.3s ease;">
                            <div class="photo-capture ${hasPhoto ? 'has-photo' : ''}"
                                 onclick="openCamera(${actualIndex})"
                                 style="position: relative; margin-top:8px;">
                                ${item.unitPhotos && item.unitPhotos.length > 0 ? `
                                    <img src="${item.unitPhotos[item.unitPhotos.length - 1].url}" alt="Unit photo">
                                    <button class="retake-btn" onclick="event.stopPropagation(); openCamera(${actualIndex})">
                                        <i class="fas fa-redo"></i> Retake
                                    </button>
                                ` : `
                                    <i class="fas fa-camera"></i>
                                    <p>Tap to capture unit photo</p>
                                `}
                            </div>
                        </div>
                    </div>
                    ` : `
                    <div class="detail-section">
                        <label><i class="fas fa-camera"></i> ${photoLabel}</label>
                        <div class="photo-capture ${hasPhoto ? 'has-photo' : ''}"
                             onclick="openCamera(${actualIndex})"
                             style="position: relative;">
                            ${item.scalePhoto?.url ? `
                                <img src="${item.scalePhoto.url}" alt="Scale photo">
                                <button class="retake-btn" onclick="event.stopPropagation(); openCamera(${actualIndex})">
                                    <i class="fas fa-redo"></i> Retake
                                </button>
                            ` : `
                                <i class="fas fa-camera"></i>
                                <p>Tap to capture scale photo</p>
                            `}
                        </div>
                    </div>
                    `}

                    ${!item.isCountable ? `
                    <!-- Container / Tare Weight -->
                    <div class="detail-section" style="background:rgba(217, 119, 6,0.08);border-radius:8px;padding:10px;margin-bottom:4px;">
                        <label style="font-size:0.8rem;color:var(--gold,#D97706);"><i class="fas fa-jar"></i> Container (Tare) Weight</label>
                        <div style="display:flex;gap:8px;align-items:center;">
                            <div class="weight-input-container" style="flex:1;">
                                <input type="number"
                                       class="weight-input"
                                       id="tare-${actualIndex}"
                                       value="${item.tareWeight || ''}"
                                       placeholder="0.00"
                                       step="0.01"
                                       min="0"
                                       style="font-size:0.9rem;"
                                       onchange="updateTareWeight(${actualIndex}, this.value)">
                                <span class="unit-label">g</span>
                            </div>
                            <button onclick="openContainerCamera(${actualIndex})" style="padding:8px 12px;background:var(--gold,#D97706);color:var(--green-deep,#6D28D9);border:none;border-radius:6px;font-size:0.8rem;cursor:pointer;white-space:nowrap;">
                                <i class="fas fa-camera"></i> Jar Photo
                            </button>
                        </div>
                        ${item.containerPhoto ? `<img src="${item.containerPhoto}" alt="Container" style="width:60px;height:60px;object-fit:cover;border-radius:6px;margin-top:6px;">` : ''}
                        ${item.tareWeight ? `<div style="font-size:0.75rem;color:var(--gold,#D97706);margin-top:4px;"><i class="fas fa-info-circle"></i> Gross weight on scale minus ${item.tareWeight}g jar = net product weight</div>` : ''}
                    </div>
                    ` : ''}

                    <!-- Weight / Count Input -->
                    <div class="detail-section">
                        <label><i class="fas ${item.isCountable ? 'fa-hashtag' : 'fa-weight'}"></i> ${item.isCountable ? 'Actual Count' : item.tareWeight ? 'Gross Weight (with jar)' : 'Actual Weight'}</label>
                        <div class="weight-input-container">
                            <input type="number"
                                   class="weight-input"
                                   id="weight-${actualIndex}"
                                   value="${item.grossWeight || item.actualQty || ''}"
                                   placeholder="${item.isCountable ? '0' : '0.00'}"
                                   step="${item.isCountable ? '1' : '0.01'}"
                                   min="0"
                                   onchange="${item.tareWeight ? 'updateGrossWeight' : 'updateWeight'}(${actualIndex}, this.value)">
                            <span class="unit-label">${item.unit}</span>
                        </div>
                        ${!item.isCountable && item.tareWeight && item.grossWeight ? `
                            <div style="background:var(--cream,#0A0A0A);padding:8px 10px;border-radius:6px;margin-top:6px;font-size:0.85rem;">
                                <strong>Net Weight: ${(item.grossWeight - item.tareWeight).toFixed(2)}g</strong>
                                <span style="color:#888;margin-left:8px;">(${item.grossWeight}g - ${item.tareWeight}g jar)</span>
                            </div>
                        ` : ''}

                        ${item.ocrDetectedWeight ? `
                            <div class="ocr-result">
                                <span><i class="fas fa-robot"></i> ${item.isCountable ? 'Detected' : 'OCR Detected'}: ${item.ocrDetectedWeight} ${item.unit}</span>
                                <button onclick="useOcrWeight(${actualIndex}, ${item.ocrDetectedWeight})">Use</button>
                            </div>
                        ` : ''}
                        ${item.detectedCount ? `
                            <div class="ocr-result">
                                <span><i class="fas fa-robot"></i> Detected: ${item.detectedCount} ${item.detectedCount === 1 ? 'unit' : 'units'}</span>
                                <button onclick="useOcrWeight(${actualIndex}, ${item.detectedCount})">Use</button>
                            </div>
                        ` : ''}

                        ${item.actualQty !== undefined ? `
                            <div class="variance-display ${varianceClass}">
                                <span>Variance</span>
                                <span>${item.variance >= 0 ? '+' : ''}${item.variance} ${item.unit} (${item.variancePercent}%)</span>
                            </div>
                        ` : ''}
                    </div>

                    <!-- Notes -->
                    <div class="detail-section">
                        <label><i class="fas fa-sticky-note"></i> Notes</label>
                        <textarea class="notes-input"
                                  id="notes-${actualIndex}"
                                  placeholder="Add notes (required for variance > 5%)"
                                  onchange="updateNotes(${actualIndex}, this.value)">${item.notes || ''}</textarea>
                    </div>

                    <!-- Validation Errors -->
                    ${item.validationErrors && item.validationErrors.length > 0 ? `
                        <div class="validation-errors">
                            <ul>
                                ${item.validationErrors.map(err => `<li>${err}</li>`).join('')}
                            </ul>
                        </div>
                    ` : ''}

                    <!-- Actions -->
                    <div class="item-actions">
                        <button class="btn btn-primary" onclick="saveAndAdvance(${actualIndex})"
                                style="flex: 2;">
                            <i class="fas fa-check-circle"></i> CONFIRM & NEXT
                        </button>
                        <button class="btn btn-secondary" onclick="saveItem(${actualIndex})"
                                style="flex: 1;">
                            <i class="fas fa-save"></i> Save
                        </button>
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

// ============================================
// BATCH MODE — fast form-based entry
// ============================================

function renderBatchMode(filteredItems, container) {
    container.innerHTML = `
        <div class="batch-form" style="background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; margin-bottom: 80px;">
            <div style="background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%); padding: 12px 16px; display: flex; justify-content: space-between; align-items: center;">
                <h3 style="font-size: 0.95rem; color: white; margin: 0;">
                    <i class="fas fa-th-list"></i> Batch Entry
                    <span style="opacity: 0.7; font-weight: 400;">(${filteredItems.length} items)</span>
                </h3>
                <button onclick="saveBatchEntries()" class="btn btn-primary" style="padding: 8px 16px; font-size: 0.8rem; min-height: auto;">
                    <i class="fas fa-save"></i> Save All
                </button>
            </div>
            <!-- Batch header row -->
            <div style="display: grid; grid-template-columns: 1fr 70px 90px 70px; gap: 8px; padding: 10px 12px; background: rgba(255,255,255,0.05); font-size: 0.7rem; font-weight: 600; color: var(--text-secondary); text-transform: uppercase; letter-spacing: 0.5px;">
                <span>Product</span>
                <span style="text-align: center;">Expected</span>
                <span style="text-align: center;">Count</span>
                <span style="text-align: center;">Var</span>
            </div>
            <!-- Batch rows -->
            ${filteredItems.map((item, i) => {
                const actualIndex = currentItems.indexOf(item);
                const hasCounted = item.actualQty !== undefined && item.actualQty !== null;
                const variance = hasCounted ? (item.actualQty - (item.expectedQty || 0)) : null;
                const varianceColor = variance === null ? 'var(--text-secondary)' :
                    variance === 0 ? 'var(--text-secondary)' :
                    variance > 0 ? 'var(--success)' : 'var(--danger)';
                const rowBg = hasCounted ? 'rgba(34, 197, 94, 0.05)' : 'transparent';

                return `
                <div class="batch-row" style="display: grid; grid-template-columns: 1fr 70px 90px 70px; gap: 8px; padding: 10px 12px; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.05); background: ${rowBg};" id="batch-row-${actualIndex}">
                    <div style="min-width: 0;">
                        <div style="font-size: 0.85rem; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.productName}</div>
                        <div style="font-size: 0.65rem; color: var(--text-secondary); opacity: 0.7;">${item.sku || ''} | ${item.unit}</div>
                    </div>
                    <div style="text-align: center; font-size: 0.85rem; color: var(--text-secondary);">${item.expectedQty || 0}</div>
                    <div>
                        <input type="number"
                               class="batch-input"
                               id="batch-${actualIndex}"
                               value="${item.actualQty !== undefined && item.actualQty !== null ? item.actualQty : ''}"
                               placeholder="${item.isCountable ? '0' : '0.00'}"
                               step="${item.isCountable ? '1' : '0.01'}"
                               min="0"
                               data-index="${actualIndex}"
                               onchange="batchUpdateWeight(${actualIndex}, this.value)"
                               onkeydown="batchKeyNav(event, ${i}, ${filteredItems.length})"
                               style="width: 100%; padding: 8px; text-align: center; font-size: 0.95rem; font-weight: 600; background: var(--bg-input); border: 1px solid var(--border); border-radius: 6px; color: white;">
                    </div>
                    <div style="text-align: center; font-size: 0.8rem; font-weight: 600; color: ${varianceColor};">
                        ${variance !== null ? (variance >= 0 ? '+' : '') + variance : '-'}
                    </div>
                </div>`;
            }).join('')}
        </div>
    `;
}

// Batch mode: update weight for a single item inline
function batchUpdateWeight(index, value) {
    const weight = parseFloat(value);
    if (isNaN(weight) && value !== '') return;

    if (value === '') {
        currentItems[index].actualQty = undefined;
    } else {
        currentItems[index].actualQty = weight;
        const expected = currentItems[index].expectedQty || 0;
        currentItems[index].variance = parseFloat((weight - expected).toFixed(2));
        currentItems[index].variancePercent = expected > 0
            ? parseFloat(((currentItems[index].variance / expected) * 100).toFixed(2))
            : 0;
    }

    // Update just the variance cell and row highlight without full re-render
    const row = document.getElementById(`batch-row-${index}`);
    if (row) {
        const hasCounted = currentItems[index].actualQty !== undefined && currentItems[index].actualQty !== null;
        row.style.background = hasCounted ? 'rgba(34, 197, 94, 0.05)' : 'transparent';
        const varCell = row.querySelector('div:last-child');
        if (varCell && hasCounted) {
            const v = currentItems[index].variance;
            varCell.style.color = v === 0 ? 'var(--text-secondary)' : v > 0 ? 'var(--success)' : 'var(--danger)';
            varCell.textContent = (v >= 0 ? '+' : '') + v;
        } else if (varCell) {
            varCell.textContent = '-';
            varCell.style.color = 'var(--text-secondary)';
        }
    }

    updateProgress();
}

// Keyboard navigation in batch mode: Tab/Enter advances to next row
function batchKeyNav(event, currentRowIndex, totalRows) {
    if (event.key === 'Enter' || (event.key === 'Tab' && !event.shiftKey)) {
        event.preventDefault();
        const nextIndex = currentRowIndex + 1;
        if (nextIndex < totalRows) {
            const allInputs = document.querySelectorAll('.batch-input');
            if (allInputs[nextIndex]) {
                allInputs[nextIndex].focus();
                allInputs[nextIndex].select();
            }
        }
    } else if (event.key === 'Tab' && event.shiftKey) {
        event.preventDefault();
        const prevIndex = currentRowIndex - 1;
        if (prevIndex >= 0) {
            const allInputs = document.querySelectorAll('.batch-input');
            if (allInputs[prevIndex]) {
                allInputs[prevIndex].focus();
                allInputs[prevIndex].select();
            }
        }
    }
}

// Save all batch entries to server
async function saveBatchEntries() {
    const inputs = document.querySelectorAll('.batch-input');
    let savedCount = 0;
    let errorCount = 0;

    for (const input of inputs) {
        const index = parseInt(input.dataset.index);
        const value = input.value;
        if (value === '' || isNaN(parseFloat(value))) continue;

        const item = currentItems[index];
        if (item.actualQty === undefined || item.actualQty === null) continue;

        try {
            const response = await fetch(
                `${API_URL}/stocktake/session/${currentSession._id}/item/${index}`,
                {
                    method: 'PUT',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${getToken()}`
                    },
                    body: JSON.stringify({
                        actualQty: item.actualQty,
                        notes: item.notes || ''
                    })
                }
            );
            const data = await response.json();
            if (data.success) {
                currentItems[index] = { ...currentItems[index], ...data.item };
                savedCount++;
            } else {
                errorCount++;
            }
        } catch (err) {
            errorCount++;
        }
    }

    if (savedCount > 0) {
        showToast(`${savedCount} items saved${errorCount > 0 ? `, ${errorCount} failed` : ''}`, errorCount > 0 ? 'warning' : 'success');
    } else if (errorCount > 0) {
        showToast(`Failed to save ${errorCount} items`, 'error');
    } else {
        showToast('No items to save — enter counts first', 'warning');
    }

    updateProgress();
    renderItems(); // Refresh to show updated statuses
}

// Toggle between card and batch view
function toggleViewMode() {
    viewMode = viewMode === 'card' ? 'batch' : 'card';
    const btn = document.getElementById('viewModeBtn');
    if (btn) {
        btn.innerHTML = viewMode === 'card'
            ? '<i class="fas fa-th-list"></i> Batch'
            : '<i class="fas fa-id-card"></i> Cards';
    }
    renderItems();
}

function toggleItem(index) {
    const card = document.getElementById(`item-${index}`);
    if (card) {
        card.classList.toggle('expanded');
    }
}

function togglePhotoAccordion(index) {
    const body = document.getElementById(`photo-body-${index}`);
    const icon = document.getElementById(`photo-icon-${index}`);
    if (!body) return;
    if (body.style.maxHeight && body.style.maxHeight !== '0px') {
        body.style.maxHeight = '0';
        if (icon) icon.style.transform = 'rotate(0deg)';
    } else {
        body.style.maxHeight = '300px';
        if (icon) icon.style.transform = 'rotate(180deg)';
    }
}

function filterItems(filter, e) {
    currentFilter = filter;

    // Update nav buttons
    document.querySelectorAll('#stocktakeBottomNav .nav-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    if (e && e.target) {
        e.target.closest('.nav-btn').classList.add('active');
    }

    renderItems();
}

function updateProgress() {
    const total = currentItems.length;
    const completed = currentItems.filter(item =>
        item.actualQty !== undefined && item.actualQty !== null
    ).length;
    const photos = currentItems.filter(item => item.scalePhoto?.url || (item.unitPhotos && item.unitPhotos.length > 0)).length;
    const variance = currentItems.filter(item => item.variance !== 0).length;
    const valid = currentItems.filter(item => item.validationStatus === 'valid').length;

    const percent = total > 0 ? (completed / total * 100) : 0;

    document.getElementById('progressText').textContent = `${completed} / ${total} items`;
    document.getElementById('progressFill').style.width = `${percent}%`;
    document.getElementById('photoCount').textContent = photos;
    document.getElementById('varianceCount').textContent = variance;
    document.getElementById('validCount').textContent = valid;

    // Quick Count Mode: submit requires all weights entered
    // Photos only required for items with >20% variance (checked at submit time)
    const canSubmit = completed === total;
    document.getElementById('submitBtn').disabled = !canSubmit;

    // Update category progress indicators
    updateCategoryProgress();
}

// ============================================
// CATEGORY PROGRESS INDICATORS
// ============================================

function updateCategoryProgress() {
    if (!currentItems || currentItems.length === 0) return;

    const categories = ['flower', 'edibles', 'concentrates', 'vapes', 'topicals', 'lifestyle-cbd', 'accessories'];

    document.querySelectorAll('#mainCategoryRow .cat-btn').forEach(btn => {
        const filter = btn.dataset.filter;
        if (filter === 'all') {
            const totalAll = currentItems.length;
            const countedAll = currentItems.filter(i => i.actualQty !== undefined && i.actualQty !== null).length;
            const icon = btn.querySelector('i')?.outerHTML || '';
            btn.innerHTML = `${icon} ALL <span style="opacity:0.6;font-size:10px;">(${countedAll}/${totalAll})</span>`;
            return;
        }
        const catItems = currentItems.filter(i => (i.category || '').toLowerCase() === filter);
        const catCounted = catItems.filter(i => i.actualQty !== undefined && i.actualQty !== null).length;
        const catTotal = catItems.length;
        if (catTotal === 0) return;

        const icon = btn.querySelector('i')?.outerHTML || '';
        const name = filter.toUpperCase().replace('LIFESTYLE-CBD', 'LIFESTYLE');
        const doneColor = catCounted === catTotal ? 'color: var(--success);' : '';
        btn.innerHTML = `${icon} ${name} <span style="opacity:0.8;font-size:10px;${doneColor}">(${catCounted}/${catTotal})</span>`;
    });
}
