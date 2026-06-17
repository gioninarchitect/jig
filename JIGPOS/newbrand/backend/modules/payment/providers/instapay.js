// InstaPay WebPay V2 Provider - Max 200 lines
const crypto = require('crypto');
const axios = require('axios');
const config = require('../../../config');
const logger = require('../../logger');

class InstapayProvider {
  constructor() {
    this.baseUrl = config.payment.instapay?.baseUrl || 'https://api.instapay.co.za/v2';
    this.merchantId = config.payment.instapay?.merchantId;
    this.secretKey = config.payment.instapay?.secretKey;
  }

  async initiate(paymentData) {
    try {
      const payload = {
        merchant_id: this.merchantId,
        merchant_ref: paymentData.paymentId,
        amount: paymentData.amount * 100, // Convert to cents
        item_name: `Order ${paymentData.orderId}`,
        item_description: `Payment for order ${paymentData.orderId}`,
        email_address: paymentData.customerEmail,
        cell_number: paymentData.customerPhone,
        return_url: paymentData.returnUrl,
        cancel_url: paymentData.cancelUrl,
        notify_url: paymentData.notifyUrl,
        payment_method: 'cc', // Credit card default
        custom_str1: paymentData.orderId,
        custom_str2: paymentData.paymentId
      };

      // Generate signature
      payload.signature = this.generateSignature(payload);

      // Make API request to InstaPay WebPay V2
      const response = await axios.post(`${this.baseUrl}/payment/initiate`, payload, {
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': this.secretKey
        }
      });

      if (response.data.status === 'success') {
        return {
          reference: response.data.payment_id,
          paymentUrl: response.data.payment_url,
          qrCode: response.data.qr_code
        };
      }

      throw new Error(response.data.message || 'Payment initiation failed');
    } catch (error) {
      logger.error('InstaPay initiation error:', error);
      throw error;
    }
  }

  async verify(reference) {
    try {
      const response = await axios.get(`${this.baseUrl}/payment/verify/${reference}`, {
        headers: {
          'X-API-Key': this.secretKey,
          'X-Merchant-Id': this.merchantId
        }
      });

      return {
        status: this.mapStatus(response.data.payment_status),
        amount: response.data.amount_gross / 100,
        fee: response.data.amount_fee / 100,
        net: response.data.amount_net / 100,
        reference: response.data.payment_id,
        providerResponse: response.data
      };
    } catch (error) {
      logger.error('InstaPay verification error:', error);
      throw error;
    }
  }

  async verifyWebhook(data, headers) {
    try {
      const signature = headers['x-instapay-signature'];
      if (!signature) {
        return false;
      }

      const expectedSignature = this.generateWebhookSignature(data);
      return signature === expectedSignature;
    } catch (error) {
      logger.error('InstaPay webhook verification error:', error);
      return false;
    }
  }

  async processWebhook(data) {
    try {
      return {
        reference: data.payment_id,
        status: this.mapStatus(data.payment_status),
        amount: data.amount_gross / 100,
        customData: {
          orderId: data.custom_str1,
          paymentId: data.custom_str2
        }
      };
    } catch (error) {
      logger.error('InstaPay webhook processing error:', error);
      throw error;
    }
  }

  async refund(reference, amount) {
    try {
      const payload = {
        payment_id: reference,
        amount: amount * 100, // Convert to cents
        reason: 'Customer requested refund'
      };

      const response = await axios.post(`${this.baseUrl}/payment/refund`, payload, {
        headers: {
          'X-API-Key': this.secretKey,
          'X-Merchant-Id': this.merchantId
        }
      });

      return {
        status: response.data.status === 'success' ? 'success' : 'failed',
        reference: response.data.refund_id,
        amount: response.data.refund_amount / 100
      };
    } catch (error) {
      logger.error('InstaPay refund error:', error);
      throw error;
    }
  }

  generateSignature(data) {
    // InstaPay V2 signature generation
    const signatureString = [
      data.merchant_id,
      data.merchant_ref,
      data.amount,
      data.item_name
    ].join('|');

    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureString)
      .digest('hex');
  }

  generateWebhookSignature(data) {
    // Webhook signature verification
    const signatureString = JSON.stringify(data);
    
    return crypto
      .createHmac('sha256', this.secretKey)
      .update(signatureString)
      .digest('hex');
  }

  mapStatus(instapayStatus) {
    const statusMap = {
      'COMPLETE': 'success',
      'PENDING': 'pending',
      'FAILED': 'failed',
      'CANCELLED': 'cancelled',
      'REFUNDED': 'refunded'
    };

    return statusMap[instapayStatus] || 'unknown';
  }

  // Generate payment button HTML for frontend
  generatePaymentButton(paymentUrl, amount) {
    return `
      <form action="${paymentUrl}" method="POST">
        <button type="submit" class="instapay-button">
          Pay R${amount} with InstaPay
        </button>
      </form>
    `;
  }

  // Validate configuration
  validateConfig() {
    if (!this.merchantId || !this.secretKey) {
      throw new Error('InstaPay configuration missing');
    }
    return true;
  }
}

module.exports = InstapayProvider;