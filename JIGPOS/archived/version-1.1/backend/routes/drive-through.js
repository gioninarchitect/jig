const express = require('express');
const router = express.Router();
const DriveThrough = require('../modules/database/models/DriveThrough');
const Product = require('../modules/database/models/Product');
const { authenticateToken } = require('../middleware/auth');
const websocket = require('../modules/websocket');
const { requireModule } = require('../middleware/moduleCheck');
const { v4: uuidv4 } = require('uuid');

// Note: Module check disabled for testing
// TODO: Re-enable module marketplace check after testing

// Create drive-through order
router.post('/order', authenticateToken, async (req, res) => {
    try {
        const { products, payment, customerInfo } = req.body;

        // Validate products and check inventory
        const productDetails = await Promise.all(
            products.map(async (item) => {
                const product = await Product.findById(item.productId);
                if (!product) {
                    throw new Error(`Product ${item.productId} not found`);
                }

                const stock = product.inventory?.quantity || 0;
                if (stock < item.quantity) {
                    throw new Error(`Insufficient stock for ${product.name}`);
                }

                return {
                    productId: product._id,
                    name: product.name,
                    quantity: item.quantity,
                    price: product.price,
                    requiresSection21: product.section21Required || false
                };
            })
        );

        // Calculate total
        const totalAmount = productDetails.reduce((sum, p) => sum + (p.price * p.quantity), 0);

        // Check if any product requires Section 21
        const requiresSection21 = productDetails.some(p => p.requiresSection21);

        // Get next queue position
        const queuePosition = await DriveThrough.getNextQueuePosition();

        // Validate payment method (only pre-payment allowed)
        const allowedPaymentMethods = ['instapay', 'eft', 'card'];
        if (!allowedPaymentMethods.includes(payment.method)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid payment method. Only InstaPay, EFT, or Card payments are accepted for drive-through orders.'
            });
        }

        // Payment validation based on method
        let paymentStatus;
        let orderStatus;

        if (payment.method === 'eft') {
            // EFT payments require approval by admin/store manager
            if (!payment.reference) {
                return res.status(400).json({
                    success: false,
                    error: 'EFT reference required. Please upload proof of payment.'
                });
            }
            paymentStatus = 'pending_approval';
            orderStatus = 'pending'; // Order stays pending until payment approved
        } else {
            // InstaPay, Card: instant payment confirmation
            if (!payment.reference) {
                return res.status(400).json({
                    success: false,
                    error: 'Payment reference required. Please complete payment before placing order.'
                });
            }
            paymentStatus = 'paid';
            orderStatus = 'in-queue'; // Goes straight to queue
        }

        // Create order
        const order = new DriveThrough({
            orderId: uuidv4(),
            customerId: req.user.id,
            products: productDetails,
            totalAmount,
            payment: {
                method: payment.method,
                status: paymentStatus,
                reference: payment.reference,
                paidAt: paymentStatus === 'paid' ? new Date() : null,
                eftProof: payment.eftProof || null,
                approvalStatus: payment.method === 'eft' ? 'pending' : null
            },
            queue: {
                position: queuePosition,
                addedAt: new Date()
            },
            status: orderStatus,
            compliance: {
                requiresSection21
            },
            customerInfo
        });

        // Calculate ETA
        order.queue.estimatedPickupTime = order.calculateETA();

        await order.save();

        // Decrement inventory (reserve stock)
        await Promise.all(
            products.map(async (item) => {
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { 'inventory.quantity': -item.quantity }
                });
            })
        );

        // Notify staff if EFT payment needs approval
        if (payment.method === 'eft') {
            websocket.notifyNewEFTPayment({
                orderId: order._id,
                orderNumber: order.orderId,
                amount: order.totalAmount,
                customerName: customer.name || customer.email,
                customerEmail: customer.email || '',
                proofUrl: payment.eftProof?.filePath || ''
            });
        }

        res.status(201).json({
            success: true,
            order: {
                orderId: order.orderId,
                queuePosition: order.queue.position,
                estimatedPickupTime: order.queue.estimatedPickupTime,
                totalAmount: order.totalAmount,
                requiresSection21
            }
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(400).json({
            success: false,
            error: error.message
        });
    }
});

