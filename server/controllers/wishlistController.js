const User = require('../models/User');
const Product = require('../models/Product');

/**
 * Add a product to the user's wishlist
 * POST /api/wishlist/add/:productId
 */
exports.addToWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id; // From auth middleware

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        // Check if already in wishlist
        if (user.wishlist.includes(productId)) {
            return res.status(400).json({ message: 'Product already in wishlist' });
        }

        user.wishlist.push(productId);
        await user.save();

        res.status(200).json({ 
            message: 'Product added to wishlist', 
            wishlist: user.wishlist 
        });
    } catch (error) {
        console.error('Add to wishlist error:', error);
        res.status(500).json({ message: 'Server error adding to wishlist' });
    }
};

/**
 * Remove a product from the user's wishlist
 * DELETE /api/wishlist/remove/:productId
 */
exports.removeFromWishlist = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user.id;

        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        user.wishlist = user.wishlist.filter(id => id.toString() !== productId);
        await user.save();

        res.status(200).json({ 
            message: 'Product removed from wishlist', 
            wishlist: user.wishlist 
        });
    } catch (error) {
        console.error('Remove from wishlist error:', error);
        res.status(500).json({ message: 'Server error removing from wishlist' });
    }
};

/**
 * Get the user's wishlist with populated product details
 * GET /api/wishlist
 */
exports.getWishlist = async (req, res) => {
    try {
        const userId = req.user.id;

        const user = await User.findById(userId).populate({
            path: 'wishlist',
            populate: {
                path: 'seller',
                select: 'fullName storeName storeSlug isStudentVerified profilePicture'
            }
        });

        if (!user) {
            return res.status(404).json({ message: 'User not found' });
        }

        res.status(200).json({ 
            wishlist: user.wishlist 
        });
    } catch (error) {
        console.error('Get wishlist error:', error);
        res.status(500).json({ message: 'Server error fetching wishlist' });
    }
};
