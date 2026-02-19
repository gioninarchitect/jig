// POS Printing System - Plug & Play Architecture
// Supports: Thermal printers, PDF generation, WebUSB, Serial, Cloud printing

class POSPrintingSystem {
    constructor() {
        this.printers = [];
        this.activePrinter = null;
        this.printHistory = [];

        // Auto-detect available print methods
        this.detectPrintCapabilities();
    }

    detectPrintCapabilities() {
        const capabilities = {
            browserPrint: window.print !== undefined,
            webUSB: 'usb' in navigator,
            serial: 'serial' in navigator,
            bluetooth: 'bluetooth' in navigator
        };

        console.log('[Print System] Capabilities:', capabilities);
        return capabilities;
    }

    // ============================================
    // TILL SLIP (Thermal Printer - ESC/POS)
    // ============================================

    generateTillSlip(orderData) {
        const { items, subtotal, discount, total, paymentMethod, orderNumber, timestamp } = orderData;

        // ESC/POS commands for thermal printer
        const ESC = '\x1B';
        const GS = '\x1D';

        let receipt = '';

        // Header
        receipt += `${ESC}@`; // Initialize printer
        receipt += `${ESC}a${String.fromCharCode(1)}`; // Center align
        receipt += `${ESC}!${String.fromCharCode(16)}`; // Double height
        receipt += 'BASOTHO MEDICAL HERBS\n';
        receipt += `${ESC}!${String.fromCharCode(0)}`; // Normal text
        receipt += 'Cultivating Excellence\n';
        receipt += '================================\n';
        receipt += `${ESC}a${String.fromCharCode(0)}`; // Left align

        // Order details
        receipt += `Order: #${orderNumber}\n`;
        receipt += `Date: ${new Date(timestamp).toLocaleString()}\n`;
        receipt += '================================\n\n';

        // Items
        items.forEach(item => {
            const itemName = item.name.substring(0, 20).padEnd(20);
            const qty = `x${item.quantity}`.padStart(4);
            const price = `R${(item.price * item.quantity).toFixed(2)}`.padStart(8);
            receipt += `${itemName}${qty}${price}\n`;
        });

        receipt += '--------------------------------\n';

        // Totals
        receipt += `Subtotal:${`R${subtotal.toFixed(2)}`.padStart(24)}\n`;
        if (discount > 0) {
            receipt += `Discount:${`-R${discount.toFixed(2)}`.padStart(24)}\n`;
        }
        receipt += `${ESC}!${String.fromCharCode(8)}`; // Bold
        receipt += `TOTAL:${`R${total.toFixed(2)}`.padStart(27)}\n`;
        receipt += `${ESC}!${String.fromCharCode(0)}`; // Normal

        // Payment
        receipt += '\n';
        receipt += `Payment Method: ${paymentMethod}\n`;

        // Footer
        receipt += '\n';
        receipt += `${ESC}a${String.fromCharCode(1)}`; // Center
        receipt += 'Thank you for your purchase!\n';
        receipt += 'portal.basothomedicalherbs.ls\n';
        receipt += 'hello@basothomedicalherbs.ls\n';

        // Cut paper
        receipt += '\n\n\n';
        receipt += `${GS}V${String.fromCharCode(66)}${String.fromCharCode(0)}`; // Partial cut

        return receipt;
    }

    // Print to thermal printer via WebUSB
    async printToThermalPrinter(receiptData) {
        try {
            if (!('usb' in navigator)) {
                throw new Error('WebUSB not supported');
            }

            // Request USB device (thermal printer)
            const device = await navigator.usb.requestDevice({
                filters: [
                    { vendorId: 0x0416 }, // Epson
                    { vendorId: 0x04b8 }, // Star Micronics
                    { vendorId: 0x0DD4 }  // Generic ESC/POS
                ]
            });

            await device.open();
            await device.selectConfiguration(1);
            await device.claimInterface(0);

            // Send ESC/POS data
            const encoder = new TextEncoder();
            const data = encoder.encode(receiptData);
            await device.transferOut(1, data);

            await device.close();

            console.log('[Print] Till slip sent to thermal printer');
            return { success: true };
        } catch (error) {
            console.error('[Print] Thermal printer error:', error);
            return { success: false, error: error.message };
        }
    }

    // ============================================
    // PDF INVOICE
    // ============================================

