/**
 * Origin Core Library — Unified namespace for all shared functionality
 * Requires (in order):
 *   1. frontend/config.js      (Origin_CONFIG, API_URL, DEV_MODE)
 *   2. frontend/or-utils.js   (showToast, getToken, apiCall, logout, formatCurrency)
 *   3. frontend/or-auth.js    (OTP helpers, token setters, isAuthenticated)
 *
 * Provides: window.Origin — single API surface for all pages and future React bridge.
 */

// ============================================
// New auth helpers
// ============================================

/**
 * Get the current user object from storage.
 * Checks localStorage then sessionStorage.
 * @returns {object|null}
 */
function _originGetUser() {
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
function _originHasRole() {
    var user = _originGetUser();
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
async function _originLogin(email, otpCode) {
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
function _originShowModal(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'flex';
}

/**
 * Hide an element (modal) by ID.
 * @param {string} id - DOM element ID
 */
function _originHideModal(id) {
    var el = document.getElementById(id);
    if (el) el.style.display = 'none';
}

/**
 * Show a branded confirm dialog (replaces browser confirm()).
 * @param {string} message - confirmation message
 * @param {function} onConfirm - callback when user confirms
 * @param {object} [options] - { title, confirmText, cancelText, icon, type }
 */
function _originShowConfirm(message, onConfirm, options) {
    if (!options) options = {};
    var title = options.title || 'Confirm';
    var confirmText = options.confirmText || 'Confirm';
    var cancelText = options.cancelText || 'Cancel';
    var icon = options.icon || 'fa-question-circle';
    var type = options.type || 'warning';

    var B = Origin_CONFIG.BRAND;

    var typeColors = {
        warning: { accent: B.gold, btn: B.gold },
        danger: { accent: B.red, btn: B.red },
        info: { accent: B.green, btn: B.green },
        success: { accent: B.green, btn: B.green }
    };
    var colors = typeColors[type] || typeColors.warning;

    // Remove any existing confirm overlay
    var existing = document.getElementById('origin-confirm-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'origin-confirm-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;' +
        'z-index:300000;font-family:"Barlow",sans-serif;animation:jigConfirmIn 0.2s ease-out;';

    overlay.innerHTML =
        '<div style="background:' + B.cream + ';border-radius:16px;padding:32px;max-width:420px;' +
        'width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.3);text-align:center;">' +
            '<div style="margin-bottom:16px;">' +
                '<i class="fas ' + icon + '" style="font-size:2.5rem;color:' + colors.accent + ';"></i>' +
            '</div>' +
            '<h3 style="margin:0 0 8px;color:' + B.navy + ';font-family:\'Oswald\',sans-serif;' +
            'font-size:1.25rem;font-weight:700;">' + title + '</h3>' +
            '<p style="margin:0 0 24px;color:' + B.darkGreen + ';font-size:0.95rem;line-height:1.5;">' +
            message + '</p>' +
            '<div style="display:flex;gap:12px;justify-content:center;">' +
                '<button id="origin-confirm-cancel" style="padding:10px 24px;border:1px solid #ccc;' +
                'background:transparent;border-radius:8px;cursor:pointer;font-size:0.9rem;' +
                'color:' + B.darkGreen + ';font-family:\'Inter\',sans-serif;">' + cancelText + '</button>' +
                '<button id="origin-confirm-ok" style="padding:10px 24px;border:none;' +
                'background:' + colors.btn + ';color:#fff;border-radius:8px;cursor:pointer;' +
                'font-size:0.9rem;font-weight:600;font-family:\'Inter\',sans-serif;">' + confirmText + '</button>' +
            '</div>' +
        '</div>';

    // Inject keyframes if not present
    if (!document.getElementById('origin-confirm-keyframes')) {
        var style = document.createElement('style');
        style.id = 'origin-confirm-keyframes';
        style.textContent =
            '@keyframes jigConfirmIn { from { opacity: 0; } to { opacity: 1; } }';
        document.head.appendChild(style);
    }

    document.body.appendChild(overlay);

    // Wire buttons
    document.getElementById('origin-confirm-cancel').addEventListener('click', function() {
        overlay.remove();
    });
    document.getElementById('origin-confirm-ok').addEventListener('click', function() {
        overlay.remove();
        if (typeof onConfirm === 'function') onConfirm();
    });

    // Close on overlay background click
    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}

/**
 * Show a branded prompt dialog (replaces browser prompt()).
 * @param {string} message - prompt message
 * @param {function} onSubmit - callback with input value
 * @param {object} [options] - { title, submitText, cancelText, icon, placeholder, required }
 */
function _originShowPrompt(message, onSubmit, options) {
    if (!options) options = {};
    var title = options.title || 'Input Required';
    var submitText = options.submitText || 'Submit';
    var cancelText = options.cancelText || 'Cancel';
    var icon = options.icon || 'fa-pencil';
    var placeholder = options.placeholder || '';
    var required = options.required !== false;

    var B = Origin_CONFIG.BRAND;

    var existing = document.getElementById('origin-prompt-overlay');
    if (existing) existing.remove();

    var overlay = document.createElement('div');
    overlay.id = 'origin-prompt-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.6);display:flex;align-items:center;justify-content:center;' +
        'z-index:300000;font-family:"Barlow",sans-serif;animation:jigConfirmIn 0.2s ease-out;';

    overlay.innerHTML =
        '<div style="background:' + B.cream + ';border-radius:16px;padding:32px;max-width:420px;' +
        'width:90%;box-shadow:0 16px 48px rgba(0,0,0,0.3);text-align:center;">' +
            '<div style="margin-bottom:16px;">' +
                '<i class="fas ' + icon + '" style="font-size:2.5rem;color:' + B.gold + ';"></i>' +
            '</div>' +
            '<h3 style="margin:0 0 8px;color:' + B.navy + ';font-family:\'Oswald\',sans-serif;' +
            'font-size:1.25rem;font-weight:700;">' + title + '</h3>' +
            '<p style="margin:0 0 16px;color:' + B.darkGreen + ';font-size:0.95rem;line-height:1.5;">' +
            message + '</p>' +
            '<textarea id="origin-prompt-input" rows="3" placeholder="' + placeholder + '" ' +
            'style="width:100%;padding:10px;border:2px solid #222222;border-radius:8px;' +
            'font-family:\'Inter\',sans-serif;font-size:0.9rem;resize:vertical;box-sizing:border-box;' +
            'margin-bottom:16px;"></textarea>' +
            '<div style="display:flex;gap:12px;justify-content:center;">' +
                '<button id="origin-prompt-cancel" style="padding:10px 24px;border:1px solid #ccc;' +
                'background:transparent;border-radius:8px;cursor:pointer;font-size:0.9rem;' +
                'color:' + B.darkGreen + ';font-family:\'Inter\',sans-serif;">' + cancelText + '</button>' +
                '<button id="origin-prompt-ok" style="padding:10px 24px;border:none;' +
                'background:' + B.green + ';color:#fff;border-radius:8px;cursor:pointer;' +
                'font-size:0.9rem;font-weight:600;font-family:\'Inter\',sans-serif;">' + submitText + '</button>' +
            '</div>' +
        '</div>';

    document.body.appendChild(overlay);

    var inputEl = document.getElementById('origin-prompt-input');
    inputEl.focus();

    document.getElementById('origin-prompt-cancel').addEventListener('click', function() {
        overlay.remove();
    });
    document.getElementById('origin-prompt-ok').addEventListener('click', function() {
        var val = inputEl.value.trim();
        if (required && !val) {
            inputEl.style.borderColor = B.red;
            inputEl.focus();
            return;
        }
        overlay.remove();
        if (typeof onSubmit === 'function') onSubmit(val);
    });

    overlay.addEventListener('click', function(e) {
        if (e.target === overlay) overlay.remove();
    });
}

/**
 * Show a full-screen loading overlay with spinner.
 * @param {string} [message] - optional loading message
 */
function _originShowLoading(message) {
    // Remove existing to prevent duplicates
    _originHideLoading();

    var B = Origin_CONFIG.BRAND;
    var overlay = document.createElement('div');
    overlay.id = 'origin-loading-overlay';
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;' +
        'background:rgba(0,0,0,0.5);display:flex;flex-direction:column;' +
        'align-items:center;justify-content:center;z-index:300000;' +
        'font-family:"Barlow",sans-serif;';

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
function _originHideLoading() {
    var el = document.getElementById('origin-loading-overlay');
    if (el) el.remove();
}


// ============================================
// New format helpers
// ============================================

function _originFormatDate(d) {
    return new Date(d).toLocaleDateString('en-ZA');
}

function _originFormatWeight(g) {
    return g >= 1000 ? (g / 1000).toFixed(1) + 'kg' : g + 'g';
}

function _originFormatPercentage(n) {
    return n.toFixed(1) + '%';
}


// ============================================
// Origin Namespace — single API surface
// ============================================

var Origin = {
    config: Origin_CONFIG,

    api: {
        get: function(endpoint) { return apiCall(endpoint, 'GET'); },
        post: function(endpoint, data) { return apiCall(endpoint, 'POST', data); },
        put: function(endpoint, data) { return apiCall(endpoint, 'PUT', data); },
        delete: function(endpoint) { return apiCall(endpoint, 'DELETE'); }
    },

    auth: {
        getToken: getToken,
        login: _originLogin,
        logout: logout,
        isAuthenticated: isAuthenticated,
        getUser: _originGetUser,
        hasRole: _originHasRole
    },

    ui: {
        showToast: showToast,
        showModal: _originShowModal,
        hideModal: _originHideModal,
        showConfirm: _originShowConfirm,
        showPrompt: _originShowPrompt,
        showLoading: _originShowLoading,
        hideLoading: _originHideLoading
    },

    format: {
        currency: formatCurrency,
        date: _originFormatDate,
        weight: _originFormatWeight,
        percentage: _originFormatPercentage
    },

    brand: Origin_CONFIG.BRAND
};

// Expose globally
window.Origin = Origin;
