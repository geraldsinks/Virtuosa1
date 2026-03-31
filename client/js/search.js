// Search functionality for Virtuosa platform
class SearchManager {
    constructor() {
        this.searchInput = null;
        this.searchButton = null;
        this.suggestionsContainer = null;
        this.debounceTimer = null;
        this.init();
    }

    init() {
        // Initialize search elements if they exist
        this.searchInput = document.getElementById('home-search-input') || document.getElementById('mobile-search-input');
        this.searchButton = document.getElementById('home-search-button') || document.getElementById('mobile-search-button');
        this.suggestionsContainer = document.getElementById('home-search-suggestions') || document.getElementById('mobile-search-suggestions');

        if (this.searchInput && this.searchButton) {
            this.setupEventListeners();
        }
    }

    setupEventListeners() {
        // Search input events
        this.searchInput.addEventListener('input', (e) => {
            clearTimeout(this.debounceTimer);
            const query = e.target.value.trim();
            console.log('🔍 Search input changed:', query);
            
            if (query.length >= 2) {
                this.debounceTimer = setTimeout(() => {
                    console.log('⏰ Fetching suggestions for:', query);
                    this.fetchSuggestions(query);
                }, 300);
            } else {
                console.log('❌ Query too short, hiding suggestions');
                this.hideSuggestions();
            }
        });

        // Search button click
        this.searchButton.addEventListener('click', () => {
            this.performSearch();
        });

        // Enter key in search input
        this.searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                this.performSearch();
            }
        });

        // Click outside to close suggestions - but prevent closing when clicking inside
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });

        // Prevent suggestions from hiding when clicking inside
        this.suggestionsContainer.addEventListener('click', (e) => {
            e.stopPropagation();
        });
    }

    async fetchSuggestions(query) {
        try {
            const response = await fetch(`${API_BASE}/search/suggestions?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const suggestions = await response.json();
                console.log('Search suggestions received:', suggestions);
                this.displaySuggestions(suggestions);
            } else {
                console.error('Search suggestions failed:', response.status);
                this.displaySuggestions([]);
            }
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
            this.displaySuggestions([]);
        }
    }

    displaySuggestions(suggestions) {
        if (!this.suggestionsContainer) return;

        this.suggestionsContainer.innerHTML = '';
        
        if (suggestions.length === 0) {
            this.suggestionsContainer.innerHTML = `
                <div class="px-4 py-3 text-gray-400 text-sm">
                    No suggestions found
                </div>
            `;
        } else {
            suggestions.forEach(suggestion => {
                const item = document.createElement('div');
                item.className = 'px-4 py-3 hover:bg-gray-800 cursor-pointer transition-colors';
                
                // Handle image URL with server base URL
                const imageUrl = suggestion.image ? 
                    (suggestion.image.startsWith('/') ? `${API_BASE.replace('/api', '')}${suggestion.image}` : suggestion.image) : 
                    'https://placehold.co/40x40/cccccc/666666?text=No+Image';
                
                item.innerHTML = `
                    <div class="flex items-center space-x-3">
                        ${suggestion.image ? `
                            <img src="${imageUrl}" alt="${suggestion.title}" class="w-10 h-10 object-cover rounded-lg" 
                                 onerror="this.src='https://placehold.co/40x40/cccccc/666666?text=No+Image'">
                        ` : `
                            <div class="w-10 h-10 bg-gray-600 rounded-lg flex items-center justify-center">
                                <i class="fas fa-box text-gray-400 text-sm"></i>
                            </div>
                        `}
                        <div class="flex-1">
                            <div class="text-white text-sm font-medium">${suggestion.title}</div>
                            <div class="text-gray-400 text-xs">${suggestion.category}</div>
                        </div>
                        <div class="text-gold text-sm font-bold">K${suggestion.price ? suggestion.price.toLocaleString() : '0'}</div>
                    </div>
                `;
                
                item.addEventListener('click', () => {
                    // Redirect directly to product detail page using clean URL
                    window.location.href = `/product/${suggestion.id}`;
                    this.hideSuggestions();
                });
                this.suggestionsContainer.appendChild(item);
            });
        }

        this.suggestionsContainer.classList.remove('hidden');
    }

    hideSuggestions() {
        if (this.suggestionsContainer) {
            this.suggestionsContainer.classList.add('hidden');
        }
    }

    performSearch() {
        const query = this.searchInput.value.trim();
        if (query) {
            // Redirect to products page with search query
            window.location.href = `/products?q=${encodeURIComponent(query)}`;
        }
    }
}

// Initialize search when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    new SearchManager();
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SearchManager;
}
