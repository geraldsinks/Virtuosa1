// Role-Based Access Control Middleware
const User = require('../models/User');

// Role permissions mapping
const ROLE_PERMISSIONS = {
    'admin': {
        // Admin - has access to everything
        permissions: ['*'], // Wildcard means all permissions
        description: 'Admin - Full system access'
    },
    'marketing_lead': {
        permissions: [
            'mass_messaging',
            'asset_library',
            'marketing_management',
            'about_page_editing',
            'view_analytics'
        ],
        description: 'Marketing and Communications Lead'
    },
    'support_lead': {
        permissions: [
            'account_deletion',
            'disputes',
            'contact_support',
            'live_chat',
            'view_user_data'
        ],
        description: 'Support and Customer Care Lead'
    },
    'products_lead': {
        permissions: [
            'maintenance_mode',
            'mass_messaging',
            'maintenance_reports',
            'ui_queries',
            'ux_queries',
            'maintenance_section'
        ],
        description: 'Products Lead'
    },
    'transaction_safety_lead': {
        permissions: [
            'transaction_system',
            'disputes',
            'view_transaction_data',
            'transaction_reports'
        ],
        description: 'Transaction and Safety Lead'
    },
    'strategy_growth_lead': {
        permissions: [
            'user_analytics',
            'strategic_analytics',
            'analytics_reports',
            'growth_metrics'
        ],
        description: 'Strategy and Growth Lead'
    }
};

// Normalize role from user fields: admin and CEO are unified for permissions
const normalizeRole = (userRole, isAdminFlag) => {
    if (isAdminFlag === true || isAdminFlag === 'true') {
        return 'admin';
    }

    if (!userRole) {
        return 'user';
    }

    const normalized = userRole.toString().trim();

    if (normalized.toLowerCase() === 'ceo') {
        return 'admin';
    }

    if (normalized.toLowerCase() === 'admin') {
        return 'admin';
    }

    if (ROLE_PERMISSIONS[normalized]) {
        return normalized;
    }

    if (ROLE_PERMISSIONS[normalized.toLowerCase()]) {
        return normalized.toLowerCase();
    }

    return 'user';
};

// Helper function to check if user has specific permission
const hasPermission = (user, permission) => {
    const userRole = normalizeRole(user.role, user.isAdmin);

    // If user doesn't have a role in our mapping, deny access
    if (!ROLE_PERMISSIONS[userRole]) {
        return false;
    }

    const rolePermissions = ROLE_PERMISSIONS[userRole].permissions;

    // Wildcard access (for admin)
    if (rolePermissions.includes('*')) {
        return true;
    }

    // Check specific permission
    return rolePermissions.includes(permission);
};

// Middleware to check role-based access
const checkRoleAccess = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // First ensure user is authenticated
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            
            // Get user from database
            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(403).json({ message: 'User not found' });
            }
            
            // Check if user has the required permission
            if (!hasPermission(user, requiredPermission)) {
                console.log(`Access denied for user ${user.email}. Required permission: ${requiredPermission}`);
                return res.status(403).json({ 
                    message: 'Insufficient permissions',
                    required: requiredPermission,
                    userRole: user.role || 'user'
                });
            }
            
            // Add user role info to request for use in routes
            req.userRole = user.role || 'user';
            req.userPermissions = ROLE_PERMISSIONS[user.role]?.permissions || [];
            
            next();
        } catch (error) {
            console.error('Role access check error:', error);
            res.status(500).json({ message: 'Server error in role verification' });
        }
    };
};

// Middleware to check if user has any of the specified permissions
const checkAnyRoleAccess = (permissions) => {
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            
            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(403).json({ message: 'User not found' });
            }
            
            // Check if user has any of the required permissions
            const hasAnyPermission = permissions.some(permission => hasPermission(user, permission));
            
            if (!hasAnyPermission) {
                console.log(`Access denied for user ${user.email}. Required one of: ${permissions.join(', ')}`);
                return res.status(403).json({ 
                    message: 'Insufficient permissions',
                    required: permissions,
                    userRole: user.role || 'user'
                });
            }
            
            req.userRole = user.role || 'user';
            req.userPermissions = ROLE_PERMISSIONS[user.role]?.permissions || [];
            
            next();
        } catch (error) {
            console.error('Role access check error:', error);
            res.status(500).json({ message: 'Server error in role verification' });
        }
    };
};

// Get user permissions and role info
const getUserRoleInfo = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }

        const normalizedRole = normalizeRole(user.role, user.isAdmin);
        const roleInfo = ROLE_PERMISSIONS[normalizedRole];

        // If user had CEO role set, surface it as a title for UI display
        const title = (user.role && user.role.toString().trim().toUpperCase() === 'CEO')
            ? 'CEO'
            : (normalizedRole === 'admin' ? 'Admin' : roleInfo?.description || 'User');

        return {
            role: normalizedRole,
            permissions: roleInfo?.permissions || [],
            description: roleInfo?.description || 'No role assigned',
            title
        };
    } catch (error) {
        console.error('Error getting user role info:', error);
        return null;
    }
};

// Legacy admin middleware for backward compatibility
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(403).json({ message: 'User not found' });

        const normalizedRole = normalizeRole(user.role, user.isAdmin);
        const adminCheck = normalizedRole === 'admin' ||
            user.role === 'CEO' ||
            user.isAdmin === true ||
            user.isAdmin === 'true';

        if (!adminCheck) return res.status(403).json({ message: 'Admin access required' });
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error in admin check' });
    }
};

module.exports = {
    ROLE_PERMISSIONS,
    checkRoleAccess,
    checkAnyRoleAccess,
    getUserRoleInfo,
    hasPermission,
    isAdmin
};
