// ===== ADMIN PAYMENTS MODULE =====
// Payment approvals, orders management, proof of payment handling

async function loadPayments() {
    const tbody = document.getElementById('paymentsList');

    try {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--green-light);">Please login to view payments</td></tr>';
            return;
        }

        // Fetch orders with pending payment status (using global API_URL)
        const response = await fetch(`${API_URL}/orders/all?paymentStatus=pending`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch payment approvals');
        }

        const data = await response.json();
        const orders = data.orders || [];

        let html = '';
        orders.forEach((order, index) => {
            const status = order.paymentStatus || 'pending';
            const qualifiesForMembership = order.total >= 300;
            const customerEmail = order.customer?.email || 'N/A';
            const customerPhone = order.customer?.phone || 'N/A';

            html += `
                <tr>
                    <td><strong>${order.orderNumber}</strong></td>
                    <td>${new Date(order.createdAt).toLocaleString()}</td>
                    <td>
                        <div>${customerEmail}</div>
                        <small style="color: var(--green-light);">${customerPhone}</small>
                    </td>
                    <td><strong style="color: var(--green-deep);">R ${(order.total || 0).toFixed(2)}</strong></td>
                    <td>
                        <button class="action-btn view-btn" onclick="viewPaymentProof('${order.orderNumber}')">
                            View POP
                        </button>
                    </td>
                    <td>
                        ${qualifiesForMembership ?
                            '<span class="status-badge status-approved">✓ Qualifies</span>' :
                            '<span class="status-badge">No</span>'
                        }
                    </td>
                    <td>
                        <span class="status-badge status-${status}">${status.toUpperCase()}</span>
                    </td>
                    <td>
                        ${status === 'pending' ? `
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button class="action-btn approve-btn" onclick="quickApprove('${order.orderNumber}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="action-btn reject-btn" onclick="quickReject('${order.orderNumber}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </div>
                        ` : `
                            <button class="action-btn view-btn" onclick="viewPaymentDetails('${order.orderNumber}')" style="padding:6px 14px;font-size:0.82rem;">
                                <i class="fas fa-eye"></i> Details
                            </button>
                        `}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="8" style="text-align: center; color: var(--green-light);">No payment approvals pending</td></tr>';
    } catch (error) {
        console.error('Load payments error:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #f87171;">Error loading payment approvals from database</td></tr>';
    }
}

// REMOVED: localStorage-based loadVouchers() function
// Using MongoDB API-based loadVouchers() at line 5389 instead

async function loadOrders() {
    const tbody = document.getElementById('ordersList');

    try {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: var(--green-light);">Please login to view orders</td></tr>';
            return;
        }

        const response = await fetch(`${API_URL}/orders/all`, {
            headers: {
                'Authorization': `Bearer ${token}`
            }
        });

        if (!response.ok) {
            throw new Error('Failed to fetch orders');
        }

        const data = await response.json();
        const orders = data.orders || [];

        let html = '';
        orders.forEach((order, index) => {
            const customerName = `${order.customer?.firstName || ''} ${order.customer?.lastName || ''}`.trim() || 'Guest';
            const hasPOP = order.payment?.proofOfPayment?.url ? true : false;
            const popUrl = order.payment?.proofOfPayment?.url || '';
            const fullPopUrl = popUrl.startsWith('/') || popUrl.startsWith('http') ? popUrl : '/uploads/' + popUrl;
            const popIndicator = hasPOP ?
                `<span style="color: #10b981; cursor: pointer;" onclick="event.stopPropagation(); viewProofModal('${fullPopUrl}')"><i class="fas fa-paperclip"></i> View POP</span>` :
                `<span style="color: #6b7280;">No POP</span>`;

            html += `
                <tr>
                    <td><strong>${order.orderNumber || 'JIG' + index}</strong></td>
                    <td>${new Date(order.createdAt).toLocaleDateString()}</td>
                    <td>${customerName}</td>
                    <td>${order.items?.length || 0} items</td>
                    <td><strong>R ${(order.total || 0).toFixed(2)}</strong></td>
                    <td>
                        <span class="status-badge status-${order.payment?.status || 'pending'}">
                            ${(order.payment?.status || 'pending').toUpperCase()}
                        </span>
                        <br>${popIndicator}
                    </td>
                    <td>
                        <span class="status-badge status-${order.status || 'pending'}">
                            ${(order.status || 'pending').toUpperCase()}
                        </span>
                    </td>
                    <td>
                        <button class="action-btn view-btn" onclick='viewOrderDetails(${JSON.stringify(order).replace(/'/g, "&#39;")})'>Manage</button>
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || '<tr><td colspan="8" style="text-align: center; color: var(--green-light);">No orders found</td></tr>';
    } catch (error) {
        console.error('Load orders error:', error);
        tbody.innerHTML = '<tr><td colspan="8" style="text-align: center; color: #f87171;">Error loading orders from database</td></tr>';
    }
}

