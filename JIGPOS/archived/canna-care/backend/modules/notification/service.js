// Notification Service - Centralized notification system - Max 200 lines
const emailService = require('./email/service');
const smsService = require('./sms/service');
const pushService = require('./push/service');
const Notification = require('../database/models/Notification');
const logger = require('../logger');
const queue = require('../queue');

class NotificationService {
  constructor() {
    this.channels = {
      email: emailService,
      sms: smsService,
      push: pushService
    };
  }

  async send(type, recipient, data, channels = ['email']) {
    try {
      const notification = new Notification({
        type,
        recipient,
        data,
        channels,
        status: 'pending'
      });

      await notification.save();

      // Queue notification for processing
      await queue.add('notification', {
        notificationId: notification._id,
        type,
        recipient,
        data,
        channels
      });

      return notification;
    } catch (error) {
      logger.error('Notification send error:', error);
      throw error;
    }
  }

  async processNotification(notificationId) {
    try {
      const notification = await Notification.findById(notificationId);
      if (!notification) {
        throw new Error('Notification not found');
      }

      const results = [];

      for (const channel of notification.channels) {
        try {
          const service = this.channels[channel];
          if (service) {
            const result = await this.sendViaChannel(
              channel,
              notification.type,
              notification.recipient,
              notification.data
            );
            results.push({ channel, status: 'sent', result });
          }
        } catch (error) {
          results.push({ channel, status: 'failed', error: error.message });
          logger.error(`${channel} notification failed:`, error);
        }
      }

      notification.status = results.every(r => r.status === 'sent') ? 'sent' : 'partial';
      notification.sentAt = new Date();
      notification.results = results;
      await notification.save();

      return notification;
    } catch (error) {
      logger.error('Process notification error:', error);
      throw error;
    }
  }

  async sendViaChannel(channel, type, recipient, data) {
    const templates = {
      welcome: {
        email: 'welcomeEmail',
        sms: 'welcomeSMS',
        push: 'welcomePush'
      },
      orderConfirmation: {
        email: 'orderConfirmationEmail',
        sms: 'orderConfirmationSMS',
        push: 'orderConfirmationPush'
      },
      paymentConfirmation: {
        email: 'paymentConfirmationEmail',
        sms: 'paymentConfirmationSMS',
        push: 'paymentConfirmationPush'
      },
      shipping: {
        email: 'shippingEmail',
        sms: 'shippingSMS',
        push: 'shippingPush'
      },
      refund: {
        email: 'refundEmail',
        sms: 'refundSMS',
        push: 'refundPush'
      }
    };

    const template = templates[type]?.[channel];
    if (!template) {
      throw new Error(`No template found for ${type} via ${channel}`);
    }

    const service = this.channels[channel];
    return service.send(template, recipient, data);
  }

  // Specific notification methods
  async sendWelcomeEmail(user) {
    return this.send('welcome', user.email, {
      name: user.firstName,
      email: user.email,
      ldCoins: 100
    }, ['email']);
  }

  async sendOrderConfirmation(order) {
    const channels = ['email'];
    if (order.customer.phone) channels.push('sms');

    return this.send('orderConfirmation', order.customer.email, {
      orderNumber: order.orderNumber,
      total: order.total,
      items: order.items,
      customerName: order.customer.firstName
    }, channels);
  }

  async sendPaymentConfirmation(payment) {
    const order = await payment.populate('order');
    
    return this.send('paymentConfirmation', order.customer.email, {
      orderNumber: order.orderNumber,
      amount: payment.amount,
      paymentMethod: payment.provider,
      reference: payment.providerReference
    }, ['email', 'sms']);
  }

  async sendShippingNotification(order, trackingNumber) {
    return this.send('shipping', order.customer.email, {
      orderNumber: order.orderNumber,
      trackingNumber,
      carrier: order.shipping.carrier,
      estimatedDelivery: order.shipping.estimatedDelivery
    }, ['email', 'sms']);
  }

  async sendRefundNotification(payment, amount) {
    const order = await payment.populate('order');
    
    return this.send('refund', order.customer.email, {
      orderNumber: order.orderNumber,
      refundAmount: amount,
      reference: payment.providerReference
    }, ['email']);
  }

  async sendPasswordResetEmail(email, resetToken) {
    return emailService.send('passwordReset', email, {
      resetLink: `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`
    });
  }

  async sendVerificationEmail(email, verificationToken) {
    return emailService.send('emailVerification', email, {
      verificationLink: `${process.env.FRONTEND_URL}/verify-email?token=${verificationToken}`
    });
  }

  // Bulk notifications
  async sendBulkNotification(type, recipients, data) {
    const notifications = [];
    
    for (const recipient of recipients) {
      const notification = await this.send(type, recipient, data);
      notifications.push(notification);
    }

    return notifications;
  }

  // Get user notifications
  async getUserNotifications(userId, options = {}) {
    const query = { recipient: userId };
    
    if (options.unreadOnly) {
      query.readAt = null;
    }

    return Notification.find(query)
      .sort({ createdAt: -1 })
      .limit(options.limit || 50);
  }

  // Mark as read
  async markAsRead(notificationId, userId) {
    const notification = await Notification.findOne({
      _id: notificationId,
      recipient: userId
    });

    if (notification && !notification.readAt) {
      notification.readAt = new Date();
      await notification.save();
    }

    return notification;
  }
}

module.exports = new NotificationService();