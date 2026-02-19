/**
 * Push Notification Service (Stub)
 * For future push notifications
 */

const logger = require('../../logger');

class PushService {
  constructor() {
    this.enabled = false; // Push notifications disabled for now
  }

  async send(userId, notification) {
    if (!this.enabled) {
      logger.info(`Push (disabled): User ${userId} - ${notification.title}`);
      return { success: true, message: 'Push notifications disabled' };
    }

    // Future implementation: Firebase Cloud Messaging or similar
    logger.info(`Push sent to user ${userId}: ${notification.title}`);
    return { success: true };
  }
}

module.exports = new PushService();
