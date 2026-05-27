const config = require("../../config");
const logger = require("../logger");
/**
 * WebSocket Module for Real-Time Notifications
 * Handles Socket.IO connections for staff notifications (payment approvals, queue updates, etc.)
 */

const socketIO = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

/**
 * Initialize Socket.IO server
 */
function initializeWebSocket(server) {
    io = socketIO(server, {
        cors: {
            origin: "*", // Configure this based on your frontend domain
            methods: ["GET", "POST"],
            credentials: true
        },
        path: '/socket.io/'
    });

    // Authentication middleware for Socket.IO
    io.use((socket, next) => {
        const token = socket.handshake.auth.token || socket.handshake.query.token;

        if (!token) {
            logger.info('[WebSocket] Connection rejected: No token provided');
            return next(new Error('Authentication error: No token provided'));
        }

        try {
            const decoded = jwt.verify(token, config.auth.jwtSecret);
            socket.userId = decoded.id;
            socket.userEmail = decoded.email;
            socket.userRole = decoded.role;

            console.log(`[WebSocket] User authenticated: ${decoded.email} (${decoded.role})`);
            next();
        } catch (error) {
            logger.info('[WebSocket] Authentication failed:', error.message);
            return next(new Error('Authentication error: Invalid token'));
        }
    });

    // Connection handler
    io.on('connection', (socket) => {
        console.log(`[WebSocket] Client connected: ${socket.userEmail} (${socket.userRole}) - Socket ID: ${socket.id}`);

        // Join role-specific rooms
        if (socket.userRole === 'super_admin' || socket.userRole === 'owner') {
            socket.join('owner-room');
            socket.join('admin-room');
            socket.join('staff-room');
            console.log(`[WebSocket] ${socket.userEmail} joined owner-room, admin-room and staff-room`);
        } else if (socket.userRole === 'admin' || socket.userRole === 'branch_manager') {
            socket.join('admin-room');
            socket.join('staff-room');
            console.log(`[WebSocket] ${socket.userEmail} joined admin-room and staff-room`);
        } else if (socket.userRole === 'branch_assistant') {
            socket.join('staff-room');
            console.log(`[WebSocket] ${socket.userEmail} joined staff-room`);
        }

        // Join cultivation room if user has cultivation role
        if (['farm_manager', 'cultivator', 'compliance_officer'].includes(socket.userRole) ||
            socket.userRole === 'super_admin' || socket.userRole === 'owner') {
            socket.join('cultivation-room');
            console.log(`[WebSocket] ${socket.userEmail} joined cultivation-room`);
        }

        // Join branch room if user has branch context
        if (socket.handshake.query.branchId) {
            socket.join(`branch-${socket.handshake.query.branchId}`);
            console.log(`[WebSocket] ${socket.userEmail} joined branch-${socket.handshake.query.branchId}`);
        }

        // Join user-specific room
        socket.join(`user-${socket.userId}`);

        // Handle ping/pong for connection health
        socket.on('ping', () => {
            socket.emit('pong', { timestamp: Date.now() });
        });

        // Handle disconnection
        socket.on('disconnect', (reason) => {
            console.log(`[WebSocket] Client disconnected: ${socket.userEmail} - Reason: ${reason}`);
        });

        // Handle errors
        socket.on('error', (error) => {
            console.error(`[WebSocket] Socket error for ${socket.userEmail}:`, error);
        });

        // Send welcome message
        socket.emit('connected', {
            message: 'Connected to Origin by ILCO Farming Notification System',
            userId: socket.userId,
            role: socket.userRole,
            timestamp: Date.now()
        });
    });

    logger.info('[WebSocket] Socket.IO server initialized successfully');
    return io;
}

/**
 * Get Socket.IO instance
 */
function getIO() {
    if (!io) {
        throw new Error('Socket.IO not initialized. Call initializeWebSocket first.');
    }
    return io;
}

/**
 * Emit notification to specific user
 */
function notifyUser(userId, event, data) {
    if (!io) {
        console.warn('[WebSocket] Cannot notify user: Socket.IO not initialized');
        return;
    }

    io.to(`user-${userId}`).emit(event, {
        ...data,
        timestamp: Date.now()
    });

    console.log(`[WebSocket] Notification sent to user ${userId}: ${event}`);
}

/**
 * Emit notification to all staff members
 */
function notifyStaff(event, data) {
    if (!io) {
        console.warn('[WebSocket] Cannot notify staff: Socket.IO not initialized');
        return;
    }

    io.to('staff-room').emit(event, {
        ...data,
        timestamp: Date.now()
    });

    console.log(`[WebSocket] Notification sent to all staff: ${event}`);
}

/**
 * Emit notification to all admins
 */
function notifyAdmins(event, data) {
    if (!io) {
        console.warn('[WebSocket] Cannot notify admins: Socket.IO not initialized');
        return;
    }

    io.to('admin-room').emit(event, {
        ...data,
        timestamp: Date.now()
    });

    console.log(`[WebSocket] Notification sent to all admins: ${event}`);
}

/**
 * Emit broadcast notification to all connected clients
 */
function broadcast(event, data) {
    if (!io) {
        console.warn('[WebSocket] Cannot broadcast: Socket.IO not initialized');
        return;
    }

    io.emit(event, {
        ...data,
        timestamp: Date.now()
    });

    console.log(`[WebSocket] Broadcast notification sent: ${event}`);
}

