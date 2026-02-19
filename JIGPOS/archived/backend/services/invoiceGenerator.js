// Invoice & Receipt PDF Generator - De Bud Chef (Branded)
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');

class InvoiceGenerator {
  constructor() {
    this.colors = {
      green: '#3A5F48',
      greenDeep: '#2A4635',
      gold: '#D4AF37',
      cream: '#F4F0E6',
      text: '#2A4635',
      lightText: '#666666',
      white: '#FFFFFF',
      black: '#000000'
    };
    this.company = {
      name: 'De Bud Chef',
      address: '18 Crownwood Street, Ormonde',
      city: 'Gauteng, South Africa',
      email: 'hello@debudchef.co.za',
      website: 'www.debudchef.co.za'
    };
  }

  async generateInvoice(saleOrOrder, branch, type = 'invoice', source = 'pos') {
    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          margins: { top: 0, bottom: 40, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const invoiceData = this.normalizeInvoiceData(saleOrOrder, source);

        this.addHeader(doc, branch, type);
        this.addInvoiceDetails(doc, invoiceData, branch, type, source);
        this.addLineItems(doc, invoiceData, source);
        this.addTotals(doc, invoiceData);
        this.addPaymentInfo(doc, invoiceData, source);
        this.addFooter(doc, branch);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  normalizeInvoiceData(data, source) {
    if (source === 'order') {
      return {
        saleNumber: data.orderNumber,
        createdAt: data.createdAt,
        track: 'lifestyle',
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
    return data;
  }

  addHeader(doc, branch, type) {
    // Green branded header bar
    doc.rect(0, 0, 612, 100).fill(this.colors.green);

    // Gold accent line under header
    doc.rect(0, 100, 612, 4).fill(this.colors.gold);

    // Company name in header
    let logoPath = path.join(__dirname, '../../images/logo-white.png');
    if (!fs.existsSync(logoPath)) {
      logoPath = path.join(__dirname, '../../images/logo.png');
    }

    if (fs.existsSync(logoPath)) {
      try {
        doc.image(logoPath, 50, 20, { height: 60 });
      } catch (e) {
        // Fallback to text
        doc.fontSize(24)
           .fillColor(this.colors.white)
           .font('Helvetica-Bold')
           .text('DE BUD CHEF', 50, 30);
      }
    } else {
      doc.fontSize(24)
         .fillColor(this.colors.white)
         .font('Helvetica-Bold')
         .text('DE BUD CHEF', 50, 25);

      doc.fontSize(9)
         .fillColor(this.colors.gold)
         .font('Helvetica')
         .text(this.company.address, 50, 55)
         .text(this.company.city, 50, 67);
    }

    // Branch name + contact on right side of header
    const branchName = branch?.name || 'De Bud Chef';
    const branchAddr = branch?.address;
    let branchLocation = '';
    if (branchAddr && typeof branchAddr === 'object') {
      branchLocation = branchAddr.city || branchAddr.suburb || '';
    } else if (typeof branchAddr === 'string') {
      branchLocation = branchAddr;
    }

    doc.fontSize(12)
       .fillColor(this.colors.white)
       .font('Helvetica-Bold')
       .text(branchName, 350, 25, { align: 'right', width: 210 });

    doc.fontSize(8)
       .fillColor(this.colors.gold)
       .font('Helvetica')
       .text(branchLocation, 350, 42, { align: 'right', width: 210 })
       .text(this.company.email, 350, 54, { align: 'right', width: 210 })
       .text(this.company.website, 350, 66, { align: 'right', width: 210 });

    // Document type badge
    const badgeY = 120;
    const badgeText = type.toUpperCase();

    doc.fontSize(18)
       .fillColor(this.colors.green)
       .font('Helvetica-Bold')
       .text(badgeText, 50, badgeY);

    // Gold underline for type
    doc.moveTo(50, badgeY + 24)
       .lineTo(50 + (badgeText.length * 12), badgeY + 24)
       .strokeColor(this.colors.gold)
       .lineWidth(3)
       .stroke();

    doc.moveDown(2);
  }

  addInvoiceDetails(doc, sale, branch, type) {
    const startY = 160;

    // Left column - document details
    doc.fontSize(9)
       .fillColor(this.colors.lightText)
       .font('Helvetica')
       .text(`${type === 'invoice' ? 'Invoice' : 'Receipt'} Number`, 50, startY);

    doc.fontSize(11)
       .fillColor(this.colors.text)
       .font('Helvetica-Bold')
       .text(sale.saleNumber || 'N/A', 50, startY + 12);

    doc.fontSize(9)
       .fillColor(this.colors.lightText)
       .font('Helvetica')
       .text('Date', 50, startY + 32);

    doc.fontSize(10)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text(new Date(sale.createdAt).toLocaleDateString('en-ZA', {
         year: 'numeric', month: 'long', day: 'numeric'
       }), 50, startY + 44);

    // Right column - customer details
    if (sale.customerName) {
      doc.fontSize(9)
         .fillColor(this.colors.lightText)
         .font('Helvetica')
         .text('Customer', 350, startY, { align: 'right', width: 195 });

      doc.fontSize(11)
         .fillColor(this.colors.text)
         .font('Helvetica-Bold')
         .text(sale.customerName, 350, startY + 12, { align: 'right', width: 195 });

      if (sale.customerEmail) {
        doc.fontSize(9)
           .font('Helvetica')
           .fillColor(this.colors.lightText)
           .text(sale.customerEmail, 350, startY + 28, { align: 'right', width: 195 });
      }

      if (sale.customerPhone) {
        doc.fontSize(9)
           .text(sale.customerPhone, 350, startY + 40, { align: 'right', width: 195 });
      }
    } else {
      doc.fontSize(9)
         .fillColor(this.colors.lightText)
         .font('Helvetica')
         .text('Customer', 350, startY, { align: 'right', width: 195 });

      doc.fontSize(10)
         .fillColor(this.colors.text)
         .font('Helvetica')
         .text('Walk-in', 350, startY + 12, { align: 'right', width: 195 });
    }

    // Separator line
    doc.moveTo(50, startY + 65)
       .lineTo(545, startY + 65)
       .strokeColor(this.colors.cream)
       .lineWidth(1)
       .stroke();

    doc.moveDown(2);
  }

  addLineItems(doc, sale) {
    const tableTop = 240;
    const itemHeight = 28;

    // Table header - green background
    doc.rect(50, tableTop, 495, 28)
       .fill(this.colors.green);

    doc.fontSize(9)
       .fillColor(this.colors.white)
       .font('Helvetica-Bold')
       .text('Item', 60, tableTop + 9, { width: 200 })
       .text('Qty', 270, tableTop + 9, { width: 50, align: 'center' })
       .text('Unit Price', 320, tableTop + 9, { width: 80, align: 'right' })
       .text('VAT', 410, tableTop + 9, { width: 55, align: 'right' })
       .text('Total', 475, tableTop + 9, { width: 70, align: 'right' });

    let currentY = tableTop + 32;
    doc.font('Helvetica');

    sale.items.forEach((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;
      const itemVAT = itemTotal * ((item.taxRate || 15) / 100);

      // Alternate cream/white rows
      if (index % 2 === 0) {
        doc.rect(50, currentY - 4, 495, itemHeight)
           .fill(this.colors.cream);
      }

      doc.fillColor(this.colors.text)
         .fontSize(9)
         .text(item.name, 60, currentY + 2, { width: 200 })
         .text(item.quantity.toString(), 270, currentY + 2, { width: 50, align: 'center' })
         .text(`R ${item.unitPrice.toFixed(2)}`, 320, currentY + 2, { width: 80, align: 'right' })
         .text(`R ${itemVAT.toFixed(2)}`, 410, currentY + 2, { width: 55, align: 'right' })
         .font('Helvetica-Bold')
         .text(`R ${itemTotal.toFixed(2)}`, 475, currentY + 2, { width: 70, align: 'right' })
         .font('Helvetica');

      currentY += itemHeight;
    });

    // Gold bottom border
    doc.moveTo(50, currentY)
       .lineTo(545, currentY)
       .strokeColor(this.colors.gold)
       .lineWidth(2)
       .stroke();

    return currentY + 10;
  }

  addTotals(doc, sale) {
    const startY = 240 + (sale.items.length * 28) + 50;

    // Totals box with cream background
    doc.rect(340, startY - 10, 205, sale.totalDiscount > 0 ? 105 : 85)
       .fill(this.colors.cream);

    doc.fontSize(10)
       .fillColor(this.colors.text)
       .font('Helvetica');

    // Subtotal
    doc.text('Subtotal:', 355, startY)
       .text(`R ${(sale.subtotal || 0).toFixed(2)}`, 445, startY, { width: 90, align: 'right' });

    // VAT
    doc.text('VAT (15%):', 355, startY + 20)
       .text(`R ${(sale.totalTax || 0).toFixed(2)}`, 445, startY + 20, { width: 90, align: 'right' });

    // Discount
    let discountOffset = 0;
    if (sale.totalDiscount && sale.totalDiscount > 0) {
      doc.fillColor('#C0392B')
         .text('Discount:', 355, startY + 40)
         .text(`-R ${sale.totalDiscount.toFixed(2)}`, 445, startY + 40, { width: 90, align: 'right' });
      discountOffset = 20;
    }

    // Total - green background
    const totalY = startY + 45 + discountOffset;
    doc.rect(340, totalY - 2, 205, 28)
       .fill(this.colors.green);

    doc.fontSize(13)
       .font('Helvetica-Bold')
       .fillColor(this.colors.white)
       .text('TOTAL:', 355, totalY + 5)
       .fontSize(14)
       .text(`R ${(sale.totalAmount || 0).toFixed(2)}`, 435, totalY + 4, { width: 100, align: 'right' });

    return totalY + 50;
  }

  addPaymentInfo(doc, sale) {
    const payment = sale.payments && sale.payments.length > 0 ? sale.payments[0] : null;
    if (!payment) return;

    const startY = 240 + (sale.items.length * 28) + 160;

    doc.fontSize(10)
       .fillColor(this.colors.green)
       .font('Helvetica-Bold')
       .text('Payment Information', 50, startY);

    // Gold underline
    doc.moveTo(50, startY + 14)
       .lineTo(175, startY + 14)
       .strokeColor(this.colors.gold)
       .lineWidth(1.5)
       .stroke();

    const paymentMethod = payment.method ? payment.method.toUpperCase() : 'N/A';
    const paymentStatus = payment.status || 'Pending';

    doc.font('Helvetica')
       .fontSize(9)
       .fillColor(this.colors.text)
       .text(`Method: ${paymentMethod}`, 50, startY + 22)
       .text(`Status: ${paymentStatus}`, 50, startY + 35);

    if (payment.reference) {
      doc.text(`Reference: ${payment.reference}`, 50, startY + 48);
    }

    if (payment.approvedAt) {
      doc.text(`Approved: ${new Date(payment.approvedAt).toLocaleString('en-ZA')}`, 50, startY + 61);
    }
  }

  addFooter(doc, branch) {
    const footerY = 740;

    // Banking details
    if (branch?.bankDetails?.accountNumber) {
      doc.fontSize(8)
         .fillColor(this.colors.text)
         .font('Helvetica-Bold')
         .text('Banking Details:', 50, footerY - 55)
         .font('Helvetica')
         .text(`${branch.bankDetails.bankName || 'Bank'} | Account: ${branch.bankDetails.accountNumber} | Branch: ${branch.bankDetails.branchCode || 'N/A'}`, 50, footerY - 42);
    }

    // Green footer bar
    doc.rect(0, footerY, 612, 55).fill(this.colors.green);

    // Gold line on top
    doc.rect(0, footerY - 1, 612, 2).fill(this.colors.gold);

    // Footer text
    doc.fontSize(9)
       .fillColor(this.colors.white)
       .font('Helvetica-Bold')
       .text('Thank you for your business!', 50, footerY + 10, {
         align: 'center',
         width: 495
       });

    doc.fillColor(this.colors.gold)
       .fontSize(8)
       .font('Helvetica')
       .text(`${this.company.website}  |  ${this.company.email}  |  ${this.company.address}`, 50, footerY + 26, {
         align: 'center',
         width: 495
       });
  }

  async saveToFile(pdfBuffer, filename) {
    const dir = path.join(__dirname, '../../invoices');

    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filePath = path.join(dir, `${filename}.pdf`);
    fs.writeFileSync(filePath, pdfBuffer);

    return filePath;
  }
}

module.exports = new InvoiceGenerator();
