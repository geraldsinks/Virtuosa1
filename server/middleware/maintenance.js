const Maintenance = require('../models/Maintenance');
const User = require('../models/User');

// Maintenance middleware to check if site is under maintenance
const checkMaintenance = async (req, res, next) => {
    try {
        // Skip maintenance check for admin users if admin access is allowed
        if (req.user && req.user.userId) {
            const user = await User.findById(req.user.userId);
            if (user && (user.isAdmin || user.role === 'admin' || user.role === 'CEO' || user.email === 'admin@virtuosa.com')) {
                // Admin user - check if admin access is allowed
                const activeMaintenance = await Maintenance.getActive();
                if (activeMaintenance && activeMaintenance.allowAdminAccess) {
                    // Add maintenance info to request for admin awareness
                    req.maintenanceInfo = {
                        isActive: true,
                        maintenance: activeMaintenance.toSummary(),
                        isAdminOverride: true
                    };
                    return next();
                }
            }
        }

        // Check for active maintenance
        const activeMaintenance = await Maintenance.getActive();
        
        if (activeMaintenance) {
            // Check if the requested service is affected
            const requestedService = getServiceFromPath(req.path);
            const isAffected = activeMaintenance.isServiceAffected(requestedService);
            
            if (isAffected) {
                // Return maintenance response
                return res.status(503).json({
                    error: 'Service Under Maintenance',
                    message: activeMaintenance.messageContent?.headline || 'We are currently under maintenance',
                    details: activeMaintenance.messageContent?.body || 'Please try again later',
                    estimatedTime: activeMaintenance.scheduledEndTime,
                    maintenanceId: activeMaintenance._id,
                    isActive: true
                });
            }
        }

        // No active maintenance or service not affected
        next();
    } catch (error) {
        console.error('Maintenance check error:', error);
        // If maintenance check fails, allow request to proceed
        next();
    }
};

// Helper function to determine service from request path
function getServiceFromPath(path) {
    const serviceMapping = {
        '/api/auth': 'user_login',
        '/api/users': 'user_registration',
        '/api/products': 'product_browsing',
        '/api/orders': 'product_purchasing',
        '/api/seller': 'seller_dashboard',
        '/api/messages': 'messaging',
        '/api/notifications': 'notifications',
        '/api/search': 'search',
        '/api/cart': 'cart',
        '/api/checkout': 'checkout',
        '/api/upload': 'file_uploads'
    };

    for (const [pathPrefix, service] of Object.entries(serviceMapping)) {
        if (path.startsWith(pathPrefix)) {
            return service;
        }
    }

    // Default service if no specific mapping found
    return 'general';
}

// Maintenance check for web pages (non-API routes)
const checkMaintenanceForWeb = async (req, res, next) => {
    try {
        // Skip maintenance check for admin pages if admin access is allowed
        if (req.path.startsWith('/admin') || req.path.includes('admin')) {
            if (req.user && req.user.userId) {
                const user = await User.findById(req.user.userId);
                if (user && (user.isAdmin || user.role === 'admin' || user.role === 'CEO' || user.email === 'admin@virtuosa.com')) {
                    const activeMaintenance = await Maintenance.getActive();
                    if (activeMaintenance && activeMaintenance.allowAdminAccess) {
                        req.maintenanceInfo = {
                            isActive: true,
                            maintenance: activeMaintenance.toSummary(),
                            isAdminOverride: true
                        };
                        return next();
                    }
                }
            }
        }

        // Check for active maintenance
        const activeMaintenance = await Maintenance.getActive();
        
        if (activeMaintenance) {
            // For web requests, redirect to maintenance page
            if (req.path !== '/maintenance' && !req.path.startsWith('/api')) {
                return res.redirect('/maintenance');
            }
        }

        next();
    } catch (error) {
        console.error('Web maintenance check error:', error);
        next();
    }
};

// Middleware to automatically activate/deactivate scheduled maintenance
const autoMaintenanceScheduler = async () => {
    try {
        const { toActivate, toDeactivate } = await Maintenance.checkScheduledMaintenance();
        
        // Activate scheduled maintenance
        for (const maintenance of toActivate) {
            await maintenance.activate();
            console.log(`🔧 Maintenance activated: ${maintenance.title}`);
            
            // TODO: Send notifications about maintenance start
            // await sendMaintenanceNotifications(maintenance);
        }
        
        // Deactivate expired maintenance
        for (const maintenance of toDeactivate) {
            await maintenance.deactivate();
            console.log(`✅ Maintenance completed: ${maintenance.title}`);
            
            // TODO: Send notifications about maintenance end
            // await sendMaintenanceCompletionNotifications(maintenance);
        }
    } catch (error) {
        console.error('Auto maintenance scheduler error:', error);
    }
};

// Maintenance status endpoint middleware
const getMaintenanceStatus = async (req, res, next) => {
    try {
        const activeMaintenance = await Maintenance.getActive();
        const upcomingMaintenance = await Maintenance.getUpcoming(7);
        
        req.maintenanceStatus = {
            isActive: !!activeMaintenance,
            activeMaintenance: activeMaintenance ? activeMaintenance.toSummary() : null,
            upcomingMaintenance: upcomingMaintenance.map(m => m.toSummary())
        };
        
        next();
    } catch (error) {
        console.error('Get maintenance status error:', error);
        req.maintenanceStatus = {
            isActive: false,
            activeMaintenance: null,
            upcomingMaintenance: []
        };
        next();
    }
};

// Admin-only maintenance access middleware
const requireMaintenanceAccess = async (req, res, next) => {
    try {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const user = await User.findById(req.user.userId);
        if (!user || (user.email !== 'admin@virtuosa.com' && user.role !== 'admin' && user.role !== 'CEO' && user.isAdmin !== true)) {
            return res.status(403).json({ error: 'Admin access required for maintenance management' });
        }

        next();
    } catch (error) {
        console.error('Maintenance access check error:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
};

module.exports = {
    checkMaintenance,
    checkMaintenanceForWeb,
    autoMaintenanceScheduler,
    getMaintenanceStatus,
    requireMaintenanceAccess
};
