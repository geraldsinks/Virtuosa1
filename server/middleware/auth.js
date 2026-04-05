const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Middleware to authenticate token
const authenticateToken = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ message: 'Access token required' });
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix
        
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = decoded;
        next();
    } catch (error) {
        return res.status(401).json({ message: 'Invalid token' });
    }
};

// Middleware to check user roles
const checkRoleAccess = (requiredRole) => {
    return (req, res, next) => {
        if (!req.user || !req.user.userId) {
            return res.status(401).json({ message: 'Authentication required' });
        }

        // For now, we'll check if user exists and has required role
        // This is a simplified version - you may want to expand this
        User.findById(req.user.userId)
            .then(user => {
                if (!user) {
                    return res.status(401).json({ message: 'User not found' });
                }

                // Check if user has required role or is admin
                const hasAccess = user.isAdmin === true || 
                                user.isAdmin === 'true' || 
                                user.role === 'admin' || 
                                user.role === 'CEO' ||
                                (requiredRole === 'seller' && user.isSeller) ||
                                (requiredRole === 'buyer' && !user.isSeller);

                if (!hasAccess) {
                    return res.status(403).json({ message: 'Insufficient permissions' });
                }

                next();
            })
            .catch(error => {
                console.error('Role check error:', error);
                res.status(500).json({ message: 'Server error' });
            });
    };
};

// Protect middleware (alias for authenticateToken)
const protect = authenticateToken;

module.exports = {
    authenticateToken,
    checkRoleAccess,
    protect,
    // Export common role checkers for convenience
    admin: (req, res, next) => checkRoleAccess('admin')(req, res, next),
    seller: (req, res, next) => checkRoleAccess('seller')(req, res, next),
    buyer: (req, res, next) => checkRoleAccess('buyer')(req, res, next)
};
