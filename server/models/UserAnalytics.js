const mongoose = require('mongoose');

const userAnalyticsSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true,
        index: true
    },
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        required: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    
    // User Behavior Metrics
    behaviorMetrics: {
        sessionCount: { type: Number, default: 0 },
        avgSessionDuration: { type: Number, default: 0 }, // minutes
        pageViews: { type: Number, default: 0 },
        uniquePagesVisited: { type: Number, default: 0 },
        bounceRate: { type: Number, default: 0 },
        lastActivity: { type: Date },
        deviceUsage: {
            mobile: { type: Number, default: 0 },
            desktop: { type: Number, default: 0 },
            tablet: { type: Number, default: 0 }
        },
        peakActivityHours: [{ hour: Number, sessions: Number }],
        searchQueries: { type: Number, default: 0 },
        wishlistAdditions: { type: Number, default: 0 },
        cartAdditions: { type: Number, default: 0 },
        comparisonActions: { type: Number, default: 0 }
    },
    
    // Transaction Metrics
    transactionMetrics: {
        totalTransactions: { type: Number, default: 0 },
        completedTransactions: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        avgTransactionValue: { type: Number, default: 0 },
        conversionRate: { type: Number, default: 0 },
        repeatPurchaseRate: { type: Number, default: 0 },
        customerLifetimeValue: { type: Number, default: 0 },
        paymentMethods: [{
            method: String,
            count: Number,
            amount: Number
        }],
        categoryPreferences: [{
            category: String,
            count: Number,
            amount: Number
        }],
        priceRangePreferences: {
            min: Number,
            max: Number,
            avg: Number
        }
    },
    
    // Engagement Metrics
    engagementMetrics: {
        messagesSent: { type: Number, default: 0 },
        messagesReceived: { type: Number, default: 0 },
        reviewsGiven: { type: Number, default: 0 },
        reviewsReceived: { type: Number, default: 0 },
        avgRatingGiven: { type: Number, default: 0 },
        avgRatingReceived: { type: Number, default: 0 },
        disputesInitiated: { type: Number, default: 0 },
        disputesResolved: { type: Number, default: 0 },
        supportTickets: { type: Number, default: 0 },
        forumPosts: { type: Number, default: 0 },
        socialShares: { type: Number, default: 0 }
    },
    
    // Performance Metrics (for sellers)
    performanceMetrics: {
        listingsCreated: { type: Number, default: 0 },
        activeListings: { type: Number, default: 0 },
        soldItems: { type: Number, default: 0 },
        listingViews: { type: Number, default: 0 },
        listingClicks: { type: Number, default: 0 },
        viewToClickRate: { type: Number, default: 0 },
        avgListingDuration: { type: Number, default: 0 }, // days to sell
        responseTime: { type: Number, default: 0 }, // hours
        fulfillmentRate: { type: Number, default: 0 },
        returnRate: { type: Number, default: 0 },
        sellerScore: { type: Number, default: 0 }
    },
    
    // Growth Metrics
    growthMetrics: {
        userAcquisitionSource: { type: String }, // referral, organic, social, paid, etc.
        referralCount: { type: Number, default: 0 },
        referralRevenue: { type: Number, default: 0 },
        networkSize: { type: Number, default: 0 },
        influencerScore: { type: Number, default: 0 },
        brandAdvocacyActions: { type: Number, default: 0 }
    },
    
    // Predictive Metrics
    predictiveMetrics: {
        churnRisk: { type: Number, default: 0, min: 0, max: 1 }, // probability
        lifetimeValuePrediction: { type: Number, default: 0 },
        nextPurchaseProbability: { type: Number, default: 0, min: 0, max: 1 },
        preferredPurchaseDays: [Number], // days of week
        preferredPurchaseTimes: [Number], // hours of day
        predictedCategories: [String],
        priceSensitivity: { type: Number, default: 0 }, // 0-1 scale
        promotionResponse: { type: Number, default: 0 } // 0-1 scale
    },
    
    // Strategic Insights
    strategicInsights: {
        userSegment: { type: String }, // 'new', 'active', 'at-risk', 'champion', 'lost'
        growthPotential: { type: String, enum: ['low', 'medium', 'high'] },
        recommendedActions: [{
            action: String,
            priority: { type: String, enum: ['low', 'medium', 'high', 'urgent'] },
            expectedImpact: String,
            timeline: String
        }],
        keyOpportunities: [String],
        riskFactors: [String],
        nextBestActions: [String]
    },
    
    // Comparative Metrics
    comparativeMetrics: {
        percentileRank: { type: Number, default: 0 }, // vs similar users
        growthRate: { type: Number, default: 0 }, // vs previous period
        engagementScore: { type: Number, default: 0 },
        satisfactionScore: { type: Number, default: 0 },
        performanceScore: { type: Number, default: 0 }
    },
    
    // Raw Events (for detailed analysis)
    events: [{
        type: { type: String, required: true }, // login, view, purchase, etc.
        timestamp: { type: Date, required: true },
        metadata: mongoose.Schema.Types.Mixed,
        value: Number, // monetary value if applicable
        category: String,
        source: String
    }],
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Compound indexes for efficient queries
userAnalyticsSchema.index({ user: 1, period: 1, date: -1 });
userAnalyticsSchema.index({ period: 1, date: -1 });
userAnalyticsSchema.index({ 'strategicInsights.userSegment': 1 });
userAnalyticsSchema.index({ 'predictiveMetrics.churnRisk': -1 });
userAnalyticsSchema.index({ 'comparativeMetrics.growthRate': -1 });

