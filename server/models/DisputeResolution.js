const mongoose = require('mongoose');

const disputeResolutionSchema = new mongoose.Schema({
    dispute: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Dispute',
        required: true,
        unique: true
    },
    
    // Resolution details
    resolutionType: {
        type: String,
        enum: [
            'full_refund',
            'partial_refund',
            'replacement',
            'repair',
            'store_credit',
            'reshipment',
            'compensation',
            'mutual_agreement',
            'seller_favor',
            'buyer_favor',
            'no_action'
        ],
        required: true
    },
    
    // Financial details
    refundAmount: {
        type: Number,
        min: 0
    },
    refundMethod: {
        type: String,
        enum: ['original_payment', 'store_credit', 'bank_transfer', 'wallet'],
        default: 'original_payment'
    },
    refundProcessed: {
        type: Boolean,
        default: false
    },
    refundProcessedAt: Date,
    refundTransactionId: String,
    
    // Compensation details
    compensationAmount: {
        type: Number,
        min: 0
    },
    compensationType: {
        type: String,
        enum: ['cash', 'store_credit', 'coupon', 'free_shipping']
    },
    compensationDetails: String,
    
    // Action items
    actions: [{
        type: String,
        enum: [
            'refund_buyer',
            'charge_seller',
            'issue_store_credit',
            'return_product',
            'replace_product',
            'repair_product',
            'ship_replacement',
            'compensate_buyer',
            'penalize_seller',
            'update_product_listing',
            'remove_product',
            'suspend_seller',
            'issue_warning',
            'no_action'
        ],
        required: true
    }],
    
    // Return instructions (if applicable)
    returnRequired: {
        type: Boolean,
        default: false
    },
    returnInstructions: {
        shippingAddress: String,
        returnMethod: String,
        trackingRequired: Boolean,
        returnDeadline: Date,
        returnShippingPaidBy: {
            type: String,
            enum: ['buyer', 'seller', 'platform'],
            default: 'seller'
        }
    },
    
    // Resolution summary
    summary: {
        type: String,
        required: true,
        maxlength: 1000
    },
    reasoning: {
        type: String,
        required: true,
        maxlength: 2000
    },
    
    // Evidence considered
    evidenceConsidered: [{
        type: String,  // URL or reference
        description: String,
        weight: {
            type: String,
            enum: ['low', 'medium', 'high', 'critical'],
            default: 'medium'
        }
    }],
    
    // Resolution by
    resolvedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    resolvedByRole: {
        type: String,
        enum: ['admin', 'system', 'automated'],
        required: true
    },
    
    // Parties agreement
    buyerAgreement: {
        accepted: {
            type: Boolean,
            default: false
        },
        acceptedAt: Date,
        comments: String,
        rejectedReason: String
    },
    sellerAgreement: {
        accepted: {
            type: Boolean,
            default: false
        },
        acceptedAt: Date,
        comments: String,
        rejectedReason: String
    },
    
    // Appeal information
    appealAllowed: {
        type: Boolean,
        default: true
    },
    appealDeadline: {
        type: Date,
        default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7 days
    },
    appeal: {
        filed: {
            type: Boolean,
            default: false
        },
        filedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        filedByRole: {
            type: String,
            enum: ['buyer', 'seller']
        },
        reason: String,
        evidence: [String],
        filedAt: Date,
        status: {
            type: String,
            enum: ['pending', 'under_review', 'approved', 'rejected'],
            default: 'pending'
        },
        reviewedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        reviewResult: String,
        reviewedAt: Date
    },
    
    // Implementation tracking
    implementation: {
        status: {
            type: String,
            enum: ['pending', 'in_progress', 'completed', 'failed'],
            default: 'pending'
        },
        steps: [{
            action: String,
            completed: {
                type: Boolean,
                default: false
            },
            completedAt: Date,
            notes: String
        }],
        completedAt: Date
    },
    
    // Follow-up requirements
    followUp: {
        required: {
            type: Boolean,
            default: false
        },
        actions: [String],
        nextReviewDate: Date,
        notes: String
    },
    
    // Impact assessment
    impact: {
        buyerSatisfaction: {
            before: Number,
            after: Number
        },
        sellerRating: {
            before: Number,
            after: Number
        },
        platformTrust: {
            type: String,
            enum: ['increased', 'maintained', 'decreased']
        }
    },
    
    // Learning and prevention
    preventionMeasures: [{
        type: String,
        enum: [
            'update_product_description',
            'improve_quality_control',
            'better_packaging',
            'clearer_policies',
            'seller_training',
            'buyer_education',
            'system_improvements',
            'process_changes'
        ]
    }],
    lessonsLearned: String,
    
    // Metadata
    tags: [String],
    complexity: {
        type: String,
        enum: ['simple', 'moderate', 'complex', 'very_complex'],
        default: 'moderate'
    },
    precedent: {
        type: Boolean,
        default: false
    },
    precedentReason: String
}, {
    timestamps: true
});

