// ===== ADMIN MODULES MODULE =====

// Module Marketplace Functions
let allModules = [];
let installedModulesList = [];

async function loadMarketplace() {
    try {
        const token = sessionStorage.getItem('adminToken');

        // Load available modules
        const modulesResponse = await fetch(`${API_URL}/modules`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const modulesData = await modulesResponse.json();

        if (modulesData.success) {
            allModules = modulesData.modules || [];
        }

        // Load installed modules
        const installedResponse = await fetch(`${API_URL}/modules/installed`, {
            headers: { 'Authorization': `Bearer ${token}` }
        });
        const installedData = await installedResponse.json();

        if (installedData.success) {
            installedModulesList = installedData.installations || [];
        }

        updateMarketplaceStats();
        renderModules();
    } catch (error) {
        console.error('Error loading marketplace:', error);
        showAdminToast('Error', 'Failed to load module marketplace', 'error');
    }
}

function updateMarketplaceStats() {
    const available = allModules.filter(m => m.status === 'available' || m.status === 'beta').length;
    const comingSoon = allModules.filter(m => m.status === 'coming-soon').length;
    const installed = installedModulesList.length;

    // Calculate monthly cost
    const monthlyCost = installedModulesList.reduce((total, inst) => {
        const module = allModules.find(m => m.moduleId === inst.moduleId);
        if (module && inst.status === 'active' && module.pricing.type === 'monthly') {
            return total + module.pricing.amount;
        }
        return total;
    }, 0);

    document.getElementById('totalModules').textContent = available;
    document.getElementById('installedModules').textContent = installed;
    document.getElementById('comingSoonModules').textContent = comingSoon;
    document.getElementById('totalModulesCost').textContent = 'R' + monthlyCost.toLocaleString();
}

function renderModules() {
    const grid = document.getElementById('marketplaceGrid');
    const category = document.getElementById('moduleCategory').value;
    const status = document.getElementById('moduleStatus').value;

    let filtered = allModules;

    // Filter by category
    if (category !== 'all') {
        filtered = filtered.filter(m => m.category === category);
    }

    // Filter by status
    if (status === 'installed') {
        const installedIds = installedModulesList.map(i => i.moduleId);
        filtered = filtered.filter(m => installedIds.includes(m.moduleId));
    } else if (status !== 'all') {
        filtered = filtered.filter(m => m.status === status);
    }

    grid.innerHTML = filtered.map(module => {
        const installation = installedModulesList.find(i => i.moduleId === module.moduleId);
        const isInstalled = !!installation;
        const statusBadge = getModuleStatusBadge(module, installation);
        const price = formatModulePrice(module);

        return `
            <div style="background: var(--cream); border-radius: 10px; padding: 25px; border: 2px solid ${isInstalled ? 'var(--green)' : 'var(--gold)'};">
                <div style="display: flex; justify-content: space-between; align-items: start; margin-bottom: 15px;">
                    <div>
                        <i class="${module.icon || 'fa-puzzle-piece'} fa-2x" style="color: var(--green);"></i>
                    </div>
                    ${statusBadge}
                </div>
                <h3 style="font-size: 1.3rem; margin-bottom: 10px; color: var(--green-deep);">${module.name}</h3>
                <p style="color: var(--green-light); margin-bottom: 15px; line-height: 1.5; min-height: 60px;">${module.description}</p>

                <div style="margin-bottom: 15px;">
                    <span style="background: var(--green-light); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; color: var(--cream);">
                        <i class="fas fa-tag"></i> ${module.category}
                    </span>
                </div>

                <div style="border-top: 1px solid var(--green); padding-top: 15px; margin-bottom: 15px;">
                    <strong style="color: var(--green-deep);">Key Features:</strong>
                    <ul style="margin: 10px 0; padding-left: 20px; color: var(--green-light);">
                        ${module.features.slice(0, 3).map(f => `<li style="margin: 5px 0;">${f.name}</li>`).join('')}
                    </ul>
                </div>

                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                    <div style="font-size: 1.4rem; font-weight: bold; color: var(--gold-dark);">${price}</div>
                    ${getModuleActions(module, installation)}
                </div>
            </div>
        `;
    }).join('');
}

function getModuleStatusBadge(module, installation) {
    if (installation) {
        if (installation.status === 'trial') {
            return '<span style="background: var(--gold); color: var(--green-deep); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">TRIAL</span>';
        }
        return '<span style="background: var(--green); color: var(--cream); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">INSTALLED</span>';
    }
    if (module.status === 'beta') {
        return '<span style="background: var(--gold-dark); color: var(--cream); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">BETA</span>';
    }
    if (module.status === 'coming-soon') {
        return '<span style="background: var(--green-light); color: var(--cream); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">COMING SOON</span>';
    }
    return '<span style="background: var(--green); color: var(--cream); padding: 5px 12px; border-radius: 20px; font-size: 0.85rem; font-weight: bold;">AVAILABLE</span>';
}

function formatModulePrice(module) {
    if (module.pricing.type === 'free') {
        return 'FREE';
    }
    const amount = 'R' + module.pricing.amount.toLocaleString();
    const period = module.pricing.type === 'one-time' ? '' : `/${module.pricing.type}`;
    return amount + period;
}

function getModuleActions(module, installation) {
    if (module.status === 'coming-soon') {
        return '<button class="action-btn" style="background: var(--green-light); cursor: not-allowed;" disabled>Coming Soon</button>';
    }

    if (installation) {
        if (installation.status === 'trial') {
            return `
                <div style="display:flex;gap:6px;align-items:center;">
                    <button class="action-btn approve-btn" onclick="activateModule('${module.moduleId}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                        <i class="fas fa-check"></i> Activate
                    </button>
                    <button class="action-btn reject-btn" onclick="uninstallModule('${module.moduleId}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
        }
        return `
            <div style="display:flex;gap:6px;align-items:center;">
                <button class="action-btn view-btn" onclick="configureModule('${module.moduleId}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                    <i class="fas fa-cog"></i> Configure
                </button>
                <button class="action-btn reject-btn" onclick="uninstallModule('${module.moduleId}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                    <i class="fas fa-trash"></i>
                </button>
            </div>
        `;
    }

    return `<button class="action-btn" onclick="installModule('${module.moduleId}')" style="background: var(--gold); color: var(--green-deep);">
        <i class="fas fa-download"></i> Install
    </button>`;
}

async function installModule(moduleId) {
    try {
        const token = sessionStorage.getItem('adminToken');
        const response = await fetch(`${API_URL}/modules/install/${moduleId}`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        const data = await response.json();

        if (data.success) {
            showAdminToast('Module Installed', 'Module installed successfully. 14-day trial activated.', 'success');
            loadMarketplace();
        } else {
            showAdminToast('Installation Failed', data.message, 'error');
        }
    } catch (error) {
        console.error('Error installing module:', error);
        showAdminToast('Error', 'Failed to install module', 'error');
    }
}

async function uninstallModule(moduleId) {
    showAdminConfirm(
        'Uninstall Module',
        'Are you sure you want to uninstall this module? This action cannot be undone.',
        async () => {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/modules/uninstall/${moduleId}`, {
                    method: 'DELETE',
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (data.success) {
                    showAdminToast('Module Uninstalled', 'Module removed successfully', 'success');
                    loadMarketplace();
                } else {
                    showAdminToast('Uninstall Failed', data.message, 'error');
                }
            } catch (error) {
                console.error('Error uninstalling module:', error);
                showAdminToast('Error', 'Failed to uninstall module', 'error');
            }
        }
    );
}

async function activateModule(moduleId) {
    // In a real implementation, this would open a payment modal
    showAdminToast('Payment Required', 'Payment integration coming soon. Module will remain in trial mode.', 'info');
}

function configureModule(moduleId) {
    const module = allModules.find(m => m.moduleId === moduleId);
    showAdminToast('Configure Module', `Configuration panel for ${module.name} coming soon`, 'info');
}

function filterModules() {
    renderModules();
}

// Check Module Subscriptions and Show/Hide Menu Items
async function checkModuleSubscriptions() {
    // API_URL provided by shared config.js
    const token = sessionStorage.getItem('adminToken');
    if (!token) {
        console.log('[Module Check] No admin token found');
        return;
    }

    try {
        const response = await fetch(`${API_URL}/subscriptions/my`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            console.log('[Module Check] Subscriptions endpoint returned', response.status, '- skipping');
            return;
        }

        const data = await response.json();

        if (data.success && data.subscriptions) {
            console.log('[Module Check] Active subscriptions:', data.subscriptions);

            // Map module IDs to menu data-module attributes
            const moduleMap = {
                'affiliate-system': 'affiliate-system',
                'voucher-system': 'voucher-system',
                'viral-engine': 'viral-engine'
            };

            // Show menu items for active subscriptions
            data.subscriptions.forEach(subscription => {
                if (['trial', 'active'].includes(subscription.status)) {
                    const moduleId = subscription.moduleId;
                    const menuItem = document.querySelector(`.sidebar-menu-item[data-module="${moduleId}"]`);
                    if (menuItem && moduleId !== 'marketplace') {
                        menuItem.style.display = 'flex';
                        console.log(`[Module Check] Showing menu item for ${moduleId}`);
                    }
                }
            });
        } else {
            console.log('[Module Check] No active subscriptions');
        }
    } catch (error) {
        console.error('[Module Check] Error fetching subscriptions:', error);
    }
}

// Load staff when staff tab is opened
document.addEventListener('DOMContentLoaded', function() {
    // Apply RBAC first to hide unauthorized tabs
    console.log('[DOMContentLoaded] Applying RBAC...');
    applyRBAC();

    // Show main tabs now that RBAC is applied (prevents flash of unauthorized tabs)
    const mainTabNav = document.getElementById('mainTabNav');
    if (mainTabNav) {
        mainTabNav.classList.add('rbac-ready');
    }

    // Check module subscriptions and show appropriate menu items
    checkModuleSubscriptions();

    // Update email display from sessionStorage
    const userEmail = sessionStorage.getItem('userEmail');
    if (userEmail) {
        const emailElement = document.getElementById('adminEmail');
        if (emailElement) {
            emailElement.textContent = userEmail;
        }
    }

    const staffTab = document.querySelector('[onclick="showMainTab(\'staff\')"]');
    if (staffTab) {
        staffTab.addEventListener('click', loadStaff);
    }

    // Load leads when leads tab is opened
    const leadsTab = document.querySelector('[onclick="showMainTab(\'leads\')"]');
    if (leadsTab) {
        leadsTab.addEventListener('click', loadLeads);
    }
});
