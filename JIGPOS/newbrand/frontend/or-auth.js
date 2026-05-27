/**
 * Origin Auth Utilities — OTP authentication helpers
 * Requires: frontend/config.js and frontend/or-utils.js loaded first
 *
 * Provides lower-level auth API calls. DOM wiring (showing/hiding login screens,
 * filling OTP inputs) stays in each page since it's page-specific.
 */

// ============================================
// OTP API calls
// ============================================

/**
 * Request an OTP code for the given email.
 * @param {string} email
 * @param {string} purpose - 'login' (default) or other purpose
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function requestOTPCode(email, purpose) {
    if (!purpose) purpose = 'login';
    const res = await fetch(`${Origin_CONFIG.API_URL}/auth/otp/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, purpose: purpose })
    });
    return res.json();
}

/**
 * Resend an OTP code.
 * @param {string} email
 * @param {string} purpose
 * @returns {Promise<{success: boolean, message?: string}>}
 */
async function resendOTPCode(email, purpose) {
    if (!purpose) purpose = 'login';
    const res = await fetch(`${Origin_CONFIG.API_URL}/auth/otp/resend`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, purpose: purpose })
    });
    return res.json();
}

/**
 * Verify an OTP code and get a token back.
 * @param {string} email
 * @param {string} otpCode - the 6-digit code
 * @returns {Promise<{success: boolean, token?: string, user?: object, message?: string}>}
 */
async function verifyOTPCode(email, otpCode) {
    const res = await fetch(`${Origin_CONFIG.API_URL}/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, otpCode: otpCode })
    });
    return res.json();
}

/**
 * Get the current authenticated user profile.
 * Tries OTP endpoint first, then falls back to regular auth endpoint.
 * @param {string} token
 * @returns {Promise<{success: boolean, user?: object}>}
 */
async function fetchCurrentUser(token) {
    if (!token) token = getToken();
    if (!token) return { success: false, message: 'No token' };

    try {
        let res = await fetch(`${Origin_CONFIG.API_URL}/auth/otp/me`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });

        if (!res.ok) {
            res = await fetch(`${Origin_CONFIG.API_URL}/auth/otp/me`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
        }

        return res.json();
    } catch (err) {
        return { success: false, message: 'Network error', offline: true };
    }
}

/**
 * Update user profile (first name, last name, mobile).
 * @param {object} profileData - { firstName, lastName, mobile }
 * @param {string} token
 * @returns {Promise<{success: boolean, user?: object}>}
 */
async function updateUserProfile(profileData, token) {
    if (!token) token = getToken();
    const res = await fetch(`${Origin_CONFIG.API_URL}/auth/otp/update-profile`, {
        method: 'PUT',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(profileData)
    });
    return res.json();
}


// ============================================
// Token storage helpers (role-specific)
// ============================================
// Each dashboard stores tokens under different keys.
// These helpers let pages set tokens for their specific role
// while also setting the shared keys for cross-dashboard compatibility.

function setAdminToken(token) {
    localStorage.setItem('adminToken', token);
    sessionStorage.setItem('adminToken', token);
    localStorage.setItem('token', token);
}

function setOwnerToken(token) {
    localStorage.setItem('ownerToken', token);
    localStorage.setItem('token', token);
    sessionStorage.setItem('adminToken', token);
}

function setStocktakeToken(token) {
    localStorage.setItem('stocktakeToken', token);
}

function setInventoryToken(token) {
    localStorage.setItem('inventoryToken', token);
}


// ============================================
// Auth state checking
// ============================================

/**
 * Check if a user profile is complete (has real name and mobile).
 * @param {object} user
 * @returns {boolean}
 */
function isProfileComplete(user) {
    return user &&
        user.firstName &&
        user.firstName !== 'New' &&
        user.lastName &&
        user.lastName !== 'User' &&
        user.mobile;
}

/**
 * Check if the current user has a valid token.
 * @returns {boolean}
 */
function isAuthenticated() {
    return !!getToken();
}


// ============================================
// OTP countdown helper
// ============================================

/**
 * Start a countdown timer for OTP resend.
 * @param {number} seconds - countdown duration
 * @param {string} countdownElId - ID of the countdown number element
 * @param {string} timerTextId - ID of the "Resend in X seconds" text wrapper
 * @param {string} resendLinkId - ID of the resend link to show when countdown ends
 * @returns {number} interval ID (store this to clear on navigation)
 */
function startOTPCountdown(seconds, countdownElId, timerTextId, resendLinkId) {
    let remaining = seconds;
    const countdownEl = document.getElementById(countdownElId);
    const timerText = document.getElementById(timerTextId);
    const resendLink = document.getElementById(resendLinkId);

    if (timerText) timerText.style.display = 'inline';
    if (resendLink) resendLink.style.display = 'none';

    const intervalId = setInterval(function() {
        remaining--;
        if (countdownEl) countdownEl.textContent = remaining;

        if (remaining <= 0) {
            clearInterval(intervalId);
            if (timerText) timerText.style.display = 'none';
            if (resendLink) resendLink.style.display = 'inline';
        }
    }, 1000);

    return intervalId;
}
