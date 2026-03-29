const mongoose = require('mongoose');

const disputeSchema = new mongoose.Schema({
    // Basic dispute information
    order: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Transaction',
        required: true,
        index: true
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    
    // Dispute details
    type: {
        type: String,
        enum: [
            'product_not_as_described',
            'damaged_product',
            'wrong_item',
            'delivery_issue',
            'quality_issue',
            'fake_counterfeit',
            'missing_parts',
            'defective_product',
            'service_issue',
            'refund_request',
            'other'
        ],
        required: true
    },
    severity: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        default: 'medium'
    },
    
    // Dispute content
    title: {
        type: String,
        required: true,
        maxlength: 150,
        trim: true
    },
    description: {
        type: String,
        required: true,
        maxlength: 2000,
        trim: true
    },
    
    // Evidence and attachments
    evidence: [{
        type: {
            type: String,
            enum: ['image', 'video', 'document', 'chat_screenshot'],
            required: true
        },
        url: {
            type: String,
            required: true
        },
        filename: {
            type: String,
            required: true
        },
        uploadedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        uploadedAt: {
            type: Date,
            default: Date.now
        },
        description: String
    }],
    
    // Resolution preferences
    buyerResolution: {
        type: String,
        enum: [
            'full_refund',
            'partial_refund',
            'replacement',
            'repair',
            'store_credit',
            'reshipment',
            'other_compensation'
        ]
    },
    buyerRefundAmount: {
        type: Number,
        min: 0
    },
    buyerExplanation: {
        type: String,
        maxlength: 500
    },
    
    // Status tracking
    status: {
        type: String,
        enum: [
            'pending',           // Initial filing
            'seller_response',  // Seller has responded
            'buyer_evidence',   // Buyer provided additional evidence
            'seller_evidence',  // Seller provided evidence
            'negotiation',      // Parties are negotiating
            'admin_review',     // Admin is reviewing
            'resolved',         // Dispute resolved
            'escalated',        // Escalated to higher authority
            'closed',           // Dispute closed without resolution
            'withdrawn'         // Dispute withdrawn by buyer
        ],
        default: 'pending',
        index: true
    },
    
    // Resolution details
    resolution: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'DisputeResolution'
    },
    resolvedAt: Date,
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Timeline and communication
    timeline: [{
        action: {
            type: String,
            required: true
        },
        actor: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        actorType: {
            type: String,
            enum: ['buyer', 'seller', 'admin'],
            required: true
        },
        message: String,
        evidence: [{
            type: String,  // URL to evidence
            description: String
        }],
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Messages between parties
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        senderType: {
            type: String,
            enum: ['buyer', 'seller', 'admin'],
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000
        },
        isPrivate: {
            type: Boolean,
            default: false  // Private messages only visible to admin and sender
        },
        attachments: [{
            type: String,  // URL
            filename: String
        }],
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Admin assignment
    assignedAdmin: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    adminNotes: {
        type: String,
        maxlength: 1000
    },
    
    // Escalation tracking
    escalationLevel: {
        type: Number,
        default: 0,
        min: 0,
        max: 3
    },
    escalatedAt: Date,
    escalatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    
    // Metrics and analytics
    responseTime: {
        sellerResponse: Number,  // Hours until seller first response
        adminResponse: Number,   // Hours until admin first response
        totalResolution: Number  // Total hours to resolution
    },
    
    // Satisfaction and feedback
    buyerSatisfaction: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String,
        submittedAt: Date
    },
    sellerSatisfaction: {
        rating: {
            type: Number,
            min: 1,
            max: 5
        },
        feedback: String,
        submittedAt: Date
    },
    
    // Automatic closure
    autoCloseAt: {
        type: Date,
        default: () => new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 days
    },
    
    // Metadata
    tags: [{
        type: String,
        maxlength: 30
    }],
    priority: {
        type: String,
        enum: ['low', 'normal', 'high', 'urgent'],
        default: 'normal'
    }
}, {
    timestamps: true
});

// Indexes for better performance
disputeSchema.index({ buyer: 1, status: 1, createdAt: -1 });
disputeSchema.index({ seller: 1, status: 1, createdAt: -1 });
disputeSchema.index({ status: 1, priority: 1, createdAt: -1 });
disputeSchema.index({ assignedAdmin: 1, status: 1 });
disputeSchema.index({ autoCloseAt: 1 }, { expireAfterSeconds: 0 });

// Virtual for dispute age
disputeSchema.virtual('age').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // Days
});

// Pre-save middleware
disputeSchema.pre('save', function(next) {
    // Update auto-close date based on status
    if (this.isModified('status')) {
        const now = new Date();
        switch (this.status) {
            case 'resolved':
            case 'closed':
            case 'withdrawn':
                this.autoCloseAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days
                break;
            case 'escalated':
                this.autoCloseAt = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000); // 60 days
                break;
            default:
                this.autoCloseAt = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days
        }
    }
    
    // Calculate response times
    if (this.isModified('timeline')) {
        const timeline = this.timeline;
        const createdAt = this.createdAt;
        
        // Find seller response time
        const sellerResponse = timeline.find(entry => 
            entry.actorType === 'seller' && entry.action === 'initial_response'
        );
        if (sellerResponse) {
            this.responseTime.sellerResponse = Math.floor(
                (sellerResponse.timestamp - createdAt) / (1000 * 60 * 60)
            );
        }
        
        // Find admin response time
        const adminResponse = timeline.find(entry => 
            entry.actorType === 'admin' && entry.action === 'assigned'
        );
        if (adminResponse) {
            this.responseTime.adminResponse = Math.floor(
                (adminResponse.timestamp - createdAt) / (1000 * 60 * 60)
            );
        }
    }
    
    next();
});