function viewOrderDetails(order) {
    const details = document.getElementById('paymentDetails');
    const hasPOP = order.payment?.proofOfPayment?.url;

    // Hide localStorage POP buttons - this is for MongoDB orders
    const localStorageButtons = document.getElementById('localStoragePOPButtons');
    if (localStorageButtons) localStorageButtons.style.display = 'none';

    details.innerHTML = `
        <div style="padding: 20px; background: var(--cream); border: 1px solid var(--green); border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--green-deep); margin-bottom: 15px;">Order Details</h3>
            <p><strong>Order Number:</strong> ${order.orderNumber}</p>
            <p><strong>Order ID:</strong> ${order._id}</p>
            <p><strong>Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
            <p><strong>Total Amount:</strong> <span style="color: var(--green-deep); font-size: 1.3rem;">R${(order.total || 0).toFixed(2)}</span></p>
        </div>

        <div style="padding: 20px; background: var(--cream); border: 1px solid var(--green); border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--green-deep); margin-bottom: 15px;">Customer Information</h3>
            <p><strong>Name:</strong> ${order.customer?.firstName} ${order.customer?.lastName}</p>
            <p><strong>Email:</strong> ${order.customer?.email || 'N/A'}</p>
            <p><strong>Phone:</strong> ${order.customer?.phone || 'N/A'}</p>
        </div>

        <div style="padding: 20px; background: var(--cream); border: 1px solid var(--green); border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--green-deep); margin-bottom: 15px;">Order Items</h3>
            ${order.items?.map(item =>
                `<p>• ${item.name} x ${item.quantity} = R${(item.price * item.quantity).toFixed(2)}</p>`
            ).join('') || '<p>No items data</p>'}
            <p style="margin-top: 15px;"><strong>Subtotal:</strong> R${(order.subtotal || 0).toFixed(2)}</p>
            <p><strong>Shipping:</strong> R${(order.shipping?.cost || 0).toFixed(2)}</p>
            <p style="font-size: 1.2rem; color: var(--green-deep);"><strong>Total:</strong> R${(order.total || 0).toFixed(2)}</p>
        </div>

        <div style="padding: 20px; background: var(--cream); border: 1px solid var(--green); border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--green-deep); margin-bottom: 15px;">Payment Information</h3>
            <p><strong>Method:</strong> ${(order.payment?.method || 'N/A').toUpperCase()}</p>
            <p><strong>Status:</strong> <span class="status-badge status-${order.payment?.status || 'pending'}">${(order.payment?.status || 'pending').toUpperCase()}</span></p>

            ${hasPOP ? `
                ${(() => {
                    const popUrl = order.payment.proofOfPayment.url;
                    const fullUrl = popUrl.startsWith('/') || popUrl.startsWith('http') ? popUrl : '/uploads/' + popUrl;
                    return `<div style="margin-top: 15px; padding: 15px; background: rgba(124, 58, 237, 0.1); border: 2px solid var(--green); border-radius: 8px; cursor: pointer;" onclick="viewProofModal('${fullUrl}')">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                        <h4 style="color: var(--green); margin: 0;"><i class="fas fa-paperclip"></i> Proof of Payment Uploaded</h4>
                        <span style="background: var(--green); color: var(--cream); padding: 6px 12px; border-radius: 6px; font-size: 0.85rem; font-weight: 600;"><i class="fas fa-eye"></i> View</span>
                    </div>
                    <p><strong>File:</strong> ${popUrl.split('/').pop()}</p>`;
                })()}
                    <p><strong>Uploaded:</strong> ${order.payment.proofOfPayment.uploadedAt ? new Date(order.payment.proofOfPayment.uploadedAt).toLocaleString() : 'N/A'}</p>
                    <p><strong>Verified:</strong> ${order.payment.proofOfPayment.verified ?
                        '<span style="color: var(--green);">✓ Yes</span>' :
                        '<span style="color: var(--gold);">⏳ Pending</span>'}</p>
                    ${order.payment.proofOfPayment.verified && order.payment.proofOfPayment.verifiedAt ?
                        `<p><strong>Verified At:</strong> ${new Date(order.payment.proofOfPayment.verifiedAt).toLocaleString()}</p>` : ''}
                </div>
            ` : `
                <div style="margin-top: 15px; padding: 15px; background: rgba(74, 122, 93, 0.1); border: 2px solid var(--green-light); border-radius: 8px;">
                    <p style="color: var(--green-light);">No proof of payment uploaded yet</p>
                </div>
            `}
        </div>

        ${(order.payment?.method === 'eft' || order.payment?.method === 'bitcoin') && hasPOP && !order.payment.proofOfPayment.verified ? `
            <div style="display: flex; gap: 10px; margin-top: 20px;">
                <button onclick="approvePayment('${order._id}')" style="flex: 1; padding: 15px; background: var(--gold); color: var(--green-deep); border: 2px solid var(--gold-dark); border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer;">
                    Approve Payment
                </button>
                <button onclick="rejectPayment('${order._id}')" style="flex: 1; padding: 15px; background: var(--red); color: var(--cream); border: 2px solid var(--red-dark); border-radius: 8px; font-size: 1.1rem; font-weight: bold; cursor: pointer;">
                    Reject Payment
                </button>
            </div>
        ` : ''}
    `;

    document.getElementById('paymentModal').style.display = 'flex';
}

