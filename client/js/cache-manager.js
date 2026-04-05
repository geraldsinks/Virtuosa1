/**
 * Client-side Caching Utility
 * Provides localStorage-based caching with expiration for API responses and user data
 */

class CacheManager {
    constructor() {
        this.prefix = 'virtuosa_cache_';
        this.defaultTTL = 5 * 60 * 1000; // 5 minutes default TTL
        this.userCacheTTL = 30 * 60 * 1000; // 30 minutes for user data
        this.staticCacheTTL = 60 * 60 * 1000; // 1 hour for static data
        this.maxRetries = 3; // Maximum retry attempts for quota exceeded errors
        this.maxCacheSize = 5 * 1024 * 1024; // 5MB max cache size
        this.evictionThreshold = 0.8; // Evict when cache is 80% full
        
        // In-memory cache for ultra-fast access
        this.memoryCache = new Map();
    }

    // Generate cache key
    _generateKey(key) {
        return `${this.prefix}${key}`;
    }

    // Set cache with expiration and improved quota handling
    set(key, data, ttl = this.defaultTTL, retryCount = 0) {
        try {
            // Check cache size before setting
            if (this.shouldEvict()) {
                this.performEviction();
            }

            const cacheKey = this._generateKey(key);
            const cacheData = {
                data: data,
                timestamp: Date.now(),
                ttl: ttl
            };
            
            const serializedData = JSON.stringify(cacheData);
            
            // Update memory cache
            this.memoryCache.set(cacheKey, cacheData);
            
            // Check if this single item would exceed quota
            if (serializedData.length > this.maxCacheSize) {
                console.warn('Cache item too large, skipping storage:', key);
                return true; // Still "success" because it's in memory
            }
            
            localStorage.setItem(cacheKey, serializedData);
            return true;
            
        } catch (error) {
            console.warn('Cache set failed:', error);
            
            // Handle different types of localStorage errors
            if (error.name === 'QuotaExceededError') {
                if (retryCount < this.maxRetries) {
                    console.log(`Quota exceeded, retrying (${retryCount + 1}/${this.maxRetries})`);
                    
                    // Clear expired entries and retry
                    this.clearExpired();
                    
                    // If still failing, perform aggressive eviction
                    if (retryCount >= 1) {
                        this.performAggressiveEviction();
                    }
                    
                    // Retry with delay
                    return new Promise(resolve => {
                        setTimeout(() => {
                            resolve(this.set(key, data, ttl, retryCount + 1));
                        }, 100 * Math.pow(2, retryCount)); // Exponential backoff
                    });
                } else {
                    console.error('Max retries exceeded for cache set, giving up');
                    return false;
                }
            } else if (error.name === 'SecurityError') {
                console.warn('localStorage not available (private browsing mode)');
                return false;
            } else {
                console.warn('Unexpected localStorage error:', error);
                return false;
            }
        }
    }

    // Check if cache should evict items
    shouldEvict() {
        const currentSize = this.getSize();
        return currentSize > (this.maxCacheSize * this.evictionThreshold);
    }

    // Perform standard eviction (remove expired items first)
    performEviction() {
        console.log('Performing cache eviction');
        const cleared = this.clearExpired();
        
        // If clearing expired items wasn't enough, remove oldest items
        if (this.shouldEvict()) {
            this.removeOldestItems(cleared > 0 ? cleared / 2 : 10);
        }
    }

    // Perform aggressive eviction (remove more items)
    performAggressiveEviction() {
        console.log('Performing aggressive cache eviction');
        const cleared = this.clearExpired();
        
        // Remove more items aggressively
        this.removeOldestItems(Math.max(cleared, 20));
    }

