// ===== ADMIN POS PAYMENTS MODULE =====

        // CSV Export Function
        async function exportSalesToCSV() {
            try {
                const startDate = document.getElementById('exportStartDate').value;
                const endDate = document.getElementById('exportEndDate').value;
                const format = document.getElementById('exportFormat').value;

                if (!startDate || !endDate) {
                    showAdminToast('Missing Dates', 'Please select both start and end dates for the export', 'error');
                    return;
                }

                const token = sessionStorage.getItem('adminToken');
                if (!token) {
                    showAdminToast('Authentication Required', 'Please login to export sales data', 'error');
                    return;
                }

                // Build query string
                const params = new URLSearchParams({
                    startDate: startDate,
                    endDate: endDate,
                    format: format
                });

                // Fetch CSV file
                const response = await fetch(`${API_URL}/pos/sales/export/csv?${params.toString()}`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    const error = await response.json();
                    showAdminToast('Export Failed', error.message || 'Failed to export sales data', 'error');
                    return;
                }

                // Download the file
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `sales-export-${format}-${startDate}-to-${endDate}.csv`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);

                showAdminToast('Export Successful', `Sales data exported to ${format.toUpperCase()} format`, 'success');

            } catch (error) {
                console.error('CSV export error:', error);
                showAdminToast('Export Error', 'An error occurred while exporting sales data', 'error');
            }
        }

        async function loadPendingPOSPayments() {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/pos/payments/pending`, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                const data = await response.json();

                if (data.success) {
                    displayPOSPayments(data.pendingPayments);
                    updatePendingCount(data.total);
                } else {
                    console.error('Error loading POS payments:', data.message);
                }
            } catch (error) {
                console.error('Error loading POS payments:', error);
                document.getElementById('posPaymentsList').innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px; color: #f44336;">
                            Error loading pending payments
                        </td>
                    </tr>
                `;
            }
        }

        function displayPOSPayments(payments) {
            const tbody = document.getElementById('posPaymentsList');

            if (!payments || payments.length === 0) {
                tbody.innerHTML = `
                    <tr>
                        <td colspan="8" style="text-align: center; padding: 40px; color: var(--green-light);">
                            No pending POS payments
                        </td>
                    </tr>
                `;
                return;
            }

            tbody.innerHTML = payments.map(sale => {
                const eftPayment = sale.payments.find(p => p.method === 'eft' && p.status === 'pending');
                const createdDate = new Date(sale.createdAt).toLocaleString('en-ZA');

                return `
                    <tr>
                        <td><strong>${sale.saleNumber}</strong></td>
                        <td>${createdDate}</td>
                        <td>${sale.branchId?.name || 'N/A'}</td>
                        <td>${sale.cashierId?.firstName} ${sale.cashierId?.lastName || ''}</td>
                        <td>${sale.customerName || 'Walk-in'}<br><small>${sale.customerEmail || ''}</small></td>
                        <td><strong>R ${sale.totalAmount.toFixed(2)}</strong></td>
                        <td>
                            ${eftPayment?.proofOfPayment ?
                                `<button class="action-btn view-btn" onclick="viewProof('${eftPayment.proofOfPayment}')">
                                    <i class="fas fa-file-image"></i> View
                                </button>` :
                                '<span style="color: var(--green-light);">No proof</span>'
                            }
                        </td>
                        <td>
                            <div style="display:flex;gap:6px;align-items:center;">
                                <button class="action-btn approve-btn" onclick="approvePOSPayment('${sale._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas fa-check"></i> Approve
                                </button>
                                <button class="action-btn reject-btn" onclick="rejectPOSPayment('${sale._id}')" style="padding:6px 14px;font-size:0.82rem;white-space:nowrap;">
                                    <i class="fas fa-times"></i> Reject
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
        }

        async function approvePOSPayment(saleId) {
            showAdminConfirm(
                'Approve EFT Payment',
                'This will mark the sale as completed and deduct inventory. Continue?',
                async () => {
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/pos/payment/${saleId}/approve`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                action: 'approve',
                                notes: 'Approved by admin'
                            })
                        });

                        const data = await response.json();

                        if (data.success) {
                            showAdminToast('Success', `Payment approved! Sale ${data.sale.saleNumber} completed.`, 'success');
                            // Auto-download invoice
                            downloadInvoiceSingle(saleId);
                            loadPendingPOSPayments();
                        } else {
                            showAdminToast('Error', data.message, 'error');
                        }
                    } catch (error) {
                        console.error('Error approving payment:', error);
                        showAdminToast('Error', 'Error approving payment', 'error');
                    }
                }
            );
        }

        async function downloadInvoiceSingle(saleId) {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/pos/sale/${saleId}/invoice`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch invoice');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `invoice-${saleId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('Invoice download error:', error);
                showAdminToast('Download Error', 'Could not download invoice', 'error');
            }
        }

        async function downloadReceiptSingle(saleId) {
            try {
                const token = sessionStorage.getItem('adminToken');
                const response = await fetch(`${API_URL}/pos/sale/${saleId}/receipt`, {
                    headers: { 'Authorization': `Bearer ${token}` }
                });
                if (!response.ok) throw new Error('Failed to fetch receipt');
                const blob = await response.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `receipt-${saleId}.pdf`;
                document.body.appendChild(a);
                a.click();
                window.URL.revokeObjectURL(url);
                document.body.removeChild(a);
            } catch (error) {
                console.error('Receipt download error:', error);
                showAdminToast('Download Error', 'Could not download receipt', 'error');
            }
        }

        async function rejectPOSPayment(saleId) {
            showAdminPrompt(
                'Reject Payment',
                'Enter rejection reason:',
                async (reason) => {
                    try {
                        const token = sessionStorage.getItem('adminToken');
                        const response = await fetch(`${API_URL}/pos/payment/${saleId}/approve`, {
                            method: 'POST',
                            headers: {
                                'Content-Type': 'application/json',
                                'Authorization': `Bearer ${token}`
                            },
                            body: JSON.stringify({
                                action: 'reject',
                                notes: reason
                            })
                        });

                        const data = await response.json();

                        if (data.success) {
                            showAdminToast('Success', 'Payment rejected. Sale voided.', 'success');
                            loadPendingPOSPayments();
                        } else {
                            showAdminToast('Error', data.message, 'error');
                        }
                    } catch (error) {
                        console.error('Error rejecting payment:', error);
                        showAdminToast('Error', 'Error rejecting payment', 'error');
                    }
                }
            );
        }

        function viewProof(proofUrl) {
            window.open(proofUrl, '_blank', 'width=800,height=600');
        }

        function viewProofModal(proofUrl) {
            const existing = document.getElementById('proofViewModal');
            if (existing) existing.remove();

            const modal = document.createElement('div');
            modal.id = 'proofViewModal';
            modal.style.cssText = `
                position: fixed;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: rgba(0,0,0,0.9);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 10002;
                padding: 20px;
            `;

            const isImage = /\.(jpg|jpeg|png|gif|webp)$/i.test(proofUrl);
            const isPDF = /\.pdf$/i.test(proofUrl);

            let contentHtml = '';
            if (isImage) {
                contentHtml = `<img src="${proofUrl}" style="max-width: 100%; max-height: 80vh; border-radius: 8px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);" alt="Proof of Payment">`;
            } else if (isPDF) {
                contentHtml = `<iframe src="${proofUrl}" style="width: 90vw; max-width: 900px; height: 80vh; border: none; border-radius: 8px;"></iframe>`;
            } else {
                contentHtml = `<div style="background: var(--cream); padding: 40px; border-radius: 12px; text-align: center;">
                    <i class="fas fa-file" style="font-size: 4rem; color: var(--green-light); margin-bottom: 20px;"></i>
                    <p style="color: var(--cream); margin-bottom: 20px;">Preview not available for this file type</p>
                    <a href="${proofUrl}" target="_blank" style="padding: 12px 24px; background: var(--gold); color: var(--green-deep); border-radius: 6px; text-decoration: none; font-weight: 600;">Download File</a>
                </div>`;
            }

            modal.innerHTML = `
                <div style="position: relative; max-width: 95vw;">
                    <button onclick="document.getElementById('proofViewModal').remove()" style="position: absolute; top: -40px; right: 0; background: none; border: none; color: var(--cream); font-size: 2rem; cursor: pointer; z-index: 10;">&times;</button>
                    ${contentHtml}
                    <div style="text-align: center; margin-top: 15px;">
                        <a href="${proofUrl}" target="_blank" style="color: var(--gold); text-decoration: none; font-weight: 600;"><i class="fas fa-external-link-alt"></i> Open in New Tab</a>
                    </div>
                </div>
            `;

            modal.onclick = (e) => {
                if (e.target === modal) modal.remove();
            };

            document.body.appendChild(modal);
        }

        function refreshPendingPayments() {
            loadPendingPOSPayments();
        }

        function filterPOSPayments() {
            // TODO: Implement filtering
        }

        function updatePendingCount(count) {
            document.getElementById('pendingPayments').textContent = count;
            const alertBar = document.getElementById('alertBar');
            const alertText = document.getElementById('alertText');

            if (count > 0) {
                alertBar.style.display = 'flex';
                alertText.textContent = `You have ${count} pending payment approval${count > 1 ? 's' : ''}`;
            } else {
                alertBar.style.display = 'none';
            }
        }
