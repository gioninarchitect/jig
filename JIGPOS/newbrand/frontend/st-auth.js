// st-auth.js — Auth, login, OTP, registration, screen management
// Depends on: config.js (API_URL, DEV_MODE), dbc-utils.js (showToast), dbc-auth.js (getToken, setStocktakeToken)

// App State (shared across all modules)
let currentUser = null;
let currentSession = null;
let currentItems = [];
let currentFilter = 'all';
let currentItemIndex = null;
let cameraStream = null;
let currentEmail = '';
let countdownTimer = null;

// ============================================
// AUTHENTICATION (OTP-based)
// ============================================

function setToken(token) {
    setStocktakeToken(token); // from dbc-auth.js
}

function clearAuth() {
    localStorage.removeItem('stocktakeToken');
    localStorage.removeItem('stocktakeUser');
    currentUser = null;
}

// Login with PIN
async function loginWithPin() {
    const email = document.getElementById('loginEmail').value.trim();
    const pin = document.getElementById('loginPin').value.trim();
    const errorDiv = document.getElementById('emailError');

    if (!email) {
        errorDiv.textContent = 'Please enter your email address';
        errorDiv.classList.add('show');
        return;
    }

    if (!pin || pin.length !== 6) {
        errorDiv.textContent = 'Please enter your 6-digit PIN';
        errorDiv.classList.add('show');
        return;
    }

    errorDiv.classList.remove('show');

    try {
        const response = await fetch(`${API_URL}/auth/otp/verify-pin`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email, pin })
        });

        const data = await response.json();

        if (data.success) {
            localStorage.setItem('stocktakeToken', data.token);
            localStorage.setItem('stocktakeUser', JSON.stringify(data.user));
            localStorage.setItem('stocktakeUserTime', Date.now().toString());
            currentUser = data.user;
            showToast('Login successful', 'success');

            // Check if profile is complete
            if (!data.user.firstName || !data.user.lastName) {
                showRegistration();
            } else {
                showApp();
                loadSessions();
            }
        } else {
            errorDiv.textContent = data.message || 'Invalid PIN';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('PIN login error:', error);
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.classList.add('show');
    }
}

// Request OTP
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

            setTimeout(() => {
                showOTPStep();
            }, 1000);
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

// Verify OTP
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
            setToken(data.token);
            localStorage.setItem('stocktakeUser', JSON.stringify(data.user));
            currentUser = data.user;
            showToast('Login successful', 'success');
            // Check if profile is complete before showing app
            checkProfileAndProceed();
        } else {
            errorDiv.textContent = data.message || 'Invalid code';
            errorDiv.classList.add('show');
            // Clear inputs on error
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
                // Auto-submit after paste
                setTimeout(() => verifyOTP({ preventDefault: () => {} }), 100);
            }
        });
    });
}

