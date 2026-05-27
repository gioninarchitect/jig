// Voucher Generation System for Origin by ILCO Farming
const mongoose = require('mongoose');
const QRCode = require('qrcode');
const crypto = require('crypto');

// Voucher Schema
const voucherSchema = new mongoose.Schema({
    code: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    type: {
        type: String,
        enum: ['friend_membership', 'discount', 'product', 'ld_coins'],
        required: true
    },
    value: {
        amount: Number,
        description: String,
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' }
    },
    createdBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User',
        required: true 
    },
    createdFor: {
        email: String,
        name: String
    },
    orderId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'Order' 
    },
    status: {
        type: String,
        enum: ['active', 'redeemed', 'expired', 'cancelled'],
        default: 'active'
    },
    redeemedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
    },
    redeemedAt: Date,
    expiresAt: {
        type: Date,
        default: () => new Date(+new Date() + 90*24*60*60*1000) // 90 days
    },
    metadata: {
        qrCodeUrl: String,
        shareUrl: String,
        message: String
    },
    createdAt: { 
        type: Date, 
        default: Date.now 
    }
});

const Voucher = mongoose.model('Voucher', voucherSchema);

// Generate unique voucher code
function generateVoucherCode(type = 'FRIEND') {
    const prefix = type.toUpperCase();
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = crypto.randomBytes(3).toString('hex').toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}

