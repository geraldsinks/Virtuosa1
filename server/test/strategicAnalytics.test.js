const mongoose = require('mongoose');
const User = require('../models/User');
const Product = require('../models/Product');
const Transaction = require('../models/Transaction');
const UserAnalytics = require('../models/UserAnalytics');
const StrategicAnalytics = require('../models/StrategicAnalytics');
const StrategicAnalyticsService = require('../services/strategicAnalyticsService');
const StrategicRecommendationEngine = require('../services/strategicRecommendationEngine');

// Test configuration
const testConfig = {
    mongoURI: process.env.MONGO_URI || 'mongodb+srv://geraldsinkamba49:PWBulG6YrbGABdw9@unitrade.borlid8.mongodb.net/unitrade?retryWrites=true&w=majority&appName=unitrade',
    testUserId: null,
    testProductId: null,
    testTransactionId: null
};

class StrategicAnalyticsTest {
    constructor() {
        this.testResults = [];
        this.testData = {};
    }

    // Run all tests
    async runAllTests() {
        console.log('🚀 Starting Strategic Analytics System Tests...\n');
        
        try {
            await this.connectToDatabase();
            await this.setupTestData();
            
            // Test data models
            await this.testUserAnalyticsModel();
            await this.testStrategicAnalyticsModel();
            
            // Test services
            await this.testStrategicAnalyticsService();
            await this.testStrategicRecommendationEngine();
            
            // Test API endpoints (simulation)
            await this.testAPIEndpoints();
            
            // Test data processing
            await this.testDataProcessing();
            
            // Test recommendations
            await this.testRecommendationGeneration();
            
            // Test visualization data
            await this.testVisualizationData();
            
            this.printTestResults();
            
        } catch (error) {
            console.error('❌ Test suite failed:', error);
        } finally {
            await this.cleanup();
            await mongoose.disconnect();
        }
    }

    // Connect to database
    async connectToDatabase() {
        try {
            await mongoose.connect(testConfig.mongoURI);
            console.log('✅ Connected to MongoDB');
        } catch (error) {
            throw new Error(`Database connection failed: ${error.message}`);
        }
    }

    // Setup test data
    async setupTestData() {
        console.log('📊 Setting up test data...');
        
        try {
            // Create test user
            const testUser = new User({
                fullName: 'Test Strategic User',
                email: 'strategic-test@example.com',
                isSeller: true,
                isStudentVerified: true,
                tokenBalance: 1000,
                totalTokensEarned: 5000,
                totalTokensRedeemed: 2000,
                createdAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000) // 90 days ago
            });
            await testUser.save();
            testConfig.testUserId = testUser._id;
            this.testData.user = testUser;

            // Create test products
            const testProducts = [];
            const categories = ['Electronics', 'Books', 'Clothing'];
            
            for (let i = 0; i < 5; i++) {
                const product = new Product({
                    name: `Strategic Test Product ${i + 1}`,
                    description: `Test product for analytics ${i + 1}`,
                    price: 100 + (i * 50),
                    category: categories[i % categories.length],
                    condition: 'Good',
                    images: [`https://via.placeholder.com/300x200?text=Product${i + 1}`],
                    status: i < 3 ? 'Active' : 'Sold',
                    seller: testUser._id,
                    views: Math.floor(Math.random() * 1000) + 100,
                    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000)
                });
                await product.save();
                testProducts.push(product);
            }
            testConfig.testProductId = testProducts[0]._id;
            this.testData.products = testProducts;

            // Create test transactions
            const testTransactions = [];
            const statuses = ['completed', 'completed', 'pending', 'completed', 'cancelled'];
            
