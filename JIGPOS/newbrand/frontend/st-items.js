// st-items.js — Item updates, submit, export, confirm modal, mode switch, init
// Depends on: config.js (API_URL), or-utils.js (showToast), or-auth.js (getToken)
// Depends on: st-auth.js (currentUser, currentSession, currentItems, checkAuth, setupOTPInputs, requestOTP, verifyOTP)
// Depends on: st-counting.js (renderItems, updateProgress)

// ============================================
// ITEM UPDATES
// ============================================

async function updateWeight(index, value) {
    const weight = parseFloat(value);
    if (isNaN(weight)) return;

    currentItems[index].actualQty = weight;

    // Calculate variance locally for immediate feedback
    const expected = currentItems[index].expectedQty || 0;
    currentItems[index].variance = (weight - expected).toFixed(2);
    currentItems[index].variancePercent = expected > 0
        ? ((currentItems[index].variance / expected) * 100).toFixed(2)
        : 0;

    renderItems();
    updateProgress();
}

function updateNotes(index, value) {
    currentItems[index].notes = value;
}

function updateTareWeight(index, value) {
    const tare = parseFloat(value);
    if (isNaN(tare) || tare < 0) return;

    currentItems[index].tareWeight = tare;

    // If gross weight already entered, recalculate net
    if (currentItems[index].grossWeight) {
        const net = currentItems[index].grossWeight - tare;
        currentItems[index].actualQty = Math.max(0, parseFloat(net.toFixed(2)));

        const expected = currentItems[index].expectedQty || 0;
        currentItems[index].variance = (currentItems[index].actualQty - expected).toFixed(2);
        currentItems[index].variancePercent = expected > 0
            ? ((currentItems[index].variance / expected) * 100).toFixed(2)
            : 0;
    }

    renderItems();
    updateProgress();
}

function updateGrossWeight(index, value) {
    const gross = parseFloat(value);
    if (isNaN(gross) || gross < 0) return;

    currentItems[index].grossWeight = gross;
    const tare = currentItems[index].tareWeight || 0;
    const net = gross - tare;
    currentItems[index].actualQty = Math.max(0, parseFloat(net.toFixed(2)));

    const expected = currentItems[index].expectedQty || 0;
    currentItems[index].variance = (currentItems[index].actualQty - expected).toFixed(2);
    currentItems[index].variancePercent = expected > 0
        ? ((currentItems[index].variance / expected) * 100).toFixed(2)
        : 0;

    renderItems();
    updateProgress();
}

function openContainerCamera(index) {
    // Reuse the existing camera infrastructure but tag as container photo
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.capture = 'environment';
    input.onchange = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // Preview immediately
        const reader = new FileReader();
        reader.onload = () => {
            currentItems[index].containerPhoto = reader.result;
            renderItems();
            showToast('Container photo saved', 'success');
        };
        reader.readAsDataURL(file);
    };
    input.click();
}

function useOcrWeight(index, weight) {
    document.getElementById(`weight-${index}`).value = weight;
    updateWeight(index, weight);
}

async function saveItem(index) {
    const item = currentItems[index];
    const isCountable = item.isCountable || item.unit === 'units';

    // Quick Count Mode: photos optional for countable items
    // Scale photos still required for weighable items (OCR reads the weight)
    const hasPhoto = isCountable
        ? (item.unitPhotos && item.unitPhotos.length > 0)
        : item.scalePhoto?.url;

    if (!isCountable && !hasPhoto) {
        showToast('Scale photo is required for weighable items', 'error');
        return;
    }

    if (item.actualQty === undefined || item.actualQty === null) {
        showToast(isCountable ? 'Count is required' : 'Weight is required', 'error');
        return;
    }

    // Quick Count Mode: warn if high variance and no photo (but don't block)
    if (isCountable && !hasPhoto) {
        const expected = item.expectedQty || 0;
        const variancePct = expected > 0 ? Math.abs(((item.actualQty - expected) / expected) * 100) : 0;
        if (variancePct > 20) {
            showToast('High variance detected - consider adding a photo for evidence', 'warning');
        }
    }

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
                    notes: item.notes
                })
            }
        );

        const data = await response.json();

        if (data.success) {
            // Update local item with server response
            currentItems[index] = { ...currentItems[index], ...data.item };

            showToast('Item saved', 'success');
            toggleItem(index);
            renderItems();
            updateProgress();
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch (error) {
        showToast('Error saving item', 'error');
    }
}

