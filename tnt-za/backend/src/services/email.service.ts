import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
import { env } from '../config/env';
dotenv.config();

export async function sendPinEmail(email: string, pin: string, options: { allowWhenDisabled?: boolean } = {}): Promise<void> {
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpHost = process.env.SMTP_HOST || 'mail.cleva-ai.co.za';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');

  if (!env.EMAIL_DELIVERY_ENABLED && !options.allowWhenDisabled) {
    console.log(`[Email] Delivery disabled — suppressed PIN email to ${email}`);
    return;
  }

  if (!smtpUser || !smtpPass) {
    console.log(`[Email] SMTP not configured — suppressed PIN email to ${email}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const baseLoginUrl = process.env.APP_LOGIN_URL || 'https://tntilco.cleva-ai.co.za/login';
  const loginUrl = `${baseLoginUrl}?email=${encodeURIComponent(email)}`;

  const html = buildPinEmailHtml(pin, loginUrl);

  const info = await transporter.sendMail({
    from: `"ILCO Farms" <${smtpUser}>`,
    to: email,
    subject: 'Your ILCO Farms Login PIN',
    text: `Your login PIN is: ${pin}\n\nThis PIN expires in 5 minutes.\n\nLog in to ILCO: ${loginUrl}`,
    html,
  });

  console.log(`[Email] Sent PIN to ${email}`);
}

// Email-client-safe, table-based, inline-styled, system-font-only branded PIN email.
// Origin/ILCO brand: gold #C9A84C on near-black #0A0A0A header, cream #F5F0E8 body.
function buildPinEmailHtml(pin: string, loginUrl: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>Your ILCO Farms Login PIN</title>
</head>
<body style="margin:0;padding:0;background:#0A0A0A;">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#0A0A0A;padding:24px 0;">
<tr><td align="center">
<table role="presentation" width="480" cellpadding="0" cellspacing="0" style="width:480px;max-width:480px;background:#F5F0E8;border-radius:12px;overflow:hidden;border:1px solid #C9A84C;">
  <!-- Header band -->
  <tr>
    <td align="center" style="background:#0A0A0A;padding:28px 24px;">
      <div style="font-family:Georgia,'Times New Roman',serif;font-size:26px;font-weight:bold;letter-spacing:2px;color:#C9A84C;">ILCO FARMS</div>
      <div style="font-family:Arial,Helvetica,sans-serif;font-size:11px;letter-spacing:3px;color:#A89F8C;text-transform:uppercase;margin-top:6px;">Track &amp; Trace</div>
    </td>
  </tr>
  <!-- Body -->
  <tr>
    <td style="padding:32px 32px 8px 32px;font-family:Arial,Helvetica,sans-serif;color:#1A1A1A;">
      <p style="margin:0 0 8px 0;font-size:16px;font-family:Georgia,'Times New Roman',serif;color:#0A0A0A;">Your login PIN</p>
      <p style="margin:0 0 20px 0;font-size:14px;color:#5C5648;line-height:1.5;">Tap the button below to open the login page, then enter this PIN.</p>
    </td>
  </tr>
  <!-- PIN box -->
  <tr>
    <td align="center" style="padding:0 32px 24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0" style="background:#0A0A0A;border-radius:10px;">
        <tr><td align="center" style="padding:18px 36px;font-family:'Courier New',Courier,monospace;font-size:40px;font-weight:bold;letter-spacing:12px;color:#C9A84C;">${pin}</td></tr>
      </table>
    </td>
  </tr>
  <!-- CTA button -->
  <tr>
    <td align="center" style="padding:0 32px 24px 32px;">
      <table role="presentation" cellpadding="0" cellspacing="0">
        <tr>
          <td align="center" style="background:#C9A84C;border-radius:8px;">
            <a href="${loginUrl}" target="_blank" style="display:inline-block;padding:14px 40px;font-family:Arial,Helvetica,sans-serif;font-size:15px;font-weight:bold;color:#0A0A0A;text-decoration:none;letter-spacing:0.5px;">Log in to ILCO</a>
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <!-- Footer -->
  <tr>
    <td style="padding:0 32px 28px 32px;font-family:Arial,Helvetica,sans-serif;">
      <p style="margin:0;font-size:13px;color:#8B6914;">This PIN expires in 5 minutes.</p>
      <p style="margin:14px 0 0 0;font-size:11px;color:#A89F8C;line-height:1.5;">If the button does not work, copy this link into your browser:<br><span style="color:#5C5648;word-break:break-all;">${loginUrl}</span></p>
    </td>
  </tr>
</table>
</td></tr>
</table>
</body>
</html>`;
}
