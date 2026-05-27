// ===== ADMIN AUTH & RBAC MODULE =====
// OTP authentication, login/logout, token management, RBAC

// Auth state
let adminToken = localStorage.getItem('adminToken') || sessionStorage.getItem('adminToken');
let currentEmail = '';
let countdownTimer = null;

// ===== OTP AUTHENTICATION FUNCTIONS =====
function getAdminToken() {
    return localStorage.getItem('adminToken');
}

function setAdminToken(newToken) {
    adminToken = newToken;
    localStorage.setItem('adminToken', newToken);
    sessionStorage.setItem('adminToken', newToken);
    localStorage.setItem('token', newToken);
}

function clearAdminAuth() {
    localStorage.removeItem('adminToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('adminToken');
    sessionStorage.removeItem('user');
    sessionStorage.removeItem('userEmail');
    sessionStorage.removeItem('userRole');
    adminToken = null;
}

function showAdminLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('adminContainer').classList.remove('visible');
    document.getElementById('adminContainer').style.display = 'none';

    // Reset login form
    document.getElementById('step-email').style.display = 'block';
    document.getElementById('step-email').classList.add('active');
    document.getElementById('step-otp').style.display = 'none';
    document.getElementById('step-otp').classList.remove('active');
    document.getElementById('loginEmail').value = '';

    // Show dev hint
    if (DEV_MODE) {
        document.getElementById('devHint').style.display = 'block';
    }
}

function showAdminDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('adminContainer').style.display = 'block';
    document.getElementById('adminContainer').classList.add('visible');
}

async function requestOTP(e) {
    e.preventDefault();
    const email = document.getElementById('loginEmail').value.trim();
    const btn = document.getElementById('requestOTPBtn');
    const errorDiv = document.getElementById('emailError');
    const successDiv = document.getElementById('emailSuccess');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    errorDiv.classList.remove('show');
    successDiv.classList.remove('show');

    try {
        const response = await fetch(`${API_URL}/auth/otp/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, purpose: 'login' })
        });

        const data = await response.json();

        if (data.success) {
            currentEmail = email;
            successDiv.textContent = 'Code sent! Check your email.';
            successDiv.classList.add('show');
            setTimeout(() => showOTPStep(), 1000);
        } else {
            errorDiv.textContent = data.message || 'Failed to send code';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('OTP request error:', error);
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Login Code';
    }
}

function showOTPStep() {
    document.getElementById('step-email').classList.remove('active');
    document.getElementById('step-email').style.display = 'none';
    document.getElementById('step-otp').classList.add('active');
    document.getElementById('step-otp').style.display = 'block';
    document.getElementById('displayEmail').textContent = currentEmail;

    document.querySelectorAll('#otpInputs input').forEach(input => input.value = '');
    document.querySelectorAll('#otpInputs input')[0].focus();

    startCountdown(60);
}

function goBackToEmail() {
    document.getElementById('step-otp').classList.remove('active');
    document.getElementById('step-otp').style.display = 'none';
    document.getElementById('step-email').classList.add('active');
    document.getElementById('step-email').style.display = 'block';
    clearInterval(countdownTimer);
}

function startCountdown(seconds) {
    let remaining = seconds;
    const countdownEl = document.getElementById('countdown');
    const timerText = document.getElementById('timerText');
    const resendLink = document.getElementById('resendLink');

    timerText.style.display = 'inline';
    resendLink.style.display = 'none';

    clearInterval(countdownTimer);
    countdownTimer = setInterval(() => {
        remaining--;
        countdownEl.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(countdownTimer);
            timerText.style.display = 'none';
            resendLink.style.display = 'inline';
        }
    }, 1000);
}

async function resendOTP() {
    const resendLink = document.getElementById('resendLink');
    resendLink.textContent = 'Sending...';
    resendLink.style.pointerEvents = 'none';

    try {
        const response = await fetch(`${API_URL}/auth/otp/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, purpose: 'login' })
        });

        const data = await response.json();

        if (data.success) {
            document.getElementById('otpSuccess').textContent = 'New code sent!';
            document.getElementById('otpSuccess').classList.add('show');
            startCountdown(60);
        } else {
            document.getElementById('otpError').textContent = data.message;
            document.getElementById('otpError').classList.add('show');
        }
    } catch (error) {
        document.getElementById('otpError').textContent = 'Failed to resend code';
        document.getElementById('otpError').classList.add('show');
    }

    resendLink.textContent = 'Resend Code';
    resendLink.style.pointerEvents = 'auto';
}