/**
 * Notification helpers for specific events
 */

// EFT Payment Approved
function notifyPaymentApproved(paymentData) {
    notifyStaff('payment:approved', {
        type: 'payment_approved',
        title: 'EFT Payment Approved',
        message: `Payment of R${paymentData.amount.toFixed(2)} approved for order ${paymentData.orderNumber}`,
        orderId: paymentData.orderId,
        orderNumber: paymentData.orderNumber,
        amount: paymentData.amount,
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        priority: 'high'
    });

    // Also notify the specific customer
    if (paymentData.customerId) {
        notifyUser(paymentData.customerId, 'payment:approved', {
            type: 'payment_approved',
            title: 'Payment Approved',
            message: `Your payment of R${paymentData.amount.toFixed(2)} has been approved`,
            orderNumber: paymentData.orderNumber,
            amount: paymentData.amount
        });
    }
}

// EFT Payment Rejected
function notifyPaymentRejected(paymentData) {
    // Notify the specific customer
    if (paymentData.customerId) {
        notifyUser(paymentData.customerId, 'payment:rejected', {
            type: 'payment_rejected',
            title: 'Payment Rejected',
            message: `Your payment of R${paymentData.amount.toFixed(2)} was rejected. Reason: ${paymentData.reason}`,
            orderNumber: paymentData.orderNumber,
            amount: paymentData.amount,
            reason: paymentData.reason,
            priority: 'high'
        });
    }
}

// New EFT Payment Pending Review
function notifyNewEFTPayment(paymentData) {
    notifyStaff('payment:pending', {
        type: 'payment_pending',
        title: 'New EFT Payment Pending',
        message: `New EFT payment of R${paymentData.amount.toFixed(2)} requires review`,
        orderId: paymentData.orderId,
        orderNumber: paymentData.orderNumber,
        amount: paymentData.amount,
        customerName: paymentData.customerName,
        customerEmail: paymentData.customerEmail,
        proofUrl: paymentData.proofUrl,
        priority: 'medium'
    });
}

// Retail Store Queue Updated
function notifyQueueUpdate(queueData) {
    notifyStaff('queue:updated', {
        type: 'queue_updated',
        title: 'Queue Updated',
        message: `Drive-through queue updated. Position: ${queueData.position}`,
        queuePosition: queueData.position,
        orderId: queueData.orderId,
        orderNumber: queueData.orderNumber,
        customerName: queueData.customerName
    });

    // Notify the specific customer
    if (queueData.customerId) {
        notifyUser(queueData.customerId, 'queue:updated', {
            type: 'queue_updated',
            title: 'Queue Position Updated',
            message: `Your order is now #${queueData.position} in the queue`,
            queuePosition: queueData.position,
            estimatedTime: queueData.estimatedTime
        });
    }
}

// Order Ready for Pickup
function notifyOrderReady(orderData) {
    if (orderData.customerId) {
        notifyUser(orderData.customerId, 'order:ready', {
            type: 'order_ready',
            title: 'Order Ready',
            message: 'Your order is ready for pickup!',
            orderNumber: orderData.orderNumber,
            queueNumber: orderData.queueNumber,
            priority: 'high'
        });
    }
}

// Points Awarded
function notifyPointsAwarded(pointsData) {
    if (pointsData.userId) {
        notifyUser(pointsData.userId, 'points:awarded', {
            type: 'points_awarded',
            title: 'Wellness Points Earned',
            message: `You earned ${pointsData.points} wellness points!`,
            points: pointsData.points,
            reason: pointsData.reason,
            newBalance: pointsData.newBalance,
            tier: pointsData.tier
        });
    }
}

// ─── Owner 360 Live Feed ────────────────────────────────────────

/**
 * Emit real-time event to Owner 360 dashboard
 * Events: sale_completed, variance_detected, risk_alert, compliance_block, stock_critical, config_updated
 */
function notifyOwners(event, data) {
    if (!io) {
        console.warn('[WebSocket] Cannot notify owners: Socket.IO not initialized');
        return;
    }

    io.to('owner-room').emit(event, {
        ...data,
        timestamp: Date.now()
    });
}

/**
 * Emit event to a specific branch room
 */
function notifyBranch(branchId, event, data) {
    if (!io) {
        console.warn('[WebSocket] Cannot notify branch: Socket.IO not initialized');
        return;
    }

    io.to(`branch-${branchId}`).emit(event, {
        ...data,
        timestamp: Date.now()
    });
}

/**
 * Emit event to cultivation room
 */
function notifyCultivation(event, data) {
    if (!io) {
        console.warn('[WebSocket] Cannot notify cultivation: Socket.IO not initialized');
        return;
    }
    io.to('cultivation-room').emit(event, {
        ...data,
        timestamp: Date.now()
    });
}

module.exports = {
    initializeWebSocket,
    getIO,
    notifyUser,
    notifyStaff,
    notifyAdmins,
    notifyOwners,
    notifyBranch,
    notifyCultivation,
    broadcast,
    // Event-specific helpers
    notifyPaymentApproved,
    notifyPaymentRejected,
    notifyNewEFTPayment,
    notifyQueueUpdate,
    notifyOrderReady,
    notifyPointsAwarded
};
