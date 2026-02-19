// PayU South Africa Provider - Subscription & Recurring Payments
const crypto = require('crypto');
const axios = require('axios');
const config = require('../../../config');
const logger = require('../../logger');

class PayUProvider {
  constructor() {
    this.baseUrl = config.payment.payu?.baseUrl || 'https://secure.payu.co.za/api';
    this.username = config.payment.payu?.username; // SOAP username
    this.password = config.payment.payu?.password; // SOAP password
    this.safeKey = config.payment.payu?.safeKey; // API safe key
  }

  /**
   * Create a recurring subscription (for module billing)
   * @param {Object} subscriptionData - Subscription details
   * @returns {Object} Subscription reference and payment URL
   */
  async createSubscription(subscriptionData) {
    try {
      const {
        merchantReference,
        customerId,
        customerEmail,
        customerPhone,
        amount,
        recurringAmount,
        frequency, // 'monthly', 'weekly', 'daily'
        trialDays = 7,
        cycles = 0, // 0 = indefinite
        itemName,
        returnUrl,
        cancelUrl,
        notifyUrl
      } = subscriptionData;

      // PayU subscription payload
      const payload = {
        Safekey: this.safeKey,
        TransactionType: 'SUBSCRIPTION',
        AdditionalInformation: {
          merchantReference,
          notificationUrl: notifyUrl,
          returnUrl,
          cancelUrl,
          supportedPaymentMethods: 'CREDITCARD,EFT',
          demoMode: config.payment.payu?.sandbox ? 'true' : 'false'
        },
        Customer: {
          merchantUserId: customerId,
          email: customerEmail,
          mobile: customerPhone
        },
        Basket: {
          description: itemName,
          amountInCents: amount * 100,
          currencyCode: 'ZAR'
        },
        Recurring: {
          recurrences: cycles,
          managedBy: 'MERCHANT', // We manage subscription lifecycle
          startDate: this.calculateStartDate(trialDays),
          anonymousCreditCard: false,
          statementDescription: itemName.substring(0, 20)
        },
        Customfield: {
          key: 'TrialDays',
          value: trialDays.toString()
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/subscription/create`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.getBasicAuth()}`
          }
        }
      );

      if (response.data.return?.successful === 'true') {
        return {
          subscriptionId: response.data.return.payUReference,
          paymentUrl: response.data.return.paymentUrl,
          reference: response.data.return.merchantReference,
          status: 'pending_activation'
        };
      }

      throw new Error(response.data.return?.displayMessage || 'Subscription creation failed');
    } catch (error) {
      logger.error('PayU subscription creation error:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * Process one-time payment (for product purchases)
   * @param {Object} paymentData
   * @returns {Object}
   */
  async initiate(paymentData) {
    try {
      const payload = {
        Safekey: this.safeKey,
        TransactionType: 'PAYMENT',
        AdditionalInformation: {
          merchantReference: paymentData.paymentId,
          notificationUrl: paymentData.notifyUrl,
          returnUrl: paymentData.returnUrl,
          cancelUrl: paymentData.cancelUrl,
          supportedPaymentMethods: 'CREDITCARD,EFT,ZAPPER',
          demoMode: config.payment.payu?.sandbox ? 'true' : 'false'
        },
        Customer: {
          email: paymentData.customerEmail,
          mobile: paymentData.customerPhone
        },
        Basket: {
          description: paymentData.itemName || `Order ${paymentData.orderId}`,
          amountInCents: paymentData.amount * 100,
          currencyCode: 'ZAR'
        },
        Customfield: {
          key: 'OrderId',
          value: paymentData.orderId
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/payment/create`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.getBasicAuth()}`
          }
        }
      );

      if (response.data.return?.successful === 'true') {
        return {
          reference: response.data.return.payUReference,
          paymentUrl: response.data.return.redirectPaymentUrl || response.data.return.paymentUrl,
          status: 'pending'
        };
      }

      throw new Error(response.data.return?.displayMessage || 'Payment initiation failed');
    } catch (error) {
      logger.error('PayU payment initiation error:', error.response?.data || error);
      throw error;
    }
  }

  /**
   * Verify payment status
   * @param {String} reference - PayU reference
   * @returns {Object}
   */
  async verify(reference) {
    try {
      const payload = {
        Safekey: this.safeKey,
        AdditionalInformation: {
          payUReference: reference
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/payment/query`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.getBasicAuth()}`
          }
        }
      );

      const paymentInfo = response.data.return;

      return {
        status: this.mapStatus(paymentInfo.transactionState),
        amount: paymentInfo.basket?.amountInCents / 100,
        reference: paymentInfo.payUReference,
        merchantReference: paymentInfo.merchantReference,
        providerResponse: paymentInfo
      };
    } catch (error) {
      logger.error('PayU verification error:', error);
      throw error;
    }
  }

