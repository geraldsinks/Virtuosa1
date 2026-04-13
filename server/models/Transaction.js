const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    // Basic transaction information
    transactionId: {
        type: String,
        required: true,
        unique: true,
        default: () => {
            const timestamp = Date.now().toString(36);
            const random = Math.random().toString(36).slice(2, 7);
            return `TXN${timestamp}${random}`.toUpperCase();
        }
    },
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product',
        required: true
    },
    buyer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    seller: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    
    // Financial details
    amount: {
        type: Number,
        required: true,
        min: 0
    },
    currency: {
        type: String,
        required: true,
        default: 'ZMW',
        enum: ['ZMW', 'USD', 'EUR', 'GBP', 'NGN', 'KES', 'GHS', 'ZAR']
    },
    platformFee: {
        type: Number,
        required: true,
        min: 0
    },
    sellerAmount: {
        type: Number,
        required: true,
        min: 0
    },
    
    // Transaction status and classification
    status: {
        type: String,
        enum: [
            'pending',           // Initial transaction created
            'processing',        // Payment being processed
            'awaiting_confirmation', // Waiting for seller confirmation
            'seller_confirmed', // Confirmed by seller only
            'buyer_confirmed',  // Confirmed by buyer only
            'both_confirmed',   // Confirmed by both parties
            'payment_verified', // Payment verified by system
            'in_escrow',        // Funds held in escrow
            'shipped',          // Item shipped
            'delivered',        // Item delivered
            'completed',        // Transaction completed successfully
            // Cash on Delivery (orders) workflow statuses
            'pending_seller_confirmation',
            'confirmed_by_seller',
            'out_for_delivery',
            'delivered_pending_confirmation',
            'Shipped',          // Added for backend compatibility
            'Completed',        // Keep legacy capitalized variant used by some routes
            'declined',         // Transaction declined
            'cancelled',        // Transaction cancelled
            'refunded',         // Transaction refunded
            'disputed',         // Dispute filed
            'frozen',           // Transaction frozen for review
            'failed',           // Payment failed
            'expired'           // Transaction expired
        ],
        default: 'pending'
    },
    paymentStatus: {
        type: String,
        enum: ['Pending', 'Paid', 'Failed', 'Refunded', 'Released'],
        default: 'Pending'
    },
    disputeStatus: {
        type: String,
        enum: ['None', 'Open', 'Resolved', 'Rejected'],
        default: 'None'
    },
    tokensAwarded: {
        type: Boolean,
        default: false
    },
    
    // Payment information
    paymentMethod: {
        type: String,
        enum: [
            'credit_card',
            'debit_card',
            'paypal',
            'stripe',
            'bank_transfer',
            'mobile_money',
            'crypto',
            'cash_on_delivery',
            'wallet_balance'
        ],
        required: true
    },
    paymentGateway: {
        type: String,
        enum: ['stripe', 'paypal', 'flutterwave', 'paystack', 'mollie', 'square', 'manual'],
        required: true,
        default: 'manual' // Ensure COD can be created without specifying a gateway
    },
    paymentIntentId: String,  // External payment gateway ID
    paymentMetadata: mongoose.Schema.Types.Mixed,  // Additional payment data
    
    // Confirmation tracking
    confirmations: {
        buyer: {
            confirmed: { type: Boolean, default: false },
            confirmedAt: Date,
            ipAddress: String,
            userAgent: String
        },
        seller: {
            confirmed: { type: Boolean, default: false },
            confirmedAt: Date,
            ipAddress: String,
            userAgent: String
        }
    },
    
    // Escrow and protection
    escrow: {
        enabled: { type: Boolean, default: true },
        released: { type: Boolean, default: false },
        releasedAt: Date,
        releaseReason: String,
        holdPeriod: { type: Number, default: 7 }, // Days
        autoReleaseAt: Date
    },
    
    // Safety and protection
    protection: {
        buyerProtection: {
            enabled: { type: Boolean, default: true },
            coverageAmount: Number,
            validUntil: Date,
            claimFileable: { type: Boolean, default: false }
        },
        sellerProtection: {
            enabled: { type: Boolean, default: true },
            coverageAmount: Number,
            validUntil: Date,
            fraudDetection: { type: Boolean, default: false }
        },
        riskLevel: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        },
        riskScore: {
            type: Number,
            min: 0,
            max: 100,
            default: 50
        },
        flags: [{
            type: {
                type: String,
                enum: [
                    'suspicious_activity',
                    'high_value_transaction',
                    'new_user',
                    'international',
                    'rapid_purchase',
                    'multiple_attempts',
                    'vpn_detected',
                    'mismatched_info',
                    'chargeback_risk'
                ]
            },
            detectedAt: { type: Date, default: Date.now },
            severity: {
                type: String,
                enum: ['low', 'medium', 'high'],
                default: 'medium'
            },
            description: String
        }]
    },
    
    // Communication and messages
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        senderType: {
            type: String,
            enum: ['buyer', 'seller', 'admin', 'system'],
            required: true
        },
        content: {
            type: String,
            required: true,
            maxlength: 1000
        },
        isInternal: {
            type: Boolean,
            default: false  // Internal messages only visible to admin
        },
        attachments: [{
            type: String,  // URL
            filename: String,
            fileType: String
        }],
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Location and delivery
    delivery: {
        address: {
            street: String,
            city: String,
            state: String,
            country: String,
            postalCode: String,
            coordinates: {
                lat: Number,
                lng: Number
            }
        },
        method: {
            type: String,
            enum: ['pickup', 'delivery', 'shipping']
        },
        trackingNumber: String,
        carrier: String,
        estimatedDelivery: Date,
        actualDelivery: Date,
        deliveryConfirmation: {
            photo: String,  // URL to delivery photo
            signature: String,
            timestamp: Date,
            confirmedBy: String
        }
    },
    // Fields used by COD order flow (top-level for current routes)
    quantity: { type: Number, default: 1 },
    deliveryMethod: { type: String }, // e.g., 'Delivery'
    deliveryAddress: {
        name: String,
        phone: String,
        address: String,
        instructions: String
    },
    trackingNumber: String, // kept for compatibility with existing routes
    // Timestamps for seller/buyer actions in COD flow
    sellerConfirmedAt: Date,
    shippedAt: Date,
    deliveredAt: Date,
    deliveryConfirmedAt: Date,
    declinedAt: Date,
    cancelledAt: Date,
    cancelReason: String,
    
    // Cash on delivery support
    isCashOnDelivery: {
        type: Boolean,
        default: false
    },
    
    // Dispute information
    dispute: {
        filed: { type: Boolean, default: false },
        disputeId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Dispute'
        },
        reason: String,
        filedAt: Date,
        filedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    },
    
    // Refund information
    refund: {
        requested: { type: Boolean, default: false },
        amount: Number,
        reason: String,
        status: {
            type: String,
            enum: ['pending', 'approved', 'rejected', 'processed'],
            default: 'pending'
        },
        processedAt: Date,
        refundId: String,  // External refund ID
        processor: String  // Who processed the refund
    },
    
    // Chargeback information
    chargeback: {
        filed: { type: Boolean, default: false },
        amount: Number,
        reason: String,
        status: {
            type: String,
            enum: ['pending', 'won', 'lost', 'resolved'],
            default: 'pending'
        },
        filedAt: Date,
        caseId: String,
        evidence: [{
            type: String,  // URL to evidence
            description: String,
            uploadedAt: { type: Date, default: Date.now }
        }]
    },
    
    // Review and feedback
    review: {
        buyerReview: {
            rating: { type: Number, min: 1, max: 5 },
            comment: String,
            submittedAt: Date
        },
        sellerReview: {
            rating: { type: Number, min: 1, max: 5 },
            comment: String,
            submittedAt: Date
        }
    },
    
    // Timeline and audit
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
            enum: ['buyer', 'seller', 'admin', 'system'],
            required: true
        },
        description: String,
        metadata: mongoose.Schema.Types.Mixed,
        ipAddress: String,
        userAgent: String,
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    
    // Admin notes and actions
    adminNotes: [{
        admin: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        note: {
            type: String,
            required: true,
            maxlength: 500
        },
        isInternal: { type: Boolean, default: true },
        timestamp: { type: Date, default: Date.now }
    }],
    
    // Metadata and analytics
    metadata: {
        source: String,  // Where transaction originated (web, mobile, api)
        campaign: String,  // Marketing campaign if applicable
        device: String,   // Device type
        browser: String,  // Browser information
        ipAddress: String,
        sessionId: String
    },
    
    // Automatic processing
    autoProcessing: {
        enabled: { type: Boolean, default: true },
        nextAction: String,
        scheduledAt: Date,
        retryCount: { type: Number, default: 0 },
        maxRetries: { type: Number, default: 3 }
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});

