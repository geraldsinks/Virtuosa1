const dns = require('node:dns');

// Validate and configure DNS servers from environment or use Google DNS as fallback
function validateDnsServers(servers) {
    const validServers = [];
    const ipRegex = /^(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)$/;
    
    try {
        if (!Array.isArray(servers)) {
            console.warn('DNS servers must be an array, using defaults');
            return ['8.8.8.8', '8.8.4.4'];
        }
        
        servers.forEach(server => {
            if (typeof server !== 'string') {
                console.warn('Invalid DNS server type, skipping:', typeof server);
                return;
            }
            
            const trimmed = server.trim();
            if (!trimmed) {
                console.warn('Empty DNS server string, skipping');
                return;
            }
            
            if (ipRegex.test(trimmed)) {
                validServers.push(trimmed);
            } else {
                console.warn('Invalid DNS server IP, skipping:', server);
            }
        });
    } catch (error) {
        console.error('Error validating DNS servers:', error);
        return ['8.8.8.8', '8.8.4.4'];
    }
    
    return validServers.length > 0 ? validServers : ['8.8.8.8', '8.8.4.4'];
}

const dnsServers = process.env.DNS_SERVERS ? 
    validateDnsServers(process.env.DNS_SERVERS.split(',')) : 
    ['8.8.8.8', '8.8.4.4'];

dns.setServers(dnsServers);
if (process.env.NODE_ENV !== 'production') {
    console.log(`DNS servers configured: ${dnsServers.join(', ')}`);
}

const express = require('express');
const compression = require('compression');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const nodemailer = require('nodemailer');
const crypto = require('crypto');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const cloudinary = require('./config/cloudinary');
const CloudinaryStorage = require('multer-storage-cloudinary');
const NotificationService = require('./services/notificationService');
const webpush = require('web-push');
const { checkRoleAccess, checkAnyRoleAccess, getUserRoleInfo, isAdmin, checkDashboardAccess } = require('./middleware/roleBasedAccess');
const User = require('./models/User');
const Product = require('./models/Product');
const Notification = require('./models/Notification');
const SellerApplication = require('./models/SellerApplication');
// AdSlider, CategoryCard, and Promotion models defined inline
require('dotenv').config({ path: path.join(__dirname, 'config/.env') });

// Ensure uploads directories exist on startup
// Check if we're on Render and use persistent disk path
const isRender = process.env.RENDER === 'true';
const basePath = isRender ? '/opt/render/project/src/server' : __dirname;

console.log('🚀 Server starting...');
console.log('📍 Environment:', isRender ? 'Render' : 'Local');
console.log('📁 Base path:', basePath);

const uploadDirs = ['uploads', 'uploads/products', 'uploads/marketing', 'uploads/profiles', 'uploads/messages'];
uploadDirs.forEach(dir => {
    const fullPath = path.join(basePath, dir);
    if (!fs.existsSync(fullPath)) {
        fs.mkdirSync(fullPath, { recursive: true });
        console.log(`Created directory: ${fullPath}`);
    } else {
        console.log(`Directory exists: ${fullPath}`);
    }
});

const app = express();

// Trust proxy for rate limiting (important for deployment on platforms like Render)
app.set('trust proxy', 1);

// Enable gzip compression for all responses
app.use(compression({
  filter: (req, res) => {
    if (req.headers['x-no-compression']) {
      return false;
    }
    return compression.filter(req, res);
  },
  level: 6,
  threshold: 2048,
}));

// Add caching middleware for static API responses
const cacheMiddleware = (maxAge = 300) => {
  return (req, res, next) => {
    // Only cache GET requests
    if (req.method !== 'GET') {
      return next();
    }
    
    // Don't cache authenticated requests
    if (req.headers.authorization) {
      return next();
    }
    
    // Set cache headers
    res.set('Cache-Control', `public, max-age=${maxAge}`);
    res.set('ETag', Date.now().toString());
    
    next();
  };
};

// Clean URL route handler for product details
app.get('/product/:id', (req, res) => {
    // Serve the product-detail.html page for clean URLs
    res.sendFile(path.join(__dirname, '../client/pages/product-detail.html'));
});

// Clean URL route handler for products page
app.get('/products', (req, res) => {
    // Serve the products.html page for clean URLs
    res.sendFile(path.join(__dirname, '../client/pages/products.html'));
});

// Clean URL route handler for products with category
app.get('/products/:category', (req, res) => {
    // Serve the products.html page for clean URLs with category
    res.sendFile(path.join(__dirname, '../client/pages/products.html'));
});

// Apply compression to static assets
app.use(express.static(path.join(__dirname, '../client'), {
  maxAge: process.env.NODE_ENV === 'production' ? '1d' : '0',
  etag: true,
  lastModified: true,
  setHeaders: (res, path) => {
    if (path.endsWith('.html')) {
      res.setHeader('Cache-Control', 'no-cache');
    }
  }
}));

const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["https://virtuosazm.com", "https://api.virtuosazm.com", "https://virtuosa1.vercel.app", "http://localhost:5500", "http://localhost:3000"],
        methods: ["GET", "POST"],
        credentials: true
    }
});

// Initialize notification service
const notificationService = new NotificationService(io);

// Graceful shutdown handlers
const gracefulShutdown = (signal) => {
    console.log(`\n🛑 Received ${signal}. Starting graceful shutdown...`);
    
    // Clean up notification service
    notificationService.destroy();
    
    // Close server
    server.close(() => {
        console.log('✅ Server closed successfully');
        process.exit(0);
    });
    
    // Force shutdown after 10 seconds
    setTimeout(() => {
        console.log('⏰ Forcing shutdown after timeout');
        process.exit(1);
    }, 10000);
};

// Handle shutdown signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGUSR2', () => gracefulShutdown('SIGUSR2')); // For nodemon restarts

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    gracefulShutdown('unhandledRejection');
});

// Configure web-push with VAPID keys - CRITICAL: No fallback keys for security
const vapidPublicKey = process.env.VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (!vapidPublicKey || !vapidPrivateKey) {
    console.error('❌ CRITICAL: VAPID keys not found in environment variables!');
    console.error('Please set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your .env file');
    console.error('Generate keys with: npx web-push generate-vapid-keys');
    process.exit(1);
}

const vapidKeys = {
    publicKey: vapidPublicKey,
    privateKey: vapidPrivateKey
};

webpush.setVapidDetails(
    'mailto:notifications@virtuosazm.com',
    vapidKeys.publicKey,
    vapidKeys.privateKey
);

console.log('🔑 VAPID keys configured for push notifications');
const corsOrigins = ["https://virtuosazm.com", "https://api.virtuosazm.com", "https://virtuosa1.vercel.app", "http://localhost:5500", "http://localhost:3000"];
console.log('🌐 CORS configured for origins:', corsOrigins);
app.use(cors( {
    origin: corsOrigins,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    credentials: true,
    allowedHeaders: ["Content-Type", "Authorization"],
    maxAge: 86400
}));
app.use(express.json());

// Maintenance middleware for API routes
const { checkMaintenance } = require('./middleware/maintenance');
app.use('/api', checkMaintenance);

// Mount Analytics, Support, and Chat Routes
console.log('📊 Mounting analytics routes...');
app.use('/api/analytics', require('./routes/analytics'));
app.use('/api/support', require('./routes/support'));
app.use('/api/chat', require('./routes/chat'));
console.log('📊 Analytics, Support, and Chat routes mounted');

// Serve uploads from the correct directory based on environment
const uploadsPath = path.join(basePath, 'uploads');
console.log('📂 Serving uploads from:', uploadsPath);
app.use('/api/uploads', express.static(uploadsPath));
// Fallback to client uploads for backward compatibility
app.use('/api/client-uploads', express.static(path.join(__dirname, '../client/uploads')));

// Test endpoint
app.get('/api/auth/test', (req, res) => {
    res.json({ message: 'Server is running!', timestamp: new Date() });
});

// Analytics test endpoint
app.get('/api/analytics/test', (req, res) => {
    res.json({ 
        message: 'Analytics routes are working!', 
        timestamp: new Date(),
        routes: ['GET /track', 'POST /track', 'GET /admin/cookie-data']
    });
});

// User role info endpoint
app.get('/api/user/role-info', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Return comprehensive role information matching client expectations
        const effectiveRole = user.isAdmin === true || user.isAdmin === 'true' || 
                            user.role === 'admin' || user.role === 'CEO' ? 'admin' : 
                            user.isSeller === true || user.isSeller === 'true' || user.role === 'seller' ? 'seller' : 'buyer';

        const roleInfo = {
            effectiveRole: effectiveRole,
            title: effectiveRole === 'admin' ? 'Admin' : effectiveRole === 'seller' ? 'Seller' : 'Buyer',
            level: effectiveRole === 'admin' ? 3 : effectiveRole === 'seller' ? 2 : 1,
            isBuyer: true, // All users are buyers at minimum
            isSeller: effectiveRole === 'seller' || effectiveRole === 'admin',
            isAdmin: effectiveRole === 'admin',
            permissions: effectiveRole === 'admin' ? ['*'] : 
                       effectiveRole === 'seller' ? ['buy_products', 'view_orders', 'write_reviews', 'manage_cart', 'view_profile', 
                                                 'sell_products', 'manage_products', 'view_sales_analytics', 'manage_orders', 
                                                 'view_seller_dashboard', 'seller_verification'] : 
                       ['buy_products', 'view_orders', 'write_reviews', 'manage_cart', 'view_profile']
        };

        res.json(roleInfo);
    } catch (error) {
        console.error('Role info error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Configure Multer for product image uploads using Cloudinary
const productStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'virtuosa/products',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1200, height: 1200, crop: 'limit' }]
  }
});

const upload = multer({
  storage: productStorage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only JPEG, JPG, PNG, and WebP images are allowed'));
    }
  }
});

// Create product endpoint
app.post('/api/products', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        console.log('📦 Creating product for user:', req.user.userId);
        
        // Check if user is a seller or admin
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const isSeller = user.isSeller === true || user.isSeller === 'true' || user.isAdmin === true || user.isAdmin === 'true';
        
        if (!isSeller) {
            return res.status(403).json({ message: 'Only sellers can create products' });
        }

        // Extract product data
        const {
            name,
            description,
            price,
            originalPrice,
            category,
            subcategory,
            condition,
            courseCode,
            courseName,
            author,
            isbn,
            location,
            campusLocation,
            pickupAvailable,
            deliveryAvailable,
            listingType,
            inventory,
            inventoryTracking,
            lowStockThreshold
        } = req.body;

        // Validate required fields
        if (!name || !description || !price || !category) {
            return res.status(400).json({ message: 'Missing required fields: name, description, price, category' });
        }

        // Validate campus location
        const productLocation = campusLocation || location;
        if (!productLocation) {
            return res.status(400).json({ message: 'Campus location is required' });
        }

        // Create product object - match Product model schema exactly
        const productData = {
            name: name.trim(),
            description: description.trim(),
            price: parseFloat(price),
            seller: req.user.userId,  // Changed from sellerId to seller (ObjectId)
            sellerName: user.fullName || 'Seller',
            sellerEmail: user.email,  // Now providing required field
            sellerPhone: user.phone || user.phoneNumber || 'Not provided',  // Now providing required field
            category,
            subcategory: subcategory || '',
            condition: condition || 'New',  // Match enum values: 'New', 'Like New', 'Good', 'Fair'
            campusLocation: productLocation,  // Changed from location to campusLocation
            listingType: listingType === 'persistent' ? 'persistent' : 'one_time',  // Match enum
            status: 'Active',  // Match enum: 'Active', 'Sold', 'Reserved', 'Removed', 'Out of Stock'
            createdAt: new Date(),
            updatedAt: new Date()
        };

        // Add optional fields
        if (originalPrice) productData.originalPrice = parseFloat(originalPrice);
        if (courseCode) productData.courseCode = courseCode.trim();
        if (courseName) productData.courseName = courseName.trim();
        if (author) productData.author = author.trim();
        if (isbn) productData.isbn = isbn.trim();

        // Add inventory for persistent listings
        if (listingType === 'persistent') {
            productData.inventory = Math.max(parseInt(inventory) || 1, 1);
            productData.inventoryTracking = inventoryTracking === 'true' || inventoryTracking === true;
            productData.lowStockThreshold = Math.max(parseInt(lowStockThreshold) || 1, 1);
        }

        // Add delivery options
        if (pickupAvailable === 'true' || pickupAvailable === true) {
            if (!productData.deliveryOptions) productData.deliveryOptions = [];
            productData.deliveryOptions.push({ type: 'pickup' });
        }
        if (deliveryAvailable === 'true' || deliveryAvailable === true) {
            if (!productData.deliveryOptions) productData.deliveryOptions = [];
            productData.deliveryOptions.push({ type: 'delivery' });
        }

        // Add images from Cloudinary uploads
        if (req.files && req.files.length > 0) {
            productData.images = req.files.map(file => file.secure_url || file.path);
        }

        // Create and save product
        const product = new Product(productData);
        await product.save();

        console.log('✅ Product created successfully:', product._id);
        
        res.status(201).json({
            message: 'Product created successfully',
            success: true,
            product: product
        });

    } catch (error) {
        console.error('❌ Error creating product:', error);
        res.status(500).json({ 
            message: 'Failed to create product',
            error: error.message 
        });
    }
});

// Debug endpoint to check file existence
app.get('/api/debug/file/:filename', async (req, res) => {
    try {
        const filename = req.params.filename;
        const filePath = path.join(uploadsPath, 'marketing', filename);
        const exists = fs.existsSync(filePath);
        const stats = exists ? fs.statSync(filePath) : null;
        
        res.json({
            filename,
            filePath,
            exists,
            stats: stats ? {
                size: stats.size,
                created: stats.birthtime,
                modified: stats.mtime
            } : null,
            uploadsPath,
            basePath,
            isRender
        });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Health check endpoint for uploads
app.get('/api/health/uploads', (req, res) => {
    try {
        const marketingDir = path.join(uploadsPath, 'marketing');
        const files = fs.existsSync(marketingDir) ? fs.readdirSync(marketingDir) : [];
        
        res.json({
            status: 'ok',
            uploadsPath,
            marketingDir,
            marketingFiles: files.length,
            files: files.slice(0, 10), // Show first 10 files
            isRender,
            basePath
        });
    } catch (error) {
        res.status(500).json({ 
            status: 'error', 
            error: error.message,
            uploadsPath,
            isRender,
            basePath
        });
    }
});

// Helper for unique slugs
function slugify(text) {
    if (!text) return '';
    return text
        .toString()
        .toLowerCase()
        .trim()
        .replace(/\s+/g, '-')           // Replace spaces with -
        .replace(/[^\w\-]+/g, '')       // Remove all non-word chars
        .replace(/\-\-+/g, '-');         // Replace multiple - with single -
}

// Debug endpoint for user stats
app.get('/api/admin/debug/stats', authenticateToken, async (req, res) => {
    try {
        console.log('Debug stats endpoint called by user:', req.user.userId);

        // Test simple user count
        const totalUsers = await User.countDocuments();
        console.log('Total users:', totalUsers);

        // Test aggregation with simpler query
        const buyerCount = await User.countDocuments({ isBuyer: true });
        const sellerCount = await User.countDocuments({ isSeller: true });
        const verifiedSellerCount = await User.countDocuments({ sellerVerified: true });
        const proSellerCount = await User.countDocuments({ isProSeller: true });
        const studentVerifiedCount = await User.countDocuments({ isStudentVerified: true });

        console.log('Counts:', { totalUsers, buyerCount, sellerCount, verifiedSellerCount, proSellerCount, studentVerifiedCount });

        res.json({
            totalUsers,
            totalBuyers: buyerCount,
            totalSellers: sellerCount,
            verifiedSellers: verifiedSellerCount,
            proSellers: proSellerCount,
            studentVerified: studentVerifiedCount
        });
    } catch (error) {
        console.error('Debug stats error:', error);
        res.status(500).json({ error: error.message });
    }
});

// User profile endpoint
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin mass messaging endpoints

// Get user statistics for targeting
app.get('/api/admin/users/stats', authenticateToken, checkRoleAccess('mass_messaging'), async (req, res) => {
    try {
        const stats = await User.aggregate([
            {
                $group: {
                    _id: null,
                    totalUsers: { $sum: 1 },
                    totalBuyers: { $sum: { $cond: ['$isBuyer', 1, 0] } },
                    totalSellers: { $sum: { $cond: ['$isSeller', 1, 0] } },
                    verifiedSellers: { $sum: { $cond: ['$sellerVerified', 1, 0] } },
                    proSellers: { $sum: { $cond: ['$isProSeller', 1, 0] } },
                    studentVerified: { $sum: { $cond: ['$isStudentVerified', 1, 0] } }
                }
            }
        ]);

        // Get recent user activity
        const recentUsers = await User.find()
            .select('fullName email role isBuyer isSeller sellerVerified createdAt')
            .sort({ createdAt: -1 })
            .limit(10);

        res.json({
            stats: stats[0] || { totalUsers: 0, totalBuyers: 0, totalSellers: 0, verifiedSellers: 0, proSellers: 0, studentVerified: 0 },
            recentUsers
        });
    } catch (error) {
        console.error('Get user stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get users by criteria for targeting
app.get('/api/admin/users/target', authenticateToken, async (req, res) => {
    try {
        const {
            userType, // 'all', 'buyers', 'sellers', 'verifiedSellers', 'proSellers'
            verifiedOnly, // boolean
            dateRange, // { start, end }
            limit = 100
        } = req.query;

        let query = {};

        // Build query based on criteria
        switch (userType) {
            case 'buyers':
                query.isBuyer = true;
                break;
            case 'sellers':
                query.isSeller = true;
                break;
            case 'verifiedSellers':
                query.isSeller = true;
                query.sellerVerified = true;
                break;
            case 'proSellers':
                query.isSeller = true;
                query.isProSeller = true;
                break;
        }

        if (verifiedOnly === 'true') {
            query.isStudentVerified = true;
        }

        if (dateRange) {
            const { start, end } = JSON.parse(dateRange);
            query.createdAt = {
                $gte: new Date(start),
                $lte: new Date(end)
            };
        }

        const users = await User.find(query)
            .select('fullName email isBuyer isSeller sellerVerified isProSeller isStudentVerified createdAt')
            .sort({ createdAt: -1 })
            .limit(parseInt(limit));

        const totalCount = await User.countDocuments(query);

        res.json({
            users,
            totalCount,
            criteria: { userType, verifiedOnly, dateRange }
        });
    } catch (error) {
        console.error('Get target users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send mass promotion message
app.post('/api/admin/messages/send-mass', authenticateToken, checkRoleAccess('mass_messaging'), async (req, res) => {
    try {
        const {
            title,
            content,
            targetType, // 'all', 'buyers', 'sellers', 'verifiedSellers', 'proSellers', 'custom'
            customUserIds, // array of user IDs for custom targeting
            verifiedOnly,
            dateRange,
            scheduleTime, // optional - for scheduled sending
        } = req.body;

        const Notification = require('./models/Notification');

        // Build recipient query
        let recipientQuery = {};

        if (targetType === 'custom' && customUserIds && customUserIds.length > 0) {
            recipientQuery._id = { $in: customUserIds };
        } else {
            switch (targetType) {
                case 'buyers':
                    recipientQuery.isBuyer = true;
                    break;
                case 'sellers':
                    recipientQuery.isSeller = true;
                    break;
                case 'verifiedSellers':
                    recipientQuery.isSeller = true;
                    recipientQuery.sellerVerified = true;
                    break;
                case 'proSellers':
                    recipientQuery.isSeller = true;
                    recipientQuery.isProSeller = true;
                    break;
            }

            if (verifiedOnly) {
                recipientQuery.isStudentVerified = true;
            }

            if (dateRange) {
                const { start, end } = dateRange;
                recipientQuery.createdAt = {
                    $gte: new Date(start),
                    $lte: new Date(end)
                };
            }
        }

        // Get all target users
        const targetUsers = await User.find(recipientQuery).select('_id email fullName');

        if (targetUsers.length === 0) {
            return res.status(400).json({ message: 'No users found matching the criteria' });
        }

        console.log(`Sending mass message to ${targetUsers.length} users`);

        // Create notification records for each user
        const notifications = targetUsers.map(user => ({
            recipient: user._id,
            sender: req.user.userId || req.user.id,
            type: 'system',
            title: title || 'System Update',
            message: content,
            priority: 'normal',
            data: {
                actionUrl: '/pages/notifications.html',
                actionText: 'View Message',
                metadata: {
                    isMassMessage: true,
                    massMessageTarget: targetType,
                    scheduledFor: scheduleTime || null
                }
            }
        }));

        const insertedNotifications = await Notification.insertMany(notifications);
        console.log(`✅ Created ${insertedNotifications.length} mass message notifications`);

        res.json({
            success: true,
            messageCount: insertedNotifications.length,
            targetType,
            title,
            scheduledFor: scheduleTime
        });

    } catch (error) {
        console.error('Send mass message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get mass message history
app.get('/api/admin/messages/mass-history', authenticateToken, checkRoleAccess('mass_messaging'), async (req, res) => {
    try {
        const { page = 1, limit = 10 } = req.query;
        const Notification = require('./models/Notification');

        const query = {
            type: 'system',
            'data.metadata.isMassMessage': true,
            sender: req.user.userId
        };

        const massMessages = await Notification.find(query)
            .populate('recipient', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Notification.countDocuments(query);

        res.json({
            messages: massMessages,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get mass message history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Role-Based Admin Dashboard API ---

// Get user role information
app.get('/api/admin/role-info', authenticateToken, async (req, res) => {
    try {
        const roleInfo = await getUserRoleInfo(req.user.userId);
        if (!roleInfo) {
            return res.status(404).json({ message: 'User role not found' });
        }
        res.json(roleInfo);
    } catch (error) {
        console.error('Error getting role info:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Promotions Routes
app.get('/api/marketing/promotions', async (req, res) => {
    try {
        const { status, type } = req.query;
        let query = {};
        if (status) query.status = status;
        if (type) query.promotionType = type;

        const promotions = await Promotion.find(query).sort({ startDate: -1 });
        res.json(promotions);
    } catch (error) {
        res.status(500).json({ message: 'Server error fetching promotions' });
    }
});

app.post('/api/marketing/promotions', authenticateToken, checkRoleAccess('marketing_management'), async (req, res) => {
    try {
        const promoData = req.body;
        promoData.createdBy = req.user.userId;
        const promotion = new Promotion(promoData);
        await promotion.save();
        res.status(201).json(promotion);
    } catch (error) {
        console.error('Create promotion error:', error);
        res.status(500).json({ message: 'Error creating promotion', error: error.message });
    }
});

app.put('/api/marketing/promotions/:id', authenticateToken, checkRoleAccess('marketing_management'), async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!promotion) return res.status(404).json({ message: 'Promotion not found' });
        res.json(promotion);
    } catch (error) {
        res.status(500).json({ message: 'Error updating promotion' });
    }
});

app.delete('/api/marketing/promotions/:id', authenticateToken, checkRoleAccess('marketing_management'), async (req, res) => {
    try {
        await Promotion.findByIdAndDelete(req.params.id);
        res.json({ message: 'Promotion deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting promotion' });
    }
});

// Banners Routes
app.get('/api/marketing/banners', async (req, res) => {
    try {
        const banners = await Banner.find({ isActive: true }).sort({ displayOrder: 1 });
        res.json(banners);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching banners' });
    }
});

app.post('/api/marketing/banners', authenticateToken, isAdmin, async (req, res) => {
    try {
        const banner = new Banner(req.body);
        await banner.save();
        res.status(201).json(banner);
    } catch (error) {
        res.status(500).json({ message: 'Error creating banner' });
    }
});

// Content Enhancements (A+) Routes
app.get('/api/marketing/content-enhancements/:productId', async (req, res) => {
    try {
        const enhancement = await ContentEnhancement.findOne({ productId: req.params.productId });
        res.json(enhancement || { productId: req.params.productId, modules: [] });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching content enhancement' });
    }
});

app.post('/api/marketing/content-enhancements', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { productId } = req.body;
        const enhancement = await ContentEnhancement.findOneAndUpdate(
            { productId },
            req.body,
            { upsert: true, new: true }
        );
        res.json(enhancement);
    } catch (error) {
        res.status(500).json({ message: 'Error saving content enhancement' });
    }
});

// Coupon Clipping Logic (Simulated)
app.post('/api/marketing/coupons/clip', authenticateToken, async (req, res) => {
    try {
        const { couponId } = req.body;
        const promo = await Promotion.findById(couponId);
        if (!promo || promo.promotionType !== 'coupon') {
            return res.status(404).json({ message: 'Valid coupon not found' });
        }

        // In a real app, we'd store this in a UserCoupons collection
        // For now, we'll just acknowledge the "clip" action
        res.json({ success: true, message: 'Coupon clipped to account!' });
    } catch (error) {
        res.status(500).json({ message: 'Error clipping coupon' });
    }
});

// Marketing Stats
app.get('/api/marketing/stats', authenticateToken, isAdmin, async (req, res) => {
    try {
        const totalPromos = await Promotion.countDocuments();
        const activePromos = await Promotion.countDocuments({ status: 'Active' });
        const totalBanners = await Banner.countDocuments();

        // Mocked performance data for Amazon-like recommendations
        res.json({
            stats: {
                totalPromos,
                activePromos,
                totalBanners,
                totalRedemptions: Math.floor(Math.random() * 500),
                conversionsLift: '12.5%'
            },
            recommendations: [
                { type: 'High Performance', text: 'Summer Sale promo has 15% CTR. Consider extending it.' },
                { type: 'Optimization', text: 'Hero Banner #2 has low clicks. Update overlay text?' }
            ]
        });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching marketing stats' });
    }
});

// MongoDB connection
mongoose.set('strictQuery', false);

// Cleaned up options - removed deprecated useNewUrlParser and useUnifiedTopology
const mongoOptions = {
    serverSelectionTimeoutMS: 10000,
    socketTimeoutMS: 45000,
    retryWrites: true,
    maxPoolSize: 10,
    family: 4  // Use IPv4, skip IPv6 resolution
};

mongoose.connect(process.env.MONGO_URI, mongoOptions)
    .then(() => console.log('Connected to MongoDB successfully!'))
    .catch(err => {
        console.error('MongoDB connection error on startup:', err.message);
        console.log('Will retry connection automatically...');
    });

// Handle connection events
mongoose.connection.on('disconnected', () => {
    console.warn('MongoDB disconnected. Attempting to reconnect...');
});

mongoose.connection.on('connected', () => {
    console.log('MongoDB connected successfully!');
});

// Eager listener - bind port immediately for Render health check
const PORT = process.env.PORT || 5000;
server.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Port ${PORT} opened. Answered Render's health check.`);
    console.log(`Virtuosa backend is listening on port ${PORT}`);
    
    // Now start the heavy stuff in the background
    console.log('🔄 Heavy initialization tasks running in background...');
    
    // Run migrations in background
    setTimeout(() => {
        migrateExistingMessages();
    }, 1000);
});

// Function to seed initial marketing data
async function seedInitialMarketingData() {
    try {
        // Wait for database connection if not ready
        if (mongoose.connection.readyState !== 1) {
            console.log('Database not connected yet, skipping marketing data seeding');
            return;
        }
        
        // Use existing models instead of redefining them
        const AdSlider = mongoose.model('AdSlider');
        const CategoryCard = mongoose.model('CategoryCard');
        const MarketingAsset = mongoose.model('MarketingAsset');

        // Check if marketing data already exists - quick early exit
        const existingAdSliders = await AdSlider.countDocuments();
        const existingCategoryCards = await CategoryCard.countDocuments();
        const existingMarketingAssets = await MarketingAsset.countDocuments();

        // If all data exists, skip seeding entirely
        if (existingAdSliders > 0 && existingCategoryCards > 0 && existingMarketingAssets > 0) {
            console.log('⏭️ Seeding skipped: Marketing data already exists.');
            return;
        }

        console.log("✅ Marketing data seeding started...");

        if (existingAdSliders === 0) {
            // Seed Ad Sliders
            const adSliders = [
                {
                    title: 'Get 20% Off Electronics!',
                    subtitle: 'Limited time offer on all electronics',
                    backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Electronics+Sale',
                    link: '/pages/products.html?category=Electronics',
                    active: true,
                    displayOrder: 1
                },
                {
                    title: 'Sell Your Old Study Notes',
                    subtitle: 'Turn your notes into cash',
                    backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Study+Notes',
                    link: '/pages/seller.html',
                    active: true,
                    displayOrder: 2
                },
                {
                    title: 'Books for Every Course',
                    subtitle: 'Find textbooks and study materials',
                    backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Books',
                    link: '/pages/products.html?category=Books',
                    active: true,
                    displayOrder: 3
                },
                {
                    title: 'Find Your Perfect Accessories',
                    subtitle: 'Fashion and tech accessories',
                    backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Accessories',
                    link: '/pages/products.html?category=Accessories',
                    active: true,
                    displayOrder: 4
                },
                {
                    title: 'Limited Time Free Shipping!',
                    subtitle: 'On orders over ZMW 100',
                    backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Free+Shipping',
                    link: '/pages/products.html',
                    active: true,
                    displayOrder: 5
                }
            ];
            
            await AdSlider.insertMany(adSliders);
            console.log('🎯 Seeded initial ad sliders');
        }

        if (existingCategoryCards === 0) {
            // Seed Category Cards
            const categoryCards = [
                {
                    name: 'Hot Deals',
                    title: 'Hot Deals',
                    description: 'Limited time offers and discounts',
                    image: 'https://placehold.co/400x240/FF6B6B/FFFFFF?text=Hot+Deals',
                    link: '/pages/products.html?category=Hot Deals',
                    cardType: 'rectangle',
                    active: true,
                    displayOrder: 1
                },
                {
                    name: 'Best Sellers',
                    title: 'Best Sellers',
                    description: 'Most popular items on campus',
                    image: 'https://placehold.co/400x240/4ECDC4/FFFFFF?text=Best+Sellers',
                    link: '/pages/products.html?category=Best Sellers',
                    cardType: 'rectangle',
                    active: true,
                    displayOrder: 2
                },
                {
                    name: "Men's Clothing",
                    title: "Men's Clothing",
                    description: 'Fashion for the modern student',
                    image: 'https://placehold.co/200x180/45B7D1/FFFFFF?text=Men',
                    link: '/pages/products.html?category=Men\'s Clothing',
                    cardType: 'square',
                    active: true,
                    displayOrder: 3
                },
                {
                    name: "Women's Clothing",
                    title: "Women's Clothing",
                    description: 'Trendy styles for campus life',
                    image: 'https://placehold.co/200x180/F7DC6F/FFFFFF?text=Women',
                    link: '/pages/products.html?category=Women\'s Clothing',
                    cardType: 'square',
                    active: true,
                    displayOrder: 4
                },
                {
                    name: 'Shoes',
                    title: 'Shoes',
                    description: 'Footwear for every occasion',
                    image: 'https://placehold.co/200x180/52C41A/FFFFFF?text=Shoes',
                    link: '/pages/products.html?category=Shoes',
                    cardType: 'square',
                    active: true,
                    displayOrder: 5
                },
                {
                    name: 'Accessories',
                    title: 'Accessories',
                    description: 'Complete your look',
                    image: 'https://placehold.co/200x180/9B59B6/FFFFFF?text=Accessories',
                    link: '/pages/products.html?category=Accessories',
                    cardType: 'square',
                    active: true,
                    displayOrder: 6
                }
            ];
            
            await CategoryCard.insertMany(categoryCards);
            console.log('🎯 Seeded initial category cards');
        }

        if (existingMarketingAssets === 0) {
            // Seed Sample Marketing Assets
            const marketingAssets = [
                {
                    filename: 'electronics-banner.jpg',
                    url: 'https://placehold.co/600x400/0A1128/FFFFFF?text=Electronics+Banner',
                    mimetype: 'image/jpeg',
                    size: 245760,
                    tags: ['electronics', 'banner', 'promotion'],
                    usageCount: 0,
                    isOptimized: true
                },
                {
                    filename: 'books-promo.png',
                    url: 'https://placehold.co/600x400/4ECDC4/FFFFFF?text=Books+Promo',
                    mimetype: 'image/png',
                    size: 184320,
                    tags: ['books', 'education', 'promotion'],
                    usageCount: 0,
                    isOptimized: true
                }
            ];
            
            await MarketingAsset.insertMany(marketingAssets);
            console.log('🎯 Seeded initial marketing assets');
        }

        console.log('✅ Marketing data seeding completed');

        // Seed About Page if empty
        const aboutCount = await AboutPage.countDocuments();
        if (aboutCount === 0) {
            await AboutPage.create({
                title: 'About Virtuosa',
                mission: 'Connecting campus communities through safe and reliable student-to-student commerce.',
                vision: 'The leading digital marketplace for tertiary institutions in Zambia.',
                story: 'Founded in 2024, Virtuosa was built specifically for the Zambian student experience. We understand the challenges of finding textbooks, electronics, and essentials on campus, and we are here to bridge that gap.',
                team: [
                    { name: 'Gerald Sinkamba', role: 'Founder', bio: 'Visionary leader driving the Virtuosa mission.', image: 'https://placehold.co/400x400/0A1128/FFFFFF?text=Founder' },
                    { name: 'Lead 1', role: 'Products and operations lead', bio: 'Managing the platform flow and user experience.', image: 'https://placehold.co/400x400/0A1128/FFFFFF?text=Product+Lead' },
                    { name: 'Lead 2', role: 'Marketing and communications lead', bio: 'Spreading the Virtuosa word across campuses.', image: 'https://placehold.co/400x400/0A1128/FFFFFF?text=Marketing+Lead' },
                    { name: 'Lead 3', role: 'University success lead', bio: 'Ensuring every campus community thrives.', image: 'https://placehold.co/400x400/0A1128/FFFFFF?text=Success+Lead' },
                    { name: 'Lead 4', role: 'Organizer and Secretary', bio: 'Keeping the Virtuosa engine running smoothly.', image: 'https://placehold.co/400x400/0A1128/FFFFFF?text=Admin+Lead' }
                ]
            });
            console.log('🎯 Seeded default About Page content');
        }
    } catch (error) {
        console.error('❌ Error seeding marketing data:', error);
    }
}

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
});

// Configure Multer for marketing assets using Cloudinary
const marketingStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'virtuosa/marketing',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'mp4', 'webm'],
    resource_type: 'auto'
  }
});

const marketingUpload = multer({
  storage: marketingStorage,
  limits: { fileSize: 15 * 1024 * 1024 }, // 15MB for marketing assets
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp|mp4|webm/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images and videos are allowed for marketing assets'));
  }
});

// Configure Multer for profile picture uploads using Cloudinary
const profilePictureStorage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: 'virtuosa/profiles',
    allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'webp'],
    transformation: [{ width: 500, height: 500, crop: 'limit' }]
  }
});

const profilePictureUpload = multer({
  storage: profilePictureStorage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB for profile pictures
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|gif|webp/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    if (extname && mimetype) {
      return cb(null, true);
    }
    cb(new Error('Only images (jpeg, jpg, png, gif, webp) are allowed for profile pictures'));
  }
});

// Marketing Asset Upload Endpoint
app.post('/api/marketing/assets/upload', authenticateToken, checkRoleAccess('asset_library'), marketingUpload.single('asset'), async (req, res) => {
    try {
        console.log('🔍 Marketing upload request received');
        console.log('🔍 File:', req.file);
        console.log('🔍 Body:', req.body);
        console.log('🔍 Cloudinary config check:', {
            cloud_name: !!process.env.CLOUDINARY_CLOUD_NAME,
            api_key: !!process.env.CLOUDINARY_API_KEY,
            api_secret: !!process.env.CLOUDINARY_API_SECRET
        });

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        console.log('✅ File uploaded to Cloudinary:', req.file.path);

        const asset = new MarketingAsset({
            filename: req.file.originalname,
            url: req.file.path, // Cloudinary URL
            mimetype: req.file.mimetype,
            size: req.file.size,
            uploadedBy: req.user.userId,
            tags: req.body.tags ? JSON.parse(req.body.tags) : []
        });

        await asset.save();
        console.log('✅ Asset saved to database with Cloudinary URL:', asset);
        res.status(201).json(asset);
    } catch (error) {
        console.error('❌ Asset upload error:', error);
        console.error('❌ Error stack:', error.stack);
        
        // Send more detailed error info
        res.status(500).json({ 
            message: 'Upload failed', 
            error: error.message,
            stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        });
    }
});

app.get('/api/marketing/assets', authenticateToken, checkRoleAccess('asset_library'), async (req, res) => {
    try {
        const assets = await MarketingAsset.find().sort({ createdAt: -1 });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assets' });
    }
});

app.delete('/api/marketing/assets/:id', authenticateToken, checkRoleAccess('asset_library'), async (req, res) => {
    try {
        const asset = await MarketingAsset.findById(req.params.id);
        if (!asset) return res.status(404).json({ message: 'Asset not found' });

        // Remove file from disk
        const filePath = path.join(__dirname, '../client', asset.url);
        if (fs.existsSync(filePath)) {
            fs.unlinkSync(filePath);
        }

        await MarketingAsset.findByIdAndDelete(req.params.id);
        res.json({ message: 'Asset deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting asset' });
    }
});

// Public Marketing Data Routes (for homepage)
app.get('/api/public/marketing/ad-sliders', async (req, res) => {
    try {
        const adSliders = await AdSlider.find({ active: true }).sort({ displayOrder: 1, createdAt: -1 });
        res.json(adSliders);
    } catch (error) {
        console.error('Error fetching public ad sliders:', error);
        res.status(500).json({ message: 'Error fetching ad sliders' });
    }
});

app.get('/api/public/marketing/category-cards', async (req, res) => {
    try {
        const categoryCards = await CategoryCard.find({ active: true }).sort({ displayOrder: 1, createdAt: -1 });
        res.json(categoryCards);
    } catch (error) {
        console.error('Error fetching public category cards:', error);
        res.status(500).json({ message: 'Error fetching category cards' });
    }
});

// Ad Sliders Management Routes (Admin only)
app.get('/api/marketing/ad-sliders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const adSliders = await AdSlider.find().sort({ displayOrder: 1, createdAt: -1 });
        res.json(adSliders);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching ad sliders' });
    }
});

app.post('/api/marketing/ad-sliders', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { title, subtitle, backgroundImage, link, active = true } = req.body;

        const adSlider = new AdSlider({
            title,
            subtitle,
            backgroundImage,
            link,
            active,
            createdBy: req.user.userId
        });

        await adSlider.save();
        res.status(201).json(adSlider);
    } catch (error) {
        res.status(500).json({ message: 'Error creating ad slider' });
    }
});

app.put('/api/marketing/ad-sliders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { title, subtitle, backgroundImage, link, active, displayOrder } = req.body;

        const adSlider = await AdSlider.findByIdAndUpdate(
            req.params.id,
            { title, subtitle, backgroundImage, link, active, displayOrder, updatedAt: new Date() },
            { new: true }
        );

        if (!adSlider) return res.status(404).json({ message: 'Ad slider not found' });
        res.json(adSlider);
    } catch (error) {
        res.status(500).json({ message: 'Error updating ad slider' });
    }
});

