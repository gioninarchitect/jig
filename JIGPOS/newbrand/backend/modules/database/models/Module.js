const mongoose = require('mongoose');

const moduleSchema = new mongoose.Schema({
    moduleId: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    name: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['marketing', 'operations', 'compliance', 'analytics', 'engagement'],
        required: true
    },
    version: {
        type: String,
        required: true,
        default: '1.0.0'
    },
    pricing: {
        type: {
            type: String,
            enum: ['one-time', 'monthly', 'annual', 'free', 'tiered'],
            required: true
        },
        amount: {
            type: Number,
            required: true,
            default: 0
        },
        currency: {
            type: String,
            default: 'ZAR'
        },
        tiers: {
            hq: {
                amount: Number,
                description: String
            },
            branch: {
                amount: Number,
                description: String
            },
            multiLocation: {
                minLocations: Number,
                amount: Number,
                description: String
            }
        }
    },
    features: [{
        name: String,
        description: String,
        icon: String
    }],
    requirements: {
        minimumVersion: String,
        dependencies: [String],
        requiredPermissions: [String]
    },
    status: {
        type: String,
        enum: ['available', 'coming-soon', 'deprecated', 'beta'],
        default: 'available'
    },
    icon: String,
    screenshots: [String],
    documentation: String,
    supportEmail: String,
    vendor: {
        name: String,
        website: String
    },
    metrics: {
        installations: {
            type: Number,
            default: 0
        },
        rating: {
            type: Number,
            default: 0,
            min: 0,
            max: 5
        },
        reviews: {
            type: Number,
            default: 0
        }
    },
    tags: [String]
}, {
    timestamps: true
});

const moduleInstallationSchema = new mongoose.Schema({
    businessId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    moduleId: {
        type: String,
        required: true
    },
    status: {
        type: String,
        enum: ['trial', 'active', 'suspended', 'cancelled', 'pending-payment'],
        default: 'trial'
    },
    subscription: {
        startDate: {
            type: Date,
            required: true,
            default: Date.now
        },
        endDate: Date,
        renewalDate: Date,
        autoRenew: {
            type: Boolean,
            default: true
        },
        paymentStatus: {
            type: String,
            enum: ['paid', 'pending', 'failed', 'cancelled'],
            default: 'pending'
        }
    },
    configuration: {
        type: mongoose.Schema.Types.Mixed,
        default: {}
    },
    usage: {
        lastAccessed: Date,
        totalUsage: {
            type: Number,
            default: 0
        },
        features: [{
            featureName: String,
            usageCount: Number,
            lastUsed: Date
        }]
    },
    payment: {
        method: String,
        transactionIds: [String],
        totalPaid: {
            type: Number,
            default: 0
        },
        lastPaymentDate: Date
    }
}, {
    timestamps: true
});

moduleInstallationSchema.index({ businessId: 1, moduleId: 1 }, { unique: true });

const Module = mongoose.model('Module', moduleSchema);
const ModuleInstallation = mongoose.model('ModuleInstallation', moduleInstallationSchema);

module.exports = { Module, ModuleInstallation };