    // Remove oldest items from cache
    removeOldestItems(count) {
        try {
            const keys = Object.keys(localStorage);
            const cacheKeys = keys.filter(key => key.startsWith(this.prefix));
            
            // Sort by timestamp (oldest first)
            const itemsWithTimestamp = cacheKeys.map(key => {
                try {
                    const data = JSON.parse(localStorage.getItem(key));
                    return { key, timestamp: data?.timestamp || 0 };
                } catch {
                    return { key, timestamp: 0 };
                }
            }).sort((a, b) => a.timestamp - b.timestamp);
            
            // Remove oldest items
            let removed = 0;
            const toRemove = itemsWithTimestamp.slice(0, Math.min(count, itemsWithTimestamp.length));
            
            toRemove.forEach(item => {
                try {
                    localStorage.removeItem(item.key);
                    removed++;
                } catch (error) {
                    console.warn('Failed to remove cache item:', error);
                }
            });
            
            console.log(`Removed ${removed} oldest cache items`);
            return removed;
        } catch (error) {
            console.warn('Error during cache eviction:', error);
            return 0;
        }
    }

    // Get cache data
    get(key) {
        try {
            const cacheKey = this._generateKey(key);
            
            // Try memory cache first
            if (this.memoryCache.has(cacheKey)) {
                const memData = this.memoryCache.get(cacheKey);
                if (Date.now() - memData.timestamp < memData.ttl) {
                    return memData.data;
                }
                this.memoryCache.delete(cacheKey);
            }

            const cached = localStorage.getItem(cacheKey);
            
            if (!cached) return null;

            const cacheData = JSON.parse(cached);
            const now = Date.now();
            
            // Check if cache is expired
            if (now - cacheData.timestamp > cacheData.ttl) {
                this.remove(key);
                return null;
            }

            // Hydrate memory cache
            this.memoryCache.set(cacheKey, cacheData);

            return cacheData.data;
        } catch (error) {
            console.warn('Cache get failed:', error);
            
            // Handle localStorage errors
            if (error.name === 'SecurityError') {
                console.warn('localStorage not available (private browsing mode)');
            } else {
                console.warn('Cache corruption detected, removing entry:', key);
                this.remove(key);
            }
            return null;
        }
    }

    // Remove specific cache entry
    remove(key) {
        try {
            const cacheKey = this._generateKey(key);
            localStorage.removeItem(cacheKey);
            return true;
        } catch (error) {
            console.warn('Cache remove failed:', error);
            return false;
        }
    }

