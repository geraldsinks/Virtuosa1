const Notification = require('../models/Notification');
const User = require('../models/User'); // Assuming User model exists
const mongoose = require('mongoose');
const io = require('socket.io');
const DOMPurify = require('isomorphic-dompurify');

// Input validation schema
const validateNotificationData = (options) => {
    const errors = [];
    
    // Validate required fields
    if (!options.recipientId || typeof options.recipientId !== 'string') {
        errors.push('Valid recipientId is required');
    }
    
    if (!options.type || typeof options.type !== 'string') {
        errors.push('Valid type is required');
    }
    
    if (!options.title || typeof options.title !== 'string') {
        errors.push('Valid title is required');
    } else if (options.title.length > 100) {
        errors.push('Title must be 100 characters or less');
    }
    
    if (!options.message || typeof options.message !== 'string') {
        errors.push('Valid message is required');
    } else if (options.message.length > 500) {
        errors.push('Message must be 500 characters or less');
    }
    
    // Validate optional fields
    if (options.priority && !['low', 'normal', 'high', 'critical'].includes(options.priority)) {
        errors.push('Priority must be one of: low, normal, high, critical');
    }
    
    if (options.channels && !Array.isArray(options.channels)) {
        errors.push('Channels must be an array');
    } else if (options.channels) {
        const validChannels = ['websocket', 'push', 'email', 'sms'];
        const invalidChannels = options.channels.filter(ch => !validChannels.includes(ch));
        if (invalidChannels.length > 0) {
            errors.push(`Invalid channels: ${invalidChannels.join(', ')}`);
        }
    }
    
    // Validate data object
    if (options.data && typeof options.data !== 'object') {
        errors.push('Data must be an object');
    }
    
    // Enhanced sanitization with multiple layers of protection
    const sanitizeString = (str) => {
        if (typeof str !== 'string') return str;
        
        // First pass: Remove null bytes and control characters
        let sanitized = str.replace(/[\x00-\x1F\x7F]/g, '').trim();
        
        // Second pass: DOMPurify with strict configuration
        sanitized = DOMPurify.sanitize(sanitized, {
            ALLOWED_TAGS: [], // No HTML tags allowed
            ALLOWED_ATTR: [], // No attributes allowed
            KEEP_CONTENT: true,
            RETURN_DOM: false,
            RETURN_DOM_FRAGMENT: false,
            RETURN_DOM_IMPORT: false,
            SAFE_FOR_TEMPLATES: true,
            WHOLE_DOCUMENT: false,
            CUSTOM_ELEMENT_HANDLING: {
                tagNameCheck: null,
                attributeNameCheck: null,
                allowCustomizedBuiltInElements: false
            }
        });
        
        // Third pass: Additional security measures
        sanitized = sanitized
            .replace(/javascript:/gi, '') // Remove javascript: protocol
            .replace(/data:/gi, '') // Remove data: protocol
            .replace(/vbscript:/gi, '') // Remove vbscript: protocol
            .replace(/on\w+\s*=/gi, '') // Remove event handlers
            .replace(/expression\s*\(/gi, '') // Remove CSS expressions
            .replace(/@import/gi, '') // Remove CSS imports
            .replace(/\\[uU]/gi, ''); // Remove unicode escapes
        
        // Fourth pass: Limit special characters that could be used for attacks
        sanitized = sanitized.replace(/[<>\"'&]/g, '');
        
        return sanitized;
    };
    
    // URL validation function
    const isValidUrl = (url) => {
        if (!url || typeof url !== 'string') return false;
        
        try {
            // Basic URL format validation
            const parsedUrl = new URL(url, 'http://localhost'); // Use base URL for relative paths
            
            // Only allow specific protocols
            const allowedProtocols = ['http:', 'https:', '/'];
            if (!allowedProtocols.includes(parsedUrl.protocol) && !url.startsWith('/')) {
                return false;
            }
            
            // Prevent javascript: and other dangerous protocols
            const dangerousProtocols = ['javascript:', 'data:', 'vbscript:', 'file:', 'ftp:'];
            if (dangerousProtocols.some(protocol => url.toLowerCase().startsWith(protocol))) {
                return false;
            }
            
            // Check for suspicious patterns
            const suspiciousPatterns = [
                /<script/i,
                /on\w+\s*=/i,
                /javascript:/i,
                /data:/i,
                /vbscript:/i
            ];
            
            return !suspiciousPatterns.some(pattern => pattern.test(url));
            
        } catch (error) {
            // If URL parsing fails, it's invalid
            return false;
        }
    };
    
    // Validate actionUrl if provided
    if (options.data?.actionUrl && !isValidUrl(options.data.actionUrl)) {
        errors.push('Invalid actionUrl format or potentially dangerous URL');
    }
    
    return {
        isValid: errors.length === 0,
        errors,
        sanitized: {
            ...options,
            title: sanitizeString(options.title),
            message: sanitizeString(options.message),
            data: options.data ? {
                ...options.data,
                actionText: options.data.actionText ? sanitizeString(options.data.actionText) : undefined,
                actionUrl: options.data.actionUrl && isValidUrl(options.data.actionUrl) ? 
                    sanitizeString(options.data.actionUrl) : undefined
            } : {}
        }
    };
};

class NotificationService {
    constructor(socketIO) {
        this.io = socketIO;
        this.connectedUsers = new Map(); // userId -> socketId mapping
        this.unreadCountCache = new Map(); // userId -> { count, timestamp }
        this.CACHE_TTL = 3 * 60 * 1000; // 3 minutes cache TTL for better performance
        this.cacheLocks = new Map(); // userId -> Promise for cache operations
        
        // Initialize periodic cache cleanup to prevent memory leaks
        this.initCacheCleanup();
    }

    /**
     * Initialize periodic cache cleanup
     */
    initCacheCleanup() {
        // Clean up expired cache entries every 5 minutes
        this.cleanupInterval = setInterval(() => {
            this.cleanupExpiredCacheEntries();
        }, 5 * 60 * 1000); // 5 minutes
        
        console.log('🧹 Notification service cache cleanup initialized');
    }

    /**
     * Clean up expired cache entries to prevent memory leaks
     */
    cleanupExpiredCacheEntries() {
        const now = Date.now();
        const expiredThreshold = this.CACHE_TTL * 10; // 10x TTL for cleanup
        let cleanedCount = 0;
        
        for (const [userId, data] of this.unreadCountCache.entries()) {
            if (now - data.timestamp > expiredThreshold) {
                this.unreadCountCache.delete(userId);
                cleanedCount++;
            }
        }
        
        if (cleanedCount > 0) {
            console.log(`🧹 Cleaned ${cleanedCount} expired cache entries. Current cache size: ${this.unreadCountCache.size}`);
        }
    }

    /**
     * Graceful cleanup - call when service is shutting down
     */
    destroy() {
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
            console.log('🔧 Cleanup interval cleared');
        }
        
        // Clear all caches and maps
        this.connectedUsers.clear();
        this.unreadCountCache.clear();
        this.cacheLocks.clear();
        
        // Remove any event listeners if they exist
        if (this.io) {
            this.io.removeAllListeners();
            console.log('🔧 Socket.IO event listeners cleared');
        }
        
        console.log('🔧 Notification service cleaned up gracefully');
    }

    /**
     * Send a notification to a user through multiple channels
     * @param {Object} options - Notification options
     * @param {String} options.recipientId - User ID to receive notification
     * @param {String} options.type - Notification type
     * @param {String} options.title - Notification title
     * @param {String} options.message - Notification message
     * @param {Object} options.data - Additional notification data
     * @param {String} options.priority - Notification priority (low, normal, high, critical)
     * @param {Array} options.channels - Channels to send through (websocket, push, email)
     */
    async sendNotification(options) {
        // Validate input data
        const validation = validateNotificationData(options);
        if (!validation.isValid) {
            const error = new Error('Validation failed: ' + validation.errors.join(', '));
            error.statusCode = 400;
            throw error;
        }

        // Use sanitized data
        const {
            recipientId,
            senderId,
            type,
            title,
            message,
            data = {},
            priority = 'normal',
            channels = ['websocket', 'push']
        } = validation.sanitized;

        try {
            // Load recipient to respect preferences
            const recipientUser = await User.findById(recipientId).select('notificationPreferences pushSubscriptionEnabled');

            // If recipient has explicit preferences, adjust channel scope
            const effectivePreferences = recipientUser?.notificationPreferences || {
                orderUpdates: true,
                promotions: true,
                messages: true,
                system: true,
                push: true
            };

            if (type === 'promotion' && !effectivePreferences.promotions) {
                return { skipped: true, reason: 'User disabled promotions' };
            }
            if (['new_order', 'order_confirmed', 'order_shipped', 'order_delivered', 'delivery_confirmed', 'payment_received', 'payment_failed'].includes(type) && !effectivePreferences.orderUpdates) {
                return { skipped: true, reason: 'User disabled order updates' };
            }
            if (type === 'message' && !effectivePreferences.messages) {
                return { skipped: true, reason: 'User disabled messages' };
            }
            if (type === 'system' && !effectivePreferences.system) {
                return { skipped: true, reason: 'User disabled system notifications' };
            }

            // Create notification object but don't save yet
            const notificationData = {
                recipient: recipientId,
                sender: senderId,
                type,
                title,
                message,
                data,
                priority,
                channels: {
                    websocket: channels.includes('websocket'),
                    push: channels.includes('push') && recipientUser?.pushSubscriptionEnabled,
                    email: channels.includes('email'),
                    sms: channels.includes('sms')
                }
            };

            // Track results for each channel
            const results = {
                database: false,
                websocket: false,
                push: false,
                email: false
            };

            // Send through channels first
            if (channels.includes('websocket') && this.io) {
                results.websocket = await this.sendWebSocketNotification(recipientId, notificationData);
            }

            if (channels.includes('push')) {
                results.push = await this.sendPushNotification(recipientId, notificationData);
            }

            if (channels.includes('email')) {
                results.email = await this.sendEmailNotification(recipientId, notificationData);
            }

            // Now create and save notification with final channel results
            const notification = new Notification({
                ...notificationData,
                channels: results
            });

            await notification.save();
            await notification.populate('sender', 'fullName email');
            results.database = true;

            console.log(`🔔 Notification sent to user ${recipientId}:`, {
                type,
                title,
                channels: results
            });

            return notification;

        } catch (error) {
            console.error('❌ Error sending notification:', error);
            throw error;
        }
    }

    /**
     * Get cached unread count or fetch from database with proper locking
     */
    async getCachedUnreadCount(userId) {
        // If there's an ongoing cache operation for this user, wait for it
        const existingLock = this.cacheLocks.get(userId);
        if (existingLock) {
            try {
                await existingLock;
            } catch (error) {
                // If the ongoing operation fails, remove the failed lock and proceed
                console.warn('Previous cache operation failed, removing lock:', error.message);
                this.cacheLocks.delete(userId);
            }
        }
        
        // Create a lock with timeout for this cache operation
        const cachePromise = this._performCachedCountOperationWithTimeout(userId);
        this.cacheLocks.set(userId, cachePromise);
        
        try {
            return await cachePromise;
        } finally {
            // Always remove the lock after operation completes
            this.cacheLocks.delete(userId);
        }
    }

    /**
     * Internal method to perform the actual cached count operation with timeout
     */
    async _performCachedCountOperationWithTimeout(userId) {
        const CACHE_OPERATION_TIMEOUT = 5000; // 5 seconds timeout
        
        const cacheOperation = this._performCachedCountOperation(userId);
        const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Cache operation timeout')), CACHE_OPERATION_TIMEOUT);
        });
        
        return await Promise.race([cacheOperation, timeoutPromise]);
    }

    /**
     * Internal method to perform the actual cached count operation
     */
    async _performCachedCountOperation(userId) {
        const cached = this.unreadCountCache.get(userId);
        const now = Date.now();
        
        // Return cached value if still valid
        if (cached && (now - cached.timestamp) < this.CACHE_TTL) {
            return cached.count;
        }
        
        // Fetch from database and cache
        const count = await Notification.countDocuments({ 
            recipient: userId, 
            status: 'unread',
            expiresAt: { $gt: new Date() }
        });
        
        this.unreadCountCache.set(userId, {
            count,
            timestamp: now
        });
        
        return count;
    }

    /**
     * Invalidate cached unread count for a user with proper lock handling
     */
    async invalidateUnreadCount(userId) {
        // Wait for any ongoing cache operation to complete
        const existingLock = this.cacheLocks.get(userId);
        if (existingLock) {
            try {
                await existingLock;
            } catch (error) {
                // If the ongoing operation fails, still proceed with invalidation
                console.warn('Ongoing cache operation failed, proceeding with invalidation:', error.message);
            }
        }
        
        // Remove from cache
        this.unreadCountCache.delete(userId);
    }

    /**
     * Batch update unread counts for multiple users
     */
    async batchUpdateUnreadCounts(userIds) {
        // Validate and filter ObjectIds - don't convert unnecessarily
        const validObjectIds = userIds.filter(id => 
            id && 
            typeof id === 'string' && 
            mongoose.Types.ObjectId.isValid(id)
        );
        
        if (validObjectIds.length === 0) {
            console.warn('No valid ObjectIds found in batch update');
            return [];
        }
        
        // Use string IDs directly in aggregation - MongoDB will handle conversion
        const counts = await Notification.aggregate([
            { 
                $match: { 
                    recipient: { $in: validObjectIds }, 
                    status: 'unread', 
                    expiresAt: { $gt: new Date() } 
                } 
            },
            { $group: { _id: '$recipient', count: { $sum: 1 } } }
        ]);
        
        const now = Date.now();
        counts.forEach(({ _id, count }) => {
            // Convert _id to string for cache key consistency
            const userIdString = _id.toString();
            this.unreadCountCache.set(userIdString, { count, timestamp: now });
        });
        
        return counts;
    }

    /**
     * Send real-time WebSocket notification
     */
    async sendWebSocketNotification(userId, notificationDataOrNotification) {
        try {
            const userRoom = `user_${userId}`;
            
            // Handle both notification data object and full notification
            const notificationSummary = notificationDataOrNotification.toSummary 
                ? notificationDataOrNotification.toSummary()
                : {
                    id: null, // Will be set after save
                    type: notificationDataOrNotification.type,
                    title: notificationDataOrNotification.title,
                    message: notificationDataOrNotification.message,
                    priority: notificationDataOrNotification.priority,
                    status: 'unread',
                    createdAt: new Date(),
                    data: notificationDataOrNotification.data
                };
            
            // Send to specific user room
            this.io.to(userRoom).emit('new_notification', notificationSummary);

            // Get unread count efficiently from cache
            const unreadCount = await this.getCachedUnreadCount(userId);
            this.io.to(userRoom).emit('notification_count_updated', {
                unreadCount
            });

            return true;
        } catch (error) {
            console.error('WebSocket notification error:', error);
            return false;
        }
    }

    /**
     * Send push notification (requires web-push API setup)
     */
    async sendPushNotification(userId, notificationDataOrNotification) {
        const maxRetries = 3;
        const baseDelay = 1000; // 1 second base delay
        
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                const User = require('../models/User');
                const user = await User.findById(userId);
                
                if (!user || !user.pushSubscription || !user.pushSubscriptionEnabled) {
                    console.log(`No push subscription found for user ${userId}`);
                    return false;
                }

                const webpush = require('web-push');
                
                // Handle both notification data object and full notification
                const notification = notificationDataOrNotification.toSummary 
                    ? notificationDataOrNotification
                    : notificationDataOrNotification;
                
                // Prepare push notification payload
                const payload = JSON.stringify({
                    title: notification.title,
                    body: notification.message,
                    icon: '/favicon.ico',
                    badge: '/favicon.ico',
                    tag: notification._id || Date.now().toString(),
                    requireInteraction: notification.priority === 'high' || notification.priority === 'critical',
                    data: {
                        url: notification.data?.actionUrl || '/pages/notifications.html',
                        notificationId: notification._id,
                        type: notification.type
                    },
                    actions: notification.data?.actionText && notification.data?.actionUrl ? [
                        {
                            action: 'view',
                            title: notification.data.actionText
                        },
                        {
                            action: 'dismiss',
                            title: 'Dismiss'
                        }
                    ] : []
                });

                // Send push notification with timeout
                const timeoutPromise = new Promise((_, reject) => {
                    setTimeout(() => reject(new Error('Push notification timeout')), 10000);
                });

                await Promise.race([
                    webpush.sendNotification(user.pushSubscription, payload),
                    timeoutPromise
                ]);
                
                console.log(`📱 Push notification sent to user ${userId}: ${notification.title}`);
                return true;
                
            } catch (error) {
                console.error(`Push notification error (attempt ${attempt}/${maxRetries}):`, error);
                
                // Handle different error types
                if (error.statusCode === 410 || error.statusCode === 404) {
                    // Subscription is invalid, remove it
                    console.log(`Removing invalid push subscription for user ${userId}`);
                    try {
                        const User = require('../models/User');
                        await User.findByIdAndUpdate(userId, {
                            pushSubscription: null,
                            pushSubscriptionEnabled: false
                        });
                    } catch (updateError) {
                        console.error('Failed to remove invalid subscription:', updateError);
                    }
                    return false; // Don't retry for invalid subscriptions
                }
                
                // For network errors or temporary failures, retry with exponential backoff
                if (attempt < maxRetries) {
                    const delay = baseDelay * Math.pow(2, attempt - 1); // Exponential backoff
                    console.log(`Retrying push notification in ${delay}ms...`);
                    await new Promise(resolve => setTimeout(resolve, delay));
                } else {
                    console.error(`Failed to send push notification after ${maxRetries} attempts`);
                }
            }
        }
        
        return false;
    }

    /**
     * Send email notification
     */
    async sendEmailNotification(userId, notificationDataOrNotification) {
        try {
            const user = await User.findById(userId);
            if (!user || !user.email) {
                return false;
            }

            // Handle both notification data object and full notification
            const notification = notificationDataOrNotification.toSummary 
                ? notificationDataOrNotification
                : notificationDataOrNotification;

            // Use existing email transporter from server
            // This would integrate with your existing email system
            console.log(`📧 Email notification prepared for ${user.email}: ${notification.title}`);
            return true; // Placeholder
        } catch (error) {
            console.error('Email notification error:', error);
            return false;
        }
    }

    /**
     * Send order-related notifications
     */
    async sendOrderNotification(order, eventType, recipientId) {
        const notifications = {
            new_order: {
                type: 'new_order',
                title: 'New Order Received! 🎉',
                message: `You received a new order for ${order.product?.name || 'your product'}`,
                data: {
                    orderId: order._id,
                    productId: order.product,
                    amount: order.amount,
                    actionUrl: `/orders`,
                    actionText: 'View Order'
                },
                priority: 'high'
            },
            order_confirmed: {
                type: 'order_confirmed',
                title: 'Order Confirmed ✓',
                message: `Your order has been confirmed by the seller`,
                data: {
                    orderId: order._id,
                    actionUrl: `/orders`,
                    actionText: 'Track Order'
                },
                priority: 'normal'
            },
            order_shipped: {
                type: 'order_shipped',
                title: 'Order Shipped 📦',
                message: `Your order has been shipped and is on its way!`,
                data: {
                    orderId: order._id,
                    trackingNumber: order.trackingNumber,
                    actionUrl: `/orders`,
                    actionText: 'Track Package'
                },
                priority: 'normal'
            },
            order_delivered: {
                type: 'order_delivered',
                title: 'Order Delivered ✓',
                message: `Your order has been delivered. Please confirm receipt`,
                data: {
                    orderId: order._id,
                    actionUrl: `/orders`,
                    actionText: 'Confirm Delivery'
                },
                priority: 'high'
            },
            delivery_confirmed: {
                type: 'delivery_confirmed',
                title: 'Delivery Confirmed! 🎉',
                message: `Buyer confirmed delivery of your order`,
                data: {
                    orderId: order._id,
                    amount: order.amount,
                    actionUrl: `/orders`,
                    actionText: 'View Details'
                },
                priority: 'high'
            }
        };

        const notificationConfig = notifications[eventType];
        if (!notificationConfig) {
            throw new Error(`Unknown order notification type: ${eventType}`);
        }

        return await this.sendNotification({
            recipientId,
            type: notificationConfig.type,
            title: notificationConfig.title,
            message: notificationConfig.message,
            data: notificationConfig.data,
            priority: notificationConfig.priority,
            channels: ['websocket', 'push', 'email']
        });
    }

    /**
     * Send product-related notifications
     */
    async sendProductNotification(product, eventType, recipientId) {
        const notifications = {
            product_approved: {
                type: 'product_approved',
                title: 'Product Approved! 🎉',
                message: `Your product "${product.name}" has been approved and is now live`,
                data: {
                    productId: product._id,
                    actionUrl: `/product/${product._id}`,
                    actionText: 'View Product'
                },
                priority: 'normal'
            },
            product_rejected: {
                type: 'product_rejected',
                title: 'Product Review Update',
                message: `Your product "${product.name}" needs some updates`,
                data: {
                    productId: product._id,
                    actionUrl: `/seller`,
                    actionText: 'Update Product'
                },
                priority: 'normal'
            }
        };

        const notificationConfig = notifications[eventType];
        if (!notificationConfig) {
            throw new Error(`Unknown product notification type: ${eventType}`);
        }

        return await this.sendNotification({
            recipientId,
            type: notificationConfig.type,
            title: notificationConfig.title,
            message: notificationConfig.message,
            data: notificationConfig.data,
            priority: notificationConfig.priority,
            channels: ['websocket', 'email']
        });
    }

    /**
     * Send token-related notifications
     */
    async sendTokenNotification(userId, amount, reason, transactionType = 'earned') {
        return await this.sendNotification({
            recipientId: userId,
            type: 'token_earned',
            title: `Tokens ${transactionType}! 🪙`,
            message: `You ${transactionType} ${amount} tokens for ${reason}`,
            data: {
                tokenAmount: amount,
                actionUrl: '/profile',
                actionText: 'View Balance'
            },
            priority: 'normal',
            channels: ['websocket']
        });
    }

    /**
     * Send notification to multiple recipient IDs (e.g., seller/buyer broadcasts)
     */
    async sendBulkNotifications({ recipientIds = [], type, title, message, data = {}, priority = 'normal', channels = ['websocket', 'push'] }) {
        if (!Array.isArray(recipientIds) || recipientIds.length === 0) {
            throw new Error('recipientIds must be a non-empty array');
        }

        const results = [];
        const uniqueIds = [...new Set(recipientIds.map(id => id.toString()))];

        for (const recipientId of uniqueIds) {
            try {
                const notification = await this.sendNotification({
                    recipientId,
                    type,
                    title,
                    message,
                    data,
                    priority,
                    channels
                });
                results.push({ recipientId, success: true, notificationId: notification._id });
            } catch (error) {
                console.error(`Failed to send bulk notification to ${recipientId}:`, error);
                results.push({ recipientId, success: false, error: error.message });
            }
        }

        return results;
    }

    /**
     * Mark notifications as read
     */
    async markAsRead(userId, notificationIds = null) {
        // Invalidate cache for this user asynchronously
        await this.invalidateUnreadCount(userId);
        
        return await Notification.markAsRead(userId, notificationIds);
    }

    /**
     * Get notification counts for a user
     */
    async getNotificationCounts(userId) {
        // Use cached unread count for efficiency
        const unread = await this.getCachedUnreadCount(userId);
        
        // Get other counts from database (these are less frequently accessed)
        const counts = await Notification.getCounts(userId);
        counts.unread = unread; // Use cached value
        
        return counts;
    }

    /**
     * Get notifications for a user with pagination
     */
    async getNotifications(userId, options = {}) {
        const { page = 1, limit = 20, status = null } = options;
        return await Notification.getAll(userId, page, limit, status);
    }

    /**
     * Update connected users mapping (called from Socket.IO connection handler)
     */
    updateConnectedUser(userId, socketId, isOnline = true) {
        if (isOnline) {
            this.connectedUsers.set(userId, socketId);
        } else {
            this.connectedUsers.delete(userId);
        }
    }

    /**
     * Clean up disconnected users (call periodically)
     */
    cleanupDisconnectedUsers() {
        // This method can be called periodically to clean up stale connections
        // For now, we rely on explicit disconnection events
        console.log(`Connected users count: ${this.connectedUsers.size}`);
    }

    /**
     * Clear all connected users (for server restart)
     */
    clearAllConnectedUsers() {
        this.connectedUsers.clear();
        console.log('All connected users cleared');
    }

    /**
     * Check if user is online
     */
    isUserOnline(userId) {
        return this.connectedUsers.has(userId);
    }
}

module.exports = NotificationService;