  /**
   * Cancel/pause subscription
   * @param {String} subscriptionId
   * @returns {Boolean}
   */
  async cancelSubscription(subscriptionId) {
    try {
      const payload = {
        Safekey: this.safeKey,
        AdditionalInformation: {
          payUReference: subscriptionId
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/subscription/cancel`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.getBasicAuth()}`
          }
        }
      );

      return response.data.return?.successful === 'true';
    } catch (error) {
      logger.error('PayU subscription cancellation error:', error);
      throw error;
    }
  }

  /**
   * Process webhook notification from PayU
   * @param {Object} data
   * @returns {Object}
   */
  async processWebhook(data) {
    try {
      // PayU IPN (Instant Payment Notification) format
      return {
        reference: data.PayUReference,
        merchantReference: data.MerchantReference,
        status: this.mapStatus(data.TransactionState),
        amount: parseFloat(data.AmountInCents) / 100,
        customData: {
          orderId: data.Customfield?.value,
          transactionType: data.TransactionType
        },
        isSubscription: data.TransactionType === 'SUBSCRIPTION'
      };
    } catch (error) {
      logger.error('PayU webhook processing error:', error);
      throw error;
    }
  }

  /**
   * Verify webhook signature (PayU uses checksum validation)
   * @param {Object} data
   * @param {Object} headers
   * @returns {Boolean}
   */
  async verifyWebhook(data, headers) {
    try {
      // PayU sends a checksum in the notification
      const receivedChecksum = data.Checksum;
      if (!receivedChecksum) {
        logger.warn('No checksum in PayU webhook');
        return false;
      }

      // Calculate expected checksum
      const checksumString = `${data.MerchantReference}${data.PayUReference}${data.AmountInCents}${this.safeKey}`;
      const expectedChecksum = crypto
        .createHash('md5')
        .update(checksumString)
        .digest('hex');

      return receivedChecksum === expectedChecksum;
    } catch (error) {
      logger.error('PayU webhook verification error:', error);
      return false;
    }
  }

  /**
   * Refund a payment
   * @param {String} reference
   * @param {Number} amount
   * @returns {Object}
   */
  async refund(reference, amount) {
    try {
      const payload = {
        Safekey: this.safeKey,
        AdditionalInformation: {
          payUReference: reference
        },
        Basket: {
          amountInCents: amount * 100,
          currencyCode: 'ZAR'
        }
      };

      const response = await axios.post(
        `${this.baseUrl}/payment/refund`,
        payload,
        {
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Basic ${this.getBasicAuth()}`
          }
        }
      );

      return {
        status: response.data.return?.successful === 'true' ? 'success' : 'failed',
        reference: response.data.return?.refundReference,
        amount: amount
      };
    } catch (error) {
      logger.error('PayU refund error:', error);
      throw error;
    }
  }

  /**
   * Helper: Generate Basic Auth header
   * @returns {String}
   */
  getBasicAuth() {
    const credentials = `${this.username}:${this.password}`;
    return Buffer.from(credentials).toString('base64');
  }

  /**
   * Helper: Calculate subscription start date (after trial)
   * @param {Number} trialDays
   * @returns {String} ISO date
   */
  calculateStartDate(trialDays) {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() + trialDays);
    return startDate.toISOString().split('T')[0]; // YYYY-MM-DD
  }

  /**
   * Map PayU status to our internal status
   * @param {String} payuStatus
   * @returns {String}
   */
  mapStatus(payuStatus) {
    const statusMap = {
      'SUCCESSFUL': 'success',
      'PROCESSING': 'pending',
      'FAILED': 'failed',
      'TIMEOUT': 'failed',
      'AWAITING_PAYMENT': 'pending',
      'CANCELLED': 'cancelled'
    };

    return statusMap[payuStatus] || 'unknown';
  }

  /**
   * Validate configuration
   * @returns {Boolean}
   */
  validateConfig() {
    if (!this.username || !this.password || !this.safeKey) {
      throw new Error('PayU configuration missing (username, password, or safeKey)');
    }
    return true;
  }
}

module.exports = PayUProvider;
