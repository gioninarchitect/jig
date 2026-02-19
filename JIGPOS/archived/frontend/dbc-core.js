/**
 * DBC Core Library — Unified namespace for all shared functionality
 * Requires (in order):
 *   1. frontend/config.js      (DBC_CONFIG, API_URL, DEV_MODE)
 *   2. frontend/dbc-utils.js   (showToast, getToken, apiCall, logout, formatCurrency)
 *   3. frontend/dbc-auth.js    (OTP helpers, token setters, isAuthenticated)
 *
 * Provides: window.DBC — single API surface for all pages and future React bridge.
 */

// ============================================
// New auth helpers
// ============================================

/**
 * Get the current user object from storage.
 * Checks localStorage then sessionStorage.
 * @returns {object|null}
 */
function _dbcGetUser() {
    var raw = localStorage.getItem('user') || sessionStorage.getItem('user');
    if (!raw) return null;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

/**
 * Check if the current user has one of the specified roles.
 * @param {...string} roles - one or more role strings
 * @returns {boolean}
 */
function _dbcHasRole() {
    var user = _dbcGetUser();
    if (!user || !user.role) return false;
    for (var i = 0; i < arguments.length; i++) {
        if (user.role === arguments[i]) return true;
    }
    return false;
}

/**
 * Login wrapper — verifies OTP, stores token and user.
 * @param {string} email
 * @param {string} otpCode
 * @returns {Promise<{success: boolean, user?: object, token?: string, message?: string}>}
 */
async function _dbcLogin(email, otpCode) {
    try {
        var result = await verifyOTPCode(email, otpCode);
        if (!result.success) {
            return { success: false, message: result.message || 'Verification failed' };
        }
        // Store token using role-aware setter
        if (result.token) {
            setAdminToken(result.token);
        }
        // Store user object
        if (result.user) {
            localStorage.setItem('user', JSON.stringify(result.user));
        }
        return { success: true, user: result.user, token: result.token };
    } catch (err) {
        return { success: false, message: err.message || 'Login failed' };
    }
}


// ============================================
// New UI helpers
// ============================================

/**
 * Show an element as a flex modal by ID.
 * @param {string} id - DOM element ID
 */
function _dbcShowModal(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'flex';
}

/**
 * Hide an element (modal) by ID.
 * @param {string} id - DOM element ID
 */
function _dbcHideModal(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

/**
 * Show a branded confirm dialog (replaces browser confirm()).
 * @param {string} message - confirmation message
 * @param {function} onConfirm - callback when user confirms
 * @param {object} [options] - { title, confirmText, cancelText, icon, type }
 */
function _dbcShowConfirm(message, onConfirm, options) {
    if (!options) options = {};
    var title = options.title || 'Confirm';
    var confirmText = options.confirmText || 'Confirm';
    var cancelText = options.cancelText || 'Cancel';
    var icon = options.icon || 'fa-question-circle';
    var type = options.type || 'warning';

    var B = DBC_CONFIG.BRAND;

    var typeColors = {
        warning: { accent: B.gold, btn: B.gold },
        danger: { accent: B.red, btn: B.red },
        info: { accent: B.green, btn: B.green },
        success: { accent: B.green, btn: B.green }
    };
    var colors = typeColors[type] || typeColors.warning;

    // Remove any existing confirm overlay
    var existing = document.getElementById('dbc-confirm-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'dbc-confirm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;' +
        'z-index:300000;font-family:"Inter",sans-serif;animation:dbcConfirmIn 0.2s ease-out;';

    overlay.innerHTML =
        '<div style="background:' + B.cream + ';border-radius:16px;padding:32px;max-width:420px;' +
        'width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.3);text-align:center;">' +
            '<div style="margin-bottom:16px;">' +
                '<i class="fas ' + icon + '" style="font-size:2.5rem;color:' + colors.accent + ';"></i>' +
            '</div>' +
            '<h3 style="margin:0 0 8px;color:' + B.navy + ';font-family:\'Playfair Display\',serif;' +
            'font-size:1.25rem;font-weight:700;">' + title + '</h3>' +
            '<p style="margin:0 0 24px;color:' + B.darkGreen + ';font-size:0.95rem;line-height:1.5;">' +
            message + '</p>' +
            '<div style="display:flex;gap:12px;justify-content:center;">' +
                '<button id="dbc-confirm-cancel" style="padding:10px 24px;border:1px solid #ccc;' +
                'background:transparent;border-radius:8px;cursor:pointer;font-size:0.9rem;' +
                'color:' + B.darkGreen + ';font-family:\'Inter\',sans-serif;">' + cancelText + '</button>' +
                '<button id="dbc-confirm-ok" style="padding:10px 24px;border:none;' +
                'background:' + colors.btn + ';color:#fff;border-radius:8px;cursor:pointer;' +
                'font-size:0.9rem;font-weight:600;font-family:\'Inter\',sans-serif;">' + confirmText + '</button>' +
            '</div>' +
        '</div>';

    // Inject keyframes if not present
    if (!document.getElementById('dbc-confirm-keyframes')) {
        var style = document.createElement('style');
        style.id = 'dbc-confirm-keyframes';
        style.textContent =
            '@keyframes dbcConfirmIn { from { opacity: 0; } to { opacity: 1; } }';
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    // Wire buttons
    document.getElementById('dbc-confirm-cancel').addEventListener('click', function() {
        overlay.remove();
    });
    document.getElementById('dbc-confirm-ok').addEventListener('click', function() {
        overlay.remove();
        if (typeof onConfirm === 'function') onConfirm();
    });

    // Close on overlay background click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}

/**
 * Show a full-screen loading overlay with spinner.
 * @param {string} [message] - optional loading message
 */
function _dbcShowLoading(message) {
    // Remove existing to prevent duplicates
    _dbcHideLoading();

    var B = DBC_CONFIG.BRAND;
    var overlay = document.createElement('div');
    overlay.id = 'dbc-loading-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.5);display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;z-index:300000;' +
        'font-family:"Inter",sans-serif;';

    var msgHtml = message
        ? '<p style="margin:16px 0 0;color:' + B.cream + ';font-size:1rem;">' + message + '</p>'
        : '';

    overlay.innerHTML =
        '<i class="fas fa-spinner fa-spin" style="font-size:2.5rem;color:' + B.cream + ';"></i>' +
        msgHtml;

    document.body.appendChild(overlay);
}

/**
 * Remove the loading overlay.
 */
function _dbcHideLoading() {
    var el = document.getElementById('dbc-loading-overlay');
    if (el) el.remove();
}


// ============================================
// New format helpers
// ============================================

function _dbcFormatDate(d) {
    return new Date(d).toLocaleDateString('en-ZA');
}

function _dbcFormatWeight(g) {
    return g >= 1000 ? (g / 1000).toFixed(1) + 'kg' : g + 'g';
}

function _dbcFormatPercentage(n) {
    return n.toFixed(1) + '%';
}


// ============================================
// DBC Namespace — single API surface
// ============================================

var DBC = {
    config: DBC_CONFIG,

    api: {
        get: function(endpoint) { return apiCall(endpoint, 'GET'); },
        post: function(endpoint, data) { return apiCall(endpoint, 'POST', data); },
        put: function(endpoint, data) { return apiCall(endpoint, 'PUT', data); },
        delete: function(endpoint) { return apiCall(endpoint, 'DELETE'); }
    },

    auth: {
        getToken: getToken,
        login: _dbcLogin,
        logout: logout,
        isAuthenticated: isAuthenticated,
        getUser: _dbcGetUser,
        hasRole: _dbcHasRole
    },

    ui: {
        showToast: showToast,
        showModal: _dbcShowModal,
        hideModal: _dbcHideModal,
        showConfirm: _dbcShowConfirm,
        showLoading: _dbcShowLoading,
        hideLoading: _dbcHideLoading
    },

    format: {
        currency: formatCurrency,
        date: _dbcFormatDate,
        weight: _dbcFormatWeight,
        percentage: _dbcFormatPercentage
    },

    brand: DBC_CONFIG.BRAND
};

// Expose globally
window.DBC = DBC;
