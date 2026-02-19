// dash-user.js — User data, stats, purchase limits, profile, account upgrade
// Depends on: config.js (API_URL), dbc-utils.js (showNotification)
// Depends on: dash-core.js (userData, showConfirmModal)

async function loadUserData() {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        console.log('[Dashboard] loadUserData called, token exists:', !!token);
        if (!token) {
            // No token, redirect to login
            console.log('[Dashboard] No token found, redirecting to login');
            window.location.href = 'login.html';
            return;
        }

        console.log('[Dashboard] Fetching user stats from /api/v1/dashboard/stats');
        const response = await fetch('/api/v1/dashboard/stats', {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        console.log('[Dashboard] Response status:', response.status, response.ok);

        if (response.ok) {
            const data = await response.json();
            console.log('[Dashboard] User data loaded successfully');
            userData = {
                ...data.user,
                totalSpent: data.stats.totalSpent,
                totalOrders: data.stats.totalOrders,
                wellnessPoints: data.stats.loyaltyPoints
            };
            updateUserInterface();

            // Also update the stats display
            updateStatsDisplay(data.stats);

            // Load purchase limits widget if enabled
            loadPurchaseLimits();
        } else {
            const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
            console.error('[Dashboard] API error:', response.status, errorData);
            if (response.status === 401) {
                console.log('[Dashboard] Unauthorized, clearing tokens and redirecting to login');
                sessionStorage.removeItem('token');
                sessionStorage.removeItem('user');
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }

            // Fallback to demo data for development
            console.warn('Failed to load user data from API, using demo data');
            userData = {
                name: 'Demo Member',
                email: 'member@jig.cleva-ai.co.za',
                phone: '+27 XX XXX XXXX',
                isLifestyle: true,
                wellnessPoints: 100,
                membershipLevel: 'Bronze',
                totalSpent: 0,
                totalOrders: 0,
                memberSince: new Date().toISOString()
            };
            updateUserInterface();
        }
    } catch (error) {
        console.error('Error loading user data:', error);
        // Fallback to demo data
        userData = {
            name: 'Demo Member',
            email: 'member@jig.cleva-ai.co.za',
            phone: '+27 XX XXX XXXX',
            isLifestyle: true,
            wellnessPoints: 100,
            membershipLevel: 'Bronze',
            totalSpent: 0,
            totalOrders: 0,
            memberSince: new Date().toISOString()
        };
        updateUserInterface();
    }
}

function updateStatsDisplay(stats) {
    // Update dashboard statistics with null checks
    const totalOrders = document.getElementById('totalOrders');
    const totalSpent = document.getElementById('totalSpent');
    const pendingOrders = document.getElementById('pendingOrders');
    const completedOrders = document.getElementById('completedOrders');
    const wellnessPoints = document.getElementById('wellnessPoints');

    if (totalOrders) totalOrders.textContent = stats.totalOrders;
    if (totalSpent) totalSpent.textContent = `R ${stats.totalSpent.toLocaleString()}`;
    if (pendingOrders) pendingOrders.textContent = stats.pendingOrders;
    if (completedOrders) completedOrders.textContent = stats.completedOrders;
    if (wellnessPoints) wellnessPoints.textContent = stats.loyaltyPoints;
}

// ===== PURCHASE LIMITS WIDGET =====
async function loadPurchaseLimits() {
    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) return;

        const response = await fetch(`${API_URL}/dashboard/purchase-limits`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const limits = data.purchaseLimits;

            // Only show widget if purchase limits are enabled for this user
            if (limits && limits.enabled) {
                updatePurchaseLimitsWidget(limits);
                document.getElementById('purchaseLimitsWidget').style.display = 'block';
            } else {
                document.getElementById('purchaseLimitsWidget').style.display = 'none';
            }
        } else {
            // Hide widget if API call fails
            document.getElementById('purchaseLimitsWidget').style.display = 'none';
        }
    } catch (error) {
        console.error('Error loading purchase limits:', error);
        document.getElementById('purchaseLimitsWidget').style.display = 'none';
    }
}

