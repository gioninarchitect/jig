// st-sessions.js — Session management (load, select, create, start)
// Depends on: config.js (API_URL), dbc-utils.js (showToast), dbc-auth.js (getToken)
// Depends on: st-auth.js (currentUser, currentSession)

// ============================================
// SESSION MANAGEMENT
// ============================================

async function loadSessions() {
    try {
        // First check for active session
        const branchId = currentUser?.branchId
            || currentUser?.primaryBranch?._id
            || currentUser?.primaryBranch
            || currentUser?.branch?._id
            || currentUser?.branch
            || localStorage.getItem('selectedBranch');

        if (branchId) {
            const response = await fetch(`${API_URL}/stocktake/active/${branchId}`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });

            const data = await response.json();

            if (data.hasActiveSession && data.session) {
                currentSession = data.session;
                loadSessionData();
                return;
            }
        }

        // Show session selection modal
        showSessionModal();

    } catch (error) {
        console.error('Load sessions error:', error);
        showToast('Error loading sessions', 'error');
    }
}

async function showSessionModal() {
    const modal = document.getElementById('sessionModal');
    const list = document.getElementById('sessionList');

    list.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';
    modal.classList.add('active');

    try {
        const response = await fetch(`${API_URL}/stocktake/history?status=scheduled&limit=10`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        const data = await response.json();

        if (data.sessions && data.sessions.length > 0) {
            list.innerHTML = data.sessions.map(session => `
                <div class="session-option" onclick="selectSession('${session._id}')">
                    <h4>${session.sessionNumber}</h4>
                    <p>
                        ${session.branchId?.name || 'Unknown Branch'} |
                        ${session.totalItems || 0} items |
                        ${new Date(session.scheduledDate).toLocaleDateString()}
                    </p>
                </div>
            `).join('');
        } else {
            list.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-clipboard-list"></i>
                    <h3>No Scheduled Stock Takes</h3>
                    <p>Create a new stock take session to begin</p>
                </div>
            `;
        }
    } catch (error) {
        list.innerHTML = '<p style="text-align: center; color: var(--danger);">Error loading sessions</p>';
    }
}

function closeSessionModal() {
    document.getElementById('sessionModal').classList.remove('active');
}

async function selectSession(sessionId) {
    try {
        const response = await fetch(`${API_URL}/stocktake/session/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });

        const data = await response.json();

        if (data.success) {
            currentSession = data.session;
            closeSessionModal();

            // Start session if scheduled
            if (currentSession.status === 'scheduled') {
                await startSession();
            }

            loadSessionData();
        } else {
            showToast(data.message || 'Error loading session', 'error');
        }
    } catch (error) {
        showToast('Error selecting session', 'error');
    }
}

async function startSession() {
    try {
        // Get location
        let location = null;
        if (navigator.geolocation) {
            try {
                const pos = await new Promise((resolve, reject) => {
                    navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
                });
                location = {
                    latitude: pos.coords.latitude,
                    longitude: pos.coords.longitude,
                    accuracy: pos.coords.accuracy
                };
            } catch (e) {
                console.warn('Could not get location:', e);
            }
        }

        const response = await fetch(`${API_URL}/stocktake/session/${currentSession._id}/start`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ location })
        });

        const data = await response.json();

        if (data.success) {
            currentSession.status = 'in_progress';
            showToast('Stock take started', 'success');
        }
    } catch (error) {
        console.error('Start session error:', error);
    }
}

// Auto-detect branch from user's email pattern
async function detectBranchFromEmail(email) {
    if (!email) return null;

    // Extract branch prefix from email (e.g., "ormonde.assistant@..." -> "ormonde")
    const emailPrefix = email.split('@')[0].split('.')[0].toLowerCase();

    try {
        // Fetch all branches and find matching one
        const response = await fetch(`${API_URL}/branches`, {
            headers: { 'Authorization': `Bearer ${getToken()}` }
        });
        const data = await response.json();

        if (data.success && data.branches) {
            // Find branch by name or code matching email prefix
            const branch = data.branches.find(b =>
                b.name.toLowerCase() === emailPrefix ||
                b.branchCode.toLowerCase() === emailPrefix ||
                b.name.toLowerCase().startsWith(emailPrefix)
            );

            if (branch) {
                console.log('Auto-detected branch:', branch.name, branch._id);
                return branch;
            }
        }
    } catch (error) {
        console.error('Error detecting branch:', error);
    }
    return null;
}

