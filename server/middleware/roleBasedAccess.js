// Role-Based Access Control Middleware
const User = require('../models/User');

// Define proper role hierarchy
const ROLE_HIERARCHY = {
    'buyer': {
        level: 1,
        inherits: [],
        permissions: ['buy_products', 'view_orders', 'write_reviews', 'manage_cart', 'view_profile']
    },
    'seller': {
        level: 2,
        inherits: ['buyer'], // Sellers have all buyer permissions
        permissions: [
            'sell_products', 'manage_products', 'view_sales_analytics', 
            'manage_orders', 'view_seller_dashboard', 'seller_verification'
        ]
    },
    'admin': {
        level: 3,
        inherits: ['seller'], // Admins have all seller + buyer permissions
        permissions: ['*'] // Wildcard means all permissions
    }
};

// Role permissions mapping (for specialized admin roles)
const ROLE_PERMISSIONS = {
    'admin': {
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
    },
    'virtuosa_management': {
        permissions: [
            'seller_applications',
            'view_analytics',
            'user_analytics',
            'transaction_system',
            'strategic_analytics'
        ],
        description: 'Virtuosa Management - High level business oversight'
    }
};

// Specialized admin roles that have restricted access to the admin dashboard
const specializedAdminRoles = ['virtuosa_management', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead'];


// Get user's effective role based on all role fields
const getEffectiveRole = (user) => {
    // Log unexpected role values for debugging
    if (user.role && !['user', 'buyer', 'seller', 'admin', 'CEO', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead', 'virtuosa_management'].includes(user.role)) {
        console.warn('⚠️ Unexpected role value detected:', user.role, 'for user:', user._id);
    }
    
    // Check for specialized admin roles first (preserve identity)
    if (specializedAdminRoles.includes(user.role)) {
        return user.role;
    }

    // Check for super admin (admin/CEO) or isAdmin flag
    if (user.isAdmin === true || user.isAdmin === 'true' || user.role === 'admin' || user.role === 'CEO') {
        return 'admin';
    }
    
    // Check for seller
    if (user.isSeller === true || user.isSeller === 'true' || 
        user.role === 'seller') {
        return 'seller';
    }
    
    // Default to buyer
    return 'buyer';
};

// Get all permissions for a user including inherited ones (recursive)
const getAllPermissions = (role) => {
    // Check for specialized admin roles first
    if (ROLE_PERMISSIONS[role]) {
        return ROLE_PERMISSIONS[role].permissions || [];
    }

    const roleInfo = ROLE_HIERARCHY[role];
    if (!roleInfo) return [];
    
    let allPermissions = [...roleInfo.permissions];
    
    // Add inherited permissions recursively with circular reference detection
    const addInheritedPermissions = (inheritedRoles, visited = new Set()) => {
        for (const inheritedRole of inheritedRoles) {
            // Check for circular reference
            if (visited.has(inheritedRole)) {
                console.warn('⚠️ Circular reference detected in role inheritance:', inheritedRole);
                continue;
            }
            
            const inheritedInfo = ROLE_HIERARCHY[inheritedRole];
            if (inheritedInfo) {
                visited.add(inheritedRole);
                allPermissions.push(...inheritedInfo.permissions);
                
                // Recursively add nested inheritance
                if (inheritedInfo.inherits && inheritedInfo.inherits.length > 0) {
                    addInheritedPermissions(inheritedInfo.inherits, new Set(visited));
                }
            }
        }
    };
    
    addInheritedPermissions(roleInfo.inherits);
    
    return [...new Set(allPermissions)]; // Remove duplicates
};

// Check if user has specific permission
const hasPermission = (user, permission) => {
    const effectiveRole = getEffectiveRole(user);
    const specializedAdminRoles = ['virtuosa_management', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead'];
    
    // For specialized admin lead roles
    if (specializedAdminRoles.includes(effectiveRole)) {
        const rolePermissions = ROLE_PERMISSIONS[effectiveRole]?.permissions || [];
        return rolePermissions.includes('*') || rolePermissions.includes(permission);
    }
    
    // For Super Admins, they have all permissions
    if (effectiveRole === 'admin') {
        return true;
    }
    
    // For hierarchy roles (buyer, seller)
    const allPermissions = getAllPermissions(effectiveRole);
    return allPermissions.includes('*') || allPermissions.includes(permission);
};

// Check if user can access dashboard based on role hierarchy
const canAccessDashboard = (user, dashboardType) => {
    const effectiveRole = getEffectiveRole(user);
    const specializedAdminRoles = ['virtuosa_management', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead'];
    
    switch (dashboardType) {
        case 'buyer':
            // All roles can access buyer dashboard
            return true;
            
        case 'seller':
            // Sellers and any Admin role can access seller dashboard
            return ['seller', 'admin'].includes(effectiveRole) || specializedAdminRoles.includes(effectiveRole);
            
        case 'admin':
            // Only Super Admins and specialized Lead roles can access admin dashboard
            return effectiveRole === 'admin' || specializedAdminRoles.includes(effectiveRole);
            
        default:
            console.warn(`⚠️ Invalid dashboard type requested: ${dashboardType}`);
            return false;
    }
};

// Middleware to check role-based access
const checkRoleAccess = (requiredPermission) => {
    return async (req, res, next) => {
        try {
            // First ensure user is authenticated
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            
            // Validate userId format
            if (!req.user.userId || typeof req.user.userId !== 'string' && typeof req.user.userId !== 'object') {
                return res.status(400).json({ message: 'Invalid user ID format' });
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
            
            // Validate userId format
            if (!req.user.userId || typeof req.user.userId !== 'string' && typeof req.user.userId !== 'object') {
                return res.status(400).json({ message: 'Invalid user ID format' });
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

// Middleware to check dashboard access
const checkDashboardAccess = (dashboardType) => {
    // Validate at middleware creation time
    const validDashboardTypes = ['buyer', 'seller', 'admin'];
    if (!dashboardType || typeof dashboardType !== 'string' || !validDashboardTypes.includes(dashboardType)) {
        throw new Error(`Invalid dashboard type: ${dashboardType}. Must be one of: ${validDashboardTypes.join(', ')}`);
    }
    
    return async (req, res, next) => {
        try {
            if (!req.user || !req.user.userId) {
                return res.status(401).json({ message: 'Authentication required' });
            }
            
            // Validate userId format
            if (!req.user.userId || typeof req.user.userId !== 'string' && typeof req.user.userId !== 'object') {
                return res.status(400).json({ message: 'Invalid user ID format' });
            }
            
            const user = await User.findById(req.user.userId);
            if (!user) {
                return res.status(403).json({ message: 'User not found' });
            }
            
            if (!canAccessDashboard(user, dashboardType)) {
                return res.status(403).json({ 
                    message: `${dashboardType.charAt(0).toUpperCase() + dashboardType.slice(1)} access required`,
                    effectiveRole: getEffectiveRole(user)
                });
            }
            
            // Add role info to request
            req.effectiveRole = getEffectiveRole(user);
            req.userPermissions = getAllPermissions(req.effectiveRole);
            
            next();
        } catch (error) {
            console.error('Dashboard access check error:', error);
            res.status(500).json({ message: 'Server error in dashboard access verification' });
        }
    };
};

// Get user role info for UI
const getUserRoleInfo = async (userId) => {
    try {
        const user = await User.findById(userId);
        if (!user) {
            return null;
        }
    
        const effectiveRole = getEffectiveRole(user);
        const specializedAdminRoles = ['virtuosa_management', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead'];
        
        let allPermissions = [];
        if (specializedAdminRoles.includes(effectiveRole)) {
            allPermissions = ROLE_PERMISSIONS[effectiveRole]?.permissions || [];
        } else if (effectiveRole === 'admin') {
            allPermissions = ['*'];
        } else {
            allPermissions = getAllPermissions(effectiveRole);
        }
        
        // Get display title
        let title = 'User';
        if (effectiveRole === 'admin') {
            title = user.role === 'CEO' ? 'CEO' : 'Admin';
        } else if (specializedAdminRoles.includes(effectiveRole)) {
            title = ROLE_PERMISSIONS[effectiveRole]?.description || 'Team Lead';
        } else if (effectiveRole === 'seller') {
            title = 'Seller';
        } else {
            title = 'Buyer';
        }
    
        return {
            role: user.role,
            effectiveRole,
            permissions: allPermissions,
            title,
            level: specializedAdminRoles.includes(effectiveRole) ? 2.5 : (ROLE_HIERARCHY[effectiveRole]?.level || 1),
            // Legacy fields for backward compatibility
            isBuyer: true,
            isSeller: effectiveRole === 'seller' || effectiveRole === 'admin' || specializedAdminRoles.includes(effectiveRole),
            isAdmin: effectiveRole === 'admin' || specializedAdminRoles.includes(effectiveRole)
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
    
        const effectiveRole = getEffectiveRole(user);
        
        // Check if user is a Super Admin or a specialized lead
        const isSuperAdmin = effectiveRole === 'admin';
        const isSpecializedLead = specializedAdminRoles.includes(effectiveRole);

        if (!isSuperAdmin && !isSpecializedLead) {
            return res.status(403).json({ message: 'Super Admin or Lead access required' });
        }
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error in admin check' });
    }
};

module.exports = {
    ROLE_HIERARCHY,
    ROLE_PERMISSIONS,
    checkRoleAccess,
    checkAnyRoleAccess,
    checkDashboardAccess,
    getUserRoleInfo,
    hasPermission,
    getEffectiveRole,
    canAccessDashboard,
    getAllPermissions,
    isAdmin,
    specializedAdminRoles
};
