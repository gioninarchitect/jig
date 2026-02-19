// Invoice & Receipt PDF Generator - CBD Wellness 24
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceGenerator {
  constructor() {
    this.colors = {
      primary: '#000000',    // Black
      accent: '#333333',     // Dark gray
      text: '#000000',       // Black
      lightGray: '#F5F5F5',  // Light gray background
      white: '#FFFFFF'       // White
    };
  }

  /**
   * Generate invoice PDF for a sale or order
   * @param {Object} saleOrOrder - Sale or Order document from MongoDB
   * @param {Object} branch - Branch document from MongoDB (optional for orders)
   * @param {String} type - 'invoice' or 'receipt'
   * @param {String} source - 'pos' or 'order'
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generateInvoice(saleOrOrder, branch, type = 'invoice', source = 'pos') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 50, bottom: 50, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Normalize data structure for both POS and Orders
        const invoiceData = this.normalizeInvoiceData(saleOrOrder, source);

        // Add logo
        this.addHeader(doc, branch, type);

        // Add invoice/receipt details
        this.addInvoiceDetails(doc, invoiceData, branch, type, source);

        // Add line items table
        this.addLineItems(doc, invoiceData, source);

        // Add totals
        this.addTotals(doc, invoiceData);

        // Add payment information
        this.addPaymentInfo(doc, invoiceData, source);

        // Add footer
        this.addFooter(doc, branch);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Normalize data structure between POS sales and Orders
   * @param {Object} data - Sale or Order document
   * @param {String} source - 'pos' or 'order'
   * @returns {Object} Normalized invoice data
   */
  normalizeInvoiceData(data, source) {
    if (source === 'order') {
      // Convert Order structure to Sale-like structure
      return {
        saleNumber: data.orderNumber,
        createdAt: data.createdAt,
        track: 'lifestyle', // Orders are always lifestyle track
        customerName: `${data.customer?.firstName || ''} ${data.customer?.lastName || ''}`.trim(),
        customerEmail: data.customer?.email,
        customerPhone: data.customer?.phone,
        items: data.items.map(item => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: item.price,
          taxRate: 15
        })),
        subtotal: data.subtotal,
        totalTax: data.tax?.amount,
        totalDiscount: data.discount?.amount || 0,
        totalAmount: data.total,
        payments: [{
          method: data.payment?.method,
          status: data.payment?.status,
          reference: data.payment?.transactionId,
          approvedAt: data.payment?.paidAt
        }],
        shippingAddress: data.shippingAddress
      };
    }
    // Return POS sale as-is
    return data;
  }

  addHeader(doc, branch, type) {
    // Use CBD Wellness EST logo
    let logoPath = path.join(__dirname, '../../images/CBD-wellness-est.png');

    // Add logo if exists
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 45, { width: 120 });
    } else {
      // Fallback text logo
      doc.fontSize(20)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('CBD WELLNESS 24', 50, 50);
    }

    // Company details on right (aligned properly to avoid overlap)
    doc.fontSize(9)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text(branch.name || 'CBD Wellness 24', 350, 50, { align: 'right', width: 195 })
       .text(branch.location?.address || '', 350, 63, { align: 'right', width: 195 })
       .text(branch.location?.city ? `${branch.location.city}, ${branch.location.province || ''}` : '', 350, 76, { align: 'right', width: 195 })
       .text(branch.contact?.phone || 'Tel: +27 11 234 5678', 350, 89, { align: 'right', width: 195 })
       .text('hello@cbdwellness24.co.za', 350, 102, { align: 'right', width: 195 });

    // Document title
    doc.fontSize(20)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text(type.toUpperCase(), 50, 140);

    // Horizontal line
    doc.moveTo(50, 170)
       .lineTo(545, 170)
       .strokeColor(this.colors.accent)
       .lineWidth(2)
       .stroke();

    doc.moveDown(3);
  }

  addInvoiceDetails(doc, sale, branch, type) {
    const startY = 190;

    // Left column
    doc.fontSize(10)
       .fillColor(this.colors.text)
       .font('Helvetica-Bold')
       .text(`${type === 'invoice' ? 'Invoice' : 'Receipt'} Number:`, 50, startY)
       .font('Helvetica')
       .text(sale.saleNumber, 150, startY);

    doc.font('Helvetica-Bold')
       .text('Date:', 50, startY + 15)
       .font('Helvetica')
       .text(new Date(sale.createdAt).toLocaleDateString('en-ZA'), 150, startY + 15);

    doc.font('Helvetica-Bold')
       .text('Track:', 50, startY + 30)
       .font('Helvetica')
       .text(sale.track === 'lifestyle' ? 'Lifestyle' : 'Medical', 150, startY + 30);

    // Right column
    if (sale.customerName) {
      doc.font('Helvetica-Bold')
         .text('Customer:', 350, startY)
         .font('Helvetica')
         .text(sale.customerName, 420, startY);
    }

    if (sale.customerEmail) {
      doc.text(sale.customerEmail, 420, startY + 15);
    }

    if (sale.customerPhone) {
      doc.text(sale.customerPhone, 420, startY + 30);
    }

    doc.moveDown(3);
  }

  addLineItems(doc, sale) {
    const tableTop = 280;
    const itemHeight = 25;

    // Table headers
    doc.fontSize(10)
       .fillColor('#FFFFFF')
       .font('Helvetica-Bold');

    // Header background
    doc.rect(50, tableTop, 495, 25)
       .fill(this.colors.primary);

    // Header text
    doc.fillColor('#FFFFFF')
       .text('Item', 60, tableTop + 8, { width: 200 })
       .text('Qty', 270, tableTop + 8, { width: 50, align: 'center' })
       .text('Unit Price', 330, tableTop + 8, { width: 80, align: 'right' })
       .text('VAT', 420, tableTop + 8, { width: 50, align: 'right' })
       .text('Total', 480, tableTop + 8, { width: 65, align: 'right' });

    // Line items
    let currentY = tableTop + 30;
    doc.fillColor(this.colors.text).font('Helvetica');

    sale.items.forEach((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemVAT = itemTotal * (item.taxRate / 100);

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(50, currentY - 5, 495, itemHeight)
           .fill(this.colors.lightGray);
        doc.fillColor(this.colors.text);
      }

      doc.fontSize(9)
         .text(item.name, 60, currentY, { width: 200 })
         .text(item.quantity.toString(), 270, currentY, { width: 50, align: 'center' })
         .text(`R ${item.unitPrice.toFixed(2)}`, 330, currentY, { width: 80, align: 'right' })
         .text(`R ${itemVAT.toFixed(2)}`, 420, currentY, { width: 50, align: 'right' })
         .text(`R ${itemTotal.toFixed(2)}`, 480, currentY, { width: 65, align: 'right' });

      currentY += itemHeight;
    });

    // Bottom border
    doc.moveTo(50, currentY)
       .lineTo(545, currentY)
       .strokeColor(this.colors.accent)
       .lineWidth(1)
       .stroke();

    return currentY + 10;
  }

  addTotals(doc, sale) {
    const startY = 280 + (sale.items.length * 25) + 40;

    doc.fontSize(10)
       .fillColor(this.colors.text)
       .font('Helvetica');

    // Subtotal
    doc.text('Subtotal:', 350, startY)
       .text(`R ${(sale.subtotal || 0).toFixed(2)}`, 450, startY, { width: 95, align: 'right' });

    // VAT
    doc.text('VAT (15%):', 350, startY + 20)
       .text(`R ${(sale.totalTax || 0).toFixed(2)}`, 450, startY + 20, { width: 95, align: 'right' });

    // Discount if any
    let discountOffset = 0;
    if (sale.totalDiscount && sale.totalDiscount > 0) {
      doc.text('Discount:', 350, startY + 40)
         .fillColor('#E53935')
         .text(`-R ${sale.totalDiscount.toFixed(2)}`, 450, startY + 40, { width: 95, align: 'right' })
         .fillColor(this.colors.text);
      discountOffset = 20;
    }

    // Total
    const totalY = startY + 40 + discountOffset + 10;

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(this.colors.primary)
       .text('TOTAL:', 350, totalY)
       .fontSize(14)
       .text(`R ${(sale.totalAmount || 0).toFixed(2)}`, 450, totalY, { width: 95, align: 'right' });

    return totalY + 40;
  }

  addPaymentInfo(doc, sale) {
    const payment = sale.payments && sale.payments.length > 0 ? sale.payments[0] : null;

    if (!payment) return;

    const startY = 280 + (sale.items.length * 25) + 140;

    doc.fontSize(10)
       .fillColor(this.colors.text)
       .font('Helvetica-Bold')
       .text('Payment Information', 50, startY);

    doc.font('Helvetica')
       .fontSize(9)
       .text(`Method: ${payment.method.toUpperCase()}`, 50, startY + 20)
       .text(`Status: ${payment.status}`, 50, startY + 35);

    if (payment.reference) {
      doc.text(`Reference: ${payment.reference}`, 50, startY + 50);
    }

    if (payment.approvedAt) {
      doc.text(`Approved: ${new Date(payment.approvedAt).toLocaleString('en-ZA')}`, 50, startY + 65);
    }
  }

  addFooter(doc, branch) {
    const footerY = 740;

    // Banking details if EFT
    if (branch.bankDetails && branch.bankDetails.accountNumber) {
      doc.fontSize(8)
         .fillColor(this.colors.text)
         .font('Helvetica-Bold')
         .text('Banking Details:', 50, footerY - 60)
         .font('Helvetica')
         .text(`${branch.bankDetails.bankName} | Account: ${branch.bankDetails.accountNumber} | Branch: ${branch.bankDetails.branchCode}`, 50, footerY - 45);
    }

    // Footer line
    doc.moveTo(50, footerY - 15)
       .lineTo(545, footerY - 15)
       .strokeColor(this.colors.accent)
       .lineWidth(1)
       .stroke();

    // Footer text with proper spacing
    doc.fontSize(8)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text('Thank you for your business! | Natural Relief, Available Anytime', 50, footerY + 5, {
         align: 'center',
         width: 495
       });

    doc.fillColor(this.colors.accent)
       .fontSize(8)
       .text('www.cbdwellness24.co.za | Tel: +27 11 234 5678 | hello@cbdwellness24.co.za', 50, footerY + 20, {
         align: 'center',
         width: 495
       });
  }

  /**
   * Save invoice to file system
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {String} filename - Filename without extension
   * @returns {Promise<String>} File path
   */
  async saveToFile(pdfBuffer, filename) {
    const dir = path.join(__dirname, '../../invoices');

    // Create invoices directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, `${filename}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);

    return filePath;
  }
}

module.exports = new InvoiceGenerator();
