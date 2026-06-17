// Payment Controller - Max 200 lines
const paymentService = require('./service');
const { validationResult } = require('express-validator');
const logger = require('../logger');

class PaymentController {
  async initiate(req, res) {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ 
          success: false, 
          errors: errors.array() 
        });
      }

      const result = await paymentService.initiate({
        ...req.body,
        userId: req.user?.id,
        ipAddress: req.ip
      });

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Payment initiation error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Payment initiation failed'
      });
    }
  }

  async verify(req, res) {
    try {
      const { transactionId } = req.params;
      const result = await paymentService.verify(transactionId);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Payment verification error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Payment verification failed'
      });
    }
  }

  async webhook(req, res) {
    try {
      const provider = req.params.provider || 'instapay';
      const result = await paymentService.processWebhook(provider, req.body, req.headers);

      res.status(200).json({ success: true });
    } catch (error) {
      logger.error('Webhook processing error:', error);
      res.status(500).json({ success: false });
    }
  }

  async getStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const payment = await paymentService.getStatus(paymentId);

      if (!payment) {
        return res.status(404).json({
          success: false,
          message: 'Payment not found'
        });
      }

      res.json({
        success: true,
        data: payment
      });
    } catch (error) {
      logger.error('Get payment status error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve payment status'
      });
    }
  }

  async refund(req, res) {
    try {
      const { paymentId } = req.params;
      const { amount, reason } = req.body;

      const result = await paymentService.refund(paymentId, amount, reason, req.user);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Refund error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Refund failed'
      });
    }
  }

  async getTransactions(req, res) {
    try {
      const filters = {
        userId: req.user.id,
        startDate: req.query.startDate,
        endDate: req.query.endDate,
        status: req.query.status
      };

      const transactions = await paymentService.getTransactions(filters);

      res.json({
        success: true,
        data: transactions
      });
    } catch (error) {
      logger.error('Get transactions error:', error);
      res.status(500).json({
        success: false,
        message: 'Failed to retrieve transactions'
      });
    }
  }

  async uploadProofOfPayment(req, res) {
    try {
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      const result = await paymentService.uploadProofOfPayment(
        req.params.orderId,
        req.file,
        req.user
      );

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Proof of payment upload error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Upload failed'
      });
    }
  }

  async approvePayment(req, res) {
    try {
      const { paymentId } = req.params;
      const result = await paymentService.approvePayment(paymentId, req.user);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Payment approval error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Approval failed'
      });
    }
  }

  async rejectPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { reason } = req.body;

      const result = await paymentService.rejectPayment(paymentId, reason, req.user);

      res.json({
        success: true,
        data: result
      });
    } catch (error) {
      logger.error('Payment rejection error:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Rejection failed'
      });
    }
  }
}

module.exports = new PaymentController();