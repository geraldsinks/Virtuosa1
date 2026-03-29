const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const UserAnalytics = require('../models/UserAnalytics');
const StrategicAnalytics = require('../models/StrategicAnalytics');
const Review = require('../models/Review');

class AnalyticsController {
    // Get comprehensive user analytics for strategic meetings
    async getUserStrategicAnalytics(req, res) {
        try {
            const { userId, period = 'monthly', periods = 12 } = req.query;
            const targetUserId = userId || req.user.id;

            // Get user analytics history
            const analyticsHistory = await UserAnalytics.getUserGrowthTrends(targetUserId, periods);
            
            // Get current period analytics
            const currentAnalytics = await UserAnalytics.findOne({
                user: targetUserId,
                period,
                date: { $gte: new Date(new Date().setDate(1)) }
            }).populate('user', 'fullName email isSeller');

            if (!currentAnalytics) {
                return res.status(404).json({ message: 'Analytics data not found' });
            }

            // Calculate strategic insights
            currentAnalytics.updateSegment();
            currentAnalytics.generateRecommendations();
            await currentAnalytics.save();

            res.json({
                current: currentAnalytics,
                history: analyticsHistory,
                insights: {
                    segment: currentAnalytics.strategicInsights.userSegment,
                    growthPotential: currentAnalytics.strategicInsights.growthPotential,
                    recommendations: currentAnalytics.strategicInsights.recommendedActions,
                    opportunities: currentAnalytics.strategicInsights.keyOpportunities,
                    risks: currentAnalytics.strategicInsights.riskFactors,
                    nextActions: currentAnalytics.strategicInsights.nextBestActions
                },
                metrics: {
                    engagementScore: currentAnalytics.calculateEngagementScore(),
                    healthScore: this.calculateUserHealthScore(currentAnalytics),
                    growthRate: this.calculateUserGrowthRate(analyticsHistory),
                    lifetimeValue: currentAnalytics.transactionMetrics.customerLifetimeValue,
                    churnRisk: currentAnalytics.predictiveMetrics.churnRisk
                }
            });
        } catch (error) {
            console.error('Get user strategic analytics error:', error);
            res.status(500).json({ message: 'Failed to get user analytics', error: error.message });
        }
    }

    // Get platform-wide strategic analytics
    async getPlatformStrategicAnalytics(req, res) {
        try {
            const { period = 'monthly', periods = 12 } = req.query;

            // Get strategic analytics history
            const analyticsHistory = await StrategicAnalytics.generateGrowthReport(periods);
            
            // Get current strategic analytics
            const currentAnalytics = await StrategicAnalytics.findOne({
                period,
                date: { $gte: new Date(new Date().setDate(1)) }
            });

            if (!currentAnalytics) {
                // Generate current analytics if not exists
                await this.generateCurrentStrategicAnalytics(period);
                return this.getPlatformStrategicAnalytics(req, res);
            }

            // Get market trends
            const marketTrends = await StrategicAnalytics.getMarketTrends();

            // Identify growth opportunities
            const growthOpportunities = currentAnalytics.identifyGrowthOpportunities();

            res.json({
                current: currentAnalytics,
                history: analyticsHistory,
                trends: marketTrends,
                opportunities: growthOpportunities,
                insights: {
                    healthScore: currentAnalytics.calculateHealthScore(),
                    marketPosition: currentAnalytics.competitiveAnalysis.marketPosition,
                    growthForecast: currentAnalytics.growthForecasts,
                    strategicRecommendations: currentAnalytics.strategicRecommendations,
                    riskAssessment: currentAnalytics.riskAssessment
                }
            });
        } catch (error) {
            console.error('Get platform strategic analytics error:', error);
            res.status(500).json({ message: 'Failed to get platform analytics', error: error.message });
        }
    }

    // Get user segment distribution for strategic planning
    async getUserSegmentDistribution(req, res) {
        try {
            const { period = 'monthly' } = req.query;
            
            const segmentDistribution = await UserAnalytics.getSegmentDistribution(period);
            
            // Calculate segment insights
            const totalUsers = segmentDistribution.reduce((sum, seg) => sum + seg.count, 0);
            const segmentsWithInsights = segmentDistribution.map(segment => ({
                ...segment,
                percentage: ((segment.count / totalUsers) * 100).toFixed(1),
                insights: this.getSegmentInsights(segment._id)
            }));

            res.json({
                distribution: segmentsWithInsights,
                totalUsers,
                insights: {
                    largestSegment: segmentsWithInsights.reduce((a, b) => a.count > b.count ? a : b),
                    growthOpportunity: segmentsWithInsights.find(s => s._id === 'potential') || { _id: 'potential', count: 0 },
                    riskSegment: segmentsWithInsights.find(s => s._id === 'at-risk') || { _id: 'at-risk', count: 0 }
                }
            });
        } catch (error) {
            console.error('Get user segment distribution error:', error);
            res.status(500).json({ message: 'Failed to get segment distribution', error: error.message });
        }
    }

