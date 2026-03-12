// Marketing Data Seeding Script
const mongoose = require('mongoose');
require('dotenv').config();

// Import models from server.js (they're defined inline)
// We'll need to access them through the main server connection

async function seedMarketingData() {
    try {
        // Connect to MongoDB
        await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/virtuosa');
        console.log('Connected to MongoDB');

        // Define schemas inline for seeding
        const adSliderSchema = new mongoose.Schema({
            title: { type: String, required: true },
            subtitle: String,
            backgroundImage: { type: String, required: true },
            link: String,
            active: { type: Boolean, default: true },
            displayOrder: { type: Number, default: 0 },
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        });

        const categoryCardSchema = new mongoose.Schema({
            name: { type: String, required: true },
            title: { type: String, required: true },
            description: { type: String, required: true },
            image: { type: String, required: true },
            link: { type: String, required: true },
            cardType: { type: String, enum: ['square', 'rectangle'], required: true },
            displayOrder: { type: Number, default: 0 },
            active: { type: Boolean, default: true },
            createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now },
            updatedAt: { type: Date, default: Date.now }
        });

        const marketingAssetSchema = new mongoose.Schema({
            filename: { type: String, required: true },
            url: { type: String, required: true },
            mimetype: String,
            size: Number,
            tags: [String],
            usageCount: { type: Number, default: 0 },
            isOptimized: { type: Boolean, default: false },
            uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
            createdAt: { type: Date, default: Date.now }
        });

        const AdSlider = mongoose.model('AdSlider', adSliderSchema);
        const CategoryCard = mongoose.model('CategoryCard', categoryCardSchema);
        const MarketingAsset = mongoose.model('MarketingAsset', marketingAssetSchema);

        // Clear existing marketing data
        await AdSlider.deleteMany({});
        await CategoryCard.deleteMany({});
        await MarketingAsset.deleteMany({});
        console.log('Cleared existing marketing data');

        // Seed Ad Sliders
        const adSliders = [
            {
                title: 'Get 20% Off Electronics!',
                subtitle: 'Limited time offer on all electronics',
                backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Electronics+Sale',
                link: '/pages/products.html?category=Electronics',
                active: true,
                displayOrder: 1
            },
            {
                title: 'Sell Your Old Study Notes',
                subtitle: 'Turn your notes into cash',
                backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Study+Notes',
                link: '/pages/seller.html',
                active: true,
                displayOrder: 2
            },
            {
                title: 'Books for Every Course',
                subtitle: 'Find textbooks and study materials',
                backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Books',
                link: '/pages/products.html?category=Books',
                active: true,
                displayOrder: 3
            },
            {
                title: 'Find Your Perfect Accessories',
                subtitle: 'Fashion and tech accessories',
                backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Accessories',
                link: '/pages/products.html?category=Accessories',
                active: true,
                displayOrder: 4
            },
            {
                title: 'Limited Time Free Shipping!',
                subtitle: 'On orders over ZMW 100',
                backgroundImage: 'https://placehold.co/1200x320/0A1128/FFFFFF?text=Free+Shipping',
                link: '/pages/products.html',
                active: true,
                displayOrder: 5
            }
        ];

        const savedAdSliders = await AdSlider.insertMany(adSliders);
        console.log(`Created ${savedAdSliders.length} ad sliders`);

        // Seed Category Cards
        const categoryCards = [
            {
                name: 'Hot Deals',
                title: 'Hot Deals',
                description: 'Limited time offers and discounts',
                image: 'https://placehold.co/400x240/FF6B6B/FFFFFF?text=Hot+Deals',
                link: '/pages/products.html?category=Hot Deals',
                cardType: 'rectangle',
                active: true,
                displayOrder: 1
            },
            {
                name: 'Best Sellers',
                title: 'Best Sellers',
                description: 'Most popular items on campus',
                image: 'https://placehold.co/400x240/4ECDC4/FFFFFF?text=Best+Sellers',
                link: '/pages/products.html?category=Best Sellers',
                cardType: 'rectangle',
                active: true,
                displayOrder: 2
            },
            {
                name: 'Men\'s Clothing',
                title: 'Men\'s Clothing',
                description: 'Fashion for the modern student',
                image: 'https://placehold.co/200x180/45B7D1/FFFFFF?text=Men',
                link: '/pages/products.html?category=Men\'s Clothing',
                cardType: 'square',
                active: true,
                displayOrder: 3
            },
            {
                name: 'Women\'s Clothing',
                title: 'Women\'s Clothing',
                description: 'Trendy styles for campus life',
                image: 'https://placehold.co/200x180/F7DC6F/FFFFFF?text=Women',
                link: '/pages/products.html?category=Women\'s Clothing',
                cardType: 'square',
                active: true,
                displayOrder: 4
            },
            {
                name: 'Shoes',
                title: 'Shoes',
                description: 'Footwear for every occasion',
                image: 'https://placehold.co/200x180/52C41A/FFFFFF?text=Shoes',
                link: '/pages/products.html?category=Shoes',
                cardType: 'square',
                active: true,
                displayOrder: 5
            },
            {
                name: 'Accessories',
                title: 'Accessories',
                description: 'Complete your look',
                image: 'https://placehold.co/200x180/9B59B6/FFFFFF?text=Accessories',
                link: '/pages/products.html?category=Accessories',
                cardType: 'square',
                active: true,
                displayOrder: 6
            }
        ];

        const savedCategoryCards = await CategoryCard.insertMany(categoryCards);
        console.log(`Created ${savedCategoryCards.length} category cards`);

        // Seed Sample Marketing Assets
        const marketingAssets = [
            {
                filename: 'electronics-banner.jpg',
                url: '/uploads/marketing/electronics-banner.jpg',
                mimetype: 'image/jpeg',
                size: 245760,
                tags: ['electronics', 'banner', 'promotion'],
                usageCount: 0,
                isOptimized: true
            },
            {
                filename: 'books-promo.png',
                url: '/uploads/marketing/books-promo.png',
                mimetype: 'image/png',
                size: 184320,
                tags: ['books', 'education', 'promotion'],
                usageCount: 0,
                isOptimized: true
            }
        ];

        const savedMarketingAssets = await MarketingAsset.insertMany(marketingAssets);
        console.log(`Created ${savedMarketingAssets.length} marketing assets`);

        console.log('Marketing data seeding completed successfully!');
        
    } catch (error) {
        console.error('Error seeding marketing data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the seeding script
seedMarketingData();