// Indexes for better performance
transactionSchema.index({ buyer: 1, status: 1, createdAt: -1 });
transactionSchema.index({ seller: 1, status: 1, createdAt: -1 });
transactionSchema.index({ status: 1, createdAt: -1 });
transactionSchema.index({ 'protection.riskLevel': 1, status: 1 });
transactionSchema.index({ 'escrow.autoReleaseAt': 1 }, { expireAfterSeconds: 0 });
transactionSchema.index({ paymentIntentId: 1 });

// Virtual for transaction age
transactionSchema.virtual('age').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // Days
});

// Virtual for total fees
transactionSchema.virtual('totalFees').get(function() {
    return this.platformFee;
});

// Virtual for net amount
transactionSchema.virtual('netAmount').get(function() {
    return this.amount - this.platformFee;
});

// Virtual fields for backward compatibility with client-side code
transactionSchema.virtual('totalAmount').get(function() {
    return this.amount;
});

transactionSchema.virtual('commissionAmount').get(function() {
    return this.platformFee;
});

transactionSchema.virtual('sellerPayout').get(function() {
    return this.sellerAmount;
});

// Pre-save middleware
transactionSchema.pre('save', function(next) {
    // Generate transaction ID if not present
    if (this.isNew && !this.transactionId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        this.transactionId = `TXN${timestamp}${random}`.toUpperCase();
    }
    
    // Set auto-release date for escrow
    if (this.isModified('escrow.enabled') && this.escrow.enabled && !this.escrow.autoReleaseAt) {
        this.escrow.autoReleaseAt = new Date(Date.now() + this.escrow.holdPeriod * 24 * 60 * 60 * 1000);
    }
    
    // Calculate risk score based on various factors
    if (this.isModified('amount') || this.isModified('buyer') || this.isModified('seller')) {
        this.calculateRiskScore();
    }
    
    next();
});

