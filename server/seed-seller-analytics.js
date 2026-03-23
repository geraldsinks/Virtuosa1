// Seed Seller Analytics Data Script
const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI || 'mongodb+srv://geraldsinkamba49:PWBulG6YrbGABdw9@unitrade.borlid8.mongodb.net/unitrade?retryWrites=true&w=majority&appName=unitrade')
    .then(() => console.log('Connected to MongoDB Atlas'))
    .catch(err => console.error('MongoDB connection error:', err));

// Define schemas (simplified versions for seeding)
const userSchema = new mongoose.Schema({
    fullName: String,
    email: String,
    isSeller: { type: Boolean, default: false },
    isStudentVerified: { type: Boolean, default: false },
    tokenBalance: { type: Number, default: 0 },
    totalTokensEarned: { type: Number, default: 0 },
    totalTokensRedeemed: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const productSchema = new mongoose.Schema({
    name: String,
    description: String,
    price: Number,
    category: String,
    condition: String,
    images: [String],
    status: { type: String, enum: ['Active', 'Sold', 'Inactive'], default: 'Active' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    views: { type: Number, default: 0 },
    createdAt: { type: Date, default: Date.now }
});

const transactionSchema = new mongoose.Schema({
    buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    totalAmount: Number,
    sellerPayout: Number,
    status: { type: String, enum: ['Pending', 'Confirmed', 'Processing', 'Shipped', 'Completed', 'Cancelled'], default: 'Pending' },
    disputeStatus: { type: String, enum: ['None', 'Open', 'Resolved'], default: 'None' },
    createdAt: { type: Date, default: Date.now }
});

const reviewSchema = new mongoose.Schema({
    reviewedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    rating: { type: Number, min: 1, max: 5 },
    comment: String,
    reviewType: { type: String, enum: ['Buyer to Seller', 'Seller to Buyer'], default: 'Buyer to Seller' },
    createdAt: { type: Date, default: Date.now }
});

// Create models
const User = mongoose.model('User', userSchema);
const Product = mongoose.model('Product', productSchema);
const Transaction = mongoose.model('Transaction', transactionSchema);
const Review = mongoose.model('Review', reviewSchema);

async function seedSellerAnalyticsData() {
    try {
        console.log('Starting to seed seller analytics data...');

        // Clear existing data
        await Transaction.deleteMany({});
        await Review.deleteMany({});
        await Product.deleteMany({});
        await User.deleteMany({ email: { $regex: /seller.*test/i } });

        // Create test sellers
        const sellers = [];
        for (let i = 1; i <= 3; i++) {
            const seller = new User({
                fullName: `Test Seller ${i}`,
                email: `seller${i}@test.com`,
                isSeller: true,
                isStudentVerified: true,
                tokenBalance: Math.floor(Math.random() * 1000),
                totalTokensEarned: Math.floor(Math.random() * 5000),
                totalTokensRedeemed: Math.floor(Math.random() * 2000),
                createdAt: new Date(Date.now() - (i * 30 * 24 * 60 * 60 * 1000)) // Different start dates
            });
            await seller.save();
            sellers.push(seller);
        }

        console.log('Created test sellers');

        // Create products for each seller
        const products = [];
        const categories = ['Electronics', 'Books', 'Clothing', 'Services', 'Food'];
        
        for (const seller of sellers) {
            for (let i = 1; i <= 5; i++) {
                const product = new Product({
                    name: `Product ${i} by ${seller.fullName}`,
                    description: `Great product ${i} for sale`,
                    price: Math.floor(Math.random() * 500) + 50,
                    category: categories[Math.floor(Math.random() * categories.length)],
                    condition: 'Good',
                    images: [`https://via.placeholder.com/300x200?text=Product${i}`],
                    status: Math.random() > 0.2 ? 'Active' : 'Sold',
                    seller: seller._id,
                    views: Math.floor(Math.random() * 1000),
                    createdAt: new Date(Date.now() - Math.random() * 60 * 24 * 60 * 60 * 1000) // Random within last 60 days
                });
                await product.save();
                products.push(product);
            }
        }

        console.log('Created test products');

        // Create transactions
        const statuses = ['Completed', 'Completed', 'Completed', 'Pending', 'Confirmed', 'Shipped', 'Cancelled'];
        for (const seller of sellers) {
            const sellerProducts = products.filter(p => p.seller.toString() === seller._id.toString());
            
            for (let i = 0; i < 15; i++) {
                const randomProduct = sellerProducts[Math.floor(Math.random() * sellerProducts.length)];
                const status = statuses[Math.floor(Math.random() * statuses.length)];
                
                const transaction = new Transaction({
                    buyer: new mongoose.Types.ObjectId(), // Random buyer ID
                    seller: seller._id,
                    product: randomProduct._id,
                    totalAmount: randomProduct.price * (1 + Math.random() * 0.2), // With fees
                    sellerPayout: randomProduct.price * 0.95, // After commission
                    status: status,
                    disputeStatus: Math.random() > 0.9 ? 'Open' : 'None',
                    createdAt: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000) // Random within last 45 days
                });
                await transaction.save();
            }
        }

        console.log('Created test transactions');

        // Create reviews for sellers
        for (const seller of sellers) {
            const numReviews = Math.floor(Math.random() * 20) + 5; // 5-25 reviews per seller
            
            for (let i = 0; i < numReviews; i++) {
                const review = new Review({
                    reviewedUser: seller._id,
                    reviewer: new mongoose.Types.ObjectId(), // Random reviewer ID
                    rating: Math.floor(Math.random() * 3) + 3, // 3-5 star ratings
                    comment: `Great seller! Product was as described. Review ${i + 1}`,
                    reviewType: 'Buyer to Seller',
                    createdAt: new Date(Date.now() - Math.random() * 90 * 24 * 60 * 60 * 1000) // Random within last 90 days
                });
                await review.save();
            }
        }

        console.log('Created test reviews');

        console.log('✅ Seller analytics data seeded successfully!');
        console.log('📊 Created:');
        console.log(`   - ${sellers.length} test sellers`);
        console.log(`   - ${products.length} test products`);
        console.log(`   - ${await Transaction.countDocuments()} test transactions`);
        console.log(`   - ${await Review.countDocuments()} test reviews`);

    } catch (error) {
        console.error('❌ Error seeding seller analytics data:', error);
    } finally {
        await mongoose.disconnect();
        console.log('Disconnected from MongoDB');
    }
}

// Run the seed function
seedSellerAnalyticsData();
