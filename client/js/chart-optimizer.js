/**
 * Chart.js Optimization Utility
 * Provides optimized chart management with proper cleanup and memory management
 */

class ChartManager {
    constructor() {
        this.charts = new Map();
        this.defaultOptions = {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 15,
                        font: {
                            size: 12
                        }
                    }
                },
                tooltip: {
                    enabled: true,
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: '#fff',
                    bodyColor: '#fff',
                    borderColor: '#ddd',
                    borderWidth: 1,
                    cornerRadius: 4,
                    displayColors: true,
                    intersect: false,
                    mode: 'index'
                }
            },
            animation: {
                duration: 750,
                easing: 'easeInOutQuart'
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        };
        
        // Set up automatic cleanup for destroyed canvas elements
        this.setupAutoCleanup();
    }

    /**
     * Create a new chart with proper cleanup
     * @param {string} canvasId - Canvas element ID
     * @param {Object} config - Chart configuration
     * @param {Object} options - Additional options
     * @returns {Object} Chart instance
     */
    createChart(canvasId, config, options = {}) {
        // Destroy existing chart if it exists
        this.destroyChart(canvasId);

        const canvas = document.getElementById(canvasId);
        if (!canvas) {
            console.warn(`Chart canvas not found: ${canvasId}`);
            return null;
        }

        const ctx = canvas.getContext('2d');
        
        // Merge default options with provided options
        const mergedConfig = {
            ...config,
            options: {
                ...this.defaultOptions,
                ...config.options,
                ...options
            }
        };

        // Add performance optimizations
        mergedConfig.options.animation = {
            ...this.defaultOptions.animation,
            ...options.animation,
            // Reduce animation complexity for better performance
            duration: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 750
        };

        // Create the chart
        const chart = new Chart(ctx, mergedConfig);
        
        // Store reference for cleanup
        this.charts.set(canvasId, chart);

        console.log(`Chart created: ${canvasId}`);
        return chart;
    }

    /**
     * Get existing chart by ID
     * @param {string} canvasId - Canvas element ID
     * @returns {Object|null} Chart instance
     */
    getChart(canvasId) {
        return this.charts.get(canvasId) || null;
    }

    /**
     * Destroy a specific chart
     * @param {string} canvasId - Canvas element ID
     * @returns {boolean} True if chart was destroyed
     */
    destroyChart(canvasId) {
        const chart = this.charts.get(canvasId);
        if (chart && typeof chart.destroy === 'function') {
            chart.destroy();
            this.charts.delete(canvasId);
            console.log(`Chart destroyed: ${canvasId}`);
            return true;
        }
        return false;
    }

    /**
     * Destroy all charts
     * @returns {number} Number of charts destroyed
     */
    destroyAllCharts() {
        let destroyed = 0;
        this.charts.forEach((chart, canvasId) => {
            if (this.destroyChart(canvasId)) {
                destroyed++;
            }
        });
        console.log(`Destroyed ${destroyed} charts`);
        return destroyed;
    }

    /**
     * Update chart data with animation
     * @param {string} canvasId - Canvas element ID
     * @param {Object} newData - New chart data
     * @param {Object} options - Update options
     */
    updateChart(canvasId, newData, options = {}) {
        const chart = this.getChart(canvasId);
        if (!chart) {
            console.warn(`Chart not found for update: ${canvasId}`);
            return;
        }

        const { animate = true, duration = 750 } = options;

        if (animate) {
            chart.data = newData;
            chart.update('active');
        } else {
            chart.data = newData;
            chart.update('none');
        }
    }

    /**
     * Resize chart
     * @param {string} canvasId - Canvas element ID
     */
    resizeChart(canvasId) {
        const chart = this.getChart(canvasId);
        if (chart) {
            chart.resize();
        }
    }

    /**
     * Resize all charts
     */
    resizeAllCharts() {
        this.charts.forEach(chart => {
            chart.resize();
        });
    }

    /**
     * Create optimized line chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - X-axis labels
     * @param {Array} datasets - Chart datasets
     * @param {Object} options - Additional options
     * @returns {Object} Chart instance
     */
    createLineChart(canvasId, labels, datasets, options = {}) {
        const config = {
            type: 'line',
            data: {
                labels: labels,
                datasets: datasets.map(dataset => ({
                    backgroundColor: 'rgba(10, 17, 40, 0.1)',
                    borderColor: 'rgba(10, 17, 40, 1)',
                    borderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6,
                    pointBackgroundColor: '#fff',
                    pointBorderColor: 'rgba(10, 17, 40, 1)',
                    pointBorderWidth: 2,
                    tension: 0.4,
                    fill: true,
                    ...dataset
                }))
            },
            options: {
                ...options,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    ...options.scales
                }
            }
        };

        return this.createChart(canvasId, config, options);
    }

    /**
     * Create optimized bar chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - X-axis labels
     * @param {Array} datasets - Chart datasets
     * @param {Object} options - Additional options
     * @returns {Object} Chart instance
     */
    createBarChart(canvasId, labels, datasets, options = {}) {
        const config = {
            type: 'bar',
            data: {
                labels: labels,
                datasets: datasets.map(dataset => ({
                    backgroundColor: 'rgba(255, 215, 0, 0.8)',
                    borderColor: 'rgba(255, 215, 0, 1)',
                    borderWidth: 1,
                    borderRadius: 4,
                    hoverBackgroundColor: 'rgba(255, 215, 0, 0.9)',
                    ...dataset
                }))
            },
            options: {
                ...options,
                scales: {
                    x: {
                        grid: {
                            display: false
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: 'rgba(0, 0, 0, 0.05)'
                        },
                        ticks: {
                            font: {
                                size: 11
                            }
                        }
                    },
                    ...options.scales
                }
            }
        };

        return this.createChart(canvasId, config, options);
    }

    /**
     * Create optimized doughnut chart
     * @param {string} canvasId - Canvas element ID
     * @param {Array} labels - Chart labels
     * @param {Array} data - Chart data
     * @param {Object} options - Additional options
     * @returns {Object} Chart instance
     */
    createDoughnutChart(canvasId, labels, data, options = {}) {
        const colors = [
            '#FFD700', '#0A1128', '#FF6B6B', '#4ECDC4', 
            '#45B7D1', '#96CEB4', '#FFEAA7', '#DDA0DD'
        ];

        const config = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors.slice(0, data.length),
                    borderColor: '#fff',
                    borderWidth: 2,
                    hoverOffset: 4
                }]
            },
            options: {
                ...options,
                cutout: '60%',
                plugins: {
                    ...this.defaultOptions.plugins,
                    ...options.plugins,
                    legend: {
                        ...this.defaultOptions.plugins.legend,
                        ...options.plugins?.legend,
                        position: 'bottom'
                    }
                }
            }
        };

        return this.createChart(canvasId, config, options);
    }

    /**
     * Estimate memory usage of charts
     * @returns {number} Estimated memory usage in bytes
     */
    estimateMemoryUsage() {
        let totalSize = 0;
        
        this.charts.forEach((chart, canvasId) => {
            try {
                // More accurate estimation based on chart data complexity
                let chartSize = 10240; // Base size of 10KB per chart
                
                if (chart.data && chart.data.datasets) {
                    // Add size based on data points
                    chart.data.datasets.forEach(dataset => {
                        if (dataset.data) {
                            chartSize += dataset.data.length * 64; // 64 bytes per data point
                        }
                    });
                }
                
                // Add size for chart configuration
                if (chart.options) {
                    chartSize += JSON.stringify(chart.options).length;
                }
                
                totalSize += chartSize;
            } catch (error) {
                // Fallback to base estimation if error occurs
                totalSize += 50 * 1024;
            }
        });
        
        return totalSize;
    }

    /**
     * Set up automatic cleanup for destroyed canvas elements
     */
    setupAutoCleanup() {
        // Use MutationObserver to detect removed canvas elements
        if (typeof MutationObserver !== 'undefined') {
            this.observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    mutation.removedNodes.forEach((node) => {
                        // Check if removed node is a canvas or contains canvases
                        if (node.id && this.charts.has(node.id)) {
                            this.destroyChart(node.id);
                        } else if (node.querySelectorAll) {
                            const canvases = node.querySelectorAll('canvas');
                            canvases.forEach(canvas => {
                                if (canvas.id && this.charts.has(canvas.id)) {
                                    this.destroyChart(canvas.id);
                                }
                            });
                        }
                    });
                });
            });

            // Start observing the document
            this.observer.observe(document.body, {
                childList: true,
                subtree: true
            });
        }

        // Fallback: Periodic cleanup every 30 seconds
        this.cleanupInterval = setInterval(() => {
            this.performCleanup();
        }, 30000);
        
        // Set up page transition cleanup
        this.setupPageTransitionCleanup();
    }

    /**
     * Perform cleanup of orphaned charts
     */
    performCleanup() {
        const chartIds = Array.from(this.charts.keys());
        let cleanedCount = 0;

        chartIds.forEach(canvasId => {
            const canvas = document.getElementById(canvasId);
            if (!canvas || !canvas.isConnected) {
                this.destroyChart(canvasId);
                cleanedCount++;
            }
        });

        if (cleanedCount > 0) {
            console.log(`Auto-cleaned ${cleanedCount} orphaned charts`);
        }
    }

    /**
     * Destroy the chart manager and clean up resources
     */
    destroy() {
        console.log('Destroying chart manager and cleaning up resources');
        
        // Destroy all charts
        this.destroyAllCharts();
        
        // Stop observing
        if (this.observer) {
            this.observer.disconnect();
            this.observer = null;
        }
        
        // Clear cleanup interval
        if (this.cleanupInterval) {
            clearInterval(this.cleanupInterval);
            this.cleanupInterval = null;
        }
        
        // Clear charts map
        this.charts.clear();
    }

    /**
     * Set up page transition detection for automatic cleanup
     */
    setupPageTransitionCleanup() {
        // Detect page transitions (SPA navigation)
        if (typeof window !== 'undefined' && window.performance && window.performance.navigation) {
            // Traditional page reload detection
            window.addEventListener('beforeunload', () => {
                this.destroy();
            });
        }
        
        // SPA navigation detection
        if (typeof window !== 'undefined') {
            let navigationCount = 0;
            const originalPushState = window.history.pushState;
            const originalReplaceState = window.history.replaceState;
            
            window.history.pushState = function(...args) {
                originalPushState.apply(window.history, args);
                navigationCount++;
                if (navigationCount > 1) {
                    // Delay cleanup to allow new page to initialize
                    setTimeout(() => {
                        window.chartManager?.destroy();
                    }, 100);
                }
            };
            
            window.history.replaceState = function(...args) {
                originalReplaceState.apply(window.history, args);
                setTimeout(() => {
                    window.chartManager?.destroy();
                }, 100);
            };
            
            // Listen for popstate events (back/forward buttons)
            window.addEventListener('popstate', () => {
                setTimeout(() => {
                    window.chartManager?.destroy();
                }, 100);
            });
        }
    }
}

// Chart.js performance optimizations
if (typeof Chart !== 'undefined') {
    // Disable animations for reduced motion users
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
        Chart.defaults.animation.duration = 0;
    }

    // Optimize Chart.js defaults for performance
    Chart.defaults.responsive = true;
    Chart.defaults.maintainAspectRatio = false;
    Chart.defaults.plugins.legend.display = false; // Hide legends by default for performance
    Chart.defaults.plugins.tooltip.enabled = true;
    
    // Reduce point radius for better performance with many data points
    Chart.defaults.elements.point.radius = 3;
    Chart.defaults.elements.point.hoverRadius = 5;
}

// Create global instance
const chartManager = new ChartManager();

// Make available globally
window.chartManager = chartManager;

// Auto-cleanup on page unload
window.addEventListener('beforeunload', () => {
    chartManager.destroyAllCharts();
});

// Auto-resize charts on window resize
let resizeTimeout;
window.addEventListener('resize', () => {
    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
        chartManager.resizeAllCharts();
    }, 250);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        ChartManager,
        chartManager
    };
}
