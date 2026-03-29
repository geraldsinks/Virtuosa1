const mongoose = require('mongoose');

const maintenanceSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        maxlength: 100
    },
    description: {
        type: String,
        required: true,
        maxlength: 1000
    },
    type: {
        type: String,
        enum: ['scheduled', 'emergency', 'routine', 'security'],
        required: true
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'critical'],
        required: true
    },
    status: {
        type: String,
        enum: ['planned', 'active', 'completed', 'cancelled'],
        default: 'planned'
    },
    isActive: {
        type: Boolean,
        default: false
    },
    allowAdminAccess: {
        type: Boolean,
        default: true
    },
    scheduledStartTime: {
        type: Date,
        required: true
    },
    scheduledEndTime: {
        type: Date,
        required: true
    },
    actualStartTime: {
        type: Date
    },
    actualEndTime: {
        type: Date
    },
    affectedServices: [{
        type: String,
        enum: [
            'user_registration',
            'user_login',
            'product_browsing',
            'product_purchasing',
            'seller_dashboard',
            'messaging',
            'notifications',
            'search',
            'cart',
            'checkout',
            'file_uploads',
            'email_services'
        ]
    }],
    messageContent: {
        headline: { type: String, maxlength: 200 },
        body: { type: String, maxlength: 2000 },
        actionButton: { type: String, maxlength: 50 },
        actionUrl: { type: String }
    },
    notificationSettings: {
        sendEmail: { type: Boolean, default: true },
        sendPush: { type: Boolean, default: true },
        sendSMS: { type: Boolean, default: false },
        sendInApp: { type: Boolean, default: true },
        notifyHoursBefore: { type: Number, default: 24 }
    },
    targetAudience: {
        type: String,
        enum: ['all_users', 'buyers_only', 'sellers_only', 'verified_users', 'specific_users'],
        default: 'all_users'
    },
    targetUsers: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }],
    metrics: {
        usersNotified: { type: Number, default: 0 },
        messagesSent: { type: Number, default: 0 },
        usersAffected: { type: Number, default: 0 },
        complaintsReceived: { type: Number, default: 0 },
        uptimeBefore: { type: Number }, // percentage
        uptimeAfter: { type: Number } // percentage
    },
    reports: [{
        timestamp: { type: Date, default: Date.now },
        type: {
            type: String,
            enum: ['status_update', 'incident', 'user_feedback', 'performance_metric', 'completion']
        },
        message: { type: String, required: true, maxlength: 1000 },
        severity: {
            type: String,
            enum: ['info', 'warning', 'error', 'critical'],
            default: 'info'
        },
        data: mongoose.Schema.Types.Mixed,
        reportedBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        }
    }],
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    lastUpdatedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    }
}, {
    timestamps: true
});

// Indexes for better performance
maintenanceSchema.index({ status: 1, isActive: 1 });
maintenanceSchema.index({ scheduledStartTime: 1, scheduledEndTime: 1 });
maintenanceSchema.index({ createdBy: 1 });
maintenanceSchema.index({ 'reports.timestamp': -1 });

// Pre-save middleware to validate dates
maintenanceSchema.pre('save', function(next) {
    if (this.scheduledStartTime >= this.scheduledEndTime) {
        const error = new Error('Start time must be before end time');
        next(error);
    } else {
        next();
    }
});

// Static methods
maintenanceSchema.statics = {
    // Get currently active maintenance
    async getActive() {
        return await this.findOne({ 
            isActive: true, 
            status: 'active' 
        }).populate('createdBy', 'fullName email');
    },

    // Get upcoming scheduled maintenance
    async getUpcoming(days = 7) {
        const now = new Date();
        const future = new Date(now.getTime() + days * 24 * 60 * 60 * 1000);
        
        return await this.find({
            status: 'planned',
            scheduledStartTime: { $gte: now, $lte: future }
        }).populate('createdBy', 'fullName email')
        .sort({ scheduledStartTime: 1 });
    },

    // Get maintenance history
    async getHistory(page = 1, limit = 20) {
        const skip = (page - 1) * limit;
        
        const maintenance = await this.find({ 
            status: { $in: ['completed', 'cancelled'] } 
        })
        .populate('createdBy', 'fullName email')
        .populate('lastUpdatedBy', 'fullName email')
        .sort({ actualEndTime: -1 })
        .skip(skip)
        .limit(limit);
        
        const total = await this.countDocuments({ 
            status: { $in: ['completed', 'cancelled'] } 
        });
        
        return {
            maintenance,
            total,
            pages: Math.ceil(total / limit),
            currentPage: page
        };
    },

    // Check if maintenance should be automatically activated
    async checkScheduledMaintenance() {
        const now = new Date();
        
        // Find planned maintenance that should start
        const toActivate = await this.find({
            status: 'planned',
            scheduledStartTime: { $lte: now },
            isActive: false
        });
        
        // Find active maintenance that should end
        const toDeactivate = await this.find({
            status: 'active',
            isActive: true,
            scheduledEndTime: { $lte: now }
        });
        
        return {
            toActivate,
            toDeactivate
        };
    },

    // Get maintenance statistics
    async getStats(period = 30) {
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - period);
        
        const stats = await this.aggregate([
            { $match: { createdAt: { $gte: startDate } } },
            { $group: {
                _id: '$status',
                count: { $sum: 1 },
                avgDuration: {
                    $avg: {
                        $cond: {
                            if: { $and: [
                                { $ne: ['$actualStartTime', null] },
                                { $ne: ['$actualEndTime', null] }
                            ]},
                            then: { $subtract: ['$actualEndTime', '$actualStartTime'] },
                            else: null
                        }
                    }
                }
            }}
        ]);
        
        return stats;
    }
};

// Instance methods
maintenanceSchema.methods = {
    // Activate maintenance mode
    async activate() {
        this.isActive = true;
        this.status = 'active';
        this.actualStartTime = new Date();
        return await this.save();
    },

    // Deactivate maintenance mode
    async deactivate() {
        this.isActive = false;
        this.status = 'completed';
        this.actualEndTime = new Date();
        return await this.save();
    },

    // Add report
    async addReport(reportData) {
        this.reports.push(reportData);
        return await this.save();
    },

    // Check if service is affected
    isServiceAffected(service) {
        return this.affectedServices.includes(service) || this.affectedServices.length === 0;
    },

    // Get duration in minutes
    getDuration() {
        const start = this.actualStartTime || this.scheduledStartTime;
        const end = this.actualEndTime || this.scheduledEndTime;
        return Math.round((end - start) / (1000 * 60));
    },

    // Check if maintenance is overdue
    isOverdue() {
        return this.scheduledEndTime < new Date() && this.status === 'active';
    },

    // Get summary for display
    toSummary() {
        return {
            id: this._id,
            title: this.title,
            type: this.type,
            priority: this.priority,
            status: this.status,
            isActive: this.isActive,
            scheduledStartTime: this.scheduledStartTime,
            scheduledEndTime: this.scheduledEndTime,
            duration: this.getDuration(),
            affectedServices: this.affectedServices,
            createdBy: this.createdBy
        };
    }
};

const Maintenance = mongoose.model('Maintenance', maintenanceSchema);

module.exports = Maintenance;