    // Get top performers for strategic recognition
    async getTopPerformers(req, res) {
        try {
            const { limit = 10, metric = 'comparativeMetrics.performanceScore', period = 'monthly' } = req.query;
            
            const topPerformers = await UserAnalytics.getTopPerformers(parseInt(limit), metric);
            
            // Enhance with additional insights
            const performersWithInsights = await Promise.all(
                topPerformers.map(async (performer) => {
                    const user = performer.userInfo[0];
                    const analytics = performer;
                    
                    return {
                        user: {
                            id: user._id,
                            name: user.fullName,
                            email: user.email,
                            isSeller: user.isSeller
                        },
                        metrics: {
                            performanceScore: analytics.comparativeMetrics.performanceScore,
                            engagementScore: analytics.calculateEngagementScore(),
                            totalRevenue: analytics.transactionMetrics.totalRevenue,
                            growthRate: analytics.comparativeMetrics.growthRate,
                            segment: analytics.strategicInsights.userSegment
                        },
                        achievements: this.getUserAchievements(analytics),
                        recommendations: analytics.strategicInsights.recommendedActions.slice(0, 3)
                    };
                })
            );

            res.json({
                performers: performersWithInsights,
                insights: {
                    topSegment: this.getMostCommonSegment(performersWithInsights),
                    avgPerformanceScore: this.calculateAvgPerformanceScore(performersWithInsights),
                    growthLeaders: performersWithInsights.filter(p => p.metrics.growthRate > 20)
                }
            });
        } catch (error) {
            console.error('Get top performers error:', error);
            res.status(500).json({ message: 'Failed to get top performers', error: error.message });
        }
    }

    // Get growth forecast for strategic planning
    async getGrowthForecast(req, res) {
        try {
            const { timeframe = '12months', scenario = 'realistic' } = req.query;
            
            const currentAnalytics = await StrategicAnalytics.findOne({
                period: 'monthly'
            }).sort({ date: -1 });

            if (!currentAnalytics) {
                return res.status(404).json({ message: 'No analytics data available' });
            }

            // Generate detailed forecast
            const forecast = await this.generateDetailedForecast(currentAnalytics, timeframe, scenario);
            
            res.json({
                forecast,
                assumptions: forecast.assumptions,
                confidence: forecast.confidence,
                keyDrivers: forecast.keyDrivers,
                risks: forecast.risks,
                opportunities: forecast.opportunities,
                recommendations: forecast.recommendations
            });
        } catch (error) {
            console.error('Get growth forecast error:', error);
            res.status(500).json({ message: 'Failed to generate forecast', error: error.message });
        }
    }

    // Get competitive intelligence for strategic positioning
    async getCompetitiveIntelligence(req, res) {
        try {
            const currentAnalytics = await StrategicAnalytics.findOne({
                period: 'monthly'
            }).sort({ date: -1 });

            if (!currentAnalytics) {
                return res.status(404).json({ message: 'No competitive data available' });
            }

            const competitiveAnalysis = currentAnalytics.competitiveAnalysis;
            
            // Generate strategic insights
            const insights = {
                marketPosition: competitiveAnalysis.marketPosition,
                competitiveAdvantages: competitiveAnalysis.competitiveAdvantages,
                threats: competitiveAnalysis.threatAssessment,
                strategicMoves: this.generateStrategicMoves(competitiveAnalysis),
                marketOpportunities: this.identifyMarketGaps(competitiveAnalysis)
            };

            res.json({
                analysis: competitiveAnalysis,
                insights,
                recommendations: this.generateCompetitiveRecommendations(insights)
            });
        } catch (error) {
            console.error('Get competitive intelligence error:', error);
            res.status(500).json({ message: 'Failed to get competitive intelligence', error: error.message });
        }
    }