    generatePDFInvoice(orderData) {
        const { items, subtotal, discount, total, paymentMethod, orderNumber, timestamp, customerPhone } = orderData;

        // Create HTML for PDF
        const invoiceHTML = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        .header { text-align: center; border-bottom: 3px solid #2D5016; padding-bottom: 20px; }
        .logo { font-size: 28px; font-weight: bold; color: #2D5016; }
        .tagline { color: #666; font-size: 14px; }
        .invoice-details { margin: 30px 0; }
        .invoice-details table { width: 100%; }
        .invoice-details td { padding: 5px 0; }
        .items-table { width: 100%; border-collapse: collapse; margin: 30px 0; }
        .items-table th { background: #2D5016; color: white; padding: 12px; text-align: left; }
        .items-table td { padding: 10px; border-bottom: 1px solid #ddd; }
        .totals { margin: 20px 0; text-align: right; }
        .totals table { margin-left: auto; width: 300px; }
        .totals td { padding: 8px; }
        .total-row { font-size: 18px; font-weight: bold; border-top: 2px solid #000; }
        .footer { margin-top: 50px; text-align: center; color: #666; font-size: 12px; }
    </style>
</head>
<body>
    <div class="header">
        <div class="logo">BASOTHO MEDICAL HERBS</div>
        <div class="tagline">Cultivating Excellence</div>
    </div>

    <div class="invoice-details">
        <table>
            <tr>
                <td><strong>Invoice Number:</strong></td>
                <td>#${orderNumber}</td>
                <td><strong>Date:</strong></td>
                <td>${new Date(timestamp).toLocaleDateString()}</td>
            </tr>
            ${customerPhone ? `<tr><td><strong>Customer:</strong></td><td>${customerPhone}</td><td></td><td></td></tr>` : ''}
        </table>
    </div>

    <table class="items-table">
        <thead>
            <tr>
                <th>Item</th>
                <th>Quantity</th>
                <th>Price</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${items.map(item => `
            <tr>
                <td>${item.name}</td>
                <td>${item.quantity}</td>
                <td>R${item.price.toFixed(2)}</td>
                <td>R${(item.price * item.quantity).toFixed(2)}</td>
            </tr>
            `).join('')}
        </tbody>
    </table>

    <div class="totals">
        <table>
            <tr>
                <td>Subtotal:</td>
                <td>R${subtotal.toFixed(2)}</td>
            </tr>
            ${discount > 0 ? `<tr><td>Discount:</td><td>-R${discount.toFixed(2)}</td></tr>` : ''}
            <tr class="total-row">
                <td>TOTAL:</td>
                <td>R${total.toFixed(2)}</td>
            </tr>
        </table>
    </div>

    <div style="margin-top: 30px;">
        <strong>Payment Method:</strong> ${paymentMethod}
    </div>

    <div class="footer">
        <p>Basotho Medical Herbs | portal.basothomedicalherbs.ls | hello@basothomedicalherbs.ls</p>
        <p>Thank you for your business!</p>
    </div>
</body>
</html>
        `;

        return invoiceHTML;
    }

    // Download PDF invoice
    downloadPDFInvoice(orderData) {
        const html = this.generatePDFInvoice(orderData);
        const blob = new Blob([html], { type: 'text/html' });
        const url = URL.createObjectURL(blob);

        const link = document.createElement('a');
        link.href = url;
        link.download = `invoice-${orderData.orderNumber}.html`;
        link.click();

        URL.revokeObjectURL(url);

        console.log('[Print] PDF invoice downloaded');
    }

    // Print PDF invoice to browser
    printPDFInvoice(orderData) {
        const html = this.generatePDFInvoice(orderData);
        const printWindow = window.open('', '_blank', 'width=800,height=600');
        printWindow.document.write(html);
        printWindow.document.close();
        printWindow.print();

        console.log('[Print] PDF invoice sent to browser print');
    }

    // ============================================
    // UNIFIED PRINT INTERFACE
    // ============================================

    async print(orderData, options = {}) {
        const {
            tillSlip = true,
            invoice = false,
            printerType = 'auto', // 'auto', 'thermal', 'browser', 'pdf'
            download = false
        } = options;

        const results = [];

        // Till slip
        if (tillSlip) {
            const slipData = this.generateTillSlip(orderData);

            if (printerType === 'thermal' || printerType === 'auto') {
                const result = await this.printToThermalPrinter(slipData);
                results.push({ type: 'till-slip', ...result });
            }

            // Fallback to browser print if thermal fails
            if (printerType === 'browser' || (printerType === 'auto' && !results.some(r => r.success))) {
                window.print();
                results.push({ type: 'till-slip-browser', success: true });
            }
        }

        // Invoice
        if (invoice) {
            if (download) {
                this.downloadPDFInvoice(orderData);
                results.push({ type: 'invoice-download', success: true });
            } else {
                this.printPDFInvoice(orderData);
                results.push({ type: 'invoice-print', success: true });
            }
        }

        // Save to history
        this.printHistory.push({
            orderNumber: orderData.orderNumber,
            timestamp: Date.now(),
            results
        });

        return results;
    }
}

// Initialize global printing system
window.posPrintSystem = new POSPrintingSystem();

// Export for use in admin panel
if (typeof module !== 'undefined' && module.exports) {
    module.exports = POSPrintingSystem;
}
