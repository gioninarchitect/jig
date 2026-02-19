// dash-points.js — Wellness points, tiers, history, redemption
// Depends on: config.js (API_URL), dbc-utils.js (showNotification)

// ============================================================================
// WELLNESS POINTS FUNCTIONS
// ============================================================================

/**
 * Load and display user's points balance and tier information
 */
async function loadPointsData() {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/dashboard/points`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            updatePointsUI(data);
        } else {
            console.error('Failed to load points data:', response.statusText);
        }
    } catch (error) {
        console.error('Error loading points data:', error);
    }
}

/**
 * Update points UI with user data
 */
function updatePointsUI(data) {
    // Update points balance
    const pointsBalance = document.getElementById('pointsBalance');
    const pointsValue = document.getElementById('pointsValue');
    if (pointsBalance) pointsBalance.textContent = data.loyalty?.points || 0;
    if (pointsValue) pointsValue.textContent = `R${((data.loyalty?.points || 0) / 10).toFixed(2)}`;

    // Update current tier
    const currentTier = document.getElementById('currentTier');
    const tierDescription = document.getElementById('tierDescription');
    const pointsMultiplier = document.getElementById('pointsMultiplier');
    const tierDiscount = document.getElementById('tierDiscount');

    const tier = data.loyalty?.tier || 'seedling';
    const tierData = getTierData(tier);

    if (currentTier) currentTier.textContent = tierData.name;
    if (tierDescription) tierDescription.textContent = tierData.description;
    if (pointsMultiplier) pointsMultiplier.textContent = `${tierData.pointsMultiplier}x`;
    if (tierDiscount) tierDiscount.textContent = `${tierData.discountPercent}%`;

    // Update tier benefits
    const tierBenefitsList = document.getElementById('tierBenefitsList');
    if (tierBenefitsList && tierData.benefits) {
        tierBenefitsList.innerHTML = tierData.benefits.map(benefit => `
            <div style="display: flex; align-items: start; gap: 0.5rem;">
                <i data-lucide="check-circle" style="width: 16px; height: 16px; color: var(--success-color); flex-shrink: 0; margin-top: 2px;"></i>
                <span style="font-size: 0.875rem;">${benefit}</span>
            </div>
        `).join('');
        lucide.createIcons();
    }

    // Update tier progress
    const totalSpent = data.loyalty?.totalSpent || 0;
    const nextTierData = getNextTierData(tier);
    const currentSpend = document.getElementById('currentSpend');
    const nextTierSpend = document.getElementById('nextTierSpend');
    const tierProgress = document.getElementById('tierProgress');

    if (currentSpend) currentSpend.textContent = `R${totalSpent.toLocaleString()}`;
    if (nextTierSpend) nextTierSpend.textContent = nextTierData ? `R${nextTierData.minSpend.toLocaleString()}` : 'Max Tier';
    if (tierProgress) {
        const progress = nextTierData ? Math.min((totalSpent / nextTierData.minSpend) * 100, 100) : 100;
        tierProgress.style.width = `${progress}%`;
    }
}

/**
 * Get tier configuration data
 */
function getTierData(tier) {
    const tiers = {
        seedling: {
            name: 'Seedling',
            description: 'New to the garden - just starting your wellness journey',
            minSpend: 0,
            pointsMultiplier: 1.0,
            discountPercent: 0,
            benefits: ['Early access to new products', 'Birthday bonus points']
        },
        vegetative: {
            name: 'Vegetative',
            description: 'Growing strong - building your wellness routine',
            minSpend: 1000,
            pointsMultiplier: 1.25,
            discountPercent: 5,
            benefits: ['5% discount on all orders', '1.25x points multiplier', 'Priority support']
        },
        flowering: {
            name: 'Flowering',
            description: 'In full bloom - wellness is your lifestyle',
            minSpend: 5000,
            pointsMultiplier: 1.5,
            discountPercent: 10,
            benefits: ['10% discount on all orders', '1.5x points multiplier', 'Free shipping', 'Exclusive product access']
        },
        harvest: {
            name: 'Harvest',
            description: 'Reaping the rewards - wellness elite',
            minSpend: 15000,
            pointsMultiplier: 2.0,
            discountPercent: 15,
            benefits: ['15% discount on all orders', '2x points multiplier', 'Free express shipping', 'VIP events access', 'Personal wellness consultant']
        }
    };
    return tiers[tier] || tiers.seedling;
}

/**
 * Get next tier data for progress calculation
 */
function getNextTierData(currentTier) {
    const tierOrder = ['seedling', 'vegetative', 'flowering', 'harvest'];
    const currentIndex = tierOrder.indexOf(currentTier);
    if (currentIndex < tierOrder.length - 1) {
        return getTierData(tierOrder[currentIndex + 1]);
    }
    return null; // Max tier reached
}

/**
 * Load points history from backend
 */
async function loadPointsHistory() {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/dashboard/points/history`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            displayPointsHistory(data.history || []);
        } else {
            console.error('Failed to load points history:', response.statusText);
        }
    } catch (error) {
        console.error('Error loading points history:', error);
    }
}

