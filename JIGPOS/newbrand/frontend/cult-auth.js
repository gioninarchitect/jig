// cult-auth.js — OTP authentication for cultivation dashboard
// Depends on: config.js (API_URL), or-utils.js (showToast, getToken), or-auth.js

let currentUser = null;

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
});

async function checkAuth() {
    const token = getToken();

    let storedUser = localStorage.getItem('cultivationUser') ||
                    localStorage.getItem('inventoryUser') ||
                    localStorage.getItem('user');

    if (storedUser) {
        try { currentUser = JSON.parse(storedUser); } catch (e) {}
    }

    if (!token) {
        showLoginScreen();
        return;
    }

    try {
        const response = await fetch(`${API_URL}/auth/otp/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        const data = await response.json();

        if (data.success && data.user) {
            currentUser = data.user;
            localStorage.setItem('cultivationUser', JSON.stringify(data.user));
            localStorage.setItem('cultivationToken', token);
            showDashboard();
        } else if (response.status === 401 || response.status === 403) {
            clearAuth();
            showLoginScreen();
        } else if (currentUser) {
            showDashboard();
        } else {
            showLoginScreen();
        }
    } catch (error) {
        if (currentUser) {
            showDashboard();
        } else {
            showLoginScreen();
        }
    }
}

function clearAuth() {
    localStorage.removeItem('cultivationToken');
    localStorage.removeItem('cultivationUser');
    currentUser = null;
}

function showLoginScreen() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('dashboardContainer').style.display = 'none';
}

function showDashboard() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('dashboardContainer').style.display = 'block';

    const userName = currentUser?.firstName || currentUser?.username || 'User';
    const el = document.getElementById('userDisplayName');
    if (el) el.textContent = userName;

    initializeNavigation();
    loadDashboardData();
}

// ============================================
// OTP LOGIN FUNCTIONS
// ============================================
let currentEmail = '';
let countdownTimer = null;

async function requestOTP() {
    const email = document.getElementById('loginEmail').value.trim();
    const btn = document.getElementById('requestOTPBtn');
    const errorDiv = document.getElementById('emailError');

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        errorDiv.textContent = 'Please enter a valid email';
        errorDiv.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Sending...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/auth/otp/request`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, purpose: 'login' })
        });

        const data = await response.json();

        if (data.success) {
            currentEmail = email;
            document.getElementById('step-email').style.display = 'none';
            document.getElementById('step-otp').style.display = 'block';
            document.getElementById('displayEmail').textContent = email;
            document.querySelectorAll('.otp-input')[0].focus();
            startCountdown(60);
        } else {
            errorDiv.textContent = data.message || 'Failed to send code';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-paper-plane"></i> Send Login Code';
    }
}

function handleOTPInput(input, index) {
    const inputs = document.querySelectorAll('.otp-input');
    if (input.value.length === 1 && index < 5) {
        inputs[index + 1].focus();
    }
    const otp = Array.from(inputs).map(i => i.value).join('');
    if (otp.length === 6) verifyOTP();
}

document.addEventListener('DOMContentLoaded', function() {
    const otpInputs = document.querySelectorAll('.otp-input');
    otpInputs.forEach((input, index) => {
        input.addEventListener('paste', function(e) {
            e.preventDefault();
            const pastedData = (e.clipboardData || window.clipboardData).getData('text').trim();
            const digits = pastedData.replace(/\D/g, '').slice(0, 6);
            if (digits.length > 0) {
                digits.split('').forEach((digit, i) => {
                    if (otpInputs[i]) otpInputs[i].value = digit;
                });
                const focusIndex = Math.min(digits.length, 5);
                otpInputs[focusIndex].focus();
                if (digits.length === 6) verifyOTP();
            }
        });
    });
});

async function verifyOTP() {
    const inputs = document.querySelectorAll('.otp-input');
    const otp = Array.from(inputs).map(i => i.value).join('');
    const btn = document.getElementById('verifyOTPBtn');
    const errorDiv = document.getElementById('otpError');

    if (otp.length !== 6) {
        errorDiv.textContent = 'Please enter all 6 digits';
        errorDiv.style.display = 'block';
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/auth/otp/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, otpCode: otp })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('cultivationToken', data.token);
            localStorage.setItem('cultivationUser', JSON.stringify(data.user));
            currentUser = data.user;
            showDashboard();
        } else {
            errorDiv.textContent = data.message || 'Invalid code';
            errorDiv.style.display = 'block';
            inputs.forEach(i => i.value = '');
            inputs[0].focus();
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Verify & Login';
    }
}

function goBackToEmail() {
    document.getElementById('step-otp').style.display = 'none';
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
    try {
        const response = await fetch(`${API_URL}/auth/otp/resend`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: currentEmail, purpose: 'login' })
        });
        if (response.ok) startCountdown(60);
    } catch (error) {}
    resendLink.textContent = 'Resend Code';
}

async function loginWithPin(e) {
    e.preventDefault();
    const email = document.getElementById('pinEmail').value.trim();
    const pin = document.getElementById('pinInput').value.trim();
    const btn = document.getElementById('pinLoginBtn');
    const errorDiv = document.getElementById('pinError');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Verifying...';
    errorDiv.style.display = 'none';

    try {
        const response = await fetch(`${API_URL}/auth/otp/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('cultivationToken', data.token);
            localStorage.setItem('cultivationUser', JSON.stringify(data.user));
            currentUser = data.user;
            showDashboard();
        } else {
            errorDiv.textContent = data.message || 'Invalid PIN';
            errorDiv.style.display = 'block';
        }
    } catch (error) {
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.style.display = 'block';
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-key"></i> Login with PIN';
    }
}

function cultLogout() {
    clearAuth();
    localStorage.removeItem('cultivationToken');
    localStorage.removeItem('cultivationUser');
    showLoginScreen();
}