function updatePurchaseLimitsWidget(limits) {
    const widget = document.getElementById('purchaseLimitsWidget');
    if (!widget) return;

    // Calculate percentages
    const dailyUsed = limits.currentDayUsage || 0;
    const dailyLimit = limits.dailyLimit || 150;
    const dailyPercent = Math.min(100, Math.round((dailyUsed / dailyLimit) * 100));
    const dailyRemaining = Math.max(0, dailyLimit - dailyUsed);

    const monthlyUsed = limits.currentMonthUsage || 0;
    const monthlyLimit = limits.monthlyLimit || 600;
    const monthlyPercent = Math.min(100, Math.round((monthlyUsed / monthlyLimit) * 100));
    const monthlyRemaining = Math.max(0, monthlyLimit - monthlyUsed);

    // Update daily limit display
    document.getElementById('dailyLimitText').textContent = `${dailyUsed}g / ${dailyLimit}g`;
    document.getElementById('dailyRemaining').textContent = `${dailyRemaining}g remaining`;
    document.getElementById('dailyPercent').textContent = `${dailyPercent}%`;

    // Update daily progress bar with color based on usage
    const dailyBar = document.getElementById('dailyLimitBar');
    dailyBar.style.width = `${dailyPercent}%`;
    dailyBar.style.background = getProgressBarColor(dailyPercent);

    // Update monthly limit display
    document.getElementById('monthlyLimitText').textContent = `${monthlyUsed}g / ${monthlyLimit}g`;
    document.getElementById('monthlyRemaining').textContent = `${monthlyRemaining}g remaining`;
    document.getElementById('monthlyPercent').textContent = `${monthlyPercent}%`;

    // Update monthly progress bar with color based on usage
    const monthlyBar = document.getElementById('monthlyLimitBar');
    monthlyBar.style.width = `${monthlyPercent}%`;
    monthlyBar.style.background = getProgressBarColor(monthlyPercent);

    // Show/hide warning banner
    const warningBanner = document.getElementById('limitWarningBanner');
    const warningMessage = document.getElementById('limitWarningMessage');

    if (dailyPercent >= 100 || monthlyPercent >= 100) {
        warningBanner.style.display = 'block';
        warningMessage.textContent = dailyPercent >= 100
            ? 'You have reached your daily purchase limit'
            : 'You have reached your monthly purchase limit';
        warningBanner.style.background = 'rgba(239, 68, 68, 0.2)';
        warningBanner.style.borderColor = '#EF4444';
    } else if (dailyPercent >= 80 || monthlyPercent >= 80) {
        warningBanner.style.display = 'block';
        warningMessage.textContent = dailyPercent >= 80
            ? 'You are approaching your daily purchase limit'
            : 'You are approaching your monthly purchase limit';
        warningBanner.style.background = 'rgba(217, 119, 6, 0.2)';
        warningBanner.style.borderColor = 'var(--gold)';
    } else {
        warningBanner.style.display = 'none';
    }

    // Update reset timer
    updateLimitResetTime(limits.lastDayReset, limits.lastMonthReset);
}

function getProgressBarColor(percent) {
    if (percent >= 100) {
        return 'linear-gradient(90deg, #EF4444, #DC2626)'; // Red - at limit
    } else if (percent >= 80) {
        return 'linear-gradient(90deg, #F59E0B, #D97706)'; // Orange - approaching limit
    } else if (percent >= 50) {
        return 'linear-gradient(90deg, #FBBF24, #F59E0B)'; // Yellow - half way
    } else {
        return 'linear-gradient(90deg, #22C55E, #16A34A)'; // Green - good
    }
}

function updateLimitResetTime(lastDayReset, lastMonthReset) {
    const resetTimeEl = document.getElementById('limitResetTime');
    if (!resetTimeEl) return;

    // Calculate time until midnight (daily reset)
    const now = new Date();
    const midnight = new Date();
    midnight.setHours(24, 0, 0, 0);
    const hoursUntilReset = Math.floor((midnight - now) / (1000 * 60 * 60));
    const minutesUntilReset = Math.floor(((midnight - now) % (1000 * 60 * 60)) / (1000 * 60));

    resetTimeEl.textContent = `Daily resets in: ${hoursUntilReset}h ${minutesUntilReset}m`;
}