async function verifyOTP(e) {
    e.preventDefault();
    const inputs = document.querySelectorAll('#otpInputs input');
    const otp = Array.from(inputs).map(i => i.value).join('');

    if (otp.length !== 6) {
        document.getElementById('otpError').textContent = 'Please enter all 6 digits';
        document.getElementById('otpError').classList.add('show');
        return;
    }

    const btn = document.getElementById('verifyOTPBtn');
    const errorDiv = document.getElementById('otpError');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    errorDiv.classList.remove('show');

    try {
        const response = await fetch(`${API_URL}/auth/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, otpCode: otp })
        });

        const data = await response.json();

        if (data.success) {
            // Check role - must be staff/admin
            const allowedRoles = ['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant', 'inventory_manager', 'packer', 'dispatch_manager', 'staff_manager', 'pharmacy_admin', 'responsible_pharmacist', 'pharmacist', 'pharmacy_assistant'];
            if (!allowedRoles.includes(data.user.role)) {
                errorDiv.textContent = 'Access denied. Staff access required.';
                errorDiv.classList.add('show');
                inputs.forEach(i => i.value = '');
                inputs[0].focus();
                return;
            }

            setAdminToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('userEmail', data.user.email);
            sessionStorage.setItem('userRole', data.user.role);

            showAdminToast('Login Successful', 'Welcome back!', 'success');
            showAdminDashboard();
            initAdminDashboard(data.user);
        } else {
            errorDiv.textContent = data.message || 'Invalid code';
            errorDiv.classList.add('show');
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
        }
    } catch (error) {
        console.error('OTP verify error:', error);
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Verify & Login';
    }
}

function setupOTPInputs() {
    const inputs = document.querySelectorAll('#otpInputs input');
    inputs.forEach((input, index) => {
        input.addEventListener('input', (e) => {
            const value = e.target.value;
            if (value.length === 1 && index < inputs.length - 1) {
                inputs[index + 1].focus();
            }
        });

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Backspace' && !e.target.value && index > 0) {
                inputs[index - 1].focus();
            }
        });

        input.addEventListener('paste', (e) => {
            e.preventDefault();
            const pasteData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
            pasteData.split('').forEach((char, i) => {
                if (inputs[i]) inputs[i].value = char;
            });
            if (pasteData.length === 6) {
                inputs[5].focus();
                setTimeout(() => verifyOTP({ preventDefault: () => {} }), 100);
            }
        });
    });
}

async function loginWithPin(e) {
    e.preventDefault();
    const email = document.getElementById('pinEmail').value.trim();
    const pin = document.getElementById('pinInput').value.trim();
    const btn = document.getElementById('pinLoginBtn');
    const errorDiv = document.getElementById('pinError');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    errorDiv.classList.remove('show');

    try {
        const response = await fetch(`${API_URL}/auth/otp/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
        });

        const data = await response.json();

        if (data.success) {
            const allowedRoles = ['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant', 'inventory_manager', 'packer', 'dispatch_manager', 'staff_manager', 'pharmacy_admin', 'responsible_pharmacist', 'pharmacist', 'pharmacy_assistant'];
            if (!allowedRoles.includes(data.user.role)) {
                errorDiv.textContent = 'Access denied. Staff access required.';
                errorDiv.classList.add('show');
                return;
            }

            setAdminToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('userEmail', data.user.email);
            sessionStorage.setItem('userRole', data.user.role);
            showAdminToast('Login Successful', 'Welcome back!', 'success');
            showAdminDashboard();
            initAdminDashboard(data.user);
        } else {
            errorDiv.textContent = data.message || 'Invalid PIN';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> Login with PIN';
    }
}

