/**
 * JIG Craft Cannabis - Email Service
 *
 * Order notification emails sent to admin for manual processing.
 * Reuses the SMTP transporter from auth.ts.
 */

import { transporter } from './auth';
import type { Order, Client } from '../world-model/types';

const ADMIN_EMAIL = () => process.env.ADMIN_EMAILS?.split(',')[0]?.trim() || 'admin@cleva-ai.co.za';
const FROM = () => `"JIG Craft Cannabis" <${process.env.SMTP_USER || 'otp@cleva-ai.co.za'}>`;

/**
 * Send new order notification to admin.
 * Non-blocking — logs errors but does not throw.
 */
export async function sendOrderNotification(order: Order, client: Client): Promise<void> {
  const adminEmail = ADMIN_EMAIL();

  const itemRows = order.items
    .map(
      (item) =>
        `<tr>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${item.sku}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee;">${item.name}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">R${item.unitPrice.toFixed(2)}</td>
          <td style="padding: 8px 12px; border-bottom: 1px solid #eee; text-align: right;">R${item.totalPrice.toFixed(2)}</td>
        </tr>`,
    )
    .join('');

  const itemsPlain = order.items
    .map((item) => `  ${item.sku} | ${item.name} | Qty: ${item.quantity} | R${item.unitPrice.toFixed(2)} ea | R${item.totalPrice.toFixed(2)}`)
    .join('\n');

  const deliveryAddr = `${order.deliveryAddress.street}, ${order.deliveryAddress.city}, ${order.deliveryAddress.province} ${order.deliveryAddress.postalCode}`;

  try {
    await transporter.sendMail({
      from: FROM(),
      to: adminEmail,
      subject: `New Order ${order.id} — ${client.companyName} — R${order.total.toFixed(2)}`,
      text: [
        `NEW ORDER RECEIVED`,
        `==================`,
        ``,
        `Order ID:    ${order.id}`,
        `PO Number:   ${order.poNumber || 'Pending'}`,
        `Date:        ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}`,
        ``,
        `CLIENT`,
        `------`,
        `Company:     ${client.companyName}`,
        `Contact:     ${client.contactPerson}`,
        `Email:       ${client.email}`,
        `Phone:       ${client.phone}`,
        `Tier:        ${client.tier.charAt(0).toUpperCase() + client.tier.slice(1)}`,
        `Payment:     ${client.paymentTerms.toUpperCase()}`,
        ``,
        `ITEMS`,
        `-----`,
        itemsPlain,
        ``,
        `Subtotal:    R${order.subtotal.toFixed(2)}`,
        `VAT (15%):   R${order.vatAmount.toFixed(2)}`,
        `TOTAL:       R${order.total.toFixed(2)}`,
        ``,
        `DELIVERY`,
        `--------`,
        `Address:     ${deliveryAddr}`,
        order.deliveryNotes ? `Notes:       ${order.deliveryNotes}` : '',
        ``,
        `---`,
        `To process this order, log in to the JIG admin panel.`,
      ]
        .filter(Boolean)
        .join('\n'),
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 640px; margin: 0 auto; padding: 24px; color: #333;">
          <div style="background: #1a1a2e; padding: 20px 24px; border-radius: 8px 8px 0 0;">
            <h1 style="color: #c8a951; margin: 0; font-size: 20px;">New Order Received</h1>
            <p style="color: #aaa; margin: 4px 0 0; font-size: 14px;">${order.id} &mdash; ${new Date().toLocaleString('en-ZA', { timeZone: 'Africa/Johannesburg' })}</p>
          </div>

          <div style="background: #fff; border: 1px solid #e5e5e5; border-top: none; padding: 24px; border-radius: 0 0 8px 8px;">

            <table style="width: 100%; margin-bottom: 20px; font-size: 14px;">
              <tr>
                <td style="padding: 4px 0; color: #888; width: 120px;">Company</td>
                <td style="padding: 4px 0; font-weight: bold;">${client.companyName}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #888;">Contact</td>
                <td style="padding: 4px 0;">${client.contactPerson} &mdash; ${client.email}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #888;">Phone</td>
                <td style="padding: 4px 0;">${client.phone}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #888;">Tier</td>
                <td style="padding: 4px 0;">
                  <span style="background: #1a5c2e; color: #fff; padding: 2px 8px; border-radius: 4px; font-size: 12px; text-transform: uppercase;">
                    ${client.tier}
                  </span>
                </td>
              </tr>
              <tr>
                <td style="padding: 4px 0; color: #888;">Payment Terms</td>
                <td style="padding: 4px 0;">${client.paymentTerms.toUpperCase()}</td>
              </tr>
            </table>

            <h3 style="color: #1a1a2e; border-bottom: 2px solid #c8a951; padding-bottom: 8px; margin-top: 24px;">Order Items</h3>
            <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 16px;">
              <thead>
                <tr style="background: #f8f8f8;">
                  <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #ddd;">SKU</th>
                  <th style="padding: 8px 12px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                  <th style="padding: 8px 12px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                  <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #ddd;">Unit Price</th>
                  <th style="padding: 8px 12px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
                </tr>
              </thead>
              <tbody>
                ${itemRows}
              </tbody>
            </table>

            <table style="width: 100%; font-size: 14px; margin-bottom: 24px;">
              <tr>
                <td style="text-align: right; padding: 4px 12px; color: #888;">Subtotal</td>
                <td style="text-align: right; padding: 4px 12px; width: 120px;">R${order.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td style="text-align: right; padding: 4px 12px; color: #888;">VAT (15%)</td>
                <td style="text-align: right; padding: 4px 12px;">R${order.vatAmount.toFixed(2)}</td>
              </tr>
              <tr style="font-weight: bold; font-size: 16px;">
                <td style="text-align: right; padding: 8px 12px; border-top: 2px solid #1a1a2e;">Total</td>
                <td style="text-align: right; padding: 8px 12px; border-top: 2px solid #1a1a2e; color: #c8a951;">R${order.total.toFixed(2)}</td>
              </tr>
            </table>

            <h3 style="color: #1a1a2e; border-bottom: 2px solid #c8a951; padding-bottom: 8px;">Delivery</h3>
            <p style="font-size: 14px; margin: 8px 0;">${deliveryAddr}</p>
            ${order.deliveryNotes ? `<p style="font-size: 13px; color: #888; margin: 4px 0;">Notes: ${order.deliveryNotes}</p>` : ''}

            <div style="margin-top: 24px; padding: 12px 16px; background: #f0f7f0; border-radius: 6px; font-size: 13px; color: #1a5c2e;">
              Log in to the <strong>JIG Admin Panel</strong> to confirm this order and generate the invoice.
            </div>
          </div>

          <p style="color: #aaa; font-size: 11px; text-align: center; margin-top: 16px;">
            JIG Craft Cannabis &mdash; Wholesale Platform
          </p>
        </div>
      `,
    });

    console.log(`[EMAIL] Order notification sent for ${order.id} to ${adminEmail}`);
  } catch (err) {
    console.error(`[EMAIL] Failed to send order notification for ${order.id}:`, (err as Error).message);
  }
}
