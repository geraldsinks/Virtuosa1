const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
    recipient: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sender: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: false
    },
    type: {
        type: String,
        enum: [
            'new_order',           // Seller receives new order
            'order_confirmed',     // Buyer order confirmed
            'order_shipped',       // Buyer order shipped
            'order_delivered',     // Seller order delivered
            'delivery_confirmed',  // Buyer confirms delivery
            'payment_received',    // Seller receives payment
            'payment_failed',      // Payment failed
            'product_approved',    // Seller product approved
            'product_rejected',    // Seller product rejected
            'account_verified',    // User account verified
            'promotion',           // Promotional notifications
            'system',              // System notifications
            'message',            // New message
            'review_received',    // New review received
            'token_earned',        // Tokens earned
            'dispute_filed',       // New dispute filed (seller)
            'dispute_response',    // Seller responded to dispute (buyer)
            'dispute_message',     // New message in dispute
            'dispute_resolved',    // Dispute resolved (both parties)
            'dispute_withdrawn',   // Dispute withdrawn (seller)
            'dispute_escalated'    // High priority dispute (admin)
        ],
        required: true
    },
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    message: {
        type: String,
        required: true,
        maxlength: 500
    },
    data: {
        // Additional data related to the notification
        orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
        productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        amount: Number,
        tokenAmount: Number,
        actionUrl: String,      // URL to redirect when clicked
        actionText: String,     // Button text for action
        metadata: mongoose.Schema.Types.Mixed
    },
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'critical'],
        default: 'normal'
    },
    status: {
        type: String,
        enum: ['unread', 'read', 'archived'],
        default: 'unread'
    },
    channels: {
        // Which channels this notification was sent through
        websocket: { type: Boolean, default: false },
        push: { type: Boolean, default: false },
        email: { type: Boolean, default: false },
        sms: { type: Boolean, default: false }
    },
    readAt: Date,
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    }
}, {
    timestamps: true
});

// Indexes for better performance
notificationSchema.index({ recipient: 1, status: 1, createdAt: -1 });
notificationSchema.index({ recipient: 1, type: 1, createdAt: -1 });

// TTL index to automatically delete expired notifications
notificationSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

// Pre-save middleware to set expiration based on priority
notificationSchema.pre('save', function(next) {
    if (this.isNew) {
        const now = new Date();
        switch (this.priority) {
            case 'critical':
                this.expiresAt = new Date(now.getTime() + 90 * 24 * 60 * 60 * 1000); // 90 days
                break;
            case 'high':
                this.expiresAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
                break;
            case 'normal':
                this.expiresAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
                break;
            case 'low':
                this.expiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
                break;
        }
    }
    next();
});

// Static methods
notificationSchema.statics = {
    // Get unread notifications for a user
    async getUnread(userId, limit = 50) {
        return await this.find({ 
            recipient: userId, 
            status: 'unread',
            expiresAt: { $gt: new Date() } // Only return non-expired notifications
        })
        .populate('sender', 'fullName email')
        .sort({ createdAt: -1 })
        .limit(limit);
    },

    // Get all notifications for a user with pagination
    async getAll(userId, page = 1, limit = 20, status = null) {
        const query = { 
            recipient: userId,
            expiresAt: { $gt: new Date() } // Only return non-expired notifications
        };
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const notifications = await this.find(query)
            .populate('sender', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        const total = await this.countDocuments(query);
        
        return {
            notifications,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        };
    },

    // Mark notifications as read
    async markAsRead(userId, notificationIds = null) {
        const updateData = { 
            status: 'read', 
            readAt: new Date() 
        };
        
        const query = { 
            recipient: userId, 
            status: 'unread' 
        };
        
        if (notificationIds && notificationIds.length > 0) {
            query._id = { $in: notificationIds };
        }
        
        return await this.updateMany(query, updateData);
    },

    // Get notification count by status
    async getCounts(userId) {
        const counts = await this.aggregate([
            { $match: { 
                recipient: userId,
                expiresAt: { $gt: new Date() } // Only count non-expired notifications
            }},
            { $group: {
                _id: '$status',
                count: { $sum: 1 }
            }}
        ]);
        
        const result = {
            unread: 0,
            read: 0,
            archived: 0,
            total: 0
        };
        
        counts.forEach(item => {
            result[item._id] = item.count;
            result.total += item.count;
        });
        
        return result;
    }
};

// Instance methods
notificationSchema.methods = {
    // Mark this notification as read
    async markAsRead() {
        this.status = 'read';
        this.readAt = new Date();
        return await this.save();
    },

    // Archive this notification
    async archive() {
        this.status = 'archived';
        return await this.save();
    },

    // Check if notification is expired
    isExpired() {
        return new Date() > this.expiresAt;
    },

    // Get notification summary for display
    toSummary() {
        return {
            id: this._id,
            type: this.type,
            title: this.title,
            message: this.message,
            priority: this.priority,
            status: this.status,
            createdAt: this.createdAt,
            readAt: this.readAt,
            data: {
                actionUrl: this.data?.actionUrl,
                actionText: this.data?.actionText,
                orderId: this.data?.orderId,
                productId: this.data?.productId
            }
        };
    }
};

const Notification = mongoose.model('Notification', notificationSchema);

module.exports = Notification;