/**
 * Display points history in the UI
 */
function displayPointsHistory(history) {
    const container = document.getElementById('pointsHistoryContainer');
    if (!container) return;

    if (history.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 3rem; color: var(--text-muted);">
                <i data-lucide="activity" style="width: 48px; height: 48px; margin-bottom: 1rem; opacity: 0.3;"></i>
                <p>No points transactions yet. Start shopping to earn wellness points!</p>
            </div>
        `;
        lucide.createIcons();
        return;
    }

    container.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 1rem;">
            ${history.map(entry => {
                const isPositive = entry.amount > 0;
                const icon = entry.type === 'earned' ? 'trending-up' :
                           entry.type === 'redeemed' ? 'gift' :
                           entry.type === 'expired' ? 'clock' : 'edit-3';
                const color = isPositive ? 'var(--success-color)' : 'var(--error-color)';

                return `
                    <div style="display: flex; align-items: center; justify-content: space-between; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="display: flex; align-items: center; gap: 1rem;">
                            <div style="width: 40px; height: 40px; background: ${isPositive ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)'}; border-radius: 50%; display: flex; align-items: center; justify-content: center;">
                                <i data-lucide="${icon}" style="width: 20px; height: 20px; color: ${color};"></i>
                            </div>
                            <div>
                                <div style="font-weight: 500; margin-bottom: 0.25rem;">${entry.reason}</div>
                                <div style="font-size: 0.75rem; color: var(--text-muted);">${new Date(entry.createdAt).toLocaleDateString()}</div>
                            </div>
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.125rem; font-weight: 700; color: ${color};">${isPositive ? '+' : ''}${entry.amount}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted);">points</div>
                        </div>
                    </div>
                `;
            }).join('')}
        </div>
    `;
    lucide.createIcons();
}

/**
 * Calculate redemption value based on input
 */
function calculateRedemptionValue() {
    const input = document.getElementById('redeemPointsInput');
    const displayDiv = document.getElementById('redemptionValueDisplay');
    const valueSpan = document.getElementById('redemptionValue');
    const redeemBtn = document.getElementById('redeemBtn');

    const points = parseInt(input.value) || 0;
    const minPoints = 100;

    if (points >= minPoints) {
        const value = points / 10; // 10 points = R1
        valueSpan.textContent = `R${value.toFixed(2)}`;
        displayDiv.style.display = 'block';
        redeemBtn.disabled = false;
    } else {
        displayDiv.style.display = 'none';
        redeemBtn.disabled = true;
    }
}

/**
 * Redeem wellness points
 */
async function redeemPoints() {
    const input = document.getElementById('redeemPointsInput');
    const points = parseInt(input.value) || 0;

    if (points < 100) {
        showNotification('Minimum 100 points required for redemption', 'error');
        return;
    }

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
            showNotification('Please login to redeem points', 'error');
            return;
        }

        const response = await fetch(`${API_URL}/dashboard/points/redeem`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ points })
        });

        if (response.ok) {
            const data = await response.json();
            showNotification(`Successfully redeemed ${points} points! Voucher code: ${data.voucherCode}`, 'success');
            input.value = '';
            calculateRedemptionValue();
            loadPointsData();
            loadPointsHistory();
        } else {
            const error = await response.json();
            showNotification(error.message || 'Failed to redeem points', 'error');
        }
    } catch (error) {
        console.error('Error redeeming points:', error);
        showNotification('Error redeeming points. Please try again.', 'error');
    }
}

// Load points data when points tab is switched to
const originalSwitchTab = window.switchTab;
window.switchTab = function(tabName) {
    if (originalSwitchTab) originalSwitchTab(tabName);
    if (tabName === 'points') {
        loadPointsData();
        loadPointsHistory();
    }
};