app.delete('/api/marketing/ad-sliders/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const adSlider = await AdSlider.findByIdAndDelete(req.params.id);
        if (!adSlider) return res.status(404).json({ message: 'Ad slider not found' });
        res.json({ message: 'Ad slider deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting ad slider' });
    }
});

// Category Cards Management Routes
app.get('/api/marketing/category-cards', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name } = req.query;
        let query = {};

        if (name) {
            query.name = name;
        }

        const categoryCards = await CategoryCard.find(query).sort({ displayOrder: 1, createdAt: -1 });
        res.json(categoryCards);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching category cards' });
    }
});

app.post('/api/marketing/category-cards/deactivate-all', authenticateToken, isAdmin, async (req, res) => {
    try {
        await CategoryCard.updateMany({}, { active: false });
        res.json({ message: 'All category cards deactivated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deactivating category cards' });
    }
});

app.post('/api/marketing/category-cards', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name, title, description, image, link, cardType, active = true } = req.body;

        const categoryCard = new CategoryCard({
            name,
            title,
            description,
            image,
            link,
            cardType,
            active,
            createdBy: req.user.userId
        });

        await categoryCard.save();
        res.status(201).json(categoryCard);
    } catch (error) {
        res.status(500).json({ message: 'Error creating category card' });
    }
});

app.put('/api/marketing/category-cards/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const { name, title, description, image, link, cardType, active, displayOrder } = req.body;

        const categoryCard = await CategoryCard.findByIdAndUpdate(
            req.params.id,
            { name, title, description, image, link, cardType, active, displayOrder, updatedAt: new Date() },
            { new: true }
        );

        if (!categoryCard) return res.status(404).json({ message: 'Category card not found' });
        res.json(categoryCard);
    } catch (error) {
        res.status(500).json({ message: 'Error updating category card' });
    }
});

app.delete('/api/marketing/category-cards/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const categoryCard = await CategoryCard.findByIdAndDelete(req.params.id);
        if (!categoryCard) return res.status(404).json({ message: 'Category card not found' });
        res.json({ message: 'Category card deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting category card' });
    }
});

// --- About Page API ---

// Public GET endpoint
app.get('/api/public/about', async (req, res) => {
    try {
        const aboutData = await AboutPage.findOne().populate('updatedBy', 'fullName');
        if (!aboutData) {
            return res.status(404).json({ message: 'About page data not found' });
        }
        res.json(aboutData);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching about page content' });
    }
});

// Admin UPDATE endpoint
app.put('/api/admin/about', authenticateToken, checkRoleAccess('about_page_editing'), async (req, res) => {
    try {
        const updateData = {
            ...req.body,
            updatedBy: req.user.userId,
            updatedAt: new Date()
        };
        
        let aboutData = await AboutPage.findOne();
        if (aboutData) {
            aboutData = await AboutPage.findByIdAndUpdate(aboutData._id, updateData, { new: true });
        } else {
            aboutData = new AboutPage(updateData);
            await aboutData.save();
        }
        
        res.json(aboutData);
    } catch (error) {
        res.status(500).json({ message: 'Error updating about page content' });
    }
});

// Fallback Categories Management Routes
app.get('/api/marketing/fallback-categories', authenticateToken, isAdmin, async (req, res) => {
    try {
        const fallbackCategories = await FallbackCategory.find().sort({ displayOrder: 1, createdAt: -1 });
        res.json(fallbackCategories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fallback categories' });
    }
});

app.post('/api/marketing/fallback-categories', authenticateToken, isAdmin, async (req, res) => {
    try {
        const fallbackCategory = new FallbackCategory({
            ...req.body,
            createdBy: req.user.userId
        });
        await fallbackCategory.save();
        res.status(201).json(fallbackCategory);
    } catch (error) {
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Fallback category with this original name already exists' });
        }
        res.status(500).json({ message: 'Error creating fallback category' });
    }
});

app.put('/api/marketing/fallback-categories/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const fallbackCategory = await FallbackCategory.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true }
        );
        if (!fallbackCategory) return res.status(404).json({ message: 'Fallback category not found' });
        res.json(fallbackCategory);
    } catch (error) {
        res.status(500).json({ message: 'Error updating fallback category' });
    }
});

app.delete('/api/marketing/fallback-categories/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const fallbackCategory = await FallbackCategory.findByIdAndDelete(req.params.id);
        if (!fallbackCategory) return res.status(404).json({ message: 'Fallback category not found' });
        res.json({ message: 'Fallback category deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting fallback category' });
    }
});

// Public Fallback Categories Endpoint (no authentication required)
app.get('/api/public/marketing/fallback-categories', async (req, res) => {
    try {
        const fallbackCategories = await FallbackCategory.find({ active: true }).sort({ displayOrder: 1 });
        res.json(fallbackCategories);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching fallback categories' });
    }
});

// Publish Preset Endpoint
app.post('/api/marketing/publish-preset', authenticateToken, isAdmin, async (req, res) => {
    const { style, cards } = req.body;
    try {
        // Delete existing custom cards
        await CategoryCard.deleteMany({});

        if (style !== 'deactivate') {
            // Seed new cards from preset
            console.log(`Publishing preset: ${style} with ${cards ? cards.length : 0} cards.`);
            const cardsToSave = (cards || []).map((card, index) => ({
                name: card.name,
                title: card.title || card.name,
                description: card.description || card.name,
                image: card.image || `https://placehold.co/400x400/CCCCCC/FFFFFF?text=${encodeURIComponent(card.title || card.name)}`,
                link: card.link,
                cardType: card.cardType,
                displayOrder: index + 1,
                active: true,
                presetStyle: style,
                createdBy: req.user.userId
            }));
            if (cardsToSave.length > 0) {
                console.log(`Inserting ${cardsToSave.length} cards into database.`);
                await CategoryCard.insertMany(cardsToSave, { ordered: false });
            } else {
                console.warn('No cards provided in publish request.');
            }
            res.json({ message: `Successfully published ${style} preset!` });
        } else {
            res.json({ message: 'Presets deactivated. Homepage will use default fallback.' });
        }
    } catch (error) {
        console.error('Publish preset error:', error);
        res.status(500).json({ message: 'Error publishing preset' });
    }
});

// Asset Upload Route (enhanced)
app.post('/api/marketing/assets', authenticateToken, isAdmin, marketingUpload.array('assets', 10), async (req, res) => {
    try {
        const assets = [];

        for (const file of req.files) {
            const asset = new MarketingAsset({
                filename: file.originalname,
                url: `/uploads/marketing/${file.filename}`,
                mimetype: file.mimetype,
                size: file.size,
                uploadedBy: req.user.userId
            });

            await asset.save();
            assets.push(asset);
        }

        res.status(201).json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error uploading assets' });
    }
});

// Token Transaction Schema
const tokenTransactionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    type: { type: String, enum: ['earned', 'redeemed'], required: true },
    reason: { type: String, required: true },
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction' },
    description: String,
    createdAt: { type: Date, default: Date.now }
});

const TokenTransaction = mongoose.model('TokenTransaction', tokenTransactionSchema);
console.log('TokenTransaction model created successfully');

// Product model already loaded at line 68

// Category Schema
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }
});

const Category = mongoose.model('Category', categorySchema);
console.log('Category model created successfully');

// Import Transaction model from models folder
const Transaction = require('./models/Transaction');
console.log('Transaction model loaded successfully');

// Review Schema
const reviewSchema = new mongoose.Schema({
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    transaction: { type: mongoose.Schema.Types.ObjectId, ref: 'Transaction', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },

    // Review type
    reviewType: { type: String, enum: ['Buyer to Seller', 'Seller to Buyer'], required: true },

    // Rating
    rating: { type: Number, required: true, min: 1, max: 5 },

    // Comments
    comment: String,

    // Response
    response: String,
    respondedAt: Date,

    // Status
    isPublic: { type: Boolean, default: true },
    isVerified: { type: Boolean, default: true },

    createdAt: { type: Date, default: Date.now }
});

const Review = mongoose.model('Review', reviewSchema);
console.log('Review model created successfully');

// Token Reward System Schema
const tokenSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    
    // Token balances
    currentBalance: { type: Number, default: 0, min: 0 },
    totalEarned: { type: Number, default: 0, min: 0 },
    totalSpent: { type: Number, default: 0, min: 0 },
    
    // Token history
    transactions: [{
        type: { type: String, enum: ['earned', 'spent', 'redeemed'], required: true },
        amount: { type: Number, required: true, min: 0 },
        reason: { type: String, required: true },
        referenceId: { type: String }, // Related transaction, order, or activity ID
        referenceType: { type: String, enum: ['purchase', 'review', 'signup', 'referral', 'redemption'] },
        createdAt: { type: Date, default: Date.now }
    }],
    
    // Token settings
    isActive: { type: Boolean, default: true },
    lastActivity: { type: Date, default: Date.now }
}, { timestamps: true });

const Token = mongoose.model('Token', tokenSchema);
console.log('Token model created successfully');

// Notification model already loaded at line 69

