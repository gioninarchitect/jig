// Payment Service - Business Logic - Max 200 lines
const Payment = require('../database/models/Payment');
const Order = require('../database/models/Order');
const config = require('../../config');
const logger = require('../logger');
const InstapayProvider = require('./providers/instapay');
const PayUProvider = require('./providers/payu');
const notificationService = require('../notification/service');
const cache = require('../cache');

class PaymentService {
  constructor() {
    this.providers = {
      instapay: new InstapayProvider(),
      payu: new PayUProvider()
    };
    this.defaultProvider = config.payment.provider;
    this.subscriptionProvider = 'payu'; // PayU handles all subscriptions
  }

  async initiate(paymentData) {
    try {
      const { orderId, amount, provider = this.defaultProvider } = paymentData;

      // Validate order
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      if (order.payment.status === 'paid') {
        throw new Error('Order already paid');
      }

      // Create payment record
      const payment = new Payment({
        order: orderId,
        amount,
        currency: 'ZAR',
        provider,
        status: 'pending',
        metadata: paymentData
      });

      await payment.save();

      // Get payment provider
      const paymentProvider = this.providers[provider];
      if (!paymentProvider) {
        throw new Error(`Payment provider ${provider} not supported`);
      }

      // Initiate payment with provider
      const result = await paymentProvider.initiate({
        paymentId: payment._id.toString(),
        amount,
        orderId,
        customerEmail: order.customer.email,
        customerPhone: order.customer.phone,
        returnUrl: `${config.payment[provider].returnUrl}?payment=${payment._id}`,
        cancelUrl: config.payment[provider].cancelUrl,
        notifyUrl: `${config.payment[provider].notifyUrl}/${provider}`
      });

      // Update payment with provider reference
      payment.providerReference = result.reference;
      payment.paymentUrl = result.paymentUrl;
      await payment.save();

      return {
        paymentId: payment._id,
        paymentUrl: result.paymentUrl,
        reference: result.reference
      };
    } catch (error) {
      logger.error('Payment initiation service error:', error);
      throw error;
    }
  }