// Get queue status
router.get('/queue', async (req, res) => {
    try {
        const queue = await DriveThrough.getActiveQueue();

        const queueData = queue.map(order => ({
            orderId: order.orderId,
            queuePosition: order.queue.position,
            estimatedPickupTime: order.queue.estimatedPickupTime,
            status: order.status,
            customerName: order.customerInfo?.name || order.customerId?.name,
            gps: order.gps || null,
            requiresSection21: order.compliance?.requiresSection21 || false
        }));

        res.json({
            success: true,
            totalOrders: queue.length,
            estimatedWait: queue.length * 5, // 5 min per order
            queue: queueData
        });

    } catch (error) {
        console.error('Get queue error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get specific order status
router.get('/orders/:orderId', authenticateToken, async (req, res) => {
    try {
        const order = await DriveThrough.findOne({
            orderId: req.params.orderId
        }).populate('products.productId', 'name image');

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Check if user owns this order or is staff
        const isStaff = req.user.role === 'admin' || req.user.role === 'staff_manager' || req.user.role === 'staff_assistant';
        if (order.customerId.toString() !== req.user.id && !isStaff) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        res.json({
            success: true,
            order: {
                orderId: order.orderId,
                products: order.products,
                totalAmount: order.totalAmount,
                queuePosition: order.queue.position,
                estimatedPickupTime: order.queue.estimatedPickupTime,
                status: order.status,
                payment: order.payment,
                requiresSection21: order.compliance.requiresSection21,
                section21Verified: order.compliance.verifiedAt ? true : false,
                gps: order.gps,
                createdAt: order.createdAt
            }
        });

    } catch (error) {
        console.error('Get order error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update customer GPS location
router.put('/location', authenticateToken, async (req, res) => {
    try {
        const { orderId, latitude, longitude, accuracy } = req.body;

        const order = await DriveThrough.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Verify ownership
        if (order.customerId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        // Calculate distance to store (Fourways coordinates)
        const storeLocation = { lat: -26.0287, lng: 28.0022 }; // Fourways, JHB
        const distance = calculateDistance(
            latitude, longitude,
            storeLocation.lat, storeLocation.lng
        );

        // GEOFENCE VALIDATION: Only accept GPS updates within 5km radius
        const GEOFENCE_RADIUS_KM = 5;
        if (distance > GEOFENCE_RADIUS_KM) {
            return res.json({
                success: false,
                outsideGeofence: true,
                distanceToStore: distance,
                geofenceRadius: GEOFENCE_RADIUS_KM,
                message: `You are ${distance.toFixed(1)}km away. GPS tracking will activate when you're within ${GEOFENCE_RADIUS_KM}km of the store.`
            });
        }

        // Update GPS location (only if within geofence)
        order.gps = {
            latitude,
            longitude,
            accuracy,
            lastUpdate: new Date()
        };

        await order.save();

        res.json({
            success: true,
            withinGeofence: true,
            gps: order.gps,
            distanceToStore: distance,
            estimatedArrival: calculateETA(distance),
            geofenceRadius: GEOFENCE_RADIUS_KM
        });

    } catch (error) {
        console.error('Update location error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Update order status (staff only)
router.put('/status/:orderId', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status } = req.body;

        // Check if user is staff
        const isStaff = req.user.role === 'admin' || req.user.role === 'staff_manager' || req.user.role === 'staff_assistant';
        if (!isStaff) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized - staff only'
            });
        }

        const order = await DriveThrough.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Validate status
        const validStatuses = ['in-queue', 'preparing', 'ready', 'arrived', 'completed', 'cancelled'];
        if (!validStatuses.includes(status)) {
            return res.status(400).json({
                success: false,
                error: 'Invalid status'
            });
        }

        order.status = status;
        order.addAuditEntry(`status_changed_to_${status}`, req.user.id, `Status updated to ${status} by staff`);

        await order.save();

        res.json({
            success: true,
            message: `Order status updated to ${status}`,
            order: {
                orderId: order.orderId,
                status: order.status
            }
        });

    } catch (error) {
        console.error('Status update error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Notify arrival at pickup window
router.post('/arrival', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.body;

        const order = await DriveThrough.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Verify ownership
        if (order.customerId.toString() !== req.user.id) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        // Update status to arrived
        order.status = 'arrived';
        order.addAuditEntry('customer_arrived', req.user.id, 'Customer checked in at pickup window');

        await order.save();

        // TODO: Notify staff via WebSocket

        res.json({
            success: true,
            message: 'Arrival confirmed',
            laneAssignment: 'Lane 1', // TODO: Implement lane assignment logic
            requiresSection21Verification: order.compliance.requiresSection21
        });

    } catch (error) {
        console.error('Arrival notification error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Complete pickup (staff only)
router.post('/complete', authenticateToken, async (req, res) => {
    try {
        const { orderId, section21Verified, idDocumentScanned } = req.body;

        // Check if user is staff
        const isStaff = req.user.role === 'admin' || req.user.role === 'staff_manager' || req.user.role === 'staff_assistant';
        if (!isStaff) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized - staff only'
            });
        }

        const order = await DriveThrough.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Check Section 21 compliance
        if (order.compliance.requiresSection21) {
            if (!section21Verified || !idDocumentScanned) {
                return res.status(400).json({
                    success: false,
                    error: 'Section 21 verification required - cannot complete handover'
                });
            }

            order.compliance.verifiedAt = new Date();
            order.compliance.verifiedBy = req.user.id;
            order.compliance.idDocumentScanned = true;
            order.addAuditEntry('section21_verified', req.user.id, 'Prescription and ID verified');
        }

        // Mark as completed
        order.status = 'completed';
        order.completedAt = new Date();
        order.addAuditEntry('order_completed', req.user.id, 'Order handed over to customer');

        await order.save();

        res.json({
            success: true,
            message: 'Order completed successfully',
            completedAt: order.completedAt
        });

    } catch (error) {
        console.error('Complete order error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Cancel order
router.post('/cancel', authenticateToken, async (req, res) => {
    try {
        const { orderId, reason } = req.body;

        const order = await DriveThrough.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Verify ownership or staff
        const isStaff = req.user.role === 'admin' || req.user.role === 'staff_manager' || req.user.role === 'staff_assistant';
        if (order.customerId.toString() !== req.user.id && !isStaff) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized'
            });
        }

        // Can't cancel completed orders
        if (order.status === 'completed') {
            return res.status(400).json({
                success: false,
                error: 'Cannot cancel completed order'
            });
        }

        // Return inventory
        await Promise.all(
            order.products.map(async (item) => {
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { 'inventory.quantity': item.quantity }
                });
            })
        );

        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = reason;
        order.addAuditEntry('order_cancelled', req.user.id, `Reason: ${reason}`);

        await order.save();

        res.json({
            success: true,
            message: 'Order cancelled successfully'
        });

    } catch (error) {
        console.error('Cancel order error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get customer's drive-through order history
router.get('/history', authenticateToken, async (req, res) => {
    try {
        const orders = await DriveThrough.find({
            customerId: req.user.id
        })
        .sort({ createdAt: -1 })
        .limit(20)
        .select('orderId totalAmount status createdAt completedAt');

        res.json({
            success: true,
            orders
        });

    } catch (error) {
        console.error('Get history error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Helper function to calculate distance between two GPS coordinates (Haversine formula)
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth's radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const distance = R * c;
    return distance; // in km
}

// Helper function to calculate ETA based on distance
function calculateETA(distanceKm) {
    const avgSpeed = 40; // km/h average speed in Fourways
    const minutes = (distanceKm / avgSpeed) * 60;
    return Math.ceil(minutes);
}

// ============================================================================
// EFT PAYMENT APPROVAL WORKFLOW (Admin/Store Manager Only)
// ============================================================================

// Get pending EFT approvals
router.get('/approvals/pending', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin or store manager
        const isAuthorized = req.user.role === 'admin' || req.user.role === 'staff_manager';
        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized - Admin or Store Manager only'
            });
        }

        const pendingOrders = await DriveThrough.find({
            'payment.method': 'eft',
            'payment.approvalStatus': 'pending',
            status: 'pending'
        })
        .populate('customerId', 'firstName lastName email phone')
        .sort({ createdAt: 1 });

        const approvals = pendingOrders.map(order => ({
            orderId: order.orderId,
            customer: {
                name: `${order.customerId?.firstName} ${order.customerId?.lastName}`,
                email: order.customerId?.email,
                phone: order.customerInfo?.phone || order.customerId?.phone
            },
            totalAmount: order.totalAmount,
            products: order.products.length,
            payment: {
                reference: order.payment.reference,
                eftProof: order.payment.eftProof
            },
            createdAt: order.createdAt
        }));

        res.json({
            success: true,
            pendingCount: approvals.length,
            approvals
        });

    } catch (error) {
        console.error('Get pending approvals error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Approve EFT payment
router.post('/approvals/:orderId/approve', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;

        // Check if user is admin or store manager
        const isAuthorized = req.user.role === 'admin' || req.user.role === 'staff_manager';
        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized - Admin or Store Manager only'
            });
        }

        const order = await DriveThrough.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Validate payment method
        if (order.payment.method !== 'eft') {
            return res.status(400).json({
                success: false,
                error: 'Only EFT payments require approval'
            });
        }

        // Validate current status
        if (order.payment.approvalStatus !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Payment already ${order.payment.approvalStatus}`
            });
        }

        // Approve payment
        order.payment.status = 'paid';
        order.payment.approvalStatus = 'approved';
        order.payment.approvedBy = req.user.id;
        order.payment.approvedAt = new Date();
        order.payment.paidAt = new Date();

        // Move order to queue
        order.status = 'in-queue';

        // Get fresh queue position
        const queuePosition = await DriveThrough.getNextQueuePosition();
        order.queue.position = queuePosition;
        order.queue.estimatedPickupTime = order.calculateETA();

        // Add audit entry
        order.addAuditEntry('eft_payment_approved', req.user.id, `EFT payment approved by ${req.user.role}`);

        await order.save();

        // Send WebSocket notifications
        websocket.notifyPaymentApproved({
            orderId: order._id,
            orderNumber: order.orderId,
            amount: order.totalAmount,
            customerId: order.customerId,
            customerName: order.customerInfo?.name || 'Customer',
            customerEmail: order.customerInfo?.email || ''
        });

        websocket.notifyQueueUpdate({
            orderId: order._id,
            orderNumber: order.orderId,
            customerId: order.customerId,
            customerName: order.customerInfo?.name || 'Customer',
            position: order.queue.position,
            estimatedTime: order.queue.estimatedPickupTime
        });

        res.json({
            success: true,
            message: 'EFT payment approved - order added to queue',
            order: {
                orderId: order.orderId,
                queuePosition: order.queue.position,
                estimatedPickupTime: order.queue.estimatedPickupTime,
                status: order.status
            }
        });

    } catch (error) {
        console.error('Approve EFT error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Reject EFT payment
router.post('/approvals/:orderId/reject', authenticateToken, async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;

        // Check if user is admin or store manager
        const isAuthorized = req.user.role === 'admin' || req.user.role === 'staff_manager';
        if (!isAuthorized) {
            return res.status(403).json({
                success: false,
                error: 'Unauthorized - Admin or Store Manager only'
            });
        }

        const order = await DriveThrough.findOne({ orderId });

        if (!order) {
            return res.status(404).json({
                success: false,
                error: 'Order not found'
            });
        }

        // Validate payment method
        if (order.payment.method !== 'eft') {
            return res.status(400).json({
                success: false,
                error: 'Only EFT payments require approval'
            });
        }

        // Validate current status
        if (order.payment.approvalStatus !== 'pending') {
            return res.status(400).json({
                success: false,
                error: `Payment already ${order.payment.approvalStatus}`
            });
        }

        // Reject payment
        order.payment.status = 'rejected';
        order.payment.approvalStatus = 'rejected';
        order.payment.rejectedBy = req.user.id;
        order.payment.rejectedAt = new Date();
        order.payment.rejectionReason = reason || 'Payment proof invalid';

        // Cancel order
        order.status = 'cancelled';
        order.cancelledAt = new Date();
        order.cancellationReason = `EFT payment rejected: ${reason}`;

        // Return inventory
        await Promise.all(
            order.products.map(async (item) => {
                await Product.findByIdAndUpdate(item.productId, {
                    $inc: { 'inventory.quantity': item.quantity }
                });
            })
        );

        // Add audit entry
        order.addAuditEntry('eft_payment_rejected', req.user.id, `Reason: ${reason}`);

        await order.save();

        // TODO: Trigger WebSocket notification to customer

        res.json({
            success: true,
            message: 'EFT payment rejected - order cancelled',
            reason: order.payment.rejectionReason
        });

    } catch (error) {
        console.error('Reject EFT error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

module.exports = router;
