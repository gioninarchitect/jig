// ===== POS AUTH MODULE =====
// Authentication, login, logout, branch selection for POS terminal

// Roles that can select any branch (not locked to primaryBranch)
const MULTI_BRANCH_ROLES = ['super_admin', 'owner', 'admin'];
const POS_ALLOWED_ROLES = ['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant', 'pharmacy_admin', 'responsible_pharmacist', 'pharmacist', 'pharmacy_assistant'];

// Initialize
document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    loadProducts();
});

async function checkAuth() {
    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
    const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
    const uid = user.id || user._id;

    if (!token || !uid) {
        document.getElementById('posLoginScreen').style.display = 'flex';
        return;
    }

    // Persist to BOTH storages so navigating to day-end.html and back never logs out
    // (OTP/keyboard login previously only set sessionStorage; day-end reads localStorage)
    sessionStorage.setItem('adminToken', token);
    sessionStorage.setItem('user', JSON.stringify(user));
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(user));

    document.getElementById('userName').textContent = user.firstName || 'Assistant';

    // Check if branch already selected this session
    const selectedBranch = JSON.parse(sessionStorage.getItem('selectedBranch') || 'null');

    if (selectedBranch) {
        // Branch already picked — use it
        setBranchDisplay(selectedBranch.name);
        setupBranchSwitcher(user);
        return;
    }

    // No branch selected yet — determine workflow based on role
    if (MULTI_BRANCH_ROLES.includes(user.role)) {
        // Owner/admin/super_admin: must pick a branch
        await showBranchSelector(token);
    } else {
        // Staff: auto-detect from primaryBranch
        await autoDetectBranch(user, token);
    }
}

