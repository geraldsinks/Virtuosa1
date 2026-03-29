class StrategicAnalyticsCharts {
    constructor() {
        this.charts = new Map();
        this.chartColors = {
            primary: '#FFD700',
            secondary: '#0A1128',
            success: '#10B981',
            warning: '#F59E0B',
            danger: '#EF4444',
            info: '#3B82F6',
            purple: '#8B5CF6'
        };
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        font: { family: 'Montserrat', size: 12 },
                        padding: 20,
                        usePointStyle: true
                    }
                },
                tooltip: {
                    backgroundColor: 'rgba(10, 17, 40, 0.9)',
                    titleFont: { family: 'Montserrat', size: 14, weight: 'bold' },
                    bodyFont: { family: 'Montserrat', size: 12 },
                    padding: 12,
                    cornerRadius: 8,
                    displayColors: true
                }
            }
        };
    }

    // Initialize all charts for the strategic analytics dashboard
    initializeCharts(analyticsData) {
        this.destroyAllCharts();
        
        setTimeout(() => {
            this.createGrowthTrendsChart(analyticsData);
            this.createRevenueBreakdownChart(analyticsData);
            this.createSegmentDistributionChart(analyticsData);
            this.createMarketPositionChart(analyticsData);
            this.createGrowthForecastChart(analyticsData);
            this.createUserEngagementChart(analyticsData);
            this.createCompetitiveAdvantagesChart(analyticsData);
            this.createRiskAssessmentChart(analyticsData);
            this.createPerformanceMetricsChart(analyticsData);
            this.createOpportunityImpactChart(analyticsData);
        }, 100);
    }

    // Growth Trends Chart
    createGrowthTrendsChart(analyticsData) {
        const ctx = document.getElementById('growthChart');
        if (!ctx) return;

        const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const currentYear = new Date().getFullYear();
        const lastYear = currentYear - 1;

        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: `${currentYear} Revenue`,
                        data: this.generateGrowthData(12, 150000, 0.15),
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.hexToRgba(this.chartColors.primary, 0.1),
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: `${lastYear} Revenue`,
                        data: this.generateGrowthData(12, 100000, 0.12),
                        borderColor: this.chartColors.info,
                        backgroundColor: this.hexToRgba(this.chartColors.info, 0.1),
                        borderWidth: 2,
                        tension: 0.4,
                        fill: false,
                        borderDash: [5, 5],
                        pointRadius: 3,
                        pointHoverRadius: 5
                    },
                    {
                        label: 'Target',
                        data: this.generateGrowthData(12, 140000, 0.18),
                        borderColor: this.chartColors.success,
                        backgroundColor: 'transparent',
                        borderWidth: 2,
                        borderDash: [10, 5],
                        tension: 0.4,
                        fill: false,
                        pointRadius: 0
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value),
                            font: { family: 'Montserrat' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { family: 'Montserrat' }
                        }
                    }
                }
            }
        });

        this.charts.set('growthTrends', chart);
    }

    // Revenue Breakdown Chart
    createRevenueBreakdownChart(analyticsData) {
        const ctx = document.getElementById('revenueChart');
        if (!ctx) return;

        const revenueData = analyticsData.revenueAnalysis?.revenueStreams || [
            { stream: 'Commissions', amount: 60000, percentage: 60 },
            { stream: 'Listing Fees', amount: 25000, percentage: 25 },
            { stream: 'Premium Features', amount: 10000, percentage: 10 },
            { stream: 'Other', amount: 5000, percentage: 5 }
        ];

        const chart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: revenueData.map(r => r.stream),
                datasets: [{
                    data: revenueData.map(r => r.amount),
                    backgroundColor: [
                        this.chartColors.primary,
                        this.chartColors.info,
                        this.chartColors.success,
                        this.chartColors.purple
                    ],
                    borderWidth: 0,
                    hoverOffset: 15
                }]
            },
            options: {
                ...this.defaultOptions,
                cutout: '60%',
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const label = context.label || '';
                                const value = this.formatCurrency(context.parsed);
                                const percentage = revenueData[context.dataIndex].percentage;
                                return `${label}: ${value} (${percentage}%)`;
                            }
                        }
                    }
                }
            }
        });

        this.charts.set('revenueBreakdown', chart);
    }

    // User Segment Distribution Chart
    createSegmentDistributionChart(analyticsData) {
        const ctx = document.getElementById('segmentChart');
        if (!ctx) return;

        const segments = analyticsData.userInsights?.segments || {
            champions: 1000,
            active: 1500,
            atRisk: 300,
            new: 200,
            potential: 500
        };

        const chart = new Chart(ctx, {
            type: 'polarArea',
            data: {
                labels: ['Champions', 'Active', 'At Risk', 'New', 'Potential'],
                datasets: [{
                    data: [segments.champions, segments.active, segments.atRisk, segments.new, segments.potential],
                    backgroundColor: [
                        this.hexToRgba(this.chartColors.success, 0.8),
                        this.hexToRgba(this.chartColors.info, 0.8),
                        this.hexToRgba(this.chartColors.danger, 0.8),
                        this.hexToRgba(this.chartColors.warning, 0.8),
                        this.hexToRgba(this.chartColors.purple, 0.8)
                    ],
                    borderWidth: 2,
                    borderColor: '#fff'
                }]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    r: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: { family: 'Montserrat' }
                        }
                    }
                },
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: {
                        position: 'right'
                    }
                }
            }
        });

        this.charts.set('segmentDistribution', chart);
    }

    // Market Position Chart
    createMarketPositionChart(analyticsData) {
        const ctx = document.getElementById('marketChart');
        if (!ctx) return;

        const competitors = [
            { name: 'Virtuosa', share: 12, rank: 2 },
            { name: 'Competitor A', share: 25, rank: 1 },
            { name: 'Competitor B', share: 18, rank: 3 },
            { name: 'Competitor C', share: 15, rank: 4 },
            { name: 'Competitor D', share: 10, rank: 5 },
            { name: 'Others', share: 20, rank: 6 }
        ];

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: competitors.map(c => c.name),
                datasets: [{
                    label: 'Market Share %',
                    data: competitors.map(c => c.share),
                    backgroundColor: competitors.map(c => 
                        c.name === 'Virtuosa' ? this.chartColors.primary : this.hexToRgba(this.chartColors.info, 0.6)
                    ),
                    borderColor: competitors.map(c => 
                        c.name === 'Virtuosa' ? this.chartColors.primary : this.chartColors.info
                    ),
                    borderWidth: competitors.map(c => c.name === 'Virtuosa' ? 2 : 1),
                    borderRadius: 6
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    legend: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => `${value}%`,
                            font: { family: 'Montserrat' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { family: 'Montserrat' }
                        }
                    }
                }
            }
        });

        this.charts.set('marketPosition', chart);
    }

    // Growth Forecast Chart
    createGrowthForecastChart(analyticsData) {
        const ctx = document.getElementById('forecastChart');
        if (!ctx) return;

        const months = ['Q1', 'Q2', 'Q3', 'Q4'];
        
        const chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: months,
                datasets: [
                    {
                        label: 'Optimistic',
                        data: [180000, 220000, 270000, 330000],
                        borderColor: this.chartColors.success,
                        backgroundColor: this.hexToRgba(this.chartColors.success, 0.1),
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false
                    },
                    {
                        label: 'Realistic',
                        data: [150000, 180000, 210000, 250000],
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.hexToRgba(this.chartColors.primary, 0.1),
                        borderWidth: 3,
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Pessimistic',
                        data: [120000, 140000, 160000, 180000],
                        borderColor: this.chartColors.danger,
                        backgroundColor: this.hexToRgba(this.chartColors.danger, 0.1),
                        borderWidth: 2,
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                interaction: {
                    mode: 'index',
                    intersect: false
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: {
                            callback: (value) => this.formatCurrency(value),
                            font: { family: 'Montserrat' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { family: 'Montserrat' }
                        }
                    }
                }
            }
        });

        this.charts.set('growthForecast', chart);
    }

    // User Engagement Chart
    createUserEngagementChart(analyticsData) {
        const ctx = document.getElementById('engagementChart');
        if (!ctx) return;

        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: ['Daily Active', 'Weekly Active', 'Monthly Active', 'Session Duration', 'Pages/Session', 'Retention Rate'],
                datasets: [
                    {
                        label: 'Current',
                        data: [65, 75, 100, 25, 5, 60],
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.hexToRgba(this.chartColors.primary, 0.2),
                        borderWidth: 2,
                        pointRadius: 4,
                        pointHoverRadius: 6
                    },
                    {
                        label: 'Target',
                        data: [80, 85, 100, 35, 8, 75],
                        borderColor: this.chartColors.success,
                        backgroundColor: this.hexToRgba(this.chartColors.success, 0.2),
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 3,
                        pointHoverRadius: 5
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            stepSize: 20,
                            font: { family: 'Montserrat' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        pointLabels: {
                            font: { family: 'Montserrat', size: 11 }
                        }
                    }
                }
            }
        });

        this.charts.set('userEngagement', chart);
    }

    // Competitive Advantages Chart
    createCompetitiveAdvantagesChart(analyticsData) {
        const ctx = document.getElementById('competitiveAdvantagesChart');
        if (!ctx) return;

        const advantages = [
            { factor: 'Price', us: 8, competitor: 6 },
            { factor: 'Quality', us: 7, competitor: 8 },
            { factor: 'Support', us: 9, competitor: 5 },
            { factor: 'Features', us: 6, competitor: 7 },
            { factor: 'User Experience', us: 8, competitor: 6 }
        ];

        const chart = new Chart(ctx, {
            type: 'radar',
            data: {
                labels: advantages.map(a => a.factor),
                datasets: [
                    {
                        label: 'Virtuosa',
                        data: advantages.map(a => a.us),
                        borderColor: this.chartColors.primary,
                        backgroundColor: this.hexToRgba(this.chartColors.primary, 0.2),
                        borderWidth: 3,
                        pointRadius: 5
                    },
                    {
                        label: 'Market Average',
                        data: advantages.map(a => a.competitor),
                        borderColor: this.chartColors.info,
                        backgroundColor: this.hexToRgba(this.chartColors.info, 0.2),
                        borderWidth: 2,
                        borderDash: [5, 5],
                        pointRadius: 4
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    r: {
                        beginAtZero: true,
                        max: 10,
                        ticks: {
                            stepSize: 2,
                            font: { family: 'Montserrat' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        pointLabels: {
                            font: { family: 'Montserrat', size: 12 }
                        }
                    }
                }
            }
        });

        this.charts.set('competitiveAdvantages', chart);
    }

    // Risk Assessment Chart
    createRiskAssessmentChart(analyticsData) {
        const ctx = document.getElementById('riskChart');
        if (!ctx) return;

        const risks = [
            { category: 'Market', probability: 0.6, impact: 0.8 },
            { category: 'Operational', probability: 0.3, impact: 0.7 },
            { category: 'Financial', probability: 0.4, impact: 0.9 },
            { category: 'Competitive', probability: 0.7, impact: 0.6 },
            { category: 'Technology', probability: 0.2, impact: 0.8 }
        ];

        const chart = new Chart(ctx, {
            type: 'bubble',
            data: {
                datasets: [{
                    label: 'Risk Assessment',
                    data: risks.map(r => ({
                        x: r.probability * 100,
                        y: r.impact * 100,
                        r: (r.probability * r.impact) * 30 + 10
                    })),
                    backgroundColor: risks.map(r => {
                        const score = r.probability * r.impact;
                        if (score > 0.6) return this.hexToRgba(this.chartColors.danger, 0.7);
                        if (score > 0.3) return this.hexToRgba(this.chartColors.warning, 0.7);
                        return this.hexToRgba(this.chartColors.success, 0.7);
                    }),
                    borderColor: risks.map(r => {
                        const score = r.probability * r.impact;
                        if (score > 0.6) return this.chartColors.danger;
                        if (score > 0.3) return this.chartColors.warning;
                        return this.chartColors.success;
                    }),
                    borderWidth: 2
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const risk = risks[context.dataIndex];
                                return [
                                    `${risk.category} Risk`,
                                    `Probability: ${(risk.probability * 100).toFixed(0)}%`,
                                    `Impact: ${(risk.impact * 100).toFixed(0)}%`,
                                    `Risk Score: ${(risk.probability * risk.impact * 100).toFixed(0)}%`
                                ];
                            }
                        }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Probability (%)',
                            font: { family: 'Montserrat', size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Impact (%)',
                            font: { family: 'Montserrat', size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });

        this.charts.set('riskAssessment', chart);
    }

    // Performance Metrics Chart
    createPerformanceMetricsChart(analyticsData) {
        const ctx = document.getElementById('performanceChart');
        if (!ctx) return;

        const metrics = [
            { name: 'User Growth', current: 85, target: 90 },
            { name: 'Revenue Growth', current: 78, target: 85 },
            { name: 'Market Share', current: 72, target: 80 },
            { name: 'Customer Satisfaction', current: 88, target: 90 },
            { name: 'Operational Efficiency', current: 75, target: 85 }
        ];

        const chart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: metrics.map(m => m.name),
                datasets: [
                    {
                        label: 'Current',
                        data: metrics.map(m => m.current),
                        backgroundColor: this.chartColors.primary,
                        borderColor: this.chartColors.primary,
                        borderWidth: 2,
                        borderRadius: 6
                    },
                    {
                        label: 'Target',
                        data: metrics.map(m => m.target),
                        backgroundColor: this.hexToRgba(this.chartColors.success, 0.6),
                        borderColor: this.chartColors.success,
                        borderWidth: 2,
                        borderRadius: 6
                    }
                ]
            },
            options: {
                ...this.defaultOptions,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        ticks: {
                            callback: (value) => `${value}%`,
                            font: { family: 'Montserrat' }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: { family: 'Montserrat', size: 11 }
                        }
                    }
                }
            }
        });

        this.charts.set('performanceMetrics', chart);
    }

    // Opportunity Impact Chart
    createOpportunityImpactChart(analyticsData) {
        const ctx = document.getElementById('opportunityChart');
        if (!ctx) return;

        const opportunities = [
            { name: 'Mobile App', impact: 85, effort: 60, roi: 180 },
            { name: 'International', impact: 90, effort: 85, roi: 150 },
            { name: 'AI Features', impact: 75, effort: 70, roi: 200 },
            { name: 'Market Expansion', impact: 80, effort: 65, roi: 160 },
            { name: 'Product Diversification', impact: 70, effort: 55, roi: 140 }
        ];

        const chart = new Chart(ctx, {
            type: 'scatter',
            data: {
                datasets: [{
                    label: 'Opportunities',
                    data: opportunities.map(o => ({
                        x: o.effort,
                        y: o.impact,
                        r: o.roi / 10
                    })),
                    backgroundColor: opportunities.map(o => {
                        if (o.roi > 180) return this.hexToRgba(this.chartColors.success, 0.7);
                        if (o.roi > 150) return this.hexToRgba(this.chartColors.primary, 0.7);
                        return this.hexToRgba(this.chartColors.info, 0.7);
                    }),
                    borderColor: opportunities.map(o => {
                        if (o.roi > 180) return this.chartColors.success;
                        if (o.roi > 150) return this.chartColors.primary;
                        return this.chartColors.info;
                    }),
                    borderWidth: 2
                }]
            },
            options: {
                ...this.defaultOptions,
                plugins: {
                    ...this.defaultOptions.plugins,
                    tooltip: {
                        ...this.defaultOptions.plugins.tooltip,
                        callbacks: {
                            label: (context) => {
                                const opportunity = opportunities[context.dataIndex];
                                return [
                                    opportunity.name,
                                    `Impact: ${opportunity.impact}%`,
                                    `Effort: ${opportunity.effort}%`,
                                    `ROI: ${opportunity.roi}%`
                                ];
                            }
                        }
                    },
                    legend: { display: false }
                },
                scales: {
                    x: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Effort Required (%)',
                            font: { family: 'Montserrat', size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    },
                    y: {
                        beginAtZero: true,
                        max: 100,
                        title: {
                            display: true,
                            text: 'Business Impact (%)',
                            font: { family: 'Montserrat', size: 12 }
                        },
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        }
                    }
                }
            }
        });

        this.charts.set('opportunityImpact', chart);
    }

    // Update chart with new data
    updateChart(chartId, newData) {
        const chart = this.charts.get(chartId);
        if (chart && newData) {
            chart.data = newData;
            chart.update('active');
        }
    }

    // Update specific dataset in a chart
    updateChartDataset(chartId, datasetIndex, newData) {
        const chart = this.charts.get(chartId);
        if (chart && chart.data.datasets[datasetIndex]) {
            chart.data.datasets[datasetIndex].data = newData;
            chart.update('active');
        }
    }

    // Add animation to chart
    animateChart(chartId, animationType = 'easeInOutQuart') {
        const chart = this.charts.get(chartId);
        if (chart) {
            chart.options.animation = {
                duration: 1000,
                easing: animationType
            };
            chart.update();
        }
    }

    // Export chart as image
    exportChart(chartId, filename) {
        const chart = this.charts.get(chartId);
        if (chart) {
            const url = chart.toBase64Image();
            const link = document.createElement('a');
            link.download = filename || `${chartId}.png`;
            link.href = url;
            link.click();
        }
    }

    // Destroy all charts
    destroyAllCharts() {
        this.charts.forEach(chart => {
            chart.destroy();
        });
        this.charts.clear();
    }

    // Utility methods
    generateGrowthData(months, baseValue, growthRate) {
        const data = [];
        let current = baseValue;
        
        for (let i = 0; i < months; i++) {
            data.push(Math.round(current));
            current *= (1 + (growthRate / 12));
        }
        
        return data;
    }

    formatCurrency(value) {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(value);
    }

    hexToRgba(hex, alpha) {
        const r = parseInt(hex.slice(1, 3), 16);
        const g = parseInt(hex.slice(3, 5), 16);
        const b = parseInt(hex.slice(5, 7), 16);
        return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }

    // Create custom chart themes
    createTheme(themeName) {
        const themes = {
            corporate: {
                primary: '#1e40af',
                secondary: '#64748b',
                success: '#059669',
                warning: '#d97706',
                danger: '#dc2626',
                info: '#0891b2'
            },
            vibrant: {
                primary: '#f59e0b',
                secondary: '#8b5cf6',
                success: '#10b981',
                warning: '#f97316',
                danger: '#ef4444',
                info: '#06b6d4'
            }
        };
        
        return themes[themeName] || this.chartColors;
    }

    // Apply theme to all charts
    applyTheme(themeName) {
        const theme = this.createTheme(themeName);
        this.chartColors = theme;
        
        // Reinitialize charts with new theme
        const currentData = this.getAllChartData();
        this.initializeCharts(currentData);
    }

    // Get all chart data for reinitialization
    getAllChartData() {
        const data = {};
        this.charts.forEach((chart, key) => {
            data[key] = chart.data;
        });
        return data;
    }

    // Create responsive chart configurations
    getResponsiveConfig() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            resizeDelay: 100,
            onResize: (chart, size) => {
                // Handle custom resize logic
                if (size.width < 768) {
                    chart.options.plugins.legend.position = 'bottom';
                    chart.options.plugins.legend.labels.font.size = 10;
                } else {
                    chart.options.plugins.legend.position = 'top';
                    chart.options.plugins.legend.labels.font.size = 12;
                }
                chart.update();
            }
        };
    }
}

// Export for use in the application
window.StrategicAnalyticsCharts = StrategicAnalyticsCharts;