async function createNewSession() {
    // Try to get branch from multiple sources
    let branchId = currentUser?.branchId
        || currentUser?.primaryBranch?._id
        || currentUser?.primaryBranch
        || currentUser?.branch?._id
        || currentUser?.branch
        || localStorage.getItem('selectedBranch');
    let branchName = currentUser?.primaryBranch?.name
        || currentUser?.branch?.name
        || localStorage.getItem('selectedBranchName')
        || 'Unknown';

    // If still no branch, try fetching branches and let user pick
    if (!branchId) {
        try {
            const response = await fetch(`${API_URL}/branches`, {
                headers: { 'Authorization': `Bearer ${getToken()}` }
            });
            const data = await response.json();

            if (data.success && data.branches && data.branches.length > 0) {
                // If only one branch, use it
                if (data.branches.length === 1) {
                    branchId = data.branches[0]._id;
                    branchName = data.branches[0].name;
                } else {
                    // Show branch picker
                    showBranchPicker(data.branches);
                    return;
                }
            }
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    }

    // Auto-detect from email as last resort
    if (!branchId && currentUser?.email) {
        const detectedBranch = await detectBranchFromEmail(currentUser.email);
        if (detectedBranch) {
            branchId = detectedBranch._id;
            branchName = detectedBranch.name;
        }
    }

    if (!branchId) {
        showToast('Could not detect your branch. Contact admin.', 'error');
        return;
    }

    // Store for future use
    localStorage.setItem('selectedBranch', branchId);
    localStorage.setItem('selectedBranchName', branchName);

    // Show branded create modal
    document.getElementById('createSessionBranchName').textContent = branchName;
    document.getElementById('createSessionModal').style.display = 'flex';
}

function showBranchPicker(branches) {
    const list = document.getElementById('sessionList');
    const modal = document.getElementById('sessionModal');

    list.innerHTML = `
        <div style="text-align: center; margin-bottom: 16px;">
            <h3 style="color: var(--gold); font-family: 'Oswald', sans-serif;">Select Your Branch</h3>
        </div>
        ${branches.map(b => `
            <div class="session-option" onclick="pickBranch('${b._id}', '${b.name.replace(/'/g, "\\'")}')">
                <h4><i class="fas fa-store"></i> ${b.name}</h4>
                <p>${b.address?.city || b.address?.suburb || (typeof b.address === 'string' ? b.address : '') || b.branchCode}</p>
            </div>
        `).join('')}
    `;
    modal.classList.add('active');
}

function pickBranch(branchId, branchName) {
    localStorage.setItem('selectedBranch', branchId);
    localStorage.setItem('selectedBranchName', branchName);
    closeSessionModal();
    // Now create the session with the picked branch
    document.getElementById('createSessionBranchName').textContent = branchName;
    document.getElementById('createSessionModal').style.display = 'flex';
}

function closeCreateSessionModal() {
    document.getElementById('createSessionModal').style.display = 'none';
}

// ============================================
// ADD PRODUCT TO SESSION
// ============================================

function openAddProductModal() {
    if (!currentSession) {
        showToast('No active session', 'error');
        return;
    }
    document.getElementById('addProductModal').style.display = 'flex';
    document.getElementById('addProductSearch').value = '';
    document.getElementById('addProductResults').innerHTML = `
        <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
            <i class="fas fa-search" style="font-size: 2rem; margin-bottom: 1rem; display: block; opacity: 0.4;"></i>
            <p>Type to search all products</p>
        </div>
    `;
    setTimeout(() => document.getElementById('addProductSearch').focus(), 200);
}

function closeAddProductModal() {
    document.getElementById('addProductModal').style.display = 'none';
}

let addProductDebounce = null;

