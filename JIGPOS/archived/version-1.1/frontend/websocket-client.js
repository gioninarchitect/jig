/**
 * WebSocket Client for Real-Time Notifications
 * Handles Socket.IO connection and notification display for staff
 */

let socket = null;
let reconnectAttempts = 0;
const MAX_RECONNECT_ATTEMPTS = 5;

/**
 * Initialize WebSocket connection
 */
function initWebSocket() {
    const token = sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || localStorage.getItem('token');

    if (!token) {
        console.warn('[WebSocket] No authentication token found');
        return;
    }

    // Determine Socket.IO server URL
    const socketURL = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:3001'
        : `${window.location.protocol}//${window.location.host}`;

    console.log('[WebSocket] Connecting to:', socketURL);

    // Initialize Socket.IO connection
    socket = io(socketURL, {
        auth: {
            token: token
        },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionAttempts: MAX_RECONNECT_ATTEMPTS,
        reconnectionDelay: 1000,
        reconnectionDelayMax: 5000
    });

    // Connection successful
    socket.on('connected', (data) => {
        console.log('[WebSocket] Connected successfully:', data.message);
        reconnectAttempts = 0;
        showConnectionStatus('connected');
    });

    // Connection error
    socket.on('connect_error', (error) => {
        console.error('[WebSocket] Connection error:', error.message);
        reconnectAttempts++;
        showConnectionStatus('error');

        if (reconnectAttempts >= MAX_RECONNECT_ATTEMPTS) {
            console.error('[WebSocket] Max reconnection attempts reached');
            showNotification('Connection Error', 'Unable to connect to notification service', 'error');
        }
    });

    // Disconnected
    socket.on('disconnect', (reason) => {
        console.log('[WebSocket] Disconnected:', reason);
        showConnectionStatus('disconnected');

        if (reason === 'io server disconnect') {
            // Server disconnected, try to reconnect
            socket.connect();
        }
    });

    // Reconnecting
    socket.on('reconnecting', (attemptNumber) => {
        console.log(`[WebSocket] Reconnecting... Attempt ${attemptNumber}/${MAX_RECONNECT_ATTEMPTS}`);
        showConnectionStatus('reconnecting');
    });

    // Reconnected
    socket.on('reconnect', (attemptNumber) => {
        console.log('[WebSocket] Reconnected after', attemptNumber, 'attempts');
        reconnectAttempts = 0;
        showConnectionStatus('connected');
        showNotification('Reconnected', 'Connection restored', 'success');
    });

    // ===================================================================
    // EVENT HANDLERS
    // ===================================================================

    // Payment Approved
    socket.on('payment:approved', (data) => {
        console.log('[WebSocket] Payment approved:', data);

        showNotification(
            data.title || 'Payment Approved',
            data.message,
            'success',
            () => {
                // Optional: Navigate to order details
                if (data.orderId) {
                    window.location.href = `/drive-through-staff.html?orderId=${data.orderId}`;
                }
            }
        );

        // Play notification sound
        playNotificationSound();

        // Update badge count
        incrementNotificationBadge();

        // If on drive-through staff page, refresh queue
        if (window.location.pathname.includes('drive-through-staff')) {
            if (typeof loadPendingApprovals === 'function') {
                loadPendingApprovals();
            }
            if (typeof loadQueue === 'function') {
                loadQueue();
            }
        }
    });

    // New EFT Payment Pending
    socket.on('payment:pending', (data) => {
        console.log('[WebSocket] New EFT payment pending:', data);

        showNotification(
            data.title || 'New EFT Payment',
            data.message,
            'info',
            () => {
                window.location.href = `/drive-through-staff.html?tab=approvals`;
            }
        );

        playNotificationSound();
        incrementNotificationBadge();

        // If on drive-through staff page, refresh pending approvals
        if (window.location.pathname.includes('drive-through-staff')) {
            if (typeof loadPendingApprovals === 'function') {
                loadPendingApprovals();
            }
        }
    });

    // Queue Updated
    socket.on('queue:updated', (data) => {
        console.log('[WebSocket] Queue updated:', data);

        // If on drive-through staff page, refresh queue
        if (window.location.pathname.includes('drive-through-staff') ||
            window.location.pathname.includes('drive-through')) {
            if (typeof loadQueue === 'function') {
                loadQueue();
            }
        }
    });

    // Order Ready
    socket.on('order:ready', (data) => {
        console.log('[WebSocket] Order ready:', data);

        showNotification(
            data.title || 'Order Ready',
            data.message,
            'success'
        );

        playNotificationSound();
    });

    // Points Awarded
    socket.on('points:awarded', (data) => {
        console.log('[WebSocket] Points awarded:', data);

        showNotification(
            data.title || 'Points Earned',
            data.message,
            'success'
        );
    });

    // Ping/Pong for connection health
    setInterval(() => {
        if (socket && socket.connected) {
            socket.emit('ping');
        }
    }, 30000); // Every 30 seconds

    socket.on('pong', (data) => {
        console.log('[WebSocket] Pong received:', data.timestamp);
    });
}

