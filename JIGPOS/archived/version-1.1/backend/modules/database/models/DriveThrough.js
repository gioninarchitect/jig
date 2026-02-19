const mongoose = require('mongoose');

const driveThroughOrderSchema = new mongoose.Schema({
    orderId: {
        type: String,
        required: true,
        unique: true,
        index: true
    },
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    products: [{
        productId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        name: String,
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        price: {
            type: Number,
            required: true
        },
        requiresSection21: {
            type: Boolean,
            default: false
        }
    }],
    totalAmount: {
        type: Number,
        required: true
    },
    payment: {
        method: {
            type: String,
            enum: ['instapay', 'eft', 'cash', 'card'],
            required: true
        },
        status: {
            type: String,
            enum: ['pending', 'pending_approval', 'approved', 'rejected', 'paid', 'failed', 'refunded'],
            default: 'pending'
        },
        reference: String,
        paidAt: Date,
        // EFT approval workflow
        eftProof: {
            fileName: String,
            filePath: String,
            uploadedAt: Date
        },
        approvalStatus: {
            type: String,
            enum: ['pending', 'approved', 'rejected'],
            default: 'pending'
        },
        approvedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        approvedAt: Date,
        rejectionReason: String,
        rejectedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        rejectedAt: Date
    },
    queue: {
        position: {
            type: Number,
            index: true
        },
        addedAt: {
            type: Date,
            default: Date.now
        },
        estimatedPickupTime: Date
    },
    gps: {
        latitude: Number,
        longitude: Number,
        accuracy: Number,
        lastUpdate: Date
    },
    status: {
        type: String,
        enum: ['pending', 'in-queue', 'preparing', 'ready', 'arrived', 'completed', 'cancelled'],
        default: 'pending',
        index: true
    },
    compliance: {
        requiresSection21: {
            type: Boolean,
            default: false
        },
        verifiedAt: Date,
        verifiedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        prescriptionId: String,
        idDocumentScanned: {
            type: Boolean,
            default: false
        },
        auditTrail: [{
            action: String,
            performedBy: {
                type: mongoose.Schema.Types.ObjectId,
                ref: 'User'
            },
            timestamp: {
                type: Date,
                default: Date.now
            },
            details: String
        }]
    },
    customerInfo: {
        name: String,
        phone: String,
        vehicle: {
            make: String,
            model: String,
            color: String,
            licensePlate: String
        }
    },
    staffNotes: String,
    completedAt: Date,
    cancelledAt: Date,
    cancellationReason: String
}, {
    timestamps: true
});

// Indexes for performance
driveThroughOrderSchema.index({ status: 1, 'queue.addedAt': 1 });
driveThroughOrderSchema.index({ customerId: 1, status: 1 });
driveThroughOrderSchema.index({ createdAt: -1 });

// Virtual for checking if order has any Section 21 products
driveThroughOrderSchema.virtual('hasSection21Products').get(function() {
    return this.products.some(p => p.requiresSection21);
});

// Method to calculate ETA based on queue position
driveThroughOrderSchema.methods.calculateETA = function() {
    const avgServiceTime = 5; // minutes per order
    const eta = new Date(Date.now() + (this.queue.position * avgServiceTime * 60000));
    return eta;
};

// Method to add audit trail entry
driveThroughOrderSchema.methods.addAuditEntry = function(action, performedBy, details) {
    this.compliance.auditTrail.push({
        action,
        performedBy,
        details,
        timestamp: new Date()
    });
};

// Static method to get active queue (PAID ORDERS ONLY)
driveThroughOrderSchema.statics.getActiveQueue = function() {
    return this.find({
        status: { $in: ['in-queue', 'preparing', 'ready'] },
        'payment.status': 'paid' // Only show paid orders in queue
    }).sort({ 'queue.addedAt': 1 }).populate('customerId', 'name email phone');
};

// Static method to get next queue position (PAID ORDERS ONLY)
driveThroughOrderSchema.statics.getNextQueuePosition = async function() {
    const lastOrder = await this.findOne({
        status: { $in: ['in-queue', 'preparing', 'ready'] },
        'payment.status': 'paid' // Only count paid orders for queue position
    }).sort({ 'queue.position': -1 });

    return lastOrder ? lastOrder.queue.position + 1 : 1;
};

const DriveThrough = mongoose.model('DriveThrough', driveThroughOrderSchema);

module.exports = DriveThrough;
