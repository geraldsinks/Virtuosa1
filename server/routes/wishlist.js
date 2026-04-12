const express = require('express');
const router = express.Router();
const wishlistController = require('../controllers/wishlistController');
const { authenticateToken } = require('../middleware/auth');

// Add to wishlist
router.post('/add/:productId', authenticateToken, wishlistController.addToWishlist);

// Remove from wishlist
router.delete('/remove/:productId', authenticateToken, wishlistController.removeFromWishlist);

// Get wishlist
router.get('/', authenticateToken, wishlistController.getWishlist);

module.exports = router;