/**
 * Show notification to user
 */
function showNotification(title, message, type = 'info', onClick = null) {
    // Check if showToast function exists (from admin panel)
    if (typeof showToast === 'function') {
        showToast(title, message, type);
        return;
    }

    // Fallback to browser notification if available
    if ('Notification' in window && Notification.permission === 'granted') {
        const notification = new Notification(title, {
            body: message,
            icon: '/images/logo.png',
            badge: '/images/logo.png',
            tag: `notification-${Date.now()}`,
            requireInteraction: type === 'error' || type === 'warning'
        });

        if (onClick) {
            notification.onclick = onClick;
        }
    } else {
        // Fallback to console
        console.log(`[Notification] ${title}: ${message}`);
    }
}

/**
 * Show connection status indicator
 */
function showConnectionStatus(status) {
    const statusIndicator = document.getElementById('websocket-status');
    if (!statusIndicator) return;

    const statusConfig = {
        connected: { color: '#4CAF50', text: 'Connected', icon: '✓' },
        disconnected: { color: '#f44336', text: 'Disconnected', icon: '✗' },
        reconnecting: { color: '#ff9800', text: 'Reconnecting...', icon: '⟳' },
        error: { color: '#f44336', text: 'Connection Error', icon: '!' }
    };

    const config = statusConfig[status] || statusConfig.disconnected;

    statusIndicator.style.backgroundColor = config.color;
    statusIndicator.textContent = `${config.icon} ${config.text}`;
    statusIndicator.style.padding = '5px 10px';
    statusIndicator.style.borderRadius = '5px';
    statusIndicator.style.fontSize = '0.85rem';
    statusIndicator.style.fontWeight = '600';
    statusIndicator.style.color = 'white';
}

/**
 * Play notification sound
 */
function playNotificationSound() {
    try {
        const audio = new Audio('data:audio/wav;base64,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Tpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsIG2e+7eWZTQwJTpzd8bN1KgU2i9Xz0Ig7BSZ/zPHZiTsI');
        audio.volume = 0.3;
        audio.play().catch(err => console.log('[WebSocket] Sound play failed:', err));
    } catch (error) {
        console.error('[WebSocket] Sound playback error:', error);
    }
}

/**
 * Increment notification badge
 */
function incrementNotificationBadge() {
    const badge = document.getElementById('notification-badge');
    if (badge) {
        const currentCount = parseInt(badge.textContent) || 0;
        badge.textContent = currentCount + 1;
        badge.style.display = 'inline-block';
    }
}

/**
 * Request notification permission
 */
function requestNotificationPermission() {
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission().then(permission => {
            console.log('[WebSocket] Notification permission:', permission);
        });
    }
}

/**
 * Disconnect WebSocket
 */
function disconnectWebSocket() {
    if (socket) {
        socket.disconnect();
        socket = null;
        console.log('[WebSocket] Disconnected');
    }
}

// Auto-initialize on page load for staff/admin pages
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize on staff/admin pages
    const staffPages = ['admin.html', 'drive-through-staff.html', 'dashboard.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (staffPages.includes(currentPage)) {
        console.log('[WebSocket] Initializing for staff page:', currentPage);
        initWebSocket();
        requestNotificationPermission();
    }
});

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    disconnectWebSocket();
});