// Static methods for aggregation
userAnalyticsSchema.statics.getUserGrowthTrends = async function(userId, periods = 12) {
    const pipeline = [
        { $match: { user: mongoose.Types.ObjectId(userId) } },
        { $sort: { date: -1 } },
        { $limit: periods },
        { $sort: { date: 1 } }
    ];
    return this.aggregate(pipeline);
};

userAnalyticsSchema.statics.getSegmentDistribution = async function(period = 'monthly') {
    const pipeline = [
        { $match: { period } },
        { $group: { _id: '$strategicInsights.userSegment', count: { $sum: 1 } } },
        { $sort: { count: -1 } }
    ];
    return this.aggregate(pipeline);
};

userAnalyticsSchema.statics.getTopPerformers = async function(limit = 10, metric = 'comparativeMetrics.performanceScore') {
    const pipeline = [
        { $match: { period: 'monthly' } },
        { $sort: { [metric]: -1 } },
        { $limit: limit },
        { $lookup: { from: 'users', localField: 'user', foreignField: '_id', as: 'userInfo' } }
    ];
    return this.aggregate(pipeline);
};

// Instance methods
userAnalyticsSchema.methods.calculateEngagementScore = function() {
    const weights = {
        sessionCount: 0.2,
        avgSessionDuration: 0.15,
        pageViews: 0.1,
        messagesSent: 0.15,
        reviewsGiven: 0.1,
        socialShares: 0.1,
        wishlistAdditions: 0.1,
        cartAdditions: 0.1
    };
    
    let score = 0;
    const behavior = this.behaviorMetrics || {};
    const engagement = this.engagementMetrics || {};
    
    score += (behavior.sessionCount || 0) * weights.sessionCount;
    score += (behavior.avgSessionDuration || 0) * weights.avgSessionDuration;
    score += (behavior.pageViews || 0) * weights.pageViews;
    score += (engagement.messagesSent || 0) * weights.messagesSent;
    score += (engagement.reviewsGiven || 0) * weights.reviewsGiven;
    score += (engagement.socialShares || 0) * weights.socialShares;
    score += (behavior.wishlistAdditions || 0) * weights.wishlistAdditions;
    score += (behavior.cartAdditions || 0) * weights.cartAdditions;
    
    return Math.min(100, score);
};

userAnalyticsSchema.methods.updateSegment = function() {
    const engagementScore = this.calculateEngagementScore();
    const churnRisk = this.predictiveMetrics?.churnRisk || 0;
    const totalRevenue = this.transactionMetrics?.totalRevenue || 0;
    const transactionCount = this.transactionMetrics?.totalTransactions || 0;
    
    if (engagementScore >= 80 && totalRevenue > 1000 && transactionCount > 10) {
        this.strategicInsights.userSegment = 'champion';
    } else if (engagementScore >= 60 && transactionCount > 5) {
        this.strategicInsights.userSegment = 'active';
    } else if (churnRisk > 0.7 || engagementScore < 20) {
        this.strategicInsights.userSegment = 'at-risk';
    } else if (transactionCount === 0 && engagementScore < 30) {
        this.strategicInsights.userSegment = 'new';
    } else {
        this.strategicInsights.userSegment = 'potential';
    }
};

userAnalyticsSchema.methods.generateRecommendations = function() {
    const recommendations = [];
    const segment = this.strategicInsights.userSegment;
    const churnRisk = this.predictiveMetrics?.churnRisk || 0;
    const engagementScore = this.calculateEngagementScore();
    
    if (segment === 'new') {
        recommendations.push({
            action: 'Send welcome series with onboarding tips',
            priority: 'high',
            expectedImpact: 'Increase engagement by 40%',
            timeline: '1-2 weeks'
        });
        recommendations.push({
            action: 'Offer first-time purchase discount',
            priority: 'medium',
            expectedImpact: 'Convert to first purchase',
            timeline: 'Immediate'
        });
    } else if (segment === 'at-risk' || churnRisk > 0.6) {
        recommendations.push({
            action: 'Launch re-engagement campaign',
            priority: 'urgent',
            expectedImpact: 'Reduce churn by 30%',
            timeline: '1 week'
        });
        recommendations.push({
            action: 'Offer personalized incentives',
            priority: 'high',
            expectedImpact: 'Increase activity',
            timeline: 'Immediate'
        });
    } else if (segment === 'champion') {
        recommendations.push({
            action: 'Create VIP program benefits',
            priority: 'medium',
            expectedImpact: 'Increase loyalty',
            timeline: '2-4 weeks'
        });
        recommendations.push({
            action: 'Enable referral program',
            priority: 'medium',
            expectedImpact: 'Acquire new users',
            timeline: '1-2 weeks'
        });
    }
    
    if (engagementScore < 50) {
        recommendations.push({
            action: 'Improve product recommendations',
            priority: 'medium',
            expectedImpact: 'Increase browsing time',
            timeline: '2-3 weeks'
        });
    }
    
    this.strategicInsights.recommendedActions = recommendations;
};

module.exports = mongoose.model('UserAnalytics', userAnalyticsSchema);
