// st-camera.js — Camera capture and photo upload
// Depends on: config.js (API_URL), dbc-utils.js (showToast), dbc-auth.js (getToken)
// Depends on: st-auth.js (currentSession, currentItems, currentItemIndex, cameraStream)
// Depends on: st-counting.js (renderItems, updateProgress)

// ============================================
// CAMERA & PHOTO
// ============================================

async function openCamera(itemIndex) {
    currentItemIndex = itemIndex;
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');

    modal.classList.add('active');

    try {
        cameraStream = await navigator.mediaDevices.getUserMedia({
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        });

        video.srcObject = cameraStream;
    } catch (error) {
        console.error('Camera error:', error);
        showToast('Could not access camera', 'error');
        closeCamera();
    }
}

function closeCamera() {
    const modal = document.getElementById('cameraModal');
    const video = document.getElementById('cameraVideo');

    modal.classList.remove('active');

    if (cameraStream) {
        cameraStream.getTracks().forEach(track => track.stop());
        cameraStream = null;
    }

    video.srcObject = null;
    currentItemIndex = null;
}

async function capturePhoto() {
    console.log('capturePhoto called, currentItemIndex:', currentItemIndex);

    // Save itemIndex BEFORE closing camera (closeCamera sets it to null)
    const itemIndex = currentItemIndex;

    if (itemIndex === null) {
        showToast('No item selected', 'error');
        return;
    }

    const video = document.getElementById('cameraVideo');
    const canvas = document.getElementById('photoCanvas');
    const ctx = canvas.getContext('2d');

    if (!video.videoWidth || !video.videoHeight) {
        showToast('Camera not ready. Please wait.', 'error');
        return;
    }

    // Show capture feedback
    const captureBtn = document.getElementById('captureBtn');
    if (captureBtn) {
        captureBtn.disabled = true;
        captureBtn.innerHTML = '<i class="fas fa-spinner fa-spin" style="font-size: 1.5rem; color: var(--primary);"></i>';
    }

    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.drawImage(video, 0, 0);

    // Check if this is a countable item (units) or weighable item (flower)
    const item = currentItems[itemIndex];
    const cat = (item.category || '').toLowerCase();
    const tags = item.tags || [];
    const pType = (item.productType || '').toLowerCase();
    const nameLower = (item.productName || '').toLowerCase();
    const isFlower = cat === 'flower';
    const isPreRollOrPack = tags.includes('pre-roll') || tags.includes('pre-pack')
        || pType === 'pre-roll' || pType === 'pre-pack'
        || nameLower.includes('pre roll') || nameLower.includes('preroll')
        || nameLower.includes('pre pack') || nameLower.includes('joint');
    const isCountable = item.isCountable || item.unit === 'units' || !isFlower || isPreRollOrPack;

    // Convert to blob
    canvas.toBlob(async (blob) => {
        // Close camera AFTER capturing but use saved itemIndex
        closeCamera();

        // Ensure item is expanded and show processing state
        const card = document.getElementById(`item-${itemIndex}`);
        if (card) {
            card.classList.add('expanded');
        }
        showPhotoProcessing(itemIndex, isCountable);

        // Upload photo to the correct endpoint
        const formData = new FormData();
        formData.append('photo', blob, `${isCountable ? 'unit' : 'scale'}-${Date.now()}.jpg`);

        // For unit photos, send count=0 so backend uses Claude Vision to detect
        if (isCountable) {
            formData.append('count', '0');
        }

        const endpoint = isCountable
            ? `${API_URL}/stocktake/session/${currentSession._id}/item/${itemIndex}/unit-photo`
            : `${API_URL}/stocktake/session/${currentSession._id}/item/${itemIndex}/photo`;

        try {
            const response = await fetch(endpoint, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${getToken()}`
                },
                body: formData
            });

            const data = await response.json();

            if (data.success) {
                if (isCountable) {
                    // Unit count flow
                    currentItems[itemIndex].unitPhotos = data.unitPhotos;
                    currentItems[itemIndex].unitCount = data.totalCount;

                    const detectedCount = data.vision?.count || data.totalCount || null;
                    const photoUrl = data.unitPhotos?.[data.unitPhotos.length - 1]?.url;
                    showUnitPhotoSuccess(itemIndex, photoUrl, detectedCount);
                    updateProgress();
                } else {
                    // Scale weight flow
                    currentItems[itemIndex].scalePhoto = data.photo;
                    currentItems[itemIndex].validationStatus = data.validationStatus;

                    const ocrWeight = data.ocr?.weight || data.ocrWeight || currentItems[itemIndex].ocrDetectedWeight;
                    const ocrUnit = data.ocr?.unit || item.unit || 'g';
                    showPhotoSuccess(itemIndex, data.photo, ocrWeight, ocrUnit);
                    updateProgress();
                }
            } else {
                showPhotoError(itemIndex, data.message || 'Upload failed');
            }
        } catch (error) {
            console.error('Photo upload error:', error);
            showPhotoError(itemIndex, 'Network error uploading photo');
        }
    }, 'image/jpeg', 0.85);
}

// Show spinner in photo area while uploading
function showPhotoProcessing(itemIndex, isCountable) {
    const photoArea = document.querySelector(`#item-${itemIndex} .photo-capture`);
    if (!photoArea) return;

    const processingText = isCountable ? 'Counting items...' : 'OCR reading scale weight';

    photoArea.className = 'photo-capture';
    photoArea.onclick = null;
    photoArea.innerHTML = `
        <div style="padding: 2rem; text-align: center;">
            <div class="spinner" style="margin: 0 auto 12px;"></div>
            <p style="color: var(--text-secondary); font-size: 0.9rem;">Uploading & processing...</p>
            <p style="color: var(--text-secondary); font-size: 0.75rem; margin-top: 4px;">${processingText}</p>
        </div>
    `;
}

// Show success with photo thumbnail and OCR weight result
function showPhotoSuccess(itemIndex, photo, ocrWeight, ocrUnit) {
    const photoArea = document.querySelector(`#item-${itemIndex} .photo-capture`);
    if (!photoArea) return;

    photoArea.className = 'photo-capture has-photo';
    photoArea.style.position = 'relative';
    photoArea.onclick = null;
    photoArea.innerHTML = `
        <img src="${photo.url}" alt="Scale photo">
        <button class="retake-btn" onclick="event.stopPropagation(); openCamera(${itemIndex})">
            <i class="fas fa-redo"></i> Retake
        </button>
    `;

    // If OCR detected weight, show big accept button
    if (ocrWeight) {
        currentItems[itemIndex].ocrDetectedWeight = ocrWeight;
        showOcrAcceptButton(itemIndex, ocrWeight, ocrUnit);
    }
}

// Show success with photo thumbnail and detected unit count
function showUnitPhotoSuccess(itemIndex, photoUrl, detectedCount) {
    const photoArea = document.querySelector(`#item-${itemIndex} .photo-capture`);
    if (!photoArea) return;

    photoArea.className = 'photo-capture has-photo';
    photoArea.style.position = 'relative';
    photoArea.onclick = null;
    photoArea.innerHTML = `
        <img src="${photoUrl}" alt="Unit photo">
        <button class="retake-btn" onclick="event.stopPropagation(); openCamera(${itemIndex})">
            <i class="fas fa-redo"></i> Retake
        </button>
    `;

    // If Claude detected a count, show accept button
    if (detectedCount !== null && detectedCount > 0) {
        currentItems[itemIndex].detectedCount = detectedCount;
        showCountAcceptButton(itemIndex, detectedCount);
    }
}

// Show big green OCR accept button below weight input (for flower/weight items)
function showOcrAcceptButton(itemIndex, weight, unit) {
    const item = currentItems[itemIndex];
    const displayUnit = unit || item.unit || 'g';
    const weightSection = document.querySelector(`#item-${itemIndex} .detail-section:nth-child(2)`);
    if (!weightSection) return;

    // Remove any existing OCR accept UI
    const existing = weightSection.querySelector('.ocr-accept-block');
    if (existing) existing.remove();

    const acceptBlock = document.createElement('div');
    acceptBlock.className = 'ocr-accept-block';
    acceptBlock.style.cssText = 'margin-top: 12px; animation: fadeIn 0.3s ease;';
    acceptBlock.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05)); border: 2px solid var(--success); border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 0.8rem; color: var(--success); margin-bottom: 6px; font-weight: 600;">
                <i class="fas fa-robot"></i> OCR DETECTED WEIGHT
            </div>
            <div style="font-family: 'Oswald', sans-serif; font-size: 2.2rem; color: var(--success); margin-bottom: 12px;">
                ${weight} ${displayUnit}
            </div>
            <button onclick="acceptOcrAndAdvance(${itemIndex}, ${weight})"
                    style="width: 100%; padding: 14px; background: var(--success); color: white; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fas fa-check-circle"></i> ACCEPT & NEXT ITEM
            </button>
        </div>
    `;
    weightSection.appendChild(acceptBlock);
}

// Show big green count accept button below count input (for unit/countable items)
function showCountAcceptButton(itemIndex, count) {
    const item = currentItems[itemIndex];
    const weightSection = document.querySelector(`#item-${itemIndex} .detail-section:nth-child(2)`);
    if (!weightSection) return;

    // Remove any existing accept UI
    const existing = weightSection.querySelector('.ocr-accept-block');
    if (existing) existing.remove();

    const acceptBlock = document.createElement('div');
    acceptBlock.className = 'ocr-accept-block';
    acceptBlock.style.cssText = 'margin-top: 12px; animation: fadeIn 0.3s ease;';
    acceptBlock.innerHTML = `
        <div style="background: linear-gradient(135deg, rgba(34,197,94,0.15), rgba(34,197,94,0.05)); border: 2px solid var(--success); border-radius: 12px; padding: 16px; text-align: center;">
            <div style="font-size: 0.8rem; color: var(--success); margin-bottom: 6px; font-weight: 600;">
                <i class="fas fa-robot"></i> DETECTED UNIT COUNT
            </div>
            <div style="font-family: 'Oswald', sans-serif; font-size: 2.2rem; color: var(--success); margin-bottom: 12px;">
                ${count} ${count === 1 ? 'unit' : 'units'}
            </div>
            <button onclick="acceptCountAndAdvance(${itemIndex}, ${count})"
                    style="width: 100%; padding: 14px; background: var(--success); color: white; border: none; border-radius: 10px; font-size: 1.1rem; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; gap: 8px;">
                <i class="fas fa-check-circle"></i> ACCEPT & NEXT ITEM
            </button>
        </div>
    `;
    weightSection.appendChild(acceptBlock);
}

function showPhotoError(itemIndex, message) {
    const photoArea = document.querySelector(`#item-${itemIndex} .photo-capture`);
    if (!photoArea) return;

    photoArea.className = 'photo-capture';
    photoArea.onclick = function() { openCamera(itemIndex); };
    photoArea.innerHTML = `
        <i class="fas fa-exclamation-triangle" style="color: var(--danger);"></i>
        <p style="color: var(--danger);">${message}</p>
        <p style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 4px;">Tap to retry</p>
    `;
    showToast(message, 'error');
}
