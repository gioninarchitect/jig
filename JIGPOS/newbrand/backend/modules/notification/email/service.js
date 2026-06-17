// Email Service - Max 200 lines
const nodemailer = require('nodemailer');
const config = require('../../../config');
const logger = require('../../logger');
const templates = require('./templates');

class EmailService {
  constructor() {
    this.transporter = this.createTransporter();
  }

  createTransporter() {
    if (config.env === 'test') {
      // Use Ethereal for testing
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        auth: {
          user: 'ethereal.user@ethereal.email',
          pass: 'ethereal.pass'
        }
      });
    }

    return nodemailer.createTransport({
      host: config.email.host,
      port: config.email.port,
      secure: config.email.secure,
      auth: {
        user: config.email.auth.user,
        pass: config.email.auth.pass
      }
    });
  }

  async send(templateName, to, data) {
    try {
      const template = templates[templateName];
      if (!template) {
        throw new Error(`Email template ${templateName} not found`);
      }

      const mailOptions = {
        from: config.email.from,
        to,
        subject: template.subject(data),
        html: template.html(data),
        text: template.text ? template.text(data) : undefined
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email sent successfully', {
        template: templateName,
        to,
        messageId: result.messageId
      });

      return result;
    } catch (error) {
      logger.error('Email send error:', error);
      throw error;
    }
  }

  async sendWithAttachment(templateName, to, data, attachments) {
    try {
      const template = templates[templateName];
      if (!template) {
        throw new Error(`Email template ${templateName} not found`);
      }

      const mailOptions = {
        from: config.email.from,
        to,
        subject: template.subject(data),
        html: template.html(data),
        attachments
      };

      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info('Email with attachment sent', {
        template: templateName,
        to,
        attachments: attachments.length
      });

      return result;
    } catch (error) {
      logger.error('Email with attachment error:', error);
      throw error;
    }
  }

  // Specific email methods
  async sendOrderConfirmation(order) {
    const data = {
      orderNumber: order.orderNumber,
      customerName: order.customer.firstName,
      items: order.items,
      subtotal: order.subtotal,
      shipping: order.shipping.cost,
      tax: order.tax.amount,
      total: order.total,
      shippingAddress: order.shippingAddress,
      estimatedDelivery: order.shipping.estimatedDelivery
    };

    return this.send('orderConfirmation', order.customer.email, data);
  }

  async sendEFTInstructions(order) {
    const data = {
      orderNumber: order.orderNumber,
      customerName: order.customer.firstName,
      total: order.total,
      bankDetails: {
        bank: 'Capitec',
        accountHolder: 'Origin by ILCO Farming',
        accountType: 'Current Account',
        accountNumber: '2320619824',
        branchCode: '470010',
        reference: order.orderNumber
      }
    };

    return this.send('eftInstructions', order.customer.email, data);
  }

  async sendPaymentReceived(order) {
    const data = {
      orderNumber: order.orderNumber,
      customerName: order.customer.firstName,
      amount: order.total,
      paymentDate: new Date().toLocaleDateString()
    };

    return this.send('paymentReceived', order.customer.email, data);
  }

  async sendMembershipActivated(user) {
    const data = {
      name: user.firstName,
      membershipTier: 'Lifestyle Member',
      benefits: [
        'Access to exclusive lifestyle products',
        'Member-only pricing',
        'Early access to new releases',
        'VIP event invitations',
        'LD Coins rewards on every purchase'
      ],
      ldCoins: user.loyalty.ldCoins
    };

    return this.send('membershipActivated', user.email, data);
  }

  async sendVoucherGenerated(voucher, recipient) {
    const data = {
      voucherCode: voucher.code,
      voucherType: voucher.type,
      value: voucher.value,
      expiryDate: voucher.expiresAt,
      minimumPurchase: voucher.minimumPurchase
    };

    return this.send('voucherGenerated', recipient, data);
  }

  async sendShippingUpdate(order, status) {
    const data = {
      orderNumber: order.orderNumber,
      customerName: order.customer.firstName,
      status: status,
      trackingNumber: order.shipping.trackingNumber,
      carrier: order.shipping.carrier,
      trackingLink: `https://tracking.${order.shipping.carrier}.com/${order.shipping.trackingNumber}`
    };

    return this.send('shippingUpdate', order.customer.email, data);
  }

  async sendAbandonedCart(user, cart) {
    const data = {
      name: user.firstName,
      items: cart.items,
      total: cart.total,
      discountCode: 'COMEBACK10',
      cartLink: `${process.env.FRONTEND_URL}/cart?recover=${cart._id}`
    };

    return this.send('abandonedCart', user.email, data);
  }

  async sendLowStockAlert(product) {
    const data = {
      productName: product.name,
      sku: product.sku,
      currentStock: product.inventory.quantity,
      threshold: product.inventory.lowStockThreshold
    };

    return this.send('lowStockAlert', config.email.adminEmail, data);
  }

  async sendDailyReport(reportData) {
    const data = {
      date: new Date().toLocaleDateString(),
      orders: reportData.orders,
      revenue: reportData.revenue,
      newMembers: reportData.newMembers,
      topProducts: reportData.topProducts
    };

    return this.send('dailyReport', config.email.adminEmail, data);
  }

  // Verify SMTP connection
  async verify() {
    try {
      await this.transporter.verify();
      logger.info('Email service verified and ready');
      return true;
    } catch (error) {
      logger.error('Email service verification failed:', error);
      return false;
    }
  }
}

module.exports = new EmailService();