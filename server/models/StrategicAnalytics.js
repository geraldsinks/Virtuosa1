const mongoose = require('mongoose');

const strategicAnalyticsSchema = new mongoose.Schema({
    period: {
        type: String,
        enum: ['daily', 'weekly', 'monthly', 'quarterly', 'yearly'],
        required: true,
        index: true
    },
    date: {
        type: Date,
        required: true,
        index: true
    },
    
    // Market Overview
    marketOverview: {
        totalUsers: { type: Number, default: 0 },
        activeUsers: { type: Number, default: 0 },
        newUsers: { type: Number, default: 0 },
        totalSellers: { type: Number, default: 0 },
        activeSellers: { type: Number, default: 0 },
        newSellers: { type: Number, default: 0 },
        totalProducts: { type: Number, default: 0 },
        activeProducts: { type: Number, default: 0 },
        totalTransactions: { type: Number, default: 0 },
        completedTransactions: { type: Number, default: 0 },
        totalRevenue: { type: Number, default: 0 },
        marketShare: { type: Number, default: 0 }, // percentage
        growthRate: { type: Number, default: 0 }
    },
    
    // User Acquisition Analysis
    userAcquisition: {
        acquisitionChannels: [{
            channel: String, // organic, paid, referral, social, email, etc.
            users: Number,
            cost: Number,
            conversionRate: Number,
            retentionRate: Number,
            lifetimeValue: Number
        }],
        acquisitionCost: {
            totalCost: Number,
            costPerUser: Number,
            costPerActiveUser: Number,
            costPerPayingUser: Number
        },
        acquisitionTrends: {
            monthlyGrowth: Number,
            seasonalPatterns: [Number], // monthly indices
            bestChannels: [String],
            underperformingChannels: [String]
        }
    },
    
    // Revenue Analysis
    revenueAnalysis: {
        revenueStreams: [{
            stream: String, // commissions, fees, subscriptions, ads, etc.
            amount: Number,
            percentage: Number,
            growth: Number,
            forecast: Number
        }],
        revenueByCategory: [{
            category: String,
            revenue: Number,
            transactions: Number,
            avgValue: Number,
            growth: Number
        }],
        revenueByRegion: [{
            region: String,
            revenue: Number,
            users: Number,
            avgRevenuePerUser: Number,
            growth: Number
        }],
        pricingAnalysis: {
            avgProductPrice: Number,
            priceElasticity: Number,
            optimalPricePoints: [{
                category: String,
                optimalPrice: Number,
                expectedDemand: Number
            }],
            competitorPricing: [{
                competitor: String,
                avgPrice: Number,
                marketPosition: String
            }]
        }
    },
    
    // User Behavior Analysis
    userBehavior: {
        engagementMetrics: {
            dailyActiveUsers: Number,
            weeklyActiveUsers: Number,
            monthlyActiveUsers: Number,
            avgSessionDuration: Number,
            pagesPerSession: Number,
            bounceRate: Number,
            retentionRates: {
                day1: Number,
                day7: Number,
                day30: Number,
                day90: Number
            }
        },
        behavioralSegments: [{
            segment: String,
            size: Number,
            percentage: Number,
            characteristics: [String],
            value: Number,
            growth: Number
        }],
        usagePatterns: {
            peakHours: [Number],
            peakDays: [String],
            seasonalTrends: [String],
            devicePreferences: {
                mobile: Number,
                desktop: Number,
                tablet: Number
            },
            featureAdoption: [{
                feature: String,
                adoptionRate: Number,
                usageFrequency: Number,
                satisfaction: Number
            }]
        },
        conversionFunnels: [{
            funnel: String, // signup, purchase, listing, etc.
            steps: [{
                step: String,
                users: Number,
                conversionRate: Number,
                dropoffRate: Number
            }],
            overallConversion: Number,
            optimizationOpportunities: [String]
        }]
    },
    
    // Competitive Analysis
    competitiveAnalysis: {
        marketPosition: {
            rank: Number,
            totalCompetitors: Number,
            marketShare: Number,
            growthVsMarket: Number
        },
        competitorMetrics: [{
            name: String,
            marketShare: Number,
            growthRate: Number,
            strengths: [String],
            weaknesses: [String],
            recentMoves: [String]
        }],
        competitiveAdvantages: [{
            advantage: String,
            strength: Number, // 1-10
            sustainability: Number, // 1-10
            exploitationOpportunities: [String]
        }],
        threatAssessment: [{
            threat: String,
            probability: Number,
            impact: Number,
            mitigation: [String]
        }]
    },
    
    // Product Performance
    productPerformance: {
        categoryAnalysis: [{
            category: String,
            totalProducts: Number,
            activeProducts: Number,
            avgPrice: Number,
            totalRevenue: Number,
            growthRate: Number,
            saturation: Number,
            opportunities: [String]
        }],
        topPerformingProducts: [{
            productId: String,
            name: String,
            revenue: Number,
            views: Number,
            conversionRate: Number,
            growth: Number
        }],
        productLifecycle: {
            newProducts: Number,
            growingProducts: Number,
            matureProducts: Number,
            decliningProducts: Number,
            phaseDurations: {
                introduction: Number,
                growth: Number,
                maturity: Number,
                decline: Number
            }
        },
        qualityMetrics: {
            avgRating: Number,
            returnRate: Number,
            disputeRate: Number,
            complaintRate: Number,
            satisfactionScore: Number
        }
    },
    
    // Strategic Opportunities
    strategicOpportunities: {
        marketOpportunities: [{
            opportunity: String,
            marketSize: Number,
            growthRate: Number,
            competitionLevel: String,
            investmentRequired: Number,
            expectedROI: Number,
            timeline: String,
            riskLevel: String
        }],
        productOpportunities: [{
            opportunity: String,
            demandLevel: String,
            competitionLevel: String,
            developmentCost: Number,
            expectedRevenue: Number,
            strategicFit: Number
        }],
        operationalOpportunities: [{
            area: String,
            currentEfficiency: Number,
            potentialImprovement: Number,
            costSavings: Number,
            implementationTime: String
        }]
    },
    
    // Risk Assessment
    riskAssessment: {
        businessRisks: [{
            risk: String,
            probability: Number,
            impact: Number,
            mitigation: [String],
            owner: String,
            timeline: String
        }],
        marketRisks: [{
            risk: String,
            probability: Number,
            impact: Number,
            earlyWarning: [String],
            responsePlan: [String]
        }],
        operationalRisks: [{
            risk: String,
            probability: Number,
            impact: Number,
            prevention: [String],
            contingency: [String]
        }],
        financialRisks: [{
            risk: String,
            probability: Number,
            impact: Number,
            financialExposure: Number,
            hedgingStrategy: String
        }]
    },
    
    // Growth Forecasts
    growthForecasts: {
        shortTerm: {
            period: String, // 3 months
            expectedGrowth: Number,
            confidence: Number,
            keyDrivers: [String],
            assumptions: [String]
        },
        mediumTerm: {
            period: String, // 12 months
            expectedGrowth: Number,
            confidence: Number,
            keyMilestones: [String],
            resourceRequirements: [String]
        },
        longTerm: {
            period: String, // 3-5 years
            expectedGrowth: Number,
            confidence: Number,
            marketConditions: [String],
            strategicInitiatives: [String]
        },
        scenarioAnalysis: [{
            scenario: String, // optimistic, realistic, pessimistic
            growthRate: Number,
            revenue: Number,
            profitability: Number,
            keyFactors: [String]
        }]
    },
    
    // Strategic Recommendations
    strategicRecommendations: {
        immediate: [{
            action: String,
            priority: String,
            impact: String,
            resources: [String],
            timeline: String,
            owner: String,
            kpis: [String]
        }],
        shortTerm: [{
            action: String,
            priority: String,
            impact: String,
            resources: [String],
            timeline: String,
            owner: String,
            kpis: [String]
        }],
        longTerm: [{
            action: String,
            priority: String,
            impact: String,
            resources: [String],
            timeline: String,
            owner: String,
            kpis: [String]
        }],
        investmentPriorities: [{
            area: String,
            currentAllocation: Number,
            recommendedAllocation: Number,
            expectedROI: Number,
            strategicImportance: Number
        }]
    },
    
    // KPIs and Metrics
    keyPerformanceIndicators: {
        financialKPIs: [{
            name: String,
            current: Number,
            target: Number,
            trend: String,
            status: String
        }],
        operationalKPIs: [{
            name: String,
            current: Number,
            target: Number,
            trend: String,
            status: String
        }],
        customerKPIs: [{
            name: String,
            current: Number,
            target: Number,
            trend: String,
            status: String
        }],
        growthKPIs: [{
            name: String,
            current: Number,
            target: Number,
            trend: String,
            status: String
        }]
    },
    
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
}, {
    timestamps: true
});

