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
            
            if (query.length >= 2) {
                this.debounceTimer = setTimeout(() => {
                    this.fetchSuggestions(query);
                }, 300);
            } else {
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

        // Click outside to close suggestions
        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.suggestionsContainer.contains(e.target)) {
                this.hideSuggestions();
            }
        });
    }

    async fetchSuggestions(query) {
        try {
            const response = await fetch(`/api/search/suggestions?q=${encodeURIComponent(query)}`);
            if (response.ok) {
                const suggestions = await response.json();
                this.displaySuggestions(suggestions);
            }
        } catch (error) {
            console.error('Error fetching search suggestions:', error);
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
                item.innerHTML = `
                    <div class="flex items-center">
                        <i class="fas fa-search text-gray-400 mr-3 text-sm"></i>
                        <div>
                            <div class="text-white text-sm">${suggestion.title}</div>
                            <div class="text-gray-400 text-xs">${suggestion.category}</div>
                        </div>
                    </div>
                `;
                item.addEventListener('click', () => {
                    this.searchInput.value = suggestion.title;
                    this.performSearch();
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
            window.location.href = `/pages/products.html?search=${encodeURIComponent(query)}`;
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