// Static methods
transactionSchema.statics = {
    // Get transactions by user (buyer or seller)
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
        
        const transactions = await this.find(query)
            .populate('product', 'name images')
            .populate('buyer', 'fullName email')
            .populate('seller', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        const total = await this.countDocuments(query);
        
        return {
            transactions,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        };
    },
    
    // Get transactions for admin
    async getForAdmin(page = 1, limit = 20, filters = {}) {
        const query = {};
        
        if (filters.status && filters.status !== 'all') {
            query.status = filters.status;
        }
        
        if (filters.riskLevel && filters.riskLevel !== 'all') {
            query['protection.riskLevel'] = filters.riskLevel;
        }
        
        if (filters.paymentMethod && filters.paymentMethod !== 'all') {
            query.paymentMethod = filters.paymentMethod;
        }
        
        if (filters.search) {
            query.$or = [
                { transactionId: { $regex: filters.search, $options: 'i' } },
                { 'metadata.ipAddress': { $regex: filters.search, $options: 'i' } }
            ];
        }
        
        const transactions = await this.find(query)
            .populate('product', 'name images')
            .populate('buyer', 'fullName email')
            .populate('seller', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        const total = await this.countDocuments(query);
        
        return {
            transactions,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        };
    },
    
    // Get transaction statistics
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
                    totalAmount: { $sum: { $ifNull: ['$amount', 0] } },
                    completed: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ['$status', 'completed'] },
                                        { $eq: ['$status', 'Completed'] },
                                        { $eq: ['$confirmations.buyer.confirmed', true] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    pending: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: ['$status', 'pending'] },
                                        { $eq: ['$status', 'Pending'] },
                                        { $eq: ['$status', 'pending_seller_confirmation'] },
                                        { $eq: ['$status', 'confirmed_by_seller'] },
                                        { $eq: ['$status', 'awaiting_confirmation'] },
                                        { $eq: ['$status', 'processing'] },
                                        { $eq: ['$status', 'shipped'] },
                                        { $eq: ['$status', 'Shipped'] },
                                        { $eq: ['$status', 'out_for_delivery'] },
                                        { $eq: ['$status', 'delivered_pending_confirmation'] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    },
                    disputed: {
                        $sum: { $cond: [{ $eq: ['$status', 'disputed'] }, 1, 0] }
                    },
                    avgAmount: { $avg: { $ifNull: ['$amount', 0] } },
                    highRisk: {
                        $sum: {
                            $cond: [
                                {
                                    $or: [
                                        { $eq: [{ $ifNull: ['$protection.riskLevel', 'medium'] }, 'high'] },
                                        { $eq: [{ $ifNull: ['$protection.riskLevel', 'medium'] }, 'critical'] }
                                    ]
                                },
                                1,
                                0
                            ]
                        }
                    }
                }
            }
        ]);

        return stats[0] || {
            total: 0,
            totalAmount: 0,
            completed: 0,
            pending: 0,
            disputed: 0,
            avgAmount: 0,
            highRisk: 0
        };
    }
};