// Indexes
disputeResolutionSchema.index({ resolvedBy: 1, createdAt: -1 });
disputeResolutionSchema.index({ 'appeal.status': 1 });
disputeResolutionSchema.index({ 'implementation.status': 1 });

// Virtual for resolution age
disputeResolutionSchema.virtual('age').get(function() {
    return Math.floor((Date.now() - this.createdAt) / (1000 * 60 * 60 * 24)); // Days
});

// Pre-save middleware
disputeResolutionSchema.pre('save', function(next) {
    // Set appeal deadline
    if (this.isNew) {
        this.appealDeadline = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    }
    
    // Check if both parties have accepted
    if (this.buyerAgreement.accepted && this.sellerAgreement.accepted) {
        this.implementation.status = 'in_progress';
    }
    
    next();
});

// Static methods
disputeResolutionSchema.statics = {
    // Get resolutions by admin
    async getByAdmin(adminId, page = 1, limit = 20) {
        const resolutions = await this.find({ resolvedBy: adminId })
            .populate('dispute', 'title type status')
            .populate('resolvedBy', 'fullName email')
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        const total = await this.countDocuments({ resolvedBy: adminId });
        
        return {
            resolutions,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        };
    },
    
    // Get appeal statistics
    async getAppealStats(timeframe = '30d') {
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
                    withAppeals: {
                        $sum: { $cond: [{ $eq: ['$appeal.filed', true] }, 1, 0] }
                    },
                    successfulAppeals: {
                        $sum: { $cond: [{ $eq: ['$appeal.status', 'approved'] }, 1, 0] }
                    },
                    avgRefundAmount: { $avg: '$refundAmount' }
                }
            }
        ]);
        
        return stats[0] || {
            total: 0,
            withAppeals: 0,
            successfulAppeals: 0,
            avgRefundAmount: 0
        };
    }
};

// Instance methods
disputeResolutionSchema.methods = {
    // Accept resolution
    async acceptResolution(userId, role, comments = null) {
        if (role === 'buyer') {
            this.buyerAgreement.accepted = true;
            this.buyerAgreement.acceptedAt = new Date();
            this.buyerAgreement.comments = comments;
        } else if (role === 'seller') {
            this.sellerAgreement.accepted = true;
            this.sellerAgreement.acceptedAt = new Date();
            this.sellerAgreement.comments = comments;
        }
        
        // Check if both parties have accepted
        if (this.buyerAgreement.accepted && this.sellerAgreement.accepted) {
            this.implementation.status = 'in_progress';
        }
        
        return this.save();
    },
    
    // Reject resolution
    async rejectResolution(userId, role, reason) {
        if (role === 'buyer') {
            this.buyerAgreement.accepted = false;
            this.buyerAgreement.rejectedReason = reason;
        } else if (role === 'seller') {
            this.sellerAgreement.accepted = false;
            this.sellerAgreement.rejectedReason = reason;
        }
        
        return this.save();
    },
    
    // File appeal
    async fileAppeal(userId, role, reason, evidence = []) {
        if (!this.appealAllowed) {
            throw new Error('Appeal not allowed for this resolution');
        }
        
        if (new Date() > this.appealDeadline) {
            throw new Error('Appeal deadline has passed');
        }
        
        this.appeal.filed = true;
        this.appeal.filedBy = userId;
        this.appeal.filedByRole = role;
        this.appeal.reason = reason;
        this.appeal.evidence = evidence;
        this.appeal.filedAt = new Date();
        this.appeal.status = 'pending';
        
        return this.save();
    },
    
    // Complete implementation step
    async completeStep(stepIndex, notes = null) {
        if (this.implementation.steps[stepIndex]) {
            this.implementation.steps[stepIndex].completed = true;
            this.implementation.steps[stepIndex].completedAt = new Date();
            if (notes) {
                this.implementation.steps[stepIndex].notes = notes;
            }
            
            // Check if all steps are completed
            const allCompleted = this.implementation.steps.every(step => step.completed);
            if (allCompleted) {
                this.implementation.status = 'completed';
                this.implementation.completedAt = new Date();
            }
            
            return this.save();
        }
        
        throw new Error('Invalid step index');
    },
    
    // Check if appeal is possible
    canAppeal() {
        return this.appealAllowed && 
               !this.appeal.filed && 
               new Date() <= this.appealDeadline;
    },
    
    // Get resolution summary
    toSummary() {
        return {
            id: this._id,
            resolutionType: this.resolutionType,
            refundAmount: this.refundAmount,
            compensationAmount: this.compensationAmount,
            buyerAccepted: this.buyerAgreement.accepted,
            sellerAccepted: this.sellerAgreement.accepted,
            implementationStatus: this.implementation.status,
            appealFiled: this.appeal.filed,
            canAppeal: this.canAppeal(),
            resolvedAt: this.createdAt
        };
    }
};

const DisputeResolution = mongoose.model('DisputeResolution', disputeResolutionSchema);
module.exports = DisputeResolution;
