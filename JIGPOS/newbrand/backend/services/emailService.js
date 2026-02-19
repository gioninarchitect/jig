const logger = require("../modules/logger");
// Email Service - JIG Craft Cannabis
const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    // Create transporter with SMTP settings from environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.jig.cleva-ai.co.za',
      port: parseInt(process.env.SMTP_PORT) || 465,
      secure: process.env.SMTP_SECURE === 'true',
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'hello@jig.cleva-ai.co.za';
    this.fromName = process.env.SMTP_FROM_NAME || 'JIG Craft Cannabis';

    // JIG Small Logo (no background) embedded as base64 for email templates
    try {
      this.logoDataUri = require('fs').readFileSync(require('path').join(__dirname, '../../images/jig-logo-nobg.png')).toString('base64');
    } catch (e) {
      // Fallback if logo not found
      this.logoDataUri = '';
    }
  }

  getLogoDataUri() {
    return 'data:image/png;base64,' + this.logoDataUri;
  }

  /**
   * Send generic email with optional attachments
   * @param {Object} options - Email options
   * @param {String} options.to - Recipient email
   * @param {String} options.subject - Email subject
   * @param {String} options.html - HTML body
   * @param {String} [options.text] - Plain text body
   * @param {Array} [options.attachments] - Array of attachment objects
   * @returns {Promise<Object>} Send result
   */
  async sendEmail({ to, subject, html, text, attachments = [] }) {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html
      };

      if (text) {
        mailOptions.text = text;
      }

      if (attachments && attachments.length > 0) {
        mailOptions.attachments = attachments;
      }

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent:', { to, subject, messageId: info.messageId });
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      logger.error('Send email error:', error);
      throw error;
    }
  }

  /**
   * Send invoice/receipt via email
   * @param {Object} options - Email options
   * @param {String} options.to - Recipient email
   * @param {String} options.subject - Email subject
   * @param {String} options.html - HTML body
   * @param {Buffer} options.attachment - PDF buffer
   * @param {String} options.filename - Attachment filename
   * @returns {Promise<Object>} Send result
   */
  async sendInvoiceEmail({ to, subject, html, attachment, filename }) {
    try {
      const mailOptions = {
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        attachments: [
          {
            filename: filename,
            content: attachment,
            contentType: 'application/pdf'
          }
        ]
      };

      const info = await this.transporter.sendMail(mailOptions);

      logger.info('Email sent:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  /**
   * Send invoice PDF
   * @param {String} email - Customer email
   * @param {Buffer} pdfBuffer - Invoice PDF buffer
   * @param {String} saleNumber - Sale number
   * @param {Number} totalAmount - Total amount
   * @returns {Promise<Object>} Send result
   */
  async sendInvoice(email, pdfBuffer, saleNumber, totalAmount) {
    const subject = `Invoice ${saleNumber} - JIG Craft Cannabis`;
    const html = this.getInvoiceEmailTemplate(saleNumber, totalAmount);

    return this.sendInvoiceEmail({
      to: email,
      subject: subject,
      html: html,
      attachment: pdfBuffer,
      filename: `Invoice-${saleNumber}.pdf`
    });
  }

  /**
   * Send receipt PDF
   * @param {String} email - Customer email
   * @param {Buffer} pdfBuffer - Receipt PDF buffer
   * @param {String} saleNumber - Sale number
   * @param {Number} totalAmount - Total amount
   * @param {Object} saleData - Full sale data (optional, for detailed SA standard receipt)
   * @returns {Promise<Object>} Send result
   */
  async sendReceipt(email, pdfBuffer, saleNumber, totalAmount, saleData = null) {
    const subject = `Receipt ${saleNumber} - JIG Craft Cannabis`;
    const html = saleData
      ? this.getDetailedReceiptTemplate(saleData)
      : this.getReceiptEmailTemplate(saleNumber, totalAmount);

    return this.sendInvoiceEmail({
      to: email,
      subject: subject,
      html: html,
      attachment: pdfBuffer,
      filename: `Receipt-${saleNumber}.pdf`
    });
  }

  /**
   * Get detailed SA standard receipt email template
   * @param {Object} sale - Full sale object with items
   */
  getDetailedReceiptTemplate(sale) {
    const formatDate = (date) => {
      const d = new Date(date);
      return d.toLocaleDateString('en-ZA', {
        year: 'numeric', month: 'long', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
      });
    };

    const formatCurrency = (amount) => `R ${(amount || 0).toFixed(2)}`;

    // Calculate totals
    const subtotal = sale.subtotal || (sale.totalAmount / 1.15);
    const vatAmount = sale.taxAmount || (sale.totalAmount - subtotal);
    const total = sale.totalAmount;

    // Build line items HTML
    const itemsHtml = (sale.items || []).map(item => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #eee;">${item.name}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice)}</td>
        <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right;">${formatCurrency(item.unitPrice * item.quantity)}</td>
      </tr>
    `).join('');

    const paymentMethod = sale.payments?.[0]?.method || sale.paymentMethod || 'N/A';

    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #2F2F2F; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000000; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #111111; padding: 25px; border-radius: 0 0 8px 8px; }
    .business-info { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #000000; }
    .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #f5f5f5; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #333; }
    .totals-row td { padding: 8px; }
    .grand-total { font-size: 18px; font-weight: 700; color: #000000; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>TAX INVOICE / RECEIPT</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">${sale.saleNumber}</p>
  </div>

  <div class="content">
    <!-- Business Details -->
    <div class="business-info">
      <strong style="font-size: 16px; color: #000000;">JIG Craft Cannabis</strong><br>
      <span style="font-size: 13px; color: #666;">
        18 Crownwood Street, Ormonde, Gauteng, South Africa<br>
        Email: hello@jig.cleva-ai.co.za
      </span>
    </div>

    <!-- Receipt Details -->
    <div class="receipt-box">
      <table style="margin-bottom: 15px;">
        <tr>
          <td style="width: 50%;"><strong>Receipt No:</strong> ${sale.saleNumber}</td>
          <td style="width: 50%; text-align: right;"><strong>Date:</strong> ${formatDate(sale.createdAt || new Date())}</td>
        </tr>
        <tr>
          <td><strong>Payment Method:</strong> ${paymentMethod.toUpperCase()}</td>
          <td style="text-align: right;"><strong>Status:</strong> <span style="color: #000000; font-weight: 700;">PAID</span></td>
        </tr>
        ${sale.customerName ? `<tr><td colspan="2"><strong>Customer:</strong> ${sale.customerName}</td></tr>` : ''}
      </table>

      <!-- Line Items -->
      <table>
        <thead>
          <tr>
            <th>Description</th>
            <th style="text-align: center; width: 60px;">Qty</th>
            <th style="text-align: right; width: 100px;">Unit Price</th>
            <th style="text-align: right; width: 100px;">Amount</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
        </tbody>
      </table>

      <!-- Totals -->
      <table style="margin-top: 15px;">
        <tr class="totals-row">
          <td style="text-align: right; padding-right: 20px;"><strong>Subtotal (excl. VAT):</strong></td>
          <td style="text-align: right; width: 120px;">${formatCurrency(subtotal)}</td>
        </tr>
        <tr class="totals-row">
          <td style="text-align: right; padding-right: 20px;"><strong>VAT (15%):</strong></td>
          <td style="text-align: right;">${formatCurrency(vatAmount)}</td>
        </tr>
        <tr class="totals-row" style="border-top: 2px solid #000000;">
          <td style="text-align: right; padding-right: 20px; padding-top: 10px;"><strong>TOTAL (incl. VAT):</strong></td>
          <td style="text-align: right; padding-top: 10px;" class="grand-total">${formatCurrency(total)}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; color: #666; font-size: 13px; margin-top: 20px;">
      Thank you for your purchase!<br>
      <strong>Cultivating Excellence</strong>
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>JIG Craft Cannabis</strong> | www.jig.cleva-ai.co.za<br>
      This is an official tax invoice for VAT purposes.<br>
      Please retain for your records.
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get invoice email HTML template
   */
  getInvoiceEmailTemplate(saleNumber, totalAmount) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #2F2F2F;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #2D5016, #4A7C59);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      background: #F4F1DE;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .invoice-details {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #2D5016;
    }
    .invoice-details h2 {
      margin: 0 0 15px 0;
      color: #2D5016;
      font-size: 18px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #2A2A2A;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #666;
    }
    .detail-value {
      color: #2F2F2F;
      font-weight: 700;
    }
    .total-amount {
      font-size: 24px;
      color: #2D5016;
    }
    .button {
      display: inline-block;
      background: #2D5016;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #4A7C59;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
    .footer a {
      color: #2D5016;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>📄 Invoice Attached</h1>
    <p>Thank you for your purchase at JIG Craft Cannabis</p>
  </div>

  <div class="content">
    <p>Dear Valued Customer,</p>

    <p>Thank you for your purchase! Please find your invoice attached to this email.</p>

    <div class="invoice-details">
      <h2>Invoice Summary</h2>
      <div class="detail-row">
        <span class="detail-label">Invoice Number:</span>
        <span class="detail-value">${saleNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Total Amount:</span>
        <span class="detail-value total-amount">R ${totalAmount.toFixed(2)}</span>
      </div>
    </div>

    <p>The invoice PDF is attached to this email. If you have any questions about this invoice, please don't hesitate to contact us.</p>

    <center>
      <a href="https://jig.cleva-ai.co.za" class="button">Visit Our Website</a>
    </center>

    <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
      <strong>Cultivating Excellence</strong><br>
      We appreciate your business and look forward to serving you again soon!
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>JIG Craft Cannabis</strong><br>
            Email: <a href="mailto:hello@jig.cleva-ai.co.za">hello@jig.cleva-ai.co.za</a><br>
      🌐 Website: <a href="https://jig.cleva-ai.co.za">www.jig.cleva-ai.co.za</a>
    </p>
    <p style="margin-top: 15px; color: #999;">
      This is an automated email. Please do not reply to this message.<br>
      For support, contact us at hello@jig.cleva-ai.co.za
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Get receipt email HTML template
   */
  getReceiptEmailTemplate(saleNumber, totalAmount) {
    return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #2F2F2F;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: linear-gradient(135deg, #2D5016, #4A7C59);
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .header p {
      margin: 10px 0 0 0;
      font-size: 14px;
      opacity: 0.9;
    }
    .content {
      background: #F4F1DE;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .receipt-details {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #C9A961;
    }
    .receipt-details h2 {
      margin: 0 0 15px 0;
      color: #2D5016;
      font-size: 18px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #2A2A2A;
    }
    .detail-row:last-child {
      border-bottom: none;
    }
    .detail-label {
      font-weight: 600;
      color: #666;
    }
    .detail-value {
      color: #2F2F2F;
      font-weight: 700;
    }
    .total-amount {
      font-size: 24px;
      color: #2D5016;
    }
    .success-badge {
      background: #4CAF50;
      color: white;
      padding: 8px 16px;
      border-radius: 20px;
      display: inline-block;
      margin: 10px 0;
      font-weight: 600;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
    .footer a {
      color: #2D5016;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>✅ Payment Received</h1>
    <p>Your receipt is attached</p>
  </div>

  <div class="content">
    <p>Dear Valued Customer,</p>

    <p>Your payment has been successfully processed. Thank you for choosing JIG Craft Cannabis!</p>

    <center>
      <span class="success-badge">✓ PAYMENT CONFIRMED</span>
    </center>

    <div class="receipt-details">
      <h2>Receipt Summary</h2>
      <div class="detail-row">
        <span class="detail-label">Receipt Number:</span>
        <span class="detail-value">${saleNumber}</span>
      </div>
      <div class="detail-row">
        <span class="detail-label">Amount Paid:</span>
        <span class="detail-value total-amount">R ${totalAmount.toFixed(2)}</span>
      </div>
    </div>

    <p>Your receipt PDF is attached to this email for your records. Please keep this for your reference.</p>

    <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
      <strong>Cultivating Excellence</strong><br>
      Thank you for supporting JIG Craft Cannabis. We appreciate your business!
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>JIG Craft Cannabis</strong><br>
            Email: <a href="mailto:hello@jig.cleva-ai.co.za">hello@jig.cleva-ai.co.za</a><br>
      🌐 Website: <a href="https://jig.cleva-ai.co.za">www.jig.cleva-ai.co.za</a>
    </p>
    <p style="margin-top: 15px; color: #999;">
      This is an automated email. Please do not reply to this message.<br>
      For support, contact us at hello@jig.cleva-ai.co.za
    </p>
  </div>
</body>
</html>
    `;
  }

  /**
   * Verify SMTP connection
   * @returns {Promise<Boolean>}
   */
  async verifyConnection() {
    try {
      await this.transporter.verify();
      logger.info('SMTP connection verified');
      return true;
    } catch (error) {
      logger.error('SMTP connection failed:', error.message);
      return false;
    }
  }

  /**
   * Send order confirmation email with optional invoice PDF
   * @param {Object} options - Order confirmation options
   * @param {String} options.to - Customer email
   * @param {String} options.orderNumber - Order number
   * @param {String} options.customerName - Customer name
   * @param {Number} options.total - Order total
   * @param {Array} options.items - Order items
   * @param {Buffer} [options.pdfBuffer] - Optional invoice PDF
   * @returns {Promise<Object>} Send result
   */
  async sendOrderConfirmation({ to, orderNumber, customerName, total, items, pdfBuffer }) {
    const subject = `Order Confirmation ${orderNumber} - JIG Craft Cannabis`;

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #2A2A2A;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #2A2A2A; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #2A2A2A; text-align: right;">R${(item.price || 0).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #2A2A2A; text-align: right;">R${(item.subtotal || item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body {
      font-family: Arial, sans-serif;
      line-height: 1.6;
      color: #2F2F2F;
      max-width: 600px;
      margin: 0 auto;
      padding: 20px;
    }
    .header {
      background: #000000;
      color: white;
      padding: 30px;
      text-align: center;
      border-radius: 8px 8px 0 0;
    }
    .header h1 {
      margin: 0;
      font-size: 28px;
    }
    .content {
      background: #F5F5F5;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .order-details {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #000000;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    th {
      background: #F0F0F0;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    .total-row {
      font-size: 18px;
      font-weight: bold;
    }
    .footer {
      text-align: center;
      margin-top: 20px;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>JIG CRAFT CANNABIS</h1>
    <p style="margin: 10px 0 0 0; font-size: 14px;">Order Confirmation</p>
  </div>

  <div class="content">
    <p>Dear ${customerName},</p>
    <p>Thank you for your order! We have received your order and it is being processed.</p>

    <div class="order-details">
      <h2 style="margin: 0 0 15px 0; color: #000;">Order #${orderNumber}</h2>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th style="text-align: center;">Qty</th>
            <th style="text-align: right;">Price</th>
            <th style="text-align: right;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${itemsHtml}
          <tr class="total-row">
            <td colspan="3" style="padding: 15px 10px; text-align: right;"><strong>Order Total:</strong></td>
            <td style="padding: 15px 10px; text-align: right;"><strong>R${total.toFixed(2)}</strong></td>
          </tr>
        </tbody>
      </table>
    </div>

    <p><strong>What's Next?</strong></p>
    <ul>
      <li>You will receive a confirmation once your payment has been verified.</li>
      <li>Your order will be shipped within 1-2 business days after payment confirmation.</li>
      <li>You can track your order status in your dashboard.</li>
    </ul>

    <p>If you have any questions, please contact us at <a href="mailto:hello@jig.cleva-ai.co.za">hello@jig.cleva-ai.co.za</a></p>
  </div>

  <div class="footer">
    <p>
      <strong>JIG Craft Cannabis</strong><br>
      Email: <a href="mailto:hello@jig.cleva-ai.co.za">hello@jig.cleva-ai.co.za</a><br>
      Website: <a href="https://jig.cleva-ai.co.za">www.jig.cleva-ai.co.za</a>
    </p>
    <p style="margin-top: 15px; color: #999;">
      This is an automated email. Please do not reply to this message.
    </p>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: '"JIG Craft Cannabis" <' + this.fromEmail + '>',
      to: to,
      subject: subject,
      html: html
    };

    // Attach PDF if provided
    if (pdfBuffer) {
      mailOptions.attachments = [
        {
          filename: 'Invoice-' + orderNumber + '.pdf',
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ];
    }

    const info = await this.transporter.sendMail(mailOptions);

    logger.info('Order confirmation email sent:', info.messageId);
    return {
      success: true,
      messageId: info.messageId,
      response: info.response
    };
  }

  /**
   * Send welcome email to new users with login credentials
   * @param {Object} options - Welcome email options
   * @param {String} options.to - Customer email
   * @param {String} options.firstName - Customer first name
   * @param {String} options.temporaryPassword - Generated password
   * @param {String} options.orderNumber - Order number that triggered account creation
   * @returns {Promise<Object>} Send result
   */
  async sendWelcomeEmail({ to, firstName, temporaryPassword, orderNumber }) {
    const subject = 'Welcome to JIG Craft Cannabis - Your Account Details';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #2F2F2F; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #000000; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #F5F5F5; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border: 2px solid #000000; }
    .credentials-box h2 { margin: 0 0 20px 0; color: #000; font-size: 18px; }
    .credential-item { background: #F0F0F0; padding: 15px; margin: 10px 0; border-radius: 6px; font-family: monospace; font-size: 16px; }
    .credential-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .warning-box { background: rgba(245, 158, 11, 0.15); border: 1px solid #FFE69C; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #000000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to JIG Craft Cannabis</h1>
    <p style="margin: 10px 0 0 0; font-size: 14px;">Your account has been created</p>
  </div>

  <div class="content">
    <p>Dear ${firstName},</p>
    <p>Thank you for your order <strong>#${orderNumber}</strong>! We've created an account for you so you can track your orders, earn Wellness Points, and enjoy member benefits.</p>

    <div class="credentials-box">
      <h2>Your Login Credentials</h2>
      <div class="credential-label">Email Address</div>
      <div class="credential-item">${to}</div>
      <div class="credential-label">Temporary Password</div>
      <div class="credential-item">${temporaryPassword}</div>
    </div>

    <div class="warning-box">
      <strong>Important:</strong> For your security, please change your password after your first login. You can do this in your Account Dashboard under Settings.
    </div>

    <center>
      <a href="https://jig.cleva-ai.co.za/login.html" class="button">Login to Your Account</a>
    </center>

    <p><strong>With your account, you can:</strong></p>
    <ul>
      <li>Track your order status in real-time</li>
      <li>Earn Wellness Points on every purchase</li>
      <li>Access exclusive member discounts</li>
      <li>Save your addresses for faster checkout</li>
      <li>View your order history</li>
    </ul>
  </div>

  <div class="footer">
    <p><strong>JIG Craft Cannabis</strong><br>
    Email: <a href="mailto:hello@jig.cleva-ai.co.za">hello@jig.cleva-ai.co.za</a><br>
    Website: <a href="https://jig.cleva-ai.co.za">www.jig.cleva-ai.co.za</a></p>
  </div>
</body>
</html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html
      });

      logger.info('Welcome email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Welcome email error:', error);
      throw error;
    }
  }

  /**
   * Send membership activation email
   * @param {Object} options - Membership email options
   * @param {String} options.to - Customer email
   * @param {String} options.firstName - Customer first name
   * @param {String} options.orderNumber - Order that qualified for membership
   * @param {Number} options.orderTotal - Order total amount
   * @returns {Promise<Object>} Send result
   */
  async sendMembershipActivationEmail({ to, firstName, orderNumber, orderTotal }) {
    const subject = 'Congratulations! Your JIG Craft Cannabis Membership is Active';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #2F2F2F; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #000000, #333333); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 32px; }
    .badge { background: #C9A961; color: #000; padding: 8px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; font-weight: bold; font-size: 14px; }
    .content { background: #F5F5F5; padding: 30px; border-radius: 0 0 8px 8px; }
    .benefits-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #C9A961; }
    .benefit-item { padding: 12px 0; border-bottom: 1px solid #2A2A2A; display: flex; align-items: center; }
    .benefit-item:last-child { border-bottom: none; }
    .benefit-icon { background: #C9A961; color: #000; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
    .button { display: inline-block; background: #000000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>MEMBERSHIP ACTIVATED</h1>
    <div class="badge">WELLNESS MEMBER</div>
  </div>

  <div class="content">
    <p>Dear ${firstName},</p>
    <p>Congratulations! Your purchase of <strong>R${orderTotal.toFixed(2)}</strong> (Order #${orderNumber}) has qualified you for our exclusive <strong>Wellness Membership</strong>!</p>

    <div class="benefits-box">
      <h2 style="margin: 0 0 20px 0; color: #000;">Your Member Benefits</h2>
      <div class="benefit-item">
        <span class="benefit-icon">1</span>
        <span><strong>10% Discount</strong> on all future purchases</span>
      </div>
      <div class="benefit-item">
        <span class="benefit-icon">2</span>
        <span><strong>Double Wellness Points</strong> on every order</span>
      </div>
      <div class="benefit-item">
        <span class="benefit-icon">3</span>
        <span><strong>Free Shipping</strong> on orders over R200</span>
      </div>
      <div class="benefit-item">
        <span class="benefit-icon">4</span>
        <span><strong>Early Access</strong> to new products and sales</span>
      </div>
      <div class="benefit-item">
        <span class="benefit-icon">5</span>
        <span><strong>Birthday Bonus</strong> - Special gift on your birthday</span>
      </div>
    </div>

    <center>
      <a href="https://jig.cleva-ai.co.za/dashboard.html" class="button">Visit Your Dashboard</a>
    </center>

    <p>Your membership benefits are now active and will be automatically applied to your future orders. Thank you for being a valued member of the JIG Craft Cannabis family!</p>
  </div>

  <div class="footer">
    <p><strong>JIG Craft Cannabis</strong><br>
    Email: <a href="mailto:hello@jig.cleva-ai.co.za">hello@jig.cleva-ai.co.za</a><br>
    Website: <a href="https://jig.cleva-ai.co.za">www.jig.cleva-ai.co.za</a></p>
  </div>
</body>
</html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html
      });

      logger.info('Membership activation email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Membership activation email error:', error);
      throw error;
    }
  }

  /**
   * Send registration confirmation email
   * @param {Object} options - Registration email options
   * @param {String} options.to - Customer email
   * @param {String} options.firstName - Customer first name
   * @param {String} options.loginUrl - URL to login page
   * @returns {Promise<Object>} Send result
   */
  async sendRegistrationConfirmationEmail({ to, firstName, loginUrl }) {
    const subject = 'Welcome to JIG Craft Cannabis - Account Created Successfully';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #2F2F2F; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: linear-gradient(135deg, #000000, #333333); color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #F5F5F5; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #000; }
    .button { display: inline-block; background: #000000; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .email-display { background: #E8E8E8; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 16px; text-align: center; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <h1>Welcome to JIG Craft Cannabis</h1>
    <p style="margin: 10px 0 0 0; opacity: 0.9;">Cultivating Excellence</p>
  </div>

  <div class="content">
    <p>Dear ${firstName},</p>
    <p>Thank you for creating an account with JIG Craft Cannabis! Your account has been successfully set up.</p>

    <div class="info-box">
      <h3 style="margin: 0 0 15px 0;">Your Login Details</h3>
      <p><strong>Email Address:</strong></p>
      <div class="email-display">${to}</div>
      <p style="margin-bottom: 0;"><strong>Password:</strong> The password you created during registration</p>
    </div>

    <center>
      <a href="${loginUrl}" class="button">Login to Your Account</a>
    </center>

    <p><strong>Forgot your password?</strong><br>
    No worries! You can reset it anytime using the "Forgot Password" link on the login page.</p>

    <p>If you have any questions or need assistance, our team is here to help.</p>

    <p>Welcome to the family!</p>
  </div>

  <div class="footer">
    <p><strong>JIG Craft Cannabis</strong><br>
    Email: <a href="mailto:hello@jig.cleva-ai.co.za">hello@jig.cleva-ai.co.za</a><br>
    Website: <a href="https://jig.cleva-ai.co.za">www.jig.cleva-ai.co.za</a></p>
  </div>
</body>
</html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html
      });

      logger.info('Registration confirmation email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Registration confirmation email error:', error);
      throw error;
    }
  }

  /**
   * Send password reset email with reset link
   * @param {Object} options - Email options
   * @param {string} options.to - Recipient email address
   * @param {string} options.firstName - User's first name
   * @param {string} options.resetToken - Password reset token
   * @param {string} options.resetUrl - Full URL for password reset
   */
  async sendPasswordResetEmail({ to, firstName, resetToken, resetUrl }) {
    const subject = 'Password Reset Request - JIG Craft Cannabis';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f5f5f5;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #1a1a1a; padding: 30px 40px; border-radius: 8px 8px 0 0; text-align: center;">
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">JIG Craft Cannabis</h1>
                    <p style="color: #888888; margin: 5px 0 0 0; font-size: 12px;">Cultivating Excellence</p>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #1a1a1a; margin: 0 0 20px 0; font-size: 20px;">Password Reset Request</h2>

                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Hi ${firstName},
                    </p>

                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We received a request to reset the password for your JIG Craft Cannabis account. Click the button below to create a new password:
                    </p>

                    <!-- Reset Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; background-color: #1a1a1a; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">Reset Password</a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #1a1a1a; font-size: 12px; word-break: break-all; background-color: #f5f5f5; padding: 12px; border-radius: 4px; margin: 0 0 20px 0;">
                      ${resetUrl}
                    </p>

                    <!-- Warning Box -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                      <tr>
                        <td style="background-color: #fff8e6; border-left: 4px solid #f5a623; padding: 15px; border-radius: 0 4px 4px 0;">
                          <p style="color: #7d5a00; font-size: 14px; margin: 0; line-height: 1.5;">
                            <strong>Important:</strong> This link expires in 1 hour for your security. If you did not request a password reset, please ignore this email or contact support if you have concerns.
                          </p>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 20px 0 0 0;">
                      Stay well,<br>
                      <strong>The JIG Craft Cannabis Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #111111; padding: 25px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
                    <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0; text-align: center;">
                      JIG Craft Cannabis | Cultivating Excellence
                    </p>
                    <p style="color: #888888; font-size: 12px; margin: 0; text-align: center;">
                      Questions? Contact us at <a href="mailto:hello@jig.cleva-ai.co.za" style="color: #1a1a1a;">hello@jig.cleva-ai.co.za</a>
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </body>
      </html>
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html
      });

      logger.info('Password reset email sent:', info.messageId);
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('Password reset email error:', error);
      throw error;
    }
  }

  /**
   * Send OTP verification email
   * @param {Object} options - OTP email options
   * @param {String} options.to - Recipient email address
   * @param {String} options.otpCode - The 6-digit OTP code
   * @param {String} options.purpose - Purpose of OTP (login, signup, reset_password, etc.)
   * @param {Number} options.expiryMinutes - OTP expiry time in minutes
   * @returns {Promise<Object>} Send result
   */
  async sendOTPEmail({ to, otpCode, purpose = 'login', expiryMinutes = 10 }) {
    const purposeText = {
      login: 'login to your account',
      signup: 'complete your registration',
      reset_password: 'reset your password',
      verify_email: 'verify your email address',
      two_factor: 'complete two-factor authentication'
    };

    const subject = `Your JIG Craft Cannabis Verification Code: ${otpCode}`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: #0A0A0A;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #0A0A0A; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 500px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #7C3AED 0%, #6D28D9 100%); padding: 30px; text-align: center; border-bottom: 4px solid #D97706;">
              <img src="${this.getLogoDataUri()}" alt="JIG Craft Cannabis" style="width: 160px; height: auto;" />
            </td>
          </tr>

          <!-- Body -->
          <tr>
            <td style="padding: 40px 30px;">
              <p style="margin: 0 0 20px; color: #6D28D9; font-size: 16px;">
                Hello,
              </p>
              <p style="margin: 0 0 30px; color: #6D28D9; font-size: 16px;">
                Your one-time verification code to ${purposeText[purpose] || 'verify your identity'} is:
              </p>

              <!-- OTP Box -->
              <div style="background: #0A0A0A; border: 2px solid #7C3AED; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: #7C3AED;">
                  ${otpCode}
                </span>
              </div>

              <p style="margin: 0 0 10px; color: #6D28D9; font-size: 14px;">
                <strong>This code expires in ${expiryMinutes} minutes.</strong>
              </p>
              <p style="margin: 0; color: #666; font-size: 14px;">
                If you didn't request this code, please ignore this email or contact support if you have concerns.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background: #0A0A0A; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(124, 58, 237,0.2);">
              <p style="margin: 0; color: #6D28D9; font-size: 12px;">
                JIG Craft Cannabis | Craft Cannabis
              </p>
              <p style="margin: 5px 0 0; color: #999; font-size: 11px;">
                This is an automated message. Please do not reply.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;

    try {
      const info = await this.transporter.sendMail({
        from: `"JIG Craft Cannabis" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: `Your JIG Craft Cannabis verification code is: ${otpCode}\n\nThis code expires in ${expiryMinutes} minutes.\n\nIf you didn't request this code, please ignore this email.`
      });

      logger.info('OTP email sent:', { to, messageId: info.messageId });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('OTP email error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
