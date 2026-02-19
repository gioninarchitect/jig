/**
 * SMS Service (Stub)
 * For future SMS notifications via Twilio/Clickatell
 */

const config = require('../../../config');
const logger = require('../../logger');

class SMSService {
  constructor() {
    this.enabled = false; // SMS disabled for now
  }

  async send(phoneNumber, message) {
    if (!this.enabled) {
      logger.info(`SMS (disabled): ${phoneNumber} - ${message}`);
      return { success: true, message: 'SMS disabled' };
    }

    // Future implementation: Twilio/Clickatell integration
    logger.info(`SMS sent to ${phoneNumber}: ${message}`);
    return { success: true };
  }
}

module.exports = new SMSService();