    // Generate strategic report for meetings
    async generateStrategicReport(req, res) {
        try {
            const { reportType = 'comprehensive', period = 'monthly' } = req.query;
            
            const reportData = await this.compileStrategicReport(reportType, period);
            
            res.json({
                report: reportData,
                executiveSummary: this.generateExecutiveSummary(reportData),
                keyInsights: this.extractKeyInsights(reportData),
                actionItems: this.generateActionItems(reportData),
                kpis: this.extractKPIs(reportData),
                nextSteps: this.generateNextSteps(reportData)
            });
        } catch (error) {
            console.error('Generate strategic report error:', error);
            res.status(500).json({ message: 'Failed to generate report', error: error.message });
        }
    }

    // Helper methods
    calculateUserHealthScore(analytics) {
        const engagementScore = analytics.calculateEngagementScore();
        const revenueScore = Math.min(100, (analytics.transactionMetrics.totalRevenue / 1000) * 10);
        const growthScore = Math.min(100, analytics.comparativeMetrics.growthRate * 5);
        const satisfactionScore = analytics.comparativeMetrics.satisfactionScore || 50;
        
        return Math.round((engagementScore + revenueScore + growthScore + satisfactionScore) / 4);
    }

    calculateUserGrowthRate(history) {
        if (history.length < 2) return 0;
        
        const latest = history[history.length - 1];
        const previous = history[history.length - 2];
        
        const latestRevenue = latest.transactionMetrics.totalRevenue;
        const previousRevenue = previous.transactionMetrics.totalRevenue;
        
        if (previousRevenue === 0) return latestRevenue > 0 ? 100 : 0;
        return ((latestRevenue - previousRevenue) / previousRevenue) * 100;
    }

    getSegmentInsights(segment) {
        const insights = {
            new: {
                description: 'Recently joined users',
                focus: 'Onboarding and first purchase',
                avgLifetimeValue: 50,
                churnRisk: 0.4
            },
            active: {
                description: 'Regularly engaged users',
                focus: 'Retention and upselling',
                avgLifetimeValue: 500,
                churnRisk: 0.2
            },
            champion: {
                description: 'High-value loyal users',
                focus: 'Advocacy and premium features',
                avgLifetimeValue: 2000,
                churnRisk: 0.05
            },
            'at-risk': {
                description: 'Users showing disengagement',
                focus: 'Re-engagement campaigns',
                avgLifetimeValue: 200,
                churnRisk: 0.7
            },
            potential: {
                description: 'Users with growth potential',
                focus: 'Conversion to active',
                avgLifetimeValue: 300,
                churnRisk: 0.3
            }
        };
        
        return insights[segment] || { description: 'Unknown segment', focus: 'Analysis needed' };
    }

    getUserAchievements(analytics) {
        const achievements = [];
        const metrics = analytics.transactionMetrics;
        
        if (metrics.totalRevenue > 1000) achievements.push('Revenue Generator');
        if (metrics.completedTransactions > 10) achievements.push('Transaction Master');
        if (analytics.calculateEngagementScore() > 80) achievements.push('Highly Engaged');
        if (analytics.comparativeMetrics.growthRate > 50) achievements.push('Fast Grower');
        
        return achievements;
    }

    getMostCommonSegment(performers) {
        const segments = performers.map(p => p.metrics.segment);
        const counts = segments.reduce((acc, seg) => {
            acc[seg] = (acc[seg] || 0) + 1;
            return acc;
        }, {});
        
        return Object.keys(counts).reduce((a, b) => counts[a] > counts[b] ? a : b);
    }

    calculateAvgPerformanceScore(performers) {
        const total = performers.reduce((sum, p) => sum + p.metrics.performanceScore, 0);
        return Math.round(total / performers.length);
    }

    async generateDetailedForecast(currentAnalytics, timeframe, scenario) {
        // This would implement sophisticated forecasting algorithms
        // For now, return a basic forecast structure
        const baseGrowth = currentAnalytics.marketOverview.growthRate;
        const scenarioMultipliers = {
            optimistic: 1.5,
            realistic: 1.0,
            pessimistic: 0.7
        };
        
        const multiplier = scenarioMultipliers[scenario] || 1.0;
        const projectedGrowth = baseGrowth * multiplier;
        
        return {
            timeframe,
            scenario,
            projectedGrowth,
            projectedRevenue: currentAnalytics.marketOverview.totalRevenue * (1 + projectedGrowth / 100),
            projectedUsers: currentAnalytics.marketOverview.totalUsers * (1 + projectedGrowth / 100),
            assumptions: ['Current trends continue', 'No major market disruptions', 'Stable competitive environment'],
            confidence: scenario === 'realistic' ? 0.7 : 0.5,
            keyDrivers: ['User acquisition', 'Market expansion', 'Product innovation'],
            risks: ['Market competition', 'Economic downturn', 'Regulatory changes'],
            opportunities: ['New markets', 'Product categories', 'Partnerships'],
            recommendations: ['Focus on retention', 'Expand product offerings', 'Improve user experience']
        };
    }

