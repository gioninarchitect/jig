/**
 * Email Templates
 * HTML templates for transactional emails
 */

module.exports = {
  /**
   * Welcome email for new users
   */
  welcome: (data) => ({
    subject: 'Welcome to De Bud Chef!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3A5F48;">Welcome to De Bud Chef!</h1>
        <p>Hello ${data.name},</p>
        <p>Thank you for joining our wellness community. We're excited to have you!</p>
        <p>Your account has been successfully created.</p>
        <p>Best regards,<br>De Bud Chef Team</p>
      </div>
    `
  }),

  /**
   * Order confirmation email
   */
  orderConfirmation: (data) => ({
    subject: `Order Confirmation - ${data.orderNumber}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3A5F48;">Order Confirmed!</h1>
        <p>Hello ${data.customerName},</p>
        <p>Your order <strong>${data.orderNumber}</strong> has been confirmed.</p>
        <p><strong>Total:</strong> R${data.total.toFixed(2)}</p>
        <p>Thank you for shopping with us!</p>
        <p>Best regards,<br>De Bud Chef Team</p>
      </div>
    `
  }),

  /**
   * Password reset email
   */
  passwordReset: (data) => ({
    subject: 'Password Reset Request',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3A5F48;">Password Reset</h1>
        <p>Hello ${data.name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${data.resetLink}" style="color: #3A5F48;">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>De Bud Chef Team</p>
      </div>
    `
  }),

  /**
   * Module subscription confirmation
   */
  subscriptionConfirmation: (data) => ({
    subject: `Subscription Activated - ${data.moduleName}`,
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3A5F48;">Subscription Activated!</h1>
        <p>Hello ${data.userName},</p>
        <p>Your subscription to <strong>${data.moduleName}</strong> has been activated.</p>
        <p><strong>Price:</strong> R${data.price.toFixed(2)}/month</p>
        <p><strong>Trial ends:</strong> ${data.trialEnd}</p>
        <p>Enjoy your new features!</p>
        <p>Best regards,<br>De Bud Chef Team</p>
      </div>
    `
  }),

  /**
   * Payment received notification
   */
  paymentReceived: (data) => ({
    subject: 'Payment Received',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3A5F48;">Payment Received</h1>
        <p>Hello ${data.customerName},</p>
        <p>We have received your payment of <strong>R${data.amount.toFixed(2)}</strong>.</p>
        <p><strong>Order:</strong> ${data.orderNumber}</p>
        <p>Thank you!</p>
        <p>Best regards,<br>De Bud Chef Team</p>
      </div>
    `
  }),

  /**
   * Generic notification email
   */
  notification: (data) => ({
    subject: data.subject || 'Notification from De Bud Chef',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #3A5F48;">${data.title || 'Notification'}</h1>
        <p>${data.message}</p>
        <p>Best regards,<br>De Bud Chef Team</p>
      </div>
    `
  })
};