function togglePinVisibility(inputId, toggleBtn) {
    const input = document.getElementById(inputId);
    if (input.type === 'password') {
        input.type = 'text';
        toggleBtn.innerHTML = '<i class="fas fa-eye-slash"></i>';
    } else {
        input.type = 'password';
        toggleBtn.innerHTML = '<i class="fas fa-eye"></i>';
    }
}

async function checkAdminAuth() {
    if (!adminToken) {
        showAdminLogin();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/otp/me`, {
            headers: { 'Authorization': `Bearer ${adminToken}` }
        });

        const data = await response.json();

        if (data.success && data.user) {
            // Check role
            const allowedRoles = ['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant', 'inventory_manager', 'packer', 'dispatch_manager', 'staff_manager', 'pharmacy_admin', 'responsible_pharmacist', 'pharmacist', 'pharmacy_assistant'];
            if (!allowedRoles.includes(data.user.role)) {
                clearAdminAuth();
                showAdminLogin();
                return;
            }

            localStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('user', JSON.stringify(data.user));
            sessionStorage.setItem('userEmail', data.user.email);
            sessionStorage.setItem('userRole', data.user.role);

            showAdminDashboard();
            initAdminDashboard(data.user);
        } else if (response.status === 401 || response.status === 403) {
            clearAdminAuth();
            showAdminLogin();
        } else {
            // Try to use stored user
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                const user = JSON.parse(storedUser);
                showAdminDashboard();
                initAdminDashboard(user);
            } else {
                showAdminLogin();
            }
        }
    } catch (error) {
        // Network error - try stored user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            const user = JSON.parse(storedUser);
            showAdminDashboard();
            initAdminDashboard(user);
        } else {
            showAdminLogin();
        }
    }
}

function initAdminDashboard(user) {
    console.log('[RBAC] User role:', user.role);

    // Update email display
    const emailElement = document.getElementById('adminEmail');
    if (emailElement && user.email) {
        emailElement.textContent = user.email;
    }

    // Apply RBAC
    applyRBAC();

    // Check module subscriptions
    checkModuleSubscriptions();
}

// Setup OTP on page load
document.addEventListener('DOMContentLoaded', async () => {
    setupOTPInputs();
    document.getElementById('emailForm').addEventListener('submit', requestOTP);
    document.getElementById('otpForm').addEventListener('submit', verifyOTP);
    const pinForm = document.getElementById('pinForm');
    if (pinForm) pinForm.addEventListener('submit', loginWithPin);
    await checkAdminAuth();
});

// Get user role from localStorage or sessionStorage
const user = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user') || '{}');
const userRole = user.role || 'user';

// Allowed roles for admin panel
const allowedRoles = ['super_admin', 'owner', 'admin', 'branch_manager', 'branch_assistant', 'inventory_manager', 'packer', 'dispatch_manager', 'staff_manager', 'pharmacy_admin', 'responsible_pharmacist', 'pharmacist', 'pharmacy_assistant'];

// Role-based access control matrix
const rolePermissions = {
    'super_admin': {
        tabs: ['inventory', 'pos', 'payments', 'affiliates', 'vouchers', 'viral', 'orders', 'wholesale', 'users', 'staff', 'payroll', 'smart-ledger', 'leads', 'marketing', 'suppliers', 'purchase-orders', 'menu-boards'],
        dashboards: ['inventory-manager', 'pnd', 'branch-receiving'],
        name: 'Super Admin'
    },
    'owner': {
        tabs: ['inventory', 'pos', 'payments', 'affiliates', 'vouchers', 'viral', 'orders', 'wholesale', 'users', 'staff', 'payroll', 'smart-ledger', 'leads', 'marketing', 'suppliers', 'purchase-orders', 'menu-boards'],
        dashboards: ['inventory-manager', 'pnd', 'branch-receiving'],
        name: 'Business Owner'
    },
    'admin': {
        tabs: ['inventory', 'pos', 'payments', 'affiliates', 'vouchers', 'viral', 'orders', 'wholesale', 'users', 'staff', 'payroll', 'smart-ledger', 'leads', 'marketing', 'suppliers', 'purchase-orders', 'menu-boards'],
        dashboards: [],
        name: 'Administrator'
    },
    'branch_manager': {
        tabs: ['inventory', 'pos', 'payments', 'orders', 'staff', 'leads'],
        dashboards: ['branch-receiving'],
        name: 'Store Manager'
    },
    'inventory_manager': {
        tabs: ['inventory', 'orders', 'suppliers', 'purchase-orders'],
        dashboards: ['inventory-manager', 'pnd', 'branch-receiving'],
        name: 'Inventory Manager'
    },
    'packer': {
        tabs: ['orders'],
        dashboards: ['pnd'],
        name: 'Packer'
    },
    'dispatch_manager': {
        tabs: ['orders'],
        dashboards: ['pnd'],
        name: 'Dispatch Manager'
    },
    'branch_assistant': {
        tabs: ['pos'],
        dashboards: [],
        name: 'Shop Assistant'
    },
    'pharmacy_admin': {
        tabs: ['orders', 'payments', 'inventory', 'users', 'staff', 'leads'],
        dashboards: ['branch-receiving'],
        name: 'Pharmacy Admin'
    },
    'responsible_pharmacist': {
        tabs: ['orders', 'payments', 'inventory', 'users', 'staff', 'leads'],
        dashboards: ['branch-receiving'],
        name: 'Responsible Pharmacist'
    },
    'pharmacist': {
        tabs: ['orders', 'inventory'],
        dashboards: ['branch-receiving'],
        name: 'Pharmacist'
    },
    'pharmacy_assistant': {
        tabs: ['orders'],
        dashboards: [],
        name: 'Pharmacy Assistant'
    }
};

// Apply RBAC - hide tabs based on user role
function applyRBAC() {
    const permissions = rolePermissions[userRole];
    if (!permissions) {
        console.error('[RBAC] No permissions found for role:', userRole);
        return;
    }

    console.log('[RBAC] Applying permissions for', permissions.name, '- Allowed tabs:', permissions.tabs);

    // Get all tab buttons
    const allTabButtons = document.querySelectorAll('.tab-nav .tab');

    allTabButtons.forEach(tabButton => {
        const onclick = tabButton.getAttribute('onclick');

        // Extract tab name from onclick="showMainTab('inventory')"
        const match = onclick?.match(/showMainTab\('([^']+)'\)/);
        if (match) {
            const tabName = match[1];

            if (!permissions.tabs.includes(tabName)) {
                // Hide tab that user doesn't have access to
                tabButton.style.display = 'none';
                console.log('[RBAC] Hiding tab:', tabName);
            } else {
                console.log('[RBAC] Showing tab:', tabName);
            }
        }
    });

    // Also hide sidebar menu items that correspond to hidden tabs
    const sidebarItems = document.querySelectorAll('.sidebar-menu-item');
    sidebarItems.forEach(item => {
        const onclick = item.getAttribute('onclick');
        const tabMatch = onclick?.match(/navigateToTab\('([^']+)'\)/);
        if (tabMatch) {
            const tabName = tabMatch[1];
            if (!permissions.tabs.includes(tabName)) {
                item.style.display = 'none';
                console.log('[RBAC] Hiding sidebar tab:', tabName);
            }
        }

        // Check dashboard links
        const dashboardId = item.getAttribute('data-dashboard');
        if (dashboardId) {
            if (!permissions.dashboards || !permissions.dashboards.includes(dashboardId)) {
                item.style.display = 'none';
                console.log('[RBAC] Hiding dashboard link:', dashboardId);
            } else {
                console.log('[RBAC] Showing dashboard link:', dashboardId);
            }
        }
    });

    // If assistant, auto-navigate to POS tab
    if (userRole === 'branch_assistant') {
        console.log('[RBAC] Assistant role detected - auto-opening POS tab');
        setTimeout(() => showMainTab('pos'), 500);
    }
}
