// Stock Transfers Controller - Inter-branch stock distribution
const mongoose = require('mongoose');
const InterBranchTransfer = require('../modules/database/models/InterBranchTransfer');
const Branch = require('../modules/database/models/Branch');
const BranchInventory = require('../modules/database/models/BranchInventory');
const Product = require('../modules/database/models/Product');

// GET / - List transfers with filters, transforms response
async function getAll(req, res) {
    try {
        const { status, toBranch, fromBranch, limit = 50 } = req.query;
        const query = {};

        if (status) {
            const statuses = status.split(',');
            query.status = { $in: statuses };
        }
        if (toBranch) query.toBranchId = toBranch;
        if (fromBranch) query.fromBranchId = fromBranch;

        const transfers = await InterBranchTransfer.find(query)
            .populate('fromBranchId', 'name branchCode')
            .populate('toBranchId', 'name branchCode')
            .populate('createdBy', 'firstName lastName')
            .populate('items.productId', 'name sku')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        // Transform for frontend
        const transformedTransfers = transfers.map(t => ({
            _id: t._id,
            transferNumber: t.transferNumber,
            status: t.status,
            type: t.type,
            priority: t.priority,
            fromBranch: t.fromBranchId,
            toBranch: t.toBranchId,
            items: t.items.map(item => ({
                product: item.productId,
                name: item.name || item.productId?.name,
                quantity: item.quantity,
                quantityReceived: item.quantityReceived
            })),
            createdBy: t.createdBy,
            createdAt: t.createdAt,
            dispatchedAt: t.dispatchedAt,
            receivedAt: t.receivedAt
        }));

        res.json({ success: true, transfers: transformedTransfers });
    } catch (error) {
        console.error('Error fetching transfers:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch transfers' });
    }
}

// POST / - Create new transfer with HQ as source, generates transfer number
async function create(req, res) {
    try {
        const { toBranch, items, notes, priority, type } = req.body;

        if (!toBranch || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Branch and items are required' });
        }

        // Get HQ/main branch as source (or user's branch)
        const hqBranch = await Branch.findOne({ branchCode: 'ORM' }); // Potchefstroom HQ
        if (!hqBranch) {
            return res.status(400).json({ success: false, message: 'Source branch not found' });
        }

        // Verify destination branch
        const destBranch = await Branch.findById(toBranch);
        if (!destBranch) {
            return res.status(400).json({ success: false, message: 'Destination branch not found' });
        }

        // Build items array with product details
        const transferItems = [];
        for (const item of items) {
            const product = await Product.findById(item.product);
            if (product) {
                transferItems.push({
                    productId: product._id,
                    name: product.name,
                    sku: product.sku,
                    quantity: item.quantity,
                    unitCost: product.costPrice || 0
                });
            }
        }

        if (transferItems.length === 0) {
            return res.status(400).json({ success: false, message: 'No valid products found' });
        }

        // Generate transfer number
        const date = new Date();
        const year = date.getFullYear();
        const count = await InterBranchTransfer.countDocuments({
            createdAt: { $gte: new Date(year, 0, 1) }
        });
        const transferNumber = `TRF-${year}-${String(count + 1).padStart(6, '0')}`;

        const transfer = new InterBranchTransfer({
            transferNumber,
            fromBranchId: hqBranch._id,
            toBranchId: toBranch,
            type: type || 'stock_transfer',
            priority: priority || 'normal',
            items: transferItems,
            requestNotes: notes,
            createdBy: req.user.id,
            status: 'approved' // Auto-approve for dispatch staff
        });

        await transfer.save();

        res.json({
            success: true,
            message: 'Transfer created successfully',
            transfer: {
                _id: transfer._id,
                transferNumber: transfer.transferNumber,
                status: transfer.status
            }
        });
    } catch (error) {
        console.error('Error creating transfer:', error);
        res.status(500).json({ success: false, message: 'Failed to create transfer', error: error.message });
    }
}

