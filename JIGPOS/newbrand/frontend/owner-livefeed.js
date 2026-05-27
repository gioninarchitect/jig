// owner-livefeed.js — Real-time live activity feed for owner dashboard
// Depends on: config.js (API_URL), owner-auth.js (token), or-utils.js (showToast)

let liveFeedSocket = null;
let liveFeedEvents = [];
const LIVE_FEED_MAX = 20;

function initLiveFeed() {
    const feedContainer = document.getElementById('liveFeedList');
    if (!feedContainer) return;

    connectLiveFeedSocket();
    renderLiveFeed();
}

function connectLiveFeedSocket() {
    if (!token) return;

    // Build Socket.IO URL from API_URL (strip /api/v1)
    const baseUrl = API_URL.replace('/api/v1', '');

    if (typeof io === 'undefined') {
        console.warn('[LiveFeed] Socket.IO client not loaded');
        return;
    }

    liveFeedSocket = io(baseUrl, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 2000,
        reconnectionAttempts: 10
    });

    liveFeedSocket.on('connect', () => {
        console.log('[LiveFeed] Connected to WebSocket');
        updateConnectionStatus(true);
    });

    liveFeedSocket.on('disconnect', () => {
        console.log('[LiveFeed] Disconnected from WebSocket');
        updateConnectionStatus(false);
    });

    liveFeedSocket.on('connect_error', (err) => {
        console.warn('[LiveFeed] Connection error:', err.message);
        updateConnectionStatus(false);
    });

    // Listen for owner events
    liveFeedSocket.on('sale:completed', (data) => {
        addFeedEvent({
            type: 'sale',
            icon: 'fa-cash-register',
            color: '#22C55E',
            title: `Sale ${data.saleNumber}`,
            detail: `R${(data.totalAmount || 0).toFixed(2)} - ${data.items} item${data.items !== 1 ? 's' : ''} (${data.paymentMethod || 'cash'})`,
            branchId: data.branchId,
            timestamp: data.timestamp || Date.now()
        });
    });

    liveFeedSocket.on('till:closed', (data) => {
        const variance = data.variance || 0;
        const varianceStr = variance === 0 ? 'No variance' : `Variance: R${Math.abs(variance).toFixed(2)} ${variance > 0 ? 'over' : 'short'}`;
        addFeedEvent({
            type: 'till',
            icon: 'fa-lock',
            color: '#6366F1',
            title: `Till Closed - Session ${data.sessionNumber}`,
            detail: `${data.transactionCount} transactions, R${(data.totalSales || 0).toFixed(2)} total. ${varianceStr}`,
            branchId: data.branchId,
            timestamp: data.timestamp || Date.now()
        });
    });

    liveFeedSocket.on('cashup:submitted', (data) => {
        addFeedEvent({
            type: 'cashup',
            icon: 'fa-file-invoice-dollar',
            color: 'var(--gold)',
            title: 'Cashup Submitted',
            detail: `Total sales: R${(data.totalSales || 0).toFixed(2)}. Variance: R${Math.abs(data.totalVariance || 0).toFixed(2)}`,
            branchId: data.branchId,
            timestamp: data.timestamp || Date.now()
        });
    });
}

function updateConnectionStatus(connected) {
    const dot = document.getElementById('liveFeedStatusDot');
    const text = document.getElementById('liveFeedStatusText');
    if (dot) {
        dot.style.background = connected ? '#22C55E' : 'var(--red)';
        dot.style.boxShadow = connected ? '0 0 6px rgba(34,197,94,0.6)' : '0 0 6px rgba(220, 38, 38,0.6)';
    }
    if (text) text.textContent = connected ? 'Live' : 'Reconnecting...';
}

function addFeedEvent(event) {
    // Resolve branch name
    event.branchName = resolveBranchName(event.branchId);

    liveFeedEvents.unshift(event);
    if (liveFeedEvents.length > LIVE_FEED_MAX) {
        liveFeedEvents = liveFeedEvents.slice(0, LIVE_FEED_MAX);
    }

    renderLiveFeed();
    pulseFeedItem();
}

function resolveBranchName(branchId) {
    if (!branchId) return 'Unknown';
    // Try to find from cached branch data in DOM
    const branchCards = document.querySelectorAll('.branch-card .branch-name');
    for (const el of branchCards) {
        const card = el.closest('.branch-card');
        if (card && card.dataset.branchId === branchId) return el.textContent;
    }
    // Fallback: use the owner-stats data if loaded
    if (window._ownerBranchMap && window._ownerBranchMap[branchId]) {
        return window._ownerBranchMap[branchId];
    }
    return branchId.toString().slice(-6);
}

function renderLiveFeed() {
    const container = document.getElementById('liveFeedList');
    if (!container) return;

    const filterBranch = document.getElementById('liveFeedBranchFilter')?.value || 'all';

    const filtered = filterBranch === 'all'
        ? liveFeedEvents
        : liveFeedEvents.filter(e => e.branchId?.toString() === filterBranch);

    if (filtered.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--or-grey-2);">
                <i class="fas fa-satellite-dish" style="font-size: 2rem; margin-bottom: 0.75rem; opacity: 0.4;"></i>
                <p>Waiting for live activity...</p>
                <p style="font-size: 0.8rem; margin-top: 0.25rem;">Events will appear here as they happen</p>
            </div>
        `;
        return;
    }

    container.innerHTML = filtered.map((event, i) => {
        const time = new Date(event.timestamp);
        const timeStr = time.toLocaleTimeString('en-ZA', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
        return `
            <div class="live-feed-item ${i === 0 ? 'feed-item-new' : ''}" style="display: flex; align-items: flex-start; gap: 0.75rem; padding: 0.75rem; border-bottom: 1px solid var(--border-dark, #30363D); transition: background 0.3s;">
                <div style="width: 32px; height: 32px; border-radius: 8px; background: ${event.color}20; color: ${event.color}; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                    <i class="fas ${event.icon}" style="font-size: 0.85rem;"></i>
                </div>
                <div style="flex: 1; min-width: 0;">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.15rem;">
                        <strong style="font-size: 0.85rem; color: var(--text-primary, #E6EDF3);">${event.title}</strong>
                        <span style="font-size: 0.7rem; color: var(--text-muted, #6E7681); white-space: nowrap;">${timeStr}</span>
                    </div>
                    <div style="font-size: 0.8rem; color: var(--text-secondary, #8B949E);">${event.detail}</div>
                    <div style="font-size: 0.7rem; color: var(--text-muted, #6E7681); margin-top: 0.15rem;">
                        <i class="fas fa-store" style="font-size: 0.6rem;"></i> ${event.branchName}
                    </div>
                </div>
            </div>
        `;
    }).join('');
}

function pulseFeedItem() {
    const first = document.querySelector('.feed-item-new');
    if (first) {
        first.style.background = 'rgba(240, 165, 0,0.1)';
        setTimeout(() => { first.style.background = 'transparent'; }, 1500);
    }
}

function populateBranchFilter(branches) {
    const select = document.getElementById('liveFeedBranchFilter');
    if (!select || !branches) return;

    // Keep "All Branches" option, add real branches
    const opts = ['<option value="all">All Branches</option>'];
    branches.forEach(b => {
        opts.push(`<option value="${b._id}">${b.name}</option>`);
    });
    select.innerHTML = opts.join('');
}

// Cleanup on page unload
window.addEventListener('beforeunload', () => {
    if (liveFeedSocket) {
        liveFeedSocket.disconnect();
    }
});
