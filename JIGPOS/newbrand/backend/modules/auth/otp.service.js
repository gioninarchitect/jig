// OTP Authentication Service
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const config = require('../../config');

class OTPService {
    constructor() {
        this.transporter = this.createTransporter();
        this.otpStore = new Map(); // In production, use Redis
    }

    createTransporter() {
        return nodemailer.createTransport({
            host: config.otp.host,
            port: config.otp.port,
            secure: config.otp.secure,
            auth: {
                user: config.otp.auth.user,
                pass: config.otp.auth.pass
            },
            tls: {
                rejectUnauthorized: false // For self-signed certificates
            }
        });
    }

    // Generate a numeric OTP
    generateOTP(length = 6) {
        const digits = '0123456789';
        let otp = '';
        for (let i = 0; i < length; i++) {
            otp += digits[crypto.randomInt(0, 10)];
        }
        return otp;
    }

    // Store OTP with expiry
    storeOTP(email, otp) {
        const expiryTime = Date.now() + (config.otp.expiryMinutes * 60 * 1000);
        this.otpStore.set(email.toLowerCase(), {
            otp,
            expiryTime,
            attempts: 0
        });
    }

    // Verify OTP
    verifyOTP(email, inputOTP) {
        const stored = this.otpStore.get(email.toLowerCase());

        if (!stored) {
            return { valid: false, error: 'No OTP found. Please request a new one.' };
        }

        if (Date.now() > stored.expiryTime) {
            this.otpStore.delete(email.toLowerCase());
            return { valid: false, error: 'OTP has expired. Please request a new one.' };
        }

        if (stored.attempts >= 3) {
            this.otpStore.delete(email.toLowerCase());
            return { valid: false, error: 'Too many attempts. Please request a new OTP.' };
        }

        if (stored.otp !== inputOTP) {
            stored.attempts++;
            return { valid: false, error: `Invalid OTP. ${3 - stored.attempts} attempts remaining.` };
        }

        // OTP is valid - remove it
        this.otpStore.delete(email.toLowerCase());
        return { valid: true };
    }

    // Get role-specific email template
    getRoleTemplate(role, otp, userName) {
        const brandColors = {
            green: '#7C3AED',
            greenDark: '#6D28D9',
            cream: '#0A0A0A',
            gold: '#D97706'
        };

        const roleConfig = {
            admin: { title: 'Admin Portal', icon: 'shield-alt', color: brandColors.gold },
            owner: { title: 'Owner Dashboard', icon: 'crown', color: brandColors.gold },
            inventory_manager: { title: 'Inventory Management', icon: 'boxes', color: brandColors.green },
            packer: { title: 'Packing Station', icon: 'box', color: brandColors.green },
            dispatch_manager: { title: 'Dispatch Hub', icon: 'truck', color: '#3b82f6' },
            patient: { title: 'Patient Portal', icon: 'user-md', color: '#DC2626' },
            affiliate: { title: 'Affiliate Dashboard', icon: 'handshake', color: brandColors.green },
            influencer: { title: 'Influencer Hub', icon: 'fire', color: '#f97316' },
            user: { title: 'JIG Craft Cannabis', icon: 'cannabis', color: brandColors.green },
            customer: { title: 'JIG Craft Cannabis', icon: 'user', color: brandColors.green }
        };

        const config = roleConfig[role] || roleConfig.user;

        return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Your Login Code - JIG Craft Cannabis</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Inter', Arial, sans-serif; background-color: ${brandColors.cream};">
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color: ${brandColors.cream}; padding: 40px 20px;">
        <tr>
            <td align="center">
                <table width="100%" style="max-width: 500px; background: white; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(0,0,0,0.1);">
                    <!-- Header -->
                    <tr>
                        <td style="background: linear-gradient(135deg, ${brandColors.green} 0%, ${brandColors.greenDark} 100%); padding: 30px; text-align: center; border-bottom: 4px solid ${brandColors.gold};">
                            <img src="https://jig.cleva-ai.co.za/images/logo-removebg-preview.png" alt="JIG Craft Cannabis" style="width: 160px; height: auto;" />
                        </td>
                    </tr>

                    <!-- Body -->
                    <tr>
                        <td style="padding: 40px 30px;">
                            <p style="margin: 0 0 20px; color: ${brandColors.greenDark}; font-size: 16px;">
                                Hello${userName ? ` ${userName}` : ''},
                            </p>
                            <p style="margin: 0 0 30px; color: ${brandColors.greenDark}; font-size: 16px;">
                                Your one-time verification code is:
                            </p>

                            <!-- OTP Box -->
                            <div style="background: ${brandColors.cream}; border: 2px solid ${brandColors.green}; border-radius: 12px; padding: 25px; text-align: center; margin-bottom: 30px;">
                                <span style="font-family: 'Courier New', monospace; font-size: 36px; font-weight: bold; letter-spacing: 8px; color: ${brandColors.green};">
                                    ${otp}
                                </span>
                            </div>

                            <p style="margin: 0 0 10px; color: ${brandColors.greenDark}; font-size: 14px;">
                                <strong>This code expires in 10 minutes.</strong>
                            </p>
                            <p style="margin: 0; color: #666; font-size: 14px;">
                                If you didn't request this code, please ignore this email or contact support.
                            </p>
                        </td>
                    </tr>

                    <!-- Footer -->
                    <tr>
                        <td style="background: ${brandColors.cream}; padding: 20px 30px; text-align: center; border-top: 1px solid rgba(124, 58, 237,0.2);">
                            <p style="margin: 0; color: ${brandColors.greenDark}; font-size: 12px;">
                                JIG Craft Cannabis | Craft Cannabis
                            </p>
                            <p style="margin: 5px 0 0; color: #999; font-size: 11px;">
                                This is an automated message. Please do not reply.
                            </p>
                        </td>
                    </tr>
                </table>
            </td>
        </tr>
    </table>
</body>
</html>`;
    }

    // Send OTP email
    async sendOTP(email, role = 'user', userName = '') {
        const otp = this.generateOTP(config.otp.length);
        this.storeOTP(email, otp);

        const html = this.getRoleTemplate(role, otp, userName);

        const mailOptions = {
            from: `"JIG Craft Cannabis" <${config.otp.from}>`,
            to: email,
            subject: `Your Login Code: ${otp} - JIG Craft Cannabis`,
            html: html,
            text: `Your JIG Craft Cannabis verification code is: ${otp}\n\nThis code expires in 10 minutes.\n\nIf you didn't request this code, please ignore this email.`
        };

        // Always log OTP for dev/debugging (check pm2 logs)
        console.log('========================================');
        console.log(`DEV MODE - OTP CODE: ${otp}`);
        console.log(`For email: ${email}`);
        console.log('========================================');

        try {
            const result = await this.transporter.sendMail(mailOptions);
            console.log(`OTP email sent successfully (MessageID: ${result.messageId})`);
            return { success: true, messageId: result.messageId };
        } catch (error) {
            console.error('OTP email error:', error.message);
            // Don't throw - OTP is stored, user can get code from logs
            return { success: true, emailFailed: true };
        }
    }

    // Verify SMTP connection
    async verifyConnection() {
        try {
            await this.transporter.verify();
            console.log('OTP Email service connected and ready');
            return true;
        } catch (error) {
            console.error('OTP Email service connection failed:', error.message);
            return false;
        }
    }
}

module.exports = new OTPService();
