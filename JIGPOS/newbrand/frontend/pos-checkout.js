// ===== POS CHECKOUT MODULE =====
// Payment modal, payment methods, sale completion, split payments, receipts, invoices

function openPaymentModal() {
    document.getElementById('paymentModal').classList.add('active');
    updatePaymentTotal();
    // Reset cash fields
    const cashInput = document.getElementById('cashReceived');
    if (cashInput) {
        cashInput.value = '';
        document.getElementById('changeDue').textContent = 'R 0.00';
    }
}

function closePaymentModal() {
    document.getElementById('paymentModal').classList.remove('active');
}

function updatePaymentTotal() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.15;
    document.getElementById('paymentTotal').textContent = `R ${total.toFixed(2)}`;
}

// Complete card payment with Speedpoint reference
function completeCardPayment() {
    const referenceInput = document.getElementById('speedpointReference');
    const notesInput = document.getElementById('speedpointNotes');

    const reference = referenceInput.value.trim();
    const notes = notesInput.value.trim();

    if (!reference) {
        showToast('Reference Required', 'Please enter the Speedpoint reference number from the receipt', 'error');
        referenceInput.focus();
        return;
    }

    // Complete the sale with card payment
    completeSale('card', reference, notes);

    // Clear inputs
    referenceInput.value = '';
    notesInput.value = '';
}

function copyBankDetails() {
    const details = `Bank: Standard Bank
Account: JIG Craft Cannabis
Number: 123456789
Branch: 051001
Reference: SALE-${Date.now()}`;

    navigator.clipboard.writeText(details).then(() => {
        showToast('Copied!', 'Bank details copied to clipboard', 'success');
    });
}

async function uploadProof() {
    const fileInput = document.getElementById('proofFile');
    const file = fileInput.files[0];

    if (!file) {
        showToast('No File Selected', 'Please select a proof of payment file', 'error');
        return;
    }

    // In production, upload to server
    showToast('Proof Uploaded', 'Payment pending admin approval', 'success');
    closePaymentModal();
    cart = [];
    updateCart();
}

// Track current completed sale for receipt actions
let currentCompletedSale = null;

async function completeSale(paymentMethod, reference, paymentNotes = null) {
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * 0.15;
    const total = subtotal + vat;

    // Get user's branch from session
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const branchId = getSelectedBranchId() || user.primaryBranch?._id || user.primaryBranch;

    const saleData = {
        branchId: branchId,
        track: currentTrack,
        items: cart.map(item => ({
            productId: item._id,
            name: item.name,
            sku: item.sku || '',
            quantity: item.quantity,
            unitPrice: item.price
        })),
        orderType: 'walk-in',
        paymentMethod,
        paymentReference: reference,
        // Card (Speedpoint) specific fields
        cardReference: paymentMethod === 'card' ? reference : null,
        paymentNotes: paymentNotes,
        proofOfPayment: null // TODO: Handle proof upload for EFT
    };

    // Call POS API to create sale
    fetch('/api/v1/pos/sale', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || ''}`
        },
        body: JSON.stringify(saleData)
    })
    .then(res => res.json())
    .then(data => {
        if (data.success) {
            closePaymentModal();

            // Store completed sale for receipt actions
            currentCompletedSale = data.sale;

            // Show Sale Complete modal
            document.getElementById('saleCompleteNumber').textContent = data.sale.saleNumber;
            document.getElementById('saleCompleteTotal').textContent = `R${data.sale.totalAmount.toFixed(2)}`;
            document.getElementById('receiptEmail').value = data.sale.customerEmail || '';
            document.getElementById('saleCompleteModal').classList.add('active');

            // Clear cart
            cart = [];
            updateCart();
        } else {
            showToast('Sale Error', data.message, 'error');
        }
    })
    .catch(error => {
        console.error('Sale error:', error);
        showToast('Error', 'Error completing sale. Please try again.', 'error');
    });
}

function downloadReceipt(saleId) {
    const token = sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || '';
    window.open(`/api/v1/pos/sale/${saleId}/receipt?download=true&token=${encodeURIComponent(token)}`, '_blank');
}

function downloadInvoice(saleId) {
    const token = sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || '';
    window.open(`/api/v1/pos/sale/${saleId}/invoice?download=true&token=${encodeURIComponent(token)}`, '_blank');
}

function downloadCurrentReceipt() {
    if (currentCompletedSale) {
        downloadReceipt(currentCompletedSale._id);
    }
}

function printReceipt() {
    if (!currentCompletedSale) return;

    const token = sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || '';
    // Open receipt in new window for printing
    const printWindow = window.open(`/api/v1/pos/sale/${currentCompletedSale._id}/receipt?print=true&token=${encodeURIComponent(token)}`, '_blank');

    // Auto-trigger print dialog when loaded
    if (printWindow) {
        printWindow.onload = function() {
            setTimeout(() => {
                printWindow.print();
            }, 500);
        };
    }
}

async function sendReceiptEmail() {
    if (!currentCompletedSale) return;

    const email = document.getElementById('receiptEmail').value.trim();
    if (!email) {
        showToast('Email Required', 'Please enter a customer email address', 'error');
        return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        showToast('Invalid Email', 'Please enter a valid email address', 'error');
        return;
    }

    try {
        const response = await fetch(`/api/v1/pos/sale/${currentCompletedSale._id}/email`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || ''}`
            },
            body: JSON.stringify({ email, type: 'receipt' })
        });

        const data = await response.json();

        if (data.success) {
            showToast('Email Sent', `Receipt sent to ${email}`, 'success');
        } else {
            showToast('Email Failed', data.message || 'Could not send email', 'error');
        }
    } catch (error) {
        console.error('Email error:', error);
        showToast('Email Error', 'Failed to send receipt email', 'error');
    }
}

