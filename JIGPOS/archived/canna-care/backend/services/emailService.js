// Email Service - CBD Wellness 24
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    // Create transporter with CBD Wellness 24 SMTP settings
    this.transporter = nodemailer.createTransport({
      host: 'mail.cbdwellness24.co.za',
      port: 465,
      secure: true, // SSL/TLS
      auth: {
        user: 'accounts@cbdwellness24.co.za',
        pass: 'CBDW2025!!@@'
      },
      tls: {
        rejectUnauthorized: false // Allow self-signed certificates
      }
    });

    this.fromEmail = 'accounts@cbdwellness24.co.za';
    this.fromName = 'CBD Wellness 24';
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

      console.log('Email sent:', info.messageId);
      return {
        success: true,
        messageId: info.messageId,
        response: info.response
      };
    } catch (error) {
      console.error('Email send error:', error);
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
    const subject = `Invoice ${saleNumber} - CBD Wellness 24`;
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
   * @returns {Promise<Object>} Send result
   */
  async sendReceipt(email, pdfBuffer, saleNumber, totalAmount) {
    const subject = `Receipt ${saleNumber} - CBD Wellness 24`;
    const html = this.getReceiptEmailTemplate(saleNumber, totalAmount);

    return this.sendInvoiceEmail({
      to: email,
      subject: subject,
      html: html,
      attachment: pdfBuffer,
      filename: `Receipt-${saleNumber}.pdf`
    });
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
    <p>Thank you for your purchase at CBD Wellness 24</p>
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
      <a href="https://cbdwellness24.co.za" class="button">Visit Our Website</a>
    </center>

    <p style="margin-top: 30px; padding-top: 20px; border-top: 2px solid #ddd;">
      <strong>Natural Relief, Available Anytime</strong><br>
      We appreciate your business and look forward to serving you again soon!
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>CBD Wellness 24</strong><br>
      📞 Tel: +27 11 234 5678<br>
      📧 Email: <a href="mailto:info@cbdwellness24.co.za">info@cbdwellness24.co.za</a><br>
      🌐 Website: <a href="https://cbdwellness24.co.za">www.cbdwellness24.co.za</a>
    </p>
    <p style="margin-top: 15px; color: #999;">
      This is an automated email. Please do not reply to this message.<br>
      For support, contact us at support@cbdwellness24.co.za
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

    <p>Your payment has been successfully processed. Thank you for choosing CBD Wellness 24!</p>

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
      <strong>Natural Relief, Available Anytime</strong><br>
      Thank you for supporting CBD Wellness 24. We appreciate your business!
    </p>
  </div>

  <div class="footer">
    <p>
      <strong>CBD Wellness 24</strong><br>
      📞 Tel: +27 11 234 5678<br>
      📧 Email: <a href="mailto:info@cbdwellness24.co.za">info@cbdwellness24.co.za</a><br>
      🌐 Website: <a href="https://cbdwellness24.co.za">www.cbdwellness24.co.za</a>
    </p>
    <p style="margin-top: 15px; color: #999;">
      This is an automated email. Please do not reply to this message.<br>
      For support, contact us at support@cbdwellness24.co.za
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
      console.log('✅ SMTP connection verified');
      return true;
    } catch (error) {
      console.error('❌ SMTP connection failed:', error.message);
      return false;
    }
  }
}

module.exports = new EmailService();
