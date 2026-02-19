const express = require('express');
const router = express.Router();
const { Module, ModuleInstallation } = require('../modules/database/models/Module');
const { authenticateToken, requireRole } = require('../middleware/auth');

// Get all available modules (admin only)
router.get('/', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const modules = await Module.find({ status: { $in: ['available', 'beta'] } })
            .sort({ 'metrics.installations': -1 })
            .lean();

        res.json({
            success: true,
            modules
        });
    } catch (error) {
        console.error('Get modules error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching modules'
        });
    }
});

// Get installed modules for current business
router.get('/installed', authenticateToken, async (req, res) => {
    try {
        const installations = await ModuleInstallation.find({
            businessId: req.user.id
        }).lean();

        // Get module details for each installation
        const moduleIds = installations.map(inst => inst.moduleId);
        const modules = await Module.find({ moduleId: { $in: moduleIds } }).lean();

        const installedModules = installations.map(inst => {
            const module = modules.find(m => m.moduleId === inst.moduleId);
            return {
                ...inst,
                module: module || null
            };
        });

        res.json({
            success: true,
            installations: installedModules
        });
    } catch (error) {
        console.error('Get installed modules error:', error);
        res.status(500).json({
            success: false,
            message: 'Error fetching installed modules'
        });
    }
});

// Install/purchase a module
router.post('/install/:moduleId', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { configuration } = req.body;

        // Check if module exists
        const module = await Module.findOne({ moduleId });
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Module not found'
            });
        }

        // Check if already installed
        const existing = await ModuleInstallation.findOne({
            businessId: req.user.id,
            moduleId
        });

        if (existing) {
            return res.status(400).json({
                success: false,
                message: 'Module already installed'
            });
        }

        // Create installation record
        const installation = new ModuleInstallation({
            businessId: req.user.id,
            moduleId,
            status: module.pricing.type === 'free' ? 'active' : 'trial',
            configuration: configuration || {},
            subscription: {
                startDate: new Date(),
                endDate: module.pricing.type === 'free' ? null : new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), // 14 day trial
                paymentStatus: module.pricing.type === 'free' ? 'paid' : 'pending'
            }
        });

        await installation.save();

        // Update installation count
        await Module.updateOne(
            { moduleId },
            { $inc: { 'metrics.installations': 1 } }
        );

        res.json({
            success: true,
            message: 'Module installed successfully',
            installation
        });
    } catch (error) {
        console.error('Install module error:', error);
        res.status(500).json({
            success: false,
            message: 'Error installing module'
        });
    }
});

// Uninstall a module
router.delete('/uninstall/:moduleId', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { moduleId } = req.params;

        const installation = await ModuleInstallation.findOneAndDelete({
            businessId: req.user.id,
            moduleId
        });

        if (!installation) {
            return res.status(404).json({
                success: false,
                message: 'Module installation not found'
            });
        }

        res.json({
            success: true,
            message: 'Module uninstalled successfully'
        });
    } catch (error) {
        console.error('Uninstall module error:', error);
        res.status(500).json({
            success: false,
            message: 'Error uninstalling module'
        });
    }
});

// Update module configuration
router.put('/configure/:moduleId', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { configuration } = req.body;

        const installation = await ModuleInstallation.findOneAndUpdate(
            {
                businessId: req.user.id,
                moduleId
            },
            {
                $set: { configuration }
            },
            { new: true }
        );

        if (!installation) {
            return res.status(404).json({
                success: false,
                message: 'Module installation not found'
            });
        }

        res.json({
            success: true,
            message: 'Module configuration updated',
            installation
        });
    } catch (error) {
        console.error('Configure module error:', error);
        res.status(500).json({
            success: false,
            message: 'Error updating module configuration'
        });
    }
});

// Activate subscription (after payment)
router.post('/activate/:moduleId', authenticateToken, requireRole(['admin']), async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { transactionId, paymentMethod } = req.body;

        const module = await Module.findOne({ moduleId });
        if (!module) {
            return res.status(404).json({
                success: false,
                message: 'Module not found'
            });
        }

        const installation = await ModuleInstallation.findOne({
            businessId: req.user.id,
            moduleId
        });

        if (!installation) {
            return res.status(404).json({
                success: false,
                message: 'Module installation not found'
            });
        }

        // Calculate renewal date based on pricing type
        let renewalDate = new Date();
        if (module.pricing.type === 'monthly') {
            renewalDate.setMonth(renewalDate.getMonth() + 1);
        } else if (module.pricing.type === 'annual') {
            renewalDate.setFullYear(renewalDate.getFullYear() + 1);
        }

        installation.status = 'active';
        installation.subscription.paymentStatus = 'paid';
        installation.subscription.renewalDate = renewalDate;
        installation.payment.method = paymentMethod;
        installation.payment.transactionIds.push(transactionId);
        installation.payment.totalPaid += module.pricing.amount;
        installation.payment.lastPaymentDate = new Date();

        await installation.save();

        res.json({
            success: true,
            message: 'Module subscription activated',
            installation
        });
    } catch (error) {
        console.error('Activate module error:', error);
        res.status(500).json({
            success: false,
            message: 'Error activating module subscription'
        });
    }
});

// Track module usage
router.post('/track-usage/:moduleId', authenticateToken, async (req, res) => {
    try {
        const { moduleId } = req.params;
        const { featureName } = req.body;

        await ModuleInstallation.updateOne(
            { businessId: req.user.id, moduleId },
            {
                $set: { 'usage.lastAccessed': new Date() },
                $inc: { 'usage.totalUsage': 1 }
            }
        );

        if (featureName) {
            await ModuleInstallation.updateOne(
                {
                    businessId: req.user.id,
                    moduleId,
                    'usage.features.featureName': featureName
                },
                {
                    $inc: { 'usage.features.$.usageCount': 1 },
                    $set: { 'usage.features.$.lastUsed': new Date() }
                }
            );
        }

        res.json({
            success: true,
            message: 'Usage tracked'
        });
    } catch (error) {
        console.error('Track usage error:', error);
        res.status(500).json({
            success: false,
            message: 'Error tracking usage'
        });
    }
});

module.exports = router;
