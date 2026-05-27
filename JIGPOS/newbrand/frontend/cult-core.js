// cult-core.js — Navigation, sidebar, utilities for cultivation dashboard
// Depends on: config.js, or-utils.js, cult-auth.js

// ============================================
// SIDEBAR + NAVIGATION
// ============================================

function toggleSidebar() {
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    sidebar.classList.toggle('open');
    overlay.classList.toggle('active');
}

function toggleSidebarCollapse() {
    const sidebar = document.getElementById('sidebar');
    sidebar.classList.toggle('collapsed');
}

function initializeNavigation() {
    const hash = window.location.hash || '#overview';
    navigateTo(hash.replace('#', ''));

    window.addEventListener('hashchange', function() {
        const hash = window.location.hash || '#overview';
        navigateTo(hash.replace('#', ''));
    });
}

function navigateTo(section) {
    // Hide all sections
    document.querySelectorAll('.dashboard-section').forEach(s => {
        s.classList.remove('active');
    });

    // Show target section
    const target = document.getElementById('section-' + section);
    if (target) {
        target.classList.add('active');
    }

    // Update nav links
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
        if (link.getAttribute('href') === '#' + section) {
            link.classList.add('active');
        }
    });

    // Update header
    const titles = {
        overview: 'Facility Overview',
        zones: 'Zones & Rooms',
        batches: 'Batch Management',
        environment: 'Environmental Monitoring',
        harvest: 'Harvest Records',
        compliance: 'SAHPRA Compliance',
        reports: 'Reports'
    };

    const headerEl = document.getElementById('sectionTitle');
    if (headerEl) headerEl.textContent = titles[section] || 'Cultivation Dashboard';

    const subtitleEl = document.getElementById('sectionSubtitle');
    if (subtitleEl) {
        const subtitles = {
            overview: 'Facility KPIs and zone status',
            zones: 'Manage tunnel and indoor growing zones',
            batches: 'Track batches from seed to harvest',
            environment: 'Temperature, humidity, CO2 and light monitoring',
            harvest: 'Record harvests and track yields',
            compliance: 'SAHPRA Section 22C compliance tracking',
            reports: 'Generate and export reports'
        };
        subtitleEl.textContent = subtitles[section] || '';
    }

    // Load section data
    loadSectionData(section);

    // Close mobile sidebar
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('sidebarOverlay');
    if (sidebar) sidebar.classList.remove('open');
    if (overlay) overlay.classList.remove('active');
}

// ============================================
// DATA LOADING
// ============================================

async function loadDashboardData() {
    // Load initial section based on hash
    const hash = window.location.hash || '#overview';
    loadSectionData(hash.replace('#', ''));
}

async function loadSectionData(section) {
    switch (section) {
        case 'overview':
            if (typeof loadOverview === 'function') loadOverview();
            break;
        case 'zones':
            if (typeof loadZones === 'function') loadZones();
            break;
        case 'batches':
            if (typeof loadBatches === 'function') loadBatches();
            break;
        case 'environment':
            if (typeof loadEnvironment === 'function') loadEnvironment();
            break;
        case 'harvest':
            if (typeof loadHarvests === 'function') loadHarvests();
            break;
        case 'compliance':
            if (typeof loadCompliance === 'function') loadCompliance();
            break;
        case 'reports':
            // Reports loaded on demand
            break;
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

function cultApiCall(endpoint, method, data) {
    return apiCall(`/cultivation${endpoint}`, method, data);
}

function formatDate(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

function formatDateTime(dateStr) {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });
}

function formatWeight(grams) {
    if (!grams && grams !== 0) return '—';
    if (grams >= 1000) return (grams / 1000).toFixed(2) + ' kg';
    return grams.toFixed(0) + ' g';
}

function phaseLabel(phase) {
    const labels = {
        propagation: 'Propagation',
        vegetative: 'Vegetative',
        flowering: 'Flowering',
        harvest_ready: 'Harvest Ready',
        harvested: 'Harvested',
        processing: 'Processing',
        complete: 'Complete'
    };
    return labels[phase] || phase;
}

function phaseIcon(phase) {
    const icons = {
        propagation: 'fa-seedling',
        vegetative: 'fa-leaf',
        flowering: 'fa-spa',
        harvest_ready: 'fa-exclamation-circle',
        harvested: 'fa-cut',
        processing: 'fa-flask',
        complete: 'fa-check-circle'
    };
    return icons[phase] || 'fa-circle';
}

function zoneTypeIcon(type) {
    return type === 'tunnel' ? 'fa-sun' : 'fa-lightbulb';
}

function zoneTypeLabel(type) {
    return type === 'tunnel' ? 'Tunnel/Greenhouse' : 'Indoor Grow Room';
}

function statusColor(status) {
    if (status === 'green' || status === 'active') return 'green';
    if (status === 'yellow' || status === 'maintenance') return 'yellow';
    return 'red';
}

// Show/hide modal
function showModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.add('active');
}

function hideModal(id) {
    const modal = document.getElementById(id);
    if (modal) modal.classList.remove('active');
}

// Generic table builder
function buildTable(headers, rows, emptyMessage) {
    if (!rows || rows.length === 0) {
        return `<div class="empty-state"><i class="fas fa-inbox"></i><p>${emptyMessage || 'No data found'}</p></div>`;
    }

    let html = '<table class="cult-table"><thead><tr>';
    headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    rows.forEach(row => {
        html += '<tr>';
        row.forEach(cell => { html += `<td>${cell}</td>`; });
        html += '</tr>';
    });
    html += '</tbody></table>';
    return html;
}