function searchProductsToAdd(query) {
    clearTimeout(addProductDebounce);
    if (!query || query.length < 2) {
        document.getElementById('addProductResults').innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                <p>Type at least 2 characters</p>
            </div>
        `;
        return;
    }

    addProductDebounce = setTimeout(async () => {
        const results = document.getElementById('addProductResults');
        results.innerHTML = '<div class="spinner" style="margin: 2rem auto;"></div>';

        try {
            const response = await fetch(
                `${API_URL}/stocktake/search-products?q=${encodeURIComponent(query)}&sessionId=${currentSession._id}`,
                { headers: { 'Authorization': `Bearer ${getToken()}` } }
            );
            const data = await response.json();

            if (!data.success || !data.products || data.products.length === 0) {
                results.innerHTML = `
                    <div style="text-align: center; padding: 2rem; color: var(--text-secondary);">
                        <i class="fas fa-times-circle" style="font-size: 2rem; margin-bottom: 1rem; display: block; opacity: 0.4;"></i>
                        <p>No products found for "${query}"</p>
                    </div>
                `;
                return;
            }

            results.innerHTML = data.products.map(p => {
                const tagsStr = (p.tags || []).join(', ');
                const inSession = p.alreadyInSession;
                return `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: ${inSession ? 'rgba(34,197,94,0.1)' : 'var(--bg-card, #6D28D9)'}; border-radius: 8px; border: 1px solid ${inSession ? 'rgba(34,197,94,0.3)' : 'var(--border, #A855F7)'};">
                        <div style="flex: 1;">
                            <div style="font-weight: 600; font-size: 0.95rem;">${p.name}</div>
                            <div style="font-size: 0.8rem; color: var(--text-secondary); margin-top: 2px;">
                                SKU: ${p.sku || 'N/A'} | ${p.category || 'General'} ${tagsStr ? '| ' + tagsStr : ''}
                            </div>
                        </div>
                        ${inSession
                            ? '<span style="padding: 6px 12px; background: rgba(34,197,94,0.2); color: #22c55e; border-radius: 6px; font-size: 0.8rem; font-weight: 600; white-space: nowrap;"><i class="fas fa-check"></i> In Session</span>'
                            : `<button onclick="addProductToSession('${p._id}', this)" style="padding: 8px 14px; background: var(--gold, #D97706); color: var(--primary-dark, #6D28D9); border: none; border-radius: 6px; font-weight: 700; font-size: 0.85rem; cursor: pointer; white-space: nowrap;"><i class="fas fa-plus"></i> Add</button>`
                        }
                    </div>
                `;
            }).join('');
        } catch (error) {
            results.innerHTML = '<p style="text-align: center; color: var(--danger);">Error searching products</p>';
        }
    }, 300);
}

async function addProductToSession(productId, btn) {
    if (!currentSession) return;

    // Disable button immediately
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';

    try {
        const response = await fetch(
            `${API_URL}/stocktake/session/${currentSession._id}/add-item`,
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${getToken()}`
                },
                body: JSON.stringify({ productId })
            }
        );

        const data = await response.json();

        if (data.success) {
            // Add to local items array
            currentItems.push(data.item);
            currentSession.lineItems = currentItems;

            // Update button to show "In Session"
            btn.outerHTML = '<span style="padding: 6px 12px; background: rgba(34,197,94,0.2); color: #22c55e; border-radius: 6px; font-size: 0.8rem; font-weight: 600; white-space: nowrap;"><i class="fas fa-check"></i> Added</span>';

            showToast(data.message || 'Product added', 'success');
            renderItems();
            updateProgress();
            populateCategoryFilter();
        } else {
            btn.disabled = false;
            btn.innerHTML = '<i class="fas fa-plus"></i> Add';
            showToast(data.message || 'Could not add product', 'error');
        }
    } catch (error) {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-plus"></i> Add';
        showToast('Error adding product', 'error');
    }
}

async function confirmCreateSession() {
    const branchId = currentUser?.branchId
        || currentUser?.primaryBranch?._id
        || currentUser?.primaryBranch
        || currentUser?.branch?._id
        || currentUser?.branch
        || localStorage.getItem('selectedBranch');
    const stockTakeType = document.getElementById('newSessionType').value;

    closeCreateSessionModal();
    showToast('Creating stock take...', 'info');

    try {
        const response = await fetch(`${API_URL}/stocktake/session`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({
                branchId,
                stockTakeType
            })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Stock take created!', 'success');
            selectSession(data.session._id);
        } else {
            showToast(data.message || 'Error creating session', 'error');
        }
    } catch (error) {
        showToast('Error creating session', 'error');
    }
}