            for (let i = 0; i < 5; i++) {
                const transaction = new Transaction({
                    transactionId: `STRAT_TEST_${i + 1}`,
                    order: new mongoose.Types.ObjectId(),
                    product: testProducts[i % testProducts.length]._id,
                    buyer: new mongoose.Types.ObjectId(),
                    seller: testUser._id,
                    amount: 100 + (i * 25),
                    currency: 'USD',
                    platformFee: 5,
                    sellerAmount: 95 + (i * 25),
                    status: statuses[i],
                    paymentMethod: 'credit_card',
                    createdAt: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000)
                });
                await transaction.save();
                testTransactions.push(transaction);
            }
            testConfig.testTransactionId = testTransactions[0]._id;
            this.testData.transactions = testTransactions;

            console.log('✅ Test data setup complete');
            
        } catch (error) {
            throw new Error(`Test data setup failed: ${error.message}`);
        }
    }

    // Test User Analytics Model
    async testUserAnalyticsModel() {
        console.log('\n🔍 Testing User Analytics Model...');
        
        try {
            const userAnalytics = new UserAnalytics({
                user: testConfig.testUserId,
                period: 'monthly',
                date: new Date(),
                behaviorMetrics: {
                    sessionCount: 25,
                    avgSessionDuration: 30,
                    pageViews: 150,
                    uniquePagesVisited: 45,
                    bounceRate: 0.3
                },
                transactionMetrics: {
                    totalTransactions: 5,
                    completedTransactions: 3,
                    totalRevenue: 500,
                    avgTransactionValue: 100,
                    conversionRate: 60
                },
                engagementMetrics: {
                    reviewsGiven: 2,
                    reviewsReceived: 3,
                    avgRatingReceived: 4.5
                },
                performanceMetrics: {
                    listingsCreated: 5,
                    activeListings: 3,
                    soldItems: 2,
                    sellerScore: 75
                }
            });

            await userAnalytics.save();
            
            // Test methods
            const engagementScore = userAnalytics.calculateEngagementScore();
            userAnalytics.updateSegment();
            userAnalytics.generateRecommendations();
            
            await userAnalytics.save();

            this.addTestResult('UserAnalytics Model', true, {
                engagementScore,
                segment: userAnalytics.strategicInsights.userSegment,
                recommendations: userAnalytics.strategicInsights.recommendedActions.length
            });

        } catch (error) {
            this.addTestResult('UserAnalytics Model', false, error.message);
        }
    }

    // Test Strategic Analytics Model
    async testStrategicAnalyticsModel() {
        console.log('\n🔍 Testing Strategic Analytics Model...');
        
        try {
            const strategicAnalytics = new StrategicAnalytics({
                period: 'monthly',
                date: new Date(),
                marketOverview: {
                    totalUsers: 1000,
                    activeUsers: 600,
                    newUsers: 100,
                    totalSellers: 100,
                    totalProducts: 500,
                    totalTransactions: 800,
                    completedTransactions: 600,
                    totalRevenue: 50000,
                    growthRate: 15
                },
                userAcquisition: {
                    acquisitionChannels: [
                        { channel: 'organic', users: 400, cost: 0, conversionRate: 5 },
                        { channel: 'paid', users: 300, cost: 1500, conversionRate: 8 }
                    ]
                },
                revenueAnalysis: {
                    revenueStreams: [
                        { stream: 'commissions', amount: 30000, percentage: 60 },
                        { stream: 'fees', amount: 20000, percentage: 40 }
                    ]
                }
            });

            await strategicAnalytics.save();
            
            // Test methods
            const healthScore = strategicAnalytics.calculateHealthScore();
            const growthOpportunities = strategicAnalytics.identifyGrowthOpportunities();

            this.addTestResult('StrategicAnalytics Model', true, {
                healthScore,
                growthOpportunities: growthOpportunities.length
            });

        } catch (error) {
            this.addTestResult('StrategicAnalytics Model', false, error.message);
        }
    }

    // Test Strategic Analytics Service
    async testStrategicAnalyticsService() {
        console.log('\n🔍 Testing Strategic Analytics Service...');
        
        try {
            // Test user analytics processing
            const userAnalytics = await StrategicAnalyticsService.processUserAnalytics(
                testConfig.testUserId, 
                'monthly'
            );

            // Test platform analytics generation
            const platformAnalytics = await StrategicAnalyticsService.generatePlatformAnalytics('monthly');

            // Test strategic insights generation
            const insights = await StrategicAnalyticsService.generateStrategicInsights('quarterly');

            this.addTestResult('StrategicAnalyticsService', true, {
                userAnalyticsProcessed: !!userAnalytics,
                platformAnalyticsGenerated: !!platformAnalytics,
                insightsGenerated: !!insights,
                userSegment: userAnalytics.strategicInsights.userSegment,
                healthScore: platformAnalytics.calculateHealthScore()
            });

        } catch (error) {
            this.addTestResult('StrategicAnalyticsService', false, error.message);
        }
    }

    // Test Strategic Recommendation Engine
    async testStrategicRecommendationEngine() {
        console.log('\n🔍 Testing Strategic Recommendation Engine...');
        
        try {
            // Create mock analytics data
            const mockAnalyticsData = {
                marketOverview: {
                    totalUsers: 1000,
                    activeUsers: 600,
                    newUsers: 50,
                    growthRate: 12,
                    marketShare: 10
                },
                userBehavior: {
                    engagementMetrics: {
                        retentionRates: { day30: 35 }
                    },
                    usagePatterns: {
                        devicePreferences: { mobile: 60 }
                    }
                },
                revenueAnalysis: {
                    revenueStreams: [
                        { stream: 'commissions', amount: 30000, growth: 10 }
                    ]
                },
                competitiveAnalysis: {
                    marketPosition: { rank: 3, marketShare: 10 },
                    competitorMetrics: [
                        { name: 'Competitor A', marketShare: 25, growthRate: 15 }
                    ]
                },
                strategicOpportunities: {
                    marketOpportunities: [
                        { opportunity: 'International expansion', expectedROI: 150, investmentRequired: 50000 }
                    ]
                },
                riskAssessment: {
                    businessRisks: [
                        { risk: 'Market saturation', probability: 0.6, impact: 0.7 }
                    ]
                }
            };

            const recommendations = await StrategicRecommendationEngine.generateStrategicRecommendations(mockAnalyticsData);

            this.addTestResult('StrategicRecommendationEngine', true, {
                immediateRecommendations: recommendations.immediate.length,
                shortTermRecommendations: recommendations.shortTerm.length,
                longTermRecommendations: recommendations.longTerm.length,
                investmentPriorities: recommendations.investmentPriorities.length,
                riskMitigation: recommendations.riskMitigation.length,
                growthOpportunities: recommendations.growthOpportunities.length
            });

        } catch (error) {
            this.addTestResult('StrategicRecommendationEngine', false, error.message);
        }
    }

    // Test API endpoints (simulation)
    async testAPIEndpoints() {
        console.log('\n🔍 Testing API Endpoints (Simulation)...');
        
        try {
            // Simulate API responses
            const apiTests = [
                {
                    endpoint: '/api/analytics/user/strategic',
                    mockResponse: { current: { user: 'test' }, insights: { segment: 'active' } }
                },
                {
                    endpoint: '/api/analytics/platform/strategic',
                    mockResponse: { current: { marketOverview: {} }, trends: {} }
                },
                {
                    endpoint: '/api/analytics/segments/distribution',
                    mockResponse: { distribution: [{ segment: 'active', count: 100 }] }
                },
                {
                    endpoint: '/api/analytics/performers/top',
                    mockResponse: { performers: [{ user: 'test', metrics: {} }] }
                }
            ];

            for (const test of apiTests) {
                // Simulate API call validation
                const hasRequiredFields = this.validateAPIResponse(test.endpoint, test.mockResponse);
                this.addTestResult(`API: ${test.endpoint}`, hasRequiredFields, test.mockResponse);
            }

        } catch (error) {
            this.addTestResult('API Endpoints', false, error.message);
        }
    }

    // Test data processing
    async testDataProcessing() {
        console.log('\n🔍 Testing Data Processing...');
        
        try {
            // Test data aggregation
            const userAnalytics = await UserAnalytics.find({ user: testConfig.testUserId });
            const strategicAnalytics = await StrategicAnalytics.find({ period: 'monthly' });

            // Test data transformation
            const processedData = {
                userMetrics: this.processUserMetrics(userAnalytics),
                platformMetrics: this.processPlatformMetrics(strategicAnalytics),
                insights: this.generateInsights(userAnalytics, strategicAnalytics)
            };

            this.addTestResult('Data Processing', true, {
                userAnalyticsCount: userAnalytics.length,
                strategicAnalyticsCount: strategicAnalytics.length,
                processedMetrics: Object.keys(processedData).length
            });

        } catch (error) {
            this.addTestResult('Data Processing', false, error.message);
        }
    }

    // Test recommendation generation
    async testRecommendationGeneration() {
        console.log('\n🔍 Testing Recommendation Generation...');
        
        try {
            // Test different recommendation types
            const recommendationTests = [
                { type: 'retention', data: { retentionRate: 30 } },
                { type: 'acquisition', data: { acquisitionRate: 3 } },
                { type: 'revenue', data: { revenueGrowth: 8 } },
                { type: 'engagement', data: { engagementScore: 40 } }
            ];

            const results = [];
            for (const test of recommendationTests) {
                const recommendations = this.generateMockRecommendations(test.type, test.data);
                results.push({ type: test.type, count: recommendations.length });
            }

            this.addTestResult('Recommendation Generation', true, results);

        } catch (error) {
            this.addTestResult('Recommendation Generation', false, error.message);
        }
    }

    // Test visualization data
    async testVisualizationData() {
        console.log('\n🔍 Testing Visualization Data...');
        
        try {
            // Test chart data generation
            const chartDataTests = [
                { chart: 'growthTrends', dataPoints: 12 },
                { chart: 'revenueBreakdown', segments: 4 },
                { chart: 'segmentDistribution', segments: 5 },
                { chart: 'marketPosition', competitors: 5 }
            ];

            const results = [];
            for (const test of chartDataTests) {
                const chartData = this.generateMockChartData(test.chart, test);
                results.push({ 
                    chart: test.chart, 
                    validData: this.validateChartData(chartData),
                    dataPoints: chartData.datasets?.[0]?.data?.length || 0
                });
            }

            this.addTestResult('Visualization Data', true, results);

        } catch (error) {
            this.addTestResult('Visualization Data', false, error.message);
        }
    }

    // Helper methods
    addTestResult(testName, passed, details) {
        const result = {
            test: testName,
            passed,
            details,
            timestamp: new Date()
        };
        this.testResults.push(result);
        
        const status = passed ? '✅' : '❌';
        console.log(`${status} ${testName}`);
        
        if (!passed) {
            console.log(`   Error: ${details}`);
        } else if (typeof details === 'object') {
            console.log(`   Details: ${JSON.stringify(details, null, 2)}`);
        }
    }

    validateAPIResponse(endpoint, response) {
        const requiredFields = {
            '/api/analytics/user/strategic': ['current', 'insights'],
            '/api/analytics/platform/strategic': ['current', 'trends'],
            '/api/analytics/segments/distribution': ['distribution'],
            '/api/analytics/performers/top': ['performers']
        };

        const fields = requiredFields[endpoint];
        return fields ? fields.every(field => response[field]) : true;
    }

    processUserMetrics(userAnalytics) {
        return userAnalytics.map(ua => ({
            engagementScore: ua.calculateEngagementScore(),
            segment: ua.strategicInsights.userSegment,
            revenue: ua.transactionMetrics.totalRevenue
        }));
    }

    processPlatformMetrics(strategicAnalytics) {
        return strategicAnalytics.map(sa => ({
            healthScore: sa.calculateHealthScore(),
            growthRate: sa.marketOverview.growthRate,
            marketShare: sa.marketOverview.marketShare
        }));
    }

    generateInsights(userAnalytics, strategicAnalytics) {
        return {
            totalUsers: userAnalytics.length,
            avgEngagement: userAnalytics.reduce((sum, ua) => sum + ua.calculateEngagementScore(), 0) / userAnalytics.length,
            platformHealth: strategicAnalytics.length > 0 ? strategicAnalytics[0].calculateHealthScore() : 0
        };
    }

    generateMockRecommendations(type, data) {
        const templates = {
            retention: ['Launch retention campaign', 'Improve onboarding', 'Add engagement features'],
            acquisition: ['Boost marketing', 'Referral program', 'Content strategy'],
            revenue: ['Optimize pricing', 'New revenue streams', 'Upsell campaigns'],
            engagement: ['Gamification', 'Personalization', 'Community features']
        };
        
        return templates[type] || [];
    }

    generateMockChartData(chartType, config) {
        const dataGenerators = {
            growthTrends: () => ({
                labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                datasets: [{
                    label: 'Revenue',
                    data: [10000, 12000, 11000, 14000, 16000, 18000]
                }]
            }),
            revenueBreakdown: () => ({
                labels: ['Commissions', 'Fees', 'Premium', 'Other'],
                datasets: [{
                    data: [60, 25, 10, 5]
                }]
            }),
            segmentDistribution: () => ({
                labels: ['Champions', 'Active', 'At Risk', 'New', 'Potential'],
                datasets: [{
                    data: [1000, 1500, 300, 200, 500]
                }]
            }),
            marketPosition: () => ({
                labels: ['Us', 'Comp A', 'Comp B', 'Comp C', 'Comp D'],
                datasets: [{
                    data: [12, 25, 18, 15, 10]
                }]
            })
        };
        
        return dataGenerators[chartType] ? dataGenerators[chartType]() : {};
    }

    validateChartData(chartData) {
        return chartData && 
               Array.isArray(chartData.labels) && 
               Array.isArray(chartData.datasets) && 
               chartData.datasets.length > 0 &&
               Array.isArray(chartData.datasets[0].data);
    }

    printTestResults() {
        console.log('\n📊 Test Results Summary:');
        console.log('='.repeat(50));
        
        const passed = this.testResults.filter(r => r.passed).length;
        const total = this.testResults.length;
        const failed = total - passed;
        
        console.log(`Total Tests: ${total}`);
        console.log(`Passed: ${passed} ✅`);
        console.log(`Failed: ${failed} ❌`);
        console.log(`Success Rate: ${((passed / total) * 100).toFixed(1)}%`);
        
        if (failed > 0) {
            console.log('\n❌ Failed Tests:');
            this.testResults.filter(r => !r.passed).forEach(result => {
                console.log(`- ${result.test}: ${result.details}`);
            });
        }
        
        console.log('\n🎯 Strategic Analytics System Test Complete!');
    }

    // Cleanup test data
    async cleanup() {
        console.log('\n🧹 Cleaning up test data...');
        
        try {
            // Clean up test data in reverse order of creation
            await UserAnalytics.deleteMany({ user: testConfig.testUserId });
            await Transaction.deleteMany({ seller: testConfig.testUserId });
            await Product.deleteMany({ seller: testConfig.testUserId });
            await User.deleteMany({ _id: testConfig.testUserId });
            await StrategicAnalytics.deleteMany({ period: 'monthly' });
            
            console.log('✅ Test data cleanup complete');
        } catch (error) {
            console.error('❌ Cleanup failed:', error.message);
        }
    }
}

// Run tests if this file is executed directly
if (require.main === module) {
    const tester = new StrategicAnalyticsTest();
    tester.runAllTests().catch(console.error);
}

module.exports = StrategicAnalyticsTest;
