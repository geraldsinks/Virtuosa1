// Dynamic API configuration based on environment
if (typeof window.API_BASE === 'undefined') {
    window.API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:5000/api'
        : (() => {
            // For production, use same origin as frontend for consistency
            const protocol = window.location.protocol;
            const hostname = window.location.hostname;
            // Use main domain for all API requests
            return `${protocol}//api.${hostname}/api`;
        })();
    console.log('🔌 API Base URL configured:', window.API_BASE);
}

// Fallback image URLs for consistency
if (typeof window.FALLBACK_IMAGES === 'undefined') {
    window.FALLBACK_IMAGES = {
        HERO: 'https://placehold.co/1200x600/0A1128/FFFFFF?text=Virtuosa+Campus+Life',
        TEAM_MEMBER: 'https://placehold.co/400x400/0A1128/FFFFFF?text=Team'
    };
}

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        API_BASE,
        FALLBACK_IMAGES
    };
}