// Instance methods
transactionSchema.methods = {
    // Add timeline entry
    addTimelineEntry(action, actor, actorType, description = null, metadata = {}) {
        this.timeline.push({
            action,
            actor,
            actorType,
            description,
            metadata,
            timestamp: new Date()
        });
        return this.save();
    },
    
    // Add message
    addMessage(sender, senderType, content, isInternal = false, attachments = []) {
        this.messages.push({
            sender,
            senderType,
            content,
            isInternal,
            attachments,
            timestamp: new Date()
        });
        return this.save();
    },
    
    // Confirm transaction
    async confirmTransaction(userId, userType, ipAddress = null, userAgent = null) {
        if (userType === 'buyer') {
            this.confirmations.buyer.confirmed = true;
            this.confirmations.buyer.confirmedAt = new Date();
            this.confirmations.buyer.ipAddress = ipAddress;
            this.confirmations.buyer.userAgent = userAgent;
        } else if (userType === 'seller') {
            this.confirmations.seller.confirmed = true;
            this.confirmations.seller.confirmedAt = new Date();
            this.confirmations.seller.ipAddress = ipAddress;
            this.confirmations.seller.userAgent = userAgent;
        }
        
        // Update status based on confirmations
        if (this.confirmations.buyer.confirmed && this.confirmations.seller.confirmed) {
            this.status = 'both_confirmed';
        } else if (this.confirmations.buyer.confirmed) {
            this.status = 'buyer_confirmed';
        } else if (this.confirmations.seller.confirmed) {
            this.status = 'seller_confirmed';
        }
        
        await this.addTimelineEntry(
            'transaction_confirmed',
            userId,
            userType,
            `Transaction confirmed by ${userType}`
        );
        
        return this.save();
    },
    
    // Release escrow
    async releaseEscrow(adminId, reason = null) {
        this.escrow.released = true;
        this.escrow.releasedAt = new Date();
        this.escrow.releaseReason = reason;
        this.status = 'completed';
        
        await this.addTimelineEntry(
            'escrow_released',
            adminId,
            'admin',
            reason || 'Escrow released and transaction completed'
        );
        
        return this.save();
    },
    
    // Add risk flag
    addRiskFlag(type, severity = 'medium', description = null) {
        this.protection.flags.push({
            type,
            severity,
            description,
            detectedAt: new Date()
        });
        
        // Update risk level if necessary
        this.updateRiskLevel();
        return this.save();
    },
    
    // Calculate risk score
    calculateRiskScore() {
        let score = 50; // Base score
        
        // Amount factor
        if (this.amount > 1000) score += 10;
        if (this.amount > 5000) score += 15;
        
        // Payment method factor
        if (this.paymentMethod === 'crypto') score += 20;
        if (this.paymentMethod === 'bank_transfer') score += 10;
        
        // International factor
        if (this.delivery.address && this.delivery.address.country !== 'US') {
            score += 15;
        }
        
        // New user factor (would need to check user creation date)
        // This is a placeholder - actual implementation would check user age
        
        this.protection.riskScore = Math.min(100, Math.max(0, score));
        this.updateRiskLevel();
    },
    
    // Update risk level based on score
    updateRiskLevel() {
        const score = this.protection.riskScore;
        if (score >= 80) {
            this.protection.riskLevel = 'critical';
        } else if (score >= 60) {
            this.protection.riskLevel = 'high';
        } else if (score >= 40) {
            this.protection.riskLevel = 'medium';
        } else {
            this.protection.riskLevel = 'low';
        }
    },
    
    // Add admin note
    addAdminNote(adminId, note, isInternal = true) {
        this.adminNotes.push({
            admin: adminId,
            note,
            isInternal,
            timestamp: new Date()
        });
        return this.save();
    },
    
    // Get transaction summary
    toSummary() {
        return {
            id: this._id,
            transactionId: this.transactionId,
            status: this.status,
            amount: this.amount,
            currency: this.currency,
            paymentMethod: this.paymentMethod,
            riskLevel: this.protection.riskLevel,
            riskScore: this.protection.riskScore,
            buyerName: this.buyer?.fullName,
            sellerName: this.seller?.fullName,
            productTitle: this.product?.title,
            createdAt: this.createdAt,
            age: this.age,
            escrowEnabled: this.escrow.enabled,
            disputeFiled: this.dispute.filed,
            hasFlags: this.protection.flags.length > 0
        };
    }
};

const Transaction = mongoose.model('Transaction', transactionSchema);
module.exports = Transaction;
