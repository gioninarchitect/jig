const logger = require("../modules/logger");
// Email Service - De Bud Chef
const nodemailer = require('nodemailer');
require('dotenv').config();

class EmailService {
  constructor() {
    // Create transporter with SMTP settings from environment variables
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'mail.debudchef.co.za',
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

    this.fromEmail = process.env.SMTP_FROM_EMAIL || 'hello@debudchef.co.za';
    this.fromName = process.env.SMTP_FROM_NAME || 'De Bud Chef';
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
    const subject = `Invoice ${saleNumber} - De Bud Chef`;
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
    const subject = `Receipt ${saleNumber} - De Bud Chef`;
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
    .header { background: #3A5F48; color: white; padding: 25px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { background: #F4F0E6; padding: 25px; border-radius: 0 0 8px 8px; }
    .business-info { background: white; padding: 15px; border-radius: 8px; margin-bottom: 20px; border-left: 4px solid #3A5F48; }
    .receipt-box { background: white; padding: 20px; border-radius: 8px; margin: 15px 0; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #F4F0E6; padding: 10px; text-align: left; font-weight: 600; border-bottom: 2px solid #3A5F48; }
    .totals-row td { padding: 8px; }
    .grand-total { font-size: 18px; font-weight: 700; color: #3A5F48; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 120px; margin-bottom: 10px;" />
    <h1>TAX INVOICE / RECEIPT</h1>
    <p style="margin: 5px 0 0 0; opacity: 0.9;">${sale.saleNumber}</p>
  </div>

  <div class="content">
    <!-- Business Details -->
    <div class="business-info">
      <strong style="font-size: 16px; color: #3A5F48;">De Bud Chef</strong><br>
      <span style="font-size: 13px; color: #666;">
        18 Crownwood Street, Ormonde, Gauteng, South Africa<br>
        Email: hello@debudchef.co.za
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
          <td style="text-align: right;"><strong>Status:</strong> <span style="color: #3A5F48; font-weight: 700;">PAID</span></td>
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
        <tr class="totals-row" style="border-top: 2px solid #3A5F48;">
          <td style="text-align: right; padding-right: 20px; padding-top: 10px;"><strong>TOTAL (incl. VAT):</strong></td>
          <td style="text-align: right; padding-top: 10px;" class="grand-total">${formatCurrency(total)}</td>
        </tr>
      </table>
    </div>

    <p style="text-align: center; color: #666; font-size: 13px; margin-top: 20px;">
      Thank you for your purchase!<br>
      <strong>De Bud Chef</strong>
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>De Bud Chef</strong> | www.debudchef.co.za<br>
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
      background: linear-gradient(135deg, #3A5F48, #3A5F48);
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
      background: #F4F0E6;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .invoice-details {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3A5F48;
    }
    .invoice-details h2 {
      margin: 0 0 15px 0;
      color: #3A5F48;
      font-size: 18px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E0E0E0;
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
      color: #3A5F48;
    }
    .button {
      display: inline-block;
      background: #3A5F48;
      color: white;
      padding: 12px 30px;
      text-decoration: none;
      border-radius: 6px;
      font-weight: 600;
      margin: 20px 0;
    }
    .button:hover {
      background: #3A5F48;
    }
    .footer {
      text-align: center;
      padding: 20px;
      color: #666;
      font-size: 12px;
    }
    .footer a {
      color: #3A5F48;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 120px; margin-bottom: 10px;" />
    <h1>Invoice Attached</h1>
    <p>Thank you for your purchase at De Bud Chef</p>
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
      <a href="https://debudchef.co.za" class="button">Visit Our Website</a>
    </center>

    <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
      <strong>De Bud Chef</strong><br>
      We appreciate your business and look forward to serving you again soon!
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>De Bud Chef</strong><br>
      Email: <a href="mailto:hello@debudchef.co.za">hello@debudchef.co.za</a><br>
      Website: <a href="https://www.debudchef.co.za">www.debudchef.co.za</a>
    </p>
    <p style="margin-top: 15px; color: #999;">
      This is an automated email. Please do not reply to this message.<br>
      For support, contact us at hello@debudchef.co.za
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
      background: linear-gradient(135deg, #3A5F48, #3A5F48);
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
      background: #F4F0E6;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .receipt-details {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #D4AF37;
    }
    .receipt-details h2 {
      margin: 0 0 15px 0;
      color: #3A5F48;
      font-size: 18px;
    }
    .detail-row {
      display: flex;
      justify-content: space-between;
      padding: 8px 0;
      border-bottom: 1px solid #E0E0E0;
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
      color: #3A5F48;
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
      color: #3A5F48;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 120px; margin-bottom: 10px;" />
    <h1>Payment Received</h1>
    <p>Your receipt is attached</p>
  </div>

  <div class="content">
    <p>Dear Valued Customer,</p>

    <p>Your payment has been successfully processed. Thank you for choosing De Bud Chef!</p>

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
      <strong>De Bud Chef</strong><br>
      Thank you for supporting De Bud Chef. We appreciate your business!
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>De Bud Chef</strong><br>
      Email: <a href="mailto:hello@debudchef.co.za">hello@debudchef.co.za</a><br>
      Website: <a href="https://www.debudchef.co.za">www.debudchef.co.za</a>
    </p>
    <p style="margin-top: 15px; color: #999;">
      This is an automated email. Please do not reply to this message.<br>
      For support, contact us at hello@debudchef.co.za
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
    const subject = `Order Confirmation ${orderNumber} - De Bud Chef`;

    const itemsHtml = items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #E0E0E0;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E0E0E0; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E0E0E0; text-align: right;">R${(item.price || 0).toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #E0E0E0; text-align: right;">R${(item.subtotal || item.price * item.quantity).toFixed(2)}</td>
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
      background: #3A5F48;
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
      background: #F4F0E6;
      padding: 30px;
      border-radius: 0 0 8px 8px;
    }
    .order-details {
      background: white;
      padding: 20px;
      border-radius: 8px;
      margin: 20px 0;
      border-left: 4px solid #3A5F48;
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
    <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 120px; margin-bottom: 10px;" />
    <h1>Order Confirmation</h1>
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

    <p>If you have any questions, please contact us at <a href="mailto:hello@debudchef.co.za">hello@debudchef.co.za</a></p>
  </div>

  <div class="footer">
    <p>
      <strong>De Bud Chef</strong><br>
      Email: <a href="mailto:hello@debudchef.co.za">hello@debudchef.co.za</a><br>
      Website: <a href="https://debudchef.co.za">www.debudchef.co.za</a>
    </p>
    <p style="margin-top: 15px; color: #999;">
      This is an automated email. Please do not reply to this message.
    </p>
  </div>
</body>
</html>
    `;

    const mailOptions = {
      from: '"De Bud Chef" <' + this.fromEmail + '>',
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
    const subject = 'Welcome to De Bud Chef - Your Account Details';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #2F2F2F; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3A5F48; color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #F4F0E6; padding: 30px; border-radius: 0 0 8px 8px; }
    .credentials-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border: 2px solid #3A5F48; }
    .credentials-box h2 { margin: 0 0 20px 0; color: #000; font-size: 18px; }
    .credential-item { background: #F0F0F0; padding: 15px; margin: 10px 0; border-radius: 6px; font-family: monospace; font-size: 16px; }
    .credential-label { font-weight: bold; color: #666; font-size: 12px; text-transform: uppercase; margin-bottom: 5px; }
    .warning-box { background: #FFF3CD; border: 1px solid #FFE69C; padding: 15px; border-radius: 8px; margin: 20px 0; }
    .button { display: inline-block; background: #3A5F48; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 120px; margin-bottom: 10px;" />
    <h1>Welcome to De Bud Chef</h1>
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
      <a href="https://debudchef.co.za/login.html" class="button">Login to Your Account</a>
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
    <p><strong>De Bud Chef</strong><br>
    Email: <a href="mailto:hello@debudchef.co.za">hello@debudchef.co.za</a><br>
    Website: <a href="https://debudchef.co.za">www.debudchef.co.za</a></p>
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
    const subject = 'Congratulations! Your De Bud Chef Membership is Active';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #2F2F2F; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3A5F48; color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 32px; }
    .badge { background: #D4AF37; color: #000; padding: 8px 20px; border-radius: 20px; display: inline-block; margin: 15px 0; font-weight: bold; font-size: 14px; }
    .content { background: #F4F0E6; padding: 30px; border-radius: 0 0 8px 8px; }
    .benefits-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #D4AF37; }
    .benefit-item { padding: 12px 0; border-bottom: 1px solid #E0E0E0; display: flex; align-items: center; }
    .benefit-item:last-child { border-bottom: none; }
    .benefit-icon { background: #D4AF37; color: #000; width: 30px; height: 30px; border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-right: 15px; font-weight: bold; }
    .button { display: inline-block; background: #3A5F48; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 120px; margin-bottom: 10px;" />
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
      <a href="https://debudchef.co.za/dashboard.html" class="button">Visit Your Dashboard</a>
    </center>

    <p>Your membership benefits are now active and will be automatically applied to your future orders. Thank you for being a valued member of the De Bud Chef family!</p>
  </div>

  <div class="footer">
    <p><strong>De Bud Chef</strong><br>
    Email: <a href="mailto:hello@debudchef.co.za">hello@debudchef.co.za</a><br>
    Website: <a href="https://debudchef.co.za">www.debudchef.co.za</a></p>
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
    const subject = 'Welcome to De Bud Chef - Account Created Successfully';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #2F2F2F; max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #3A5F48; color: white; padding: 40px; text-align: center; border-radius: 8px 8px 0 0; }
    .header h1 { margin: 0; font-size: 28px; }
    .content { background: #F4F0E6; padding: 30px; border-radius: 0 0 8px 8px; }
    .info-box { background: white; padding: 25px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #000; }
    .button { display: inline-block; background: #3A5F48; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 20px 0; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
    .email-display { background: #E8E8E8; padding: 15px; border-radius: 6px; font-family: monospace; font-size: 16px; text-align: center; margin: 15px 0; }
  </style>
</head>
<body>
  <div class="header">
    <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 120px; margin-bottom: 10px;" />
    <h1>Welcome to De Bud Chef</h1>
  </div>

  <div class="content">
    <p>Dear ${firstName},</p>
    <p>Thank you for creating an account with De Bud Chef! Your account has been successfully set up.</p>

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
    <p><strong>De Bud Chef</strong><br>
    Email: <a href="mailto:hello@debudchef.co.za">hello@debudchef.co.za</a><br>
    Website: <a href="https://debudchef.co.za">www.debudchef.co.za</a></p>
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
    const subject = 'Password Reset Request - De Bud Chef';

    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset</title>
      </head>
      <body style="margin: 0; padding: 0; background-color: #F4F0E6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F0E6;">
          <tr>
            <td align="center" style="padding: 40px 20px;">
              <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                <!-- Header -->
                <tr>
                  <td style="background-color: #3A5F48; padding: 30px 40px; border-radius: 8px 8px 0 0; text-align: center;">
                    <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 100px; margin-bottom: 8px;" />
                    <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">De Bud Chef</h1>
                  </td>
                </tr>

                <!-- Content -->
                <tr>
                  <td style="padding: 40px;">
                    <h2 style="color: #3A5F48; margin: 0 0 20px 0; font-size: 20px;">Password Reset Request</h2>

                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      Hi ${firstName},
                    </p>

                    <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
                      We received a request to reset the password for your De Bud Chef account. Click the button below to create a new password:
                    </p>

                    <!-- Reset Button -->
                    <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 30px 0;">
                      <tr>
                        <td align="center">
                          <a href="${resetUrl}" style="display: inline-block; background-color: #3A5F48; color: #ffffff; text-decoration: none; padding: 14px 40px; border-radius: 6px; font-size: 16px; font-weight: 600;">Reset Password</a>
                        </td>
                      </tr>
                    </table>

                    <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 15px 0;">
                      Or copy and paste this link into your browser:
                    </p>
                    <p style="color: #3A5F48; font-size: 12px; word-break: break-all; background-color: #F4F0E6; padding: 12px; border-radius: 4px; margin: 0 0 20px 0;">
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
                      <strong>The De Bud Chef Team</strong>
                    </p>
                  </td>
                </tr>

                <!-- Footer -->
                <tr>
                  <td style="background-color: #f9f9f9; padding: 25px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
                    <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0; text-align: center;">
                      De Bud Chef | De Bud Chef
                    </p>
                    <p style="color: #888888; font-size: 12px; margin: 0; text-align: center;">
                      Questions? Contact us at <a href="mailto:hello@debudchef.co.za" style="color: #3A5F48;">hello@debudchef.co.za</a>
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
   * Send OTP code via email
   * @param {Object} options - OTP email options
   * @param {String} options.to - Recipient email
   * @param {String} options.otpCode - 6-digit OTP code
   * @param {String} options.purpose - Purpose (login, signup, reset_password, verify_email)
   * @param {Number} options.expiryMinutes - Expiry time in minutes (default 5)
   * @returns {Promise<Object>} Send result
   */
  async sendOTPEmail({ to, otpCode, purpose = 'login', expiryMinutes = 5 }) {
    const purposeText = {
      login: 'sign in to your account',
      signup: 'complete your registration',
      reset_password: 'reset your password',
      verify_email: 'verify your email address',
      two_factor: 'complete two-factor authentication'
    };

    const subject = `${otpCode} is your De Bud Chef verification code`;

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Verification Code</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F4F0E6; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F4F0E6;">
    <tr>
      <td align="center" style="padding: 40px 20px;">
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
          <!-- Header -->
          <tr>
            <td style="background-color: #3A5F48; padding: 30px 40px; border-radius: 8px 8px 0 0; text-align: center;">
              <img src="https://app.debudchef.co.za/images/dbc-logo-nobg.png" alt="De Bud Chef" style="max-width: 100px; margin-bottom: 8px;" />
              <h1 style="color: #ffffff; margin: 0; font-size: 24px; font-weight: 600;">De Bud Chef</h1>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 40px;">
              <h2 style="color: #3A5F48; margin: 0 0 20px 0; font-size: 20px; text-align: center;">Your Verification Code</h2>

              <p style="color: #333333; font-size: 16px; line-height: 1.6; margin: 0 0 30px 0; text-align: center;">
                Use this code to ${purposeText[purpose] || 'verify your identity'}:
              </p>

              <!-- OTP Code Box -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 0 0 30px 0;">
                <tr>
                  <td align="center">
                    <div style="background-color: #f8f8f8; border: 2px solid #D4AF37; border-radius: 12px; padding: 25px 40px; display: inline-block;">
                      <span style="font-size: 42px; font-weight: 700; letter-spacing: 12px; color: #3A5F48; font-family: 'Courier New', monospace;">${otpCode}</span>
                    </div>
                  </td>
                </tr>
              </table>

              <p style="color: #666666; font-size: 14px; line-height: 1.6; margin: 0 0 25px 0; text-align: center;">
                This code expires in <strong>${expiryMinutes} minutes</strong>.
              </p>

              <!-- Security Warning -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin: 25px 0;">
                <tr>
                  <td style="background-color: #fff8e6; border-left: 4px solid #f5a623; padding: 15px; border-radius: 0 4px 4px 0;">
                    <p style="color: #7d5a00; font-size: 14px; margin: 0; line-height: 1.5;">
                      <strong>Security Notice:</strong> Never share this code with anyone. De Bud Chef will never ask you for this code via phone or text message. If you didn't request this code, please ignore this email.
                    </p>
                  </td>
                </tr>
              </table>

              <p style="color: #333333; font-size: 14px; line-height: 1.6; margin: 20px 0 0 0; text-align: center;">
                If you didn't request this code, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #f9f9f9; padding: 25px 40px; border-radius: 0 0 8px 8px; border-top: 1px solid #eeeeee;">
              <p style="color: #888888; font-size: 12px; margin: 0 0 10px 0; text-align: center;">
                De Bud Chef | De Bud Chef
              </p>
              <p style="color: #888888; font-size: 12px; margin: 0; text-align: center;">
                Questions? Contact us at <a href="mailto:hello@debudchef.co.za" style="color: #3A5F48;">hello@debudchef.co.za</a>
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

    // Plain text version
    const text = `
Your De Bud Chef Verification Code

Use this code to ${purposeText[purpose] || 'verify your identity'}:

${otpCode}

This code expires in ${expiryMinutes} minutes.

SECURITY NOTICE: Never share this code with anyone. De Bud Chef will never ask you for this code via phone or text message.

If you didn't request this code, please ignore this email.

---
De Bud Chef
hello@debudchef.co.za
www.debudchef.co.za
    `;

    try {
      const info = await this.transporter.sendMail({
        from: `"${this.fromName}" <${this.fromEmail}>`,
        to: to,
        subject: subject,
        html: html,
        text: text
      });

      logger.info('OTP email sent:', { messageId: info.messageId, to, purpose });
      return { success: true, messageId: info.messageId };
    } catch (error) {
      logger.error('OTP email error:', error);
      throw error;
    }
  }
}

module.exports = new EmailService();
