/**
 * Debounce Utility
 * Provides debouncing and throttling functions for performance optimization
 */

/**
 * Debounce function - delays execution until after wait time has elapsed
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @param {boolean} immediate - Whether to execute immediately on first call
 * @returns {Function} Debounced function
 */
function debounce(func, wait, immediate = false) {
    let timeout;
    
    return function executedFunction(...args) {
        const context = this; // Preserve context
        const later = () => {
            timeout = null;
            if (!immediate) func.apply(context, args);
        };
        
        const callNow = immediate && !timeout;
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
        
        if (callNow) func.apply(context, args);
    };
}

/**
 * Throttle function - limits execution to once every wait time
 * @param {Function} func - Function to throttle
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Throttled function
 */
function throttle(func, wait) {
    let inThrottle;
    
    return function executedFunction(...args) {
        if (!inThrottle) {
            func.apply(this, args);
            inThrottle = true;
            setTimeout(() => inThrottle = false, wait);
        }
    };
}

/**
 * Debounced search utility with caching
 */
class DebouncedSearch {
    constructor(options = {}) {
        this.debounceDelay = options.debounceDelay || 300;
        this.cache = options.cache || window.cacheManager;
        this.minQueryLength = options.minQueryLength || 2;
        this.maxCacheSize = options.maxCacheSize || 100;
        
        this.searchCallbacks = new Map();
    }
    
    /**
     * Create a debounced search function
     * @param {string} key - Unique key for this search instance
     * @param {Function} searchFunction - The search function to debounce
     * @param {Object} options - Additional options
     * @returns {Function} Debounced search function
     */
    createSearch(key, searchFunction, options = {}) {
        const {
            debounceDelay = this.debounceDelay,
            cacheResults = true,
            minQueryLength = this.minQueryLength
        } = options;
        
        const debouncedSearch = debounce(async (query, ...args) => {
            // Don't search for very short queries
            if (query.length < minQueryLength) {
                this.searchCallbacks.get(key)?.onEmpty?.();
                return;
            }
            
            // Try cache first
            if (cacheResults && this.cache) {
                const cachedResults = this.cache.getCachedSearchResults(query);
                if (cachedResults) {
                    console.log(`Cache hit for search: ${query}`);
                    this.searchCallbacks.get(key)?.onSuccess?.(cachedResults, query);
                    return;
                }
            }
            
            // Show loading state
            this.searchCallbacks.get(key)?.onLoading?.(query);
            
            try {
                const results = await searchFunction(query, ...args);
                
                // Cache results
                if (cacheResults && this.cache) {
                    this.cache.cacheSearchResults(query, results);
                }
                
                // Success callback
                this.searchCallbacks.get(key)?.onSuccess?.(results, query);
                
            } catch (error) {
                console.error('Search error:', error);
                this.searchCallbacks.get(key)?.onError?.(error, query);
            }
        }, debounceDelay);
        
        return debouncedSearch;
    }
    
    /**
     * Set callbacks for search events
     * @param {string} key - Search instance key
     * @param {Object} callbacks - Callback functions
     */
    setCallbacks(key, callbacks) {
        this.searchCallbacks.set(key, callbacks);
    }
    
    /**
     * Remove search instance
     * @param {string} key - Search instance key
     */
    removeSearch(key) {
        this.searchCallbacks.delete(key);
    }
    
    /**
     * Clear all search instances
     */
    clearAll() {
        this.searchCallbacks.clear();
    }
}

/**
 * Auto-complete utility with debouncing
 */
class AutoComplete {
    constructor(inputElement, options = {}) {
        this.input = inputElement;
        this.options = {
            debounceDelay: options.debounceDelay || 300,
            minQueryLength: options.minQueryLength || 2,
            maxResults: options.maxResults || 10,
            searchFunction: options.searchFunction,
            onSelect: options.onSelect,
            renderItem: options.renderItem || this.defaultRenderItem,
            onEmpty: options.onEmpty || this.defaultOnEmpty,
            onError: options.onError || this.defaultOnError,
            cacheResults: options.cacheResults !== false,
            ...options
        };
        
        this.debounceSearch = new DebouncedSearch({
            debounceDelay: this.options.debounceDelay,
            cache: window.cacheManager
        });
        
        this.suggestionsContainer = null;
        this.isVisible = false;
        this.selectedIndex = -1;
        
        this.init();
    }
    