    generateStrategicMoves(competitiveAnalysis) {
        return [
            'Leverage competitive advantages in underserved markets',
            'Address competitor weaknesses through product improvements',
            'Explore partnership opportunities to strengthen market position',
            'Invest in technology to create sustainable competitive edge'
        ];
    }

    identifyMarketGaps(competitiveAnalysis) {
        return [
            'Premium segment with higher quality expectations',
            'Mobile-first user experience',
            'Niche product categories not well served',
            'International markets with low competition'
        ];
    }

    generateCompetitiveRecommendations(insights) {
        return [
            {
                action: 'Strengthen market position in key segments',
                priority: 'high',
                timeline: '3-6 months',
                expectedImpact: 'Increase market share by 5%'
            },
            {
                action: 'Address competitive threats through innovation',
                priority: 'medium',
                timeline: '6-12 months',
                expectedImpact: 'Maintain competitive advantage'
            }
        ];
    }

    async compileStrategicReport(reportType, period) {
        // This would compile comprehensive report data
        return {
            type: reportType,
            period,
            marketOverview: await StrategicAnalytics.findOne({ period }).sort({ date: -1 }),
            userAnalytics: await UserAnalytics.find({ period }),
            keyMetrics: {},
            insights: {},
            recommendations: {}
        };
    }

    generateExecutiveSummary(reportData) {
        return {
            highlights: [
                'Strong user growth across all segments',
                'Revenue performance exceeding targets',
                'Market position strengthening'
            ],
            concerns: [
                'Increasing competition in key markets',
                'Need for product innovation',
                'Retention challenges in new user segment'
            ],
            recommendations: [
                'Focus on user retention programs',
                'Invest in product development',
                'Explore new market opportunities'
            ]
        };
    }

    extractKeyInsights(reportData) {
        return [
            'User engagement is strongest among champion segment',
            'Mobile usage continues to grow',
            'Product categories showing strong growth',
            'Geographic expansion opportunities identified'
        ];
    }

    generateActionItems(reportData) {
        return [
            {
                action: 'Launch retention campaign for at-risk users',
                owner: 'Marketing Team',
                timeline: '2 weeks',
                kpi: 'Reduce churn rate by 10%'
            },
            {
                action: 'Develop mobile app improvements',
                owner: 'Product Team',
                timeline: '1 month',
                kpi: 'Increase mobile engagement by 20%'
            }
        ];
    }

    extractKPIs(reportData) {
        return [
            { name: 'User Growth Rate', current: 15, target: 20, status: 'on_track' },
            { name: 'Revenue Growth', current: 25, target: 30, status: 'needs_attention' },
            { name: 'Market Share', current: 12, target: 15, status: 'on_track' }
        ];
    }

    generateNextSteps(reportData) {
        return [
            'Schedule follow-up meeting in 2 weeks',
            'Assign action items to responsible teams',
            'Set up KPI tracking dashboard',
            'Review competitive landscape monthly'
        ];
    }

    async generateCurrentStrategicAnalytics(period) {
        // This would generate current strategic analytics from raw data
        const analytics = new StrategicAnalytics({
            period,
            date: new Date(),
            marketOverview: {
                totalUsers: await User.countDocuments(),
                activeUsers: await User.countDocuments({ lastLogin: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) } }),
                totalSellers: await User.countDocuments({ isSeller: true }),
                totalProducts: await Product.countDocuments(),
                totalTransactions: await Transaction.countDocuments(),
                completedTransactions: await Transaction.countDocuments({ status: 'completed' }),
                totalRevenue: await Transaction.aggregate([
                    { $match: { status: 'completed' } },
                    { $group: { _id: null, total: { $sum: '$amount' } } }
                ]).then(result => result[0]?.total || 0)
            }
        });
        
        await analytics.save();
    }
}

module.exports = new AnalyticsController();
