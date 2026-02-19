// owner-auth.js — OTP authentication for owner dashboard
// Depends on: config.js (API_URL, DEV_MODE), dbc-utils.js (showToast)

// Auth state
let token = localStorage.getItem('ownerToken') || localStorage.getItem('token') || sessionStorage.getItem('adminToken');
let userData = null;
let currentEmail = '';
let countdownTimer = null;

// ===== OTP AUTHENTICATION =====
function getToken() {
    return localStorage.getItem('ownerToken');
}

function setToken(newToken) {
    token = newToken;
    localStorage.setItem('ownerToken', newToken);
    localStorage.setItem('token', newToken);
    sessionStorage.setItem('adminToken', newToken);
}

function clearAuth() {
    localStorage.removeItem('ownerToken');
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    sessionStorage.removeItem('adminToken');
    token = null;
    userData = null;
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardContainer').classList.remove('visible');
    document.getElementById('dashboardContainer').style.display = 'none';

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

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'block';
    document.getElementById('dashboardContainer').classList.add('visible');
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

    // Clear OTP inputs
    document.querySelectorAll('#otpInputs input').forEach(input => input.value = '');
    document.querySelectorAll('#otpInputs input')[0].focus();

    // Start countdown
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
            // Check role - must be owner or admin
            const allowedRoles = ['owner', 'admin'];
            if (!allowedRoles.includes(data.user.role)) {
                errorDiv.textContent = 'Access denied. Owner or Admin access required.';
                errorDiv.classList.add('show');
                inputs.forEach(i => i.value = '');
                inputs[0].focus();
                return;
            }

            setToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            userData = data.user;
            showToast('Login successful', 'Welcome back!', 'success');
            showDashboard();
            initDashboard();
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
            const allowedRoles = ['owner', 'admin', 'super_admin'];
            if (!allowedRoles.includes(data.user.role)) {
                errorDiv.textContent = 'Access denied. Owner or Admin access required.';
                errorDiv.classList.add('show');
                return;
            }

            setToken(data.token);
            localStorage.setItem('user', JSON.stringify(data.user));
            userData = data.user;
            showToast('Login successful', 'Welcome back!', 'success');
            showDashboard();
            initDashboard();
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

async function checkAuth() {
    if (!token) {
        // Dev auto-login with owner PIN
        if (DEV_MODE) {
            console.log('[AUTH] Dev mode: attempting auto-login with owner PIN');
            try {
                const res = await fetch(`${API_URL}/auth/otp/verify-pin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email: 'owner@jig.cleva-ai.co.za', pin: '830101' })
                });
                const data = await res.json();
                if (data.success && data.token) {
                    setToken(data.token);
                    localStorage.setItem('user', JSON.stringify(data.user));
                    userData = data.user;
                    showDashboard();
                    initDashboard();
                    return;
                }
            } catch (e) {
                console.warn('[AUTH] Dev auto-login failed:', e);
            }
        }
        showLogin();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/otp/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success && data.user) {
            // Check role - must be owner or admin
            const allowedRoles = ['owner', 'admin'];
            if (!allowedRoles.includes(data.user.role)) {
                clearAuth();
                showLogin();
                return;
            }

            userData = data.user;
            localStorage.setItem('user', JSON.stringify(data.user));
            showDashboard();
            initDashboard();
        } else if (response.status === 401 || response.status === 403) {
            clearAuth();
            showLogin();
        } else {
            // Try to use stored user data
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
                userData = JSON.parse(storedUser);
                showDashboard();
                initDashboard();
            } else {
                showLogin();
            }
        }
    } catch (error) {
        // Network error - try stored user
        const storedUser = localStorage.getItem('user');
        if (storedUser) {
            userData = JSON.parse(storedUser);
            showDashboard();
            initDashboard();
        } else {
            showLogin();
        }
    }
}

// Check authentication on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Setup OTP input handlers
    setupOTPInputs();

    // Setup form handlers
    document.getElementById('emailForm').addEventListener('submit', requestOTP);
    document.getElementById('otpForm').addEventListener('submit', verifyOTP);

    // Check if already logged in
    await checkAuth();
});
