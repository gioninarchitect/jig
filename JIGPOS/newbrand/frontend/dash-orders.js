// dash-orders.js — Orders list, order details, tracking, activity feed
// Depends on: config.js (API_URL), or-utils.js (showNotification)

async function loadOrders() {
    const tbody = document.getElementById('ordersTable');

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        Please <a href="login.html" style="color: var(--primary-color);">login</a> to view your orders.
                    </td>
                </tr>
            `;
            return;
        }

        const response = await fetch(`${API_URL}/dashboard/orders?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const orders = data.orders || [];

            if (orders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                            No orders found. <a href="#" onclick="switchTab('lifestyle'); return false;" style="color: var(--primary-color);">Start shopping!</a>
                        </td>
                    </tr>
                `;
                return;
            }

            let html = '';
            orders.forEach(order => {
                const statusClass = order.status === 'delivered' ? 'badge-success' :
                                  order.status === 'processing' ? 'badge-warning' :
                                  order.status === 'cancelled' ? 'badge-error' : 'badge-primary';

                html += `
                    <tr>
                        <td style="font-weight: 600; color: var(--primary-color);">#${order.orderNumber || 'N/A'}</td>
                        <td>${new Date(order.date).toLocaleDateString()}</td>
                        <td>
                            <div style="font-size: 0.875rem;">
                                ${order.items?.length || 0} item(s)
                            </div>
                        </td>
                        <td style="font-weight: 600;">R${order.total.toLocaleString()}</td>
                        <td><span class="badge ${statusClass}">${order.status.toUpperCase()}</span></td>
                        <td>
                            <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.75rem;" onclick="viewOrderDetails('${order.orderNumber}')">
                                View
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        } else {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }

            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--error-color); padding: 2rem;">
                        Failed to load orders. Please try again.
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading orders:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--error-color); padding: 2rem;">
                    Network error. Please try again.
                </td>
            </tr>
        `;
    }
}

// Load orders for dedicated Orders tab
async function loadOrdersForTab() {
    const tbody = document.getElementById('ordersTabTable');

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        Please <a href="login.html" style="color: var(--primary-color);">login</a> to view your orders.
                    </td>
                </tr>
            `;
            return;
        }

        const response = await fetch(`${API_URL}/dashboard/orders?limit=50`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const orders = data.orders || [];

            if (orders.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="6" style="text-align: center; color: var(--text-muted); padding: 2rem;">
                            No orders found. <a href="#" onclick="switchTab('lifestyle'); return false;" style="color: var(--primary-color);">Start shopping!</a>
                        </td>
                    </tr>
                `;
                return;
            }

            let html = '';
            orders.forEach(order => {
                const statusClass = order.status === 'delivered' ? 'badge-success' :
                                  order.status === 'processing' ? 'badge-warning' :
                                  order.status === 'cancelled' ? 'badge-error' : 'badge-primary';

                html += `
                    <tr>
                        <td style="font-weight: 600; color: var(--primary-color);">#${order.orderNumber || 'N/A'}</td>
                        <td>${new Date(order.date).toLocaleDateString()}</td>
                        <td>
                            <div style="font-size: 0.875rem;">
                                ${order.items?.length || 0} item(s)
                            </div>
                        </td>
                        <td style="font-weight: 600;">R${order.total.toLocaleString()}</td>
                        <td><span class="badge ${statusClass}">${order.status.toUpperCase()}</span></td>
                        <td>
                            <button class="btn btn-secondary" style="font-size: 0.75rem; padding: 0.25rem 0.75rem;" onclick="viewOrderDetails('${order.orderNumber}')">
                                View
                            </button>
                        </td>
                    </tr>
                `;
            });

            tbody.innerHTML = html;
        } else {
            tbody.innerHTML = `
                <tr>
                    <td colspan="6" style="text-align: center; color: var(--error-color); padding: 2rem;">
                        Failed to load orders. Please try again.
                    </td>
                </tr>
            `;
        }
    } catch (error) {
        console.error('Error loading orders for tab:', error);
        tbody.innerHTML = `
            <tr>
                <td colspan="6" style="text-align: center; color: var(--error-color); padding: 2rem;">
                    Network error. Please try again.
                </td>
            </tr>
        `;
    }
}

async function loadActivityFeed() {
    const feed = document.getElementById('activityFeed');

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        if (!token) {
            feed.innerHTML = `
                <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                    Please login to view your activity.
                </div>
            `;
            return;
        }

        const response = await fetch(`${API_URL}/dashboard/activity?limit=10`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const activities = data.activities || [];

            if (activities.length === 0) {
                feed.innerHTML = `
                    <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                        No recent activity. <a href="#" onclick="switchTab('lifestyle'); return false;" style="color: var(--primary-color);">Start shopping!</a>
                    </div>
                `;
                return;
            }

            let html = '';
            activities.forEach(activity => {
                const colorClass = activity.type === 'order_status' ? 'var(--primary-color)' :
                                 activity.type === 'order_placed' ? 'var(--success-color)' :
                                 'var(--primary-color)';

                const timeAgo = new Date(activity.time).toLocaleDateString();

                html += `
                    <div style="display: flex; align-items: start; gap: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="width: 8px; height: 8px; background: ${colorClass}; border-radius: 50%; margin-top: 0.5rem;"></div>
                        <div>
                            <div style="font-weight: 500;">${activity.title}</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">${activity.description}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">${timeAgo}</div>
                        </div>
                    </div>
                `;
            });

            feed.innerHTML = html;
        } else {
            if (response.status === 401) {
                localStorage.removeItem('token');
                window.location.href = 'login.html';
                return;
            }

            // Fallback to demo activities
            const defaultActivities = [
                {
                    title: 'Welcome to Origin by ILCO Farming!',
                    description: 'Your account is ready',
                    time: new Date(),
                    type: 'success'
                }
            ];

            let html = '';
            defaultActivities.forEach(activity => {
                html += `
                    <div style="display: flex; align-items: start; gap: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                        <div style="width: 8px; height: 8px; background: var(--success-color); border-radius: 50%; margin-top: 0.5rem;"></div>
                        <div>
                            <div style="font-weight: 500;">${activity.title}</div>
                            <div style="font-size: 0.875rem; color: var(--text-muted);">${activity.description}</div>
                            <div style="font-size: 0.75rem; color: var(--text-muted); margin-top: 0.25rem;">Just now</div>
                        </div>
                    </div>
                `;
            });

            feed.innerHTML = html;
        }
    } catch (error) {
        console.error('Error loading activity feed:', error);
        feed.innerHTML = `
            <div style="text-align: center; color: var(--text-muted); padding: 2rem;">
                Unable to load activity. Please try again.
            </div>
        `;
    }
}

// Utility functions
async function viewOrderDetails(orderNumber) {
    const modal = document.getElementById('orderDetailsModal');
    const content = document.getElementById('orderDetailsContent');

    modal.style.display = 'block';
    content.innerHTML = `
        <div style="text-align: center; padding: 2rem;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Loading order details...</p>
        </div>
    `;

    try {
        const token = sessionStorage.getItem('token') || localStorage.getItem('token');
        const response = await fetch(`${API_URL}/dashboard/orders/${orderNumber}`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (response.ok) {
            const data = await response.json();
            const order = data.order;

            content.innerHTML = `
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-muted);">Order Number</span>
                        <span style="font-weight: 600; color: var(--primary-color);">#${order.orderNumber}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 1rem;">
                        <span style="color: var(--text-muted);">Date</span>
                        <span>${new Date(order.date).toLocaleDateString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <span style="color: var(--text-muted);">Status</span>
                        <span class="badge badge-${order.status === 'delivered' ? 'success' : 'primary'}">${order.status.toUpperCase()}</span>
                    </div>
                </div>

                <div style="margin-bottom: 1.5rem;">
                    <h4 style="margin-bottom: 1rem;">Items</h4>
                    ${order.items.map(item => `
                        <div style="display: flex; justify-content: space-between; padding: 0.75rem; background: var(--bg-tertiary); border-radius: 8px; margin-bottom: 0.5rem;">
                            <div>
                                <div style="font-weight: 500;">${item.name}</div>
                                <div style="font-size: 0.875rem; color: var(--text-muted);">Qty: ${item.quantity}</div>
                            </div>
                            <div style="text-align: right;">
                                <div>R${item.total.toLocaleString()}</div>
                                <div style="font-size: 0.875rem; color: var(--text-muted);">R${item.price} each</div>
                            </div>
                        </div>
                    `).join('')}
                </div>

                <div style="border-top: 1px solid var(--border-color); padding-top: 1rem;">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Subtotal</span>
                        <span>R${order.totals.subtotal.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; margin-bottom: 0.5rem;">
                        <span>Shipping</span>
                        <span>R${order.totals.shipping.toLocaleString()}</span>
                    </div>
                    <div style="display: flex; justify-content: space-between; font-weight: 600; font-size: 1.1rem;">
                        <span>Total</span>
                        <span style="color: var(--primary-color);">R${order.totals.total.toLocaleString()}</span>
                    </div>
                </div>

                ${order.shipping.trackingNumber ? `
                    <div style="margin-top: 1.5rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                        <h4 style="margin-bottom: 0.5rem;">Tracking Information</h4>
                        <p style="color: var(--text-muted);">Tracking Number: <span style="color: var(--text-primary); font-family: monospace;">${order.shipping.trackingNumber}</span></p>
                        <p style="color: var(--text-muted);">Carrier: ${order.shipping.carrier || 'Standard Courier'}</p>
                    </div>
                ` : ''}
            `;
        } else {
            content.innerHTML = `
                <div style="text-align: center; padding: 2rem; color: var(--error-color);">
                    <p>Failed to load order details</p>
                    <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="closeOrderModal()">Close</button>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error loading order details:', error);
        content.innerHTML = `
            <div style="text-align: center; padding: 2rem; color: var(--error-color);">
                <p>Network error. Please try again.</p>
                <button class="btn btn-secondary" style="margin-top: 1rem;" onclick="closeOrderModal()">Close</button>
            </div>
        `;
    }
}

function closeOrderModal() {
    document.getElementById('orderDetailsModal').style.display = 'none';
}

function trackOrder() {
    document.getElementById('trackingModal').style.display = 'block';
    document.getElementById('trackingNumber').value = '';
    document.getElementById('trackingResult').style.display = 'none';
}

function closeTrackingModal() {
    document.getElementById('trackingModal').style.display = 'none';
}

async function submitTracking(event) {
    event.preventDefault();

    const orderNumber = document.getElementById('trackingNumber').value;
    const resultDiv = document.getElementById('trackingResult');

    resultDiv.innerHTML = `
        <div style="text-align: center;">
            <div class="spinner"></div>
            <p style="margin-top: 1rem; color: var(--text-muted);">Tracking order...</p>
        </div>
    `;
    resultDiv.style.display = 'block';

    try {
        const response = await fetch(`${API_URL}/dashboard/track/${orderNumber}`);

        if (response.ok) {
            const data = await response.json();

            resultDiv.innerHTML = `
                <div style="background: var(--bg-tertiary); padding: 1rem; border-radius: 8px; margin-bottom: 1rem;">
                    <h4 style="margin-bottom: 1rem;">Order #${data.orderNumber}</h4>
                    <p style="color: var(--text-muted);">Current Status: <span class="badge badge-primary">${data.currentStatus.toUpperCase()}</span></p>
                </div>

                <div class="tracking-timeline">
                    ${data.timeline.map(step => `
                        <div class="tracking-step ${step.completed ? 'completed' : ''}">
                            <div class="step-icon">${step.completed ? '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>' : ''}</div>
                            <div class="step-content">
                                <div class="step-title">${step.label}</div>
                                ${step.date ? `<div class="step-date">${new Date(step.date).toLocaleDateString()}</div>` : ''}
                            </div>
                        </div>
                    `).join('')}
                </div>

                ${data.tracking.trackingNumber ? `
                    <div style="margin-top: 1rem; padding: 1rem; background: var(--bg-tertiary); border-radius: 8px;">
                        <p style="font-size: 0.875rem; color: var(--text-muted);">
                            Tracking: <span style="color: var(--text-primary); font-family: monospace;">${data.tracking.trackingNumber}</span>
                        </p>
                        ${data.tracking.estimatedDelivery ? `
                            <p style="font-size: 0.875rem; color: var(--text-muted);">
                                Est. Delivery: ${new Date(data.tracking.estimatedDelivery).toLocaleDateString()}
                            </p>
                        ` : ''}
                    </div>
                ` : ''}
            `;
        } else {
            resultDiv.innerHTML = `
                <div style="text-align: center; padding: 1rem; color: var(--error-color);">
                    <p>Order not found. Please check the order number and try again.</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Error tracking order:', error);
        resultDiv.innerHTML = `
            <div style="text-align: center; padding: 1rem; color: var(--error-color);">
                <p>Network error. Please try again.</p>
            </div>
        `;
    }
}