async function checkAuth() {
    // Check multiple token locations (OTP token or regular token)
    let token = localStorage.getItem('stocktakeToken');
    if (!token) token = localStorage.getItem('token');
    if (!token) token = sessionStorage.getItem('token');

    if (!token) {
        showLogin();
        return;
    }

    // Store the found token
    if (!localStorage.getItem('stocktakeToken') && token) {
        localStorage.setItem('stocktakeToken', token);
    }

    // Try to restore user from localStorage first
    const storedUser = localStorage.getItem('stocktakeUser');
    if (storedUser) {
        try {
            currentUser = JSON.parse(storedUser);
            // Check if stored user is recent (within 30 days)
            const storedTime = localStorage.getItem('stocktakeUserTime');
            if (storedTime) {
                const daysSinceStored = (Date.now() - parseInt(storedTime)) / (1000 * 60 * 60 * 24);
                if (daysSinceStored > 30) {
                    console.log('Stored user expired');
                    currentUser = null;
                }
            }
        } catch (e) {
            console.error('Failed to parse stored user');
        }
    }

    // Show app immediately from cache (prevents login flash on tab switch)
    if (currentUser) {
        showApp();
    }

    try {
        // Try OTP endpoint first, then regular auth endpoint
        let response = await fetch(`${API_URL}/auth/otp/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        // If OTP endpoint fails, try regular auth endpoint
        if (!response.ok) {
            response = await fetch(`${API_URL}/auth/otp/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        const data = await response.json();

        if (data.success && data.user) {
            currentUser = data.user;
            // Update stored user with timestamp
            localStorage.setItem('stocktakeUser', JSON.stringify(data.user));
            localStorage.setItem('stocktakeUserTime', Date.now().toString());
            checkProfileAndProceed();
        } else {
            // API returned error - use cached user if available
            if (currentUser) {
                console.log('API error but using cached user, status:', response.status);
                checkProfileAndProceed();
            } else if (response.status === 401 || response.status === 403) {
                clearAuth();
                showLogin();
            } else {
                // Non-auth error (404, 500) with no cached user - show login
                showLogin();
            }
        }
    } catch (error) {
        // Network error but we have stored user - try to continue
        if (currentUser) {
            console.log('Offline mode - using stored credentials');
            checkProfileAndProceed();
        } else {
            showLogin();
        }
    }
}

function showLogin() {
    document.getElementById('loginScreen').style.display = 'flex';
    document.getElementById('registrationScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'none';

    // Reset login form
    document.getElementById('step-email').style.display = 'block';
    document.getElementById('step-email').classList.add('active');
    document.getElementById('step-otp').style.display = 'none';
    document.getElementById('step-otp').classList.remove('active');
    document.getElementById('loginEmail').value = '';

    // Show dev mode hint
    if (DEV_MODE) {
        document.getElementById('devQuickLogin').style.display = 'block';
    }
}

function isProfileComplete(user) {
    // Check if user has filled in required profile fields
    // Mobile is optional - don't block stock app access over it
    return user &&
           user.firstName &&
           user.firstName !== 'New' &&
           user.lastName &&
           user.lastName !== 'User';
}

function showRegistration() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registrationScreen').style.display = 'flex';
    document.getElementById('appContainer').style.display = 'none';

    // Pre-fill if we have partial data
    if (currentUser) {
        if (currentUser.firstName && currentUser.firstName !== 'New') {
            document.getElementById('regFirstName').value = currentUser.firstName;
        }
        if (currentUser.lastName && currentUser.lastName !== 'User') {
            document.getElementById('regLastName').value = currentUser.lastName;
        }
        if (currentUser.mobile) {
            document.getElementById('regMobile').value = currentUser.mobile;
        }
    }
}

async function submitRegistration(e) {
    e.preventDefault();

    const firstName = document.getElementById('regFirstName').value.trim();
    const lastName = document.getElementById('regLastName').value.trim();
    const mobile = document.getElementById('regMobile').value.trim();
    const btn = document.getElementById('regSubmitBtn');
    const errorDiv = document.getElementById('regError');

    btn.disabled = true;
    btn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
    errorDiv.classList.remove('show');

    try {
        const response = await fetch(`${API_URL}/auth/otp/update-profile`, {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${getToken()}`
            },
            body: JSON.stringify({ firstName, lastName, mobile })
        });

        const data = await response.json();

        if (data.success) {
            // Update current user
            currentUser = { ...currentUser, firstName, lastName, mobile };
            localStorage.setItem('stocktakeUser', JSON.stringify(currentUser));
            showToast('Profile saved', 'success');
            showApp();
            loadSessions();
        } else {
            errorDiv.textContent = data.message || 'Failed to save profile';
            errorDiv.classList.add('show');
        }
    } catch (error) {
        console.error('Registration error:', error);
        errorDiv.textContent = 'Connection error. Please try again.';
        errorDiv.classList.add('show');
    } finally {
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-check"></i> Save & Continue';
    }
}

function checkProfileAndProceed() {
    if (isProfileComplete(currentUser)) {
        showApp();
        loadSessions();
    } else {
        showRegistration();
    }
}

function logout() {
    clearAuth();
    currentSession = null;
    showToast('Logged out successfully', 'info');
    showLogin();
}

function showApp() {
    document.getElementById('loginScreen').style.display = 'none';
    document.getElementById('registrationScreen').style.display = 'none';
    document.getElementById('appContainer').style.display = 'block';
    document.getElementById('userName').textContent = currentUser?.firstName || currentUser?.username || 'User';
    document.getElementById('branchName').textContent = currentUser?.branch?.name || currentUser?.branchName || localStorage.getItem('selectedBranchName') || 'Ormonde';

    // Reset category filters
    selectedCategory = 'all';
    selectedGrowMethod = null;
    selectedProductType = null;
    document.getElementById('growMethodRow').style.display = 'none';
    document.getElementById('productTypeRow').style.display = 'none';
}