function closeSaleCompleteModal() {
    document.getElementById('saleCompleteModal').classList.remove('active');
    currentCompletedSale = null;
}

// ===== SPLIT PAYMENTS =====

let splitPayments = [];

function initSplitPayments() {
    splitPayments = [{ method: 'cash', amount: 0 }];
    renderSplitPayments();
}

function renderSplitPayments() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.15;
    const container = document.getElementById('splitPaymentContainer');

    if (!container) return;

    const paidAmount = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);
    const remaining = total - paidAmount;

    container.innerHTML = `
        <div class="split-payment-container">
            <h4 style="margin-bottom: 15px; color: var(--green-dark); font-family: 'Oswald', sans-serif; text-transform: uppercase;">
                <i class="fas fa-divide"></i> Split Payment
            </h4>

            ${splitPayments.map((payment, index) => `
                <div class="payment-split-row">
                    <select onchange="updateSplitMethod(${index}, this.value)">
                        <option value="cash" ${payment.method === 'cash' ? 'selected' : ''}>Cash</option>
                        <option value="card" ${payment.method === 'card' ? 'selected' : ''}>Card</option>
                        <option value="eft" ${payment.method === 'eft' ? 'selected' : ''}>EFT</option>
                        <option value="voucher" ${payment.method === 'voucher' ? 'selected' : ''}>Voucher</option>
                        <option value="wellness_points" ${payment.method === 'wellness_points' ? 'selected' : ''}>Wellness Points</option>
                    </select>
                    <input type="number" value="${payment.amount || ''}" placeholder="R 0.00"
                           onchange="updateSplitAmount(${index}, this.value)" step="0.01" min="0">
                    ${splitPayments.length > 1 ? `<button class="split-remove-btn" onclick="removeSplitPayment(${index})"><i class="fas fa-times"></i></button>` : '<div style="width: 36px;"></div>'}
                </div>
            `).join('')}

            <button class="split-add-btn" onclick="addSplitPayment()">
                <i class="fas fa-plus"></i> Add Another Payment Method
            </button>

            <div class="payment-balance ${remaining <= 0 ? (remaining < 0 ? 'overpaid' : 'complete') : ''}">
                <span>${remaining <= 0 ? (remaining < 0 ? 'Overpaid:' : 'Fully Paid:') : 'Remaining:'}</span>
                <span style="font-family: 'Oswald', sans-serif; font-size: 1.4rem;">R ${Math.abs(remaining).toFixed(2)}</span>
            </div>

            ${remaining <= 0 ? `
                <button class="btn-primary" style="width: 100%; margin-top: 15px;" onclick="completeSplitPayment()">
                    <i class="fas fa-check"></i> COMPLETE SPLIT PAYMENT
                </button>
            ` : ''}
        </div>
    `;
}

