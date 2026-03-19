const dns = require('node:dns');
dns.setServers(['8.8.8.8', '8.8.4.4']); // Force Google DNS

const express = require('express');
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
const { CloudinaryStorage } = require('multer-storage-cloudinary');
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
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: ["https://virtuosazm.com", "https://virtuosa1.vercel.app", "http://localhost:5500"],
        methods: ["GET", "POST"]
    }
});
app.use(cors( {
    origin: ["https://virtuosazm.com", "https://virtuosa1.vercel.app", "http://localhost:5500"],
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true
}));
app.use(express.json());
app.use(express.static(path.join(__dirname, '../client')));
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
app.get('/api/admin/users/stats', authenticateToken, async (req, res) => {
    try {
        // Verify admin access
        const adminUser = await User.findById(req.user.userId);
        console.log('Admin stats access attempt by user:', adminUser);
        console.log('Admin access granted, proceeding with stats aggregation');

        if (!adminUser) {
            console.log('Admin user not found');
            return res.status(403).json({ message: 'User not found' });
        }

        // Check admin access with multiple methods
        const isAdmin = adminUser.email === 'admin@virtuosa.com' ||
            adminUser.role === 'admin' ||
            adminUser.isAdmin === true ||
            adminUser.isAdmin === 'true';

        console.log('Admin check results:', {
            email: adminUser.email,
            role: adminUser.role,
            isAdmin: adminUser.isAdmin,
            isAdminString: adminUser.isAdmin?.toString(),
            finalResult: isAdmin
        });

        if (!isAdmin) {
            console.log('Admin access denied for user:', adminUser.email);
            return res.status(403).json({
                message: 'Admin access required',
                user: {
                    email: adminUser.email,
                    role: adminUser.role,
                    isAdmin: adminUser.isAdmin
                }
            });
        }

        console.log('Admin access granted, proceeding with stats aggregation');

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
        // Verify admin access
        const adminUser = await User.findById(req.user.userId);
        console.log('Target users access attempt by user:', adminUser);

        if (!adminUser) {
            console.log('Admin user not found for target users');
            return res.status(403).json({ message: 'User not found' });
        }

        // Check admin access with multiple methods
        const isAdmin = adminUser.email === 'admin@virtuosa.com' ||
            adminUser.role === 'admin' ||
            adminUser.isAdmin === true ||
            adminUser.isAdmin === 'true';

        console.log('Target users admin check results:', {
            email: adminUser.email,
            role: adminUser.role,
            isAdmin: adminUser.isAdmin,
            finalResult: isAdmin
        });

        if (!isAdmin) {
            console.log('Target users admin access denied for user:', adminUser.email);
            return res.status(403).json({
                message: 'Admin access required',
                user: {
                    email: adminUser.email,
                    role: adminUser.role,
                    isAdmin: adminUser.isAdmin
                }
            });
        }

        console.log('Target users admin access granted');

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
app.post('/api/admin/messages/send-mass', authenticateToken, async (req, res) => {
    try {
        // Verify admin access
        const adminUser = await User.findById(req.user.userId);
        console.log('Send mass message access attempt by user:', adminUser);

        if (!adminUser) {
            console.log('Admin user not found for send mass message');
            return res.status(403).json({ message: 'User not found' });
        }

        // Check admin access with multiple methods
        const isAdmin = adminUser.email === 'admin@virtuosa.com' ||
            adminUser.role === 'admin' ||
            adminUser.isAdmin === true ||
            adminUser.isAdmin === 'true';

        console.log('Send mass message admin check results:', {
            email: adminUser.email,
            role: adminUser.role,
            isAdmin: adminUser.isAdmin,
            finalResult: isAdmin
        });

        if (!isAdmin) {
            console.log('Send mass message admin access denied for user:', adminUser.email);
            return res.status(403).json({
                message: 'Admin access required',
                user: {
                    email: adminUser.email,
                    role: adminUser.role,
                    isAdmin: adminUser.isAdmin
                }
            });
        }

        console.log('Send mass message admin access granted');

        const {
            title,
            content,
            targetType, // 'all', 'buyers', 'sellers', 'verifiedSellers', 'proSellers', 'custom'
            customUserIds, // array of user IDs for custom targeting
            verifiedOnly,
            dateRange,
            scheduleTime, // optional - for scheduled sending
            includeUnsubscribe = true
        } = req.body;

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

        // Get retention configuration
        const retentionConfig = await RetentionConfig.findOne({ isActive: true });
        console.log('📋 Using retention config for mass messages');

        // Create messages for each user with retention policies
        const messages = [];
        for (const user of targetUsers) {
            const message = {
                sender: adminUser._id,
                receiver: user._id,
                content: content,
                messageType: 'promotion',
                isMassMessage: true,
                massMessageTitle: title,
                massMessageTarget: targetType,
                createdAt: scheduleTime ? new Date(scheduleTime) : new Date()
            };

            // Apply retention policy
            if (retentionConfig) {
                // Mass messages use the extended retention period
                const expiresAt = new Date(message.createdAt);
                expiresAt.setDate(expiresAt.getDate() + retentionConfig.massMessageRetention);

                message.retentionPolicy = 'extended';
                message.retentionExpiresAt = expiresAt;
                message.importance = 'high'; // Mass messages are important
            } else {
                // Default 1-year retention for mass messages
                const defaultExpiry = new Date(message.createdAt);
                defaultExpiry.setDate(defaultExpiry.getDate() + 365);

                message.retentionPolicy = 'extended';
                message.retentionExpiresAt = defaultExpiry;
                message.importance = 'high';
            }

            messages.push(message);
        }

        // Bulk insert messages
        const insertedMessages = await Message.insertMany(messages);
        console.log(`✅ Created ${insertedMessages.length} mass messages with retention policies`);

        // Send real-time notifications if not scheduled
        if (!scheduleTime || new Date(scheduleTime) <= new Date()) {
            insertedMessages.forEach(message => {
                const recipientRoom = `user_${message.receiver}`;
                io.to(recipientRoom).emit('new_message', message);
            });
        }

        res.json({
            success: true,
            messageCount: insertedMessages.length,
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
app.get('/api/admin/messages/mass-history', authenticateToken, async (req, res) => {
    try {
        // Verify admin access
        const adminUser = await User.findById(req.user.userId);
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.isAdmin !== true)) {
            return res.status(403).json({ message: 'Admin access required' });
        }

        const { page = 1, limit = 10 } = req.query;

        const massMessages = await Message.find({
            isMassMessage: true,
            sender: adminUser._id
        })
            .populate('receiver', 'fullName email isBuyer isSeller')
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Message.countDocuments({
            isMassMessage: true,
            sender: adminUser._id
        });

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

// --- Marketing Admin Dashboard API ---

// Middleware to check for Admin access (using existing logic)
const isAdmin = async (req, res, next) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) return res.status(403).json({ message: 'User not found' });

        const adminCheck = user.email === 'admin@virtuosa.com' ||
            user.role === 'admin' ||
            user.isAdmin === true ||
            user.isAdmin === 'true';

        if (!adminCheck) return res.status(403).json({ message: 'Admin access required' });
        next();
    } catch (error) {
        res.status(500).json({ message: 'Server error in admin check' });
    }
};

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

app.post('/api/marketing/promotions', authenticateToken, isAdmin, async (req, res) => {
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

app.put('/api/marketing/promotions/:id', authenticateToken, isAdmin, async (req, res) => {
    try {
        const promotion = await Promotion.findByIdAndUpdate(req.params.id, req.body, { new: true });
        if (!promotion) return res.status(404).json({ message: 'Promotion not found' });
        res.json(promotion);
    } catch (error) {
        res.status(500).json({ message: 'Error updating promotion' });
    }
});

app.delete('/api/marketing/promotions/:id', authenticateToken, isAdmin, async (req, res) => {
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

        // Check if marketing data already exists
        const existingAdSliders = await AdSlider.countDocuments();
        const existingCategoryCards = await CategoryCard.countDocuments();
        const existingMarketingAssets = await MarketingAsset.countDocuments();

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
    } catch (error) {
        console.error('❌ Error seeding marketing data:', error);
    }
}

mongoose.connection.on('error', (err) => {
    console.error('MongoDB error:', err.message);
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
app.post('/api/marketing/assets/upload', authenticateToken, isAdmin, marketingUpload.single('asset'), async (req, res) => {
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

app.get('/api/marketing/assets', authenticateToken, isAdmin, async (req, res) => {
    try {
        const assets = await MarketingAsset.find().sort({ createdAt: -1 });
        res.json(assets);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching assets' });
    }
});

app.delete('/api/marketing/assets/:id', authenticateToken, isAdmin, async (req, res) => {
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

// Enhanced User Schema with student verification and roles
const userSchema = new mongoose.Schema({
    fullName: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    university: { type: String, required: true },
    phoneNumber: { type: String, required: true },
    agreedToTerms: { type: Boolean, required: true },

    // Student verification
    studentEmail: { type: String, required: true },
    isStudentVerified: { type: Boolean, default: false },
    studentVerificationToken: String,
    studentVerificationExpires: Date,

    // Email verification
    isEmailVerified: { type: Boolean, default: false },
    emailVerificationToken: String,
    emailVerificationExpires: Date,

    // User roles
    role: { type: String, enum: ['user', 'admin'], default: 'user' },
    isAdmin: { type: mongoose.Schema.Types.Mixed, default: false },
    isBuyer: { type: Boolean, default: true },
    isSeller: { type: Boolean, default: false },
    sellerApplicationStatus: { type: String, enum: ['None', 'Pending', 'Approved', 'Rejected'], default: 'None' },
    sellerVerified: { type: Boolean, default: false },
    sellerVerificationPaid: { type: Boolean, default: false },
    sellerVerificationDate: Date,

    // Virtuosa Pro
    isProSeller: { type: Boolean, default: false },
    proSubscriptionStart: Date,
    proSubscriptionEnd: Date,

    // Profile
    profilePicture: String,
    bio: String,
    campusLocation: String,

    // Store Profile
    storeName: String,
    storeDescription: String,
    storeSlug: { type: String, unique: true, sparse: true },

    // Ratings
    buyerRating: { type: Number, default: 5.0, min: 1, max: 5 },
    sellerRating: { type: Number, default: 5.0, min: 1, max: 5 },
    totalBuyerReviews: { type: Number, default: 0 },
    totalSellerReviews: { type: Number, default: 0 },

    // Transaction stats
    successfulTransactions: { type: Number, default: 0 },
    totalTransactions: { type: Number, default: 0 },

    resetPasswordToken: String,
    resetPasswordExpires: Date,

    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

const User = mongoose.model('User', userSchema);
console.log('User model created successfully');

// Enhanced Product Schema
const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: Number,
    condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair'], required: true },
    images: [String],
    category: { type: String, required: true },
    subcategory: String,

    // Seller information
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName: { type: String, required: true },
    sellerEmail: { type: String, required: true },
    sellerPhone: { type: String, required: true },
    sellerRating: { type: Number, default: 5.0 },

    // Location and delivery
    campusLocation: { type: String, required: true },
    deliveryOptions: [{
        type: { type: String },
        price: Number,
        description: String
    }],

    // Product status
    status: { type: String, enum: ['Active', 'Sold', 'Reserved', 'Removed'], default: 'Active' },
    isFeatured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },

    // Academic specific
    courseCode: String,
    courseName: String,
    semester: String,
    subject: String,
    author: String,
    isbn: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    soldAt: Date
});

const Product = mongoose.model('Product', productSchema);
console.log('Product model created successfully');

// Category Schema
const categorySchema = new mongoose.Schema({
    name: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, required: true },
    image: { type: String, required: true }
});

const Category = mongoose.model('Category', categorySchema);
console.log('Category model created successfully');

// Transaction Schema for escrow system
const transactionSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },

    // Payment details
    totalAmount: { type: Number, required: true },
    commissionAmount: { type: Number, required: true },
    sellerPayout: { type: Number, required: true },
    deliveryFee: { type: Number, default: 0 },

    // Payment method
    paymentMethod: { type: String, enum: ['Mobile Money', 'Bank Transfer', 'Cash'], required: true },
    paymentReference: String,
    paymentStatus: { type: String, enum: ['Pending', 'Paid', 'Released', 'Refunded'], default: 'Pending' },

    // Transaction status
    status: { type: String, enum: ['Pending', 'Confirmed', 'Shipped', 'Delivered', 'Completed', 'Cancelled', 'Disputed'], default: 'Pending' },

    // Escrow
    escrowReleased: { type: Boolean, default: false },
    escrowReleasedAt: Date,

    // Delivery
    deliveryMethod: { type: String, enum: ['Meetup', 'Delivery', 'Shipping'] },
    deliveryAddress: String,
    trackingNumber: String,

    // Dispute
    disputeReason: String,
    disputeStatus: { type: String, enum: ['None', 'Open', 'Resolved', 'Rejected'], default: 'None' },
    disputeResolution: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    confirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    completedAt: Date,
    cancelledAt: Date
});

const Transaction = mongoose.model('Transaction', transactionSchema);
console.log('Transaction model created successfully');

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

// Notification Schema
const notificationSchema = new mongoose.Schema({
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    message: { type: String, required: true },
    type: { type: String, enum: ['System', 'Transaction', 'Account', 'Promotion'], default: 'System' },
    isRead: { type: Boolean, default: false },
    link: String,
    createdAt: { type: Date, default: Date.now }
});

const Notification = mongoose.model('Notification', notificationSchema);
console.log('Notification model created successfully');

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

retentionConfigSchema.index({ name: 1 });
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

const SellerApplication = mongoose.model('SellerApplication', sellerApplicationSchema);
console.log('SellerApplication model created successfully');

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
    const { fullName, email, password, university, phoneNumber, studentEmail, agreedToTerms } = req.body;

    if (!fullName || !email || !password || !university || !phoneNumber || !studentEmail || !agreedToTerms) {
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

        const hashedPassword = await bcrypt.hash(password, 10);
        const emailVerificationToken = crypto.randomBytes(20).toString('hex');
        const verificationToken = crypto.randomBytes(20).toString('hex');

        const user = new User({
            fullName,
            email: normalizedEmail,
            password: hashedPassword,
            university,
            phoneNumber,
            studentEmail: normalizedStudentEmail,
            agreedToTerms,
            emailVerificationToken,
            emailVerificationExpires: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
            studentVerificationToken: verificationToken,
            studentVerificationExpires: Date.now() + 24 * 60 * 60 * 1000 // 24 hours
        });

        await user.save();

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
            const emailResult = await transporter.sendMail({
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
            const studentVerificationLink = `${process.env.FRONTEND_URL || 'https://virtuosa1.vercel.app'}/api/auth/verify-student/${verificationToken}`;
            
            try {
                const studentEmailResult = await transporter.sendMail({
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
    const { email, password } = req.body;

    if (!email || !password) {
        return res.status(400).json({ message: 'Email and password are required' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    try {
        console.log('🔍 Login attempt for email:', normalizedEmail);
        
        const user = await User.findOne({ email: normalizedEmail });
        console.log('🔍 User query result:', user ? 'User found' : 'User not found');
        
        if (!user) {
            console.log('❌ Login failed - User not found for email:', normalizedEmail);
            return res.status(400).json({ message: 'Invalid email or password' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
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
        res.json({
            token,
            user: { 
                email: user.email, 
                fullName: user.fullName,
                isEmailVerified: user.isEmailVerified,
                isStudentVerified: user.isStudentVerified
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

        const resetLink = `${process.env.FRONTEND_URL || 'https://virtuosa1.vercel.app'}/pages/login.html?token=${token}`;
        await transporter.sendMail({
            to: email,
            subject: 'Virtuosa Password Reset',
            html: `
                <h2>Password Reset Request</h2>
                <p>You requested a password reset for your Virtuosa account.</p>
                <p>Click <a href="${resetLink}">here</a> to reset your password.</p>
                <p>This link will expire in 1 hour.</p>
            `
        });

        res.json({ message: 'Password reset email sent' });
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

        user.password = await bcrypt.hash(password, 10);
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

// Manual verification code endpoint (temporary workaround)
app.post('/api/auth/manual-verify', async (req, res) => {
    const { email } = req.body;
    
    if (!email) {
        return res.status(400).json({ message: 'Email is required' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    try {
        console.log('🔓 Manual verification request for:', normalizedEmail);
        
        const user = await User.findOne({ email: normalizedEmail });
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Generate verification code
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Store code temporarily (5 minutes expiry)
        user.manualVerificationCode = verificationCode;
        user.manualVerificationExpires = Date.now() + 5 * 60 * 1000; // 5 minutes
        await user.save();

        console.log('✅ Manual verification code generated for:', normalizedEmail);

        res.json({ 
            success: true, 
            message: `Verification code: ${verificationCode}. This code will expire in 5 minutes. Use this code to verify your email.`,
            verificationCode: verificationCode,
            expiresIn: 5
        });
    } catch (error) {
        console.error('❌ Manual verification error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Manual verification code confirmation endpoint
app.post('/api/auth/confirm-manual-verify', async (req, res) => {
    const { email, verificationCode } = req.body;
    
    if (!email || !verificationCode) {
        return res.status(400).json({ message: 'Email and verification code are required' });
    }

    // Normalize email to lowercase
    const normalizedEmail = email.toLowerCase();

    try {
        console.log('🔓 Manual verification confirmation for:', normalizedEmail, 'code:', verificationCode);
        
        const user = await User.findOne({ 
            email: normalizedEmail,
            manualVerificationCode: verificationCode,
            manualVerificationExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.status(400).json({ message: 'Invalid or expired verification code' });
        }

        // Mark user as verified
        user.isEmailVerified = true;
        user.manualVerificationCode = undefined;
        user.manualVerificationExpires = undefined;
        await user.save();

        console.log('✅ Manual verification confirmed for:', email);

        res.json({ 
            success: true, 
            message: 'Email verified successfully! You can now login.' 
        });
    } catch (error) {
        console.error('❌ Manual verification confirmation error:', error);
        res.status(500).json({ message: 'Server error' });
    }
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

// Create new product
app.post('/api/products', authenticateToken, upload.array('images', 5), async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || (!user.isSeller && user.role !== 'admin' && user.isAdmin !== true && user.isAdmin !== 'true')) {
            return res.status(403).json({ message: 'Seller access required' });
        }

        const {
            name,
            description,
            price,
            originalPrice,
            condition,
            category,
            subcategory,
            location, // From frontend
            pickupAvailable, // From frontend
            deliveryAvailable, // From frontend
            courseCode,
            courseName, // From frontend
            author, // From frontend
            isbn // From frontend
        } = req.body;

        // Basic validation
        if (!name || !description || !price || !condition || !category) {
            return res.status(400).json({ message: 'Required fields missing' });
        }

        // Map images to Cloudinary URLs
        const imageUrls = req.files ? req.files.map(file => file.path) : [];

        // Map delivery options
        const deliveryOptions = [];
        if (pickupAvailable === 'true' || pickupAvailable === true) {
            deliveryOptions.push({ type: 'Meetup', description: 'Buyer collects from you' });
        }
        if (deliveryAvailable === 'true' || deliveryAvailable === true) {
            deliveryOptions.push({ type: 'Delivery', description: 'You deliver to the buyer' });
        }

        const product = new Product({
            name,
            description,
            price: parseFloat(price),
            originalPrice: originalPrice ? parseFloat(originalPrice) : undefined,
            condition,
            images: imageUrls,
            category,
            subcategory,
            seller: user._id,
            sellerName: user.fullName,
            sellerEmail: user.email,
            sellerPhone: user.phoneNumber,
            sellerRating: user.sellerRating || 5.0,
            campusLocation: location || 'Not specified',
            deliveryOptions: deliveryOptions,
            courseCode,
            courseName,
            author,
            isbn,
            status: 'Active'
        });

        await product.save();
        res.status(201).json(product);
    } catch (error) {
        console.error('Create product error:', error);
        res.status(500).json({ message: error.message || 'Server error' });
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

// Get User's Draft
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
app.put('/api/products/:id', authenticateToken, async (req, res) => {
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
            return res.status(403).json({ message: 'Can only edit your own products' });
        }

        const updates = req.body;
        Object.assign(product, updates);
        product.updatedAt = new Date();
        await product.save();

        res.json(product);
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
app.get('/api/products/:id', async (req, res) => {
    try {
        const product = await Product.findById(req.params.id)
            .populate('seller', 'fullName email sellerRating totalSellerReviews storeName storeSlug');

        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }

        // Increment view count
        product.viewCount += 1;
        await product.save();

        res.json(product);
    } catch (error) {
        console.error('Get product error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Enhanced products endpoint with search and filter
app.get('/api/products', async (req, res) => {
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
        const filter = { status: 'Active' };

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
        const product = await Product.findById(productId);
        if (!product || product.status !== 'Active') {
            return res.status(404).json({ message: 'Product not available' });
        }

        if (product.seller.toString() === user._id.toString()) {
            return res.status(400).json({ message: 'Cannot buy your own product' });
        }

        // Calculate fees
        const commissionRate = 0.06; // 6% commission
        const commissionAmount = product.price * commissionRate;
        const deliveryFee = deliveryMethod === 'Delivery' ? 20 : 0; // K20 for delivery
        const totalAmount = product.price + deliveryFee;
        const sellerPayout = product.price - commissionAmount;

        // Create transaction
        const transaction = new Transaction({
            buyer: user._id,
            seller: product.seller,
            product: product._id,
            totalAmount,
            commissionAmount,
            sellerPayout,
            deliveryFee,
            paymentMethod,
            deliveryMethod,
            deliveryAddress,
            status: 'Pending'
        });

        await transaction.save();

        // Update product status
        product.status = 'Reserved';
        await product.save();

        res.status(201).json({
            transaction,
            paymentDetails: {
                totalAmount,
                commissionAmount,
                sellerPayout,
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
            .populate('buyer seller');

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

        // Notify seller
        await transporter.sendMail({
            to: transaction.seller.email,
            subject: 'Virtuosa - New Order Confirmed',
            html: `
                <h2>New Order Received!</h2>
                <p>You have a new order for: ${transaction.product.name}</p>
                <p>Buyer: ${transaction.buyer.fullName}</p>
                <p>Total Amount: K${transaction.totalAmount}</p>
                <p>Delivery Method: ${transaction.deliveryMethod}</p>
                <p>Please login to arrange delivery.</p>
            `
        });

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

        // Notify buyer
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

        // Update product status
        const product = await Product.findById(transaction.product._id);
        product.status = 'Sold';
        product.soldAt = new Date();
        await product.save();

        // Update user stats
        await User.findByIdAndUpdate(transaction.buyer._id, {
            $inc: { totalTransactions: 1, successfulTransactions: 1 }
        });

        await User.findByIdAndUpdate(transaction.seller._id, {
            $inc: { totalTransactions: 1, successfulTransactions: 1 }
        });

        // Notify seller about payment release
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

        res.json({
            message: 'Delivery confirmed! Payment released to seller.',
            transaction
        });
    } catch (error) {
        console.error('Confirm delivery error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user's transactions
app.get('/api/transactions', authenticateToken, async (req, res) => {
    try {
        const { type, status, page = 1, limit = 20 } = req.query;
        const user = await User.findById(req.user.userId);

        let filter = {};
        if (type === 'buying') {
            filter.buyer = user._id;
        } else if (type === 'selling') {
            filter.seller = user._id;
        } else {
            filter.$or = [{ buyer: user._id }, { seller: user._id }];
        }

        if (status) filter.status = status;

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
            // Fall back to hardcoded admin email if ADMIN_EMAIL env var is not set
            const adminEmail = process.env.ADMIN_EMAIL || 'admin@virtuosa.com';
            const userDoc = await User.findById(user.userId);
            if (!userDoc || (
                userDoc.email !== adminEmail &&
                userDoc.role !== 'admin' &&
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
        const totalCommissionRevenue = transactionsItems.reduce((sum, t) => sum + (t.commissionAmount || 0), 0);
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
                    revenue: { $sum: '$commissionAmount' },
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
        const totalGrossRevenue = transactionsItems.reduce((sum, t) => sum + (t.totalAmount || 0), 0);
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
app.get('/api/admin/user-analytics', authenticateAdmin, async (req, res) => {
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
app.post('/api/admin/disputes/:id/resolve', authenticateAdmin, async (req, res) => {
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
    // Configure Multer for profile pictures
const profilePictureStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, '../client/uploads/profiles');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        cb(null, 'profile-' + req.user.userId + '-' + uniqueSuffix + path.extname(file.originalname));
    }
});

const profilePictureUpload = multer({
    storage: profilePictureStorage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|webp/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);
        if (extname && mimetype) {
            return cb(null, true);
        }
        cb(new Error('Only images (jpeg, jpg, png, gif, webp) are allowed'));
    }
});
} catch (error) {
    console.error('Update profile error:', error);
    res.status(500).json({ message: 'Server error' });
}
});

// Upload profile picture
app.post('/api/user/profile-picture', authenticateToken, profilePictureUpload.single('profilePicture'), async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        if (!req.file) {
            return res.status(400).json({ message: 'No file uploaded' });
        }

        // Update user profile picture URL with Cloudinary URL
        user.profilePicture = req.file.path;
        await user.save();

        res.json({
            message: 'Profile picture uploaded successfully',
            profilePicture: user.profilePicture
        });
    } catch (error) {
        console.error('Upload profile picture error:', error);
        res.status(500).json({ message: 'Server error' });
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

// Get user notifications
app.get('/api/notifications', authenticateToken, async (req, res) => {
    try {
        const notifications = await Notification.find({ user: req.user.userId })
            .sort({ createdAt: -1 })
            .limit(50);
        res.json(notifications);
    } catch (error) {
        console.error('Get notifications error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Mark notification as read
app.put('/api/notifications/:id/read', authenticateToken, async (req, res) => {
    try {
        const notification = await Notification.findOneAndUpdate(
            { _id: req.params.id, user: req.user.userId },
            { isRead: true },
            { returnDocument: 'after' }
        );
        if (!notification) {
            return res.status(404).json({ message: 'Notification not found' });
        }
        res.json(notification);
    } catch (error) {
        console.error('Mark notification read error:', error);
        res.status(500).json({ message: 'Server error' });
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
        const application = await SellerApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.status !== 'Pending') {
            return res.status(400).json({ message: 'This application has already been reviewed.' });
        }

        const adminUser = await User.findById(req.user.userId);

        application.status = 'Approved';
        application.reviewedBy = req.user.userId;
        application.reviewedAt = new Date();
        application.adminReviewNotes = req.body.notes || '';
        await application.save();

        // Update user
        const user = await User.findById(application.user);
        if (user) {
            user.sellerApplicationStatus = 'Approved';
            user.isSeller = true;
            await user.save();

            // Create notification
            const notification = new Notification({
                user: user._id,
                title: 'Seller Application Approved! 🎉',
                message: 'Congratulations! Your seller application has been approved. You can now list items on Virtuosa.',
                type: 'Account',
                link: '/pages/seller-verification.html'
            });
            await notification.save();

            // Send email (non-blocking)
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
        }

        res.json({ message: 'Seller application approved successfully' });
    } catch (error) {
        console.error('Approve application error:', error);
        res.status(500).json({ message: 'Server error' });
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
        const application = await SellerApplication.findById(req.params.id);
        if (!application) {
            return res.status(404).json({ message: 'Application not found' });
        }

        if (application.status !== 'Pending') {
            return res.status(400).json({ message: 'This application has already been reviewed.' });
        }

        const { reason, notes } = req.body;
        if (!reason) {
            return res.status(400).json({ message: 'Please provide a rejection reason.' });
        }

        application.status = 'Rejected';
        application.rejectionReason = reason;
        application.adminReviewNotes = notes || '';
        application.reviewedBy = req.user.userId;
        application.reviewedAt = new Date();
        await application.save();

        // Update user
        const user = await User.findById(application.user);
        if (user) {
            user.sellerApplicationStatus = 'Rejected';
            await user.save();

            // Create notification
            const notification = new Notification({
                user: user._id,
                title: 'Seller Application Update',
                message: `Your seller application was not approved. Reason: ${reason}. You may update your information and reapply.`,
                type: 'Account',
                link: '/pages/seller.html'
            });
            await notification.save();
        }

        res.json({ message: 'Application rejected successfully' });
    } catch (error) {
        console.error('Reject application error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

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
app.get('/api/seller/dashboard', authenticateToken, async (req, res) => {
    try {
        const user = await User.findById(req.user.userId);
        if (!user || !user.isSeller) {
            return res.status(403).json({ message: 'Seller access required' });
        }

        // Get seller's products
        const products = await Product.find({ seller: user._id });

        // Get seller's transactions
        const transactions = await Transaction.find({ seller: user._id })
            .populate('buyer', 'fullName email')
            .populate('product', 'name price');

        // Get seller's reviews
        const reviews = await Review.find({ reviewedUser: user._id, reviewType: 'Buyer to Seller' })
            .populate('reviewer', 'fullName')
            .sort({ createdAt: -1 });

        // Calculate stats
        const totalRevenue = transactions
            .filter(t => t.status === 'Completed')
            .reduce((sum, t) => sum + t.sellerPayout, 0);

        const activeListings = products.filter(p => p.status === 'Active').length;
        const soldItems = products.filter(p => p.status === 'Sold').length;
        const pendingTransactions = transactions.filter(t => ['Pending', 'Confirmed'].includes(t.status)).length;

        res.json({
            seller: {
                name: user.fullName,
                email: user.email,
                isVerified: user.sellerVerified,
                isPro: user.isProSeller,
                rating: user.sellerRating,
                totalReviews: user.totalSellerReviews,
                successfulTransactions: user.successfulTransactions,
                memberSince: user.createdAt,
                storeName: user.storeName,
                storeDescription: user.storeDescription,
                storeSlug: user.storeSlug
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

const PORT = process.env.PORT || 5000;

server.listen(PORT, '0.0.0.0', () => {
    console.log(`Virtuosa backend is listening on port ${PORT}`);
});

// Socket.io connection handling
const connectedUsers = new Map(); // userId -> socketId

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
                console.log(`User ${decoded.userId} authenticated and connected`);

                // Notify other users that this user is online
                socket.broadcast.emit('user_online', { userId: decoded.userId });
            }
        } catch (error) {
            console.error('Socket authentication error:', error);

            if (error.name === 'TokenExpiredError') {
                console.log('Token expired, sending refresh signal to client');
                socket.emit('token_expired', {
                    message: 'Your session has expired. Please refresh the page.',
                    expiredAt: error.expiredAt
                });
            } else if (error.name === 'JsonWebTokenError') {
                console.log('Invalid token, sending error to client');
                socket.emit('auth_error', {
                    message: 'Invalid authentication token. Please log in again.'
                });
            } else {
                console.log('Other auth error, sending generic error to client');
                socket.emit('auth_error', {
                    message: 'Authentication failed. Please try again.'
                });
            }

            // Don't immediately disconnect, let the client handle the error
            setTimeout(() => {
                if (!socket.userId) {
                    socket.disconnect();
                }
            }, 1000);
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

    // Handle disconnection
    socket.on('disconnect', () => {
        if (socket.userId) {
            connectedUsers.delete(socket.userId);
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
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.isAdmin !== true)) {
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
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.isAdmin !== true)) {
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
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.isAdmin !== true)) {
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
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.isAdmin !== true)) {
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
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.isAdmin !== true)) {
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
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.isAdmin !== true)) {
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
        if (!adminUser || (adminUser.email !== 'admin@virtuosa.com' && adminUser.role !== 'admin' && adminUser.isAdmin !== true)) {
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

// Run migration on server start
migrateExistingMessages();

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
            return res.json({ items: [], total: 0 });
        }

        const total = cart.items.reduce((sum, item) => {
            return sum + (item.product.price * item.quantity);
        }, 0);

        res.json({ items: cart.items, total });
    } catch (error) {
        console.error('Get cart error:', error);
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

        // Verify product exists and is active
        const product = await Product.findById(productId);
        if (!product || product.status !== 'Active') {
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

        res.json({ message: 'Item added to cart successfully' });
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

        res.json({ message: 'Cart updated successfully' });
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

        res.json({ message: 'Item removed from cart successfully' });
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
                price: cartItem.product.price,
                totalAmount: cartItem.product.price * cartItem.quantity,
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
                totalAmount: t.totalAmount,
                status: t.status
            }))
        });
    } catch (error) {
        console.error('Checkout error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Get user orders
app.get('/api/orders', authenticateToken, async (req, res) => {
    try {
        const { page = 1, limit = 10, status } = req.query;
        
        let query = { buyer: req.user.userId };
        if (status) {
            query.status = status;
        }

        const orders = await Transaction.find(query)
            .populate('product', 'name images price')
            .populate('seller', 'fullName storeName')
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
            }
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
            .populate('product', 'name images description price')
            .populate('seller', 'fullName storeName email phoneNumber')
            .populate('buyer', 'fullName email phoneNumber');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        // Check if user is buyer or seller
        if (order.buyer._id.toString() !== req.user.userId && 
            order.seller._id.toString() !== req.user.userId) {
            return res.status(403).json({ message: 'Access denied' });
        }

        res.json(order);
    } catch (error) {
        console.error('Get order details error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

// Update order status (for delivery confirmation)
app.put('/api/orders/:orderId/status', authenticateToken, async (req, res) => {
    try {
        const { status, trackingNumber, deliveryNotes } = req.body;
        
        const order = await Transaction.findById(req.params.orderId)
            .populate('seller', 'fullName')
            .populate('buyer', 'fullName');

        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }

        const user = await User.findById(req.user.userId);
        const isBuyer = order.buyer._id.toString() === req.user.userId;
        const isSeller = order.seller._id.toString() === req.user.userId;

        // Validate status transitions based on user role
        if (isBuyer && status === 'Delivered') {
            // Buyer can confirm delivery
            order.status = 'Delivered';
            order.deliveryConfirmedAt = new Date();
            order.deliveryNotes = deliveryNotes;
        } else if (isSeller) {
            // Seller can update shipping status
            if (status === 'Shipped') {
                order.status = 'Shipped';
                order.trackingNumber = trackingNumber;
                order.shippedAt = new Date();
            } else if (status === 'Processing') {
                order.status = 'Processing';
            }
        } else {
            return res.status(403).json({ message: 'Invalid status update for this user' });
        }

        await order.save();

        // Create notification for the other party
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

        res.json({ message: 'Order status updated successfully', order });
    } catch (error) {
        console.error('Update order status error:', error);
        res.status(500).json({ message: 'Server error' });
    }
});

console.log('🗂️ Data Retention Management System initialized');