  async verify(transactionId) {
    try {
      const payment = await Payment.findById(transactionId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      const provider = this.providers[payment.provider];
      const verification = await provider.verify(payment.providerReference);

      // Update payment status
      payment.status = verification.status;
      payment.verificationData = verification;

      if (verification.status === 'success') {
        payment.paidAt = new Date();
        
        // Update order
        await this.updateOrderPaymentStatus(payment.order, 'paid');
        
        // Send confirmation email
        await notificationService.sendPaymentConfirmation(payment);
        
        // Clear cache
        await cache.del(`order_${payment.order}`);
      }

      await payment.save();

      return payment;
    } catch (error) {
      logger.error('Payment verification service error:', error);
      throw error;
    }
  }

  async processWebhook(provider, data, headers) {
    try {
      const paymentProvider = this.providers[provider];
      if (!paymentProvider) {
        throw new Error(`Provider ${provider} not supported`);
      }

      // Verify webhook signature
      const isValid = await paymentProvider.verifyWebhook(data, headers);
      if (!isValid) {
        throw new Error('Invalid webhook signature');
      }

      // Process webhook data
      const webhookData = await paymentProvider.processWebhook(data);
      
      // Find and update payment
      const payment = await Payment.findOne({ 
        providerReference: webhookData.reference 
      });

      if (payment) {
        payment.status = webhookData.status;
        payment.webhookData = data;

        if (webhookData.status === 'success' && payment.status !== 'paid') {
          payment.status = 'paid';
          payment.paidAt = new Date();
          
          await this.updateOrderPaymentStatus(payment.order, 'paid');
          await notificationService.sendPaymentConfirmation(payment);
        }

        await payment.save();
      }

      logger.info('Webhook processed successfully', { provider, reference: webhookData.reference });
      return true;
    } catch (error) {
      logger.error('Webhook processing error:', error);
      throw error;
    }
  }

  async updateOrderPaymentStatus(orderId, status) {
    try {
      const order = await Order.findById(orderId);
      if (!order) {
        throw new Error('Order not found');
      }

      order.payment.status = status;
      
      if (status === 'paid') {
        order.payment.paidAt = new Date();
        
        // Check if order qualifies for membership
        if (order.total >= config.business.membershipThreshold) {
          order.qualifiesForMembership = true;
        }
        
        // Move order to processing
        order.status = 'confirmed';
        order.statusHistory.push({
          status: 'confirmed',
          note: 'Payment received',
          timestamp: new Date()
        });
      }

      await order.save();
      return order;
    } catch (error) {
      logger.error('Order update error:', error);
      throw error;
    }
  }

  async refund(paymentId, amount, reason, user) {
    try {
      const payment = await Payment.findById(paymentId);
      if (!payment) {
        throw new Error('Payment not found');
      }

      if (payment.status !== 'paid') {
        throw new Error('Payment not eligible for refund');
      }

      const provider = this.providers[payment.provider];
      const refundResult = await provider.refund(payment.providerReference, amount);

      // Create refund record
      payment.refunds.push({
        amount,
        reason,
        status: refundResult.status,
        reference: refundResult.reference,
        initiatedBy: user.id,
        createdAt: new Date()
      });

      if (refundResult.status === 'success') {
        payment.status = 'refunded';
        payment.refundedAt = new Date();
      }

      await payment.save();

      // Send refund notification
      await notificationService.sendRefundNotification(payment, amount);

      return payment;
    } catch (error) {
      logger.error('Refund service error:', error);
      throw error;
    }
  }

  async getStatus(paymentId) {
    const payment = await Payment.findById(paymentId).populate('order');
    return payment;
  }

  async getTransactions(filters) {
    const query = {};

    if (filters.userId) {
      query.user = filters.userId;
    }

    if (filters.status) {
      query.status = filters.status;
    }

    if (filters.startDate || filters.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    return Payment.find(query).sort({ createdAt: -1 }).populate('order');
  }

  /**
   * Create module subscription (7-day trial + recurring billing)
   * @param {Object} subscriptionData
   * @returns {Object}
   */
  async createModuleSubscription(subscriptionData) {
    try {
      const {
        userId,
        moduleId,
        moduleName,
        monthlyAmount,
        trialDays = 7
      } = subscriptionData;

      const provider = this.providers[this.subscriptionProvider];

      const result = await provider.createSubscription({
        merchantReference: `SUB-${userId}-${moduleId}-${Date.now()}`,
        customerId: userId,
        customerEmail: subscriptionData.customerEmail,
        customerPhone: subscriptionData.customerPhone,
        amount: 0, // First payment after trial
        recurringAmount: monthlyAmount,
        frequency: 'monthly',
        trialDays,
        cycles: 0, // Indefinite
        itemName: `${moduleName} Module Subscription`,
        returnUrl: subscriptionData.returnUrl || `${config.app.url}/modules/success`,
        cancelUrl: subscriptionData.cancelUrl || `${config.app.url}/modules/cancel`,
        notifyUrl: `${config.app.url}/api/v1/webhooks/payu`
      });

      logger.info('Module subscription created', {
        userId,
        moduleId,
        subscriptionId: result.subscriptionId
      });

      return result;
    } catch (error) {
      logger.error('Module subscription creation error:', error);
      throw error;
    }
  }

  /**
   * Cancel module subscription
   * @param {String} subscriptionId
   * @returns {Boolean}
   */
  async cancelModuleSubscription(subscriptionId) {
    try {
      const provider = this.providers[this.subscriptionProvider];
      const result = await provider.cancelSubscription(subscriptionId);

      logger.info('Module subscription cancelled', { subscriptionId });

      return result;
    } catch (error) {
      logger.error('Module subscription cancellation error:', error);
      throw error;
    }
  }
}

module.exports = new PaymentService();