// Auto-detect branch for staff roles (branch_manager, branch_assistant, etc.)
async function autoDetectBranch(user, token) {
    const branchId = user.primaryBranch?._id || user.primaryBranch;

    if (!branchId) {
        setBranchDisplay('No branch assigned');
        showToast('No Branch', 'Ask your manager to assign you to a branch', 'error');
        return;
    }

    // If we already have the name from login response
    if (user.primaryBranch?.name) {
        const branch = { _id: user.primaryBranch._id, name: user.primaryBranch.name };
        sessionStorage.setItem('selectedBranch', JSON.stringify(branch));
        setBranchDisplay(branch.name);
        return;
    }

    // Fetch branch name from API
    try {
        const res = await fetch(`${API_URL}/branches/${branchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const branchData = data.branch || data.data || data;
            const branch = { _id: branchId, name: branchData.name || 'Unknown' };
            sessionStorage.setItem('selectedBranch', JSON.stringify(branch));
            setBranchDisplay(branch.name);
        }
    } catch (e) {
        setBranchDisplay('Potchefstroom');
        sessionStorage.setItem('selectedBranch', JSON.stringify({ _id: branchId, name: 'Potchefstroom' }));
    }
}

// Show branch selector modal for owner/admin/super_admin
async function showBranchSelector(token) {
    const listEl = document.getElementById('branchSelectList');
    listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #999;"><i class="fas fa-spinner fa-spin"></i> Loading branches...</div>';
    document.getElementById('branchSelectModal').style.display = 'flex';

    try {
        const res = await fetch(`${API_URL}/branches`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const data = await res.json();

        const branches = data.branches || data.data || data || [];

        if (!branches.length) {
            listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #c00;">No branches found. Create a branch first.</div>';
            return;
        }

        listEl.innerHTML = '';
        branches.forEach(branch => {
            if (!branch.isActive && branch.isActive !== undefined) return;

            const btn = document.createElement('button');
            btn.style.cssText = 'display: flex; align-items: center; gap: 14px; width: 100%; padding: 16px 18px; border: 2px solid #333; border-radius: 12px; background: #1A1A1A; cursor: pointer; text-align: left; transition: all 0.15s ease;';
            btn.innerHTML = `
                <div style="width: 44px; height: 44px; border-radius: 10px; background: rgba(63,192,65,0.15); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas fa-store" style="color: var(--or-gold, #C9A84C); font-size: 1.1rem;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="font-weight: 700; color: #FAFAFA; font-size: 1.05rem;">${branch.name}</div>
                    <div style="font-size: 0.85rem; color: #999; margin-top: 2px;">${branch.branchCode || ''} ${branch.address?.city || branch.address?.suburb ? '- ' + (branch.address?.city || branch.address?.suburb) : ''}</div>
                </div>
                <i class="fas fa-chevron-right" style="color: #666;"></i>
            `;

            btn.onmouseenter = () => { btn.style.borderColor = 'var(--or-gold, #C9A84C)'; btn.style.background = '#222'; };
            btn.onmouseleave = () => { btn.style.borderColor = '#333'; btn.style.background = '#1A1A1A'; };

            btn.onclick = () => selectBranch(branch);
            listEl.appendChild(btn);
        });

    } catch (error) {
        listEl.innerHTML = '<div style="text-align: center; padding: 20px; color: #c00;">Failed to load branches. Check your connection.</div>';
    }
}

// User picked a branch
function selectBranch(branch) {
    const selected = { _id: branch._id, name: branch.name };
    sessionStorage.setItem('selectedBranch', JSON.stringify(selected));
    setBranchDisplay(branch.name);
    document.getElementById('branchSelectModal').style.display = 'none';

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    setupBranchSwitcher(user);

    showToast('Branch Set', `Working from ${branch.name}`, 'success');

    // Trigger shift/till checks now that branch is set
    checkShiftStatus();
    checkTillStatus();
}

// Set branch name in header
function setBranchDisplay(name) {
    document.getElementById('branchName').textContent = name;
}

// Allow admin/owner to switch branches by clicking header
function setupBranchSwitcher(user) {
    if (MULTI_BRANCH_ROLES.includes(user.role)) {
        const headerBranch = document.getElementById('headerBranch');
        const switchIcon = document.getElementById('branchSwitchIcon');
        if (headerBranch) {
            headerBranch.style.cursor = 'pointer';
            headerBranch.onclick = () => {
                const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
                showBranchSelector(token);
            };
        }
        if (switchIcon) switchIcon.style.display = 'inline';
    }
}

// Helper: get the selected branch ID (used by shifts, checkout, etc.)
function getSelectedBranchId() {
    const branch = JSON.parse(sessionStorage.getItem('selectedBranch') || 'null');
    return branch?._id || null;
}

// ==========================================
// POS LOGIN FUNCTIONS
// ==========================================
async function posLoginWithPin() {
    const email = document.getElementById('posLoginEmail').value.trim();
    const pin = document.getElementById('posLoginPin').value.trim();
    const errorDiv = document.getElementById('posLoginError');

    if (!email || !pin || pin.length !== 6) {
        errorDiv.textContent = 'Please enter email and 6-digit PIN';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/otp/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
        });

        const data = await response.json();

        if (data.success) {
            if (!POS_ALLOWED_ROLES.includes(data.user?.role)) {
                errorDiv.textContent = 'Access denied. POS staff access required.';
                errorDiv.style.display = 'block';
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('adminToken', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            document.getElementById('posLoginScreen').style.display = 'none';

            // Check if profile needs completing (first-time login)
            if (!data.user.firstName || data.user.firstName === 'New' || !data.user.lastName || data.user.lastName === 'User') {
                showPosOnboarding(data.user, data.token);
                return;
            }

            document.getElementById('userName').textContent = data.user.firstName || 'Assistant';

            // Clear any previous branch selection
            sessionStorage.removeItem('selectedBranch');

            // Run auth flow (will show branch selector for admin/owner)
            await checkAuth();
            loadProducts();
            checkShiftStatus();
            checkTillStatus();
        } else {
            errorDiv.textContent = data.message || 'Invalid PIN';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

async function posRequestOTP() {
    const email = document.getElementById('posLoginEmail').value.trim();
    const errorDiv = document.getElementById('posLoginError');
    const btn = document.getElementById('posOtpBtn');

    if (!email) {
        errorDiv.textContent = 'Please enter your email address';
        errorDiv.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';

    try {
        const response = await fetch(`${API_URL}/auth/otp/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('posOtpSection').style.display = 'block';
            errorDiv.style.display = 'none';
        } else {
            errorDiv.textContent = data.message || 'Failed to send OTP';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send OTP Code';
}

async function posVerifyOTP() {
    const email = document.getElementById('posLoginEmail').value.trim();
    const otp = document.getElementById('posOtpCode').value.trim();
    const errorDiv = document.getElementById('posLoginError');

    if (!otp || otp.length !== 6) {
        errorDiv.textContent = 'Please enter the 6-digit OTP code';
        errorDiv.style.display = 'block';
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, otp_code: otp })
        });

        const data = await response.json();

        if (data.success) {
            if (!POS_ALLOWED_ROLES.includes(data.user?.role)) {
                errorDiv.textContent = 'Access denied. POS staff access required.';
                errorDiv.style.display = 'block';
                return;
            }

            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('adminToken', data.token);
            sessionStorage.setItem('user', JSON.stringify(data.user));
            document.getElementById('posLoginScreen').style.display = 'none';

            // Check if profile needs completing (first-time login)
            if (!data.user.firstName || data.user.firstName === 'New' || !data.user.lastName || data.user.lastName === 'User') {
                showPosOnboarding(data.user, data.token);
                return;
            }

            document.getElementById('userName').textContent = data.user.firstName || 'Assistant';

            // Clear any previous branch selection
            sessionStorage.removeItem('selectedBranch');

            await checkAuth();
            loadProducts();
            checkShiftStatus();
            checkTillStatus();
        } else {
            errorDiv.textContent = data.message || 'Invalid OTP';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    }
}