// Static methods
disputeSchema.statics = {
    // Get disputes by user (buyer or seller)
    async getByUser(userId, role = 'all', page = 1, limit = 20, status = null) {
        const query = {};
        
        if (role === 'buyer') {
            query.buyer = userId;
        } else if (role === 'seller') {
            query.seller = userId;
        } else {
            query.$or = [{ buyer: userId }, { seller: userId }];
        }
        
        if (status && status !== 'all') {
            query.status = status;
        }
        
        const disputes = await this.find(query)
            .populate('order', 'transactionId totalAmount')
            .populate('product', 'title images')
            .populate('buyer', 'fullName email')
            .populate('seller', 'fullName email')
            .populate('assignedAdmin', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        const total = await this.countDocuments(query);
        
        return {
            disputes,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        };
    },
    
    // Get disputes for admin
    async getForAdmin(adminId = null, page = 1, limit = 20, filters = {}) {
        const query = {};
        
        if (adminId) {
            query.assignedAdmin = adminId;
        }
        
        if (filters.status && filters.status !== 'all') {
            query.status = filters.status;
        }
        
        if (filters.priority && filters.priority !== 'all') {
            query.priority = filters.priority;
        }
        
        if (filters.severity && filters.severity !== 'all') {
            query.severity = filters.severity;
        }
        
        if (filters.type && filters.type !== 'all') {
            query.type = filters.type;
        }
        
        const disputes = await this.find(query)
            .populate('order', 'transactionId totalAmount')
            .populate('product', 'title images')
            .populate('buyer', 'fullName email')
            .populate('seller', 'fullName email')
            .populate('assignedAdmin', 'fullName email')
            .sort({ priority: -1, createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        const total = await this.countDocuments(query);
        
        return {
            disputes,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        };
    },
    
    // Get dispute statistics
    async getStats(timeframe = '30d') {
        const now = new Date();
        let startDate;
        
        switch (timeframe) {
            case '7d':
                startDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
                break;
            case '30d':
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
                break;
            case '90d':
                startDate = new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000);
                break;
            default:
                startDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        }
        
        const stats = await this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            {
                $group: {
                    _id: null,
                    total: { $sum: 1 },
                    pending: {
                        $sum: { $cond: [{ $eq: ['$status', 'pending'] }, 1, 0] }
                    },
                    resolved: {
                        $sum: { $cond: [{ $eq: ['$status', 'resolved'] }, 1, 0] }
                    },
                    escalated: {
                        $sum: { $cond: [{ $eq: ['$status', 'escalated'] }, 1, 0] }
                    },
                    avgResolutionTime: {
                        $avg: '$responseTime.totalResolution'
                    },
                    byType: {
                        $push: {
                            type: '$type',
                            severity: '$severity'
                        }
                    }
                }
            }
        ]);
        
        return stats[0] || {
            total: 0,
            pending: 0,
            resolved: 0,
            escalated: 0,
            avgResolutionTime: 0,
            byType: []
        };
    }
};

// Instance methods
disputeSchema.methods = {
    // Add timeline entry
    addTimelineEntry(action, actor, actorType, message = null, evidence = []) {
        this.timeline.push({
            action,
            actor,
            actorType,
            message,
            evidence,
            timestamp: new Date()
        });
        return this.save();
    },
    
    // Add message
    addMessage(sender, senderType, content, isPrivate = false, attachments = []) {
        this.messages.push({
            sender,
            senderType,
            content,
            isPrivate,
            attachments,
            timestamp: new Date()
        });
        return this.save();
    },
    
    // Assign to admin
    async assignToAdmin(adminId) {
        this.assignedAdmin = adminId;
        this.status = 'admin_review';
        await this.addTimelineEntry(
            'assigned',
            adminId,
            'admin',
            'Dispute assigned to admin for review'
        );
        return this.save();
    },
    
    // Update status
    async updateStatus(newStatus, actor, actorType, message = null) {
        const oldStatus = this.status;
        this.status = newStatus;
        
        if (newStatus === 'resolved') {
            this.resolvedAt = new Date();
            this.resolvedBy = actor;
            
            // Calculate total resolution time
            if (this.createdAt) {
                this.responseTime.totalResolution = Math.floor(
                    (this.resolvedAt - this.createdAt) / (1000 * 60 * 60)
                );
            }
        }
        
        await this.addTimelineEntry(
            `status_changed_${oldStatus}_to_${newStatus}`,
            actor,
            actorType,
            message || `Status changed from ${oldStatus} to ${newStatus}`
        );
        
        return this.save();
    },
    
    // Check if user can participate
    canParticipate(userId, userRole) {
        if (userRole === 'admin') return true;
        if (userRole === 'buyer') return this.buyer.toString() === userId;
        if (userRole === 'seller') return this.seller.toString() === userId;
        return false;
    },
    
    // Get dispute summary
    toSummary() {
        return {
            id: this._id,
            title: this.title,
            type: this.type,
            severity: this.severity,
            status: this.status,
            priority: this.priority,
            age: this.age,
            orderNumber: this.order?.transactionId,
            productTitle: this.product?.title,
            buyerName: this.buyer?.fullName,
            sellerName: this.seller?.fullName,
            assignedAdmin: this.assignedAdmin?.fullName,
            createdAt: this.createdAt,
            resolvedAt: this.resolvedAt
        };
    }
};

const Dispute = mongoose.model('Dispute', disputeSchema);
module.exports = Dispute;
