// inv-compliance.js — Section 21 Compliance module for inventory manager dashboard
// Depends on: config.js (API_URL), or-utils.js (showToast, getToken, apiCall)

// ==================== COMPLIANCE ====================

// Main entry — called by loadSectionData('compliance')
async function loadComplianceSection() {
    // Show loading state in both card bodies
    const pendingEl = document.getElementById('pendingSection21');
    const approvedEl = document.getElementById('approvedSection21');
    if (pendingEl) pendingEl.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm text-success"></div> Loading...</div>';
    if (approvedEl) approvedEl.innerHTML = '<div class="text-center p-3"><div class="spinner-border spinner-border-sm text-success"></div> Loading...</div>';

    // Load all data in parallel
    await Promise.all([
        loadComplianceStats(),
        loadPendingSection21(),
        loadApprovedSection21(),
        loadExpiringDocuments()
    ]);
}

// ==================== STATS ====================

async function loadComplianceStats() {
    try {
        const [statsData, statusData] = await Promise.all([
            apiCall('/section21/compliance-stats').catch(() => ({})),
            apiCall('/compliance/section21/status').catch(() => ({}))
        ]);

        const stats = statsData.stats || statsData;
        const status = statusData.status || statusData;

        const totalPatients = stats.totalPatients || status.totalPatients || status.total || 0;
        const activePrescriptions = stats.activePrescriptions || status.activeCount || status.active || 0;
        const expiringCount = stats.expiringThisMonth || stats.expiringSoon || status.expiringSoon || 0;
        const complianceRate = stats.complianceRate || status.complianceRate || status.rate || 0;

        // Update stats cards
        _setEl('compStatTotal', totalPatients);
        _setEl('compStatActive', activePrescriptions);
        _setEl('compStatExpiring', expiringCount);
        _setEl('compStatRate', complianceRate + '%');

        // Color the compliance rate
        const rateEl = document.getElementById('compStatRate');
        if (rateEl) {
            const parent = rateEl.closest('.comp-stat-card');
            if (parent) {
                if (complianceRate >= 80) parent.style.borderColor = 'var(--green)';
                else if (complianceRate >= 50) parent.style.borderColor = 'var(--gold)';
                else parent.style.borderColor = 'var(--red)';
            }
        }
    } catch (err) {
        console.error('Error loading compliance stats:', err);
    }
}

// ==================== PENDING DOCUMENTS ====================