// Check shift status on load
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(checkShiftStatus, 1000);
    setTimeout(checkTillStatus, 1500);
});

function logout() {
    // RULE: logging out must NOT close the day's till session or clock the user out.
    // The till stays open until an explicit Day End cashup. Logout only clears this device's session.
    sessionStorage.removeItem('token');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('selectedBranch');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    // Return to the POS's own inline login (has the on-screen keyboard)
    window.location.href = '/pos.html';
}

// ==========================================
// POS ONBOARDING — First-time staff setup
// ==========================================
function showPosOnboarding(user, token) {
    document.getElementById('posOnboardingOverlay')?.remove();

    const branchName = user.primaryBranch?.name || 'Origin by ILCO Farming';
    const roleName = user.role === 'branch_manager' ? 'Branch Manager' : user.role === 'branch_assistant' ? 'Branch Assistant' : user.role || 'Staff';

    // Store user/token for shift start
    window._obUser = user;
    window._obToken = token;

    const overlay = document.createElement('div');
    overlay.id = 'posOnboardingOverlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;right:0;bottom:0;background:linear-gradient(135deg,var(--green-deep,#0E0E0E) 0%,var(--green-dark,#8B6914) 100%);z-index:99999;display:flex;align-items:center;justify-content:center;overflow-y:auto;padding:20px;';

    overlay.innerHTML = `
        <div style="background:white;border-radius:16px;width:100%;max-width:420px;box-shadow:0 20px 60px rgba(0,0,0,0.3);overflow:hidden;">
            <!-- Step indicators -->
            <div style="background:var(--green,#C9A84C);padding:12px 20px;display:flex;gap:8px;justify-content:center;">
                <div id="obStep1Dot" style="width:10px;height:10px;border-radius:50%;background:var(--gold,#C9A84C);"></div>
                <div id="obStep2Dot" style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.3);"></div>
                <div id="obStep3Dot" style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.3);"></div>
                <div id="obStep4Dot" style="width:10px;height:10px;border-radius:50%;background:rgba(255,255,255,0.3);"></div>
            </div>

            <!-- Step 1: Welcome -->
            <div id="obStep1" style="padding:30px;text-align:center;">
                <div style="width:70px;height:70px;border-radius:50%;background:var(--cream,#0E0E0E);display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                    <i class="fas fa-hand-peace" style="font-size:2rem;color:var(--green,#C9A84C);"></i>
                </div>
                <h2 style="font-family:'Barlow Condensed', sans-serif;font-size:1.6rem;color:var(--green-deep,#8B6914);margin:0 0 8px;">Welcome to ${branchName}</h2>
                <p style="color:#666;font-size:0.95rem;margin:0 0 6px;">You are logged in as <strong>${roleName}</strong></p>
                <p style="color:#999;font-size:0.85rem;margin:0 0 30px;">Before you start, we need a few details from you. This only takes a moment.</p>
                <button onclick="posOnboardingNext(2)" style="width:100%;padding:15px;background:var(--green,#C9A84C);color:white;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;">
                    Let's Go <i class="fas fa-arrow-right" style="margin-left:8px;"></i>
                </button>
            </div>

            <!-- Step 2: Your Details -->
            <div id="obStep2" style="padding:30px;display:none;">
                <h2 style="font-family:'Barlow Condensed', sans-serif;font-size:1.4rem;color:var(--green-deep,#8B6914);margin:0 0 4px;">Your Details</h2>
                <p style="color:#888;font-size:0.85rem;margin:0 0 20px;">So we know who you are on receipts and reports</p>

                <div id="obError" style="display:none;background:#fee;color:#c00;padding:10px;border-radius:8px;margin-bottom:15px;font-size:0.85rem;"></div>

                <label style="display:block;margin-bottom:4px;font-weight:600;color:var(--green-deep,#8B6914);font-size:0.9rem;">First Name</label>
                <input type="text" id="obFirstName" placeholder="e.g. Thabo" autocomplete="given-name" style="width:100%;padding:12px;border:2px solid #222222;border-radius:8px;font-size:1rem;margin-bottom:14px;box-sizing:border-box;">

                <label style="display:block;margin-bottom:4px;font-weight:600;color:var(--green-deep,#8B6914);font-size:0.9rem;">Last Name</label>
                <input type="text" id="obLastName" placeholder="e.g. Molefe" autocomplete="family-name" style="width:100%;padding:12px;border:2px solid #222222;border-radius:8px;font-size:1rem;margin-bottom:14px;box-sizing:border-box;">

                <label style="display:block;margin-bottom:4px;font-weight:600;color:var(--green-deep,#8B6914);font-size:0.9rem;">Mobile Number</label>
                <input type="tel" id="obMobile" placeholder="e.g. 071 234 5678" autocomplete="tel" inputmode="tel" style="width:100%;padding:12px;border:2px solid #222222;border-radius:8px;font-size:1rem;margin-bottom:20px;box-sizing:border-box;">

                <button id="obSaveBtn" onclick="posOnboardingSave()" style="width:100%;padding:15px;background:var(--green,#C9A84C);color:white;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;">
                    <i class="fas fa-check"></i> Save & Continue
                </button>
            </div>

            <!-- Step 3: Start Your Shift -->
            <div id="obStep3" style="padding:30px;display:none;">
                <div style="text-align:center;margin-bottom:20px;">
                    <div style="width:70px;height:70px;border-radius:50%;background:var(--cream,#0E0E0E);display:flex;align-items:center;justify-content:center;margin:0 auto 16px;">
                        <i class="fas fa-clock" style="font-size:2rem;color:var(--green,#C9A84C);"></i>
                    </div>
                    <h2 style="font-family:'Barlow Condensed', sans-serif;font-size:1.4rem;color:var(--green-deep,#8B6914);margin:0 0 4px;">Start Your Shift</h2>
                    <p style="color:#888;font-size:0.85rem;margin:0;">Clock in and open the till to start selling</p>
                </div>

                <div id="obShiftError" style="display:none;background:#fee;color:#c00;padding:10px;border-radius:8px;margin-bottom:15px;font-size:0.85rem;"></div>

                <div style="background:var(--cream,#0E0E0E);border-radius:10px;padding:14px;margin-bottom:16px;">
                    <div style="display:flex;align-items:center;gap:10px;">
                        <i class="fas fa-store" style="color:var(--green,#C9A84C);font-size:1.1rem;"></i>
                        <div>
                            <div style="font-size:0.8rem;color:#888;">Branch</div>
                            <div id="obBranchName" style="font-weight:700;color:var(--green-deep,#8B6914);">${branchName}</div>
                        </div>
                    </div>
                </div>

                <label style="display:block;margin-bottom:4px;font-weight:600;color:var(--green-deep,#8B6914);font-size:0.9rem;">Opening Float (cash in till)</label>
                <div style="position:relative;margin-bottom:20px;">
                    <span style="position:absolute;left:12px;top:50%;transform:translateY(-50%);font-weight:700;color:var(--green-deep,#8B6914);">R</span>
                    <input type="number" id="obOpeningFloat" value="500" min="0" step="50" inputmode="numeric" style="width:100%;padding:12px 12px 12px 30px;border:2px solid #222222;border-radius:8px;font-size:1rem;box-sizing:border-box;">
                </div>

                <button id="obShiftBtn" onclick="posOnboardingStartShift()" style="width:100%;padding:15px;background:var(--gold,#C9A84C);color:var(--green-deep,#8B6914);border:none;border-radius:10px;font-size:1rem;font-weight:700;cursor:pointer;">
                    <i class="fas fa-play"></i> Clock In & Open Till
                </button>

                <button onclick="posOnboardingSkipShift()" style="width:100%;padding:10px;background:none;border:none;color:#999;font-size:0.85rem;cursor:pointer;margin-top:8px;">
                    Skip for now
                </button>
            </div>

            <!-- Step 4: Ready -->
            <div id="obStep4" style="padding:30px;text-align:center;display:none;">
                <div style="width:70px;height:70px;border-radius:50%;background:#e8f5e9;display:flex;align-items:center;justify-content:center;margin:0 auto 20px;">
                    <i class="fas fa-check-circle" style="font-size:2.5rem;color:var(--green,#C9A84C);"></i>
                </div>
                <h2 style="font-family:'Barlow Condensed', sans-serif;font-size:1.6rem;color:var(--green-deep,#8B6914);margin:0 0 8px;">You're All Set!</h2>
                <p id="obWelcomeName" style="color:#666;font-size:1rem;margin:0 0 8px;"></p>
                <p id="obShiftStatus" style="color:var(--green,#C9A84C);font-size:0.9rem;font-weight:600;margin:0 0 30px;"></p>
                <button onclick="posOnboardingComplete()" style="width:100%;padding:15px;background:var(--green,#C9A84C);color:white;border:none;border-radius:10px;font-size:1rem;font-weight:600;cursor:pointer;">
                    <i class="fas fa-cash-register"></i> Start Selling
                </button>
            </div>
        </div>
    `;

    document.body.appendChild(overlay);
}

