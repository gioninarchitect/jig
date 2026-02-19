const { ModuleInstallation } = require('../modules/database/models/Module');

/**
 * Middleware to check if a module is installed and active for the current business
 * @param {string} moduleId - The ID of the module to check (e.g., 'retail-store')
 */
function requireModule(moduleId) {
    return async (req, res, next) => {
        try {
            // Get business ID from authenticated user
            const businessId = req.user?.id;

            if (!businessId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required',
                    moduleRequired: moduleId
                });
            }

            // Check if module is installed for this business
            const installation = await ModuleInstallation.findOne({
                businessId,
                moduleId,
                status: { $in: ['trial', 'active'] } // Allow both trial and active
            });

            if (!installation) {
                return res.status(403).json({
                    success: false,
                    error: `Module "${moduleId}" is not installed or activated`,
                    moduleRequired: moduleId,
                    message: 'Please install this module from the Module Marketplace to use this feature',
                    marketplaceUrl: '/admin#modules'
                });
            }

            // Check if trial has expired
            if (installation.status === 'trial' && installation.subscription?.endDate) {
                const now = new Date();
                const trialEnd = new Date(installation.subscription.endDate);

                if (now > trialEnd) {
                    return res.status(403).json({
                        success: false,
                        error: `Trial period for "${moduleId}" has expired`,
                        moduleRequired: moduleId,
                        message: 'Please activate your subscription to continue using this feature',
                        trialExpired: true,
                        expiredAt: trialEnd
                    });
                }
            }

            // Check if subscription payment is pending or failed
            if (installation.subscription?.paymentStatus === 'failed') {
                return res.status(403).json({
                    success: false,
                    error: `Payment failed for "${moduleId}" module`,
                    moduleRequired: moduleId,
                    message: 'Please update your payment method to continue using this feature',
                    paymentRequired: true
                });
            }

            // Module is active - attach installation info to request
            req.moduleInstallation = installation;

            next();

        } catch (error) {
            console.error('Module check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to verify module access',
                details: error.message
            });
        }
    };
}

/**
 * Middleware to check if ANY of the provided modules is installed
 * Useful for features that can work with multiple modules
 * @param {string[]} moduleIds - Array of module IDs
 */
function requireAnyModule(moduleIds) {
    return async (req, res, next) => {
        try {
            const businessId = req.user?.id;

            if (!businessId) {
                return res.status(401).json({
                    success: false,
                    error: 'Authentication required'
                });
            }

            // Check if ANY of the modules is installed
            const installation = await ModuleInstallation.findOne({
                businessId,
                moduleId: { $in: moduleIds },
                status: { $in: ['trial', 'active'] }
            });

            if (!installation) {
                return res.status(403).json({
                    success: false,
                    error: 'No required modules installed',
                    modulesRequired: moduleIds,
                    message: `Please install one of these modules: ${moduleIds.join(', ')}`
                });
            }

            req.moduleInstallation = installation;
            next();

        } catch (error) {
            console.error('Module check error:', error);
            res.status(500).json({
                success: false,
                error: 'Failed to verify module access'
            });
        }
    };
}

/**
 * Optional module check - doesn't block if module not installed,
 * but adds installation info if available
 */
function optionalModule(moduleId) {
    return async (req, res, next) => {
        try {
            const businessId = req.user?.id;

            if (businessId) {
                const installation = await ModuleInstallation.findOne({
                    businessId,
                    moduleId,
                    status: { $in: ['trial', 'active'] }
                });

                if (installation) {
                    req.moduleInstallation = installation;
                    req.hasModule = true;
                } else {
                    req.hasModule = false;
                }
            }

            next();

        } catch (error) {
            // Don't block on error for optional check
            console.error('Optional module check error:', error);
            req.hasModule = false;
            next();
        }
    };
}

module.exports = {
    requireModule,
    requireAnyModule,
    optionalModule
};
