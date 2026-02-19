/**
 * DBC Shared Utilities
 * Requires: frontend/config.js loaded first
 *
 * Provides: showToast, formatCurrency, getToken, apiCall, logout, togglePinVisibility
 */

// ============================================
// togglePinVisibility — show/hide PIN input
// ============================================
function togglePinVisibility(inputId, btn) {
    const input = document.getElementById(inputId);
    if (!input) return;
    const icon = btn.querySelector('i');
    if (input.type === 'password') {
        input.type = 'text';
        if (icon) { icon.classList.remove('fa-eye'); icon.classList.add('fa-eye-slash'); }
    } else {
        input.type = 'password';
        if (icon) { icon.classList.remove('fa-eye-slash'); icon.classList.add('fa-eye'); }
    }
}

// ============================================
// showToast — backward-compatible unified version
// ============================================
// Handles ALL calling conventions found across 30+ files:
//   showToast(title, message, type)      — pos.html, admin.html (3-arg)
//   showToast(message, type)             — owner-dashboard, stocktake-app (2-arg standard)
//   showToast(type, message)             — inventory-manager-dashboard (2-arg REVERSED)
//   showToast(message, isError)          — wholesale-pos (boolean flag)
//
// Detection strategy: inspect argument types and values to determine which convention was used.

const _TOAST_TYPES = ['success', 'error', 'warning', 'info'];

function showToast(arg1, arg2, arg3) {
    let title = '';
    let message = '';
    let type = 'info';

    if (arg3 !== undefined) {
        // 3-arg: (title, message, type)
        title = arg1;
        message = arg2;
        type = _TOAST_TYPES.includes(arg3) ? arg3 : 'info';
    } else if (arg2 !== undefined) {
        if (typeof arg2 === 'boolean') {
            // (message, isError)
            message = arg1;
            type = arg2 ? 'error' : 'success';
        } else if (_TOAST_TYPES.includes(arg1) && !_TOAST_TYPES.includes(arg2)) {
            // (type, message) — reversed pattern
            type = arg1;
            message = arg2;
        } else {
            // (message, type) — standard 2-arg
            message = arg1;
            type = _TOAST_TYPES.includes(arg2) ? arg2 : 'info';
        }
    } else {
        // 1-arg: (message)
        message = arg1;
    }

    // Remove any existing toasts to prevent stacking
    document.querySelectorAll('.dbc-shared-toast').forEach(t => t.remove());

    const icons = {
        success: 'fa-check-circle',
        error: 'fa-exclamation-circle',
        warning: 'fa-exclamation-triangle',
        info: 'fa-info-circle'
    };

    const colors = {
        success: { bg: DBC_CONFIG.BRAND.green, border: DBC_CONFIG.BRAND.gold },
        error: { bg: DBC_CONFIG.BRAND.darkRed, border: DBC_CONFIG.BRAND.red },
        warning: { bg: '#7A6520', border: DBC_CONFIG.BRAND.gold },
        info: { bg: DBC_CONFIG.BRAND.darkGreen, border: DBC_CONFIG.BRAND.green }
    };

    const c = colors[type] || colors.info;

    const toast = document.createElement('div');
    toast.className = 'dbc-shared-toast';

    // Build inner HTML — include title row only if title was provided
    const titleHtml = title ? `<div style="font-weight:700;font-size:1rem;margin-bottom:2px;">${title}</div>` : '';

    toast.innerHTML = `
        <div style="display:flex;align-items:center;gap:12px;">
            <i class="fas ${icons[type] || icons.info}" style="font-size:1.25rem;flex-shrink:0;"></i>
            <div style="flex:1;">
                ${titleHtml}
                <div style="font-size:0.9rem;white-space:pre-line;">${message}</div>
            </div>
            <button onclick="this.closest('.dbc-shared-toast').remove()" style="background:none;border:none;color:inherit;font-size:1.25rem;cursor:pointer;padding:4px;line-height:1;flex-shrink:0;">&times;</button>
        </div>
    `;

    toast.style.cssText = `
        position:fixed;top:20px;right:20px;
        background:${c.bg};color:${DBC_CONFIG.BRAND.cream};
        border-left:4px solid ${c.border};
        padding:14px 18px;border-radius:10px;
        box-shadow:0 8px 32px rgba(0,0,0,0.3);
        z-index:200000;min-width:280px;max-width:420px;
        animation:dbcToastIn 0.3s ease-out;
        font-family:'Inter',sans-serif;
    `;

    // Inject keyframes if not already present
    if (!document.getElementById('dbc-toast-keyframes')) {
        const style = document.createElement('style');
        style.id = 'dbc-toast-keyframes';
        style.textContent = `
            @keyframes dbcToastIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
            @keyframes dbcToastOut { from { transform: translateX(0); opacity: 1; } to { transform: translateX(100%); opacity: 0; } }
        `;
        document.head.appendChild(style);
    }

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.style.animation = 'dbcToastOut 0.3s ease-in forwards';
        setTimeout(() => toast.remove(), 300);
    }, 4000);
}

// Also expose as showAdminToast for admin.html backward compatibility
window.showAdminToast = showToast;

// Also expose as showNotification for dashboard.html backward compatibility
window.showNotification = function(message, type) {
    showToast(message, type);
};


// ============================================
// formatCurrency
// ============================================
function formatCurrency(amount) {
    return `${DBC_CONFIG.CURRENCY.symbol}${(Number(amount) || 0).toFixed(2)}`;
}


// ============================================
// getToken — unified multi-source token retrieval
// ============================================
// Checks all known token storage keys across all dashboards.
// Each dashboard stores tokens under different keys; this checks them all.
function getToken() {
    return localStorage.getItem('adminToken')
        || sessionStorage.getItem('adminToken')
        || localStorage.getItem('ownerToken')
        || localStorage.getItem('stocktakeToken')
        || localStorage.getItem('inventoryToken')
        || localStorage.getItem('token')
        || sessionStorage.getItem('token');
}


// ============================================
// apiCall — fetch wrapper with auth headers
// ============================================
async function apiCall(endpoint, method, data) {
    if (method === undefined) method = 'GET';
    if (data === undefined) data = null;

    const url = endpoint.startsWith('http') ? endpoint : `${DBC_CONFIG.API_URL}${endpoint}`;
    const token = getToken();

    const options = {
        method: method,
        headers: { 'Content-Type': 'application/json' }
    };

    if (token) {
        options.headers.Authorization = `Bearer ${token}`;
    }

    if (data && method !== 'GET') {
        options.body = JSON.stringify(data);
    }

    const res = await fetch(url, options);
    const json = await res.json();

    if (!res.ok) {
        const err = new Error(json.message || `API error ${res.status}`);
        err.status = res.status;
        err.data = json;
        throw err;
    }

    return json;
}


// ============================================
// logout — clears ALL known auth keys
// ============================================
// NOTE: Dashboard-specific logout hooks (e.g. POS clockOut, owner showLogin)
// should call this AFTER their own cleanup, or override locally.
function logout() {
    ['adminToken', 'ownerToken', 'stocktakeToken', 'stocktakeUser',
     'inventoryToken', 'inventoryUser', 'token', 'user',
     'userEmail', 'userRole'].forEach(function(key) {
        localStorage.removeItem(key);
        sessionStorage.removeItem(key);
    });
    window.location.href = '/login.html';
}