function addSplitPayment() {
    splitPayments.push({ method: 'card', amount: 0 });
    renderSplitPayments();
}

function removeSplitPayment(index) {
    if (splitPayments.length > 1) {
        splitPayments.splice(index, 1);
        renderSplitPayments();
    }
}

function updateSplitMethod(index, method) {
    splitPayments[index].method = method;
}

function updateSplitAmount(index, amount) {
    splitPayments[index].amount = parseFloat(amount) || 0;
    renderSplitPayments();
}

async function completeSplitPayment() {
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.15;
    const paidAmount = splitPayments.reduce((sum, p) => sum + (parseFloat(p.amount) || 0), 0);

    if (paidAmount < total) {
        showToast('Insufficient Payment', 'Total payments must cover the order amount', 'error');
        return;
    }

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const vat = subtotal * 0.15;

    // Get user's branch from session
    const user = JSON.parse(sessionStorage.getItem('user') || '{}');
    const branchId = getSelectedBranchId() || user.primaryBranch?._id || user.primaryBranch;

    const saleData = {
        branchId: branchId,
        track: currentTrack,
        items: cart.map(item => ({
            productId: item._id,
            name: item.name,
            sku: item.sku || '',
            quantity: item.quantity,
            unitPrice: item.price
        })),
        customer: selectedCustomer?._id || null,
        orderType: 'walk-in',
        payments: splitPayments.filter(p => p.amount > 0).map(p => ({
            method: p.method,
            amount: parseFloat(p.amount),
            reference: `${p.method.toUpperCase()}-${Date.now()}`,
            status: 'completed'
        }))
    };

    try {
        const res = await fetch('/api/v1/pos/sale', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${sessionStorage.getItem('adminToken') || sessionStorage.getItem('token') || ''}`
            },
            body: JSON.stringify(saleData)
        });

        const data = await res.json();

        if (data.success) {
            closePaymentModal();
            currentCompletedSale = data.sale;
            document.getElementById('saleCompleteNumber').textContent = data.sale.saleNumber;
            document.getElementById('saleCompleteTotal').textContent = `R${data.sale.totalAmount.toFixed(2)}`;
            document.getElementById('receiptEmail').value = selectedCustomer?.email || '';
            document.getElementById('saleCompleteModal').classList.add('active');

            cart = [];
            selectedCustomer = null;
            document.getElementById('selectedCustomerName').textContent = 'Walk-in Customer';
            updateCart();
        } else {
            showToast('Sale Error', data.message || 'Failed to complete sale', 'error');
        }
    } catch (error) {
        console.error('Split payment error:', error);
        showToast('Error', 'Failed to process split payment', 'error');
    }
}

// Cash change calculation - attach listener on first use
let cashListenerAttached = false;
function attachCashChangeListener() {
    if (cashListenerAttached) return;
    const cashInput = document.getElementById('cashReceived');
    if (cashInput) {
        cashInput.addEventListener('input', function() {
            const received = parseFloat(this.value) || 0;
            const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0) * 1.15;
            const change = Math.max(0, received - total);
            document.getElementById('changeDue').textContent = `R ${change.toFixed(2)}`;
        });
        cashListenerAttached = true;
    }
}

// Override selectPaymentMethod to handle split payments
function selectPaymentMethod(method) {
    document.querySelectorAll('.payment-tab').forEach(tab => tab.classList.remove('active'));
    event.target.classList.add('active');

    document.querySelectorAll('.payment-content').forEach(content => content.style.display = 'none');

    if (method === 'split') {
        initSplitPayments();
        document.getElementById('splitPayment').style.display = 'block';
    } else {
        document.getElementById(`${method}Payment`).style.display = 'block';
        if (method === 'cash') {
            attachCashChangeListener();
        }
        if (method === 'eft') {
            document.getElementById('eftReference').textContent = 'SALE-' + Date.now();
        }
    }
}