// ============================================
// AUTO-ADVANCE FLOW
// ============================================

// Accept OCR weight, save, and advance to next item
async function acceptOcrAndAdvance(index, weight) {
    // Set the weight
    const weightInput = document.getElementById(`weight-${index}`);
    if (weightInput) weightInput.value = weight;
    updateWeight(index, weight);

    // Save and advance
    await saveAndAdvance(index);
}

// Accept detected unit count, save, and advance to next item
async function acceptCountAndAdvance(index, count) {
    // Set the count
    const weightInput = document.getElementById(`weight-${index}`);
    if (weightInput) weightInput.value = count;
    updateWeight(index, count);

    // Save and advance
    await saveAndAdvance(index);
}

// Save current item and scroll to next uncounted item
async function saveAndAdvance(index) {
    const item = currentItems[index];
    const isCountable = item.isCountable || item.unit === 'units';

    // Quick Count Mode: photos optional for countable items
    const hasPhoto = isCountable
        ? (item.unitPhotos && item.unitPhotos.length > 0)
        : item.scalePhoto?.url;

    if (!isCountable && !hasPhoto) {
        showToast('Scale photo is required for weighable items', 'error');
        return;
    }

    if (item.actualQty === undefined || item.actualQty === null) {
        showToast(isCountable ? 'Count is required' : 'Weight is required', 'error');
        return;
    }

    // Quick Count Mode: warn on high variance without photo
    if (isCountable && !hasPhoto) {
        const expected = item.expectedQty || 0;
        const variancePct = expected > 0 ? Math.abs(((item.actualQty - expected) / expected) * 100) : 0;
        if (variancePct > 20) {
            showToast('High variance - consider adding a photo', 'warning');
        }
    }

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
                    notes: item.notes
                })
            }
        );

        const data = await response.json();

        if (data.success) {
            currentItems[index] = { ...currentItems[index], ...data.item };

            // Collapse current item
            const card = document.getElementById(`item-${index}`);
            if (card) card.classList.remove('expanded');

            // Brief success flash
            showToast('Saved', 'success');

            renderItems();
            updateProgress();

            // Auto-advance to next uncounted item
            advanceToNextItem(index);
        } else {
            showToast(data.message || 'Save failed', 'error');
        }
    } catch (error) {
        showToast('Error saving item', 'error');
    }
}

// Find and scroll to the next uncounted/pending item
function advanceToNextItem(currentIndex) {
    // Find next pending item after current index
    let nextIndex = -1;

    // First look after current position
    for (let i = currentIndex + 1; i < currentItems.length; i++) {
        if (!currentItems[i].actualQty && currentItems[i].actualQty !== 0) {
            nextIndex = i;
            break;
        }
    }

    // If not found, wrap around from beginning
    if (nextIndex === -1) {
        for (let i = 0; i < currentIndex; i++) {
            if (!currentItems[i].actualQty && currentItems[i].actualQty !== 0) {
                nextIndex = i;
                break;
            }
        }
    }

    if (nextIndex === -1) {
        // All items counted
        showToast('All items counted!', 'success');
        return;
    }

    // Small delay to let render complete, then expand and scroll
    setTimeout(() => {
        const nextCard = document.getElementById(`item-${nextIndex}`);
        if (nextCard) {
            nextCard.classList.add('expanded');
            nextCard.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
    }, 300);
}

// ============================================
// SUBMIT STOCK TAKE
// ============================================

// Branded confirm modal (replaces browser confirm)
let confirmCallback = null;

function showConfirmModal(title, message, onConfirm) {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    confirmCallback = onConfirm;
    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal(confirmed) {
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmed && confirmCallback) {
        confirmCallback();
    }
    confirmCallback = null;
}

async function submitStockTake() {
    showConfirmModal(
        'Submit Stock Take',
        'Are you sure you want to submit this stock take for manager approval? This cannot be undone.',
        async () => {
            await doSubmitStockTake();
        }
    );
}

async function doSubmitStockTake() {
    try {
        const response = await fetch(
            `${API_URL}/stocktake/session/${currentSession._id}/submit`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({})
            }
        );

        const data = await response.json();

        if (data.success) {
            showToast('Stock take submitted for approval', 'success');
            currentSession = null;
            loadSessions();
        } else {
            showToast(data.message || 'Submission failed', 'error');

            // Show validation errors if any
            if (data.invalidItems) {
                data.invalidItems.forEach(item => {
                    console.log('Invalid item:', item);
                });
            }
        }
    } catch (error) {
        showToast('Error submitting stock take', 'error');
    }
}

