// Purchase Order PDF Generator - Origin by ILCO Farming
const PDFDocument = require('pdfkit');
const fs = require('fs');
const path = require('path');
const config = require('../config');
const VAT_RATE = config.business.vatRate;

class PurchaseOrderGenerator {
  constructor() {
    // Origin Brand Colors
    this.colors = {
      primary: '#C9A84C',    // Origin Gold
      accent: '#8B6914',     // Origin Gold Dark
      text: '#0A0A0A',       // Origin Black
      gold: '#C9A84C',       // Origin Gold
      cream: '#F5F0E8',      // Origin Warm White
      red: '#DC2626',        // Origin Red
      lightGray: '#F5F0E8',  // Warm white background
      white: '#FFFFFF'       // White
    };
  }

  /**
   * Generate Purchase Order PDF
   * @param {Object} purchaseOrder - PurchaseOrder document from MongoDB (populated)
   * @param {Object} branch - Branch document (delivery location)
   * @returns {Promise<Buffer>} PDF buffer
   */
  async generatePO(purchaseOrder, branch = null) {
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

        // Add header with logo
        this.addHeader(doc, purchaseOrder);

        // Add supplier details
        this.addSupplierDetails(doc, purchaseOrder);

        // Add PO details
        this.addPODetails(doc, purchaseOrder, branch);

        // Add line items table
        this.addLineItems(doc, purchaseOrder);

        // Add totals
        this.addTotals(doc, purchaseOrder);

        // Add terms and notes
        this.addTermsAndNotes(doc, purchaseOrder);

        // Add footer
        this.addFooter(doc);

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  addHeader(doc, po) {
    // Use Origin small logo (no background) for documents
    const logoPath = path.join(__dirname, '../../images/origin-logo.png');

    // Add logo if exists
    if (fs.existsSync(logoPath)) {
      doc.image(logoPath, 50, 25, { width: 90 });
    } else {
      // Fallback text logo - Origin branding
      doc.fontSize(24)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('Origin', 50, 50);
      doc.fontSize(10)
         .fillColor(this.colors.gold)
         .text('Premium Cannabis Care', 50, 78);
    }

    // Company details on right
    doc.fontSize(9)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text('Origin by ILCO Farming (Pty) Ltd', 350, 50, { align: 'right', width: 195 })
       .text('123 Main Street, Sandton', 350, 63, { align: 'right', width: 195 })
       .text('Johannesburg, Gauteng 2196', 350, 76, { align: 'right', width: 195 })
       .text('Tel: +27 11 234 5678', 350, 89, { align: 'right', width: 195 })
       .text('origin@cleva-ai.co.za', 350, 102, { align: 'right', width: 195 });

    // Document title with gold accent
    doc.fontSize(24)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text('PURCHASE ORDER', 50, 130);

    // PO Number badge
    doc.fontSize(12)
       .fillColor(this.colors.gold)
       .font('Helvetica-Bold')
       .text(po.poNumber, 50, 158);

    // Horizontal line
    doc.moveTo(50, 180)
       .lineTo(545, 180)
       .strokeColor(this.colors.gold)
       .lineWidth(3)
       .stroke();

    doc.moveDown(2);
  }

  addSupplierDetails(doc, po) {
    const startY = 200;
    const supplier = po.supplier || {};

    // Supplier section header
    doc.fontSize(11)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text('SUPPLIER', 50, startY);

    // Supplier details box
    doc.rect(50, startY + 15, 230, 80)
       .fill(this.colors.cream);

    doc.fontSize(10)
       .fillColor(this.colors.text)
       .font('Helvetica-Bold')
       .text(supplier.name || 'Supplier Name', 60, startY + 25);

    doc.font('Helvetica')
       .fontSize(9)
       .text(supplier.contactPerson || '', 60, startY + 42)
       .text(supplier.email || '', 60, startY + 55)
       .text(supplier.phone || '', 60, startY + 68);

    if (supplier.address) {
      const addr = supplier.address;
      doc.text(`${addr.street || ''}, ${addr.city || ''}`, 60, startY + 81);
    }

    // Supplier ID
    if (supplier.supplierId) {
      doc.fontSize(8)
         .fillColor(this.colors.accent)
         .text(`Supplier ID: ${supplier.supplierId}`, 60, startY + 95);
    }
  }

  addPODetails(doc, po, branch) {
    const startY = 200;

    // PO details section header
    doc.fontSize(11)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text('ORDER DETAILS', 310, startY);

    // Details box
    doc.rect(310, startY + 15, 235, 80)
       .fill(this.colors.cream);

    const detailsX = 320;
    const valuesX = 420;

    doc.fontSize(9)
       .fillColor(this.colors.text)
       .font('Helvetica-Bold')
       .text('PO Number:', detailsX, startY + 25)
       .text('Date:', detailsX, startY + 40)
       .text('Expected Delivery:', detailsX, startY + 55)
       .text('Priority:', detailsX, startY + 70)
       .text('Status:', detailsX, startY + 85);

    doc.font('Helvetica')
       .text(po.poNumber, valuesX, startY + 25)
       .text(new Date(po.createdAt).toLocaleDateString('en-ZA'), valuesX, startY + 40)
       .text(po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString('en-ZA') : 'TBC', valuesX, startY + 55)
       .text((po.priority || 'normal').toUpperCase(), valuesX, startY + 70);

    // Status with color coding
    const statusColors = {
      draft: '#6B7280',
      submitted: '#F8C242',
      approved: '#10B981',
      ordered: '#3B82F6',
      partial: '#8B5CF6',
      received: '#059669',
      cancelled: '#EF4444'
    };

    doc.fillColor(statusColors[po.status] || this.colors.text)
       .font('Helvetica-Bold')
       .text((po.status || 'draft').toUpperCase(), valuesX, startY + 85);

    // Delivery location
    if (branch) {
      doc.fontSize(11)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('DELIVER TO', 50, startY + 120);

      doc.fontSize(9)
         .fillColor(this.colors.text)
         .font('Helvetica')
         .text(branch.name || 'Main Warehouse', 50, startY + 135)
         .text(branch.address?.street || '', 50, startY + 148)
         .text(`${branch.address?.city || ''}, ${branch.address?.province || ''}`, 50, startY + 161);
    }

    doc.moveDown(4);
  }

  addLineItems(doc, po) {
    const tableTop = 340;
    const itemHeight = 25;

    // Table headers - Origin purple background
    doc.fontSize(9)
       .fillColor(this.colors.cream)
       .font('Helvetica-Bold');

    // Header background with Origin purple
    doc.rect(50, tableTop, 495, 25)
       .fill(this.colors.primary);

    // Header text - cream on green
    doc.fillColor(this.colors.cream)
       .text('#', 55, tableTop + 8, { width: 25 })
       .text('Item Description', 80, tableTop + 8, { width: 180 })
       .text('SKU', 265, tableTop + 8, { width: 60 })
       .text('Qty', 330, tableTop + 8, { width: 40, align: 'center' })
       .text('Unit', 375, tableTop + 8, { width: 40 })
       .text('Unit Price', 420, tableTop + 8, { width: 60, align: 'right' })
       .text('Total', 485, tableTop + 8, { width: 55, align: 'right' });

    // Line items
    let currentY = tableTop + 30;
    doc.fillColor(this.colors.text).font('Helvetica');

    (po.items || []).forEach((item, index) => {
      const itemTotal = item.quantity * item.unitPrice;

      // Alternate row background
      if (index % 2 === 0) {
        doc.rect(50, currentY - 5, 495, itemHeight)
           .fill(this.colors.lightGray);
        doc.fillColor(this.colors.text);
      }

      doc.fontSize(9)
         .text((index + 1).toString(), 55, currentY, { width: 25 })
         .text(item.productName || item.description || 'Product', 80, currentY, { width: 180 })
         .text(item.productSku || '-', 265, currentY, { width: 60 })
         .text(item.quantity.toString(), 330, currentY, { width: 40, align: 'center' })
         .text(item.unitOfMeasure || 'units', 375, currentY, { width: 40 })
         .text(`R ${item.unitPrice.toFixed(2)}`, 420, currentY, { width: 60, align: 'right' })
         .text(`R ${itemTotal.toFixed(2)}`, 485, currentY, { width: 55, align: 'right' });

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

  addTotals(doc, po) {
    const itemCount = (po.items || []).length;
    const startY = 340 + (itemCount * 25) + 45;

    doc.fontSize(10)
       .fillColor(this.colors.text)
       .font('Helvetica');

    // Totals box
    doc.rect(350, startY - 10, 195, 100)
       .fill(this.colors.cream);

    // Subtotal
    doc.text('Subtotal:', 360, startY)
       .text(`R ${(po.subtotal || 0).toFixed(2)}`, 460, startY, { width: 80, align: 'right' });

    // Discount if any
    if (po.discount && po.discount > 0) {
      doc.text('Discount:', 360, startY + 18)
         .fillColor(this.colors.red)
         .text(`-R ${po.discount.toFixed(2)}`, 460, startY + 18, { width: 80, align: 'right' })
         .fillColor(this.colors.text);
    }

    // VAT
    doc.text(`VAT (${po.taxRate || VAT_RATE * 100}%):`, 360, startY + 36)
       .text(`R ${(po.taxAmount || 0).toFixed(2)}`, 460, startY + 36, { width: 80, align: 'right' });

    // Shipping if any
    if (po.shippingCost && po.shippingCost > 0) {
      doc.text('Shipping:', 360, startY + 54)
         .text(`R ${po.shippingCost.toFixed(2)}`, 460, startY + 54, { width: 80, align: 'right' });
    }

    // Total
    doc.moveTo(360, startY + 70)
       .lineTo(535, startY + 70)
       .strokeColor(this.colors.gold)
       .lineWidth(2)
       .stroke();

    doc.fontSize(12)
       .font('Helvetica-Bold')
       .fillColor(this.colors.primary)
       .text('TOTAL:', 360, startY + 78)
       .fontSize(14)
       .fillColor(this.colors.gold)
       .text(`R ${(po.total || 0).toFixed(2)}`, 460, startY + 78, { width: 80, align: 'right' });

    return startY + 100;
  }

  addTermsAndNotes(doc, po) {
    const itemCount = (po.items || []).length;
    const startY = 340 + (itemCount * 25) + 160;

    // Only add if there's space on the page
    if (startY > 650) return;

    // Notes section
    if (po.notes) {
      doc.fontSize(10)
         .fillColor(this.colors.primary)
         .font('Helvetica-Bold')
         .text('Notes:', 50, startY);

      doc.fontSize(9)
         .fillColor(this.colors.text)
         .font('Helvetica')
         .text(po.notes, 50, startY + 15, { width: 250 });
    }

    // Terms & Conditions
    doc.fontSize(10)
       .fillColor(this.colors.primary)
       .font('Helvetica-Bold')
       .text('Terms & Conditions:', 320, startY);

    doc.fontSize(8)
       .fillColor(this.colors.accent)
       .font('Helvetica')
       .text('1. Delivery must match PO quantities exactly', 320, startY + 15)
       .text('2. All products must include COA documentation', 320, startY + 27)
       .text('3. Payment terms: 30 days from invoice date', 320, startY + 39)
       .text('4. Quality issues must be reported within 48hrs', 320, startY + 51);
  }

  addFooter(doc) {
    const footerY = 740;

    // Footer line with gold accent
    doc.moveTo(50, footerY - 15)
       .lineTo(545, footerY - 15)
       .strokeColor(this.colors.gold)
       .lineWidth(2)
       .stroke();

    // Authorization section
    doc.fontSize(8)
       .fillColor(this.colors.text)
       .font('Helvetica')
       .text('Authorized By: ____________________________', 50, footerY)
       .text('Date: ______________', 300, footerY);

    // Footer text - Origin branding
    doc.fontSize(9)
       .fillColor(this.colors.gold)
       .font('Helvetica-Bold')
       .text('Origin - Cultivating Excellence', 50, footerY + 25, {
         align: 'center',
         width: 495
       });

    doc.fillColor(this.colors.accent)
       .fontSize(8)
       .font('Helvetica')
       .text('origin.cleva-ai.co.za | Tel: +27 11 234 5678 | origin@cleva-ai.co.za', 50, footerY + 40, {
         align: 'center',
         width: 495
       });
  }

  /**
   * Save PO PDF to file system
   * @param {Buffer} pdfBuffer - PDF buffer
   * @param {String} poNumber - PO number for filename
   * @returns {Promise<String>} File path
   */
  async saveToFile(pdfBuffer, poNumber) {
    const dir = path.join(__dirname, '../../purchase-orders');

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const filename = `${poNumber.replace(/[^a-zA-Z0-9-]/g, '_')}.pdf`;
    const filePath = path.join(dir, filename);
    fs.writeFileSync(filePath, pdfBuffer);

    return filePath;
  }
}

module.exports = new PurchaseOrderGenerator();
