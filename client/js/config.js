// Dynamic API configuration based on environment
const API_BASE = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? 'http://localhost:5000/api'
    : 'https://api.virtuosazm.com/api';

// Fallback image URLs for consistency
const FALLBACK_IMAGES = {
    HERO: 'https://placehold.co/1200x600/0A1128/FFFFFF?text=Virtuosa+Campus+Life',
    TEAM_MEMBER: 'https://placehold.co/400x400/0A1128/FFFFFF?text=Team'
};

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { 
        API_BASE,
        FALLBACK_IMAGES
    };
}
