/**
 * Dependency Validation Utility
 * Provides safe access to global objects with proper error handling and fallbacks
 */

class DependencyValidator {
    constructor() {
        this.dependencies = new Map();
        this.checkInterval = null;
        this.maxWaitTime = 5000; // 5 seconds max wait
    }

    /**
     * Register a dependency to validate
     * @param {string} name - Dependency name
     * @param {Function} validator - Function to validate dependency
     * @param {Function} fallback - Fallback function if dependency is missing
     */
    register(name, validator, fallback = null) {
        this.dependencies.set(name, { validator, fallback });
    }

    /**
     * Check if a dependency is available
     * @param {string} name - Dependency name
     * @returns {boolean} Whether dependency is available
     */
    isAvailable(name) {
        const dep = this.dependencies.get(name);
        if (!dep) {
            console.warn(`Dependency ${name} not registered`);
            return false;
        }
        
        try {
            return dep.validator();
        } catch (error) {
            console.warn(`Dependency validation failed for ${name}:`, error);
            return false;
        }
    }

    /**
     * Get a dependency safely with fallback
     * @param {string} name - Dependency name
     * @param {any} fallbackValue - Fallback value if dependency is missing
     * @returns {any} Dependency value or fallback
     */
    safeGet(name, fallbackValue = null) {
        if (this.isAvailable(name)) {
            const globalName = this.getGlobalName(name);
            return window[globalName];
        }

        const dep = this.dependencies.get(name);
        if (dep && dep.fallback) {
            try {
                return dep.fallback();
            } catch (error) {
                console.warn(`Fallback failed for dependency ${name}:`, error);
            }
        }

        return fallbackValue;
    }

    /**
     * Get the global object name for a dependency
     * @param {string} name - Internal dependency name
     * @returns {string} Global object name
     */
    getGlobalName(name) {
        const nameMap = {
            'cacheManager': 'cacheManager',
            'chartManager': 'chartManager',
            'apiBatcher': 'apiBatcher',
            'debounce': 'debounce',
            'optimizeImageUrl': 'optimizeImageUrl',
            'Chart': 'Chart',
            'criticalCSSManager': 'criticalCSSManager'
        };
        
        return nameMap[name] || name;
    }

    /**
     * Wait for a dependency to become available
     * @param {string} name - Dependency name
     * @param {number} timeout - Timeout in milliseconds
     * @returns {Promise<boolean>} Promise that resolves when dependency is available or timeout
     */
    waitFor(name, timeout = this.maxWaitTime) {
        return new Promise((resolve) => {
            if (this.isAvailable(name)) {
                resolve(true);
                return;
            }

            const startTime = Date.now();
            const checkInterval = setInterval(() => {
                if (this.isAvailable(name)) {
                    clearInterval(checkInterval);
                    resolve(true);
                } else if (Date.now() - startTime > timeout) {
                    clearInterval(checkInterval);
                    console.warn(`Timeout waiting for dependency: ${name}`);
                    resolve(false);
                }
            }, 100);
        });
    }

    /**
     * Execute a function with dependency validation
     * @param {string[]} dependencies - Array of dependency names
     * @param {Function} fn - Function to execute
     * @param {Function} fallback - Fallback function if dependencies are missing
     * @returns {any} Result of function execution or fallback
     */
    withDependencies(dependencies, fn, fallback = null) {
        const missingDeps = dependencies.filter(dep => !this.isAvailable(dep));
        
        if (missingDeps.length > 0) {
            console.warn(`Missing dependencies: ${missingDeps.join(', ')}`);
            if (fallback) {
                return fallback();
            }
            return null;
        }

        try {
            return fn();
        } catch (error) {
            console.error('Function execution failed:', error);
            if (fallback) {
                return fallback();
            }
            return null;
        }
    }

    /**
     * Initialize common dependencies
     */
    initCommonDependencies() {
        // Cache Manager
        this.register('cacheManager', 
            () => window.cacheManager && typeof window.cacheManager.get === 'function',
            () => new Map() // Simple fallback Map
        );

        // Chart Manager
        this.register('chartManager',
            () => window.chartManager && typeof window.chartManager.createChart === 'function',
            () => null // No fallback for charts
        );

        // API Batcher
        this.register('apiBatcher',
            () => window.apiBatcher && typeof window.apiBatcher.batchRequest === 'function',
            () => null // No fallback for API batching
        );

        // Debounce Function
        this.register('debounce',
            () => typeof window.debounce === 'function',
            () => (fn, wait) => {
                let timeout;
                return function(...args) {
                    clearTimeout(timeout);
                    timeout = setTimeout(() => fn.apply(this, args), wait);
                };
            }
        );

        // Image Optimizer
        this.register('optimizeImageUrl',
            () => typeof window.optimizeImageUrl === 'function',
            () => (url) => url // Simple fallback
        );

        // Chart.js Library
        this.register('Chart',
            () => typeof window.Chart === 'function',
            () => null // No fallback for Chart.js
        );

        // Critical CSS Manager
        this.register('criticalCSSManager',
            () => window.criticalCSSManager && typeof window.criticalCSSManager.init === 'function',
            () => null // No fallback for critical CSS
        );
    }

    /**
     * Get dependency status report
     * @returns {Object} Status report for all dependencies
     */
    getStatusReport() {
        const report = {};
        
        this.dependencies.forEach((dep, name) => {
            report[name] = {
                available: this.isAvailable(name),
                globalName: this.getGlobalName(name),
                hasFallback: !!dep.fallback
            };
        });

        return report;
    }

    /**
     * Log dependency status
     */
    logStatus() {
        const report = this.getStatusReport();
        const available = Object.values(report).filter(r => r.available).length;
        const total = Object.keys(report).length;
        
        console.log(`Dependency Status: ${available}/${total} available`);
        
        Object.entries(report).forEach(([name, status]) => {
            const icon = status.available ? '✅' : '❌';
            console.log(`${icon} ${name} (${status.globalName})`);
        });
    }
}

// Create global instance
const dependencyValidator = new DependencyValidator();

// Initialize common dependencies
dependencyValidator.initCommonDependencies();

// Make available globally
window.dependencyValidator = dependencyValidator;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        DependencyValidator,
        dependencyValidator
    };
}