function posOnboardingNext(step) {
    document.getElementById('obStep1').style.display = step === 1 ? 'block' : 'none';
    document.getElementById('obStep2').style.display = step === 2 ? 'block' : 'none';
    document.getElementById('obStep3').style.display = step === 3 ? 'block' : 'none';
    document.getElementById('obStep4').style.display = step === 4 ? 'block' : 'none';

    document.getElementById('obStep1Dot').style.background = step >= 1 ? 'var(--gold,#C9A84C)' : 'rgba(255,255,255,0.3)';
    document.getElementById('obStep2Dot').style.background = step >= 2 ? 'var(--gold,#C9A84C)' : 'rgba(255,255,255,0.3)';
    document.getElementById('obStep3Dot').style.background = step >= 3 ? 'var(--gold,#C9A84C)' : 'rgba(255,255,255,0.3)';
    document.getElementById('obStep4Dot').style.background = step >= 4 ? 'var(--gold,#C9A84C)' : 'rgba(255,255,255,0.3)';

    if (step === 2) {
        setTimeout(() => document.getElementById('obFirstName').focus(), 200);
    }
}

async function posOnboardingSave() {
    const firstName = document.getElementById('obFirstName').value.trim();
    const lastName = document.getElementById('obLastName').value.trim();
    const mobile = document.getElementById('obMobile').value.trim();
    const errorDiv = document.getElementById('obError');
    const btn = document.getElementById('obSaveBtn');

    if (!firstName || !lastName) {
        errorDiv.textContent = 'Please enter your first and last name';
        errorDiv.style.display = 'block';
        return;
    }

    if (!mobile) {
        errorDiv.textContent = 'Please enter your mobile number';
        errorDiv.style.display = 'block';
        return;
    }

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';

    try {
        const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
        const response = await fetch(`${API_URL}/auth/otp/update-profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify({ firstName, lastName, mobile })
        });

        const data = await response.json();

        if (data.success) {
            // Update stored user
            const user = JSON.parse(sessionStorage.getItem('user') || localStorage.getItem('user') || '{}');
            user.firstName = firstName;
            user.lastName = lastName;
            user.mobile = mobile;
            localStorage.setItem('user', JSON.stringify(user));
            sessionStorage.setItem('user', JSON.stringify(user));
            window._obUser = user;

            // Set up branch before shift step
            await posOnboardingSetupBranch(user);

            posOnboardingNext(3);
        } else {
            errorDiv.textContent = data.message || 'Failed to save. Please try again.';
            errorDiv.style.display = 'block';
        }
    } catch (err) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-check"></i> Save & Continue';
}

async function posOnboardingSetupBranch(user) {
    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
    const branchId = user.primaryBranch?._id || user.primaryBranch;

    if (!branchId) return;

    // If we have the branch name from the user object
    if (user.primaryBranch?.name) {
        const branch = { _id: user.primaryBranch._id, name: user.primaryBranch.name };
        sessionStorage.setItem('selectedBranch', JSON.stringify(branch));
        const nameEl = document.getElementById('obBranchName');
        if (nameEl) nameEl.textContent = branch.name;
        return;
    }

    // Fetch branch name from API
    try {
        const res = await fetch(`${API_URL}/branches/${branchId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            const data = await res.json();
            const branchData = data.branch || data.data || data;
            const branch = { _id: branchId, name: branchData.name || 'Origin' };
            sessionStorage.setItem('selectedBranch', JSON.stringify(branch));
            const nameEl = document.getElementById('obBranchName');
            if (nameEl) nameEl.textContent = branch.name;
        }
    } catch (e) {
        sessionStorage.setItem('selectedBranch', JSON.stringify({ _id: branchId, name: 'Origin' }));
    }
}

async function posOnboardingStartShift() {
    const btn = document.getElementById('obShiftBtn');
    const errorDiv = document.getElementById('obShiftError');
    const token = sessionStorage.getItem('adminToken') || localStorage.getItem('token');
    const branchId = getSelectedBranchId();
    const openingFloat = parseFloat(document.getElementById('obOpeningFloat').value) || 500;

    errorDiv.style.display = 'none';
    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Clocking in...';

    try {
        // Step 1: Clock in
        const clockRes = await fetch(`${API_URL}/staff-shifts/clock-in`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ branch: branchId })
        });
        const clockData = await clockRes.json();

        if (!clockData.success) {
            // If already clocked in, that's fine - continue
            if (clockData.message && clockData.message.toLowerCase().includes('already')) {
                console.log('Already clocked in, continuing...');
            } else {
                errorDiv.textContent = clockData.message || 'Failed to clock in';
                errorDiv.style.display = 'block';
                btn.disabled = false;
                btn.innerHTML = '<i class="fas fa-play"></i> Clock In & Open Till';
                return;
            }
        } else {
            currentShift = clockData.data;
        }

        btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Opening till...';

        // Step 2: Open till session
        const tillRes = await fetch(`${API_URL}/pos/till/open`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                branchId,
                tillNumber: 'TILL-01',
                openingFloat,
                openingNotes: 'Opened via onboarding'
            })
        });
        const tillData = await tillRes.json();

        if (tillData.success) {
            currentTillSession = tillData.session;
        } else {
            // Till might already be open — that's OK
            if (tillData.message && tillData.message.toLowerCase().includes('already')) {
                console.log('Till already open, continuing...');
            } else {
                console.log('Till open note:', tillData.message);
            }
        }

        // Move to step 4: ready
        const user = JSON.parse(sessionStorage.getItem('user') || '{}');
        document.getElementById('obWelcomeName').textContent = `Welcome, ${user.firstName}!`;
        document.getElementById('obShiftStatus').textContent = 'Clocked in & till open — ready to sell';
        posOnboardingNext(4);

    } catch (err) {
        errorDiv.textContent = 'Connection error. Try again.';
        errorDiv.style.display = 'block';
    }

    btn.disabled = false;
    btn.innerHTML = '<i class="fas fa-play"></i> Clock In & Open Till';
}

function posOnboardingSkipShift() {
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    document.getElementById('obWelcomeName').textContent = `Welcome, ${user.firstName}!`;
    document.getElementById('obShiftStatus').textContent = 'You can start your shift from the POS header';
    posOnboardingNext(4);
}

async function posOnboardingComplete() {
    document.getElementById('posOnboardingOverlay').remove();
    window._obUser = null;
    window._obToken = null;

    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    document.getElementById('userName').textContent = user.firstName || 'Assistant';

    // Branch should already be set from step 3
    const selectedBranch = JSON.parse(sessionStorage.getItem('selectedBranch') || 'null');
    if (selectedBranch) {
        setBranchDisplay(selectedBranch.name);
        setupBranchSwitcher(user);
    } else {
        // Fallback: run normal auth flow
        sessionStorage.removeItem('selectedBranch');
        await checkAuth();
    }

    loadProducts();
    checkShiftStatus();
    checkTillStatus();
}
