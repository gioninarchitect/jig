// Invoice & Receipt PDF Generator - JIG Craft Cannabis
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceGenerator {
  constructor() {
    // JIG Brand Colors
    this.colors = {
      primary: '#7C3AED',    // JIG Green
      accent: '#6D28D9',     // JIG Green Dark
      text: '#0A0A0A',       // JIG Green Deep
      gold: '#D97706',       // JIG Gold
      cream: '#0A0A0A',      // JIG Cream
      red: '#DC2626',        // JIG Red
      lightGray: '#0A0A0A',  // Cream background
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
    // Use DBC small logo (no background) for documents
    let logoPath = path.join(__dirname, '../../images/jig-logo-nobg.png');

    // Add logo if exists
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 30, { width: 90 });
    } else {
      // Fallback text logo - DBC branding
      doc.fontSize(24)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('JIG CRAFT CANNABIS', 50, 50);
      doc.fontSize(10)
         .fillColor(this.colors.gold)
         .text('Craft Cannabis', 50, 78);
    }

    // Handle missing branch data gracefully
    const branchName = branch?.name || 'JIG Craft Cannabis';
    const branchAddress = branch?.location?.address || '18 Crownwood Street';
    const branchCity = branch?.location?.city
      ? `${branch.location.city}, ${branch.location.province || 'Gauteng'}`
      : 'Ormonde, Gauteng';
    const branchPhone = branch?.contact?.phone || '+27 65 194 8402';
    // Derive branch email from branch name (e.g. "JIG Ormonde" -> "ormonde@jig.cleva-ai.co.za")
    const branchSlug = (branch?.name || 'ormonde').replace(/^DBC\s+/i, '').toLowerCase().trim();
    const branchEmail = branch?.contact?.email || `${branchSlug}@jig.cleva-ai.co.za`;

    // Company details on right (aligned properly to avoid overlap)
    doc.fontSize(9)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text(branchName, 350, 50, { align: 'right', width: 195 })
       .text(branchAddress, 350, 63, { align: 'right', width: 195 })
       .text(branchCity, 350, 76, { align: 'right', width: 195 });

    if (branchPhone) {
      doc.text(branchPhone, 350, 89, { align: 'right', width: 195 });
    }

    doc.text(branchEmail, 350, branchPhone ? 102 : 89, { align: 'right', width: 195 });

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

    // Table headers - DBC green background
    doc.fontSize(10)
       .fillColor(this.colors.cream)
       .font('Helvetica-Bold');

    // Header background with DBC green
    doc.rect(50, tableTop, 495, 25)
       .fill(this.colors.primary);

    // Header text - cream on green
    doc.fillColor(this.colors.cream)
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

    const paymentMethod = payment.method ? payment.method.toUpperCase() : 'N/A';
    const paymentStatus = payment.status || 'Pending';

    doc.font('Helvetica')
       .fontSize(9)
       .text(`Method: ${paymentMethod}`, 50, startY + 20)
       .text(`Status: ${paymentStatus}`, 50, startY + 35);

    if (payment.reference) {
      doc.text(`Reference: ${payment.reference}`, 50, startY + 50);
    }

    if (payment.approvedAt) {
      doc.text(`Approved: ${new Date(payment.approvedAt).toLocaleString('en-ZA')}`, 50, startY + 65);
    }
  }

  addFooter(doc, branch) {
    const footerY = 740;

    // Banking details if EFT (handle missing branch gracefully)
    if (branch?.bankDetails?.accountNumber) {
      doc.fontSize(8)
         .fillColor(this.colors.text)
         .font('Helvetica-Bold')
         .text('Banking Details:', 50, footerY - 60)
         .font('Helvetica')
         .text(`${branch.bankDetails.bankName || 'Bank'} | Account: ${branch.bankDetails.accountNumber} | Branch: ${branch.bankDetails.branchCode || 'N/A'}`, 50, footerY - 45);
    }

    // Footer line
    doc.moveTo(50, footerY - 15)
       .lineTo(545, footerY - 15)
       .strokeColor(this.colors.accent)
       .lineWidth(1)
       .stroke();

    // Footer text with proper spacing - DBC branding
    doc.fontSize(8)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text('Thank you for your business!', 50, footerY + 5, {
         align: 'center',
         width: 495
       });

    doc.fillColor(this.colors.gold)
       .fontSize(9)
       .font('Helvetica-Bold')
       .text('JIG CRAFT CANNABIS - Craft Cannabis', 50, footerY + 18, {
         align: 'center',
         width: 495
       });

    doc.fillColor(this.colors.accent)
       .fontSize(8)
       .font('Helvetica')
       .text('18 Crownwood Street, Ormonde, Gauteng | +27 65 194 8402 | hello@jig.cleva-ai.co.za', 50, footerY + 32, {
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
