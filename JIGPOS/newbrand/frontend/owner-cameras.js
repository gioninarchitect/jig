// owner-cameras.js — Surveillance camera grid with multi-camera tabs per branch
// Depends on: config.js (API_URL), owner-auth.js (token), dbc-utils.js (showToast)

// Cache branch camera data for the configure modal
let _branchCameraCache = {};

function renderCameraGrid(branches) {
    const grid = document.getElementById('cameraGrid');
    if (!grid || !branches) return;

    // Cache camera data for configure modal
    branches.forEach(b => {
        _branchCameraCache[b._id] = {
            cameraUrl: b.cameraUrl,
            cameraUrls: b.cameraUrls || []
        };
    });

    grid.innerHTML = branches.map(branch => {
        const cameras = branch.cameraUrls || [];
        const legacySingle = branch.cameraUrl || null;
        // Support both old single cameraUrl and new array cameraUrls
        const allCams = cameras.length > 0 ? cameras : (legacySingle ? [{ name: 'Camera 1', url: legacySingle }] : []);
        const hasCameras = allCams.length > 0;

        if (hasCameras) {
            // Tabs for multiple cameras
            const tabs = allCams.map((cam, i) => `
                <button class="cam-tab ${i === 0 ? 'active' : ''}"
                    onclick="switchCameraTab(this, '${branch._id}', ${i})"
                    style="padding:0.2rem 0.5rem;font-size:0.6rem;background:${i === 0 ? 'var(--gold)' : 'rgba(255,255,255,0.1)'};color:${i === 0 ? 'var(--green-deep)' : 'rgba(255,255,255,0.6)'};border:none;border-radius:4px;cursor:pointer;font-weight:600;">
                    ${cam.name || 'Cam ' + (i + 1)}
                </button>
            `).join('');

            return `
                <div class="camera-slot camera-live" data-branch-id="${branch._id}">
                    ${allCams.map((cam, i) => `
                        <div class="camera-feed-container cam-feed-${branch._id}" data-cam-index="${i}" style="${i > 0 ? 'display:none;' : ''}">
                            <img src="${cam.url}" alt="${branch.name} ${cam.name || 'Camera'}" class="camera-feed-img" onerror="this.parentElement.innerHTML='<div class=\\'camera-error\\'><i class=\\'fas fa-exclamation-triangle\\'></i><span>Feed unavailable</span></div>'">
                        </div>
                    `).join('')}
                    <div class="camera-overlay">
                        <span class="camera-branch-name">${branch.name}</span>
                        <div style="display:flex;align-items:center;gap:0.3rem;">
                            ${allCams.length > 1 ? tabs : ''}
                            <span class="camera-live-badge"><i class="fas fa-circle"></i> LIVE</span>
                        </div>
                    </div>
                    <button class="camera-config-btn" onclick="configureCameraModal('${branch._id}', '${branch.name}')">
                        <i class="fas fa-cog"></i>
                    </button>
                </div>
            `;
        }

        // Animated placeholder (no cameras configured)
        return `
            <div class="camera-slot camera-placeholder" data-branch-id="${branch._id}">
                <div class="camera-scan-line"></div>
                <div class="camera-placeholder-content">
                    <i class="fas fa-video camera-pulse-icon"></i>
                    <span class="camera-awaiting-text">AWAITING FEED</span>
                    <span class="camera-branch-label">${branch.name}</span>
                </div>
                <button class="camera-config-btn" onclick="configureCameraModal('${branch._id}', '${branch.name}')">
                    <i class="fas fa-cog"></i> Configure
                </button>
            </div>
        `;
    }).join('');
}

function switchCameraTab(btn, branchId, index) {
    // Switch active tab
    btn.parentElement.querySelectorAll('.cam-tab').forEach((t, i) => {
        t.style.background = i === index ? 'var(--gold)' : 'rgba(255,255,255,0.1)';
        t.style.color = i === index ? 'var(--green-deep)' : 'rgba(255,255,255,0.6)';
        t.classList.toggle('active', i === index);
    });
    // Switch feed
    document.querySelectorAll(`.cam-feed-${branchId}`).forEach((feed, i) => {
        feed.style.display = i === index ? '' : 'none';
    });
}