// Enhanced Message Schema with Data Retention
const messageSchema = new mongoose.Schema({
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    receiver: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    content: { type: String, required: true },

    // Message type and status
    messageType: { type: String, enum: ['text', 'image', 'file', 'product_share', 'promotion'], default: 'text' },
    fileUrl: String,
    fileName: String,
    fileSize: Number,

    // Mass messaging fields
    isMassMessage: { type: Boolean, default: false },
    massMessageTitle: String,
    massMessageTarget: String, // 'buyers', 'sellers', 'verifiedSellers', 'proSellers', 'custom'
    massMessageId: String, // Unique ID for tracking mass message campaigns

    // Read receipts
    isRead: { type: Boolean, default: false },
    readAt: Date,

    // Message status
    status: { type: String, enum: ['sent', 'delivered', 'read', 'failed'], default: 'sent' },
    deliveredAt: Date,

    // Typing indicators (stored temporarily)
    isTyping: { type: Boolean, default: false },
    // typingExpires: { type: Date, default: Date.now, expires: 300 }, // REMOVED - Was causing messages to auto-delete after 5 minutes

    // Message reactions
    reactions: [{
        user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        emoji: String,
        createdAt: { type: Date, default: Date.now }
    }],

    // Reply threading
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message' },

    // Message editing/deletion
    isEdited: { type: Boolean, default: false },
    editedAt: Date,
    originalContent: String,
    isDeleted: { type: Boolean, default: false },
    deletedAt: Date,

    // Data Retention Fields
    retentionPolicy: {
        type: String,
        enum: ['standard', 'extended', 'permanent', 'custom'],
        default: 'standard'
    },
    retentionExpiresAt: Date,
    isArchived: { type: Boolean, default: false },
    archivedAt: Date,
    importance: {
        type: String,
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal'
    },

    // Compliance and Audit
    isComplianceRequired: { type: Boolean, default: false },
    complianceCategory: String,
    auditLog: [{
        action: String,
        performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        timestamp: { type: Date, default: Date.now },
        details: String
    }],

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Data Retention Configuration Schema
const retentionConfigSchema = new mongoose.Schema({
    name: { type: String, required: true, unique: true },
    description: String,

    // Retention periods (in days)
    standardRetention: { type: Number, default: 30 }, // Regular messages
    extendedRetention: { type: Number, default: 365 }, // Important messages
    permanentRetention: { type: Boolean, default: false }, // Never delete

    // Message type specific retention
    messageTypeRetention: {
        text: { type: Number, default: 30 },
        image: { type: Number, default: 90 },
        file: { type: Number, default: 180 },
        product_share: { type: Number, default: 365 },
        promotion: { type: Number, default: 90 }
    },

    // User type specific retention
    userTypeRetention: {
        regular: { type: Number, default: 30 },
        premium: { type: Number, default: 365 },
        admin: { type: Number, default: 1825 } // 5 years
    },

    // Mass message retention
    massMessageRetention: { type: Number, default: 365 },

    // Auto-archive settings
    autoArchiveEnabled: { type: Boolean, default: true },
    autoArchiveAfter: { type: Number, default: 7 }, // days

    // Cleanup schedule
    cleanupSchedule: {
        enabled: { type: Boolean, default: true },
        frequency: { type: String, enum: ['daily', 'weekly', 'monthly'], default: 'daily' },
        lastRun: Date,
        nextRun: Date
    },

    isActive: { type: Boolean, default: true },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

// Message Archive Schema
const messageArchiveSchema = new mongoose.Schema({
    originalMessageId: { type: mongoose.Schema.Types.ObjectId, required: true },
    originalCollection: { type: String, required: true },

    // Archived message data
    messageData: { type: mongoose.Schema.Types.Mixed, required: true },

    // Archive metadata
    archivedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    archivedAt: { type: Date, default: Date.now },
    archiveReason: { type: String, required: true },
    retentionPolicy: String,
    expiresAt: Date,

    // Compression and storage
    isCompressed: { type: Boolean, default: false },
    compressedSize: Number,
    originalSize: Number,

    // Access control
    accessLevel: {
        type: String,
        enum: ['public', 'restricted', 'confidential', 'secret'],
        default: 'restricted'
    },
    allowedRoles: [String],
    allowedUsers: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],

    createdAt: { type: Date, default: Date.now }
});

// Index for better query performance
messageSchema.index({ sender: 1, receiver: 1, createdAt: -1 });
messageSchema.index({ receiver: 1, isRead: 1 });
messageSchema.index({ isMassMessage: 1, massMessageId: 1 });
messageSchema.index({ retentionPolicy: 1, retentionExpiresAt: 1 });
messageSchema.index({ isArchived: 1, archivedAt: 1 });
messageSchema.index({ importance: 1, createdAt: -1 });

// TTL indexes for automatic deletion
messageSchema.index({
    retentionExpiresAt: 1
},
    {
        expireAfterSeconds: 0,
        partialFilterExpression: {
            retentionPolicy: { $ne: 'permanent' },
            isArchived: false
        }
    }
);

retentionConfigSchema.index({ isActive: 1 });
retentionConfigSchema.index({ 'cleanupSchedule.nextRun': 1 });

messageArchiveSchema.index({ originalMessageId: 1 });
messageArchiveSchema.index({ archivedAt: 1 });
messageArchiveSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
messageArchiveSchema.index({ archiveReason: 1 });

const Message = mongoose.model('Message', messageSchema);
const RetentionConfig = mongoose.model('RetentionConfig', retentionConfigSchema);
const MessageArchive = mongoose.model('MessageArchive', messageArchiveSchema);

console.log('Message and Retention models created successfully');

// Product Draft Schema
const productDraftSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    data: { type: mongoose.Schema.Types.Mixed, required: true },
    updatedAt: { type: Date, default: Date.now }
});

const ProductDraft = mongoose.model('ProductDraft', productDraftSchema);
console.log('ProductDraft model created successfully');

// --- Marketing & Promotions Models (Amazon-Inspired) ---

// Promotion Schema (Coupons, Deals, Lightning Deals)
const promotionSchema = new mongoose.Schema({
    title: { type: String, required: true },
    description: String,
    promotionType: {
        type: String,
        enum: ['percentage-off', 'fixed-amount', 'BOGO', 'buy-get', 'coupon', 'lightning'],
        required: true
    },
    value: { type: Number, required: true }, // e.g., 20 for 20% or 50 for $50 off
    minPurchaseAmount: { type: Number, default: 0 },

    // Targeting
    targetType: { type: String, enum: ['All', 'Category', 'Specific Products', 'User Segment'], default: 'All' },
    targetCategoryId: { type: mongoose.Schema.Types.ObjectId, ref: 'Category' },
    targetProductIds: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Product' }],

    // Scarcity & Urgency (Amazon-like)
    isClippable: { type: Boolean, default: false },
    couponCode: { type: String, unique: true, sparse: true },
    maxClaims: { type: Number },
    claimLimitPerUser: { type: Number, default: 1 },
    currentClaims: { type: Number, default: 0 },
    urgencyDisplay: { type: String, enum: ['none', 'countdown-timer', 'limited-time', 'x-claimed'], default: 'none' },

    // Stacking Rules
    stackable: { type: Boolean, default: false },
    exclusivityGroup: String, // prevents stacking within the same group

    // Scheduling
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    recurrence: { type: String, enum: ['none', 'weekly', 'monthly'], default: 'none' },

    status: { type: String, enum: ['Draft', 'Active', 'Scheduled', 'Paused', 'Ended'], default: 'Draft' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Promotion = mongoose.model('Promotion', promotionSchema);

// Banner/Hero Manager Schema
const bannerSchema = new mongoose.Schema({
    title: { type: String, required: true },
    imageUrl: { type: String, required: true },
    linkUrl: { type: String },
    type: { type: String, enum: ['hero', 'secondary', 'popup', 'floating'], default: 'hero' },

    // Responsive overrides
    mobileImageUrl: String,
    overlayText: {
        headline: String,
        subheadline: String,
        ctaText: String,
        textColor: { type: String, default: '#FFFFFF' }
    },

    // Scheduling
    startDate: { type: Date },
    endDate: { type: Date },
    isActive: { type: Boolean, default: true },

    displayOrder: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const Banner = mongoose.model('Banner', bannerSchema);

// About Page Schema
const aboutPageSchema = new mongoose.Schema({
    title: { type: String, default: 'About Virtuosa' },
    mission: { type: String, default: 'To empower students through a safe, campus-focused trading ecosystem.' },
    vision: { type: String, default: 'To be the primary marketplace for every student in Zambia.' },
    story: { type: String, default: 'Virtuosa started with a simple idea: make campus trading safer and easier for everyone.' },
    heroImage: { type: String, default: 'https://placehold.co/1200x400/0A1128/FFFFFF?text=About+Virtuosa' },
    team: [{
        name: { type: String, required: true },
        role: { type: String, required: true },
        bio: String,
        image: String
    }],
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now }
});

const AboutPage = mongoose.model('AboutPage', aboutPageSchema);

console.log('Marketing, Banner and AboutPage models created successfully');

// A+ Content / Product Enhancement Schema
const contentEnhancementSchema = new mongoose.Schema({
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, unique: true },
    brandStory: String,
    modules: [{
        moduleType: {
            type: String,
            enum: ['Image + Text', 'Comparison Chart', 'Bullet Features', 'Lifestyle Gallery', 'Video Player'],
            required: true
        },
        content: mongoose.Schema.Types.Mixed,
        displayOrder: { type: Number, default: 0 }
    }],
    isActive: { type: Boolean, default: true },
    updatedAt: { type: Date, default: Date.now }
});

const ContentEnhancement = mongoose.model('ContentEnhancement', contentEnhancementSchema);

// Ad Slider Schema
const adSliderSchema = new mongoose.Schema({
    title: { type: String, required: true },
    subtitle: String,
    backgroundImage: { type: String, required: true },
    link: String,
    active: { type: Boolean, default: true },
    displayOrder: { type: Number, default: 0 },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const AdSlider = mongoose.model('AdSlider', adSliderSchema);

// Category Card Management Schema
const categoryCardSchema = new mongoose.Schema({
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    link: { type: String, required: true },
    cardType: { type: String, enum: ['square', 'rectangle'], required: true },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    presetStyle: { type: String, default: 'free' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const CategoryCard = mongoose.model('CategoryCard', categoryCardSchema);

// Fallback Category Override Schema
const fallbackCategorySchema = new mongoose.Schema({
    originalName: { type: String, required: true, unique: true },
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true },
    link: { type: String, required: true },
    cardType: { type: String, enum: ['square', 'rectangle'], required: true },
    displayOrder: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const FallbackCategory = mongoose.model('FallbackCategory', fallbackCategorySchema);

// Asset Library Schema
const marketingAssetSchema = new mongoose.Schema({
    filename: { type: String, required: true },
    url: { type: String, required: true },
    mimetype: String,
    size: Number,
    tags: [String],
    usageCount: { type: Number, default: 0 },
    isOptimized: { type: Boolean, default: false },
    uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    createdAt: { type: Date, default: Date.now }
});

const MarketingAsset = mongoose.model('MarketingAsset', marketingAssetSchema);

console.log('Marketing models created successfully');

// Seed initial marketing data after models are created (only if connected)
if (mongoose.connection.readyState === 1) {
    seedInitialMarketingData();
} else {
    // Seed when connection is ready
    mongoose.connection.once('connected', () => {
        seedInitialMarketingData();
    });
}

// Seller Application Schema (comprehensive Zambian campus marketplace application)
const sellerApplicationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Section 1: Seller Type
    sellerType: {
        type: String,
        enum: ['Student', 'CampusBusiness', 'ExternalVendor', 'Cooperative'],
        required: true
    },

    // Section 2: Personal Information
    personalInfo: {
        fullName: { type: String, required: true },
        studentId: String,
        university: { type: String, required: true },
        nrcNumber: String,
        phoneNumber: { type: String, required: true },
        email: { type: String, required: true },
        yearOfStudy: String,
        program: String
    },

    // Section 3: Campus Location Details
    campusLocation: {
        campus: { type: String, required: true },
        physicalAccess: { type: Boolean, default: false },
        pickupLocation: String,
        canDeliver: { type: Boolean, default: false },
        deliveryRadius: Number
    },

    // Section 4: Business/Selling Information
    sellingInfo: {
        categories: [String],
        otherCategory: String,
        sellingExperience: {
            type: String,
            enum: ['first_time', 'sold_casually', 'existing_business']
        },
        currentSaleChannels: [String],
        storeName: String,
        storeDescription: String
    },

    // Section 5: Inventory & Product Source
    inventorySource: {
        sources: [String],
        otherSource: String,
        plannedItemCount: {
            type: String,
            enum: ['1-10', '11-30', '31-50', '50+']
        }
    },

    // Section 6: Pricing & Payment Preferences
    paymentPreferences: {
        methods: [String],
        understandsCommission: {
            type: String,
            enum: ['yes', 'no', 'need_explanation']
        }
    },

    // Section 7: Delivery & Pickup Arrangements
    deliveryArrangements: {
        methods: [String],
        meetupLocation: String
    },

    // Section 8: Verification & Trust
    verification: {
        documents: [String],
        willingToOrient: { type: Boolean, default: false }
    },

    // Section 9: Agreements & Commitments
    agreements: {
        enrolledConfirm: { type: Boolean, default: false },
        noProhibitedItems: { type: Boolean, default: false },
        noScamming: { type: Boolean, default: false },
        respectCommitment: { type: Boolean, default: false },
        accurateDescriptions: { type: Boolean, default: false }
    },

    // Section 10: Additional Context
    additionalContext: {
        challenges: String,
        trustFactors: String,
        referralName: String
    },

    // Application Status
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    adminReviewNotes: String,
    rejectionReason: String,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: Date,

    submittedAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

sellerApplicationSchema.index({ user: 1, status: 1 });
sellerApplicationSchema.index({ status: 1, submittedAt: -1 });

// SellerApplication model already loaded at line 70

// Virtuosa Pro Subscription Schema
const subscriptionSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    plan: { type: String, enum: ['Pro'], required: true },

    // Billing
    monthlyFee: { type: Number, default: 100 },
    nextBillingDate: Date,
    paymentMethod: { type: String, enum: ['Mobile Money', 'Bank Transfer'], required: true },
    paymentReference: String,

    // Status
    isActive: { type: Boolean, default: true },
    cancelledAt: Date,
    cancelledReason: String,

    // Benefits tracking
    listingsIncluded: { type: Number, default: -1 }, // -1 = unlimited
    currentListings: { type: Number, default: 0 },

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const Subscription = mongoose.model('Subscription', subscriptionSchema);
console.log('Subscription model created successfully');

// Account Deletion Request Schema
const accountDeletionRequestSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: { type: String, required: true },
    status: { type: String, enum: ['Pending', 'Approved', 'Rejected'], default: 'Pending' },
    adminNotes: String,
    processedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    processedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const AccountDeletionRequest = mongoose.model('AccountDeletionRequest', accountDeletionRequestSchema);
console.log('AccountDeletionRequest model created successfully');

// Production-ready Brevo email configuration for Render Startup Tier
const productionTransporter = nodemailer.createTransport({
    host: 'smtp-relay.brevo.com',
    port: 587,
    secure: false, // Must be false for 587
    auth: {
        user: 'a56cc6001@smtp-brevo.com',
        pass: 'r2EO1DYfKJCc8vQw'
    },
    tls: {
        rejectUnauthorized: false // Helps bypass potential certificate issues
    },
    pool: true, // Enable connection pooling for production
    maxConnections: 5,
    maxMessages: 100,
    rateDelta: 1000,
    rateLimit: 5
});

// Environment-based configuration
const isProduction = process.env.NODE_ENV === 'production';
const isRenderFreeTier = process.env.RENDER === 'true' && !process.env.RENDER_SERVICE_ID;
const isProductionReady = !isRenderFreeTier;

// Temporary fallback for Free Tier (stores emails for later sending)
const emailQueue = [];
const tempEmailStorage = {
    emails: [],
    
    add: function(emailData) {
        this.emails.push({
            ...emailData,
            timestamp: new Date(),
            sent: false
        });
        console.log('📧 Email queued for later delivery (Free Tier limitation):', emailData.to);
    },
    
    getAll: function() {
        return this.emails;
    },
    
    markSent: function(index) {
        if (this.emails[index]) {
            this.emails[index].sent = true;
            this.emails[index].sentAt = new Date();
        }
    }
};

// Verify transporter configurations on startup
const verifyTransporters = async () => {
    if (isRenderFreeTier) {
        console.log('⚠️  Render Free Tier detected - SMTP blocked, emails will be queued');
        console.log('📧 Upgrade to Startup Tier to enable email sending');
        return;
    }
    
    try {
        console.log('🔧 Verifying Brevo SMTP configuration...');
        await new Promise((resolve, reject) => {
            productionTransporter.verify((error, success) => {
                if (error) {
                    console.log('❌ Brevo transporter configuration error:', error.message);
                    resolve(false);
                } else {
                    console.log('✅ Brevo transporter is ready to send messages');
                    console.log('📧 Email service: Brevo (smtp-relay.brevo.com:587)');
                    resolve(true);
                }
            });
        });
    } catch (error) {
        console.log('❌ Brevo transporter verification failed:', error.message);
    }
};

// Admin endpoint to view queued emails (for after upgrade)
app.get('/api/admin/queued-emails', async (req, res) => {
    try {
        const queuedEmails = tempEmailStorage.getAll();
        res.json({
            queuedEmails: queuedEmails,
            totalQueued: queuedEmails.length,
            isRenderFreeTier: isRenderFreeTier
        });
    } catch (error) {
        console.error('❌ Error fetching queued emails:', error);
        res.status(500).json({ message: 'Failed to fetch queued emails' });
    }
});

// Admin endpoint to send queued emails (for after upgrade)
app.post('/api/admin/send-queued-emails', async (req, res) => {
    try {
        if (isRenderFreeTier) {
            return res.status(400).json({ 
                message: 'Cannot send emails on Free Tier. Please upgrade to Startup Tier first.' 
            });
        }
        
        const queuedEmails = tempEmailStorage.getAll();
        let sentCount = 0;
        let failedCount = 0;
        
        for (let i = 0; i < queuedEmails.length; i++) {
            const email = queuedEmails[i];
            if (!email.sent) {
                try {
                    await productionTransporter.sendMail({
                        from: 'noreply@virtuosazm.com',
                        to: email.to,
                        subject: email.subject,
                        html: email.html
                    });
                    
                    tempEmailStorage.markSent(i);
                    sentCount++;
                    console.log(`✅ Sent queued email to: ${email.to}`);
                } catch (error) {
                    failedCount++;
                    console.error(`❌ Failed to send queued email to ${email.to}:`, error.message);
                }
            }
        }
        
        res.json({
            message: `Processed ${queuedEmails.length} queued emails. Sent: ${sentCount}, Failed: ${failedCount}`,
            sentCount,
            failedCount,
            totalProcessed: queuedEmails.length
        });
    } catch (error) {
        console.error('❌ Error sending queued emails:', error);
        res.status(500).json({ message: 'Failed to send queued emails' });
    }
});

verifyTransporters();

// Enhanced Signup endpoint with student verification
app.post('/api/auth/signup', async (req, res) => {
    const { fullName, email, password, university, phoneNumber, studentEmail, gender, agreedToTerms } = req.body;

    if (!fullName || !email || !password || !university || !phoneNumber || !studentEmail || !gender || !agreedToTerms) {
        return res.status(400).json({ success: false, message: 'All fields are required' });
    }

    // Normalize emails to lowercase
    const normalizedEmail = email.toLowerCase();
    const normalizedStudentEmail = studentEmail.toLowerCase();

    // Validate student email domain
    const validStudentDomains = ['unza.zm', 'cbu.ac.zm', 'student.unza.zm', 'student.cbu.ac.zm'];
    const studentEmailDomain = normalizedStudentEmail.split('@')[1];
    if (!validStudentDomains.includes(studentEmailDomain)) {
        return res.status(400).json({ success: false, message: 'Invalid student email domain' });
    }

    try {
        const existingUser = await User.findOne({ $or: [{ email: normalizedEmail }, { studentEmail: normalizedStudentEmail }] });
        if (existingUser) {
            return res.status(400).json({ success: false, message: 'Email already exists' });
        }

        const emailVerificationToken = crypto.randomBytes(20).toString('hex');
        const verificationToken = crypto.randomBytes(20).toString('hex');

        const user = new User({
            fullName,
            email: normalizedEmail,
            password: password,
            gender,
            university,
            phoneNumber,
            studentEmail: normalizedStudentEmail,
            agreedToTerms,
            emailVerificationToken,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            studentVerificationToken: verificationToken,
            studentVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
        // Set proper default role values for the new hierarchy system
        role: 'user', // Base role
        isAdmin: false,
        isBuyer: true, // All users are buyers by default
        isSeller: false // Seller status granted via application
    });

    // Validate all role-related fields before saving
    const validRoles = ['user', 'buyer', 'seller', 'admin', 'CEO'];
    
    // Validate role field
    if (user.role && !validRoles.includes(user.role)) {
        console.warn('Invalid role detected during signup, defaulting to user');
        user.role = 'user';
    }
    
    // Ensure boolean fields are properly typed and validated
    user.isAdmin = Boolean(user.isAdmin);
    user.isBuyer = Boolean(user.isBuyer);
    user.isSeller = Boolean(user.isSeller);
    
    // Additional validation: ensure role consistency
    if (user.isAdmin === true && user.role !== 'admin' && user.role !== 'CEO') {
        console.warn('Role inconsistency detected: isAdmin=true but role is not admin/CEO');
        user.role = 'admin';
    }
    
    if (user.isSeller === true && user.role !== 'seller' && user.role !== 'admin' && user.role !== 'CEO') {
        console.warn('Role inconsistency detected: isSeller=true but role doesn\'t support seller privileges');
        // Keep isSeller=true as it might be a pending seller application
    }

        await user.save();
        
        // Debug: Check password after save
        console.log('User saved successfully');
        console.log('Password hash after save:', user.password.substring(0, 20) + '...');
        console.log('Password hash length after save:', user.password.length);

        // Send email verification email
        const emailVerificationLink = `${process.env.FRONTEND_URL || 'https://virtuosa1.vercel.app'}/pages/verify-email.html?token=${emailVerificationToken}`;
        
        console.log('🔍 Sending email verification email to:', normalizedEmail);
        console.log('🔗 Verification link:', emailVerificationLink);
        console.log('📧 Email config check:', {
            hasEmailUser: !!process.env.EMAIL_USER,
            hasEmailPass: !!process.env.EMAIL_PASS,
            emailUser: process.env.EMAIL_USER
        });
        
        try {
            const emailResult = await productionTransporter.sendMail({
                from: 'noreply@virtuosazm.com',
                to: normalizedEmail,
                subject: 'Virtuosa - Verify Your Email',
                html: `
                    <h2>Welcome to Virtuosa!</h2>
                    <p>Thank you for signing up. Please click <a href="${emailVerificationLink}">here</a> to verify your email address.</p>
                    <p>This link will expire in 24 hours.</p>
                    <p>After verifying your email, you'll also need to verify your student status.</p>
                `
            });
            
            console.log('✅ Email verification email sent successfully to:', normalizedEmail);
            console.log('📧 Email result:', emailResult);
            
            // Send student verification email
            const studentVerificationLink = `${process.env.FRONTEND_URL || 'https://virtuosazm.com'}/api/auth/verify-student/${verificationToken}`;
            
            try {
                const studentEmailResult = await transporter.sendMail({
                    from: 'noreply@virtuosazm.com',
                    to: normalizedStudentEmail,
                    subject: 'Virtuosa Student Verification',
                    html: `
                        <h2>Verify Your Student Status</h2>
                        <p>Click <a href="${studentVerificationLink}">here</a> to verify your student email.</p>
                        <p>This link will expire in 24 hours.</p>
                    `
                });
                
                console.log('✅ Student verification email sent successfully to:', normalizedStudentEmail);
                console.log('📧 Student email result:', studentEmailResult);
            } catch (studentEmailError) {
                console.error('❌ Failed to send student verification email:', studentEmailError);
                // Don't fail the whole request if student email fails, but log it
                console.log('⚠️ User created but student email verification failed');
            }

            res.status(201).json({
                success: true,
                message: 'Account created successfully! Please check your email for verification instructions.'
            });
            
        } catch (emailError) {
            console.error('❌ Failed to send verification email:', emailError);
            console.error('Email error details:', {
                message: emailError.message,
                code: emailError.code,
                response: emailError.response
            });
            
            // If email fails, we should still create the user but inform them of the issue
            res.status(201).json({
                success: true,
                message: 'Account created but email verification failed. Please contact support at virtuosa@gmail.com or try logging in and requesting a new verification email.',
                emailVerificationFailed: true
            });
        }
    } catch (error) {
        console.error('Signup error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Email verification endpoint
app.get('/api/auth/verify-email/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const user = await User.findOne({
            emailVerificationToken: token,
            emailVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.redirect('/pages/login.html?verification=error');
        }

        user.isEmailVerified = true;
        user.emailVerificationToken = undefined;
        user.emailVerificationExpires = undefined;
        await user.save();

        res.redirect('/pages/login.html?verified=email');
    } catch (error) {
        console.error('Email verification error:', error);
        res.redirect('/pages/login.html?verification=error');
    }
});

// Student verification endpoint
app.get('/api/auth/verify-student/:token', async (req, res) => {
    const { token } = req.params;

    try {
        const user = await User.findOne({
            studentVerificationToken: token,
            studentVerificationExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ success: false, message: 'Invalid or expired verification token' });
        }

        user.isStudentVerified = true;
        user.studentVerificationToken = undefined;
        user.studentVerificationExpires = undefined;
        await user.save();

        res.redirect('/pages/login.html?verified=true');
    } catch (error) {
        console.error('Student verification error:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
});

// Login endpoint
app.post('/api/auth/login', async (req, res) => {
    console.log('🔍 DEBUG - Request body received:', req.body);
    console.log('🔍 DEBUG - Content-Type header:', req.get('Content-Type'));
    const { email, password } = req.body;
    console.log('🔍 DEBUG - Extracted email:', email, 'password:', password ? '[REDACTED]' : 'undefined');

    if (!email || !password) {
        console.log('❌ DEBUG - Missing email or password');
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    try {
        console.log('🔍 DEBUG - Raw email received:', JSON.stringify(email));
        console.log('🔍 DEBUG - Email character codes:', Array.from(email).map(c => `${c}(${c.charCodeAt(0)})`));
        console.log('🔍 DEBUG - Normalized email:', JSON.stringify(normalizedEmail));
        console.log('Login attempt for email:', normalizedEmail);
        
        const user = await User.findOne({ 
            $or: [
                { email: normalizedEmail },
                { email: { $regex: new RegExp('^' + normalizedEmail + '$', 'i') } }
            ]
        });
        console.log('User query result:', user ? 'User found' : 'User not found');
        
        if (!user) {
            console.log('❌ Login failed - User not found for email:', normalizedEmail);
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        console.log('Attempting password comparison for user:', normalizedEmail);
        console.log('Password hash length:', user.password.length);
        console.log('Password hash starts with:', user.password.substring(0, 10));
        console.log('Input password length:', password.length);
        
        let isMatch = await bcrypt.compare(password, user.password);
        
        console.log('Password comparison result:', isMatch);
        
        if (!isMatch) {
            console.log('Password comparison failed for user:', normalizedEmail);
            console.log('Full password hash:', user.password);
            // For debugging: let's try to hash the input password to see what happens
            const testHash = await bcrypt.hash(password, 12);
            console.log('Test hash of input password:', testHash.substring(0, 20) + '...');
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        // Check if email is verified (handle missing fields gracefully)
        // For existing users without email verification fields, consider them verified
        // Special case: if the email is the same as EMAIL_USER, consider it verified
        const isEmailVerified = user.isEmailVerified === undefined ? true : user.isEmailVerified;
        const isSystemEmail = normalizedEmail === process.env.EMAIL_USER?.toLowerCase();
        
        if (!isEmailVerified && !isSystemEmail) {
            return res.status(403).json({ 
                message: 'Please verify your email address before logging in. Check your inbox for the verification link.',
                requiresEmailVerification: true
            });
        }

        const token = jwt.sign({ userId: user._id }, process.env.JWT_SECRET, { expiresIn: '1h' });
        
        // Get user role information using the new role system
        const { getEffectiveRole } = require('./middleware/roleBasedAccess');
        const effectiveRole = getEffectiveRole(user);
        
        console.log('🔐 Login successful:', {
            userId: user._id,
            email: user.email,
            effectiveRole,
            isAdmin: effectiveRole === 'admin',
            isSeller: effectiveRole === 'seller' || effectiveRole === 'admin'
        });
        
        res.json({
            token,
            user: { 
                email: user.email, 
                fullName: user.fullName,
                isEmailVerified: user.isEmailVerified,
                isStudentVerified: user.isStudentVerified,
                // Add role information for the new role system
                role: user.role,
                isAdmin: user.isAdmin,
                isBuyer: user.isBuyer,
                isSeller: user.isSeller,
                // Add computed effective role for client-side use
                effectiveRole: effectiveRole
            }
        });
    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Test endpoint to check if email exists (temporary for debugging)
app.post('/api/auth/check-email', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    try {
        console.log('🔍 Checking email existence:', normalizedEmail);
        
        const user = await User.findOne({ email: normalizedEmail });
        
        if (user) {
            console.log('✅ User found:', {
                id: user._id,
                email: user.email,
                isEmailVerified: user.isEmailVerified,
                isStudentVerified: user.isStudentVerified,
                fullName: user.fullName
            });
            
            res.json({ 
                exists: true,
                user: {
                    id: user._id,
                    email: user.email,
                    isEmailVerified: user.isEmailVerified,
                    isStudentVerified: user.isStudentVerified,
                    fullName: user.fullName
                }
            });
        } else {
            console.log('❌ User not found for email:', normalizedEmail);
            res.json({ exists: false, message: 'User not found' });
        }
    } catch (error) {
        console.error('❌ Check email error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Resend verification email endpoint
app.post('/api/auth/resend-verification', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    try {
        console.log('🔍 Resend verification request for email:', normalizedEmail);
        
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            console.log('❌ User not found for email:', normalizedEmail);
            return res.status(404).json({ message: 'No account found with this email' });
        }

        console.log('✅ User found:', user.email, 'isEmailVerified:', user.isEmailVerified);

        // Check if user is already verified (handle missing fields gracefully)
        const isEmailVerified = user.isEmailVerified === undefined ? true : user.isEmailVerified;
        const isSystemEmail = normalizedEmail === process.env.EMAIL_USER?.toLowerCase();
        
        if (isEmailVerified || isSystemEmail) {
            console.log('ℹ️ User already verified or is system email');
            return res.status(400).json({ message: 'Email is already verified' });
        }

        // Generate new verification token
        const emailVerificationToken = crypto.randomBytes(20).toString('hex');
        
        console.log('🔧 Generated verification token');
        
        // Update user with verification token (handle missing fields gracefully)
        user.emailVerificationToken = emailVerificationToken;
        user.emailVerificationExpires = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        user.isEmailVerified = user.isEmailVerified || false; // Set default if missing
        
        await user.save();
        console.log('💾 User saved with verification token');

        // Send verification email
        const emailVerificationLink = `${process.env.FRONTEND_URL || 'https://virtuosazm.com'}/pages/verify-email.html?token=${emailVerificationToken}`;
        
        console.log('📧 Sending verification email to:', normalizedEmail);
        console.log('🔗 Verification link:', emailVerificationLink);
        console.log('📧 Email config check:', {
            hasEmailUser: !!process.env.EMAIL_USER,
            hasEmailPass: !!process.env.EMAIL_PASS,
            emailUser: process.env.EMAIL_USER
        });
        
        try {
            // Handle Free Tier limitation
            if (isRenderFreeTier) {
                console.log('📧 Render Free Tier detected - queuing email for later delivery');
                
                // Queue the email for later sending
                tempEmailStorage.add({
                    to: normalizedEmail,
                    subject: 'Virtuosa - Verify Your Email',
                    html: `
                        <h2>Email Verification Request</h2>
                        <p>You requested a new verification email. Please click <a href="${emailVerificationLink}">here</a> to verify your email address.</p>
                        <p>This link will expire in 24 hours.</p>
                        <p>Best regards,<br>The Virtuosa Team</p>
                    `,
                    verificationLink: emailVerificationLink
                });
                
                return res.json({ 
                    message: 'Verification email queued. Note: Email sending is temporarily disabled on Free Tier. Your verification link is: ' + emailVerificationLink,
                    verificationLink: emailVerificationLink,
                    queued: true
                });
            }
            
            // Production tier - send email immediately using Brevo
            try {
                console.log(`📧 Sending email using Brevo transporter to:`, normalizedEmail);
                
                const result = await productionTransporter.sendMail({
                    from: 'noreply@virtuosazm.com', // Proper from address
                    to: normalizedEmail,
                    subject: 'Virtuosa - Verify Your Email',
                    html: `
                        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                                <h1 style="color: white; margin: 0; font-size: 24px;">Virtuosa</h1>
                                <p style="color: #f0f0f0; margin: 5px 0 0;">Zambia's Premier Student Marketplace</p>
                            </div>
                            <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                                <h2 style="color: #333; margin-top: 0;">Email Verification Request</h2>
                                <p style="color: #666; line-height: 1.6;">Thank you for joining Virtuosa! Please click the button below to verify your email address and complete your registration.</p>
                                <div style="text-align: center; margin: 30px 0;">
                                    <a href="${emailVerificationLink}" 
                                       style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                                              color: white; 
                                              padding: 15px 30px; 
                                              text-decoration: none; 
                                              border-radius: 25px; 
                                              font-weight: bold;
                                              display: inline-block;
                                              box-shadow: 0 4px 15px rgba(102, 126, 234, 0.3);">
                                        Verify Email Address
                                    </a>
                                </div>
                                <p style="color: #999; font-size: 14px; text-align: center;">This link will expire in 24 hours.</p>
                                <p style="color: #666; font-size: 12px; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
                                    If you didn't request this verification, please ignore this email.<br>
                                    Visit us at <a href="https://virtuosazm.com" style="color: #667eea;">virtuosazm.com</a>
                                </p>
                            </div>
                        </div>
                    `
                });
                
                console.log(`✅ Verification email sent successfully via Brevo to:`, normalizedEmail);
                console.log('📧 Email result:', result);
                
                return res.json({ 
                    message: 'Verification email sent successfully. Please check your inbox (including spam folder).' 
                });
            } catch (error) {
                console.error(`❌ Brevo transporter failed:`, error.message);
                
                return res.status(500).json({ 
                    message: 'Failed to send verification email. Please check your email address or contact support at virtuosa@gmail.com.',
                    error: 'Email sending failed',
                    details: error.message 
                });
            }
        } catch (emailError) {
            console.error('❌ Failed to send verification email:', emailError);
            console.error('Email error details:', {
                message: emailError.message,
                code: emailError.code,
                response: emailError.response
            });
            
            // Return a more helpful error message
            res.status(500).json({ 
                message: 'Failed to send verification email. Please check your email address or contact support at virtuosa@gmail.com.',
                error: 'Email sending failed',
                details: emailError.message 
            });
        }
    } catch (error) {
        console.error('❌ Resend verification error:', error);
        console.error('Stack trace:', error.stack);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Migration endpoint to update existing users with email verification fields
app.post('/api/auth/migrate-email-verification', async (req, res) => {
    try {
        // Update all users who don't have email verification fields
        const result = await User.updateMany(
            { 
                $or: [
                    { isEmailVerified: { $exists: false } },
                    { emailVerificationToken: { $exists: false } },
                    { emailVerificationExpires: { $exists: false } }
                ]
            },
            { 
                $set: { 
                    isEmailVerified: true, // Set existing users as verified
                    emailVerificationToken: null,
                    emailVerificationExpires: null
                }
            }
        );

        res.json({ 
            message: 'Email verification migration completed',
            updatedCount: result.modifiedCount
        });
    } catch (error) {
        console.error('Migration error:', error);
        res.status(500).json({ message: 'Migration failed', error: error.message });
    }
});

// Forgot Password endpoint
app.post('/api/auth/forgot-password', async (req, res) => {
    const { email } = req.body;

    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    try {
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(400).json({ message: 'No user found with this email' });
        }

        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000;
        await user.save();

        const resetLink = `${process.env.FRONTEND_URL || 'https://virtuosazm.com'}/pages/reset-password.html?token=${token}`;
        
        // Handle Free Tier limitation
        if (isRenderFreeTier) {
            console.log('📧 Render Free Tier detected - queuing password reset email for later delivery');
            
            // Queue the email for later sending
            tempEmailStorage.add({
                to: email,
                subject: 'Virtuosa Password Reset',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Virtuosa</h1>
                            <p style="color: #f0f0f0; margin: 5px 0 0;">Zambia's Premier Student Marketplace</p>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                            <p style="color: #666; line-height: 1.6;">You requested a password reset for your Virtuosa account.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                            </div>
                            <p style="color: #999; font-size: 14px;">This link will expire in 1 hour.</p>
                            <p style="color: #999; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                        </div>
                    </div>
                `
            });
            
            console.log('✅ Password reset email queued for later delivery');
            res.json({ message: 'Password reset email queued for delivery' });
            return;
        }
        
        // Production tier - send email immediately using Brevo
        try {
            console.log(`📧 Sending password reset email using Brevo transporter to:`, normalizedEmail);
            
            const result = await productionTransporter.sendMail({
                from: 'noreply@virtuosazm.com',
                to: email,
                subject: 'Virtuosa Password Reset',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Virtuosa</h1>
                            <p style="color: #f0f0f0; margin: 5px 0 0;">Zambia's Premier Student Marketplace</p>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                            <p style="color: #666; line-height: 1.6;">You requested a password reset for your Virtuosa account.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                            </div>
                            <p style="color: #999; font-size: 14px;">This link will expire in 1 hour.</p>
                            <p style="color: #999; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                        </div>
                    </div>
                `
            });
            
            console.log('✅ Password reset email sent successfully to:', normalizedEmail);
            res.json({ message: 'Password reset email sent' });
        } catch (emailError) {
            console.error('❌ Brevo transporter failed:', emailError);
            
            // Fallback: queue the email
            tempEmailStorage.add({
                to: email,
                subject: 'Virtuosa Password Reset',
                html: `
                    <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
                        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
                            <h1 style="color: white; margin: 0; font-size: 24px;">Virtuosa</h1>
                            <p style="color: #f0f0f0; margin: 5px 0 0;">Zambia's Premier Student Marketplace</p>
                        </div>
                        <div style="background: white; padding: 30px; border-radius: 0 0 8px 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                            <h2 style="color: #333; margin-top: 0;">Password Reset Request</h2>
                            <p style="color: #666; line-height: 1.6;">You requested a password reset for your Virtuosa account.</p>
                            <div style="text-align: center; margin: 30px 0;">
                                <a href="${resetLink}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">Reset Password</a>
                            </div>
                            <p style="color: #999; font-size: 14px;">This link will expire in 1 hour.</p>
                            <p style="color: #999; font-size: 14px;">If you didn't request this, please ignore this email.</p>
                        </div>
                    </div>
                `
            });
            
            console.log('📧 Password reset email queued due to transporter error');
            res.json({ message: 'Password reset email queued for delivery' });
        }
    } catch (error) {
        console.error('Forgot password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Reset Password endpoint
app.post('/api/auth/reset-password/:token', async (req, res) => {
    const { token } = req.params;
    const { password } = req.body;

    if (!password) {
        return res.status(400).json({ message: 'New password is required' });
    }

    try {
        const user = await User.findOne({
            resetPasswordToken: token,
            resetPasswordExpires: { $gt: Date.now() }
        });

        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired reset token' });
        }

        user.password = await bcrypt.hash(password, 12);
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;
        await user.save();

        res.json({ message: 'Password reset successfully' });
    } catch (error) {
        console.error('Reset password error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced error handling middleware
app.use((err, req, res, next) => {
    console.error('Global error:', err);
    
    // Ensure we always send JSON, never HTML
    if (err) {
        res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
        });
    } else {
        next();
    }
});

// Simple test endpoint to verify JSON responses
app.get('/api/test/json', (req, res) => {
    res.json({
        success: true,
        message: 'JSON response test successful',
        timestamp: new Date().toISOString(),
        server: 'Virtuosa API'
    });
});

// Logout endpoint
app.post('/api/auth/logout', (req, res) => {
    res.json({ message: 'Logout successful' });
});

// Token refresh endpoint
app.post('/api/auth/refresh', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate new JWT token
        const token = jwt.sign(
            {
                userId: user._id,
                email: user.email,
                role: user.role || 'user',
                isAdmin: user.isAdmin || false
            },
            process.env.JWT_SECRET,
            { expiresIn: '7d' }
        );

        console.log('Token refreshed for user:', user.email);

        res.json({
            token,
            user: {
                id: user._id,
                fullName: user.fullName,
                email: user.email,
                role: user.role || 'user',
                isAdmin: user.isAdmin || false,
                isBuyer: user.isBuyer,
                isSeller: user.isSeller,
                sellerVerified: user.sellerVerified,
                isProSeller: user.isProSeller
            }
        });
    } catch (error) {
        console.error('Token refresh error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Categories endpoint
app.get('/api/categories', async (req, res) => {
    try {
        const categories = await Category.find().maxTimeMS(30000);
        if (categories.length === 0) {
            const sampleCategories = [
                {
                    name: 'Hot Deals',
                    title: 'Grad Deals Bonanza',
                    description: 'Snag epic discounts on textbooks, tech, and more before the semester starts.',
                    image: 'https://placehold.co/300x240?text=Hot+Deals'
                },
                {
                    name: 'Best Sellers',
                    title: 'Campus Best Sellers',
                    description: 'Shop what’s trending at UNZA, CBU, and beyond.',
                    image: 'https://placehold.co/300x240?text=Best+Sellers'
                },
                {
                    name: 'Men\'s Clothing',
                    title: 'Style Your Campus Look',
                    description: 'Rock the latest fashion with trendy tees, jeans, and jackets.',
                    image: 'https://placehold.co/300x180?text=Men\'s+Clothing'
                },
                {
                    name: 'Women\'s Clothing',
                    title: 'Slay the Semester',
                    description: 'From chic dresses to comfy hoodies, find your style.',
                    image: 'https://placehold.co/300x180?text=Women\'s+Clothing'
                },
                {
                    name: 'Shoes',
                    title: 'Step Up Your Game',
                    description: 'Find stylish sneakers and comfy shoes for campus life.',
                    image: 'https://placehold.co/300x180?text=Shoes'
                },
                {
                    name: 'Accessories',
                    title: 'Add Some Flair',
                    description: 'Bags, belts, and sunglasses to elevate your look.',
                    image: 'https://placehold.co/300x240?text=Accessories'
                },
                {
                    name: 'Electronics',
                    title: 'Power Up Your Studies',
                    description: 'Score affordable laptops, headphones, and gadgets.',
                    image: 'https://placehold.co/300x180?text=Electronics'
                },
                {
                    name: 'Computers & Software',
                    title: 'Tech for Success',
                    description: 'Laptops, software, and accessories to boost productivity.',
                    image: 'https://placehold.co/300x180?text=Computers+Software'
                },
                {
                    name: 'Services',
                    title: 'Boost Your Hustle',
                    description: 'Need tutoring or tech repairs? Connect with student services.',
                    image: 'https://placehold.co/300x180?text=Services'
                },
                {
                    name: 'Watches & Jewellery',
                    title: 'Timeless Style',
                    description: 'Stylish watches and jewellery to add sophistication.',
                    image: 'https://placehold.co/300x180?text=Watches+Jewellery'
                },
                {
                    name: 'Personal Care & Beauty',
                    title: 'Glow Up for Class',
                    description: 'Discover skincare, haircare, and makeup.',
                    image: 'https://placehold.co/300x180?text=Beauty'
                },
                {
                    name: 'Food & Beverages',
                    title: 'Fuel Your Day',
                    description: 'Grab snacks, drinks, and meal kits.',
                    image: 'https://placehold.co/300x180?text=Food+Beverages'
                },
                {
                    name: 'Sports & Outdoors',
                    title: 'Stay Active',
                    description: 'Gear up for sports and outdoor adventures.',
                    image: 'https://placehold.co/300x180?text=Sports+Outdoors'
                },
                {
                    name: 'Home & Living',
                    title: 'Refresh Your Res Life',
                    description: 'Spruce up your dorm or apartment with essentials.',
                    image: 'https://placehold.co/300x240?text=Home+Living'
                }
            ];
            await Category.insertMany(sampleCategories);
            res.json(sampleCategories);
        } else {
            res.json(categories);
        }
    } catch (error) {
        console.error('Categories error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get seller's products
app.get('/api/products/my-products', authenticateToken, async (req, res) => {
    try {
        const products = await Product.find({ seller: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(products);
    } catch (error) {
        console.error('Get seller products error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update product inventory (for persistent listings)
app.put('/api/products/:productId/inventory', authenticateToken, async (req, res) => {
    try {
        const { inventory, lowStockThreshold, inventoryTracking } = req.body;
        
        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user is the seller
        if (product.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only seller can update inventory' });
        }

        // Check if product is a persistent listing
        if (product.listingType !== 'persistent') {
            return res.status(400).json({ message: 'Inventory management only available for persistent listings' });
        }

        // Update inventory fields
        if (inventory !== undefined) {
            product.inventory = Math.max(0, parseInt(inventory));
            
            // Update status based on inventory
            if (product.inventory > 0) {
                product.status = 'Active';
            } else {
                product.status = 'Out of Stock';
                product.soldAt = new Date();
            }
        }

        if (lowStockThreshold !== undefined) {
            product.lowStockThreshold = Math.max(1, parseInt(lowStockThreshold));
        }

        if (inventoryTracking !== undefined) {
            product.inventoryTracking = inventoryTracking;
        }

        product.updatedAt = new Date();
        await product.save();

        res.json({
            message: 'Inventory updated successfully',
            inventory: product.inventory,
            status: product.status,
            lowStockThreshold: product.lowStockThreshold,
            inventoryTracking: product.inventoryTracking
        });

    } catch (error) {
        console.error('Update inventory error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update product listing type (convert between one-time and persistent)
app.put('/api/products/:productId/listing-type', authenticateToken, async (req, res) => {
    try {
        const { listingType, inventory } = req.body;
        
        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user is the seller
        if (product.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only seller can update listing type' });
        }

        // Check if product is sold
        if (product.status === 'Sold') {
            return res.status(400).json({ message: 'Cannot change listing type for sold products' });
        }

        // Update listing type
        product.listingType = listingType;
        
        if (listingType === 'persistent') {
            product.inventory = inventory || 1;
            product.inventoryTracking = true;
            product.lowStockThreshold = 1;
            product.status = 'Active'; // Ensure it's active for persistent listings
        } else {
            // Convert to one-time sale
            product.inventory = 1;
            product.inventoryTracking = false;
            product.lowStockThreshold = 1;
            product.status = 'Active';
        }

        product.updatedAt = new Date();
        await product.save();

        res.json({
            message: 'Listing type updated successfully',
            listingType: product.listingType,
            inventory: product.inventory,
            status: product.status
        });

    } catch (error) {
        console.error('Update listing type error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update product stock
app.put('/api/products/:productId/stock', authenticateToken, async (req, res) => {
    try {
        const { inventory, lowStockThreshold } = req.body;
        
        const product = await Product.findById(req.params.productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user is the seller
        if (product.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only seller can update stock' });
        }

        // Update stock information
        product.inventory = parseInt(inventory) || 1;
        product.lowStockThreshold = parseInt(lowStockThreshold) || 2;
        product.updatedAt = new Date();
        
        // Update status based on stock
        if (product.inventory <= 0) {
            product.status = 'Out of Stock';
        } else if (product.status === 'Out of Stock') {
            product.status = 'Active';
        }

        await product.save();

        res.json({
            message: 'Stock updated successfully',
            inventory: product.inventory,
            lowStockThreshold: product.lowStockThreshold,
            status: product.status
        });

    } catch (error) {
        console.error('Update stock error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get product sales history
app.get('/api/products/:productId/sales', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.productId)
            .populate('salesHistory.buyer', 'fullName email');
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Check if user is the seller
        if (product.seller.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only seller can view sales history' });
        }

        res.json({
            totalSold: product.totalSold,
            salesHistory: product.salesHistory,
            currentInventory: product.inventory,
            listingType: product.listingType
        });

    } catch (error) {
        console.error('Get sales history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// --- Product Draft APIs ---

// Save or Update Draft
app.post('/api/products/draft', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const draftData = req.body;

        const draft = await ProductDraft.findOneAndUpdate(
            { user: userId },
            { data: draftData, updatedAt: new Date() },
            { upsert: true, returnDocument: 'after' }
        );

        res.json({ success: true, draft });
    } catch (error) {
        console.error('Save draft error:', error);
        res.status(500).json({ message: 'Server error saving draft' });
    }
});

// Emergency: Delete all products, transactions, and related data (for database reset)
app.delete('/api/admin/delete-all-products', authenticateToken, async (req, res) => {
    try {
        // Check if user is admin
        const user = await User.findById(req.user.userId);
        if (!user || (user.role !== 'admin' && user.role !== 'CEO' && user.isAdmin !== true && user.isAdmin !== 'true')) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        console.log('🗑️ Starting comprehensive database reset...');
        
        // Delete all data in proper order to avoid foreign key constraints
        const results = {};

        // Delete cart items first (depend on products)
        const cartsResult = await Cart.deleteMany({});
        results.cartsDeleted = cartsResult.deletedCount;
        console.log(`   Carts deleted: ${cartsResult.deletedCount}`);

        // Delete transactions (depend on products and users)
        const transactionsResult = await Transaction.deleteMany({});
        results.transactionsDeleted = transactionsResult.deletedCount;
        console.log(`   Transactions deleted: ${transactionsResult.deletedCount}`);

        // Delete products
        const productsResult = await Product.deleteMany({});
        results.productsDeleted = productsResult.deletedCount;
        console.log(`   Products deleted: ${productsResult.deletedCount}`);

        // Delete related models if they exist
        try {
            const Dispute = require('./models/Dispute');
            const disputesResult = await Dispute.deleteMany({});
            results.disputesDeleted = disputesResult.deletedCount;
            console.log(`   Disputes deleted: ${disputesResult.deletedCount}`);
        } catch (error) {
            console.log('   Disputes model not found or already empty');
        }

        try {
            const Notification = require('./models/Notification');
            const notificationsResult = await Notification.deleteMany({});
            results.notificationsDeleted = notificationsResult.deletedCount;
            console.log(`   Notifications deleted: ${notificationsResult.deletedCount}`);
        } catch (error) {
            console.log('   Notifications model not found or already empty');
        }

        // Reset user statistics that might be affected
        const userStatsResult = await User.updateMany(
            {},
            {
                $set: {
                    successfulTransactions: 0,
                    totalTransactions: 0,
                    totalSales: 0,
                    totalBuyerReviews: 0,
                    totalSellerReviews: 0,
                    buyerRating: 5.0,
                    sellerRating: 5.0
                }
            }
        );
        results.userStatsReset = userStatsResult.modifiedCount;
        console.log(`   User statistics reset: ${userStatsResult.modifiedCount} users`);

        console.log(`✅ Database reset completed successfully`);
        
        res.json({
            message: 'Database reset successfully',
            ...results
        });

    } catch (error) {
        console.error('❌ Database reset error:', error);
        res.status(500).json({ message: 'Server error during database reset' });
    }
});

// Get user's Draft
app.get('/api/products/draft', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const draft = await ProductDraft.findOne({ user: userId });

        if (!draft) {
            return res.json({ success: true, data: null });
        }

        res.json({ success: true, data: draft.data });
    } catch (error) {
        console.error('Get draft error:', error);
        res.status(500).json({ message: 'Server error retrieving draft' });
    }
});

// Delete Draft
app.delete('/api/products/draft', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        await ProductDraft.deleteOne({ user: userId });
        res.json({ success: true, message: 'Draft cleared' });
    } catch (error) {
        console.error('Delete draft error:', error);
        res.status(500).json({ message: 'Server error clearing draft' });
    }
});

// Update product
app.put('/api/products/:id', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.isSeller) {
            return res.status(403).json({ message: 'Seller access required' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.seller.toString() !== user._id.toString() && !user.isAdmin) {
            return res.status(403).json({ message: 'Can only edit your own products' });
        }

        // Extract updates from req.body
        const {
            name, description, price, originalPrice, category, subcategory,
            condition, courseCode, courseName, author, isbn,
            campusLocation, location, pickupAvailable, deliveryAvailable,
            listingType, inventory, inventoryTracking, lowStockThreshold,
            removeImages // Array of image URLs to remove
        } = req.body;

        // Apply basic fields if provided
        if (name) product.name = name.trim();
        if (description) product.description = description.trim();
        if (price) product.price = parseFloat(price);
        if (originalPrice !== undefined) product.originalPrice = originalPrice ? parseFloat(originalPrice) : null;
        if (category) product.category = category;
        if (subcategory !== undefined) product.subcategory = subcategory || '';
        if (condition) product.condition = condition;
        if (courseCode !== undefined) product.courseCode = courseCode ? courseCode.trim() : '';
        if (courseName !== undefined) product.courseName = courseName ? courseName.trim() : '';
        if (author !== undefined) product.author = author ? author.trim() : '';
        if (isbn !== undefined) product.isbn = isbn ? isbn.trim() : '';
        
        const loc = campusLocation || location;
        if (loc) product.campusLocation = loc;

        // Handle listing type and inventory
        if (listingType) {
            product.listingType = listingType === 'persistent' ? 'persistent' : 'one_time';
            if (product.listingType === 'persistent') {
                if (inventory !== undefined) product.inventory = Math.max(parseInt(inventory) || 0, 0);
                if (inventoryTracking !== undefined) product.inventoryTracking = inventoryTracking === 'true' || inventoryTracking === true;
                if (lowStockThreshold !== undefined) product.lowStockThreshold = Math.max(parseInt(lowStockThreshold) || 1, 1);
            }
        }

        // Handle delivery options
        if (pickupAvailable !== undefined || deliveryAvailable !== undefined) {
            const options = [];
            if (pickupAvailable === 'true' || pickupAvailable === true) options.push({ type: 'pickup' });
            if (deliveryAvailable === 'true' || deliveryAvailable === true) options.push({ type: 'delivery' });
            product.deliveryOptions = options;
        }

        // Handle image removal
        if (removeImages) {
            const imagesToRemove = Array.isArray(removeImages) ? removeImages : [removeImages];
            product.images = product.images.filter(img => !imagesToRemove.includes(img));
        }

        // Handle new image uploads
        if (req.files && req.files.length > 0) {
            const newImages = req.files.map(file => file.secure_url || file.path);
            product.images = [...product.images, ...newImages].slice(0, 5); // Limit to 5 images
        }

        product.updatedAt = new Date();
        await product.save();

        res.json({
            message: 'Product updated successfully',
            success: true,
            product
        });
    } catch (error) {
        console.error('Update product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete product
app.delete('/api/products/:id', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.isSeller) {
            return res.status(403).json({ message: 'Seller access required' });
        }

        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        if (product.seller.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Can only delete your own products' });
        }

        await Product.findByIdAndDelete(req.params.id);
        res.json({ message: 'Product deleted successfully' });
    } catch (error) {
        console.error('Delete product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get product details
app.get('/api/products/:id', cacheMiddleware(600), async (req, res) => {
    try {
        const productId = req.params.id;
        console.log(`🔍 Looking for product with ID: ${productId}`);
        
        // Validate ObjectId format to prevent CastError
        if (productId === 'recommendations' || !mongoose.Types.ObjectId.isValid(productId)) {
            console.log(`❌ Invalid product ID format: ${productId}`);
            return res.status(400).json({ message: 'Invalid product ID format' });
        }
        
        const product = await Product.findById(productId)
            .populate('seller', 'fullName email sellerRating totalSellerReviews storeName storeSlug');

        if (!product) {
            console.log(`❌ Product not found: ${productId}`);
            return res.status(404).json({ message: 'Product not found' });
        }

        // Log product details with ID tracking
        console.log(`✅ Product found:`, {
            _id: product._id.toString(),
            name: product.name,
            price: product.price,
            seller: product.seller?._id?.toString(),
            sellerName: product.seller?.fullName,
            status: product.status
        });

        // Increment view count
        product.viewCount += 1;
        await product.save();

        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Force refresh product data (for debugging)
app.get('/api/products/:id/refresh', authenticateToken, async (req, res) => {
    try {
        const product = await Product.findById(req.params.id);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        console.log(`🔄 Product refresh requested:`, {
            id: product._id,
            name: product.name,
            listingType: product.listingType,
            status: product.status,
            inventory: product.inventory,
            totalSold: product.totalSold,
            lastSoldAt: product.lastSoldAt
        });

        res.json({
            product,
            timestamp: new Date().toISOString()
        });

    } catch (error) {
        console.error('Product refresh error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced products endpoint with search and filter
app.get('/api/products', cacheMiddleware(300), async (req, res) => {
    try {
        const {
            category,
            subcategory,
            search,
            minPrice,
            maxPrice,
            condition,
            campusLocation,
            courseCode,
            seller,
            sort,
            page = 1,
            limit = 20
        } = req.query;

        // Build filter
        const filter = { 
            $or: [
                { status: 'Active' },
                { 
                    listingType: 'persistent', 
                    inventory: { $gt: 0 },
                    status: { $in: ['Active', 'Reserved'] }
                }
            ]
        };

        if (category) filter.category = category;
        if (subcategory) filter.subcategory = subcategory;
        if (condition) filter.condition = condition;
        if (campusLocation) filter.campusLocation = new RegExp(campusLocation, 'i');
        if (courseCode) filter.courseCode = new RegExp(courseCode, 'i');
        if (seller) filter.seller = seller;

        if (minPrice || maxPrice) {
            filter.price = {};
            if (minPrice) filter.price.$gte = parseFloat(minPrice);
            if (maxPrice) filter.price.$lte = parseFloat(maxPrice);
        }

        if (search) {
            filter.$or = [
                { name: new RegExp(search, 'i') },
                { description: new RegExp(search, 'i') },
                { category: new RegExp(search, 'i') },
                { subject: new RegExp(search, 'i') }
            ];
        }

        // Build sort options
        let sortOptions = { createdAt: -1 }; // Default: newest first
        switch (sort) {
            case 'price-low':
                sortOptions = { price: 1 };
                break;
            case 'price-high':
                sortOptions = { price: -1 };
                break;
            case 'popular':
                sortOptions = { viewCount: -1 };
                break;
            case 'rating':
                sortOptions = { sellerRating: -1 };
                break;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const products = await Product.find(filter)
            .populate('seller', 'fullName sellerRating totalSellerReviews storeName storeSlug')
            .sort(sortOptions)
            .skip(skip)
            .limit(parseInt(limit));

        // Log product retrieval with ID tracking
        console.log(`📋 Retrieved ${products.length} products`);
        products.forEach((product, index) => {
            console.log(`📦 Product ${index + 1}:`, {
                _id: product._id.toString(),
                name: product.name,
                price: product.price,
                seller: product.seller?._id?.toString(),
                sellerName: product.seller?.fullName
            });
        });

        const total = await Product.countDocuments(filter);
        const totalPages = Math.ceil(total / parseInt(limit));

        res.json({
            products,
            pagination: {
                currentPage: parseInt(page),
                totalPages,
                total,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Products search error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search suggestions endpoint
app.get('/api/search/suggestions', async (req, res) => {
    try {
        const { q } = req.query;
        console.log('🔍 Search suggestions query:', q);
        
        if (!q || q.length < 2) {
            console.log('❌ Query too short or empty');
            return res.json([]);
        }

        // Simplified search - find active products matching the query
        const products = await Product.find({
            $and: [
                { status: 'Active' }, // Only get active products for now
                {
                    $or: [
                        { name: { $regex: q, $options: 'i' } },
                        { category: { $regex: q, $options: 'i' } }
                    ]
                }
            ]
        })
        .populate('seller', 'fullName storeName')
        .limit(8)
        .select('name category price images seller _id')
        .sort({ createdAt: -1 });

        console.log(`📦 Found ${products.length} products for query "${q}"`);

        // Format suggestions
        const suggestions = products.map(product => ({
            id: product._id,
            title: product.name,
            category: product.category,
            price: product.price,
            image: product.images && product.images.length > 0 ? product.images[0] : null,
            seller: product.seller?.storeName || product.seller?.fullName
        }));

        console.log('✅ Suggestions formatted:', suggestions.length);
        res.json(suggestions);
    } catch (error) {
        console.error('❌ Search suggestions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Debug endpoint to check products
app.get('/api/debug/products', async (req, res) => {
    try {
        const totalProducts = await Product.countDocuments();
        const activeProducts = await Product.countDocuments({ status: 'Active' });
        const sampleProducts = await Product.find({ status: 'Active' })
            .limit(5)
            .select('name category price images status');
        
        res.json({
            total: totalProducts,
            active: activeProducts,
            sample: sampleProducts
        });
    } catch (error) {
        console.error('Debug products error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create transaction with escrow
app.post('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.isStudentVerified) {
            return res.status(403).json({ message: 'Student verification required' });
        }

        const { productId, deliveryMethod, deliveryAddress, paymentMethod } = req.body;

        if (!productId || !deliveryMethod || !paymentMethod) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        // Get product details
        console.log(`🔍 Transaction - Looking for product with ID: ${productId}`);
        const product = await Product.findById(productId);
        if (!product || product.status !== 'Active') {
            console.log(`❌ Transaction - Product not available: ${productId}`);
            return res.status(404).json({ message: 'Product not available' });
        }

        // Check inventory for persistent listings
        if (product.listingType === 'persistent') {
            if (product.inventory <= 0) {
                return res.status(400).json({ message: 'Product is out of stock' });
            }
        }

        // Log product details for transaction
        console.log(`✅ Transaction - Product found:`, {
            _id: product._id.toString(),
            name: product.name,
            price: product.price,
            seller: product.seller.toString(),
            buyer: user._id.toString()
        });

        if (product.seller.toString() === user._id.toString()) {
            return res.status(400).json({ message: 'Cannot buy your own product' });
        }

        // Calculate fees
        const commissionRate = 0.06; // 6% commission
        const platformFee = deliveryMethod === 'cash_on_delivery' ? 0 : product.price * commissionRate; // No commission for cash on delivery
        const deliveryFee = deliveryMethod === 'Delivery' ? 20 : 0; // K20 for delivery
        const amount = product.price + deliveryFee;
        const sellerAmount = product.price - platformFee;

        // Create transaction
        const transaction = new Transaction({
            buyer: user._id,
            seller: product.seller,
            product: product._id,
            amount,
            platformFee,
            sellerAmount,
            paymentMethod,
            deliveryMethod: deliveryMethod === 'Delivery' ? 'delivery' : 'meetup',
            deliveryAddress: deliveryMethod === 'Delivery' ? {
                name: user.fullName,
                phone: user.phoneNumber,
                address: deliveryAddress || 'Campus pickup',
                instructions: 'Deliver to campus'
            } : null,
            status: 'pending'
        });

        await transaction.save();
        
        // Log transaction creation with product ID tracking
        console.log(`💰 Transaction created:`, {
            transactionId: transaction._id.toString(),
            productId: transaction.product.toString(),
            productName: product.name,
            buyer: transaction.buyer.toString(),
            seller: transaction.seller.toString(),
            amount,
            status: transaction.status
        });

        // Update product status and inventory based on listing type
        console.log(`🔄 Processing product update:`, {
            productId: product._id,
            name: product.name,
            listingType: product.listingType,
            currentInventory: product.inventory,
            currentTotalSold: product.totalSold,
            currentStatus: product.status
        });

        if (product.listingType === 'one_time') {
            // One-time sale: mark as reserved, will be marked as sold when payment is confirmed
            product.status = 'Reserved';
            console.log(`📦 One-time sale: Status set to Reserved`);
        } else if (product.listingType === 'persistent') {
            // Persistent listing: decrement inventory
            const oldInventory = product.inventory;
            product.inventory -= 1;
            
            // Add to sales history
            product.salesHistory.push({
                buyer: user._id,
                quantity: 1,
                price: product.price,
                soldAt: new Date()
            });
            
            // Update total sold count
            product.totalSold += 1;
            
            console.log(`📦 Persistent listing updated:`, {
                oldInventory,
                newInventory: product.inventory,
                totalSold: product.totalSold,
                salesHistoryCount: product.salesHistory.length
            });
            
            // Check if out of stock
            if (product.inventory <= 0) {
                product.status = 'Out of Stock';
                product.soldAt = new Date();
                console.log(`📦 Product out of stock, status set to Out of Stock`);
            } else {
                // Check for low stock alert
                if (product.inventoryTracking && product.inventory <= product.lowStockThreshold) {
                    console.log(`📦 Low stock alert triggered: ${product.inventory} <= ${product.lowStockThreshold}`);
                }
                
                // CRITICAL FIX: Ensure persistent listings stay Active, don't set to Reserved
                product.status = 'Active'; 
                console.log(`📦 Persistent listing kept Active: ${product.name}, inventory: ${product.inventory}`);
            }
        }
        
        product.lastSoldAt = new Date();
        await product.save();

        console.log(`✅ Product saved:`, {
            productId: product._id,
            finalInventory: product.inventory,
            finalTotalSold: product.totalSold,
            finalStatus: product.status
        });

        // Send notification to seller about new order
        try {
            await notificationService.sendOrderNotification(transaction, 'new_order', product.seller);
            console.log(`🔔 New order notification sent to seller: ${product.seller}`);
        } catch (notificationError) {
            console.error('Failed to send new order notification:', notificationError);
        }

        res.status(201).json({
            transaction,
            paymentDetails: {
                totalAmount: amount,
                commissionAmount: platformFee,
                sellerPayout: sellerAmount,
                deliveryFee,
                paymentMethod,
                paymentReference: `VTX${transaction._id.toString().slice(-8).toUpperCase()}`
            }
        });
    } catch (error) {
        console.error('Create transaction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Process payment (simulate mobile money)
app.post('/api/transactions/:id/pay', authenticateToken, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('buyer seller product');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.buyer._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (transaction.paymentStatus !== 'Pending') {
            return res.status(400).json({ message: 'Payment already processed' });
        }

        const { paymentReference } = req.body;

        if (!paymentReference) {
            return res.status(400).json({ message: 'Payment reference required' });
        }

        // Simulate mobile money payment processing
        // In production, integrate with actual mobile money API
        transaction.paymentReference = paymentReference;
        transaction.paymentStatus = 'Paid';
        transaction.status = 'Confirmed';
        transaction.confirmedAt = new Date();
        await transaction.save();

        // Handle product status updates based on listing type
        if (transaction.product && transaction.product.listingType === 'one_time') {
            // One-time sale: mark product as sold
            const product = await Product.findById(transaction.product._id);
            if (product) {
                product.status = 'Sold';
                product.soldAt = new Date();
                
                // Add to sales history
                product.salesHistory.push({
                    buyer: transaction.buyer._id,
                    quantity: 1,
                    price: product.price,
                    soldAt: new Date()
                });
                
                product.totalSold += 1;
                product.lastSoldAt = new Date();
                await product.save();
            }
        } else if (transaction.product && transaction.product.listingType === 'persistent') {
            // Persistent listing: ensure product remains Active if still has inventory
            const product = await Product.findById(transaction.product._id);
            if (product) {
                // Product status should already be correct from transaction creation
                // Just ensure it's set properly based on current inventory
                if (product.inventory > 0) {
                    product.status = 'Active'; // Ensure it stays active
                } else {
                    product.status = 'Out of Stock'; // Should already be set, but ensure it
                }
                await product.save();
                console.log(`📦 Persistent listing updated: ${product.name}, inventory: ${product.inventory}, status: ${product.status}`);
            }
        }

        // Notify seller via email
        await transporter.sendMail({
            to: transaction.seller.email,
            subject: 'Virtuosa - New Order Confirmed',
            html: `
                <h2>New Order Received!</h2>
                <p>You have a new order for: ${transaction.product.name}</p>
                <p>Buyer: ${transaction.buyer.fullName}</p>
                <p>Total Amount: K${transaction.amount}</p>
                <p>Delivery Method: ${transaction.deliveryMethod}</p>
                <p>Please login to arrange delivery.</p>
            `
        });

        // Send order confirmation notification to buyer
        try {
            await notificationService.sendOrderNotification(transaction, 'order_confirmed', transaction.buyer._id);
            console.log(`🔔 Order confirmation notification sent to buyer: ${transaction.buyer._id}`);
        } catch (notificationError) {
            console.error('Failed to send order confirmation notification:', notificationError);
        }

        res.json({
            message: 'Payment processed successfully!',
            transaction
        });
    } catch (error) {
        console.error('Process payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Confirm shipment
app.post('/api/transactions/:id/ship', authenticateToken, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('buyer seller product');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.seller._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (transaction.status !== 'Confirmed') {
            return res.status(400).json({ message: 'Cannot ship unconfirmed transaction' });
        }

        const { trackingNumber } = req.body;

        transaction.status = 'Shipped';
        transaction.shippedAt = new Date();
        if (trackingNumber) {
            transaction.trackingNumber = trackingNumber;
        }
        await transaction.save();

        // Notify buyer via email
        await transporter.sendMail({
            to: transaction.buyer.email,
            subject: 'Virtuosa - Order Shipped',
            html: `
                <h2>Your Order Has Been Shipped!</h2>
                <p>Product: ${transaction.product.name}</p>
                <p>Seller: ${transaction.seller.fullName}</p>
                <p>Tracking Number: ${trackingNumber || 'Contact seller for details'}</p>
                <p>Delivery Method: ${transaction.deliveryMethod}</p>
            `
        });

        // Send order shipped notification to buyer
        try {
            await notificationService.sendOrderNotification(transaction, 'order_shipped', transaction.buyer._id);
            console.log(`🔔 Order shipped notification sent to buyer: ${transaction.buyer._id}`);
        } catch (notificationError) {
            console.error('Failed to send order shipped notification:', notificationError);
        }

        res.json({
            message: 'Order shipped successfully!',
            transaction
        });
    } catch (error) {
        console.error('Ship order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Confirm delivery and release escrow
app.post('/api/transactions/:id/confirm-delivery', authenticateToken, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('buyer seller product');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.buyer._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (transaction.status !== 'Shipped') {
            return res.status(400).json({ message: 'Cannot confirm delivery for unshipped order' });
        }

        // Update transaction
        transaction.status = 'Completed';
        transaction.deliveredAt = new Date();
        transaction.escrowReleased = true;
        transaction.escrowReleasedAt = new Date();
        await transaction.save();

        // Update product status - only for one-time sales
        const product = await Product.findById(transaction.product._id);
        if (product) {
            console.log(`🔄 Confirm delivery - Processing product:`, {
                productId: product._id,
                name: product.name,
                listingType: product.listingType,
                currentStatus: product.status,
                currentInventory: product.inventory
            });

            if (product.listingType === 'one_time') {
                // One-time sale: mark as sold
                product.status = 'Sold';
                product.soldAt = new Date();
                console.log(`📦 One-time sale marked as sold: ${product.name}`);
            } else if (product.listingType === 'persistent') {
                // Persistent listing: ensure it stays active if inventory > 0
                if (product.inventory > 0) {
                    product.status = 'Active'; // Keep it active
                    console.log(`📦 Persistent listing kept active: ${product.name}, inventory: ${product.inventory}`);
                } else {
                    product.status = 'Out of Stock';
                    product.soldAt = new Date();
                    console.log(`📦 Persistent listing out of stock: ${product.name}`);
                }
            }
            
            await product.save();
            
            console.log(`✅ Product status updated in confirm delivery:`, {
                productId: product._id,
                finalStatus: product.status,
                finalInventory: product.inventory
            });
        }

        // Update user stats
        await User.findByIdAndUpdate(transaction.buyer._id, {
            $inc: { totalTransactions: 1, successfulTransactions: 1 }
        });

        await User.findByIdAndUpdate(transaction.seller._id, {
            $inc: { totalTransactions: 1, successfulTransactions: 1 }
        });

        // Notify seller about payment release via email
        await transporter.sendMail({
            to: transaction.seller.email,
            subject: 'Virtuosa - Payment Released',
            html: `
                <h2>Payment Released!</h2>
                <p>The payment for your order has been released to your account.</p>
                <p>Product: ${transaction.product.name}</p>
                <p>Amount: K${transaction.sellerPayout}</p>
                <p>Thank you for using Virtuosa!</p>
            `
        });

        // Send delivery confirmed notification to seller
        try {
            await notificationService.sendOrderNotification(transaction, 'delivery_confirmed', transaction.seller._id);
            console.log(`🔔 Delivery confirmed notification sent to seller: ${transaction.seller._id}`);
        } catch (notificationError) {
            console.error('Failed to send delivery confirmed notification:', notificationError);
        }

        // Send order delivered notification to buyer
        try {
            await notificationService.sendOrderNotification(transaction, 'order_delivered', transaction.buyer._id);
            console.log(`🔔 Order delivered notification sent to buyer: ${transaction.buyer._id}`);
        } catch (notificationError) {
            console.error('Failed to send order delivered notification:', notificationError);
        }

        res.json({
            message: 'Delivery confirmed! Payment released to seller.',
            transaction
        });
    } catch (error) {
        console.error('Confirm delivery error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Raise dispute
app.post('/api/transactions/:id/dispute', authenticateToken, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .populate('buyer seller');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        const user = await User.findById(req.user.userId);
        if (transaction.buyer._id.toString() !== user._id.toString() &&
            transaction.seller._id.toString() !== user._id.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        if (transaction.disputeStatus !== 'None') {
            return res.status(400).json({ message: 'Dispute already raised' });
        }

        const { disputeReason } = req.body;

        if (!disputeReason) {
            return res.status(400).json({ message: 'Dispute reason required' });
        }

        transaction.disputeReason = disputeReason;
        transaction.disputeStatus = 'Open';
        await transaction.save();

        // Notify admin and other party
        await transporter.sendMail({
            to: process.env.ADMIN_EMAIL || 'admin@virtuosa.com',
            subject: 'Virtuosa - New Dispute Raised',
            html: `
                <h2>New Dispute Raised</h2>
                <p>Transaction ID: ${transaction._id}</p>
                <p>Raised by: ${user.fullName}</p>
                <p>Reason: ${disputeReason}</p>
                <p>Please review and resolve this dispute.</p>
            `
        });

        res.json({
            message: 'Dispute raised successfully. We will review and resolve it soon.',
            transaction
        });
    } catch (error) {
        console.error('Raise dispute error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user role information
app.get('/api/user/role-info', authenticateToken, async (req, res) => {
    try {
        const roleInfo = await getUserRoleInfo(req.user.userId);
        if (!roleInfo) {
            return res.status(404).json({ message: 'User not found' });
        }
        
        console.log('🔐 User role info:', {
            userId: req.user.userId,
            effectiveRole: roleInfo.effectiveRole,
            title: roleInfo.title
        });
        
        res.json(roleInfo);
    } catch (error) {
        console.error('Role info error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get unread notifications count
app.get('/api/notifications/unread-count', authenticateToken, async (req, res) => {
    try {
        const unreadCount = await Notification.countDocuments({
            recipient: req.user.userId,
            read: false
        });
        res.json({ unreadCount });
    } catch (error) {
        console.error('Unread notifications count error:', error);
        res.json({ unreadCount: 0 });
    }
});

// Get product recommendations
app.get('/api/products/recommendations', authenticateToken, async (req, res) => {
    try {
        console.log('🔍 Fetching recommendations...');
        const recommendations = await Product.find({ status: 'Active' })
            .sort({ isFeatured: -1, createdAt: -1 })
            .limit(4);
        res.json(recommendations || []);
    } catch (error) {
        console.error('❌ Recommendations error:', error);
        res.status(200).json([]); // Return empty array on error but 200 to keep UI clean
    }
});

// Get buyer orders
app.get('/api/buyer/orders', authenticateToken, checkDashboardAccess('buyer'), async (req, res) => {
    try {
        const orders = await Transaction.find({ buyer: req.user.userId })
            .populate('seller', 'fullName email')
            .populate('product', 'name price images')
            .sort({ createdAt: -1 });
        res.json(orders || []);
    } catch (error) {
        console.error('Buyer orders error:', error);
        res.json([]);
    }
});

// Get buyer spending history for chart
app.get('/api/buyer/spending-chart', authenticateToken, checkDashboardAccess('buyer'), async (req, res) => {
    try {
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const spending = await Transaction.aggregate([
            {
                $match: {
                    buyer: new mongoose.Types.ObjectId(req.user.userId),
                    status: { $in: ['completed', 'Completed'] },
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const labels = [];
        const values = [];
        
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            const label = date.toLocaleString('default', { month: 'short' });
            const key = date.toISOString().slice(0, 7); 
            
            labels.push(label);
            const dataPoint = spending.find(s => s._id === key);
            values.push(dataPoint ? dataPoint.total : 0);
        }

        res.json({ labels, values });
    } catch (error) {
        console.error('Spending chart error:', error);
        res.json({ labels: [], values: [] });
    }
});

// Get buyer dashboard data
app.get('/api/buyer/dashboard', authenticateToken, checkDashboardAccess('buyer'), async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        console.log('📊 Buyer dashboard access:', {
            userId: user._id,
            effectiveRole: req.effectiveRole,
            email: user.email
        });

        // Get buyer's transactions
        const transactions = await Transaction.find({ buyer: user._id })
            .populate('seller', 'fullName email')
            .populate('product', 'name price images')
            .sort({ createdAt: -1 })
            .limit(10);

        // Calculate order statistics
        const orderStats = {
            totalOrders: await Transaction.countDocuments({ buyer: user._id }),
            pendingOrders: await Transaction.countDocuments({ 
                buyer: user._id, 
                status: { $in: ['pending_seller_confirmation', 'confirmed_by_seller'] }
            }),
            completedOrders: await Transaction.countDocuments({ 
                buyer: user._id, 
                status: 'completed' 
            }),
            totalSpent: transactions
                .filter(t => t.status === 'completed')
                .reduce((sum, t) => sum + (t.amount || 0), 0)
        };

        console.log('📊 Buyer dashboard data loaded:', {
            userId: user._id,
            transactionsCount: transactions.length,
            orderStats
        });

        // Get spending history for chart (last 6 months)
        const sixMonthsAgo = new Date();
        sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
        sixMonthsAgo.setDate(1);
        sixMonthsAgo.setHours(0, 0, 0, 0);

        const spending = await Transaction.aggregate([
            {
                $match: {
                    buyer: new mongoose.Types.ObjectId(req.user.userId),
                    status: { $in: ['completed', 'Completed'] },
                    createdAt: { $gte: sixMonthsAgo }
                }
            },
            {
                $group: {
                    _id: { $dateToString: { format: "%Y-%m", date: "$createdAt" } },
                    total: { $sum: "$amount" }
                }
            },
            { $sort: { "_id": 1 } }
        ]);

        const spendingLabels = [];
        const spendingValues = [];
        for (let i = 0; i < 6; i++) {
            const date = new Date();
            date.setMonth(date.getMonth() - (5 - i));
            const label = date.toLocaleString('default', { month: 'short' });
            const key = date.toISOString().slice(0, 7);
            
            spendingLabels.push(label);
            const dataPoint = spending.find(s => s._id === key);
            spendingValues.push(dataPoint ? dataPoint.total : 0);
        }

        // Get recommendations
        const recommendations = await Product.find({ status: 'Active' })
            .sort({ isFeatured: -1, createdAt: -1 })
            .limit(4);

        res.json({
            buyer: {
                name: user.fullName,
                email: user.email,
                isStudentVerified: user.isStudentVerified,
                memberSince: user.createdAt,
                tokenBalance: user.tokenBalance || 0,
                totalTokensEarned: user.totalTokensEarned || 0,
                totalTokensRedeemed: user.totalTokensRedeemed || 0
            },
            recentOrders: transactions || [],
            orderStats,
            spendingHistory: {
                labels: spendingLabels,
                values: spendingValues
            },
            recommendations: recommendations || []
        });
    } catch (error) {
        console.error('Buyer dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin middleware
function authenticateAdmin(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }

        try {
            const userDoc = await User.findById(user.userId);
            if (!userDoc || (
                userDoc.role !== 'admin' &&
                userDoc.role !== 'CEO' &&
                userDoc.isAdmin !== true &&
                userDoc.isAdmin !== 'true'
            )) {
                return res.status(403).json({ message: 'Admin access required' });
            }

            req.user = user;
            next();
        } catch (dbErr) {
            console.error('authenticateAdmin DB error:', dbErr.message);
            return res.status(500).json({ message: 'Server error during admin check' });
        }
    });
}

// Admin dashboard KPIs
app.get('/api/admin/dashboard', authenticateAdmin, async (req, res) => {
    try {
        const { period = '30' } = req.query; // Default to last 30 days
        const daysAgo = new Date();
        daysAgo.setDate(daysAgo.getDate() - parseInt(period));

        // User statistics
        const totalUsers = await User.countDocuments();
        const verifiedStudents = await User.countDocuments({ isStudentVerified: true });
        const totalSellers = await User.countDocuments({ isSeller: true });
        const verifiedSellers = await User.countDocuments({ sellerVerified: true });
        const proSellers = await User.countDocuments({ isProSeller: true });

        // Calculate buyer to seller ratio
        const buyerToSellerRatio = totalSellers > 0 ? (totalUsers / totalSellers).toFixed(2) : 'N/A';

        // Seller activation rate
        const sellerActivationRate = totalSellers > 0 ? ((verifiedSellers / totalSellers) * 100).toFixed(2) : '0';

        // Transaction statistics
        const totalTransactions = await Transaction.countDocuments({ createdAt: { $gte: daysAgo } });
        const completedTransactions = await Transaction.countDocuments({
            status: 'Completed',
            createdAt: { $gte: daysAgo }
        });
        const transactionSuccessRate = totalTransactions > 0 ? ((completedTransactions / totalTransactions) * 100).toFixed(2) : '0';

        // Revenue statistics
        const transactionsItems = await Transaction.find({
            status: 'Completed',
            createdAt: { $gte: daysAgo }
        });
        const totalCommissionRevenue = transactionsItems.reduce((sum, t) => sum + (t.platformFee || 0), 0);
        const subscriptionRevenue = await Subscription.aggregate([
            { $match: { isActive: true, createdAt: { $gte: daysAgo } } },
            { $group: { _id: null, total: { $sum: '$monthlyFee' } } }
        ]);
        const verificationRevenue = await User.countDocuments({
            sellerVerificationDate: { $gte: daysAgo }
        }) * 30; // K30 per verification

        const totalSubscriptionRevenue = subscriptionRevenue[0]?.total || 0;
        const totalVerificationRevenue = verificationRevenue;
        const totalAllRevenue = totalCommissionRevenue + totalSubscriptionRevenue + totalVerificationRevenue;

        // Product statistics
        const totalProducts = await Product.countDocuments({ createdAt: { $gte: daysAgo } });
        const soldProducts = await Product.countDocuments({
            status: 'Sold',
            soldAt: { $gte: daysAgo }
        });

        // Dispute statistics
        const totalDisputes = await Transaction.countDocuments({
            disputeStatus: 'Open',
            createdAt: { $gte: daysAgo }
        });
        const resolvedDisputes = await Transaction.countDocuments({
            disputeStatus: 'Resolved',
            createdAt: { $gte: daysAgo }
        });

        // Monthly active users (simplified - users with transactions in period)
        const activeUsersList = await Transaction.distinct('buyer', {
            createdAt: { $gte: daysAgo }
        });
        const activeUsers = activeUsersList.length;

        // Top sellers
        const topSellers = await User.aggregate([
            { $match: { isSeller: true, sellerVerified: true } },
            {
                $lookup: {
                    from: 'transactions',
                    localField: '_id',
                    foreignField: 'seller',
                    as: 'transactions'
                }
            },
            // preserveNullAndEmptyArrays keeps sellers with 0 transactions
            { $unwind: { path: '$transactions', preserveNullAndEmptyArrays: true } },
            {
                $group: {
                    _id: '$_id',
                    // Bare field references are INVALID in $group — must use $first
                    name: { $first: '$fullName' },
                    email: { $first: '$email' },
                    totalRevenue: {
                        $sum: {
                            $cond: [
                                { $eq: ['$transactions.status', 'Completed'] },
                                { $ifNull: ['$transactions.sellerPayout', 0] },
                                0
                            ]
                        }
                    },
                    transactionCount: {
                        $sum: {
                            $cond: [
                                { $eq: ['$transactions.status', 'Completed'] },
                                1,
                                0
                            ]
                        }
                    },
                    rating: { $first: '$sellerRating' },
                    totalReviews: { $first: '$totalSellerReviews' }
                }
            },
            { $sort: { totalRevenue: -1 } },
            { $limit: 10 }
        ]);

        // Recent transactions
        const recentTransactions = await Transaction.find({})
            .populate('buyer seller product')
            .sort({ createdAt: -1 })
            .limit(10);

        // Daily revenue for chart
        const dailyRevenue = await Transaction.aggregate([
            { $match: { status: 'Completed', createdAt: { $gte: daysAgo } } },
            {
                $group: {
                    _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
                    revenue: { $sum: '$platformFee' },
                    count: { $sum: 1 }
                }
            },
            { $sort: { _id: 1 } }
        ]);

        // New Metrics
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        const newUsers24hCount = await User.countDocuments({ createdAt: { $gte: yesterday } });
        const pendingAppsCount = await User.countDocuments({ sellerApplicationStatus: 'Pending' });
        const activeProductsCount = await Product.countDocuments({ status: 'Active' });

        // Calculate Average Transaction Value (Gross revenue / Transaction count)
        const totalGrossRevenue = transactionsItems.reduce((sum, t) => sum + (t.amount || 0), 0);
        const avgTransactionValue = transactionsItems.length > 0 ? (totalGrossRevenue / transactionsItems.length).toFixed(2) : '0.00';

        res.json({
            period: `${period} days`,
            userStats: {
                totalUsers,
                verifiedStudents,
                totalSellers,
                verifiedSellers,
                proSellers,
                buyerToSellerRatio,
                sellerActivationRate,
                activeUsers,
                newUsers24hCount,
                pendingAppsCount
            },
            transactionStats: {
                totalTransactions,
                completedTransactions,
                transactionSuccessRate,
                totalDisputes,
                resolvedDisputes,
                avgTransactionValue
            },
            revenueStats: {
                totalCommissionRevenue,
                totalSubscriptionRevenue,
                totalVerificationRevenue,
                totalAllRevenue,
                totalGrossRevenue
            },
            productStats: {
                totalProducts,
                soldProducts,
                activeProductsCount
            },
            topSellers,
            recentTransactions,
            dailyRevenue
        });
    } catch (error) {
        console.error('[Dashboard] Fatal Error:', error);
        res.status(500).json({ message: 'Server error loading dashboard data', error: error.message });
    }
});

// Get all users (admin)
app.get('/api/admin/users', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, search, role, verified } = req.query;

        let filter = {};

        if (search) {
            filter.$or = [
                { fullName: new RegExp(search, 'i') },
                { email: new RegExp(search, 'i') },
                { university: new RegExp(search, 'i') }
            ];
        }

        if (role === 'seller') {
            filter.isSeller = true;
        } else if (role === 'buyer') {
            filter.isBuyer = true;
            filter.isSeller = false;
        }

        if (verified === 'true') {
            filter.isStudentVerified = true;
        } else if (verified === 'false') {
            filter.isStudentVerified = false;
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const users = await User.find(filter)
            .select('-password -resetPasswordToken -resetPasswordExpires')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await User.countDocuments(filter);

        res.json({
            users,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get users error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user analytics (admin)
app.get('/api/admin/user-analytics', authenticateToken, checkRoleAccess('user_analytics'), async (req, res) => {
    try {
        const { period = '30' } = req.query;
        const daysAgo = new Date();
        
        if (period !== 'all') {
            daysAgo.setDate(daysAgo.getDate() - parseInt(period));
        }

        // Basic user counts
        const totalUsers = await User.countDocuments();
        const verifiedStudents = await User.countDocuments({ isStudentVerified: true });
        const totalSellers = await User.countDocuments({ isSeller: true });
        const proSellers = await User.countDocuments({ isProSeller: true });
        const totalBuyers = totalUsers - totalSellers;

        // Active users (logged in within last 30 days)
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const activeUsers = await User.countDocuments({
            lastLogin: { $gte: thirtyDaysAgo }
        });

        // New users in the last 30 days
        const newUsers30Days = await User.countDocuments({
            createdAt: { $gte: thirtyDaysAgo }
        });

        // Previous period for growth calculations
        const previousPeriodStart = new Date(thirtyDaysAgo);
        previousPeriodStart.setDate(previousPeriodStart.getDate() - 30);
        const previousPeriodEnd = new Date(thirtyDaysAgo);

        const previousPeriodUsers = await User.countDocuments({
            createdAt: { $gte: previousPeriodStart, $lt: previousPeriodEnd }
        });

        // Calculate growth rates
        const userGrowthRate = previousPeriodUsers > 0 
            ? ((newUsers30Days - previousPeriodUsers) / previousPeriodUsers * 100).toFixed(1)
            : 0;

        // Simulated site visits (in a real app, this would come from analytics tracking)
        const siteVisits = totalUsers * 12.5; // Estimate: 12.5 visits per user
        const visitsGrowthRate = 15.7; // Simulated growth

        // User growth over time (daily)
        let userGrowthData = [];
        const daysToShow = period === 'all' ? 30 : parseInt(period);
        
        for (let i = daysToShow - 1; i >= 0; i--) {
            const date = new Date();
            date.setDate(date.getDate() - i);
            const nextDate = new Date(date);
            nextDate.setDate(nextDate.getDate() + 1);
            
            const count = await User.countDocuments({
                createdAt: { $gte: date, $lt: nextDate }
            });
            
            userGrowthData.push({
                date: date.toISOString().split('T')[0],
                count
            });
        }

        // University distribution
        const universityDistribution = await User.aggregate([
            { $match: { university: { $ne: null, $ne: '' } } },
            { $group: { _id: '$university', count: { $sum: 1 } } },
            { $sort: { count: -1 } },
            { $limit: 10 }
        ]);

        // Format university data
        const formattedUniversityDistribution = universityDistribution.map(item => ({
            university: item._id,
            count: item.count
        }));

        // Calculate percentages
        const activeUsersPercentage = totalUsers > 0 
            ? (activeUsers / totalUsers * 100).toFixed(1)
            : 0;

        const verifiedStudentsPercentage = totalUsers > 0 
            ? (verifiedStudents / totalUsers * 100).toFixed(1)
            : 0;

        const sellerPercentage = totalUsers > 0 
            ? (totalSellers / totalUsers * 100).toFixed(1)
            : 0;

        const proSellerPercentage = totalSellers > 0 
            ? (proSellers / totalSellers * 100).toFixed(1)
            : 0;

        // Simulated average session time
        const avgSessionTime = '4m 32s';

        res.json({
            totalUsers,
            activeUsers,
            newUsers30Days,
            siteVisits: Math.round(siteVisits),
            userGrowthRate: parseFloat(userGrowthRate),
            activeUsersPercentage: parseFloat(activeUsersPercentage),
            newUserGrowthRate: userGrowthRate,
            visitsGrowthRate,
            verifiedStudents,
            totalSellers,
            proSellers,
            avgSessionTime,
            verifiedStudentsPercentage: parseFloat(verifiedStudentsPercentage),
            sellerPercentage: parseFloat(sellerPercentage),
            proSellerPercentage: parseFloat(proSellerPercentage),
            totalBuyers,
            userGrowthData,
            universityDistribution: formattedUniversityDistribution
        });
    } catch (error) {
        console.error('Get user analytics error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user transactions (buyer dashboard)
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 5, status, type } = req.query;
        const userId = req.user.userId;

        let filter = {};
        
        // Handle transaction type (buying, selling, or all)
        if (type === 'buying') {
            filter.buyer = userId;
        } else if (type === 'selling') {
            filter.seller = userId;
        } else if (type === 'all') {
            filter = { $or: [{ buyer: userId }, { seller: userId }] };
        } else {
            // Default to both sides so sellers can view their selling transactions too.
            filter = { $or: [{ buyer: userId }, { seller: userId }] };
        }

        if (status) filter.status = status;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // Security: Exclude sensitive fields from the result
        const transactions = await Transaction.find(filter)
            .select('-protection -adminNotes -metadata -confirmations.buyer.ipAddress -confirmations.buyer.userAgent -confirmations.seller.ipAddress -confirmations.seller.userAgent')
            .populate('buyer', 'fullName email university')
            .populate('seller', 'fullName email university')
            .populate('product', 'name images price category condition')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(filter);

        // Filter messages to exclude internal admin messages
        const filteredTransactions = transactions.map(txn => {
            const txnObj = txn.toObject();
            if (txnObj.messages) {
                txnObj.messages = txnObj.messages.filter(m => !m.isInternal);
            }
            return txnObj;
        });

        res.json({
            transactions: filteredTransactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get user transactions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get individual transaction details
app.get('/api/transactions/:id', authenticateToken, async (req, res) => {
    try {
        const transaction = await Transaction.findById(req.params.id)
            .select('-protection -adminNotes -metadata -confirmations.buyer.ipAddress -confirmations.buyer.userAgent -confirmations.seller.ipAddress -confirmations.seller.userAgent')
            .populate('buyer', 'fullName email university campusLocation')
            .populate('seller', 'fullName email university campusLocation')
            .populate('product', 'name images price description category conditionListingType inventory tracking');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        // Check if user is part of the transaction
        const userId = req.user.userId;
        if (transaction.buyer._id.toString() !== userId && transaction.seller._id.toString() !== userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        // Filter internal messages before sending response
        const txnObj = transaction.toObject();
        if (txnObj.messages) {
            txnObj.messages = txnObj.messages.filter(m => !m.isInternal);
        }

        res.json(txnObj);
    } catch (error) {
        console.error('Get transaction details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get all transactions (admin)
app.get('/api/admin/transactions', authenticateAdmin, async (req, res) => {
    try {
        const { page = 1, limit = 20, status, disputeStatus } = req.query;

        let filter = {};

        if (status) filter.status = status;
        if (disputeStatus) filter.disputeStatus = disputeStatus;

        const skip = (parseInt(page) - 1) * parseInt(limit);

        const transactions = await Transaction.find(filter)
            .populate('buyer seller product')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));

        const total = await Transaction.countDocuments(filter);

        res.json({
            transactions,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / parseInt(limit)),
                total,
                limit: parseInt(limit)
            }
        });
    } catch (error) {
        console.error('Get transactions error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Resolve dispute
app.post('/api/admin/disputes/:id/resolve', authenticateToken, checkRoleAccess('disputes'), async (req, res) => {
    try {
        const { resolution, winner } = req.body;

        if (!resolution) {
            return res.status(400).json({ message: 'Resolution required' });
        }

        const transaction = await Transaction.findById(req.params.id)
            .populate('buyer seller product');

        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.disputeStatus !== 'Open') {
            return res.status(400).json({ message: 'Dispute is not open' });
        }

        transaction.disputeStatus = 'Resolved';
        transaction.disputeResolution = resolution;

        // Handle refund if buyer wins
        if (winner === 'buyer') {
            transaction.status = 'Cancelled';
            transaction.paymentStatus = 'Refunded';

            // Update product status back to active
            await Product.findByIdAndUpdate(transaction.product._id, { status: 'Active' });
        } else if (winner === 'seller') {
            // Release payment to seller
            transaction.status = 'Completed';
            transaction.escrowReleased = true;
            transaction.escrowReleasedAt = new Date();

            // Update product status to sold
            await Product.findByIdAndUpdate(transaction.product._id, {
                status: 'Sold',
                soldAt: new Date()
            });
        }

        await transaction.save();

        // Notify both parties
        await transporter.sendMail({
            to: transaction.buyer.email,
            subject: 'Virtuosa - Dispute Resolved',
            html: `
                <h2>Dispute Resolved</h2>
                <p>Your dispute for transaction ${transaction._id} has been resolved.</p>
                <p>Resolution: ${resolution}</p>
                <p>Winner: ${winner}</p>
            `
        });

        await transporter.sendMail({
            to: transaction.seller.email,
            subject: 'Virtuosa - Dispute Resolved',
            html: `
                <h2>Dispute Resolved</h2>
                <p>Your dispute for transaction ${transaction._id} has been resolved.</p>
                <p>Resolution: ${resolution}</p>
                <p>Winner: ${winner}</p>
            `
        });

        res.json({
            message: 'Dispute resolved successfully',
            transaction
        });
    } catch (error) {
        console.error('Resolve dispute error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Middleware to verify JWT token
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access token required' });
    }

    jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: 'Invalid or expired token' });
        }
        req.user = user;
        next();
    });
}

// Get user profile
app.get('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('-password -resetPasswordToken -resetPasswordExpires');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }
        res.json(user);
    } catch (error) {
        console.error('Get profile error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update user profile
app.put('/api/user/profile', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const {
            fullName,
            phoneNumber,
            university,
            campusLocation,
            yearOfStudy,
            faculty,
            studentId,
            bio
        } = req.body;

        // Update allowed fields
        if (fullName) user.fullName = fullName;
        if (phoneNumber) user.phoneNumber = phoneNumber;
        if (university) user.university = university;
        if (campusLocation) user.campusLocation = campusLocation;
        if (yearOfStudy) user.yearOfStudy = yearOfStudy;
        if (faculty) user.faculty = faculty;
        if (studentId) user.studentId = studentId;
        if (bio) user.bio = bio;

        await user.save();
        res.json({ message: 'Profile updated successfully', user });
    } catch (error) {
        console.error('Profile update error:', error);
        res.status(500).json({ message: 'Failed to update profile' });
    }
});

// Rate limiting middleware
const rateLimit = require('express-rate-limit');

// Rate limit for account deletion requests (1 request per hour per user)
const deletionRequestRateLimit = rateLimit({
    windowMs: 60 * 60 * 1000, // 1 hour
    max: 1, // limit each IP to 1 request per windowMs
    message: { message: 'Too many deletion requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Request account deletion
app.post('/api/user/request-account-deletion', deletionRequestRateLimit, authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        let { reason } = req.body;

        // Input validation
        if (reason && typeof reason !== 'string') {
            return res.status(400).json({ message: 'Invalid reason format' });
        }
        
        if (reason && reason.length > 1000) {
            return res.status(400).json({ message: 'Reason too long (max 1000 characters)' });
        }

        // Sanitize reason to prevent XSS
        if (reason) {
            reason = reason.replace(/<script[^>]*>.*?<\/script>/gi, '')
                        .replace(/<[^>]*>?/gm, '')
                        .trim();
        }

        // Check if user already has a pending deletion request
        const existingRequest = await AccountDeletionRequest.findOne({
            user: userId,
            status: 'Pending'
        });

        if (existingRequest) {
            return res.status(400).json({ 
                message: 'You already have a pending account deletion request' 
            });
        }

        // Create new deletion request
        const deletionRequest = new AccountDeletionRequest({
            user: userId,
            reason: reason || 'User requested account deletion'
        });

        await deletionRequest.save();

        // Log the request for admin monitoring
        console.log(`🗑️ Account deletion request submitted by user ${userId}`);

        res.json({ 
            message: 'Account deletion request submitted successfully. Awaiting admin approval.',
            requestId: deletionRequest._id
        });
    } catch (error) {
        console.error('Account deletion request error:', error);
        res.status(500).json({ message: 'Failed to submit deletion request' });
    }
});

// Remove profile picture
app.delete('/api/user/profile-picture', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Remove file from disk if exists
        if (user.profilePicture) {
            const filePath = path.join(__dirname, '../client', user.profilePicture);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }
        }

        // Update user profile picture
        user.profilePicture = undefined;
        await user.save();

        res.json({ message: 'Profile picture removed successfully' });
    } catch (error) {
        console.error('Remove profile picture error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced Notification API Endpoints

// Rate limiting for notification endpoints
const notificationRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per windowMs
    message: { message: 'Too many notification requests, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

const notificationActionRateLimit = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 50, // Limit each IP to 50 action requests per windowMs
    message: { message: 'Too many notification actions, please try again later.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// Input validation middleware
function validateNotificationInput(req, res, next) {
    const { title, message, type, priority } = req.body;
    
    if (title && (typeof title !== 'string' || title.length > 100 || title.trim().length === 0)) {
        return res.status(400).json({ message: 'Invalid title. Must be a string between 1 and 100 characters.' });
    }
    
    if (message && (typeof message !== 'string' || message.length > 500 || message.trim().length === 0)) {
        return res.status(400).json({ message: 'Invalid message. Must be a string between 1 and 500 characters.' });
    }
    
    if (type && !['new_order', 'order_confirmed', 'order_shipped', 'order_delivered', 'delivery_confirmed', 
                   'payment_received', 'payment_failed', 'product_approved', 'product_rejected', 
                   'account_verified', 'promotion', 'system', 'message', 'review_received', 'token_earned'].includes(type)) {
        return res.status(400).json({ message: 'Invalid notification type.' });
    }
    
    if (priority && !['low', 'normal', 'high', 'critical'].includes(priority)) {
        return res.status(400).json({ message: 'Invalid priority level.' });
    }
    
    next();
}

function validatePagination(req, res, next) {
    const { page, limit } = req.query;
    
    if (page && (isNaN(page) || parseInt(page) < 1 || parseInt(page) > 1000)) {
        return res.status(400).json({ message: 'Invalid page number. Must be between 1 and 1000.' });
    }
    
    if (limit && (isNaN(limit) || parseInt(limit) < 1 || parseInt(limit) > 100)) {
        return res.status(400).json({ message: 'Invalid limit. Must be between 1 and 100.' });
    }
    
    next();
}

// Get user notifications with pagination and filtering
app.get('/api/notifications', authenticateToken, notificationRateLimit, validatePagination, async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'all' } = req.query;
        const notifications = await notificationService.getNotifications(
            req.user.userId, 
            { 
                page: parseInt(page), 
                limit: parseInt(limit), 
                status 
            }
        );
        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get notification counts
app.get('/api/notifications/counts', authenticateToken, notificationRateLimit, async (req, res) => {
    try {
        const counts = await notificationService.getNotificationCounts(req.user.userId);
        res.json(counts);
    } catch (error) {
        console.error('Get notification counts error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark notification(s) as read
app.put('/api/notifications/read', authenticateToken, notificationActionRateLimit, async (req, res) => {
    try {
        const { notificationIds } = req.body; // Optional array of specific notification IDs
        await notificationService.markAsRead(req.user.userId, notificationIds);
        
        // Return updated counts
        const counts = await notificationService.getNotificationCounts(req.user.userId);
        res.json({ 
            message: 'Notifications marked as read',
            counts 
        });
    } catch (error) {
        console.error('Mark notifications read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark single notification as read (for backward compatibility)
app.put('/api/notifications/:id/read', authenticateToken, notificationActionRateLimit, async (req, res) => {
    try {
        await notificationService.markAsRead(req.user.userId, [req.params.id]);
        
        // Return updated counts
        const counts = await notificationService.getNotificationCounts(req.user.userId);
        res.json({ 
            message: 'Notification marked as read',
            counts 
        });
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete notification
app.delete('/api/notifications/:id', authenticateToken, notificationActionRateLimit, async (req, res) => {
    try {
        const notification = await Notification.findOneAndDelete({
            _id: req.params.id,
            recipient: req.user.userId
        });
        
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        
        // Return updated counts
        const counts = await notificationService.getNotificationCounts(req.user.userId);
        res.json({ 
            message: 'Notification deleted',
            counts 
        });
    } catch (error) {
        console.error('Delete notification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Delete all read notifications
app.delete('/api/notifications/read', authenticateToken, notificationActionRateLimit, async (req, res) => {
    try {
        const result = await Notification.deleteMany({
            recipient: req.user.userId,
            status: 'read'
        });
        
        res.json({ 
            message: 'Read notifications deleted successfully',
            deletedCount: result.deletedCount
        });
    } catch (error) {
        console.error('Delete read notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Push Notification Endpoints

// Subscribe to push notifications
app.post('/api/notifications/subscribe', authenticateToken, notificationActionRateLimit, async (req, res) => {
    try {
        const { subscription } = req.body;
        
        if (!subscription || !subscription.endpoint) {
            return res.status(400).json({ message: 'Invalid subscription data' });
        }

        // Store subscription in user document
        await User.findByIdAndUpdate(req.user.userId, {
            pushSubscription: subscription,
            pushSubscriptionEnabled: true
        });

        console.log(`📱 User ${req.user.userId} subscribed to push notifications`);
        
        // Send a test push notification to confirm subscription
        try {
            await webpush.sendNotification(
                subscription,
                JSON.stringify({
                    title: 'Notifications Enabled! 🎉',
                    body: 'You will now receive real-time notifications from Virtuosa',
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: 'welcome-push'
                })
            );
        } catch (pushError) {
            console.error('Test push notification failed:', pushError);
        }

        res.json({ message: 'Successfully subscribed to push notifications' });
    } catch (error) {
        console.error('Push subscription error:', error);
        res.status(500).json({ message: 'Failed to subscribe to push notifications' });
    }
});

// Unsubscribe from push notifications
app.post('/api/notifications/unsubscribe', authenticateToken, notificationActionRateLimit, async (req, res) => {
    try {
        await User.findByIdAndUpdate(req.user.userId, {
            pushSubscription: null,
            pushSubscriptionEnabled: false
        });

        console.log(`📱 User ${req.user.userId} unsubscribed from push notifications`);
        
        res.json({ message: 'Successfully unsubscribed from push notifications' });
    } catch (error) {
        console.error('Push unsubscription error:', error);
        res.status(500).json({ message: 'Failed to unsubscribe from push notifications' });
    }
});

// Get VAPID public key for client
app.get('/api/notifications/vapid-public-key', (req, res) => {
    res.json({ publicKey: vapidKeys.publicKey });
});

// User notification preferences
app.get('/api/notifications/preferences', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId).select('notificationPreferences pushSubscriptionEnabled');
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.json({
            notificationPreferences: user.notificationPreferences || {
                orderUpdates: true,
                promotions: true,
                messages: true,
                system: true,
                pushEnabled: Boolean(user.pushSubscriptionEnabled)
            },
            pushSubscriptionEnabled: Boolean(user.pushSubscriptionEnabled)
        });
    } catch (error) {
        console.error('Get notification preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

app.put('/api/notifications/preferences', authenticateToken, async (req, res) => {
    try {
        const { notificationPreferences, pushSubscriptionEnabled } = req.body;

        await User.findByIdAndUpdate(req.user.userId, {
            notificationPreferences: notificationPreferences || {},
            pushSubscriptionEnabled: pushSubscriptionEnabled === true
        }, { new: true });

        res.json({ message: 'Notification preferences updated' });
    } catch (error) {
        console.error('Update notification preferences error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Broadcast notification to all buyers/sellers/admins
app.post('/api/notifications/broadcast', authenticateToken, notificationActionRateLimit, async (req, res) => {
    try {
        // Only admin/super roles can broadcast
        const requestingUser = await User.findById(req.user.userId);
        if (!requestingUser || !['admin', 'CEO', 'support_lead', 'strategy_growth_lead'].includes(requestingUser.role)) {
            return res.status(403).json({ message: 'Unauthorized' });
        }

        const { targetRole = 'all', type = 'system', title, message, data = {}, priority = 'normal', channels = ['websocket', 'push'] } = req.body;

        if (!title || !message) {
            return res.status(400).json({ message: 'Title and message are required' });
        }

        const roleQuery = targetRole === 'seller' ? { isSeller: true }
            : targetRole === 'buyer' ? { isBuyer: true }
            : {};

        const recipients = await User.find(roleQuery).select('_id pushSubscriptionEnabled');
        const recipientIds = recipients.map(u => u._id.toString());

        const results = await notificationService.sendBulkNotifications({
            recipientIds,
            type,
            title,
            message,
            data,
            priority,
            channels
        });

        res.json({
            message: `Broadcast sent to ${recipientIds.length} users`,
            results
        });
    } catch (error) {
        console.error('Broadcast notification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send test push notification (for development)
app.post('/api/notifications/test-push', authenticateToken, notificationActionRateLimit, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        if (!user || !user.pushSubscription || !user.pushSubscriptionEnabled) {
            return res.status(400).json({ message: 'No push subscription found' });
        }

        await webpush.sendNotification(
            user.pushSubscription,
            JSON.stringify({
                title: 'Test Notification 🔔',
                body: 'This is a test push notification from Virtuosa',
                icon: '/favicon.ico',
                badge: '/favicon.ico',
                tag: 'test-notification',
                data: {
                    url: '/pages/notifications.html'
                }
            })
        );

        console.log(`📱 Test push notification sent to user ${req.user.userId}`);
        res.json({ message: 'Test push notification sent successfully' });
    } catch (error) {
        console.error('Test push notification error:', error);
        res.status(500).json({ message: 'Failed to send test push notification' });
    }
});

// ============================================
// SELLER APPLICATION ENDPOINTS
// ============================================

// Submit seller application (comprehensive form)
app.post('/api/seller/apply', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check for existing pending application
        const existingApp = await SellerApplication.findOne({
            user: user._id,
            status: 'Pending'
        });
        if (existingApp) {
            return res.status(400).json({ message: 'You already have a pending application. Please wait for review.' });
        }

        // Already a seller
        if (user.isSeller && user.sellerApplicationStatus === 'Approved') {
            return res.status(400).json({ message: 'You are already an approved seller.' });
        }

        const {
            sellerType,
            personalInfo,
            campusLocation,
            sellingInfo,
            inventorySource,
            paymentPreferences,
            deliveryArrangements,
            verification,
            agreements,
            additionalContext
        } = req.body;

        // Basic required field validation
        if (!sellerType || !personalInfo || !campusLocation || !sellingInfo || !agreements) {
            return res.status(400).json({ message: 'Please fill in all required sections.' });
        }

        if (!personalInfo.fullName || !personalInfo.university || !personalInfo.phoneNumber || !personalInfo.email) {
            return res.status(400).json({ message: 'Please fill in all required personal information.' });
        }

        // Zambian phone validation
        const phoneRegex = /^\+260\d{9}$/;
        if (!phoneRegex.test(personalInfo.phoneNumber.replace(/\s/g, ''))) {
            return res.status(400).json({ message: 'Please enter a valid Zambian phone number (+260XXXXXXXXX).' });
        }

        // NRC required for external vendors
        if (sellerType === 'ExternalVendor' && !personalInfo.nrcNumber) {
            return res.status(400).json({ message: 'NRC number is required for external vendors.' });
        }

        // Agreements validation
        if (!agreements.noProhibitedItems || !agreements.noScamming || !agreements.respectCommitment || !agreements.accurateDescriptions) {
            return res.status(400).json({ message: 'You must agree to all terms and commitments.' });
        }

        // Create the application
        const application = new SellerApplication({
            user: user._id,
            sellerType,
            personalInfo,
            campusLocation,
            sellingInfo: {
                ...sellingInfo,
                categories: sellingInfo.categories || []
            },
            inventorySource: {
                ...inventorySource,
                sources: inventorySource?.sources || []
            },
            paymentPreferences: {
                ...paymentPreferences,
                methods: paymentPreferences?.methods || []
            },
            deliveryArrangements: {
                ...deliveryArrangements,
                methods: deliveryArrangements?.methods || []
            },
            verification: {
                ...verification,
                documents: verification?.documents || []
            },
            agreements,
            additionalContext: additionalContext || {}
        });

        await application.save();

        // Update user status
        user.sellerApplicationStatus = 'Pending';
        await user.save();

        // Create notification
        const notification = new Notification({
            user: user._id,
            title: 'Seller Application Submitted',
            message: 'Your seller application has been submitted and is under review. We will notify you once it has been reviewed.',
            type: 'System',
            link: '/pages/seller-verification.html'
        });
        await notification.save();

        res.json({
            message: 'Seller application submitted successfully! You will be notified when it is reviewed.',
            applicationId: application._id
        });
    } catch (error) {
        console.error('Seller application error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get current user's seller application status
app.get('/api/seller/application-status', authenticateToken, async (req, res) => {
    try {
        const application = await SellerApplication.findOne({ user: req.user.userId })
            .sort({ submittedAt: -1 });

        if (!application) {
            return res.json({ hasApplication: false });
        }

        res.json({
            hasApplication: true,
            status: application.status,
            submittedAt: application.submittedAt,
            rejectionReason: application.rejectionReason,
            reviewedAt: application.reviewedAt
        });
    } catch (error) {
        console.error('Get application status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get seller applications (with filtering & pagination)
app.get('/api/admin/seller-applications', authenticateAdmin, async (req, res) => {
    try {
        const { status, sellerType, university, page = 1, limit = 20 } = req.query;

        const query = {};
        if (status) query.status = status;
        if (sellerType) query.sellerType = sellerType;
        if (university) query['personalInfo.university'] = { $regex: university, $options: 'i' };

        const total = await SellerApplication.countDocuments(query);
        const applications = await SellerApplication.find(query)
            .populate('user', 'fullName email university phoneNumber isStudentVerified profilePicture createdAt')
            .populate('reviewedBy', 'fullName email')
            .sort({ submittedAt: -1 })
            .limit(parseInt(limit))
            .skip((parseInt(page) - 1) * parseInt(limit));

        res.json({
            applications,
            pagination: {
                total,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(total / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Get seller applications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Keep backward compatibility — old admin endpoint
app.get('/api/admin/applications', authenticateAdmin, async (req, res) => {
    try {
        const applications = await SellerApplication.find({ status: 'Pending' })
            .populate('user', 'fullName email university phoneNumber isStudentVerified createdAt')
            .sort({ submittedAt: -1 });

        res.json({ applications });
    } catch (error) {
        console.error('Get applications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Get single application details
app.get('/api/admin/seller-applications/:id', authenticateAdmin, async (req, res) => {
    try {
        const application = await SellerApplication.findById(req.params.id)
            .populate('user', 'fullName email university phoneNumber isStudentVerified profilePicture createdAt')
            .populate('reviewedBy', 'fullName email');

        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        res.json({ application });
    } catch (error) {
        console.error('Get application details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Approve seller application
app.post('/api/admin/seller-applications/:id/approve', authenticateAdmin, async (req, res) => {
    try {
        console.log('Approve request received for application:', req.params.id);
        console.log('Request body:', req.body);
        console.log('User from token:', req.user);
        
        const application = await SellerApplication.findById(req.params.id);
        if (!application) {
            console.log('Application not found:', req.params.id);
            return res.status(404).json({ message: 'Application not found' });
        }

        console.log('Application found:', application._id, 'status:', application.status);

        if (application.status !== 'Pending') {
            console.log('Application already reviewed:', application.status);
            return res.status(400).json({ message: 'This application has already been reviewed.' });
        }

        const { notes } = req.body;

        console.log('Updating application with approved status');
        
        application.status = 'Approved';
        application.reviewedBy = req.user.userId;
        application.reviewedAt = new Date();
        application.adminReviewNotes = notes || '';
        await application.save();
        console.log('Application saved successfully');

        // Update user to be a seller
        const user = await User.findById(application.user);
        if (user) {
            console.log('Updating user to seller status for user:', user._id);
            user.isSeller = true;
            user.sellerApplicationStatus = 'Approved';
            user.sellerVerified = true;
            user.verificationStatus = 'verified';
            await user.save();
            console.log('User updated to seller successfully');

            // Create notification
            try {
                const notification = new Notification({
                    user: user._id,
                    title: 'Seller Application Approved! \ud83c\udf89',
                    message: 'Congratulations! Your seller application has been approved. You can now start listing items for sale.',
                    type: 'Account',
                    link: '/pages/seller-dashboard.html'
                });
                await notification.save();
                console.log('Notification created successfully');
            } catch (notifError) {
                console.error('Failed to create notification:', notifError);
                // Continue even if notification fails
            }
        } else {
            console.log('User not found for application:', application.user);
        }

        console.log('Approval completed successfully');
        res.json({ message: 'Seller application approved successfully' });
    } catch (error) {
        console.error('Approve application error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Backward compatibility for old approve endpoint
app.post('/api/admin/applications/:id/approve', authenticateAdmin, async (req, res) => {
    try {
        // Try SellerApplication first, then fall back to User-based approach
        const application = await SellerApplication.findOne({ user: req.params.id, status: 'Pending' });
        if (application) {
            application.status = 'Approved';
            application.reviewedBy = req.user.userId;
            application.reviewedAt = new Date();
            await application.save();
        }

        const user = await User.findById(req.params.id);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.sellerApplicationStatus = 'Approved';
        user.isSeller = true;
        await user.save();

        const notification = new Notification({
            user: user._id,
            title: 'Seller Application Approved! 🎉',
            message: 'Congratulations! Your seller application has been approved. You can now list items on Virtuosa.',
            type: 'Account',
            link: '/pages/seller-verification.html'
        });
        await notification.save();

        transporter.sendMail({
            to: user.email,
            subject: 'Virtuosa - Seller Application Approved!',
            html: `
                <h2>Your Seller Application Has Been Approved!</h2>
                <p>Hi ${user.fullName},</p>
                <p>Congratulations! Your application to become a seller on Virtuosa has been approved.</p>
                <p>You can now start listing your items. Visit your seller dashboard to get started.</p>
                <p>Happy selling!</p>
                <p>The Virtuosa Team</p>
            `
        }).catch(err => console.warn('Approval email send failed (non-critical):', err.message));

        res.json({ message: 'Seller application approved successfully' });
    } catch (error) {
        console.error('Approve application error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Admin: Reject seller application
app.post('/api/admin/seller-applications/:id/reject', authenticateAdmin, async (req, res) => {
    try {
        console.log('Reject request received for application:', req.params.id);
        console.log('Request body:', req.body);
        console.log('User from token:', req.user);
        
        const application = await SellerApplication.findById(req.params.id);
        if (!application) {
            console.log('Application not found:', req.params.id);
            return res.status(404).json({ message: 'Application not found' });
        }

        console.log('Application found:', application._id, 'status:', application.status);

        if (application.status !== 'Pending') {
            console.log('Application already reviewed:', application.status);
            return res.status(400).json({ message: 'This application has already been reviewed.' });
        }

        const { reason, notes } = req.body;
        if (!reason) {
            console.log('No rejection reason provided');
            return res.status(400).json({ message: 'Please provide a rejection reason.' });
        }

        console.log('Updating application with rejection reason:', reason);
        
        application.status = 'Rejected';
        application.rejectionReason = reason;
        application.adminReviewNotes = notes || '';
        application.reviewedBy = req.user.userId;
        application.reviewedAt = new Date();
        
        await application.save();
        console.log('Application saved successfully');

        // Update user
        const user = await User.findById(application.user);
        if (user) {
            console.log('Updating user seller application status for user:', user._id);
            user.sellerApplicationStatus = 'Rejected';
            await user.save();
            console.log('User updated successfully');

            // Create notification
            try {
                const notification = new Notification({
                    user: user._id,
                    title: 'Seller Application Update',
                    message: `Your seller application was not approved. Reason: ${reason}. You may update your information and reapply.`,
                    type: 'Account',
                    link: '/pages/seller.html'
                });
                await notification.save();
                console.log('Notification created successfully');
            } catch (notifError) {
                console.error('Failed to create notification:', notifError);
                // Continue even if notification fails
            }
        } else {
            console.log('User not found for application:', application.user);
        }

        console.log('Rejection completed successfully');
        res.json({ message: 'Application rejected successfully' });
    } catch (error) {
        console.error('Reject application error:', error);
        console.error('Error stack:', error.stack);
        res.status(500).json({ message: 'Server error: ' + error.message });
    }
});

// Admin: Get account deletion requests
app.get('/api/admin/account-deletion-requests', authenticateToken, checkRoleAccess('account_deletion'), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        const query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }

        const requests = await AccountDeletionRequest.find(query)
            .populate('user', 'fullName email university phoneNumber createdAt profilePicture')
            .populate('processedBy', 'fullName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await AccountDeletionRequest.countDocuments(query);

        res.json({
            requests,
            pagination: {
                current: parseInt(page),
                pages: Math.ceil(total / limit),
                total
            }
        });
    } catch (error) {
        console.error('Get deletion requests error:', error);
        res.status(500).json({ message: 'Failed to fetch deletion requests' });
    }
});

// Admin: Get single deletion request details
app.get('/api/admin/account-deletion-requests/:id', authenticateToken, checkRoleAccess('account_deletion'), async (req, res) => {
    try {
        const request = await AccountDeletionRequest.findById(req.params.id)
            .populate('user', 'fullName email university phoneNumber createdAt profilePicture')
            .populate('processedBy', 'fullName email');

        if (!request) {
            return res.status(404).json({ message: 'Deletion request not found' });
        }

        res.json(request);
    } catch (error) {
        console.error('Get deletion request error:', error);
        res.status(500).json({ message: 'Failed to fetch deletion request' });
    }
});

// Admin: Approve account deletion request
app.post('/api/admin/account-deletion-requests/:id/approve', authenticateToken, checkRoleAccess('account_deletion'), async (req, res) => {
    try {
        const deletionRequest = await AccountDeletionRequest.findById(req.params.id);
        if (!deletionRequest) {
            return res.status(404).json({ message: 'Deletion request not found' });
        }

        if (deletionRequest.status !== 'Pending') {
            return res.status(400).json({ message: 'This request has already been processed' });
        }

        // Double-check status to prevent race conditions
        const freshRequest = await AccountDeletionRequest.findById(req.params.id);
        if (freshRequest.status !== 'Pending') {
            return res.status(400).json({ message: 'Request already processed by another admin' });
        }

        const { adminNotes } = req.body;

        // Use transaction for data integrity
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Update request status
            deletionRequest.status = 'Approved';
            deletionRequest.adminNotes = adminNotes || '';
            deletionRequest.processedBy = req.user.userId;
            deletionRequest.processedAt = new Date();
            await deletionRequest.save({ session });

            // Get user details for deletion
            const user = await User.findById(deletionRequest.user).session(session);
            if (!user) {
                await session.abortTransaction();
                return res.status(404).json({ message: 'User not found' });
            }

            // Perform actual account deletion
            await deleteUserAccount(user._id, session);

            await session.commitTransaction();
            console.log(`🗑️ Account deletion approved and executed for user ${user._id} by admin ${req.user.userId}`);

            res.json({ message: 'Account deletion approved and executed successfully' });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error('Approve deletion request error:', error);
        res.status(500).json({ message: 'Failed to approve deletion request' });
    }
});

// Admin: Reject account deletion request
app.post('/api/admin/account-deletion-requests/:id/reject', authenticateToken, checkRoleAccess('account_deletion'), async (req, res) => {
    try {
        const deletionRequest = await AccountDeletionRequest.findById(req.params.id);
        if (!deletionRequest) {
            return res.status(404).json({ message: 'Deletion request not found' });
        }

        if (deletionRequest.status !== 'Pending') {
            return res.status(400).json({ message: 'This request has already been processed' });
        }

        // Double-check status to prevent race conditions
        const freshRequest = await AccountDeletionRequest.findById(req.params.id);
        if (freshRequest.status !== 'Pending') {
            return res.status(400).json({ message: 'Request already processed by another admin' });
        }

        const { adminNotes } = req.body;
        if (!adminNotes || adminNotes.trim().length === 0) {
            return res.status(400).json({ message: 'Please provide rejection notes' });
        }

        // Validate admin notes length
        if (adminNotes.length > 1000) {
            return res.status(400).json({ message: 'Admin notes too long (max 1000 characters)' });
        }

        // Sanitize admin notes
        const sanitizedNotes = adminNotes.replace(/<script[^>]*>.*?<\/script>/gi, '')
                                   .replace(/<[^>]*>?/gm, '')
                                   .trim();

        // Use transaction for data integrity
        const session = await mongoose.startSession();
        session.startTransaction();
        
        try {
            // Update request status
            deletionRequest.status = 'Rejected';
            deletionRequest.adminNotes = sanitizedNotes;
            deletionRequest.processedBy = req.user.userId;
            deletionRequest.processedAt = new Date();
            await deletionRequest.save({ session });

            // Notify user about rejection
            const user = await User.findById(deletionRequest.user).session(session);
            if (user) {
                const notification = new Notification({
                    user: user._id,
                    title: 'Account Deletion Request Rejected',
                    message: 'Your account deletion request has been reviewed and rejected. If you have questions, please contact support.',
                    type: 'Account'
                });
                await notification.save({ session });
            }

            await session.commitTransaction();
            console.log(`❌ Account deletion request rejected for user ${deletionRequest.user} by admin ${req.user.userId}`);

            res.json({ message: 'Account deletion request rejected successfully' });
        } catch (error) {
            await session.abortTransaction();
            throw error;
        } finally {
            session.endSession();
        }
    } catch (error) {
        console.error('Reject deletion request error:', error);
        res.status(500).json({ message: 'Failed to reject deletion request' });
    }
});

// Helper function to delete user account and all associated data
async function deleteUserAccount(userId, session = null) {
    try {
        const options = session ? { session } : {};
        
        // Delete user's products
        await Product.deleteMany({ user: userId }, options);
        
        // Delete user's transactions
        await Transaction.deleteMany({ $or: [{ buyer: userId }, { seller: userId }] }, options);
        
        // Delete user's reviews
        await Review.deleteMany({ $or: [{ reviewer: userId }, { reviewedUser: userId }] }, options);
        
        // Delete user's notifications
        await Notification.deleteMany({ user: userId }, options);
        
        // Delete user's messages
        await Message.deleteMany({ $or: [{ sender: userId }, { receiver: userId }] }, options);
        
        // Delete user's cart
        await Cart.deleteMany({ user: userId }, options);
        
        // Delete user's seller application
        await SellerApplication.deleteMany({ user: userId }, options);
        
        // Delete user's subscription
        await Subscription.deleteMany({ user: userId }, options);
        
        // Delete user's token transactions
        await TokenTransaction.deleteMany({ user: userId }, options);
        
        // Delete user's product drafts
        await ProductDraft.deleteMany({ user: userId }, options);
        
        // Delete user's deletion requests
        await AccountDeletionRequest.deleteMany({ user: userId }, options);
        
        // Finally, delete the user
        await User.findByIdAndDelete(userId, options);
        
        console.log(`✅ Successfully deleted account and all data for user ${userId}`);
    } catch (error) {
        console.error(`❌ Error deleting user account ${userId}:`, error);
        throw error;
    }
}

// Process seller verification payment (K30)
app.post('/api/seller/verify-payment', authenticateToken, async (req, res) => {
    const { paymentMethod, paymentReference } = req.body;

    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.isSeller) {
            return res.status(400).json({ message: 'Must be a seller to pay verification fee' });
        }

        if (user.sellerVerified) {
            return res.status(400).json({ message: 'Already verified as seller' });
        }

        // In a real implementation, you would verify the payment with mobile money provider
        // For now, we'll simulate successful payment
        user.sellerVerificationPaid = true;
        user.sellerVerified = true;
        user.sellerVerificationDate = new Date();
        await user.save();

        res.json({
            message: 'Seller verification completed successfully!',
            verificationDate: user.sellerVerificationDate
        });
    } catch (error) {
        console.error('Seller verification payment error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Subscribe to Virtuosa Pro
app.post('/api/subscribe-pro', authenticateToken, async (req, res) => {
    const { paymentMethod, paymentReference } = req.body;

    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!user.sellerVerified) {
            return res.status(400).json({ message: 'Must be a verified seller to subscribe to Pro' });
        }

        // Check if already subscribed
        let subscription = await Subscription.findOne({ user: user._id });

        if (subscription && subscription.isActive) {
            return res.status(400).json({ message: 'Already subscribed to Virtuosa Pro' });
        }

        // Create or update subscription
        const nextBillingDate = new Date();
        nextBillingDate.setMonth(nextBillingDate.getMonth() + 1);

        if (subscription) {
            subscription.isActive = true;
            subscription.nextBillingDate = nextBillingDate;
            subscription.paymentMethod = paymentMethod;
            subscription.paymentReference = paymentReference;
            subscription.cancelledAt = undefined;
            subscription.cancelledReason = undefined;
        } else {
            subscription = new Subscription({
                user: user._id,
                plan: 'Pro',
                nextBillingDate,
                paymentMethod,
                paymentReference
            });
        }

        await subscription.save();

        // Update user status
        user.isProSeller = true;
        user.proSubscriptionStart = new Date();
        user.proSubscriptionEnd = nextBillingDate;
        await user.save();

        res.json({
            message: 'Successfully subscribed to Virtuosa Pro!',
            nextBillingDate,
            plan: 'Pro'
        });
    } catch (error) {
        console.error('Pro subscription error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get seller dashboard data
app.get('/api/seller/dashboard', authenticateToken, checkDashboardAccess('seller'), async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        
        console.log('📊 Seller dashboard access:', {
            userId: user._id,
            effectiveRole: req.effectiveRole,
            email: user.email
        });

        // Get seller's products
        const products = await Product.find({ seller: user._id });

        // Get seller's transactions with proper sorting and field selection
        const transactions = await Transaction.find({ seller: user._id })
            .populate('buyer', 'fullName email')
            .populate('product', 'name price images')
            .sort({ createdAt: -1 });

        // Get seller's reviews
        const reviews = await Review.find({ reviewedUser: user._id, reviewType: 'Buyer to Seller' })
            .populate('reviewer', 'fullName')
            .sort({ createdAt: -1 });

        // Calculate stats - fix status filtering and field access
        console.log('All transactions:', transactions.map(t => ({
            id: t._id,
            status: t.status,
            sellerPayout: t.sellerPayout,
            sellerAmount: t.sellerAmount,
            amount: t.amount,
            totalAmount: t.totalAmount,
            createdAt: t.createdAt
        })));
        
        const completedTransactions = transactions.filter(t => ['completed', 'Completed', 'delivered', 'Delivered'].includes(t.status));
        console.log('Completed transactions:', completedTransactions.map(t => ({
            id: t._id,
            status: t.status,
            sellerPayout: t.sellerPayout,
            sellerAmount: t.sellerAmount,
            amount: t.amount,
            totalAmount: t.totalAmount
        })));
        
        const totalRevenue = completedTransactions.reduce((sum, t) => {
            // Use multiple possible fields for revenue calculation
            const amount = t.sellerPayout || t.sellerAmount || t.amount || t.totalAmount || 0;
            console.log(`Transaction ${t._id}: adding ${amount} to sum (current: ${sum})`);
            console.log(`Available fields: sellerPayout=${t.sellerPayout}, sellerAmount=${t.sellerAmount}, amount=${t.amount}, totalAmount=${t.totalAmount}`);
            return sum + amount;
        }, 0);

        const activeListings = products.filter(p => p.status === 'Active').length;
        const soldItems = transactions.filter(t => ['completed', 'Completed', 'delivered', 'Delivered'].includes(t.status)).length;
        const pendingTransactions = transactions.filter(t => ['pending', 'Pending', 'processing', 'Processing', 'awaiting_confirmation'].includes(t.status)).length;
        
        console.log('Seller dashboard stats:', {
            totalTransactions: transactions.length,
            completedTransactions: completedTransactions.length,
            totalRevenue,
            sampleTransaction: completedTransactions[0]
        });

        console.log('Final stats object:', {
            totalRevenue,
            activeListings,
            soldItems,
            pendingTransactions,
            totalProducts: products.length
        });

        // Calculate seller's rating and total reviews
        const totalReviews = reviews.length;
        const avgRating = totalReviews > 0 
            ? reviews.reduce((sum, r) => sum + r.rating, 0) / totalReviews 
            : 0;

        res.json({
            seller: {
                name: user.fullName,
                email: user.email,
                isStudentVerified: user.isStudentVerified,
                memberSince: user.createdAt,
                tokenBalance: user.tokenBalance || 0,
                totalTokensEarned: user.totalTokensEarned || 0,
                totalTokensRedeemed: user.totalTokensRedeemed || 0,
                rating: avgRating,
                totalReviews: totalReviews,
                storeName: user.storeName || '',
                storeDescription: user.storeDescription || '',
                storeSlug: user.storeSlug || ''
            },
            stats: {
                totalRevenue,
                activeListings,
                soldItems,
                pendingTransactions,
                totalProducts: products.length
            },
            recentTransactions: transactions.slice(0, 10),
            recentReviews: reviews.slice(0, 5),
            products
        });
    } catch (error) {
        console.error('Seller dashboard error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Update store settings
app.put('/api/seller/store-settings', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.isSeller) {
            return res.status(403).json({ message: 'Seller access required' });
        }

        const { storeName, storeDescription, storeSlug } = req.body;

        if (storeName) user.storeName = storeName;
        if (storeDescription) user.storeDescription = storeDescription;

        if (storeSlug) {
            const cleanSlug = slugify(storeSlug);
            // Check if slug is unique
            const existingSlug = await User.findOne({ storeSlug: cleanSlug, _id: { $ne: user._id } });
            if (existingSlug) {
                return res.status(400).json({ message: 'Store URL already taken' });
            }
            user.storeSlug = cleanSlug;
        } else if (storeName && !user.storeSlug) {
            // Auto generate slug if not set
            let baseSlug = slugify(storeName);
            let slug = baseSlug;
            let counter = 1;
            while (await User.findOne({ storeSlug: slug, _id: { $ne: user._id } })) {
                slug = `${baseSlug}-${counter}`;
                counter++;
            }
            user.storeSlug = slug;
        }

        await user.save();
        res.json({
            message: 'Store settings updated successfully',
            storeName: user.storeName,
            storeDescription: user.storeDescription,
            storeSlug: user.storeSlug
        });
    } catch (error) {
        console.error('Update store settings error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get public shop details
app.get('/api/seller/shop/:idOrSlug', async (req, res) => {
    try {
        const { idOrSlug } = req.params;
        let query = {};

        // Check if idOrSlug is a valid MongoDB ObjectId
        if (mongoose.Types.ObjectId.isValid(idOrSlug)) {
            query = { $or: [{ _id: idOrSlug }, { storeSlug: idOrSlug }] };
        } else {
            query = { storeSlug: idOrSlug };
        }

        const seller = await User.findOne(query).select('fullName storeName storeDescription storeSlug sellerRating totalSellerReviews createdAt profilePicture');

        if (!seller) {
            return res.status(404).json({ message: 'Shop not found' });
        }

        const products = await Product.find({ seller: seller._id, status: 'Active' })
            .sort({ createdAt: -1 });

        res.json({
            seller: {
                id: seller._id,
                fullName: seller.fullName,
                storeName: seller.storeName || seller.fullName,
                storeDescription: seller.storeDescription || '',
                storeSlug: seller.storeSlug,
                rating: seller.sellerRating || 5.0,
                totalReviews: seller.totalSellerReviews || 0,
                memberSince: seller.createdAt,
                profilePicture: seller.profilePicture
            },
            products
        });
    } catch (error) {
        console.error('Get public shop error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Send message
app.post('/api/messages', authenticateToken, async (req, res) => {
    try {
        const { receiverId, content, productId } = req.body;
        if (!receiverId || !content) {
            return res.status(400).json({ message: 'Receiver and content required' });
        }

        const message = new Message({
            sender: req.user.userId,
            receiver: receiverId,
            content,
            product: productId || undefined
        });

        await message.save();
        res.status(201).json(message);
    } catch (error) {
        console.error('Send message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get conversations list (recent interactions)
app.get('/api/messages/conversations', authenticateToken, async (req, res) => {
    try {
        const userId = new mongoose.Types.ObjectId(req.user.userId);

        // Find unique users the current user has chatted with
        const conversations = await Message.aggregate([
            {
                $match: {
                    $or: [{ sender: userId }, { receiver: userId }]
                }
            },
            { $sort: { createdAt: -1 } },
            {
                $group: {
                    _id: {
                        $cond: [
                            { $eq: ["$sender", userId] },
                            "$receiver",
                            "$sender"
                        ]
                    },
                    lastMessage: { $first: "$content" },
                    createdAt: { $first: "$createdAt" },
                    unreadCount: {
                        $sum: {
                            $cond: [
                                {
                                    $and: [
                                        { $eq: ["$receiver", userId] },
                                        { $eq: ["$isRead", false] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            },
            {
                $lookup: {
                    from: 'users',
                    localField: '_id',
                    foreignField: '_id',
                    as: 'user'
                }
            },
            { $unwind: '$user' },
            {
                $project: {
                    _id: 1,
                    lastMessage: 1,
                    createdAt: 1,
                    unreadCount: 1,
                    'user.fullName': 1,
                    'user.email': 1,
                    'user.profilePicture': 1
                }
            },
            { $sort: { createdAt: -1 } }
        ]);

        res.json(conversations);
    } catch (error) {
        console.error('Get conversations error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get chat history with a specific user
app.get('/api/messages/:otherUserId', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        const otherUserId = req.params.otherUserId;

        const messages = await Message.find({
            $or: [
                { sender: userId, receiver: otherUserId, isDeleted: false },
                { sender: otherUserId, receiver: userId, isDeleted: false }
            ]
        })
            .populate('product', 'name price images')
            .populate('replyTo', 'content sender')
            .sort({ createdAt: 1 });

        // Mark as read and update status
        await Message.updateMany(
            { sender: otherUserId, receiver: userId, isRead: false, isDeleted: false },
            {
                isRead: true,
                readAt: new Date(),
                status: 'read'
            }
        );

        res.json(messages);
    } catch (error) {
        console.error('Get messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced messaging endpoints

// Upload file/message attachment
app.post('/api/messages/upload', authenticateToken, upload.single('file'), async (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        const fileUrl = req.file.path; // Cloudinary URL

        res.json({
            fileUrl,
            fileName: req.file.originalname,
            fileSize: req.file.size,
            messageType: req.file.mimetype.startsWith('image/') ? 'image' : 'file'
        });
    } catch (error) {
        console.error('File upload error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Edit message
app.put('/api/messages/:messageId', authenticateToken, async (req, res) => {
    try {
        const { content } = req.body;
        const messageId = req.params.messageId;
        const userId = req.user.userId;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender.toString() !== userId) {
            return res.status(403).json({ message: 'Cannot edit other users messages' });
        }

        if (message.isDeleted) {
            return res.status(400).json({ message: 'Cannot edit deleted message' });
        }

        // Only allow editing within 15 minutes
        const editTimeLimit = 15 * 60 * 1000; // 15 minutes
        if (Date.now() - message.createdAt.getTime() > editTimeLimit) {
            return res.status(400).json({ message: 'Can only edit messages within 15 minutes' });
        }

        message.originalContent = message.content;
        message.content = content;
        message.isEdited = true;
        message.editedAt = new Date();
        message.updatedAt = new Date();

        await message.save();
        res.json(message);
    } catch (error) {
        console.error('Edit message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete message
app.delete('/api/messages/:messageId', authenticateToken, async (req, res) => {
    try {
        const messageId = req.params.messageId;
        const userId = req.user.userId;

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.sender.toString() !== userId) {
            return res.status(403).json({ message: 'Cannot delete other users messages' });
        }

        message.isDeleted = true;
        message.deletedAt = new Date();
        message.content = 'This message was deleted';
        message.updatedAt = new Date();

        await message.save();
        res.json({ message: 'Message deleted successfully' });
    } catch (error) {
        console.error('Delete message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add reaction to message
app.post('/api/messages/:messageId/reactions', authenticateToken, async (req, res) => {
    try {
        const { emoji } = req.body;
        const messageId = req.params.messageId;
        const userId = req.user.userId;

        if (!emoji) {
            return res.status(400).json({ message: 'Emoji is required' });
        }

        const message = await Message.findById(messageId);
        if (!message) {
            return res.status(404).json({ message: 'Message not found' });
        }

        if (message.isDeleted) {
            return res.status(400).json({ message: 'Cannot react to deleted message' });
        }

        // Remove existing reaction from this user
        message.reactions = message.reactions.filter(r => r.user.toString() !== userId);

        // Add new reaction
        message.reactions.push({
            user: userId,
            emoji,
            createdAt: new Date()
        });

        await message.save();
        res.json(message);
    } catch (error) {
        console.error('Add reaction error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Typing indicator
app.post('/api/messages/typing', authenticateToken, async (req, res) => {
    try {
        const { receiverId, isTyping } = req.body;
        const senderId = req.user.userId;

        if (!receiverId) {
            return res.status(400).json({ message: 'Receiver ID is required' });
        }

        // Create or update typing indicator
        const typingIndicator = {
            sender: senderId,
            receiver: receiverId,
            isTyping: isTyping || false,
            typingExpires: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes
        };

        // Store in a temporary collection or use the existing message schema
        await Message.findOneAndUpdate(
            {
                sender: senderId,
                receiver: receiverId,
                isTyping: true
            },
            typingIndicator,
            {
                upsert: true,
                new: true,
                setDefaultsOnInsert: true
            }
        );

        res.json({ success: true });
    } catch (error) {
        console.error('Typing indicator error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Search messages
app.get('/api/messages/search/:otherUserId', authenticateToken, async (req, res) => {
    try {
        const { otherUserId } = req.params;
        const { q } = req.query;
        const userId = req.user.userId;

        if (!q) {
            return res.status(400).json({ message: 'Search query is required' });
        }

        const messages = await Message.find({
            $and: [
                {
                    $or: [
                        { sender: userId, receiver: otherUserId },
                        { sender: otherUserId, receiver: userId }
                    ]
                },
                { isDeleted: false },
                { content: { $regex: q, $options: 'i' } }
            ]
        })
            .populate('product', 'name price images')
            .sort({ createdAt: -1 })
            .limit(50);

        res.json(messages);
    } catch (error) {
        console.error('Search messages error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get unread message count
app.get('/api/messages/unread-count', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const unreadCount = await Message.countDocuments({
            receiver: userId,
            isRead: false,
            isDeleted: false
        });

        res.json({ unreadCount });
    } catch (error) {
        console.error('Get unread count error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});


// Socket.io connection handling
const connectedUsers = new Map(); // userId -> socketId

// Helper function to validate JWT token for socket operations
const validateSocketToken = async (socket) => {
    if (!socket.userId) {
        return false;
    }
    
    try {
        // Re-validate token by checking if user still exists and is valid
        const user = await User.findById(socket.userId);
        if (!user) {
            console.log(`User ${socket.userId} not found, disconnecting socket`);
            socket.disconnect();
            return false;
        }
        return true;
    } catch (error) {
        console.error('Token validation error:', error);
        socket.emit('auth_error', { message: 'Authentication failed' });
        socket.disconnect();
        return false;
    }
};

io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Handle user authentication
    socket.on('authenticate', async (token) => {
        try {
            const decoded = jwt.verify(token, process.env.JWT_SECRET);
            const user = await User.findById(decoded.userId);

            if (user) {
                connectedUsers.set(decoded.userId, socket.id);
                socket.userId = decoded.userId;
                socket.join(`user_${decoded.userId}`);
                
                // Update notification service with connected user
                notificationService.updateConnectedUser(decoded.userId, socket.id, true);
                
                socket.emit('authenticated', { userId: decoded.userId });
                console.log(`User ${decoded.userId} authenticated successfully`);
            } else {
                socket.emit('auth_error', { message: 'User not found' });
                socket.disconnect();
            }
        } catch (error) {
            console.error('Socket authentication error:', error);
            socket.emit('auth_error', { message: 'Invalid token' });
            socket.disconnect();
        }
    });

    // Handle notification requests
    socket.on('get_notifications', async (options = {}) => {
        try {
            // Re-validate token before processing
            if (!(await validateSocketToken(socket))) {
                return;
            }

            const notifications = await notificationService.getNotifications(socket.userId, options);
            socket.emit('notifications_data', notifications);
        } catch (error) {
            console.error('Get notifications error:', error);
            socket.emit('notification_error', { message: 'Failed to get notifications' });
        }
    });

    // Handle marking notifications as read
    socket.on('mark_notifications_read', async (notificationIds = null) => {
        try {
            // Re-validate token before processing
            if (!(await validateSocketToken(socket))) {
                return;
            }

            await notificationService.markAsRead(socket.userId, notificationIds);
            
            // Send updated unread count
            const counts = await notificationService.getNotificationCounts(socket.userId);
            socket.emit('notification_counts_updated', counts);
            
            socket.emit('notifications_marked_read', { success: true });
        } catch (error) {
            console.error('Mark notifications read error:', error);
            socket.emit('notification_error', { message: 'Failed to mark notifications as read' });
        }
    });

    // Handle getting notification counts
    socket.on('get_notification_counts', async () => {
        try {
            // Re-validate token before processing
            if (!(await validateSocketToken(socket))) {
                return;
            }

            const counts = await notificationService.getNotificationCounts(socket.userId);
            socket.emit('notification_counts_updated', counts);
        } catch (error) {
            console.error('Get notification counts error:', error);
            socket.emit('notification_error', { message: 'Failed to get notification counts' });
        }
    });

    // Handle joining a conversation
    socket.on('join_conversation', (userId) => {
        if (socket.userId) {
            const room = `conversation_${socket.userId}_${userId}`;
            socket.join(room);
            console.log(`User ${socket.userId} joined conversation with ${userId}`);
        }
    });

    // Handle sending messages in real-time
    socket.on('send_message', async (data) => {
        try {
            const { receiverId, content, productId, messageType, fileUrl, fileName, fileSize } = data;

            if (!socket.userId || !receiverId || !content) return;

            console.log('💬 Creating new message via Socket.IO...');

            // Create message with basic fields
            const message = new Message({
                sender: socket.userId,
                receiver: receiverId,
                content,
                product: productId || undefined,
                messageType: messageType || 'text',
                fileUrl,
                fileName,
                fileSize,
                status: 'delivered',
                deliveredAt: new Date()
            });

            // Apply retention policy to the new message
            try {
                const config = await RetentionConfig.findOne({ isActive: true });
                if (config) {
                    const expiresAt = await calculateRetentionExpiration(message, config);
                    message.retentionPolicy = expiresAt ? 'standard' : 'permanent';
                    message.retentionExpiresAt = expiresAt;

                    console.log(`📅 Applied retention policy: ${message.retentionPolicy}, expires: ${expiresAt || 'never'}`);
                } else {
                    console.log('⚠️ No active retention config found, using default');
                    // Apply default 30-day retention
                    const defaultExpiry = new Date();
                    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
                    message.retentionPolicy = 'standard';
                    message.retentionExpiresAt = defaultExpiry;
                }
            } catch (retentionError) {
                console.error('❌ Error applying retention policy:', retentionError);
                // Still save the message even if retention fails
                const defaultExpiry = new Date();
                defaultExpiry.setDate(defaultExpiry.getDate() + 30);
                message.retentionPolicy = 'standard';
                message.retentionExpiresAt = defaultExpiry;
            }

            // Save the message with retention policy
            await message.save();
            await message.populate('product', 'name price images');

            console.log(`✅ Message saved with ID: ${message._id}, retention: ${message.retentionPolicy}`);

            // Send to both sender and receiver
            const senderRoom = `user_${socket.userId}`;
            const receiverRoom = `user_${receiverId}`;

            io.to(senderRoom).emit('new_message', message);
            io.to(receiverRoom).emit('new_message', message);

            // Update conversation lists
            io.to(senderRoom).emit('conversation_updated');
            io.to(receiverRoom).emit('conversation_updated');

        } catch (error) {
            console.error('Socket message error:', error);
            socket.emit('message_error', { message: 'Failed to send message' });
        }
    });

    // Handle typing indicators
    socket.on('typing', (data) => {
        const { receiverId, isTyping } = data;
        if (socket.userId && receiverId) {
            const receiverRoom = `user_${receiverId}`;
            socket.to(receiverRoom).emit('user_typing', {
                userId: socket.userId,
                isTyping
            });
        }
    });

    // Handle message read receipts
    socket.on('mark_read', async (messageId) => {
        try {
            const message = await Message.findById(messageId);
            if (message && message.receiver.toString() === socket.userId) {
                message.isRead = true;
                message.readAt = new Date();
                message.status = 'read';
                await message.save();

                // Notify sender that message was read
                const senderRoom = `user_${message.sender}`;
                io.to(senderRoom).emit('message_read', { messageId });
            }
        } catch (error) {
            console.error('Mark read error:', error);
        }
    });

    // Handle message reactions
    socket.on('add_reaction', async (data) => {
        try {
            const { messageId, emoji } = data;
            const message = await Message.findById(messageId);

            if (message) {
                // Remove existing reaction from this user
                message.reactions = message.reactions.filter(r => r.user.toString() !== socket.userId);

                // Add new reaction
                message.reactions.push({
                    user: socket.userId,
                    emoji,
                    createdAt: new Date()
                });

                await message.save();
                await message.populate('reactions.user', 'fullName');

                // Notify both users in conversation
                const senderRoom = `user_${message.sender}`;
                const receiverRoom = `user_${message.receiver}`;

                io.to(senderRoom).emit('reaction_added', { messageId, reactions: message.reactions });
                io.to(receiverRoom).emit('reaction_added', { messageId, reactions: message.reactions });
            }
        } catch (error) {
            console.error('Reaction error:', error);
        }
    });

    // Handle order status updates in real-time
    socket.on('update_order_status', async (data) => {
        try {
            const { orderId, status, trackingNumber, deliveryNotes } = data;
            
            if (!socket.userId || !orderId) return;

            const order = await Transaction.findById(orderId)
                .populate('seller', 'fullName')
                .populate('buyer', 'fullName');

            if (!order) {
                socket.emit('order_update_error', { message: 'Order not found' });
                return;
            }

            const user = await User.findById(socket.userId);
            const isBuyer = order.buyer._id.toString() === socket.userId;
            const isSeller = order.seller._id.toString() === socket.userId;

            // Validate status transitions based on user role
            if (isBuyer && status === 'Completed') {
                if (order.status !== 'delivered_pending_confirmation') {
                    socket.emit('order_update_error', { message: 'Invalid status transition' });
                    return;
                }
                order.status = 'Completed';
                order.deliveryConfirmedAt = new Date();
                order.deliveryNotes = deliveryNotes;
                
                // Award tokens to buyer
                await User.findByIdAndUpdate(socket.userId, {
                    $inc: { tokenBalance: 5, totalTokensEarned: 5 }
                });
                
                // Create token transaction
                await new TokenTransaction({
                    user: socket.userId,
                    amount: 5,
                    type: 'earned',
                    reason: 'Delivery confirmation',
                    orderId: order._id,
                    description: `Earned 5 tokens for confirming delivery of order #${order._id.toString().slice(-8)}`
                }).save();
                
                // Award tokens to seller and release payment
                if (order.paymentMethod === 'cash_on_delivery') {
                    await User.findByIdAndUpdate(order.seller._id, {
                        $inc: { tokenBalance: 5, totalTokensEarned: 5 }
                    });
                    
                    await new TokenTransaction({
                        user: order.seller._id,
                        amount: 5,
                        type: 'earned',
                        reason: 'Order completed',
                        orderId: order._id,
                        description: `Earned 5 tokens for completing order #${order._id.toString().slice(-8)}`
                    }).save();
                    
                    order.paymentStatus = 'Released';
                    order.escrowReleased = true;
                    order.escrowReleasedAt = new Date();
                }
                
            } else if (isSeller) {
                // Handle seller status updates
                if (status === 'confirmed_by_seller' && order.status === 'pending_seller_confirmation') {
                    order.status = 'confirmed_by_seller';
                    order.sellerConfirmedAt = new Date();
                } else if (status === 'declined' && order.status === 'pending_seller_confirmation') {
                    order.status = 'declined';
                    order.declinedAt = new Date();
                    order.declineReason = deliveryNotes || 'Order declined by seller';
                } else if (status === 'out_for_delivery' && order.status === 'confirmed_by_seller') {
                    order.status = 'out_for_delivery';
                    order.trackingNumber = trackingNumber;
                    order.shippedAt = new Date();
                } else if (status === 'delivered_pending_confirmation' && order.status === 'out_for_delivery') {
                    order.status = 'delivered_pending_confirmation';
                    order.deliveredAt = new Date();
                    order.deliveryNotes = deliveryNotes || 'Order delivered, awaiting buyer confirmation';
                } else {
                    socket.emit('order_update_error', { message: 'Invalid status transition' });
                    return;
                }
            } else {
                socket.emit('order_update_error', { message: 'Unauthorized to update this order' });
                return;
            }

            await order.save();

            // Create notification for other party (via NotificationService for all channels)
            const notificationRecipient = isBuyer ? order.seller._id : order.buyer._id;
            const notificationType = isBuyer ? 'delivery_confirmed' : 'order_delivered';
            const notificationTitle = isBuyer ? 'Delivery Confirmed' : 'Order Status Updated';
            const notificationMessage = isBuyer 
                ? `${order.buyer.fullName} confirmed delivery of order #${order._id.toString().slice(-8)}`
                : `Order #${order._id.toString().slice(-8)} status updated to ${status}`;

            await notificationService.sendNotification({
                recipientId: notificationRecipient,
                type: notificationType,
                title: notificationTitle,
                message: notificationMessage,
                data: {
                    orderId: order._id,
                    actionUrl: '/pages/orders.html',
                    actionText: 'View Order'
                },
                priority: 'normal',
                channels: ['websocket', 'push', 'email']
            });

            // Send real-time updates to both buyer and seller
            const buyerRoom = `user_${order.buyer._id}`;
            const sellerRoom = `user_${order.seller._id}`;

            // Send order update event
            const orderUpdateData = {
                orderId: order._id,
                status: order.status,
                updatedBy: socket.userId,
                timestamp: new Date(),
                notification: {
                    title: notificationTitle,
                    message: notificationMessage,
                    type: notificationType
                }
            };

            io.to(buyerRoom).emit('order_status_updated', orderUpdateData);
            io.to(sellerRoom).emit('order_status_updated', orderUpdateData);

            console.log(`✅ Order ${orderId} status updated to ${status} by ${isBuyer ? 'buyer' : 'seller'}`);

        } catch (error) {
            console.error('Order status update error:', error);
            socket.emit('order_update_error', { message: 'Server error' });
        }
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
            
            // Update notification service with disconnected user
            notificationService.updateConnectedUser(socket.userId, socket.id, false);
            
            socket.broadcast.emit('user_offline', { userId: socket.userId });
            console.log(`User ${socket.userId} disconnected`);
        }
        console.log('Client disconnected:', socket.id);
    });
});

// Helper function to get socket ID by user ID
function getSocketIdByUserId(userId) {
    return connectedUsers.get(userId);
}

// ==================== DATA RETENTION MANAGEMENT SYSTEM ====================

// Initialize default retention configuration
async function initializeDefaultRetentionConfig() {
    try {
        const existingConfig = await RetentionConfig.findOne({ name: 'default' });
        if (!existingConfig) {
            const defaultConfig = new RetentionConfig({
                name: 'default',
                description: 'Default message retention policy',
                standardRetention: 30,
                extendedRetention: 365,
                permanentRetention: false,
                messageTypeRetention: {
                    text: 30,
                    image: 90,
                    file: 180,
                    product_share: 365,
                    promotion: 90
                },
                userTypeRetention: {
                    regular: 30,
                    premium: 365,
                    admin: 1825
                },
                massMessageRetention: 365,
                autoArchiveEnabled: true,
                autoArchiveAfter: 7,
                cleanupSchedule: {
                    enabled: true,
                    frequency: 'daily',
                    nextRun: new Date(Date.now() + 24 * 60 * 60 * 1000) // Tomorrow
                }
            });

            await defaultConfig.save();
            console.log('✅ Default retention configuration created');
        }
    } catch (error) {
        console.error('❌ Error initializing default retention config:', error);
    }
}

// Calculate retention expiration date for a message
async function calculateRetentionExpiration(message, config) {
    let retentionDays = config.standardRetention;

    // Check message type specific retention
    if (config.messageTypeRetention[message.messageType]) {
        retentionDays = config.messageTypeRetention[message.messageType];
    }

    // Check if it's a mass message
    if (message.isMassMessage) {
        retentionDays = Math.max(retentionDays, config.massMessageRetention);
    }

    // Check importance level
    if (message.importance === 'high') {
        retentionDays = Math.max(retentionDays, config.extendedRetention);
    } else if (message.importance === 'critical' || message.retentionPolicy === 'permanent') {
        return null; // Never expires
    }

    // Check user type (would need to fetch user details)
    // This is a simplified version - in production you'd fetch user details

    const expirationDate = new Date(message.createdAt);
    expirationDate.setDate(expirationDate.getDate() + retentionDays);

    return expirationDate;
}

// Apply retention policy to a message
async function applyRetentionPolicy(message, config) {
    try {
        const expiresAt = await calculateRetentionExpiration(message, config);

        message.retentionPolicy = expiresAt ? 'standard' : 'permanent';
        message.retentionExpiresAt = expiresAt;

        await message.save();

        return message;
    } catch (error) {
        console.error('❌ Error applying retention policy:', error);
        throw error;
    }
}

// Archive messages before deletion
async function archiveMessage(message, reason = 'retention_policy') {
    try {
        const archive = new MessageArchive({
            originalMessageId: message._id,
            originalCollection: 'messages',
            messageData: message.toObject(),
            archiveReason: reason,
            retentionPolicy: message.retentionPolicy,
            expiresAt: message.retentionExpiresAt,
            accessLevel: message.importance === 'critical' ? 'confidential' : 'restricted'
        });

        await archive.save();
        console.log(`📦 Message ${message._id} archived with reason: ${reason}`);

        return archive;
    } catch (error) {
        console.error('❌ Error archiving message:', error);
        throw error;
    }
}

// Automated cleanup job
async function runMessageCleanup() {
    try {
        console.log('🧹 Starting automated message cleanup...');

        const config = await RetentionConfig.findOne({ isActive: true });
        if (!config) {
            console.log('⚠️ No active retention configuration found');
            return;
        }

        const now = new Date();

        // Find expired messages
        const expiredMessages = await Message.find({
            retentionExpiresAt: { $lte: now },
            retentionPolicy: { $ne: 'permanent' },
            isArchived: false
        });

        console.log(`📊 Found ${expiredMessages.length} expired messages to process`);

        let archivedCount = 0;
        let deletedCount = 0;

        for (const message of expiredMessages) {
            try {
                // Archive before deletion if configured
                if (config.autoArchiveEnabled) {
                    await archiveMessage(message, 'retention_expired');
                    archivedCount++;
                }

                // Delete the original message
                await Message.findByIdAndDelete(message._id);
                deletedCount++;

            } catch (error) {
                console.error(`❌ Error processing message ${message._id}:`, error);
            }
        }

        // Update cleanup schedule
        config.cleanupSchedule.lastRun = now;

        // Calculate next run time
        const nextRun = new Date(now);
        switch (config.cleanupSchedule.frequency) {
            case 'daily':
                nextRun.setDate(nextRun.getDate() + 1);
                break;
            case 'weekly':
                nextRun.setDate(nextRun.getDate() + 7);
                break;
            case 'monthly':
                nextRun.setMonth(nextRun.getMonth() + 1);
                break;
        }
        config.cleanupSchedule.nextRun = nextRun;

        await config.save();

        console.log(`✅ Cleanup completed: ${archivedCount} archived, ${deletedCount} deleted`);
        console.log(`📅 Next cleanup scheduled for: ${nextRun.toISOString()}`);

        return {
            archivedCount,
            deletedCount,
            nextRun: config.cleanupSchedule.nextRun
        };

    } catch (error) {
        console.error('❌ Error in message cleanup:', error);
        throw error;
    }
}

// Schedule cleanup job
function scheduleCleanupJob() {
    // Run cleanup every hour to check if scheduled cleanup is due
    setInterval(async () => {
        try {
            const config = await RetentionConfig.findOne({
                isActive: true,
                'cleanupSchedule.enabled': true
            });

            if (config && config.cleanupSchedule.nextRun <= new Date()) {
                await runMessageCleanup();
            }
        } catch (error) {
            console.error('❌ Error in scheduled cleanup check:', error);
        }
    }, 60 * 60 * 1000); // Check every hour
}

// ==================== DATA RETENTION API ENDPOINTS ====================

// Get retention configuration
app.get('/api/admin/retention/config', authenticateToken, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.role !== 'CEO' && adminUser.isAdmin !== true)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const configs = await RetentionConfig.find({}).sort({ createdAt: -1 });
        res.json({ configs });
    } catch (error) {
        console.error('Get retention config error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update retention configuration
app.put('/api/admin/retention/config/:id', authenticateToken, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.role !== 'CEO' && adminUser.isAdmin !== true)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const config = await RetentionConfig.findByIdAndUpdate(
            req.params.id,
            { ...req.body, updatedAt: new Date() },
            { new: true, runValidators: true }
        );

        if (!config) {
            return res.status(404).json({ message: 'Configuration not found' });
        }

        res.json({ config });
    } catch (error) {
        console.error('Update retention config error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create retention configuration
app.post('/api/admin/retention/config', authenticateToken, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.role !== 'CEO' && adminUser.isAdmin !== true)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const config = new RetentionConfig(req.body);
        await config.save();

        res.status(201).json({ config });
    } catch (error) {
        console.error('Create retention config error:', error);
        if (error.code === 11000) {
            return res.status(400).json({ message: 'Configuration name must be unique' });
        }
        res.status(500).json({ message: 'Server error' });
    }
});

// Run manual cleanup
app.post('/api/admin/retention/cleanup', authenticateToken, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.role !== 'CEO' && adminUser.isAdmin !== true)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const result = await runMessageCleanup();
        res.json({
            message: 'Cleanup completed successfully',
            result
        });
    } catch (error) {
        console.error('Manual cleanup error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Test endpoint for debugging
app.get('/api/admin/retention/test', authenticateToken, async (req, res) => {
    try {
        console.log('🧪 Test endpoint hit');
        res.json({ message: 'Test successful', userId: req.user.userId });
    } catch (error) {
        console.error('Test endpoint error:', error);
        res.status(500).json({ message: 'Test failed' });
    }
});

// Test email configuration endpoint
app.post('/api/admin/test-email', authenticateAdmin, async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required for testing' });
    }

    try {
        console.log('📧 Testing email configuration...');
        console.log('📧 Email config check:', {
            hasEmailUser: !!process.env.EMAIL_USER,
            hasEmailPass: !!process.env.EMAIL_PASS,
            emailUser: process.env.EMAIL_USER,
            service: 'gmail'
        });

        // Test transporter verification first
        await transporter.verify();
        console.log('✅ Transporter verified successfully');

        const testResult = await transporter.sendMail({
            to: email,
            subject: 'Virtuosa - Email Configuration Test',
            html: `
                <h2>Email Configuration Test</h2>
                <p>This is a test email to verify that Virtuosa's email system is working correctly.</p>
                <p>If you received this email, the configuration is working properly.</p>
                <p>Timestamp: ${new Date().toISOString()}</p>
                <p>Server: ${process.env.FRONTEND_URL || 'Local Development'}</p>
            `
        });

        console.log('✅ Test email sent successfully');
        console.log('📧 Test email result:', testResult);

        res.json({ 
            success: true, 
            message: 'Email configuration is working correctly!',
            testEmailSent: true,
            emailConfig: {
                hasEmailUser: !!process.env.EMAIL_USER,
                hasEmailPass: !!process.env.EMAIL_PASS,
                emailUser: process.env.EMAIL_USER,
                service: 'gmail'
            }
        });

    } catch (error) {
        console.error('❌ Email configuration test failed:', error);
        console.error('Email error details:', {
            message: error.message,
            code: error.code,
            response: error.response
        });
        
        res.status(500).json({ 
            success: false, 
            message: 'Email configuration test failed',
            error: error.message,
            details: {
                message: error.message,
                code: error.code,
                response: error.response
            },
            suggestions: [
                'Check if EMAIL_USER and EMAIL_PASS environment variables are set correctly',
                'Make sure Gmail app password is enabled and correct',
                'Verify that Gmail allows less secure apps for your account',
                'Check network connectivity and firewall settings'
            ]
        });
    }
});

// Test email configuration endpoint
app.post('/api/test/email-config', async (req, res) => {
    try {
        console.log('🧪 Testing email configuration...');
        console.log('📧 Email config:', {
            user: process.env.EMAIL_USER,
            hasPass: !!process.env.EMAIL_PASS,
            frontend: process.env.FRONTEND_URL
        });

        // Test transporter
        await transporter.verify();
        console.log('✅ Transporter verified successfully');

        res.json({ 
            message: 'Email configuration is working',
            config: {
                hasEmailUser: !!process.env.EMAIL_USER,
                hasEmailPass: !!process.env.EMAIL_PASS,
                hasFrontendUrl: !!process.env.FRONTEND_URL,
                emailUser: process.env.EMAIL_USER
            }
        });
    } catch (error) {
        console.error('❌ Email config test failed:', error);
        res.status(500).json({ 
            message: 'Email configuration test failed', 
            error: error.message,
            config: {
                hasEmailUser: !!process.env.EMAIL_USER,
                hasEmailPass: !!process.env.EMAIL_PASS,
                hasFrontendUrl: !!process.env.FRONTEND_URL
            }
        });
    }
});

// Test email endpoint
app.post('/api/test/email', async (req, res) => {
    try {
        const { email } = req.body;
        if (!email) {
            return res.status(400).json({ message: 'Email is required' });
        }

        console.log('🧪 Testing email configuration...');
        console.log('📧 Email config:', {
            user: process.env.EMAIL_USER,
            pass: !!process.env.EMAIL_PASS,
            frontend: process.env.FRONTEND_URL
        });

        await transporter.sendMail({
            to: email,
            subject: 'Virtuosa - Email Configuration Test',
            html: `
                <h2>Email Configuration Test</h2>
                <p>This is a test email to verify the email configuration is working on Render.</p>
                <p>Timestamp: ${new Date().toISOString()}</p>
                <p>Frontend URL: ${process.env.FRONTEND_URL || 'Not set'}</p>
            `
        });

        res.json({ message: 'Test email sent successfully' });
    } catch (error) {
        console.error('Email test error:', error);
        res.status(500).json({ 
            message: 'Email test failed', 
            error: error.message,
            config: {
                hasEmailUser: !!process.env.EMAIL_USER,
                hasEmailPass: !!process.env.EMAIL_PASS,
                hasFrontendUrl: !!process.env.FRONTEND_URL
            }
        });
    }
});

// Get message retention statistics
app.get('/api/admin/retention/stats', authenticateToken, async (req, res) => {
    try {
        console.log('📊 Retention stats request received');
        console.log('👤 User ID:', req.user.userId);

        const adminUser = await User.findById(req.user.userId);
        console.log('🔍 Admin user found:', !!adminUser);

        if (!adminUser) {
            console.log('❌ Admin user not found');
            return res.status(403).json({ message: 'Admin user not found' });
        }

        // Check admin access with multiple methods
        const isAdmin = adminUser.email === 'admin@virtuosa.com' ||
            adminUser.role === 'admin' ||
            adminUser.role === 'CEO' ||
            adminUser.isAdmin === true ||
            adminUser.isAdmin === 'true';

        console.log('🔐 Admin check results:', {
            email: adminUser.email,
            role: adminUser.role,
            isAdmin: adminUser.isAdmin,
            finalResult: isAdmin
        });

        if (!isAdmin) {
            console.log('❌ Admin access denied for user:', adminUser.email);
            return res.status(403).json({ message: 'Admin access required' });
        }

        console.log('✅ Admin access granted, calculating stats...');

        const now = new Date();

        // Total messages
        const totalMessages = await Message.countDocuments();
        console.log('📈 Total messages:', totalMessages);

        // Messages by retention policy
        const messagesByPolicy = await Message.aggregate([
            { $group: { _id: '$retentionPolicy', count: { $sum: 1 } } }
        ]);
        console.log('📊 Messages by policy:', messagesByPolicy);

        // Expired messages
        const expiredMessages = await Message.countDocuments({
            retentionExpiresAt: { $lte: now },
            retentionPolicy: { $ne: 'permanent' }
        });
        console.log('⚠️ Expired messages:', expiredMessages);

        // Archived messages
        const archivedMessages = await MessageArchive.countDocuments();
        console.log('📦 Archived messages:', archivedMessages);

        // Messages expiring soon (next 7 days)
        const nextWeek = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const expiringSoon = await Message.countDocuments({
            retentionExpiresAt: { $gte: now, $lte: nextWeek },
            retentionPolicy: { $ne: 'permanent' }
        });
        console.log('⏰ Expiring soon:', expiringSoon);

        // Storage statistics
        const avgMessageSize = 500; // Estimated average message size in bytes
        const totalStorage = totalMessages * avgMessageSize;
        const archivedStorage = archivedMessages * avgMessageSize;

        const statsData = {
            totalMessages,
            expiredMessages,
            archivedMessages,
            expiringSoon,
            messagesByPolicy: messagesByPolicy.reduce((acc, item) => {
                acc[item._id] = item.count;
                return acc;
            }, {}),
            storage: {
                estimatedTotal: totalStorage,
                archived: archivedStorage,
                savings: archivedStorage
            },
            lastCleanup: await RetentionConfig.findOne({}, { 'cleanupSchedule.lastRun': 1 })
                .then(config => config?.cleanupSchedule?.lastRun || null)
        };

        console.log('✅ Stats calculated, sending response');
        res.json(statsData);
    } catch (error) {
        console.error('Get retention stats error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get message archive
app.get('/api/admin/retention/archive', authenticateToken, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.role !== 'CEO' && adminUser.isAdmin !== true)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { page = 1, limit = 20, reason, accessLevel } = req.query;

        const filter = {};
        if (reason) filter.archiveReason = reason;
        if (accessLevel) filter.accessLevel = accessLevel;

        const archives = await MessageArchive.find(filter)
            .populate('archivedBy', 'fullName email')
            .sort({ archivedAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await MessageArchive.countDocuments(filter);

        res.json({
            archives,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit)
            }
        });
    } catch (error) {
        console.error('Get archive error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Restore message from archive
app.post('/api/admin/retention/restore/:archiveId', authenticateToken, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.role !== 'CEO' && adminUser.isAdmin !== true)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const archive = await MessageArchive.findById(req.params.archiveId);
        if (!archive) {
            return res.status(404).json({ message: 'Archive not found' });
        }

        // Restore message
        const restoredMessage = new Message(archive.messageData);
        restoredMessage._id = archive.originalMessageId;
        restoredMessage.isArchived = false;
        restoredMessage.retentionExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

        await restoredMessage.save();

        // Add audit log
        restoredMessage.auditLog.push({
            action: 'restored_from_archive',
            performedBy: adminUser._id,
            details: `Restored by ${adminUser.fullName} (${adminUser.email})`
        });

        await restoredMessage.save();

        // Delete archive entry
        await MessageArchive.findByIdAndDelete(req.params.archiveId);

        res.json({
            message: 'Message restored successfully',
            restoredMessage: restoredMessage
        });
    } catch (error) {
        console.error('Restore message error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Apply retention policy to specific messages
app.post('/api/admin/retention/apply', authenticateToken, async (req, res) => {
    try {
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.role !== 'CEO' && adminUser.isAdmin !== true)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { messageIds, policyName } = req.body;

        if (!messageIds || !Array.isArray(messageIds)) {
            return res.status(400).json({ message: 'Message IDs array is required' });
        }

        const config = await RetentionConfig.findOne({ name: policyName || 'default' });
        if (!config) {
            return res.status(404).json({ message: 'Retention configuration not found' });
        }

        const messages = await Message.find({ _id: { $in: messageIds } });
        let updatedCount = 0;

        for (const message of messages) {
            try {
                await applyRetentionPolicy(message, config);
                updatedCount++;
            } catch (error) {
                console.error(`Error applying policy to message ${message._id}:`, error);
            }
        }

        res.json({
            message: `Applied retention policy to ${updatedCount} messages`,
            updatedCount
        });
    } catch (error) {
        console.error('Apply retention policy error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Initialize retention system on server start
initializeDefaultRetentionConfig();
scheduleCleanupJob();

// Migration: Apply retention policies to existing messages
async function migrateExistingMessages() {
    try {
        console.log('🔄 Starting migration for existing messages...');

        // Find messages without retention policies
        const messagesWithoutPolicy = await Message.find({
            $or: [
                { retentionPolicy: { $exists: false } },
                { retentionExpiresAt: { $exists: false } }
            ]
        });

        if (messagesWithoutPolicy.length === 0) {
            console.log('✅ All messages already have retention policies');
            return;
        }

        console.log(`📊 Found ${messagesWithoutPolicy.length} messages without retention policies`);

        const config = await RetentionConfig.findOne({ isActive: true });
        let updatedCount = 0;

        for (const message of messagesWithoutPolicy) {
            try {
                if (config) {
                    const expiresAt = await calculateRetentionExpiration(message, config);
                    message.retentionPolicy = expiresAt ? 'standard' : 'permanent';
                    message.retentionExpiresAt = expiresAt;
                } else {
                    // Apply default 30-day retention
                    const defaultExpiry = new Date(message.createdAt);
                    defaultExpiry.setDate(defaultExpiry.getDate() + 30);
                    message.retentionPolicy = 'standard';
                    message.retentionExpiresAt = defaultExpiry;
                }

                await message.save();
                updatedCount++;

            } catch (error) {
                console.error(`❌ Error updating message ${message._id}:`, error);
            }
        }

        console.log(`✅ Migration completed: ${updatedCount} messages updated with retention policies`);

    } catch (error) {
        console.error('❌ Error in message migration:', error);
    }
}


// ============================================
// CART AND CHECKOUT ENDPOINTS
// ============================================

// Cart Schema for persistent cart storage
const cartSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    items: [{
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
        quantity: { type: Number, required: true, min: 1 },
        addedAt: { type: Date, default: Date.now }
    }],
    updatedAt: { type: Date, default: Date.now }
});

const Cart = mongoose.model('Cart', cartSchema);

// Get user cart
app.get('/api/cart', authenticateToken, async (req, res) => {
    try {
        const cart = await Cart.findOne({ user: req.user.userId })
            .populate('items.product', 'name price images category seller');
        
        if (!cart) {
            return res.json({ items: [] });
        }

        res.json({ items: cart.items });
    } catch (error) {
        console.error('Get cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Save/Update entire cart (for localStorage sync)
app.post('/api/cart', authenticateToken, async (req, res) => {
    try {
        const { items } = req.body;
        
        let cart = await Cart.findOne({ user: req.user.userId });
        
        if (!cart) {
            cart = new Cart({ user: req.user.userId, items: [] });
        }
        
        // Validate and convert items
        const validatedItems = [];
        for (const item of items) {
            // Handle both nested and flat item structures
            const productId = item._id || item.product?._id;
            const quantity = item.quantity || 1;
            
            if (!productId) continue;
            
            const product = await Product.findById(productId);
            if (!product) continue;
            
            validatedItems.push({
                product: productId,
                quantity: quantity,
                addedAt: item.addedAt || new Date()
            });
        }
        
        cart.items = validatedItems;
        cart.updatedAt = new Date();
        await cart.save();
        
        await cart.populate('items.product', 'name price images category seller');
        res.json({ items: cart.items });
    } catch (error) {
        console.error('Save cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Add item to cart
app.post('/api/cart/add', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity = 1 } = req.body;

        if (!productId) {
            return res.status(400).json({ message: 'Product ID is required' });
        }

        // Verify product exists and is available
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        console.log(`🔍 Cart Add - Product found:`, {
            id: product._id,
            name: product.name,
            listingType: product.listingType,
            status: product.status,
            inventory: product.inventory,
            totalSold: product.totalSold
        });

        // Check product availability based on listing type
        let isAvailable = false;
        if (product.listingType === 'one_time') {
            isAvailable = product.status === 'Active';
            console.log(`📦 One-time listing check: status=${product.status}, available=${isAvailable}`);
        } else if (product.listingType === 'persistent') {
            isAvailable = product.inventory > 0 && ['Active', 'Reserved'].includes(product.status);
            console.log(`📦 Persistent listing check: inventory=${product.inventory}, status=${product.status}, available=${isAvailable}`);
        }

        if (!isAvailable) {
            console.log(`❌ Product not available: ${product.name}, reason: ${product.listingType === 'one_time' ? 'Status not Active' : 'No inventory or invalid status'}`);
            return res.status(404).json({ message: 'Product not available' });
        }

        let cart = await Cart.findOne({ user: req.user.userId });
        
        if (!cart) {
            cart = new Cart({ user: req.user.userId, items: [] });
        }

        // Check if item already exists in cart
        const existingItemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (existingItemIndex >= 0) {
            cart.items[existingItemIndex].quantity += quantity;
        } else {
            cart.items.push({ product: productId, quantity });
        }

        cart.updatedAt = new Date();
        await cart.save();

        await cart.populate('items.product', 'name price images category seller');
        res.json({ items: cart.items });
    } catch (error) {
        console.error('Add to cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update cart item quantity
app.put('/api/cart/update', authenticateToken, async (req, res) => {
    try {
        const { productId, quantity } = req.body;

        if (!productId || !quantity || quantity < 1) {
            return res.status(400).json({ message: 'Valid product ID and quantity are required' });
        }

        const cart = await Cart.findOne({ user: req.user.userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        const itemIndex = cart.items.findIndex(
            item => item.product.toString() === productId
        );

        if (itemIndex === -1) {
            return res.status(404).json({ message: 'Item not found in cart' });
        }

        cart.items[itemIndex].quantity = quantity;
        cart.updatedAt = new Date();
        await cart.save();

        await cart.populate('items.product', 'name price images category seller');
        res.json({ items: cart.items });
    } catch (error) {
        console.error('Update cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Remove item from cart
app.delete('/api/cart/remove/:productId', authenticateToken, async (req, res) => {
    try {
        const { productId } = req.params;

        const cart = await Cart.findOne({ user: req.user.userId });
        if (!cart) {
            return res.status(404).json({ message: 'Cart not found' });
        }

        cart.items = cart.items.filter(
            item => item.product.toString() !== productId
        );
        cart.updatedAt = new Date();
        await cart.save();

        await cart.populate('items.product', 'name price images category seller');
        res.json({ items: cart.items });
    } catch (error) {
        console.error('Remove from cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Clear cart
app.delete('/api/cart/clear', authenticateToken, async (req, res) => {
    try {
        await Cart.findOneAndDelete({ user: req.user.userId });
        res.json({ message: 'Cart cleared successfully' });
    } catch (error) {
        console.error('Clear cart error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Checkout process
app.post('/api/checkout', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        const cart = await Cart.findOne({ user: req.user.userId })
            .populate('items.product');

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ message: 'Cart is empty' });
        }

        const { deliveryAddress, paymentMethod, deliveryMethod } = req.body;

        if (!deliveryAddress || !paymentMethod || !deliveryMethod) {
            return res.status(400).json({ message: 'Delivery address, payment method, and delivery method are required' });
        }

        // Create transactions for each item in cart
        const transactions = [];
        for (const cartItem of cart.items) {
            const transaction = new Transaction({
                buyer: req.user.userId,
                seller: cartItem.product.seller,
                product: cartItem.product._id,
                quantity: cartItem.quantity,
                amount: cartItem.product.price * cartItem.quantity,
                deliveryAddress,
                deliveryMethod,
                paymentMethod,
                status: 'Pending',
                paymentStatus: 'Pending'
            });

            await transaction.save();
            transactions.push(transaction);

            // Create notification for seller
            await new Notification({
                user: cartItem.product.seller,
                title: 'New Order Received',
                message: `You have a new order for ${cartItem.quantity}x ${cartItem.product.name}`,
                type: 'Transaction',
                link: `/seller-dashboard.html?tab=orders`
            }).save();
        }

        // Clear the cart after successful checkout
        await Cart.findOneAndDelete({ user: req.user.userId });

        // Create notification for buyer
        await new Notification({
            user: req.user.userId,
            title: 'Order Placed Successfully',
            message: `Your order for ${transactions.length} items has been placed successfully`,
            type: 'Transaction',
            link: `/orders.html`
        }).save();

        res.json({
            message: 'Checkout successful',
            transactions: transactions.map(t => ({
                id: t._id,
                productName: cart.items.find(item => item.product._id.toString() === t.product.toString()).product.name,
                amount: t.amount,
                status: t.status
            }))
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Create new order (cash on delivery with multiple items)
app.post('/api/orders', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(403).json({ message: 'User not found' });
        }

        const { items, deliveryInfo, paymentMethod, subtotal, total } = req.body;
        
        console.log('📦 Order request received:');
        console.log('👤 User:', user._id, user.fullName);
        console.log('🛒 Items:', items);
        console.log('📍 Delivery Info:', deliveryInfo);
        console.log('💳 Payment Method:', paymentMethod);
        console.log('💰 Subtotal:', subtotal, 'Total:', total);

        if (!items || !Array.isArray(items) || items.length === 0) {
            return res.status(400).json({ message: 'Order items are required' });
        }

        if (!deliveryInfo || !deliveryInfo.name || !deliveryInfo.phone || !deliveryInfo.address) {
            return res.status(400).json({ message: 'Delivery information is required' });
        }

        if (!paymentMethod) {
            return res.status(400).json({ message: 'Payment method is required' });
        }

        // Validate each item and create transactions
        const transactions = [];
        let totalCommission = 0;
        let totalDeliveryFee = 0;

        for (const item of items) {
            const { productId, quantity, price } = item;

            if (!productId || !quantity || !price) {
                return res.status(400).json({ message: 'Invalid item data: productId, quantity, and price are required' });
            }

            // Get product details
            const product = await Product.findById(productId);
            
            if (!product) {
                return res.status(404).json({ 
                    message: `Product ${productId} not found`,
                    debugInfo: {
                        productId,
                        productType: typeof productId,
                        recentProducts: allProducts.map(p => ({id: p._id.toString(), name: p.name})).slice(0, 3),
                        lookupResults: {
                            regex: !!regexProduct,
                            string: !!stringProduct,
                            objectId: !!objectIdProduct,
                            nameSearch: !!nameProduct,
                            foundProductId: nameProduct ? nameProduct._id.toString() : null
                        },
                        suggestion: 'Product not found in database - try re-adding to cart from product page'
                    }
                });
            }
            
            if (product.status !== 'Active') {
                console.log(`⚠️ Product ${productId} status is: ${product.status} (expected: Active)`);
                return res.status(404).json({ message: `Product ${productId} not available (status: ${product.status})` });
            }

            if (product.seller.toString() === user._id.toString()) {
                return res.status(400).json({ message: 'Cannot buy your own product' });
            }

            // Calculate fees for this item - SET TO 0 PER USER REQUEST
            const commissionRate = 0; // 0% commission for now
            const platformFee = 0; // No commission for now
            const deliveryFee = 0; // No delivery fee for now
            const amount = price * quantity + deliveryFee;
            const sellerAmount = (price * quantity) - platformFee;

            totalCommission += platformFee;
            totalDeliveryFee += deliveryFee;

            // Create transaction for this item
            const transaction = new Transaction({
                buyer: user._id,
                seller: product.seller,
                product: product._id,
                quantity: quantity,
                amount,
                platformFee,
                sellerAmount,
                paymentMethod,
                deliveryMethod: 'Delivery',
                deliveryAddress: {
                    name: deliveryInfo.name,
                    phone: deliveryInfo.phone,
                    address: deliveryInfo.address,
                    instructions: deliveryInfo.instructions || ''
                },
                status: 'pending_seller_confirmation',
                isCashOnDelivery: paymentMethod === 'cash_on_delivery'
            });

            await transaction.save();
            transactions.push(transaction);

            // Update product status - handle different listing types
            console.log(`🔄 Checkout - Processing product:`, {
                productId: product._id,
                name: product.name,
                listingType: product.listingType,
                currentStatus: product.status,
                currentInventory: product.inventory
            });

            if (product.listingType === 'one_time') {
                // One-time sale: mark as reserved
                product.status = 'Reserved';
                console.log(`📦 One-time sale set to Reserved: ${product.name}`);
            } else if (product.listingType === 'persistent') {
                // Persistent listing: decrement inventory but keep active
                product.inventory -= quantity;
                
                // Add to sales history
                product.salesHistory.push({
                    buyer: user._id,
                    quantity: quantity,
                    price: product.price,
                    soldAt: new Date()
                });
                
                // Update total sold count
                product.totalSold += quantity;
                
                // Update status based on remaining inventory
                if (product.inventory > 0) {
                    product.status = 'Active'; // Keep it active
                    console.log(`📦 Persistent listing kept active: ${product.name}, new inventory: ${product.inventory}`);
                } else {
                    product.status = 'Out of Stock';
                    product.soldAt = new Date();
                    console.log(`📦 Persistent listing out of stock: ${product.name}`);
                }
            }
            
            await product.save();
            
            console.log(`✅ Product status updated in checkout:`, {
                productId: product._id,
                finalStatus: product.status,
                finalInventory: product.inventory
            });

            // Create notification for seller
            await new Notification({
                recipient: product.seller,
                sender: user._id,
                type: 'new_order',
                title: 'New Order Received',
                message: `You have a new order for ${quantity}x ${product.name}`,
                data: {
                    orderId: transaction._id,
                    productId: product._id,
                    actionUrl: '/seller-dashboard.html?tab=orders',
                    actionText: 'View Order'
                },
                status: 'unread'
            }).save();
        }

        // Create notification for buyer
        await new Notification({
            recipient: user._id,
            type: 'order_confirmed',
            title: 'Order Placed Successfully',
            message: `Your order for ${transactions.length} items has been placed successfully`,
            data: {
                actionUrl: '/orders.html',
                actionText: 'View Orders'
            },
            status: 'unread'
        }).save();

        res.status(201).json({
            order: {
                _id: transactions[0]._id, // Use first transaction ID as order ID
                items: transactions,
                deliveryInfo,
                paymentMethod,
                subtotal,
                total: total || subtotal + totalDeliveryFee,
                status: 'pending_seller_confirmation',
                createdAt: new Date()
            },
            message: 'Order placed successfully'
        });

    } catch (error) {
        console.error('Create order error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
});

// Get user orders (works for both buyers and sellers)
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        // Get user info to determine if they're a seller
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        let query;
        if (user.isSeller) {
            // For sellers, get orders where they are the seller
            query = { seller: req.user.userId };
        } else {
            // For buyers, get orders where they are the buyer
            query = { buyer: req.user.userId };
        }
        
        if (status) {
            query.status = status;
        }

        const orders = await Transaction.find(query)
            .populate('product', 'name images price')
            .populate('buyer', 'fullName email')
            .populate('seller', 'fullName storeName email')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Transaction.countDocuments(query);

        res.json({
            orders,
            pagination: {
                currentPage: parseInt(page),
                totalPages: Math.ceil(total / limit),
                total,
                limit: parseInt(limit)
            },
            userRole: user.isSeller ? 'seller' : 'buyer'
        });
    } catch (error) {
        console.error('Get orders error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get order details
app.get('/api/orders/:orderId', authenticateToken, async (req, res) => {
    try {
        const order = await Transaction.findById(req.params.orderId)
            .populate('buyer', 'fullName email phoneNumber')
            .populate('seller', 'fullName email phoneNumber')
            .populate('product', 'name description price condition category images originalPrice');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user is buyer or seller
        if (order.buyer._id.toString() !== req.user.userId && 
            order.seller._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json({
            order,
            userRole: order.buyer._id.toString() === req.user.userId ? 'buyer' : 'seller'
        });
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Seller confirms order
app.post('/api/orders/:orderId/confirm', authenticateToken, async (req, res) => {
    try {
        const order = await Transaction.findById(req.params.orderId)
            .populate('buyer', 'fullName email')
            .populate('seller', 'fullName email');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user is the seller
        if (order.seller._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only seller can confirm order' });
        }

        // Check if order is in pending status
        if (order.status !== 'pending_seller_confirmation') {
            return res.status(400).json({ message: 'Order cannot be confirmed' });
        }

        // Update order status
        order.status = 'confirmed_by_seller';
        order.sellerConfirmedAt = new Date();
        await order.save();

        // Create notification for buyer
        await new Notification({
            recipient: order.buyer,
            sender: order.seller,
            type: 'order_confirmed',
            title: 'Order Confirmed!',
            message: `Your order #${order._id.toString().slice(-8)} has been confirmed by the seller.`,
            relatedOrder: order._id,
            status: 'unread'
        }).save();

        console.log('✅ Order confirmed by seller:', order._id);

        res.json({
            message: 'Order confirmed successfully',
            order: order
        });
    } catch (error) {
        console.error('Confirm order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Seller declines order
app.post('/api/orders/:orderId/decline', authenticateToken, async (req, res) => {
    try {
        const { reason } = req.body;
        
        const order = await Transaction.findById(req.params.orderId)
            .populate('buyer', 'fullName email')
            .populate('seller', 'fullName email')
            .populate('product', 'name price');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user is the seller
        if (order.seller._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Only seller can decline order' });
        }

        // Check if order is in pending status
        if (order.status !== 'pending_seller_confirmation') {
            return res.status(400).json({ message: 'Order cannot be declined' });
        }

        // Update order status
        order.status = 'declined';
        order.declinedAt = new Date();
        order.declineReason = reason || 'Order declined by seller';
        await order.save();

        // Refund any escrow if applicable
        if (order.isCashOnDelivery === false && order.paymentStatus === 'Paid') {
            // For non-cash orders, refund the payment
            order.paymentStatus = 'Refunded';
            await order.save();
        }

        // Create notification for buyer
        await new Notification({
            recipient: order.buyer._id,
            sender: order.seller._id,
            type: 'order_declined',
            title: 'Order Declined',
            message: `Your order #${order._id.toString().slice(-8)} has been declined by the seller.`,
            relatedOrder: order._id,
            status: 'unread'
        }).save();

        console.log('❌ Order declined by seller:', order._id, 'Reason:', reason);

        res.json({
            message: 'Order declined successfully',
            order: order
        });
    } catch (error) {
        console.error('Decline order error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update order status (for delivery confirmation and seller actions)
app.put('/api/orders/:orderId/status', authenticateToken, async (req, res) => {
    try {
        // Validate status transitions based on user role and cash on delivery flow
        if (isBuyer) {
            // Buyer confirms delivery - move to completed
            const completableStatuses = ['delivered_pending_confirmation', 'delivered', 'Shipped', 'out_for_delivery', 'both_confirmed'];
            
            if (completableStatuses.includes(order.status) || (order.status === 'confirmed_by_seller' && order.paymentMethod === 'cash_on_delivery')) {
                // Check if this order has already been completed/awarded
                if (order.status === 'Completed' || order.status === 'completed' || order.tokensAwarded) {
                    return res.status(400).json({ message: 'Order already completed and tokens awarded' });
                }

                // Check for active disputes
                if (order.disputeStatus === 'Open') {
                    return res.status(400).json({ message: 'Cannot complete order while a dispute is active' });
                }

                order.status = 'Completed';
                order.deliveryConfirmedAt = new Date();
                order.deliveryNotes = deliveryNotes || 'Delivery confirmed by buyer';
                order.tokensAwarded = true;
                
                // Award tokens to BOTH buyer and seller
                // 5 to seller, 2 to buyer (as per user request in conversation)
                const partyRewards = [
                    { id: order.buyer._id, role: 'buyer', amount: 2, reason: 'Delivery confirmation' },
                    { id: order.seller._id, role: 'seller', amount: 5, reason: 'Order completion' }
                ];

                for (const party of partyRewards) {
                    try {
                        await User.findByIdAndUpdate(party.id, {
                            $inc: { 
                                tokenBalance: party.amount,
                                totalTokensEarned: party.amount
                            }
                        });

                        // Create transaction history record
                        await new TokenTransaction({
                            user: party.id,
                            amount: party.amount,
                            type: 'earned',
                            reason: party.reason,
                            orderId: order._id,
                            description: `Earned ${party.amount} tokens for ${party.role === 'buyer' ? 'confirming' : 'completing'} order #${order._id.toString().slice(-8)}`
                        }).save();

                        // Send legacy Token model update for backward compatibility
                        let tokenAcc = await Token.findOne({ user: party.id });
                        if (!tokenAcc) tokenAcc = new Token({ user: party.id });
                        tokenAcc.currentBalance += party.amount;
                        tokenAcc.totalEarned += party.amount;
                        tokenAcc.transactions.push({
                            type: 'earned',
                            amount: party.amount,
                            reason: party.reason,
                            referenceId: order._id.toString(),
                            createdAt: new Date()
                        });
                        await tokenAcc.save();

                        // Save notification
                        await new Notification({
                            recipient: party.id,
                            title: 'Tokens Earned!',
                            message: `You earned ${party.amount} tokens for ${party.role === 'buyer' ? 'confirming delivery' : 'completing an order'}`,
                            type: 'token_earned',
                            data: { actionUrl: '/pages/tokens.html' }
                        }).save();
                    } catch (awardError) {
                        console.error(`Error awarding tokens to ${party.role}:`, awardError);
                    }
                }
                
                // Release payment to seller for cash on delivery orders
                if (order.paymentMethod === 'cash_on_delivery') {
                    order.paymentStatus = 'Released';
                    order.escrowReleased = true;
                    order.escrowReleasedAt = new Date();
                }
                
                console.log(`✅ Completed order and awarded tokens (S:5, B:2)`);
            } else {
                return res.status(400).json({ message: `Cannot confirm delivery while order is in ${order.status} status` });
            }
        } else if (isSeller) {
            // Seller actions
            if (status === 'confirmed_by_seller' && order.status === 'pending_seller_confirmation') {
                order.status = 'confirmed_by_seller';
                order.sellerConfirmedAt = new Date();
            } else if (status === 'declined' && order.status === 'pending_seller_confirmation') {
                order.status = 'declined';
                order.declinedAt = new Date();
                order.declineReason = deliveryNotes || 'Order declined by seller';
            } else if (status === 'Shipped' && (order.status === 'confirmed_by_seller' || order.status === 'Processing')) {
                order.status = 'Shipped';
                order.trackingNumber = trackingNumber;
                order.shippedAt = new Date();
            } else if (status === 'delivered_pending_confirmation' && (order.status === 'Shipped' || order.status === 'out_for_delivery' || order.status === 'confirmed_by_seller')) {
                order.status = 'delivered_pending_confirmation';
                order.deliveredAt = new Date();
                order.deliveryNotes = deliveryNotes || 'Order delivered, awaiting buyer confirmation';
            } else if (status === 'Processing' && order.status === 'confirmed_by_seller') {
                order.status = 'Processing';
            } else {
                return res.status(400).json({ message: `Invalid status transition from ${order.status} to ${status}` });
            }
        } else {
            return res.status(403).json({ message: 'Invalid status update for this user' });
        }

        await order.save();

        // Create notification for other party
        const notificationRecipient = isBuyer ? order.seller._id : order.buyer._id;
        const notificationTitle = isBuyer ? 'Delivery Confirmed' : 'Order Status Updated';
        const notificationMessage = isBuyer 
            ? `${order.buyer.fullName} confirmed delivery of the order`
            : `Order status updated to ${status}`;

        await new Notification({
            user: notificationRecipient,
            title: notificationTitle,
            message: notificationMessage,
            type: 'Transaction',
            link: `/orders.html`
        }).save();

        // Award 5 tokens to seller if buyer confirmed delivery (order completed) handled above in consolidated logic

        res.json({ message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Token Management endpoints

// Get user token balance and history
app.get('/api/tokens', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Get token transactions
        const tokenTransactions = await TokenTransaction.find({ user: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(50);

        res.json({
            tokenBalance: user.tokenBalance || 0,
            totalTokensEarned: user.totalTokensEarned || 0,
            totalTokensRedeemed: user.totalTokensRedeemed || 0,
            transactions: tokenTransactions
        });
    } catch (error) {
        console.error('Get token balance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get token redemption options
app.get('/api/tokens/redeem-options', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        const currentBalance = user.tokenBalance || 0;

        const redemptionOptions = [
            {
                id: 'discount_10_percent',
                name: '10% Discount',
                description: 'Get 10% off your next purchase',
                cost: 25,
                available: currentBalance >= 25,
                icon: 'fas fa-percentage'
            },
            {
                id: 'featured_product_week',
                name: 'Featured Product',
                description: 'Feature your product for 1 week',
                cost: 50,
                available: currentBalance >= 50,
                icon: 'fas fa-star'
            },
            {
                id: 'premium_showcase_month',
                name: 'Premium Showcase',
                description: 'Premium showcase placement for 1 month',
                cost: 100,
                available: currentBalance >= 100,
                icon: 'fas fa-crown'
            }
        ];

        res.json({
            currentBalance,
            redemptionOptions
        });
    } catch (error) {
        console.error('Get redemption options error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Redeem tokens for rewards
app.post('/api/tokens/redeem', authenticateToken, async (req, res) => {
    try {
        const { redemptionId } = req.body;
        
        if (!redemptionId) {
            return res.status(400).json({ message: 'Redemption ID required' });
        }

        const user = await User.findById(req.user.userId);
        const currentBalance = user.tokenBalance || 0;

        let reward;
        let cost = 0;

        switch (redemptionId) {
            case 'discount_10_percent':
                cost = 25;
                if (currentBalance >= cost) {
                    reward = { type: 'discount', value: '10%', code: `DISCOUNT10_${Date.now()}` };
                };
                break;
            case 'featured_product_week':
                cost = 50;
                if (currentBalance >= cost) {
                    reward = { type: 'featured_product', duration: '1 week' };
                }
                break;
            case 'premium_showcase_month':
                cost = 100;
                if (currentBalance >= cost) {
                    reward = { type: 'premium_showcase', duration: '1 month' };
                }
                break;
            default:
                return res.status(400).json({ message: 'Invalid redemption option' });
        }

        if (!reward || currentBalance < cost) {
            return res.status(400).json({ message: 'Insufficient tokens or invalid redemption' });
        }

        // Update user token balance
        await User.findByIdAndUpdate(req.user.userId, {
            $inc: { 
                tokenBalance: -cost,
                totalTokensRedeemed: cost
            }
        });

        // Create token transaction record
        await new TokenTransaction({
            user: req.user.userId,
            amount: -cost,
            type: 'redeemed',
            reason: `Redeemed for ${reward.type}`,
            description: `Redeemed ${cost} tokens for ${reward.type}`,
            reward: reward
        }).save();

        res.json({
            message: 'Tokens redeemed successfully',
            reward,
            newBalance: (user.tokenBalance || 0) - cost
        });

    } catch (error) {
        console.error('Redeem tokens error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Review endpoints

// Create a review
app.post('/api/reviews', authenticateToken, async (req, res) => {
    try {
        const { orderId, productId, rating, comment } = req.body;
        const userId = req.user.userId;

        // Validate input
        if (!orderId || !productId || !rating || rating < 1 || rating > 5) {
            return res.status(400).json({ message: 'Invalid review data' });
        }

        // Get transaction to verify user is the buyer
        const transaction = await Transaction.findById(orderId);
        if (!transaction) {
            return res.status(404).json({ message: 'Transaction not found' });
        }

        if (transaction.buyer.toString() !== userId) {
            return res.status(403).json({ message: 'Only buyers can leave reviews' });
        }

        if (!['Completed', 'completed', 'delivered', 'Delivered'].includes(transaction.status)) {
            return res.status(400).json({ message: 'Can only review delivered or completed transactions' });
        }

        // Check if review already exists
        const existingReview = await Review.findOne({
            reviewer: userId,
            transaction: orderId,
            product: productId
        });

        if (existingReview) {
            return res.status(400).json({ message: 'Review already exists for this transaction' });
        }

        // Get product to find seller
        const product = await Product.findById(productId);
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Create review
        const review = new Review({
            reviewer: userId,
            reviewedUser: product.seller,
            transaction: orderId,
            product: productId,
            reviewType: 'Buyer to Seller',
            rating: parseInt(rating),
            comment: comment || ''
        });

        await review.save();

        // Update seller's average rating
        await updateSellerRating(product.seller);

        // Award 3 tokens to buyer for leaving review
        try {
            await User.findByIdAndUpdate(userId, {
                $inc: { 
                    tokenBalance: 3,
                    totalTokensEarned: 3
                }
            });

            // Create token transaction history record
            await new TokenTransaction({
                user: userId,
                amount: 3,
                type: 'earned',
                reason: 'Review submitted',
                orderId: orderId,
                description: `Earned 3 tokens for leaving a review on product #${productId.slice(-6)}`
            }).save();

            // Notify legacy Token model
            let tokenAcc = await Token.findOne({ user: userId });
            if (!tokenAcc) tokenAcc = new Token({ user: userId });
            tokenAcc.currentBalance += 3;
            tokenAcc.totalEarned += 3;
            tokenAcc.transactions.push({
                type: 'earned',
                amount: 3,
                reason: 'Review submitted',
                referenceId: review._id.toString(),
                createdAt: new Date()
            });
            await tokenAcc.save();
        } catch (tokenError) {
            console.error('Error awarding tokens for review:', tokenError);
        }
        
        // Send token notification
        const tokenNotification = new Notification({
            recipient: userId,
            title: 'Tokens Earned!',
            message: 'You earned 3 tokens for leaving a review',
            type: 'token_earned',
            data: { actionUrl: '/pages/tokens.html' }
        });
        await tokenNotification.save();

        res.status(201).json({
            message: 'Review submitted successfully',
            review
        });
    } catch (error) {
        console.error('Create review error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's reviews (reviews they wrote)
app.get('/api/reviews/my-reviews', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const reviews = await Review.find({ reviewer: userId })
            .populate('reviewedUser', 'fullName')
            .populate('product', 'name images')
            .populate('transaction', 'createdAt')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('Get my reviews error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get reviews about user (reviews they received)
app.get('/api/reviews/about-me', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;

        const reviews = await Review.find({ reviewedUser: userId })
            .populate('reviewer', 'fullName')
            .populate('product', 'name images')
            .populate('transaction', 'createdAt')
            .sort({ createdAt: -1 });

        res.json(reviews);
    } catch (error) {
        console.error('Get reviews about me error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Delete a review
app.delete('/api/reviews/:id', authenticateToken, async (req, res) => {
    try {
        const review = await Review.findById(req.params.id);

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Check if user is the reviewer
        if (review.reviewer.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        await Review.findByIdAndDelete(req.params.id);

        // Update seller's average rating
        await updateSellerRating(review.reviewedUser);

        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        console.error('Delete review error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Helper function to update seller's average rating
async function updateSellerRating(sellerId) {
    try {
        const reviews = await Review.find({ 
            reviewedUser: sellerId, 
            reviewType: 'Buyer to Seller' 
        });

        if (reviews.length > 0) {
            const averageRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
            
            await User.findByIdAndUpdate(sellerId, {
                sellerRating: Math.round(averageRating * 10) / 10 // Round to 1 decimal place
            });
        }
    } catch (error) {
        console.error('Update seller rating error:', error);
    }
}

// ==================== TOKEN REWARD SYSTEM API ENDPOINTS ====================

// Get user's token balance and history
app.get('/api/tokens/balance', authenticateToken, async (req, res) => {
    try {
        const userId = req.user.userId;
        
        let tokenAccount = await Token.findOne({ user: userId });
        
        // Create token account if it doesn't exist
        if (!tokenAccount) {
            tokenAccount = new Token({ user: userId });
            await tokenAccount.save();
        }
        
        res.json({
            currentBalance: tokenAccount.currentBalance,
            totalEarned: tokenAccount.totalEarned,
            totalSpent: tokenAccount.totalSpent,
            transactions: tokenAccount.transactions.slice(-10), // Last 10 transactions
            lastActivity: tokenAccount.lastActivity
        });
    } catch (error) {
        console.error('Get token balance error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Award tokens to user
app.post('/api/tokens/earn', authenticateToken, async (req, res) => {
    try {
        const { amount, reason, referenceId, referenceType } = req.body;
        const userId = req.user.userId;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid token amount' });
        }
        
        if (!reason) {
            return res.status(400).json({ message: 'Reason is required' });
        }
        
        // Validate referenceType
        const validReferenceTypes = ['purchase', 'review', 'signup', 'referral', 'redemption', 'general'];
        if (referenceType && !validReferenceTypes.includes(referenceType)) {
            return res.status(400).json({ message: 'Invalid reference type' });
        }
        
        let tokenAccount = await Token.findOne({ user: userId });
        
        // Create token account if it doesn't exist
        if (!tokenAccount) {
            tokenAccount = new Token({ user: userId });
        }
        
        // Add tokens
        tokenAccount.currentBalance += amount;
        tokenAccount.totalEarned += amount;
        tokenAccount.lastActivity = new Date();
        
        // Add transaction record
        tokenAccount.transactions.push({
            type: 'earned',
            amount: amount,
            reason: reason,
            referenceId: referenceId,
            referenceType: referenceType || 'general',
            createdAt: new Date()
        });
        
        // Save token account first
        await tokenAccount.save();
        
        // Get the transaction ID from the newly added transaction
        const newTransaction = tokenAccount.transactions[tokenAccount.transactions.length - 1];
        const transactionId = newTransaction._id;
        
        try {
            // Send notification
            const notification = new Notification({
                recipient: userId,
                title: 'Tokens Earned!',
                message: `You've earned ${amount} tokens for: ${reason}`,
                type: 'token_earned',
                data: { actionUrl: '/pages/tokens.html' }
            });
            await notification.save();
        } catch (notificationError) {
            // If notification fails, log error but don't rollback token transaction
            console.error('Failed to send token notification:', notificationError);
        }
        
        res.json({
            message: `Successfully earned ${amount} tokens`,
            newBalance: tokenAccount.currentBalance,
            transactionId: transactionId
        });
    } catch (error) {
        console.error('Earn tokens error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Redeem/spend tokens
app.post('/api/tokens/spend', authenticateToken, async (req, res) => {
    try {
        const { amount, reason, referenceId, referenceType } = req.body;
        const userId = req.user.userId;
        
        if (!amount || amount <= 0) {
            return res.status(400).json({ message: 'Invalid token amount' });
        }
        
        if (!reason) {
            return res.status(400).json({ message: 'Reason is required' });
        }
        
        // Validate referenceType
        const validReferenceTypes = ['purchase', 'review', 'signup', 'referral', 'redemption', 'general'];
        if (referenceType && !validReferenceTypes.includes(referenceType)) {
            return res.status(400).json({ message: 'Invalid reference type' });
        }
        
        const tokenAccount = await Token.findOne({ user: userId });
        
        if (!tokenAccount) {
            return res.status(404).json({ message: 'Token account not found' });
        }
        
        if (tokenAccount.currentBalance < amount) {
            return res.status(400).json({ message: 'Insufficient token balance' });
        }
        
        // Deduct tokens
        tokenAccount.currentBalance -= amount;
        tokenAccount.totalSpent += amount;
        tokenAccount.lastActivity = new Date();
        
        // Add transaction record
        tokenAccount.transactions.push({
            type: 'spent',
            amount: amount,
            reason: reason,
            referenceId: referenceId,
            referenceType: referenceType || 'redemption',
            createdAt: new Date()
        });
        
        // Save token account first
        await tokenAccount.save();
        
        // Get the transaction ID from the newly added transaction
        const newTransaction = tokenAccount.transactions[tokenAccount.transactions.length - 1];
        const transactionId = newTransaction._id;
        
        try {
            // Send notification
            const notification = new Notification({
                recipient: userId,
                title: 'Tokens Spent',
                message: `You've spent ${amount} tokens for: ${reason}`,
                type: 'token_spent',
                data: { actionUrl: '/pages/tokens.html' }
            });
            await notification.save();
        } catch (notificationError) {
            // If notification fails, log error but don't rollback token transaction
            console.error('Failed to send token notification:', notificationError);
        }
        
        res.json({
            message: `Successfully spent ${amount} tokens`,
            newBalance: tokenAccount.currentBalance,
            transactionId: transactionId
        });
    } catch (error) {
        console.error('Spend tokens error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get token transaction history
app.get('/api/tokens/history', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 20, type } = req.query;
        const userId = req.user.userId;
        
        const tokenAccount = await Token.findOne({ user: userId });
        
        if (!tokenAccount) {
            return res.json({ transactions: [], totalPages: 0 });
        }
        
        let query = { user: userId };
        if (type) {
            query['transactions.type'] = type;
        }
        
        const skip = (parseInt(page) - 1) * parseInt(limit);
        
        // Get transactions with pagination
        const filteredTransactions = tokenAccount.transactions
            .filter(transaction => !type || transaction.type === type)
            .sort((a, b) => b.createdAt - a.createdAt);
        
        const transactions = filteredTransactions.slice(skip, skip + parseInt(limit));
        
        const totalTransactions = filteredTransactions.length;
        
        res.json({
            transactions: transactions,
            totalPages: Math.ceil(totalTransactions / parseInt(limit)),
            currentPage: parseInt(page),
            totalTransactions: totalTransactions
        });
    } catch (error) {
        console.error('Get token history error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Dispute Management Routes
const disputeController = require('./controllers/disputeController');

// File a new dispute (buyer only)
app.post('/api/disputes/file', authenticateToken, disputeController.fileDispute);

// Upload evidence for dispute
app.post('/api/disputes/:disputeId/evidence', authenticateToken, disputeController.upload.array('evidence', 5), disputeController.uploadEvidence);

// Get dispute details
app.get('/api/disputes/:disputeId', authenticateToken, disputeController.getDispute);

// Get user's disputes (both buyer and seller)
app.get('/api/disputes/user', authenticateToken, disputeController.getUserDisputes);

// Add message to dispute
app.post('/api/disputes/:disputeId/message', authenticateToken, disputeController.addMessage);

// Seller responds to dispute
app.post('/api/disputes/:disputeId/respond', authenticateToken, disputeController.sellerRespond);

// Admin dispute management
app.get('/api/disputes/admin', authenticateToken, disputeController.getAdminDisputes);

// Assign dispute to admin
app.put('/api/disputes/:disputeId/assign', authenticateToken, disputeController.assignDispute);

// Resolve dispute
app.put('/api/disputes/:disputeId/resolve', authenticateToken, disputeController.resolveDispute);

// Get dispute statistics
app.get('/api/disputes/stats', authenticateToken, disputeController.getDisputeStats);

// Withdraw dispute (buyer only)
app.put('/api/disputes/:disputeId/withdraw', authenticateToken, disputeController.withdrawDispute);

// ==================== TRANSACTION MANAGEMENT API ENDPOINTS ====================

const TransactionController = require('./controllers/transactionController');

// Get all transactions for admin
app.get('/api/admin/transactions', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.getTransactions);

// Get transaction by ID
app.get('/api/admin/transactions/:id', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.getTransaction);

// Create new transaction
app.post('/api/admin/transactions', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.createTransaction);

// Update transaction status
app.put('/api/admin/transactions/:id/status', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.updateTransactionStatus);

// Confirm transaction (buyer/seller confirmation)
app.post('/api/admin/transactions/:id/confirm', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.confirmTransaction);

// Release escrow
app.post('/api/admin/transactions/:id/release-escrow', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.releaseEscrow);

// Add message to transaction
app.post('/api/admin/transactions/:id/message', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.addMessage);

// Add admin note
app.post('/api/admin/transactions/:id/note', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.addAdminNote);

// Add risk flag
app.post('/api/admin/transactions/:id/risk-flag', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.addRiskFlag);

// Process refund
app.post('/api/admin/transactions/:id/refund', authenticateToken, checkRoleAccess('transaction_system'), TransactionController.processRefund);

// Get transaction statistics
app.get('/api/admin/transactions/stats', authenticateToken, checkRoleAccess('transaction_reports'), TransactionController.getTransactionStats);

// Get high-risk transactions
app.get('/api/admin/transactions/high-risk', authenticateToken, checkRoleAccess('transaction_reports'), TransactionController.getHighRiskTransactions);

// ==================== MAINTENANCE SYSTEM API ENDPOINTS ====================

const Maintenance = require('./models/Maintenance');
const { requireMaintenanceAccess } = require('./middleware/maintenance');

// Get maintenance status (public endpoint)
app.get('/api/maintenance/status', async (req, res) => {
    try {
        const activeMaintenance = await Maintenance.getActive();
        const upcomingMaintenance = await Maintenance.getUpcoming(7);
        
        res.json({
            isActive: !!activeMaintenance,
            activeMaintenance: activeMaintenance ? activeMaintenance.toSummary() : null,
            upcomingMaintenance: upcomingMaintenance.map(m => m.toSummary()),
            timestamp: new Date()
        });
    } catch (error) {
        console.error('Get maintenance status error:', error);
        res.status(500).json({ error: 'Failed to get maintenance status' });
    }
});

// Admin: Get all maintenance records
app.get('/api/admin/maintenance', authenticateToken, checkRoleAccess('maintenance_mode'), async (req, res) => {
    try {
        const { status, page = 1, limit = 20 } = req.query;
        let query = {};
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const skip = (page - 1) * limit;
        
        const maintenance = await Maintenance.find(query)
            .populate('createdBy', 'fullName email')
            .populate('lastUpdatedBy', 'fullName email')
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(parseInt(limit));
            
        const total = await Maintenance.countDocuments(query);
        
        res.json({
            maintenance,
            total,
            pages: Math.ceil(total / limit),
            currentPage: parseInt(page)
        });
    } catch (error) {
        console.error('Get maintenance records error:', error);
        res.status(500).json({ error: 'Failed to get maintenance records' });
    }
});

// Admin: Get single maintenance record
app.get('/api/admin/maintenance/:id', authenticateToken, checkRoleAccess('maintenance_mode'), async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id)
            .populate('createdBy', 'fullName email')
            .populate('lastUpdatedBy', 'fullName email')
            .populate('targetUsers', 'fullName email')
            .populate('reports.reportedBy', 'fullName email');
            
        if (!maintenance) {
            return res.status(404).json({ error: 'Maintenance record not found' });
        }
        
        res.json(maintenance);
    } catch (error) {
        console.error('Get maintenance record error:', error);
        res.status(500).json({ error: 'Failed to get maintenance record' });
    }
});

// Admin: Create new maintenance record
app.post('/api/admin/maintenance', authenticateToken, checkRoleAccess('maintenance_mode'), async (req, res) => {
    try {
        const maintenanceData = {
            ...req.body,
            createdBy: req.user.userId
        };
        
        const maintenance = new Maintenance(maintenanceData);
        await maintenance.save();
        
        // If this is an immediate activation, activate it
        if (maintenanceData.isActive && maintenanceData.status === 'active') {
            await maintenance.activate();
        }
        
        // Schedule notifications if needed
        if (maintenanceData.notificationSettings?.sendEmail || 
            maintenanceData.notificationSettings?.sendPush || 
            maintenanceData.notificationSettings?.sendInApp) {
            // TODO: Schedule maintenance notifications
            console.log(`📅 Maintenance notifications scheduled for: ${maintenance.title}`);
        }
        
        const populatedMaintenance = await Maintenance.findById(maintenance._id)
            .populate('createdBy', 'fullName email');
            
        res.status(201).json(populatedMaintenance);
    } catch (error) {
        console.error('Create maintenance error:', error);
        res.status(500).json({ error: 'Failed to create maintenance record' });
    }
});

// Admin: Update maintenance record
app.put('/api/admin/maintenance/:id', authenticateToken, checkRoleAccess('maintenance_mode'), async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
            return res.status(404).json({ error: 'Maintenance record not found' });
        }
        
        const updateData = {
            ...req.body,
            lastUpdatedBy: req.user.userId
        };
        
        Object.assign(maintenance, updateData);
        await maintenance.save();
        
        // Handle status changes
        if (req.body.status === 'active' && !maintenance.isActive) {
            await maintenance.activate();
        } else if (req.body.status === 'completed' && maintenance.isActive) {
            await maintenance.deactivate();
        }
        
        const populatedMaintenance = await Maintenance.findById(maintenance._id)
            .populate('createdBy', 'fullName email')
            .populate('lastUpdatedBy', 'fullName email');
            
        res.json(populatedMaintenance);
    } catch (error) {
        console.error('Update maintenance error:', error);
        res.status(500).json({ error: 'Failed to update maintenance record' });
    }
});

// Admin: Activate maintenance immediately
app.post('/api/admin/maintenance/:id/activate', authenticateToken, checkRoleAccess('maintenance_mode'), async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
            return res.status(404).json({ error: 'Maintenance record not found' });
        }
        
        await maintenance.activate();
        
        // Send immediate notifications
        // TODO: Send maintenance start notifications
        
        res.json({ message: 'Maintenance activated successfully', maintenance: maintenance.toSummary() });
    } catch (error) {
        console.error('Activate maintenance error:', error);
        res.status(500).json({ error: 'Failed to activate maintenance' });
    }
});

// Admin: Deactivate maintenance immediately
app.post('/api/admin/maintenance/:id/deactivate', authenticateToken, checkRoleAccess('maintenance_mode'), async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
            return res.status(404).json({ error: 'Maintenance record not found' });
        }
        
        await maintenance.deactivate();
        
        // Send completion notifications
        // TODO: Send maintenance completion notifications
        
        res.json({ message: 'Maintenance deactivated successfully', maintenance: maintenance.toSummary() });
    } catch (error) {
        console.error('Deactivate maintenance error:', error);
        res.status(500).json({ error: 'Failed to deactivate maintenance' });
    }
});

// Admin: Add maintenance report
app.post('/api/admin/maintenance/:id/reports', authenticateToken, checkRoleAccess('maintenance_reports'), async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
            return res.status(404).json({ error: 'Maintenance record not found' });
        }
        
        const reportData = {
            ...req.body,
            reportedBy: req.user.userId
        };
        
        await maintenance.addReport(reportData);
        
        res.json({ message: 'Report added successfully' });
    } catch (error) {
        console.error('Add maintenance report error:', error);
        res.status(500).json({ error: 'Failed to add maintenance report' });
    }
});

// Admin: Get maintenance statistics
app.get('/api/admin/maintenance/stats', authenticateToken, requireMaintenanceAccess, async (req, res) => {
    try {
        const { period = 30 } = req.query;
        
        const stats = await Maintenance.getStats(parseInt(period));
        const activeMaintenance = await Maintenance.getActive();
        const upcomingMaintenance = await Maintenance.getUpcoming(7);
        
        res.json({
            period: parseInt(period),
            statistics: stats,
            isActive: !!activeMaintenance,
            activeMaintenance: activeMaintenance ? activeMaintenance.toSummary() : null,
            upcomingCount: upcomingMaintenance.length,
            upcomingMaintenance: upcomingMaintenance.map(m => m.toSummary())
        });
    } catch (error) {
        console.error('Get maintenance stats error:', error);
        res.status(500).json({ error: 'Failed to get maintenance statistics' });
    }
});

// Admin: Send maintenance notifications
app.post('/api/admin/maintenance/:id/notify', authenticateToken, requireMaintenanceAccess, async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
            return res.status(404).json({ error: 'Maintenance record not found' });
        }
        
        const { channels, customMessage } = req.body;
        
        let notifiedUsers = 0;
        let messagesSent = 0;
        
        // Target users based on maintenance settings
        let targetUsers = [];
        if (maintenance.targetAudience === 'all_users') {
            targetUsers = await User.find({ isActive: true });
        } else if (maintenance.targetAudience === 'specific_users') {
            targetUsers = await User.find({ _id: { $in: maintenance.targetUsers } });
        } else {
            // Add more targeting logic as needed
            targetUsers = await User.find({ isActive: true });
        }
        
        // Send notifications through selected channels
        for (const user of targetUsers) {
            const notificationData = {
                recipient: user._id,
                type: 'system',
                title: maintenance.messageContent?.headline || maintenance.title,
                message: customMessage || maintenance.messageContent?.body || maintenance.description,
                priority: maintenance.priority === 'critical' ? 'critical' : 'high',
                data: {
                    maintenanceId: maintenance._id,
                    actionUrl: maintenance.messageContent?.actionUrl,
                    scheduledStartTime: maintenance.scheduledStartTime,
                    scheduledEndTime: maintenance.scheduledEndTime
                }
            };
            
            try {
                if (channels.includes('inapp')) {
                    await notificationService.createNotification(notificationData);
                    messagesSent++;
                }
                
                if (channels.includes('email') && user.email) {
                    // TODO: Send email notification
                    messagesSent++;
                }
                
                if (channels.includes('push') && user.pushSubscription) {
                    // TODO: Send push notification
                    messagesSent++;
                }
                
                notifiedUsers++;
            } catch (notificationError) {
                console.error(`Failed to notify user ${user._id}:`, notificationError);
            }
        }
        
        // Update metrics
        maintenance.metrics.usersNotified += notifiedUsers;
        maintenance.metrics.messagesSent += messagesSent;
        await maintenance.save();
        
        res.json({
            message: 'Notifications sent successfully',
            notifiedUsers,
            messagesSent,
            channels
        });
    } catch (error) {
        console.error('Send maintenance notifications error:', error);
        res.status(500).json({ error: 'Failed to send maintenance notifications' });
    }
});

// Admin: Delete maintenance record
app.delete('/api/admin/maintenance/:id', authenticateToken, requireMaintenanceAccess, async (req, res) => {
    try {
        const maintenance = await Maintenance.findById(req.params.id);
        if (!maintenance) {
            return res.status(404).json({ error: 'Maintenance record not found' });
        }
        
        // Don't allow deletion of active maintenance
        if (maintenance.isActive) {
            return res.status(400).json({ error: 'Cannot delete active maintenance record' });
        }
        
        await Maintenance.findByIdAndDelete(req.params.id);
        
        res.json({ message: 'Maintenance record deleted successfully' });
    } catch (error) {
        console.error('Delete maintenance error:', error);
        res.status(500).json({ error: 'Failed to delete maintenance record' });
    }
});

// Public: Subscribe to maintenance notifications via email
app.post('/api/maintenance/notify-email', async (req, res) => {
    try {
        const { email, maintenanceId } = req.body;
        
        if (!email) {
            return res.status(400).json({ error: 'Email is required' });
        }
        
        const MaintenanceNotificationService = require('./services/maintenanceNotificationService');
        const result = await MaintenanceNotificationService.subscribeToMaintenanceNotifications(email, maintenanceId);
        
        res.json(result);
    } catch (error) {
        console.error('Subscribe maintenance notifications error:', error);
        res.status(500).json({ error: error.message || 'Failed to subscribe to notifications' });
    }
});

// Public: Get maintenance notification preferences (for logged-in users)
app.get('/api/maintenance/notification-preferences', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ error: 'User not found' });
        }
        
        // Return user's notification preferences
        res.json({
            email: user.email,
            pushEnabled: user.pushSubscriptionEnabled || false,
            emailNotifications: user.emailNotifications !== false,
            smsNotifications: user.smsNotifications === true
        });
    } catch (error) {
        console.error('Get notification preferences error:', error);
        res.status(500).json({ error: 'Failed to get notification preferences' });
    }
});

// Admin: Get maintenance notification statistics
app.get('/api/admin/maintenance/:id/notification-stats', authenticateToken, requireMaintenanceAccess, async (req, res) => {
    try {
        const MaintenanceNotificationService = require('./services/maintenanceNotificationService');
        const stats = await MaintenanceNotificationService.getMaintenanceNotificationStats(req.params.id);
        
        res.json(stats);
    } catch (error) {
        console.error('Get maintenance notification stats error:', error);
        res.status(500).json({ error: 'Failed to get notification statistics' });
    }
});

// Admin: Get maintenance analytics
app.get('/api/admin/maintenance/analytics', authenticateToken, requireMaintenanceAccess, async (req, res) => {
    try {
        const { period = 30 } = req.query;
        const MaintenanceAnalyticsService = require('./services/maintenanceAnalyticsService');
        const analytics = await MaintenanceAnalyticsService.getMaintenanceAnalytics(parseInt(period));
        
        res.json(analytics);
    } catch (error) {
        console.error('Get maintenance analytics error:', error);
        res.status(500).json({ error: 'Failed to get maintenance analytics' });
    }
});

// Admin: Get detailed maintenance report
app.get('/api/admin/maintenance/:id/report', authenticateToken, requireMaintenanceAccess, async (req, res) => {
    try {
        const MaintenanceAnalyticsService = require('./services/maintenanceAnalyticsService');
        const report = await MaintenanceAnalyticsService.getMaintenanceReport(req.params.id);
        
        res.json(report);
    } catch (error) {
        console.error('Get maintenance report error:', error);
        res.status(500).json({ error: 'Failed to get maintenance report' });
    }
});

// Admin: Get maintenance recommendations
app.get('/api/admin/maintenance/recommendations', authenticateToken, requireMaintenanceAccess, async (req, res) => {
    try {
        const { period = 30 } = req.query;
        const MaintenanceAnalyticsService = require('./services/maintenanceAnalyticsService');
        const analytics = await MaintenanceAnalyticsService.getMaintenanceAnalytics(parseInt(period));
        
        res.json({
            recommendations: analytics.recommendations,
            summary: {
                total: analytics.recommendations.length,
                urgent: analytics.recommendations.filter(r => r.priority === 'urgent').length,
                high: analytics.recommendations.filter(r => r.priority === 'high').length,
                medium: analytics.recommendations.filter(r => r.priority === 'medium').length,
                low: analytics.recommendations.filter(r => r.priority === 'low').length
            }
        });
    } catch (error) {
        console.error('Get maintenance recommendations error:', error);
        res.status(500).json({ error: 'Failed to get maintenance recommendations' });
    }
});

// Admin: Get UX/UI maintenance recommendations
app.get('/api/admin/maintenance/ui-recommendations', authenticateToken, requireMaintenanceAccess, async (req, res) => {
    try {
        const UIMaintenanceRecommendationService = require('./services/uiMaintenanceRecommendationService');
        const recommendations = await UIMaintenanceRecommendationService.getUIMaintenanceRecommendations();
        
        res.json(recommendations);
    } catch (error) {
        console.error('Get UI maintenance recommendations error:', error);
        res.status(500).json({ error: 'Failed to get UI maintenance recommendations' });
    }
});

// ==================== STRATEGIC ANALYTICS API ====================

// Get comprehensive user analytics for strategic meetings
app.get('/api/analytics/user/strategic', authenticateToken, checkRoleAccess('strategic_analytics'), async (req, res) => {
    try {
        const analyticsController = require('./controllers/analyticsController');
        await analyticsController.getUserStrategicAnalytics(req, res);
    } catch (error) {
        console.error('Get user strategic analytics error:', error);
        res.status(500).json({ message: 'Failed to get user analytics', error: error.message });
    }
});

// Get platform-wide strategic analytics
app.get('/api/analytics/platform/strategic', authenticateToken, checkRoleAccess('strategic_analytics'), async (req, res) => {
    try {
        const analyticsController = require('./controllers/analyticsController');
        await analyticsController.getPlatformStrategicAnalytics(req, res);
    } catch (error) {
        console.error('Get platform strategic analytics error:', error);
        res.status(500).json({ message: 'Failed to get platform analytics', error: error.message });
    }
});

// Get user segment distribution for strategic planning
app.get('/api/analytics/segments/distribution', authenticateToken, checkRoleAccess('strategic_analytics'), async (req, res) => {
    try {
        const analyticsController = require('./controllers/analyticsController');
        await analyticsController.getUserSegmentDistribution(req, res);
    } catch (error) {
        console.error('Get user segment distribution error:', error);
        res.status(500).json({ message: 'Failed to get segment distribution', error: error.message });
    }
});

// Get top performers for strategic recognition
app.get('/api/analytics/performers/top', authenticateToken, checkRoleAccess('analytics_reports'), async (req, res) => {
    try {
        const analyticsController = require('./controllers/analyticsController');
        await analyticsController.getTopPerformers(req, res);
    } catch (error) {
        console.error('Get top performers error:', error);
        res.status(500).json({ message: 'Failed to get top performers', error: error.message });
    }
});

// Get growth forecast for strategic planning
app.get('/api/analytics/growth/forecast', authenticateToken, checkRoleAccess('growth_metrics'), async (req, res) => {
    try {
        const analyticsController = require('./controllers/analyticsController');
        await analyticsController.getGrowthForecast(req, res);
    } catch (error) {
        console.error('Get growth forecast error:', error);
        res.status(500).json({ message: 'Failed to generate forecast', error: error.message });
    }
});

// Get competitive intelligence for strategic positioning
app.get('/api/analytics/competitive/intelligence', authenticateToken, checkRoleAccess('strategic_analytics'), async (req, res) => {
    try {
        const analyticsController = require('./controllers/analyticsController');
        await analyticsController.getCompetitiveIntelligence(req, res);
    } catch (error) {
        console.error('Get competitive intelligence error:', error);
        res.status(500).json({ message: 'Failed to get competitive intelligence', error: error.message });
    }
});

// Generate strategic report for meetings
app.get('/api/analytics/strategic/report', authenticateToken, checkRoleAccess('analytics_reports'), async (req, res) => {
    try {
        const analyticsController = require('./controllers/analyticsController');
        await analyticsController.generateStrategicReport(req, res);
    } catch (error) {
        console.error('Generate strategic report error:', error);
        res.status(500).json({ message: 'Failed to generate report', error: error.message });
    }
});

// Process user analytics (for background jobs)
app.post('/api/analytics/user/process', authenticateToken, async (req, res) => {
    try {
        const { userId, period = 'monthly' } = req.body;
        const targetUserId = userId || req.user.id;
        
        const strategicAnalyticsService = require('./services/strategicAnalyticsService');
        const analytics = await strategicAnalyticsService.processUserAnalytics(targetUserId, period);
        
        res.json({ success: true, analytics });
    } catch (error) {
        console.error('Process user analytics error:', error);
        res.status(500).json({ message: 'Failed to process analytics', error: error.message });
    }
});

// Generate platform analytics (for background jobs)
app.post('/api/analytics/platform/generate', authenticateToken, checkRoleAccess('analytics_reports'), async (req, res) => {
    try {
        const { period = 'monthly' } = req.body;
        
        const strategicAnalyticsService = require('./services/strategicAnalyticsService');
        const analytics = await strategicAnalyticsService.generatePlatformAnalytics(period);
        
        res.json({ success: true, analytics });
    } catch (error) {
        console.error('Generate platform analytics error:', error);
        res.status(500).json({ message: 'Failed to generate analytics', error: error.message });
    }
});

// Get strategic insights for growth meetings
app.get('/api/analytics/strategic/insights', authenticateAdmin, async (req, res) => {
    try {
        const { timeframe = 'quarterly' } = req.query;
        
        const strategicAnalyticsService = require('./services/strategicAnalyticsService');
        const insights = await strategicAnalyticsService.generateStrategicInsights(timeframe);
        
        res.json(insights);
    } catch (error) {
        console.error('Get strategic insights error:', error);
        res.status(500).json({ message: 'Failed to get insights', error: error.message });
    }
});

// ==================== SUPPORT & LIVE CHAT APIS ====================
const supportController = require('./controllers/supportController');
const chatController = require('./controllers/chatController');

// Admin Support Routes
app.get('/api/admin/support/stats', authenticateAdmin, supportController.getStats);
app.get('/api/admin/support/tickets', authenticateAdmin, supportController.getAdminTickets);
app.patch('/api/admin/support/tickets/:id', authenticateAdmin, supportController.updateTicketStatus);

// Admin Live Chat Routes
app.get('/api/admin/live-chat/stats', authenticateAdmin, chatController.getStats);
app.get('/api/admin/live-chat/active', authenticateAdmin, chatController.getActiveSessions);
app.get('/api/admin/live-chat/agents', authenticateAdmin, (req, res) => res.json([]));
app.get('/api/admin/live-chat/:id', authenticateAdmin, chatController.getSessionDetails);
app.post('/api/admin/live-chat/:id/status', authenticateAdmin, chatController.updateSessionStatus);

// Admin Mass Messaging
app.post('/api/admin/mass-message', authenticateAdmin, async (req, res) => {
    try {
        const { message, audience, priority, title } = req.body;
        
        let targetUsers = [];
        if (audience === 'all') {
            targetUsers = await User.find({ status: 'active' }).select('_id');
        } else if (audience === 'buyers') {
            targetUsers = await User.find({ role: 'buyer', status: 'active' }).select('_id');
        } else if (audience === 'sellers') {
            targetUsers = await User.find({ role: 'seller', status: 'active' }).select('_id');
        } else if (audience === 'premium') {
            targetUsers = await User.find({ isPremium: true, status: 'active' }).select('_id');
        }
        
        if (targetUsers.length === 0) return res.status(400).json({ message: 'No users found for this audience' });
        
        const notifications = targetUsers.map(u => ({
            recipient: u._id,
            type: 'system',
            title: title || 'System Update',
            message: message,
            priority: priority || 'normal'
        }));
        
        await Notification.insertMany(notifications);
        
        res.json({ success: true, message: `Sent to ${targetUsers.length} users` });
    } catch (error) {
        console.error('Mass message error:', error);
        res.status(500).json({ message: 'Failed to send mass message', error: error.message });
    }
});

// ==================== MAINTENANCE SYSTEM SCHEDULER ====================

// Start maintenance scheduler (runs every minute to check for scheduled maintenance)
const { autoMaintenanceScheduler } = require('./middleware/maintenance');
setInterval(async () => {
    await autoMaintenanceScheduler();
}, 60000); // Check every minute

console.log('✅ Virtuosa Server initialized successfully');