async function loadPendingSection21() {
    const container = document.getElementById('pendingSection21');
    if (!container) return;

    try {
        const data = await apiCall('/section21/admin/pending');
        const documents = Array.isArray(data) ? data : (data.documents || data.pending || []);

        if (documents.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-check-circle" style="font-size:2rem;color:var(--green);opacity:0.5;"></i>
                    <p class="mt-2 mb-0">No pending approvals</p>
                </div>
            `;
            return;
        }

        container.innerHTML = documents.map(doc => {
            const userName = doc.userName || doc.patientName || doc.email || 'Unknown';
            const docType = doc.documentType || doc.type || 'Section 21 Authorization';
            const submittedDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : 'Unknown';
            const expiryDate = doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : 'N/A';

            return `
                <div style="border:1px solid rgba(63, 192, 65,0.15);border-radius:8px;padding:12px;margin-bottom:10px;border-left:4px solid var(--red);">
                    <div class="d-flex justify-content-between align-items-start">
                        <div>
                            <strong style="color:var(--green-dark);">${userName}</strong>
                            <br><small class="text-muted">${docType}</small>
                            <br><small class="text-muted">Submitted: ${submittedDate} | Expires: ${expiryDate}</small>
                        </div>
                        <div class="d-flex gap-1">
                            <button class="btn btn-sm btn-outline-primary" onclick="viewSection21Document('${doc._id}')" title="View">
                                <i class="fas fa-eye"></i>
                            </button>
                            <button class="btn btn-sm btn-success" onclick="approveSection21('${doc._id}')" title="Approve">
                                <i class="fas fa-check"></i>
                            </button>
                            <button class="btn btn-sm btn-outline-danger" onclick="rejectSection21('${doc._id}')" title="Reject">
                                <i class="fas fa-times"></i>
                            </button>
                        </div>
                    </div>
                </div>
            `;
        }).join('');
    } catch (err) {
        console.error('Error loading pending Section 21:', err);
        container.innerHTML = `
            <div class="text-center text-muted py-3">
                <i class="fas fa-inbox" style="font-size:1.5rem;opacity:0.5;"></i>
                <p class="mt-2 mb-0">No pending documents found</p>
            </div>
        `;
    }
}

// ==================== APPROVED DOCUMENTS ====================

async function loadApprovedSection21() {
    const container = document.getElementById('approvedSection21');
    if (!container) return;

    try {
        // Try to get approved documents — use expiring endpoint to get those with dates
        const expiringData = await apiCall('/section21/admin/expiring').catch(() => []);

        // Also try compliance stats for approved users list
        let approvedDocs = [];
        try {
            const statsData = await apiCall('/section21/compliance-stats');
            approvedDocs = statsData.approvedUsers || statsData.approved || [];
        } catch (_) {
            // Fall back to expiring data
        }

        const expiring = Array.isArray(expiringData) ? expiringData : (expiringData.documents || expiringData.expiring || []);

        // Merge — show all approved with expiry status
        const allDocs = approvedDocs.length > 0 ? approvedDocs : expiring;

        if (allDocs.length === 0) {
            container.innerHTML = `
                <div class="text-center text-muted py-4">
                    <i class="fas fa-users" style="font-size:2rem;opacity:0.5;"></i>
                    <p class="mt-2 mb-0">No approved users yet</p>
                </div>
            `;
            return;
        }

        container.innerHTML = `
            <div style="max-height:350px;overflow-y:auto;">
                ${allDocs.map(doc => {
                    const userName = doc.userName || doc.patientName || doc.email || 'Unknown';
                    const expiryDate = doc.expiryDate ? new Date(doc.expiryDate) : null;
                    const daysLeft = doc.daysUntilExpiry || (expiryDate ? _compDaysUntil(expiryDate) : null);
                    let expiryBadge = '';
                    if (daysLeft !== null) {
                        if (daysLeft <= 0) {
                            expiryBadge = '<span class="badge bg-danger">Expired</span>';
                        } else if (daysLeft <= 7) {
                            expiryBadge = `<span class="badge bg-danger">${daysLeft}d left</span>`;
                        } else if (daysLeft <= 30) {
                            expiryBadge = `<span class="badge bg-warning text-dark">${daysLeft}d left</span>`;
                        } else {
                            expiryBadge = `<span class="badge bg-success">${daysLeft}d left</span>`;
                        }
                    }

                    return `
                        <div class="d-flex justify-content-between align-items-center py-2 border-bottom">
                            <div>
                                <strong>${userName}</strong>
                                ${expiryDate ? `<br><small class="text-muted">Expires: ${expiryDate.toLocaleDateString()}</small>` : ''}
                            </div>
                            <div>${expiryBadge}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        console.error('Error loading approved Section 21:', err);
        container.innerHTML = '<div class="text-muted text-center py-3">Unable to load approved users</div>';
    }
}

// ==================== EXPIRING DOCUMENTS ALERT ====================

async function loadExpiringDocuments() {
    const banner = document.getElementById('compExpiringBanner');
    if (!banner) return;

    try {
        const data = await apiCall('/section21/admin/expiring');
        const expiring = Array.isArray(data) ? data : (data.documents || data.expiring || []);

        if (expiring.length === 0) {
            banner.style.display = 'none';
            return;
        }

        banner.style.display = 'block';
        banner.innerHTML = `
            <div class="d-flex justify-content-between align-items-center">
                <div>
                    <i class="fas fa-exclamation-triangle" style="color:var(--red);"></i>
                    <strong>${expiring.length} Section 21 document${expiring.length > 1 ? 's' : ''} expiring within 30 days</strong>
                </div>
                <button class="btn btn-sm btn-outline-danger" onclick="toggleExpiringList()">
                    <i class="fas fa-chevron-down" id="expiringChevron"></i> Details
                </button>
            </div>
            <div id="expiringListDetail" style="display:none;margin-top:12px;">
                ${expiring.map(d => {
                    const daysLeft = d.daysUntilExpiry || _compDaysUntil(new Date(d.expiryDate));
                    return `
                        <div class="d-flex justify-content-between align-items-center py-1 border-bottom">
                            <span>${d.userName || d.patientName || d.email || '-'}</span>
                            <span class="badge ${daysLeft <= 7 ? 'bg-danger' : 'bg-warning text-dark'}">${daysLeft} days</span>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    } catch (err) {
        console.error('Error loading expiring docs:', err);
        banner.style.display = 'none';
    }
}

function toggleExpiringList() {
    const detail = document.getElementById('expiringListDetail');
    const chevron = document.getElementById('expiringChevron');
    if (!detail) return;

    const isHidden = detail.style.display === 'none';
    detail.style.display = isHidden ? 'block' : 'none';
    if (chevron) {
        chevron.className = isHidden ? 'fas fa-chevron-up' : 'fas fa-chevron-down';
    }
}

// ==================== APPROVE / REJECT ====================

async function approveSection21(docId) {
    const notes = await _compPrompt('Approval Notes', 'Optional notes for this approval:');
    if (notes === null) return; // User cancelled

    try {
        // Decode JWT to get admin ID for the request
        const token = getToken();
        let adminId = '';
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            adminId = payload.id || payload.userId || payload._id || '';
        } catch (_) {}

        await apiCall('/section21/admin/approve/' + docId, 'POST', {
            adminId: adminId,
            notes: notes || 'Approved by inventory manager'
        });

        showToast('success', 'Document approved successfully');
        loadComplianceSection();
    } catch (err) {
        console.error('Error approving document:', err);
        showToast('error', err.message || 'Failed to approve document');
    }
}

async function rejectSection21(docId) {
    const reason = await _compPrompt('Rejection Reason', 'Please provide a reason for rejection (required):');
    if (reason === null) return; // User cancelled

    if (!reason.trim()) {
        showToast('error', 'A reason is required to reject a document');
        return;
    }

    try {
        const token = getToken();
        let adminId = '';
        try {
            const payload = JSON.parse(atob(token.split('.')[1]));
            adminId = payload.id || payload.userId || payload._id || '';
        } catch (_) {}

        await apiCall('/section21/admin/reject/' + docId, 'POST', {
            adminId: adminId,
            reason: reason
        });

        showToast('success', 'Document rejected');
        loadComplianceSection();
    } catch (err) {
        console.error('Error rejecting document:', err);
        showToast('error', err.message || 'Failed to reject document');
    }
}

// ==================== VIEW DOCUMENT ====================

async function viewSection21Document(docId) {
    document.getElementById('compDocModal')?.remove();

    try {
        // Fetch document details
        const data = await apiCall('/section21/' + docId).catch(() => null);
        const doc = data?.document || data || {};

        const userName = doc.userName || doc.patientName || doc.email || 'Unknown';
        const docType = doc.documentType || doc.type || 'Section 21 Authorization';
        const status = doc.status || 'pending';
        const submittedDate = doc.createdAt ? new Date(doc.createdAt).toLocaleDateString() : '-';
        const expiryDate = doc.expiryDate ? new Date(doc.expiryDate).toLocaleDateString() : '-';
        const notes = doc.notes || doc.adminNotes || '';
        const fileUrl = doc.fileUrl || doc.documentUrl || '';

        const statusBadge = {
            'approved': '<span class="badge bg-success">Approved</span>',
            'rejected': '<span class="badge bg-danger">Rejected</span>',
            'pending': '<span class="badge bg-warning text-dark">Pending</span>',
            'expired': '<span class="badge bg-secondary">Expired</span>'
        }[status] || `<span class="badge bg-secondary">${status}</span>`;

        const modal = document.createElement('div');
        modal.id = 'compDocModal';
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1060;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:12px;width:100%;max-width:550px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="background:var(--red);color:white;padding:16px 20px;display:flex;justify-content:space-between;align-items:center;">
                    <h5 style="margin:0;font-family:'Barlow Condensed', sans-serif;font-size:1.2rem;"><i class="fas fa-file-medical"></i> Section 21 Document</h5>
                    <button onclick="document.getElementById('compDocModal').remove()" style="background:none;border:none;color:white;font-size:1.3rem;cursor:pointer;"><i class="fas fa-times"></i></button>
                </div>
                <div style="padding:20px;">
                    <table class="table table-sm mb-3">
                        <tr><td class="fw-bold" style="width:40%;">Patient</td><td>${userName}</td></tr>
                        <tr><td class="fw-bold">Document Type</td><td>${docType}</td></tr>
                        <tr><td class="fw-bold">Status</td><td>${statusBadge}</td></tr>
                        <tr><td class="fw-bold">Submitted</td><td>${submittedDate}</td></tr>
                        <tr><td class="fw-bold">Expires</td><td>${expiryDate}</td></tr>
                        ${notes ? `<tr><td class="fw-bold">Notes</td><td>${notes}</td></tr>` : ''}
                    </table>
                    ${fileUrl ? `
                        <a href="${fileUrl}" target="_blank" class="btn btn-green w-100">
                            <i class="fas fa-external-link-alt"></i> View Document File
                        </a>
                    ` : '<p class="text-muted text-center"><i class="fas fa-info-circle"></i> No document file attached</p>'}
                </div>
            </div>
        `;

        modal.addEventListener('click', function(e) {
            if (e.target === modal) modal.remove();
        });

        document.body.appendChild(modal);
    } catch (err) {
        console.error('Error viewing document:', err);
        showToast('error', 'Failed to load document details');
    }
}

// ==================== HELPERS ====================

function _setEl(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function _compDaysUntil(date) {
    if (!date) return 0;
    const now = new Date();
    const target = date instanceof Date ? date : new Date(date);
    return Math.max(0, Math.ceil((target - now) / (1000 * 60 * 60 * 24)));
}

// Branded prompt modal (replaces browser prompt)
function _compPrompt(title, message) {
    return new Promise(function(resolve) {
        document.getElementById('compPromptModal')?.remove();

        const modal = document.createElement('div');
        modal.id = 'compPromptModal';
        modal.style.cssText = 'display:flex;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.5);z-index:1070;align-items:center;justify-content:center;padding:20px;';
        modal.innerHTML = `
            <div style="background:#fff;border-radius:12px;width:100%;max-width:450px;overflow:hidden;box-shadow:0 20px 60px rgba(0,0,0,0.3);">
                <div style="background:var(--green);color:var(--cream);padding:14px 20px;">
                    <h5 style="margin:0;font-family:'Barlow Condensed', sans-serif;font-size:1.1rem;">${title}</h5>
                </div>
                <div style="padding:20px;">
                    <p style="margin:0 0 12px;font-size:0.9rem;color:#666;">${message}</p>
                    <textarea id="compPromptInput" class="form-control" rows="3" style="border-radius:8px;"></textarea>
                    <div class="d-flex gap-2 mt-3">
                        <button class="btn btn-outline-secondary flex-fill" id="compPromptCancel">Cancel</button>
                        <button class="btn btn-green flex-fill" id="compPromptOk">OK</button>
                    </div>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        document.getElementById('compPromptInput').focus();

        document.getElementById('compPromptOk').onclick = function() {
            const value = document.getElementById('compPromptInput').value;
            modal.remove();
            resolve(value);
        };
        document.getElementById('compPromptCancel').onclick = function() {
            modal.remove();
            resolve(null);
        };
        modal.addEventListener('click', function(e) {
            if (e.target === modal) {
                modal.remove();
                resolve(null);
            }
        });
    });
}
