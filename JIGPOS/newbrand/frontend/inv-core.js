// inv-core.js — Navigation and core utilities for inventory manager dashboard
// Depends on: inv-auth.js (showDashboard calls initializeNavigation)

// Initialize sidebar navigation
function initializeNavigation() {
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
        link.addEventListener('click', function(e) {
            const href = this.getAttribute('href');

            // Skip external links (let them navigate normally)
            if (!href || href.startsWith('/') || href.startsWith('http')) {
                return;
            }

            e.preventDefault();

            // Remove active class from all links
            navLinks.forEach(l => l.classList.remove('active'));

            // Add active class to clicked link
            this.classList.add('active');

            // Hide all sections
            document.querySelectorAll('.content-section').forEach(section => {
                section.classList.remove('active');
                section.style.display = 'none';
            });

            // Show target section with enter animation
            const target = href.substring(1);
            const targetSection = document.getElementById(target + '-section');
            if (targetSection) {
                targetSection.classList.add('active');
                targetSection.style.display = 'block';
                targetSection.classList.add('section-enter');
                setTimeout(() => targetSection.classList.remove('section-enter'), 300);
                console.log('Showing section:', target + '-section');
            } else {
                console.log('Section not found:', target + '-section');
            }

            // Load data for the section
            loadSectionData(target);

            // Close mobile menu + overlay
            const sidebar = document.getElementById('sidebar');
            if (sidebar) sidebar.classList.remove('active');
            const overlay = document.getElementById('sidebarOverlay');
            if (overlay) overlay.classList.remove('active');

            // Sync bottom nav active state
            document.querySelectorAll('.bottom-nav-item').forEach(btn => btn.classList.remove('active'));
            const bottomBtn = document.querySelector(`.bottom-nav-item[data-tab="${target}"]`);
            if (bottomBtn) bottomBtn.classList.add('active');
        });
    });
    console.log('Navigation initialized for', navLinks.length, 'links');
}

// Load data for specific section
function loadSectionData(section) {
    switch(section) {
        case 'inventory':
            loadInventoryData();
            break;
        case 'batches':
            loadBatches();
            break;
        case 'purchase-orders':
            loadPurchaseOrders();
            break;
        case 'suppliers':
            loadSuppliers();
            break;
        case 'stock':
            loadStockLevels();
            break;
        case 'auto-reorder':
            loadReorderRules();
            break;
        case 'mdc-control':
            loadMDCData();
            break;
        case 'stocktake-reviews':
            loadPendingStocktakes();
            break;
        case 'reports':
            loadReportsSection();
            break;
        case 'compliance':
            loadComplianceSection();
            break;
        case 'settings':
            loadSettings();
            break;
    }
}

// Toggle sidebar (mobile only — sidebar always visible on desktop)
function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    const menuIcon = document.getElementById('menuIcon');
    const menuText = document.getElementById('menuText');

    sidebar.classList.toggle('active');
    overlay.classList.toggle('active');

    // Update button icon and text
    if (sidebar.classList.contains('active')) {
        menuIcon.className = 'fas fa-times';
        menuText.textContent = 'Close';
    } else {
        menuIcon.className = 'fas fa-bars';
        menuText.textContent = 'Menu';
    }
}

// Format time ago helper
function formatTimeAgo(dateString) {
    if (!dateString) return 'unknown time';
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const days = Math.floor(hours / 24);
    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    return 'just now';
}