// ============================================
// EXPORT TO CSV
// ============================================

function exportStockTakeCSV() {
    if (!currentSession || !currentItems.length) {
        showToast('No stock take data to export', 'error');
        return;
    }

    // Create CSV headers
    const headers = [
        'SKU',
        'Product Name',
        'Category',
        'Expected Qty',
        'Counted Qty',
        'Variance',
        'Variance %',
        'Unit',
        'Status',
        'Notes',
        'Counted By',
        'Counted At'
    ];

    // Create CSV rows
    const rows = currentItems.map(item => [
        item.sku || '',
        `"${(item.name || item.productName || '').replace(/"/g, '""')}"`,
        item.category || '',
        item.expectedQty || 0,
        item.actualQty || 0,
        item.variance || 0,
        item.variancePercent || 0,
        item.unit || 'g',
        item.validationStatus || 'pending',
        `"${(item.notes || '').replace(/"/g, '""')}"`,
        item.countedBy?.name || currentUser?.firstName || '',
        item.countedAt ? new Date(item.countedAt).toLocaleString('en-ZA') : ''
    ]);

    // Combine into CSV content
    const csvContent = [
        `Stock Take Export - Session #${currentSession.sessionNumber || currentSession._id.slice(-6).toUpperCase()}`,
        `Branch: ${currentSession.branchName || currentSession.branch?.name || 'Unknown'}`,
        `Date: ${new Date().toLocaleString('en-ZA')}`,
        `Status: ${currentSession.status || 'In Progress'}`,
        '',
        headers.join(','),
        ...rows.map(row => row.join(','))
    ].join('\n');

    // Create blob and download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `stocktake-${currentSession.sessionNumber || 'export'}-${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast('Stock sheet exported to CSV', 'success');
}

// ============================================
// INITIALIZATION
// ============================================

document.getElementById('emailForm').addEventListener('submit', requestOTP);
document.getElementById('otpForm').addEventListener('submit', verifyOTP);

document.getElementById('searchInput').addEventListener('input', () => {
    renderItems();
});

// Setup OTP input navigation
setupOTPInputs();

// Mode switching (Stock Take / Receive Stock)
let currentMode = 'stocktake';

function switchMode(mode) {
    currentMode = mode;

    // Update tab buttons
    document.getElementById('tabStockTake').style.background = mode === 'stocktake' ? 'var(--gold)' : 'rgba(255,255,255,0.2)';
    document.getElementById('tabStockTake').style.color = mode === 'stocktake' ? 'var(--primary-dark)' : 'white';
    document.getElementById('tabReceive').style.background = mode === 'receive' ? 'var(--gold)' : 'rgba(255,255,255,0.2)';
    document.getElementById('tabReceive').style.color = mode === 'receive' ? 'var(--primary-dark)' : 'white';

    // Toggle content sections (same page, no navigation)
    document.getElementById('stocktakeContent').style.display = mode === 'stocktake' ? 'block' : 'none';
    document.getElementById('receiveContent').style.display = mode === 'receive' ? 'block' : 'none';
    document.getElementById('stocktakeBottomNav').style.display = mode === 'stocktake' ? 'flex' : 'none';
    document.getElementById('recvBottomNav').style.display = mode === 'receive' ? 'flex' : 'none';

    if (mode === 'receive') {
        recvInit();
    }
}

// Check auth on load
checkAuth();

// Register service worker
if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('/sw-stocktake.js')
        .then(reg => console.log('Service worker registered'))
        .catch(err => console.log('Service worker registration failed:', err));
}
