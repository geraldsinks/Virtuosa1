/**
 * API Batching Utility
 * Provides efficient API request batching to reduce network overhead
 */

class APIBatcher {
    constructor(options = {}) {
        this.batchSize = options.batchSize || 10;
        this.batchDelay = options.batchDelay || 50; // ms to wait for more requests
        this.maxConcurrentBatches = options.maxConcurrentBatches || 3;
        this.cache = options.cache || window.cacheManager;
        
        this.pendingRequests = new Map();
        this.activeBatches = new Set();
        this.batchTimeout = null;
        this.isProcessingBatch = false; // Prevent race conditions
    }

    /**
     * Add a request to the batch queue
     * @param {string} url - API endpoint URL
     * @param {Object} options - Request options
     * @returns {Promise} Promise that resolves with the response
     */
    async batchRequest(url, options = {}) {
        const requestId = this.generateRequestId(url, options);
        
        // Check cache first
        if (this.cache && options.cache !== false) {
            const cached = this.cache.getCachedApiResponse(requestId);
            if (cached) {
                return new Response(JSON.stringify(cached), {
                    status: 200,
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        }

        return new Promise((resolve, reject) => {
            this.pendingRequests.set(requestId, {
                url,
                options,
                resolve,
                reject,
                timestamp: Date.now()
            });

            // Schedule batch processing
            this.scheduleBatch();
        });
    }

    /**
     * Generate unique request ID with Unicode support
     * @param {string} url - Request URL
     * @param {Object} options - Request options
     * @returns {string} Request ID
     */
    generateRequestId(url, options) {
        try {
            const key = `${url}_${JSON.stringify(options)}`;
            // Use a safe encoding method that handles Unicode
            const encoded = this._safeEncode(key);
            return encoded.substring(0, 32);
        } catch (error) {
            console.warn('Failed to generate request ID:', error);
            // Fallback to simple hash
            return this._simpleHash(`${url}_${JSON.stringify(options)}`).toString(36);
        }
    }

    /**
     * Safe encoding that handles Unicode characters
     * @param {string} str - String to encode
     * @returns {string} Encoded string
     */
    _safeEncode(str) {
        try {
            return btoa(encodeURIComponent(str));
        } catch (error) {
            // Fallback to simple hash if encoding fails
            return this._simpleHash(str).toString(36);
        }
    }

    /**
     * Simple hash function for fallback cases
     * @param {string} str - String to hash
     * @returns {number} Hash value
     */
    _simpleHash(str) {
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return Math.abs(hash);
    }

    /**
     * Schedule batch processing with race condition protection
     */
    scheduleBatch() {
        // Prevent multiple concurrent batch schedules
        if (this.isProcessingBatch) {
            return;
        }
        
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
        }

        this.batchTimeout = setTimeout(() => {
            this.processBatch();
        }, this.batchDelay);
    }

    /**
     * Process current batch of requests
     */
    async processBatch() {
        if (this.pendingRequests.size === 0) return;

        // Prevent concurrent batch processing
        if (this.isProcessingBatch) {
            return;
        }
        
        this.isProcessingBatch = true;

        // Limit concurrent batches
        if (this.activeBatches.size >= this.maxConcurrentBatches) {
            this.isProcessingBatch = false;
            setTimeout(() => this.processBatch(), 100);
            return;
        }

        const batchId = Date.now();
        this.activeBatches.add(batchId);

        try {
            // Take a batch of requests
            const requests = Array.from(this.pendingRequests.entries())
                .slice(0, this.batchSize);

            // Remove from pending
            requests.forEach(([id]) => this.pendingRequests.delete(id));

            // Group by base URL for potential batching
            const groupedRequests = this.groupRequestsByUrl(requests);

            // Execute grouped requests
            await this.executeGroupedRequests(groupedRequests);

        } catch (error) {
            console.error('Batch processing error:', error);
        } finally {
            this.activeBatches.delete(batchId);
            this.isProcessingBatch = false;
            
            // Process more if there are pending requests
            if (this.pendingRequests.size > 0) {
                this.scheduleBatch();
            }
        }
    }

    /**
     * Group requests by base URL for efficient batching
     * @param {Array} requests - Array of requests
     * @returns {Map} Grouped requests
     */
    groupRequestsByUrl(requests) {
        const grouped = new Map();

        requests.forEach(([id, request]) => {
            const baseUrl = this.extractBaseUrl(request.url);
            
            if (!grouped.has(baseUrl)) {
                grouped.set(baseUrl, []);
            }
            
            grouped.get(baseUrl).push([id, request]);
        });

        return grouped;
    }

    /**
     * Extract base URL from request URL
     * @param {string} url - Request URL
     * @returns {string} Base URL
     */
    extractBaseUrl(url) {
        try {
            const urlObj = new URL(url);
            return `${urlObj.protocol}//${urlObj.host}`;
        } catch {
            return url;
        }
    }

    /**
     * Execute grouped requests
     * @param {Map} groupedRequests - Grouped requests
     */
    async executeGroupedRequests(groupedRequests) {
        const promises = [];

        groupedRequests.forEach((requests, baseUrl) => {
            // Check if we can batch these requests
            if (requests.length > 1 && this.canBatchRequests(requests)) {
                promises.push(this.executeBatchedRequests(requests, baseUrl));
            } else {
                // Execute individually
                requests.forEach(([id, request]) => {
                    promises.push(this.executeIndividualRequest(id, request));
                });
            }
        });

        await Promise.allSettled(promises);
    }

    /**
     * Check if requests can be batched
     * @param {Array} requests - Array of requests
     * @returns {boolean} Whether requests can be batched
     */
    canBatchRequests(requests) {
        // Check if all requests are GET requests to the same endpoint pattern
        const firstUrl = requests[0][1].url;
        const firstMethod = requests[0][1].options.method || 'GET';

        return requests.every(([id, request]) => {
            return (request.options.method || 'GET') === firstMethod &&
                   this.isSameEndpointPattern(firstUrl, request.url);
        });
    }

    /**
     * Check if URLs follow the same endpoint pattern
     * @param {string} url1 - First URL
     * @param {string} url2 - Second URL
     * @returns {boolean} Whether URLs follow same pattern
     */
    isSameEndpointPattern(url1, url2) {
        // Extract endpoint pattern (remove query parameters and IDs)
        const pattern1 = url1.split('?')[0].replace(/\/[^\/]+$/, '');
        const pattern2 = url2.split('?')[0].replace(/\/[^\/]+$/, '');
        
        return pattern1 === pattern2;
    }

    /**
     * Execute batched requests
     * @param {Array} requests - Array of requests
     * @param {string} baseUrl - Base URL
     */
    async executeBatchedRequests(requests, baseUrl) {
        try {
            console.log(`Attempting batch execution for ${requests.length} requests`);
            
            // Create batch request payload
            const batchPayload = requests.map(([id, request]) => ({
                id,
                url: request.url,
                method: request.options.method || 'GET',
                headers: request.options.headers || {}
            }));

            // Try to use a batch endpoint
            const batchResponse = await this.tryBatchEndpoint(batchPayload);
            
            if (batchResponse) {
                console.log('Batch processing successful, handling responses');
                this.handleBatchResponse(batchResponse, requests);
            } else {
                console.log('Batch endpoint not available, falling back to parallel individual requests');
                // Fallback to parallel individual requests with notification
                await this.executeParallelIndividualRequests(requests);
            }

        } catch (error) {
            console.error('Batch execution error:', error);
            
            // Reject all requests in the batch with detailed error information
            requests.forEach(([id, request]) => {
                const enhancedError = new Error(`Batch execution failed: ${error.message}`);
                enhancedError.originalError = error;
                enhancedError.requestId = id;
                enhancedError.requestUrl = request.url;
                request.reject(enhancedError);
            });
        }
    }

    /**
     * Execute parallel individual requests as fallback
     * @param {Array} requests - Array of requests
     */
    async executeParallelIndividualRequests(requests) {
        console.log(`Executing ${requests.length} requests in parallel as fallback`);
        
        const individualPromises = requests.map(([id, request]) => 
            this.executeIndividualRequest(id, request)
                .catch(error => {
                    console.warn(`Individual request ${id} failed:`, error);
                    throw error;
                })
        );

        const results = await Promise.allSettled(individualPromises);
        
        // Log results for monitoring
        const successful = results.filter(r => r.status === 'fulfilled').length;
        const failed = results.filter(r => r.status === 'rejected').length;
        
        console.log(`Fallback execution completed: ${successful} successful, ${failed} failed`);
        
        if (failed > 0) {
            console.warn(`${failed} individual requests failed during fallback execution`);
        }
    }

    /**
     * Try to use a batch endpoint
     * @param {Array} batchPayload - Batch payload
     * @returns {Object|null} Batch response or null
     */
    async tryBatchEndpoint(batchPayload) {
        try {
            // Check if there's a batch endpoint available
            const batchUrl = `${batchPayload[0].url.split('/api/')[0]}/api/batch`;
            
            const response = await fetch(batchUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'X-Batch-Request': 'true'
                },
                body: JSON.stringify({
                    requests: batchPayload
                })
            });

            if (response.ok) {
                const batchResponse = await response.json();
                console.log('Batch endpoint successful:', batchResponse);
                return batchResponse;
            } else {
                console.warn(`Batch endpoint returned status ${response.status}:`, response.statusText);
                return null;
            }
        } catch (error) {
            console.warn('Batch endpoint not available or failed:', error.message);
            // Log more detailed error information for debugging
            if (error.name === 'TypeError' && error.message.includes('fetch')) {
                console.warn('Network error when accessing batch endpoint - falling back to individual requests');
            } else if (error.name === 'SyntaxError') {
                console.warn('Invalid response from batch endpoint - falling back to individual requests');
            }
            return null;
        }
    }

