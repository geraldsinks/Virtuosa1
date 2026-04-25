const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
    name: { type: String, required: true },
    description: { type: String, required: true },
    price: { type: Number, required: true },
    originalPrice: Number,
    condition: { type: String, enum: ['New', 'Like New', 'Good', 'Fair'], required: true },
    images: [String],
    category: { type: String, required: true },
    subcategory: String,

    // Listing Type and Inventory Management
    listingType: { 
        type: String, 
        enum: ['one_time', 'persistent'], 
        required: true,
        default: 'one_time'
    },
    inventory: { 
        type: Number, 
        default: 1,
        min: 0
    },
    inventoryTracking: { 
        type: Boolean, 
        default: false 
    },
    lowStockThreshold: { 
        type: Number, 
        default: 1 
    },

    // Seller information
    seller: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    sellerName: { type: String, required: true },
    sellerEmail: { type: String, required: true },
    sellerPhone: { type: String, required: true },
    sellerRating: { type: Number, default: 5.0 },

    // Location and delivery
    campusLocation: { type: String, required: true },
    deliveryOptions: [{
        type: { type: String },
        price: Number,
        description: String
    }],

    // Product status
    status: { type: String, enum: ['Active', 'Sold', 'Reserved', 'Removed', 'Out of Stock', 'Suspended'], default: 'Active' },
    isFeatured: { type: Boolean, default: false },
    viewCount: { type: Number, default: 0 },
    favoriteCount: { type: Number, default: 0 },

    // Sales tracking
    totalSold: { type: Number, default: 0 },
    salesHistory: [{
        buyer: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
        quantity: Number,
        price: Number,
        soldAt: { type: Date, default: Date.now }
    }],

    // Academic specific
    courseCode: String,
    courseName: String,
    semester: String,
    subject: String,
    author: String,
    isbn: String,

    // Micro Loan specific
    loanPlans: [{
        interestRate: { type: Number, required: true },
        repaymentPeriod: { type: String, required: true },
        description: String
    }],
    loanEligibility: String,
    collateralRequired: String,

    // Timestamps
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now },
    soldAt: Date,
    lastSoldAt: Date
});

// Indexes for better performance
productSchema.index({ seller: 1, status: 1, createdAt: -1 });
productSchema.index({ category: 1, status: 1 });
productSchema.index({ campusLocation: 1, status: 1 });
productSchema.index({ name: 'text', description: 'text' });
productSchema.index({ courseCode: 'text', courseName: 'text' });
productSchema.index({ sellerName: 1 }); // Unique index for seller name

const Product = mongoose.model('Product', productSchema);
module.exports = Product;