    // Clear expired cache entries
    clearExpired() {
        try {
            const keys = Object.keys(localStorage);
            let cleared = 0;
            
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    try {
                        const cacheData = JSON.parse(localStorage.getItem(key));
                        const now = Date.now();
                        
                        if (now - cacheData.timestamp > cacheData.ttl) {
                            localStorage.removeItem(key);
                            cleared++;
                        }
                    } catch (error) {
                        // Remove corrupted cache entries
                        localStorage.removeItem(key);
                        cleared++;
                    }
                }
            });

            console.log(`Cleared ${cleared} expired cache entries`);
            return cleared;
        } catch (error) {
            console.warn('Cache cleanup failed:', error);
            return 0;
        }
    }

    // Clear all cache
    clear() {
        try {
            const keys = Object.keys(localStorage);
            let cleared = 0;
            
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    localStorage.removeItem(key);
                    cleared++;
                }
            });

            console.log(`Cleared ${cleared} cache entries`);
            return cleared;
        } catch (error) {
            console.warn('Cache clear failed:', error);
            return 0;
        }
    }

    // Get cache size in bytes
    getSize() {
        try {
            let size = 0;
            const keys = Object.keys(localStorage);
            
            keys.forEach(key => {
                if (key.startsWith(this.prefix)) {
                    size += localStorage.getItem(key).length;
                }
            });

            return size;
        } catch (error) {
            console.warn('Cache size check failed:', error);
            return 0;
        }
    }

    // Cache user data with longer TTL
    cacheUserData(userData) {
        return this.set('user_data', userData, this.userCacheTTL);
    }

    // Get cached user data
    getUserData() {
        return this.get('user_data');
    }

    // Cache user role info
    cacheUserRole(roleInfo) {
        return this.set('user_role', roleInfo, this.userCacheTTL);
    }

    // Get cached user role
    getUserRole() {
        return this.get('user_role');
    }

    // Cache API response
    cacheApiResponse(endpoint, data, ttl = this.defaultTTL) {
        // Create safe cache key that prevents collisions
        const key = this._generateSafeApiKey(endpoint);
        return this.set(key, data, ttl);
    }

    // Get cached API response
    getCachedApiResponse(endpoint) {
        const key = this._generateSafeApiKey(endpoint);
        return this.get(key);
    }

    // Generate safe API cache key that prevents collisions
    _generateSafeApiKey(endpoint) {
        try {
            // Use a more robust key generation that preserves URL structure
            const normalizedEndpoint = endpoint.toLowerCase().trim();
            
            // Create a collision-resistant key using multiple factors
            const urlObj = new URL(normalizedEndpoint, window.location.origin);
            const path = urlObj.pathname;
            const search = urlObj.search;
            const hash = urlObj.hash;
            
            // Combine path, search, and hash for better uniqueness
            const keyComponents = [path, search, hash].filter(Boolean);
            const combinedKey = keyComponents.join('|');
            
            // Use a stronger hash function
            const hashValue = this._strongHash(combinedKey);
            return `api_${path.replace(/[^a-z0-9]/g, '_')}_${hashValue}`;
        } catch (error) {
            console.warn('Failed to parse URL for cache key:', error);
            // Fallback to simple hash if URL parsing fails
            const hashValue = this._strongHash(endpoint);
            return `api_fallback_${hashValue}`;
        }
    }

    // Stronger hash function for cache keys (reduces collision probability)
    _strongHash(str) {
        let hash1 = 5381;
        let hash2 = 52711;
        
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash1 = ((hash1 << 5) + hash1) ^ char;
            hash2 = ((hash2 << 5) + hash2) ^ char;
        }
        
        // Combine both hashes for better distribution
        return ((hash1 >>> 0) * 4096 + (hash2 >>> 0)).toString(36);
    }

    // Cache search results
    cacheSearchResults(query, results) {
        const key = `search_${query.toLowerCase()}`;
        return this.set(key, results, this.defaultTTL);
    }

    // Get cached search results
    getCachedSearchResults(query) {
        const key = `search_${query.toLowerCase()}`;
        return this.get(key);
    }
}

// Enhanced fetch with caching
class CachedFetch {
    constructor(cacheManager) {
        this.cache = cacheManager;
    }

    async fetch(url, options = {}) {
        const {
            cache = true,
            cacheTTL,
            method = 'GET',
            headers = {},
            ...fetchOptions
        } = options;

        // Only cache GET requests
        if (method !== 'GET' || !cache) {
            return fetch(url, { method, headers, ...fetchOptions });
        }

        // Generate cache key from URL and relevant headers
        const cacheKey = `${url}_${JSON.stringify(headers)}`;
        
        // Try to get from cache first
        const cachedResponse = this.cache.getCachedApiResponse(cacheKey);
        if (cachedResponse) {
            console.log('Cache hit for:', url);
            return new Response(JSON.stringify(cachedResponse), {
                status: 200,
                headers: { 'Content-Type': 'application/json' }
            });
        }

        // Fetch from network
        try {
            const response = await fetch(url, { method, headers, ...fetchOptions });
            
            if (response.ok) {
                const data = await response.clone().json();
                this.cache.cacheApiResponse(cacheKey, data, cacheTTL);
                console.log('Cached response for:', url);
            }

            return response;
        } catch (error) {
            console.error('Fetch failed:', error);
            throw error;
        }
    }
}

// Create global instances
const cacheManager = new CacheManager();
const cachedFetch = new CachedFetch(cacheManager);

// Make available globally
window.cacheManager = cacheManager;
window.cachedFetch = cachedFetch;

// Auto-cleanup expired cache on page load
document.addEventListener('DOMContentLoaded', () => {
    cacheManager.clearExpired();
    
    // Log cache stats
    const cacheSize = cacheManager.getSize();
    console.log(`Cache size: ${(cacheSize / 1024).toFixed(2)} KB`);
});

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        CacheManager,
        CachedFetch,
        cacheManager,
        cachedFetch
    };
}
