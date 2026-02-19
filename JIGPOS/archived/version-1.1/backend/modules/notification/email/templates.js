/**
 * Email Templates
 * HTML templates for transactional emails
 */

module.exports = {
  /**
   * Welcome email for new users
   */
  welcome: (data) => ({
    subject: 'Welcome to CBD Wellness 24!',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2D5016;">Welcome to CBD Wellness 24!</h1>
        <p>Hello ${data.name},</p>
        <p>Thank you for joining our wellness community. We're excited to have you!</p>
        <p>Your account has been successfully created.</p>
        <p>Best regards,<br>CBD Wellness 24 Team</p>
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
        <h1 style="color: #2D5016;">Order Confirmed!</h1>
        <p>Hello ${data.customerName},</p>
        <p>Your order <strong>${data.orderNumber}</strong> has been confirmed.</p>
        <p><strong>Total:</strong> R${data.total.toFixed(2)}</p>
        <p>Thank you for shopping with us!</p>
        <p>Best regards,<br>CBD Wellness 24 Team</p>
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
        <h1 style="color: #2D5016;">Password Reset</h1>
        <p>Hello ${data.name},</p>
        <p>You requested a password reset. Click the link below to reset your password:</p>
        <p><a href="${data.resetLink}" style="color: #2D5016;">Reset Password</a></p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>CBD Wellness 24 Team</p>
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
        <h1 style="color: #2D5016;">Subscription Activated!</h1>
        <p>Hello ${data.userName},</p>
        <p>Your subscription to <strong>${data.moduleName}</strong> has been activated.</p>
        <p><strong>Price:</strong> R${data.price.toFixed(2)}/month</p>
        <p><strong>Trial ends:</strong> ${data.trialEnd}</p>
        <p>Enjoy your new features!</p>
        <p>Best regards,<br>CBD Wellness 24 Team</p>
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
        <h1 style="color: #2D5016;">Payment Received</h1>
        <p>Hello ${data.customerName},</p>
        <p>We have received your payment of <strong>R${data.amount.toFixed(2)}</strong>.</p>
        <p><strong>Order:</strong> ${data.orderNumber}</p>
        <p>Thank you!</p>
        <p>Best regards,<br>CBD Wellness 24 Team</p>
      </div>
    `
  }),

  /**
   * Generic notification email
   */
  notification: (data) => ({
    subject: data.subject || 'Notification from CBD Wellness 24',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h1 style="color: #2D5016;">${data.title || 'Notification'}</h1>
        <p>${data.message}</p>
        <p>Best regards,<br>CBD Wellness 24 Team</p>
      </div>
    `
  })
};