function viewPaymentProof(index) {
    const pops = JSON.parse(localStorage.getItem('bmh_pops') || '[]');
    const pop = pops[index];
    currentPaymentIndex = index;

    // Show localStorage POP buttons - this is for localStorage POPs
    const localStorageButtons = document.getElementById('localStoragePOPButtons');
    if (localStorageButtons) localStorageButtons.style.display = 'flex';

    const details = document.getElementById('paymentDetails');
    details.innerHTML = `
        <div style="padding: 20px; background: var(--cream); border: 1px solid var(--green); border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--green-deep); margin-bottom: 15px;">Order Details</h3>
            <p><strong>Order Number:</strong> ${pop.orderNumber}</p>
            <p><strong>Date:</strong> ${new Date(pop.timestamp).toLocaleString()}</p>
            <p><strong>Total Amount:</strong> <span style="color: var(--green-deep); font-size: 1.3rem;">R${pop.orderTotal}</span></p>
        </div>

        <div style="padding: 20px; background: var(--cream); border: 1px solid var(--green); border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--green-deep); margin-bottom: 15px;">Customer Information</h3>
            <p><strong>Email:</strong> ${pop.email}</p>
            <p><strong>Phone:</strong> ${pop.phone}</p>
        </div>

        <div style="padding: 20px; background: var(--cream); border: 1px solid var(--green); border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--green-deep); margin-bottom: 15px;">Order Items</h3>
            ${pop.items?.map(item =>
                `<p>• ${item.name} x ${item.quantity} = R${item.price * item.quantity}
                ${item.friendMembership ? '<span class="status-badge status-approved">+Friend Voucher</span>' : ''}</p>`
            ).join('') || '<p>No items data</p>'}
        </div>

        <div style="padding: 20px; background: var(--cream); border: 1px solid var(--green); border-radius: 10px; margin-bottom: 20px;">
            <h3 style="color: var(--green-deep); margin-bottom: 15px;">Proof of Payment</h3>
            <p><strong>File:</strong> ${pop.fileName}</p>
            <p style="color: var(--green-light); margin-top: 10px;">
                [Proof of payment image would be displayed here]
            </p>
        </div>

        <div style="padding: 20px; background: ${pop.orderTotal >= 300 ? 'rgba(16, 185, 129, 0.1)' : 'rgba(107, 114, 128, 0.1)'}; border: 2px solid ${pop.orderTotal >= 300 ? '#FFFFFF' : '#6b7280'}; border-radius: 10px;">
            <h3 style="color: ${pop.orderTotal >= 300 ? '#FFFFFF' : '#6b7280'}; margin-bottom: 10px;">
                ${pop.orderTotal >= 300 ? '✓ MEMBERSHIP ELIGIBLE' : '✗ Not Eligible for Membership'}
            </h3>
            <p>${pop.orderTotal >= 300 ?
                'This order qualifies for Lifestyle Membership (R300+ purchase). Membership will be activated upon payment approval.' :
                'Order amount is below R300 threshold for membership.'
            }</p>
            ${pop.items?.some(i => i.friendMembership) ?
                '<p style="margin-top: 10px; color: var(--green-deep);">🎁 Includes Friend Membership Voucher - will be generated upon approval</p>' : ''
            }
        </div>
    `;

    document.getElementById('paymentModal').style.display = 'flex';
}