function updateUserInterface() {
    if (!userData) return;

    // Update user info with null checks
    const userNameEl = document.getElementById('userName');
    const userEmailEl = document.getElementById('userEmail');
    const welcomeNameEl = document.getElementById('welcomeName');
    const userAvatarEl = document.getElementById('userAvatar');

    if (userNameEl) userNameEl.textContent = userData.name || 'Member';
    if (userEmailEl) userEmailEl.textContent = userData.email || '';
    if (welcomeNameEl) welcomeNameEl.textContent = (userData.name || 'Member').split(' ')[0];
    if (userAvatarEl) userAvatarEl.textContent = (userData.name || 'M')[0].toUpperCase();

    // Update membership info with null check
    const membershipLevelEl = document.getElementById('membershipLevel');
    if (membershipLevelEl) membershipLevelEl.textContent = userData.isLifestyle ? 'Lifestyle Member' : 'Regular Member';

    // Update stats with null checks
    const totalOrdersEl = document.getElementById('totalOrders');
    const totalSpentEl = document.getElementById('totalSpent');
    const loyaltyPointsEl = document.getElementById('loyaltyPoints');
    const memberLevelEl = document.getElementById('memberLevel');

    if (totalOrdersEl) totalOrdersEl.textContent = userData.totalOrders || 0;
    if (totalSpentEl) totalSpentEl.textContent = 'R' + (userData.totalSpent || 0).toLocaleString();
    if (loyaltyPointsEl) loyaltyPointsEl.textContent = userData.wellnessPoints || 100;
    if (memberLevelEl) memberLevelEl.textContent = userData.membershipLevel || 'Bronze';

    // Update Account Settings display
    const accountEmailEl = document.getElementById('accountEmail');
    const accountNameEl = document.getElementById('accountName');
    const accountCreatedEl = document.getElementById('accountCreated');
    if (accountEmailEl) accountEmailEl.textContent = userData.email || 'Not set';
    if (accountNameEl) accountNameEl.textContent = userData.name || 'Not set';
    if (accountCreatedEl) {
        const createdDate = userData.createdAt ? new Date(userData.createdAt).toLocaleDateString('en-ZA', { year: 'numeric', month: 'long', day: 'numeric' }) : 'Unknown';
        accountCreatedEl.textContent = createdDate;
    }

    // Update profile form
    const profileNameEl = document.getElementById('profileName');
    if (profileNameEl) {
        profileNameEl.value = userData.name || '';
        const profileEmailEl = document.getElementById('profileEmail');
        const profilePhoneEl = document.getElementById('profilePhone');
        if (profileEmailEl) profileEmailEl.value = userData.email || '';
        if (profilePhoneEl) profilePhoneEl.value = userData.phone || '';
    }
}

// Modal functions
function viewProfile() {
    // Ensure profile form has latest data
    if (userData) {
        document.getElementById('profileName').value = userData.name || '';
        document.getElementById('profileEmail').value = userData.email || '';
        document.getElementById('profilePhone').value = userData.phone || '';
    }
    document.getElementById('profileModal').style.display = 'block';
}

function closeProfileModal() {
    document.getElementById('profileModal').style.display = 'none';
}

// Form handlers
document.getElementById('profileForm')?.addEventListener('submit', async function(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('profileName').value,
        email: document.getElementById('profileEmail').value,
        phone: document.getElementById('profilePhone').value
    };

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
            showNotification('Please log in to update your profile', 'error');
            window.location.href = 'login.html';
            return;
        }

        const response = await fetch('/api/v1/dashboard/profile', {
            method: 'PUT',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${token}`
            },
            body: JSON.stringify(formData)
        });

        const result = await response.json();

        if (response.ok) {
            // Update local userData with response
            userData = { ...userData, ...result.user };
            updateUserInterface();
            closeProfileModal();
            showNotification(result.message || 'Profile updated successfully!', 'success');
        } else {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }
            showNotification(result.error || 'Failed to update profile', 'error');
        }
    } catch (error) {
        console.error('Profile update error:', error);
        showNotification('Network error. Please try again.', 'error');
    }
});

async function upgradeAccount() {
    if (userData && !userData.isLifestyle) {
        showConfirmModal(
            'Upgrade Membership',
            'Upgrade to Lifestyle Membership for exclusive benefits?',
            'fa-crown',
            async function() {
                try {
                    const token = sessionStorage.getItem('token') || localStorage.getItem('token');
                    const response = await fetch('/api/v1/dashboard/upgrade-membership', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'Authorization': `Bearer ${token}`
                        },
                        body: JSON.stringify({ level: 'lifestyle' })
                    });

                    const result = await response.json();

                    if (response.ok) {
                        userData.isLifestyle = true;
                        userData.membershipLevel = result.user.membershipLevel;
                        userData.wellnessPoints = result.user.wellnessPoints;
                        updateUserInterface();
                        showNotification(result.message || 'Membership upgraded successfully!', 'success');
                    } else {
                        showNotification(result.error || 'Failed to upgrade membership', 'error');
                    }
                } catch (error) {
                    console.error('Upgrade error:', error);
                    showNotification('Network error. Please try again.', 'error');
                }
            }
        );
    } else {
        showNotification('You already have the highest membership level!', 'info');
    }
}
