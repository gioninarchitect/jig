import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

export async function sendPinEmail(email: string, pin: string): Promise<void> {
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';
  const smtpHost = process.env.SMTP_HOST || 'mail.cleva-ai.co.za';
  const smtpPort = parseInt(process.env.SMTP_PORT || '465');

  if (!smtpUser || !smtpPass) {
    console.log(`[Email] SMTP not configured — PIN for ${email}: ${pin}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: smtpPort === 465,
    auth: { user: smtpUser, pass: smtpPass },
  });

  const info = await transporter.sendMail({
    from: `"ILCO Farms" <${smtpUser}>`,
    to: email,
    subject: 'Your ILCO Farms Login PIN',
    text: `Your login PIN is: ${pin}\n\nThis PIN expires in 5 minutes.`,
    html: `<div style="font-family:sans-serif;padding:20px;background:#1A1A2E;color:#F5F5F5;border-radius:12px;">
      <h2 style="color:#0D6B3D;">ILCO Farms</h2>
      <p>Your login PIN is:</p>
      <div style="font-size:32px;font-weight:bold;letter-spacing:8px;color:#0D6B3D;margin:20px 0;">${pin}</div>
      <p style="color:#888;">This PIN expires in 5 minutes.</p>
    </div>`,
  });

  console.log(`[Email] Sent PIN to ${email}`);
}