    /**
     * Handle batch response
     * @param {Object} batchResponse - Batch response
     * @param {Array} requests - Original requests
     */
    handleBatchResponse(batchResponse, requests) {
        if (batchResponse.responses) {
            batchResponse.responses.forEach((response, index) => {
                const [id, request] = requests[index];
                
                if (response.success) {
                    // Cache the response
                    if (this.cache && request.options.cache !== false) {
                        this.cache.cacheApiResponse(id, response.data);
                    }
                    
                    request.resolve(new Response(JSON.stringify(response.data), {
                        status: response.status,
                        headers: response.headers || { 'Content-Type': 'application/json' }
                    }));
                } else {
                    request.reject(new Error(response.error || 'Request failed'));
                }
            });
        }
    }

    /**
     * Execute individual request
     * @param {string} id - Request ID
     * @param {Object} request - Request object
     */
    async executeIndividualRequest(id, request) {
        try {
            // Sanitize fetch options: 'cache' must be a string enum, not boolean
            const fetchOptions = { ...request.options };
            if (typeof fetchOptions.cache === 'boolean') {
                delete fetchOptions.cache;
            }
            
            const response = await fetch(request.url, fetchOptions);
            
            if (response.ok) {
                const data = await response.clone().json();
                
                // Cache the response
                if (this.cache && request.options.cache !== false) {
                    this.cache.cacheApiResponse(id, data);
                }
                
                request.resolve(response);
            } else {
                request.reject(new Error(`HTTP ${response.status}: ${response.statusText}`));
            }
        } catch (error) {
            request.reject(error);
        }
    }

