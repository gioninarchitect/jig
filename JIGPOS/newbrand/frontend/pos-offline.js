// ===== POS OFFLINE MODULE =====
// Offline status indicator and sync event handlers

// Offline status indicator
function updateOfflineIndicator() {
    let indicator = document.getElementById('offlineIndicator');
    if (!indicator) {
        indicator = document.createElement('div');
        indicator.id = 'offlineIndicator';
        indicator.style.cssText = `
            position: fixed;
            top: 10px;
            left: 50%;
            transform: translateX(-50%);
            background: #f59e0b;
            color: #0A0A0A;
            padding: 8px 16px;
            border-radius: 20px;
            font-size: 14px;
            font-weight: 600;
            z-index: 9999;
            display: none;
            align-items: center;
            gap: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
        `;
        document.body.appendChild(indicator);
    }

    if (!navigator.onLine) {
        indicator.innerHTML = '<i class="fas fa-wifi-slash"></i> Offline Mode';
        indicator.style.display = 'flex';
    } else {
        indicator.style.display = 'none';
    }
}

// Listen for offline events
if (window.offlineManager) {
    window.offlineManager.on('statusChange', ({ online }) => {
        updateOfflineIndicator();
        if (online) {
            showToast('Back Online', 'Syncing offline sales...', 'success');
        } else {
            showToast('Offline Mode', 'Sales will be queued for later sync', 'warning');
        }
    });

    window.offlineManager.on('syncComplete', ({ count }) => {
        if (count > 0) {
            showToast('Sync Complete', `${count} offline sales synced`, 'success');
        }
    });

    window.offlineManager.on('pendingCountUpdate', ({ count }) => {
        const badge = document.getElementById('pendingSalesBadge');
        if (badge) {
            badge.textContent = count;
            badge.style.display = count > 0 ? 'block' : 'none';
        }
    });
}

// Initial check
updateOfflineIndicator();
window.addEventListener('online', updateOfflineIndicator);
window.addEventListener('offline', updateOfflineIndicator);