// POST /:id/in-transit - Mark as in-transit, deduct source inventory
async function markInTransit(req, res) {
    try {
        const transfer = await InterBranchTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.status !== 'approved' && transfer.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Transfer must be approved first' });
        }

        // Update status
        transfer.status = 'in_transit';
        transfer.dispatchedBy = req.user.id;
        transfer.dispatchedAt = new Date();

        // Deduct from source branch inventory
        if (!transfer.inventoryDeductedFromSource) {
            for (const item of transfer.items) {
                let inventory = await BranchInventory.findOne({
                    branchId: transfer.fromBranchId,
                    productId: item.productId
                });

                if (inventory) {
                    const balanceBefore = inventory.quantity;
                    const newQty = Math.max(0, inventory.quantity - item.quantity);
                    inventory.quantity = newQty;
                    if (!inventory.recentMovements) inventory.recentMovements = [];
                    inventory.recentMovements.push({
                        type: 'transfer_out',
                        quantity: -item.quantity,
                        balanceBefore: balanceBefore,
                        balanceAfter: newQty,
                        reference: transfer.transferNumber,
                        notes: `Transfer to ${transfer.toBranchId}`,
                        performedBy: req.user.id,
                        timestamp: new Date()
                    });
                    await inventory.save();
                }
            }
            transfer.inventoryDeductedFromSource = true;
        }

        await transfer.save();

        res.json({ success: true, message: 'Transfer marked as in transit' });
    } catch (error) {
        console.error('Error updating transfer:', error);
        res.status(500).json({ success: false, message: 'Failed to update transfer', error: error.message });
    }
}

// POST /:id/delivered - Mark as delivered, add to destination inventory
async function markDelivered(req, res) {
    try {
        const transfer = await InterBranchTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.status !== 'in_transit') {
            return res.status(400).json({ success: false, message: 'Transfer must be in transit' });
        }

        // Update status
        transfer.status = 'received';
        transfer.receivedBy = req.user.id;
        transfer.receivedAt = new Date();

        // Update received quantities
        transfer.items.forEach(item => {
            item.quantityReceived = item.quantity;
            item.variance = 0;
        });

        // Add to destination branch inventory
        if (!transfer.inventoryAddedToDestination) {
            for (const item of transfer.items) {
                let inventory = await BranchInventory.findOne({
                    branchId: transfer.toBranchId,
                    productId: item.productId
                });

                if (!inventory) {
                    // Create inventory record if doesn't exist
                    inventory = new BranchInventory({
                        branchId: transfer.toBranchId,
                        productId: item.productId,
                        quantity: 0,
                        lowStockThreshold: 10,
                        recentMovements: []
                    });
                }

                const balanceBefore = inventory.quantity;
                const newQty = inventory.quantity + item.quantity;
                inventory.quantity = newQty;
                if (!inventory.recentMovements) inventory.recentMovements = [];
                inventory.recentMovements.push({
                    type: 'transfer_in',
                    quantity: item.quantity,
                    balanceBefore: balanceBefore,
                    balanceAfter: newQty,
                    reference: transfer.transferNumber,
                    notes: `Transfer from HQ`,
                    performedBy: req.user.id,
                    timestamp: new Date()
                });
                await inventory.save();
            }
            transfer.inventoryAddedToDestination = true;
        }

        await transfer.save();

        res.json({ success: true, message: 'Transfer completed successfully' });
    } catch (error) {
        console.error('Error completing transfer:', error);
        res.status(500).json({ success: false, message: 'Failed to complete transfer', error: error.message });
    }
}

// POST /:id/cancel - Cancel transfer
async function cancel(req, res) {
    try {
        const transfer = await InterBranchTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        if (transfer.status === 'received' || transfer.status === 'in_transit') {
            return res.status(400).json({ success: false, message: 'Cannot cancel transfer in transit or received' });
        }

        transfer.status = 'cancelled';
        transfer.cancelledBy = req.user.id;
        transfer.cancelledAt = new Date();
        transfer.cancellationReason = req.body.reason || 'Cancelled by user';

        await transfer.save();

        res.json({ success: true, message: 'Transfer cancelled' });
    } catch (error) {
        console.error('Error cancelling transfer:', error);
        res.status(500).json({ success: false, message: 'Failed to cancel transfer' });
    }
}