// Generate stylized voucher HTML
function generateVoucherHTML(voucher, userName) {
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Origin by ILCO Farming - Friend Membership Voucher</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Barlow+Condensed:wght@400;600;700:wght@400;700&display=swap');
        
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            background: #0E0E0E;
            color: #fff;
            font-family: 'Barlow Condensed', sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            padding: 20px;
        }
        
        .voucher-container {
            width: 100%;
            max-width: 600px;
            position: relative;
        }
        
        .voucher {
            background: linear-gradient(135deg, #1a1a1a 0%, #2c2c2c 100%);
            border: 3px solid #dc2626;
            border-radius: 20px;
            overflow: hidden;
            position: relative;
            box-shadow: 0 20px 60px rgba(220, 38, 38, 0.3);
        }
        
        .voucher::before {
            content: '';
            position: absolute;
            top: -50%;
            left: -50%;
            width: 200%;
            height: 200%;
            background: repeating-linear-gradient(
                45deg,
                transparent,
                transparent 10px,
                rgba(220, 38, 38, 0.03) 10px,
                rgba(220, 38, 38, 0.03) 20px
            );
            animation: slide 20s linear infinite;
        }
        
        @keyframes slide {
            0% { transform: translate(0, 0); }
            100% { transform: translate(50px, 50px); }
        }
        
        .header {
            background: #dc2626;
            padding: 30px;
            text-align: center;
            position: relative;
            z-index: 1;
        }
        
        .logo {
            width: 80px;
            height: 80px;
            background: #000;
            border-radius: 50%;
            margin: 0 auto 20px;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 36px;
            font-weight: bold;
            color: #dc2626;
            border: 4px solid #fff;
        }
        
        .brand {
            font-family: 'Bebas Neue', cursive;
            font-size: 48px;
            letter-spacing: 5px;
            text-transform: uppercase;
            text-shadow: 3px 3px 0px #000;
        }
        
        .tagline {
            font-size: 14px;
            letter-spacing: 3px;
            margin-top: 5px;
            opacity: 0.9;
        }
        
        .content {
            padding: 40px 30px;
            position: relative;
            z-index: 1;
            text-align: center;
        }
        
        .voucher-type {
            background: rgba(220, 38, 38, 0.2);
            border: 2px solid #dc2626;
            border-radius: 50px;
            padding: 10px 30px;
            display: inline-block;
            margin-bottom: 30px;
            text-transform: uppercase;
            letter-spacing: 2px;
            font-weight: bold;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { transform: scale(1); }
            50% { transform: scale(1.05); }
        }
        
        .voucher-value {
            font-size: 56px;
            font-family: 'Bebas Neue', cursive;
            color: #dc2626;
            margin: 20px 0;
            text-shadow: 2px 2px 0px #000;
            line-height: 1;
        }
        
        .description {
            font-size: 18px;
            margin: 20px 0;
            opacity: 0.9;
            line-height: 1.6;
        }
        
        .code-section {
            background: #000;
            border-radius: 15px;
            padding: 25px;
            margin: 30px 0;
            border: 2px dashed #dc2626;
        }
        
        .code-label {
            font-size: 12px;
            text-transform: uppercase;
            letter-spacing: 2px;
            opacity: 0.7;
            margin-bottom: 10px;
        }
        
        .code {
            font-family: 'Courier New', monospace;
            font-size: 28px;
            font-weight: bold;
            color: #dc2626;
            letter-spacing: 3px;
            word-break: break-all;
        }
        
        .qr-section {
            margin: 30px 0;
            padding: 20px;
            background: #fff;
            border-radius: 15px;
            display: inline-block;
        }
        
        .qr-code {
            width: 150px;
            height: 150px;
        }
        
        .terms {
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid rgba(255, 255, 255, 0.1);
            font-size: 11px;
            opacity: 0.6;
            line-height: 1.5;
        }
        
        .footer {
            background: rgba(220, 38, 38, 0.1);
            padding: 20px;
            text-align: center;
            position: relative;
            z-index: 1;
        }
        
        .cta-button {
            background: linear-gradient(45deg, #dc2626, #b91c1c);
            color: #fff;
            padding: 15px 40px;
            border: none;
            border-radius: 50px;
            font-size: 18px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 2px;
            cursor: pointer;
            text-decoration: none;
            display: inline-block;
            transition: all 0.3s ease;
            box-shadow: 0 10px 30px rgba(220, 38, 38, 0.3);
        }
        
        .cta-button:hover {
            transform: translateY(-3px);
            box-shadow: 0 15px 40px rgba(220, 38, 38, 0.4);
        }
        
        .gift-from {
            margin: 20px 0;
            padding: 15px;
            background: rgba(220, 38, 38, 0.1);
            border-radius: 10px;
            font-size: 16px;
        }
        
        .gift-from strong {
            color: #dc2626;
            font-size: 20px;
        }
        
        .perforated {
            position: absolute;
            left: 0;
            right: 0;
            height: 2px;
            background: repeating-linear-gradient(
                to right,
                transparent,
                transparent 10px,
                #666 10px,
                #666 20px
            );
        }
    </style>
</head>
<body>
    <div class="voucher-container">
        <div class="voucher">
            <div class="header">
                <div class="logo">OR</div>
                <div class="brand">ORIGIN</div>
                <div class="tagline">BY ILCO FARMING</div>
            </div>
            
            <div class="perforated" style="top: 180px;"></div>
            
            <div class="content">
                <div class="voucher-type">🎁 GIFT VOUCHER</div>
                
                <div class="voucher-value">FREE MEMBERSHIP</div>
                
                <div class="description">
                    This voucher entitles the bearer to a <strong>FREE LIFESTYLE MEMBERSHIP</strong> 
                    at Origin by ILCO Farming. Join the movement and unlock exclusive products,
                    member pricing, and VIP experiences.
                </div>
                
                ${userName ? `
                <div class="gift-from">
                    Gift from <strong>${userName}</strong><br>
                    <span style="opacity: 0.7;">who believes you belong in the lifestyle</span>
                </div>
                ` : ''}
                
                <div class="code-section">
                    <div class="code-label">Redemption Code</div>
                    <div class="code">${voucher.code}</div>
                </div>
                
                <div class="qr-section">
                    <img src="${voucher.metadata.qrCodeUrl}" class="qr-code" alt="QR Code">
                </div>
                
                <div class="terms">
                    Valid for 90 days from issue date • Non-transferable • Single use only<br>
                    Cannot be exchanged for cash • Must be 18+ to redeem<br>
                    Standard Origin T&Cs apply • origin.cleva-ai.co.za
                </div>
            </div>
            
            <div class="footer">
                <a href="https://origin.cleva-ai.co.za/redeem?code=${voucher.code}" class="cta-button">
                    REDEEM NOW
                </a>
            </div>
        </div>
    </div>
</body>
</html>
    `;
}

// Create friend membership voucher
async function createFriendMembershipVoucher(userId, orderId, friendEmail = null, friendName = null) {
    try {
        const code = generateVoucherCode('FRIEND');
        
        // Generate QR code
        const qrCodeDataUrl = await QRCode.toDataURL(
            `https://origin.cleva-ai.co.za/redeem?code=${code}`,
            {
                width: 300,
                margin: 2,
                color: {
                    dark: '#dc2626',
                    light: '#ffffff'
                }
            }
        );
        
        const voucher = new Voucher({
            code,
            type: 'friend_membership',
            value: {
                description: 'Free Lifestyle Membership',
                amount: 300 // Value of membership
            },
            createdBy: userId,
            createdFor: {
                email: friendEmail,
                name: friendName
            },
            orderId,
            metadata: {
                qrCodeUrl: qrCodeDataUrl,
                shareUrl: `https://origin.cleva-ai.co.za/gift/${code}`,
                message: 'Your friend has gifted you an Origin Lifestyle Membership!'
            }
        });
        
        await voucher.save();
        
        return voucher;
    } catch (error) {
        console.error('Error creating voucher:', error);
        throw error;
    }
}