    /**
     * Get batch statistics
     * @returns {Object} Batch statistics
     */
    getStats() {
        return {
            pendingRequests: this.pendingRequests.size,
            activeBatches: this.activeBatches.size,
            batchSize: this.batchSize,
            batchDelay: this.batchDelay
        };
    }

    /**
     * Clear all pending requests
     */
    clearPending() {
        this.pendingRequests.forEach(([id, request]) => {
            request.reject(new Error('Request cancelled'));
        });
        this.pendingRequests.clear();
        
        if (this.batchTimeout) {
            clearTimeout(this.batchTimeout);
            this.batchTimeout = null;
        }
    }

    /**
     * Destroy the batcher
     */
    destroy() {
        this.clearPending();
        this.activeBatches.clear();
    }
}

/**
 * Parallel API caller for multiple independent requests
 */
class ParallelAPICaller {
    constructor(options = {}) {
        this.maxConcurrent = options.maxConcurrent || 6;
        this.retryAttempts = options.retryAttempts || 3;
        this.retryDelay = options.retryDelay || 1000;
        this.cache = options.cache || window.cacheManager;
    }

    /**
     * Execute multiple API calls in parallel with concurrency control
     * @param {Array} requests - Array of request objects
     * @returns {Promise<Array>} Array of responses
     */
    async executeParallel(requests) {
        const results = new Array(requests.length);
        const executing = new Set();

        for (let i = 0; i < requests.length; i++) {
            const promise = this.executeRequest(requests[i], i)
                .then(result => {
                    results[i] = { success: true, data: result, index: i };
                })
                .catch(error => {
                    results[i] = { success: false, error, index: i };
                })
                .finally(() => {
                    executing.delete(promise);
                });

            executing.add(promise);

            // Limit concurrency
            if (executing.size >= this.maxConcurrent) {
                await Promise.race(executing);
            }
        }

        await Promise.all(executing);
        return results;
    }

    /**
     * Execute a single request with retry logic
     * @param {Object} request - Request object
     * @param {number} index - Request index
     * @returns {Promise} Response
     */
    async executeRequest(request, index) {
        const { url, options = {}, cacheKey } = request;
        
        // Check cache first
        if (this.cache && options.cache !== false) {
            const key = cacheKey || `${url}_${JSON.stringify(options)}`;
            const cached = this.cache.getCachedApiResponse(key);
            if (cached) {
                return cached;
            }
        }

        let lastError;
        
        for (let attempt = 0; attempt <= this.retryAttempts; attempt++) {
            try {
                // Sanitize fetch options: 'cache' must be a string enum, not boolean
                const fetchOptions = { ...options };
                if (typeof fetchOptions.cache === 'boolean') {
                    delete fetchOptions.cache;
                }
                
                const response = await fetch(url, fetchOptions);
                
                if (response.ok) {
                    const data = await response.json();
                    
                    // Cache the response
                    if (this.cache && options.cache !== false) {
                        const key = cacheKey || `${url}_${JSON.stringify(options)}`;
                        this.cache.cacheApiResponse(key, data);
                    }
                    
                    return data;
                } else {
                    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
                }
            } catch (error) {
                lastError = error;
                
                if (attempt < this.retryAttempts) {
                    // Exponential backoff
                    const delay = this.retryDelay * Math.pow(2, attempt);
                    await new Promise(resolve => setTimeout(resolve, delay));
                }
            }
        }
        
        throw lastError;
    }
}

// Create global instances
const apiBatcher = new APIBatcher();
const parallelAPICaller = new ParallelAPICaller();

// Make available globally
window.apiBatcher = apiBatcher;
window.parallelAPICaller = parallelAPICaller;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        APIBatcher,
        ParallelAPICaller,
        apiBatcher,
        parallelAPICaller
    };
}
