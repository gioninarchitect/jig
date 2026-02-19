// dash-core.js — Core dashboard initialization, tabs, confirm modal, logout, menus
// Depends on: config.js (API_URL), dbc-utils.js (showNotification)

// Dashboard functionality
let userData = null;
let orders = [];

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    // CRITICAL: Redirect admin/staff to admin.html - they shouldn't be on customer dashboard
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const adminRoles = ['admin', 'branch_manager', 'branch_assistant'];
    if (user.role && adminRoles.includes(user.role)) {
        console.log('[Dashboard] Admin/staff detected - redirecting to admin.html');
        window.location.href = 'admin.html';
        return;
    }

    loadUserData().then(() => {
        // Check Section 21 status after user data is loaded
        checkSection21Status();
    });
    loadOrders();
    loadActivityFeed();
    moveContentToTabs(); // Move existing content to appropriate tabs
});

// ===== TAB NAVIGATION =====
function switchTab(tabName) {
    // Hide all tab contents
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
    });

    // Remove active class from all buttons
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    // Show selected tab
    const tabContent = document.getElementById(`tab-${tabName}`);
    if (tabContent) tabContent.classList.add('active');

    // Activate the button for this tab
    const tabButton = document.querySelector(`.tab-button[onclick*="switchTab('${tabName}')"]`);
    if (tabButton) tabButton.classList.add('active');

    // Load content for specific tabs
    if (tabName === 'lifestyle' && !window.lifestyleProductsLoaded) {
        loadLifestyleProducts();
        window.lifestyleProductsLoaded = true;
    } else if (tabName === 'medical' && !window.medicalContentMoved) {
        moveMedicalContentToTab();
        window.medicalContentMoved = true;
    }
}

// Move existing dashboard content into tabs
function moveContentToTabs() {
    // Move Section 21 and Medical Products to Medical tab
    moveMedicalContentToTab();
}

function moveMedicalContentToTab() {
    const medicalContent = document.getElementById('medicalTabContent');
    const section21Card = document.getElementById('section21Card');
    const medicalProductsCard = document.getElementById('medicalProductsCard');

    if (section21Card && medicalContent) {
        medicalContent.appendChild(section21Card.cloneNode(true));
        section21Card.style.display = 'none';
    }

    if (medicalProductsCard && medicalContent) {
        medicalContent.appendChild(medicalProductsCard.cloneNode(true));
        medicalProductsCard.style.display = 'none';
    }
}

// Confirmation modal state
let confirmCallback = null;

function showConfirmModal(title, message, icon, callback, confirmText = 'Confirm', cancelText = 'Cancel') {
    document.getElementById('confirmTitle').textContent = title;
    document.getElementById('confirmMessage').textContent = message;
    document.getElementById('confirmIcon').innerHTML = `<i class="fas ${icon}"></i>`;
    confirmCallback = callback;

    // Update button text
    document.getElementById('confirmBtn').textContent = confirmText;

    // Show/hide cancel button based on cancelText parameter
    const cancelBtn = document.getElementById('cancelBtn');
    if (cancelText === null) {
        cancelBtn.style.display = 'none';
    } else {
        cancelBtn.style.display = 'block';
        cancelBtn.textContent = cancelText;
    }

    document.getElementById('confirmModal').style.display = 'flex';
}

function closeConfirmModal() {
    document.getElementById('confirmModal').style.display = 'none';
    confirmCallback = null;
}

function confirmAction() {
    if (confirmCallback) {
        confirmCallback();
    }
    closeConfirmModal();
}

function logout() {
    showConfirmModal(
        'Logout',
        'Are you sure you want to logout?',
        'fa-sign-out-alt',
        function() {
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            sessionStorage.clear();
            window.location.href = 'login.html';
        }
    );
}

function toggleMobileMenu() {
    const userMenu = document.getElementById('userMenu');
    userMenu.classList.toggle('mobile-open');
}

function toggleUserMenu() {
    const userMenu = document.getElementById('userMenu');
    userMenu.classList.toggle('active');
}

// showNotification provided by /frontend/dbc-utils.js (aliases to showToast)

// Add animation styles
const animationStyles = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }
    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;

const styleSheet = document.createElement('style');
styleSheet.textContent = animationStyles;
document.head.appendChild(styleSheet);

// Initialize Lucide icons
if (typeof lucide !== 'undefined') {
    lucide.createIcons();
}