// Compound indexes
strategicAnalyticsSchema.index({ period: 1, date: -1 });
strategicAnalyticsSchema.index({ 'marketOverview.growthRate': -1 });
strategicAnalyticsSchema.index({ 'strategicOpportunities.marketOpportunities.expectedROI': -1 });

// Static methods for strategic analysis
strategicAnalyticsSchema.statics.generateGrowthReport = async function(periods = 12) {
    const pipeline = [
        { $match: { period: 'monthly' } },
        { $sort: { date: -1 } },
        { $limit: periods },
        { $sort: { date: 1 } }
    ];
    return this.aggregate(pipeline);
};

strategicAnalyticsSchema.statics.getMarketTrends = async function() {
    const latest = await this.findOne({ period: 'monthly' }).sort({ date: -1 });
    const previous = await this.findOne({ period: 'monthly' }).sort({ date: -1 }).skip(1);
    
    return {
        current: latest,
        previous: previous,
        trends: this.calculateTrends(previous, latest)
    };
};

strategicAnalyticsSchema.statics.calculateTrends = function(previous, current) {
    if (!previous || !current) return {};
    
    const calculateGrowth = (prev, curr) => {
        if (prev === 0) return curr > 0 ? 100 : 0;
        return ((curr - prev) / prev) * 100;
    };
    
    return {
        userGrowth: calculateGrowth(
            previous?.marketOverview?.totalUsers || 0,
            current?.marketOverview?.totalUsers || 0
        ),
        revenueGrowth: calculateGrowth(
            previous?.marketOverview?.totalRevenue || 0,
            current?.marketOverview?.totalRevenue || 0
        ),
        transactionGrowth: calculateGrowth(
            previous?.marketOverview?.totalTransactions || 0,
            current?.marketOverview?.totalTransactions || 0
        ),
        sellerGrowth: calculateGrowth(
            previous?.marketOverview?.totalSellers || 0,
            current?.marketOverview?.totalSellers || 0
        )
    };
};