// Redeem voucher
async function redeemVoucher(code, userId) {
    try {
        const voucher = await Voucher.findOne({ 
            code: code.toUpperCase(), 
            status: 'active' 
        });
        
        if (!voucher) {
            throw new Error('Invalid or expired voucher code');
        }
        
        if (voucher.expiresAt < new Date()) {
            voucher.status = 'expired';
            await voucher.save();
            throw new Error('This voucher has expired');
        }
        
        // Process redemption based on type
        if (voucher.type === 'friend_membership') {
            // Grant membership to user
            const User = require('./mongodb-setup').User;
            await User.findByIdAndUpdate(userId, {
                isLifestyleMember: true,
                memberSince: new Date(),
                membershipSource: 'voucher'
            });
            
            // Award bonus points
            const { awardPoints } = require('./loyalty-system');
            await awardPoints(userId, 500, 'bonus', 'Friend membership voucher redeemed');
        }
        
        // Mark voucher as redeemed
        voucher.status = 'redeemed';
        voucher.redeemedBy = userId;
        voucher.redeemedAt = new Date();
        await voucher.save();
        
        return {
            success: true,
            type: voucher.type,
            value: voucher.value,
            message: 'Voucher redeemed successfully!'
        };
    } catch (error) {
        console.error('Error redeeming voucher:', error);
        throw error;
    }
}

// Validate voucher
async function validateVoucher(code) {
    try {
        const voucher = await Voucher.findOne({ 
            code: code.toUpperCase() 
        });
        
        if (!voucher) {
            return { valid: false, message: 'Voucher not found' };
        }
        
        if (voucher.status === 'redeemed') {
            return { valid: false, message: 'Voucher already redeemed' };
        }
        
        if (voucher.status === 'cancelled') {
            return { valid: false, message: 'Voucher has been cancelled' };
        }
        
        if (voucher.expiresAt < new Date()) {
            return { valid: false, message: 'Voucher has expired' };
        }
        
        return {
            valid: true,
            type: voucher.type,
            value: voucher.value,
            expiresAt: voucher.expiresAt
        };
    } catch (error) {
        console.error('Error validating voucher:', error);
        return { valid: false, message: 'Error validating voucher' };
    }
}

module.exports = {
    Voucher,
    generateVoucherCode,
    generateVoucherHTML,
    createFriendMembershipVoucher,
    redeemVoucher,
    validateVoucher
};