// GET /:id - Get single transfer with full population
async function getById(req, res) {
    try {
        const transfer = await InterBranchTransfer.findById(req.params.id)
            .populate('fromBranchId', 'name branchCode address')
            .populate('toBranchId', 'name branchCode address')
            .populate('createdBy dispatchedBy receivedBy', 'firstName lastName')
            .populate('items.productId', 'name sku images');

        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }

        res.json({ success: true, transfer });
    } catch (error) {
        console.error('Error fetching transfer:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch transfer' });
    }
}

// POST /quick-receive - Direct inventory add without transfer
async function quickReceive(req, res) {
    try {
        const { branchId, items, notes } = req.body;

        if (!branchId || !items || items.length === 0) {
            return res.status(400).json({ success: false, message: 'Branch and items are required' });
        }

        // Verify branch
        const branch = await Branch.findById(branchId);
        if (!branch) {
            return res.status(404).json({ success: false, message: 'Branch not found' });
        }

        const results = [];

        // Add each item to branch inventory
        for (const item of items) {
            let inventory = await BranchInventory.findOne({
                branchId: branchId,
                productId: item.productId
            });

            if (!inventory) {
                inventory = new BranchInventory({
                    branchId: branchId,
                    productId: item.productId,
                    quantity: 0,
                    lowStockThreshold: 10,
                    recentMovements: []
                });
            }

            const balanceBefore = inventory.quantity;
            const newQty = inventory.quantity + parseFloat(item.quantity);
            inventory.quantity = newQty;

            if (!inventory.recentMovements) inventory.recentMovements = [];
            inventory.recentMovements.push({
                type: 'restock',
                quantity: parseFloat(item.quantity),
                balanceBefore: balanceBefore,
                balanceAfter: newQty,
                reference: `QR-${Date.now()}`,
                notes: notes || 'Quick receive',
                performedBy: req.user.id,
                timestamp: new Date()
            });

            await inventory.save();
            results.push({
                productId: item.productId,
                quantityAdded: item.quantity,
                newBalance: newQty
            });
        }

        res.json({
            success: true,
            message: `${results.length} items received successfully`,
            results
        });
    } catch (error) {
        console.error('Quick receive error:', error);
        res.status(500).json({ success: false, message: 'Failed to receive stock', error: error.message });
    }
}

// POST /:id/approve - Owner approves a pending transfer
async function approve(req, res) {
    try {
        const transfer = await InterBranchTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }
        if (transfer.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Only pending transfers can be approved' });
        }
        await transfer.approve(req.user.id, req.body.notes || '');
        res.json({ success: true, message: 'Transfer approved' });
    } catch (error) {
        console.error('Error approving transfer:', error);
        res.status(500).json({ success: false, message: 'Failed to approve transfer' });
    }
}

// POST /:id/reject - Owner rejects a pending transfer
async function reject(req, res) {
    try {
        const transfer = await InterBranchTransfer.findById(req.params.id);
        if (!transfer) {
            return res.status(404).json({ success: false, message: 'Transfer not found' });
        }
        if (transfer.status !== 'pending') {
            return res.status(400).json({ success: false, message: 'Only pending transfers can be rejected' });
        }
        await transfer.reject(req.user.id, req.body.reason || 'Rejected');
        res.json({ success: true, message: 'Transfer rejected' });
    } catch (error) {
        console.error('Error rejecting transfer:', error);
        res.status(500).json({ success: false, message: 'Failed to reject transfer' });
    }
}

module.exports = {
    getAll,
    create,
    markInTransit,
    markDelivered,
    cancel,
    getById,
    quickReceive,
    approve,
    reject
};