// Instance methods
strategicAnalyticsSchema.methods.calculateHealthScore = function() {
    const weights = {
        userGrowth: 0.2,
        revenueGrowth: 0.25,
        marketShare: 0.15,
        userRetention: 0.2,
        operationalEfficiency: 0.1,
        competitivePosition: 0.1
    };
    
    let score = 0;
    const overview = this.marketOverview || {};
    const behavior = this.userBehavior || {};
    const competitive = this.competitiveAnalysis || {};
    
    score += Math.min(100, overview.growthRate * 10) * weights.userGrowth;
    score += Math.min(100, overview.growthRate * 10) * weights.revenueGrowth;
    score += Math.min(100, overview.marketShare * 2) * weights.marketShare;
    score += Math.min(100, (behavior.engagementMetrics?.retentionRates?.day30 || 0) * 100) * weights.userRetention;
    score += 75 * weights.operationalEfficiency; // placeholder
    score += Math.min(100, (competitive.marketPosition?.marketShare || 0) * 200) * weights.competitivePosition;
    
    return Math.round(score);
};

strategicAnalyticsSchema.methods.identifyGrowthOpportunities = function() {
    const opportunities = [];
    const healthScore = this.calculateHealthScore();
    const growthRate = this.marketOverview?.growthRate || 0;
    const marketShare = this.marketOverview?.marketShare || 0;
    
    if (marketShare < 10) {
        opportunities.push({
            type: 'market_expansion',
            priority: 'high',
            description: 'Increase market share through aggressive acquisition',
            expectedImpact: '20-30% growth in 6 months',
            investment: 'Medium'
        });
    }
    
    if (growthRate < 15) {
        opportunities.push({
            type: 'product_innovation',
            priority: 'medium',
            description: 'Launch new product categories to drive growth',
            expectedImpact: '15-25% growth in 12 months',
            investment: 'High'
        });
    }
    
    if (healthScore < 70) {
        opportunities.push({
            type: 'operational_improvement',
            priority: 'high',
            description: 'Optimize operations to improve efficiency',
            expectedImpact: '10-15% cost reduction',
            investment: 'Low'
        });
    }
    
    return opportunities;
};

module.exports = mongoose.model('StrategicAnalytics', strategicAnalyticsSchema);