async function approvePayment(orderId) {
    showAdminConfirm('Approve Payment', 'Approve this payment and update order status to processing?', async () => {
        try {
            const token = sessionStorage.getItem('adminToken');
            if (!token) {
                showAdminToast('Authentication Required', 'Please login to approve payments', 'error');
                return;
            }

            const response = await fetch(`${API_URL}/orders/${orderId}/approve-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();

            if (data.success) {
                showAdminToast('Success', 'Payment approved successfully!', 'success');
                document.getElementById('paymentModal').style.display = 'none';
                loadOrders();
            } else {
                showAdminToast('Error', `Failed to approve payment: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Approve payment error:', error);
            showAdminToast('Error', 'Error approving payment. Please try again.', 'error');
        }
    });
}

async function rejectPayment(orderId) {
    showAdminPrompt('Reject Payment', 'Enter rejection reason:', async (reason) => {
        try {
            const token = sessionStorage.getItem('adminToken');
            if (!token) {
                showAdminToast('Error', 'Please login to reject payments', 'error');
                return;
            }

            const response = await fetch(`${API_URL}/orders/${orderId}/reject-payment`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ reason })
            });

            const data = await response.json();

            if (data.success) {
                showAdminToast('Success', 'Payment rejected', 'success');
                document.getElementById('paymentModal').style.display = 'none';
                loadOrders();
            } else {
                showAdminToast('Error', `Failed to reject payment: ${data.message}`, 'error');
            }
        } catch (error) {
            console.error('Reject payment error:', error);
            showAdminToast('Error', 'Error rejecting payment. Please try again.', 'error');
        }
    });
}

async function quickApprove(orderNumber) {
    try {
        const token = sessionStorage.getItem('adminToken');
        if (!token) {
            showAdminToast('Authentication Required', 'Please login to approve payments', 'error');
            return;
        }

        const response = await fetch(`${API_URL}/orders/${orderNumber}/approve`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) {
            const error = await response.json();
            showAdminToast('Error', `Failed to approve payment: ${error.message}`, 'error');
            return;
        }

        const data = await response.json();
        showAdminToast('Success', 'Payment approved successfully!', 'success');
        loadDashboard();
    } catch (error) {
        console.error('Approve payment error:', error);
        showAdminToast('Error', 'Error approving payment. Please try again.', 'error');
    }
}

async function quickReject(orderNumber) {
    showAdminPrompt(
        'Reject Payment',
        'Please provide a reason for rejection:',
        async (reason) => {
            try {
                const token = sessionStorage.getItem('adminToken');
                if (!token) {
                    showAdminToast('Authentication Required', 'Please login to reject payments', 'error');
                    return;
                }

                const response = await fetch(`${API_URL}/orders/${orderNumber}/reject`, {
                    method: 'POST',
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ reason })
                });

                if (!response.ok) {
                    const error = await response.json();
                    showAdminToast('Error', `Failed to reject payment: ${error.message}`, 'error');
                    return;
                }

                showAdminToast('Success', 'Payment rejected', 'success');
                loadDashboard();
            } catch (error) {
                console.error('Reject payment error:', error);
                showAdminToast('Error', 'Error rejecting payment. Please try again.', 'error');
            }
        }
    );
}

// Note: approvePayment(orderId) and rejectPayment(orderId) are defined above for MongoDB orders
// For localStorage-based POPs, use quickApprove/quickReject with currentPaymentIndex

// DEPRECATED: Old localStorage-based cancelVoucher removed
// Use deactivateVoucher(voucherId) which uses the MongoDB API instead