    init() {
        // Create suggestions container
        this.createSuggestionsContainer();
        
        // Set up debounced search
        this.debounceSearch.setCallbacks('autocomplete', {
            onSuccess: (results, query) => this.showSuggestions(results, query),
            onLoading: (query) => this.showLoading(),
            onEmpty: () => this.showEmpty(),
            onError: (error, query) => this.showError(error)
        });
        
        const searchFunction = this.debounceSearch.createSearch(
            'autocomplete',
            this.options.searchFunction,
            {
                debounceDelay: this.options.debounceDelay,
                cacheResults: this.options.cacheResults,
                minQueryLength: this.options.minQueryLength
            }
        );
        
        // Input event listeners
        this.input.addEventListener('input', (e) => {
            const query = e.target.value.trim();
            searchFunction(query);
        });
        
        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });
        
        // Hide suggestions on blur
        this.input.addEventListener('blur', () => {
            setTimeout(() => this.hide(), 150); // Delay to allow click on suggestions
        });
        
        // Hide suggestions on escape
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.hide();
            }
        });
        
        // Click outside to hide
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && 
                (!this.suggestionsContainer || !this.suggestionsContainer.contains(e.target))) {
                this.hide();
            }
        });
    }
    
    createSuggestionsContainer() {
        this.suggestionsContainer = document.createElement('div');
        this.suggestionsContainer.className = 'autocomplete-suggestions hidden';
        this.suggestionsContainer.style.cssText = `
            position: absolute;
            top: 100%;
            left: 0;
            right: 0;
            background: white;
            border: 1px solid #ddd;
            border-top: none;
            max-height: 300px;
            overflow-y: auto;
            z-index: 1000;
            box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        `;
        
        // Position the container
        this.input.style.position = 'relative';
        this.input.parentNode.style.position = 'relative';
        this.input.parentNode.appendChild(this.suggestionsContainer);
    }
    
    showSuggestions(results, query) {
        const limitedResults = results.slice(0, this.options.maxResults);
        
        if (limitedResults.length === 0) {
            this.showEmpty();
            return;
        }
        
        this.suggestionsContainer.innerHTML = limitedResults
            .map((result, index) => this.options.renderItem(result, index, query))
            .join('');
        
        // Add click handlers
        this.suggestionsContainer.querySelectorAll('.autocomplete-item').forEach((item, index) => {
            item.addEventListener('click', () => {
                this.selectItem(limitedResults[index]);
            });
        });
        
        this.show();
    }
    
    showLoading() {
        this.suggestionsContainer.innerHTML = `
            <div class="autocomplete-item autocomplete-loading" style="padding: 10px; text-align: center; color: #666;">
                <i class="fas fa-spinner fa-spin"></i> Searching...
            </div>
        `;
        this.show();
    }
    
    showEmpty() {
        this.suggestionsContainer.innerHTML = `
            <div class="autocomplete-item autocomplete-empty" style="padding: 10px; text-align: center; color: #999;">
                No results found
            </div>
        `;
        this.show();
    }
    
    showError(error) {
        this.suggestionsContainer.innerHTML = `
            <div class="autocomplete-item autocomplete-error" style="padding: 10px; text-align: center; color: #d63031;">
                Error: ${error.message || 'Search failed'}
            </div>
        `;
        this.show();
    }
    
    show() {
        this.suggestionsContainer.classList.remove('hidden');
        this.isVisible = true;
        this.selectedIndex = -1;
    }
    
    hide() {
        this.suggestionsContainer.classList.add('hidden');
        this.isVisible = false;
        this.selectedIndex = -1;
    }
    
    selectItem(item) {
        this.input.value = this.getItemValue(item);
        this.hide();
        this.options.onSelect?.(item);
    }
    
    getItemValue(item) {
        // Override this method to customize how item value is extracted
        return item.name || item.title || item.text || String(item);
    }
    
    handleKeydown(e) {
        if (!this.isVisible) return;
        
        const items = this.suggestionsContainer.querySelectorAll('.autocomplete-item:not(.autocomplete-loading):not(.autocomplete-empty):not(.autocomplete-error)');
        
        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.selectedIndex = Math.min(this.selectedIndex + 1, items.length - 1);
                this.highlightItem(items[this.selectedIndex]);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                this.selectedIndex = Math.max(this.selectedIndex - 1, 0);
                this.highlightItem(items[this.selectedIndex]);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0 && items[this.selectedIndex]) {
                    items[this.selectedIndex].click();
                }
                break;
        }
    }
    
    highlightItem(item) {
        // Remove previous highlight
        this.suggestionsContainer.querySelectorAll('.autocomplete-item').forEach(i => {
            i.style.backgroundColor = '';
        });
        
        // Add highlight to selected item
        if (item) {
            item.style.backgroundColor = '#f0f0f0';
        }
    }
    
    defaultRenderItem(item, index, query) {
        const value = this.getItemValue(item);
        const highlightedValue = value.replace(
            new RegExp(query, 'gi'),
            match => `<strong>${match}</strong>`
        );
        
        return `
            <div class="autocomplete-item" style="padding: 10px; cursor: pointer; border-bottom: 1px solid #eee;">
                ${highlightedValue}
            </div>
        `;
    }
    
    defaultOnEmpty() {
        // Default empty handler
    }
    
    defaultOnError(error) {
        console.error('Autocomplete error:', error);
    }
    
    destroy() {
        this.debounceSearch.removeSearch('autocomplete');
        if (this.suggestionsContainer) {
            this.suggestionsContainer.remove();
        }
    }
}

// Make utilities globally available
window.debounce = debounce;
window.throttle = throttle;
window.DebouncedSearch = DebouncedSearch;
window.AutoComplete = AutoComplete;

// Export for module usage
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        debounce,
        throttle,
        DebouncedSearch,
        AutoComplete
    };
}