// Camera configuration modal — supports multiple cameras per branch
function configureCameraModal(branchId, branchName) {
    const existing = document.getElementById('cameraConfigModal');
    if (existing) existing.remove();

    cameraRowCounter = 0; // Reset counter for each modal

    const modal = document.createElement('div');
    modal.id = 'cameraConfigModal';
    modal.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.6);z-index:1100;display:flex;align-items:center;justify-content:center;animation:fadeIn 0.2s;';
    modal.innerHTML = `
        <div style="background:var(--surface-card);border:1px solid var(--border-dark);border-radius:16px;width:90%;max-width:500px;overflow:hidden;">
            <div style="background:linear-gradient(135deg,var(--green) 0%,var(--green-dark) 100%);padding:1rem 1.25rem;display:flex;justify-content:space-between;align-items:center;">
                <h3 style="color:var(--cream);margin:0;font-family:'Oswald', sans-serif;font-size:1.2rem;"><i class="fas fa-video"></i> Cameras - ${branchName}</h3>
                <button onclick="document.getElementById('cameraConfigModal').remove()" style="background:none;border:none;color:var(--cream);font-size:1.3rem;cursor:pointer;"><i class="fas fa-times"></i></button>
            </div>
            <div style="padding:1.25rem;" id="cameraConfigBody">
                <p style="font-size:0.8rem;color:var(--text-secondary);margin-bottom:1rem;">Add IP camera streams (MJPEG, RTSP-over-HTTP, or snapshot URLs). Each camera gets its own tab.</p>
                <div id="cameraList" style="margin-bottom:1rem;"></div>
                <button onclick="addCameraRow()" style="width:100%;padding:0.6rem;background:var(--surface-elevated);border:1px dashed var(--border-dark);border-radius:8px;color:var(--gold);cursor:pointer;font-weight:600;font-size:0.9rem;">
                    <i class="fas fa-plus"></i> Add Camera
                </button>
                <div style="display:flex;gap:0.75rem;margin-top:1.25rem;">
                    <button onclick="saveCameras('${branchId}')" style="flex:1;padding:0.75rem;background:var(--green);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:700;">
                        <i class="fas fa-save"></i> Save All
                    </button>
                    <button onclick="document.getElementById('cameraConfigModal').remove()" style="padding:0.75rem 1rem;background:var(--surface-elevated);color:var(--text-secondary);border:1px solid var(--border-dark);border-radius:8px;cursor:pointer;">
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    `;

    document.body.appendChild(modal);
    modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });

    // Pre-load existing cameras from cache
    const cached = _branchCameraCache[branchId];
    if (cached && cached.cameraUrls && cached.cameraUrls.length > 0) {
        cached.cameraUrls.forEach(cam => {
            addCameraRow(cam.name, cam.url);
        });
    } else if (cached && cached.cameraUrl) {
        addCameraRow('Camera 1', cached.cameraUrl);
    } else {
        addCameraRow(); // Start with one empty row
    }
}

let cameraRowCounter = 0;
function addCameraRow(name, url) {
    cameraRowCounter++;
    const list = document.getElementById('cameraList');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'camera-config-row';
    row.style.cssText = 'display:flex;gap:0.5rem;margin-bottom:0.5rem;align-items:center;';
    row.innerHTML = `
        <input type="text" value="${name || 'Camera ' + cameraRowCounter}" placeholder="Name" style="width:30%;padding:0.5rem;background:var(--surface-elevated);border:1px solid var(--border-dark);border-radius:6px;color:var(--text-primary);font-size:0.85rem;">
        <input type="url" value="${url || ''}" placeholder="https://camera-ip/stream" style="flex:1;padding:0.5rem;background:var(--surface-elevated);border:1px solid var(--border-dark);border-radius:6px;color:var(--text-primary);font-size:0.85rem;">
        <button onclick="this.parentElement.remove()" style="width:32px;height:32px;background:none;border:1px solid var(--border-dark);border-radius:6px;color:var(--red);cursor:pointer;display:flex;align-items:center;justify-content:center;">
            <i class="fas fa-trash" style="font-size:0.8rem;"></i>
        </button>
    `;
    list.appendChild(row);
}

async function saveCameras(branchId) {
    const rows = document.querySelectorAll('.camera-config-row');
    const cameras = [];
    rows.forEach(row => {
        const inputs = row.querySelectorAll('input');
        const name = inputs[0]?.value?.trim();
        const url = inputs[1]?.value?.trim();
        if (url) cameras.push({ name: name || 'Camera', url });
    });

    try {
        const res = await fetch(`${API_URL}/branches/${branchId}`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({
                settings: {
                    cameraUrl: cameras.length > 0 ? cameras[0].url : null,
                    cameraUrls: cameras
                }
            })
        });

        if (res.ok) {
            // Update local cache
            _branchCameraCache[branchId] = {
                cameraUrl: cameras.length > 0 ? cameras[0].url : null,
                cameraUrls: cameras
            };
            showToast(`${cameras.length} camera(s) saved`, 'success');
            document.getElementById('cameraConfigModal')?.remove();
            if (typeof loadOwnerBranchStats === 'function') loadOwnerBranchStats();
        } else {
            throw new Error('Failed to save');
        }
    } catch (error) {
        showToast('Failed to save cameras', 'error');
    }
}
