const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
    // Basic Information
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true
    },
    password: {
        type: String,
        required: true,
        minlength: 6
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    gender: {
        type: String,
        enum: ['Male', 'Female', 'Prefer not to say'],
        default: 'Prefer not to say',
        required: true
    },
    
    // University Information
    university: {
        type: String,
        required: true,
        trim: true
    },
    studentEmail: {
        type: String,
        required: true,
        lowercase: true,
        trim: true
    },
    campusLocation: {
        type: String,
        trim: true
    },
    yearOfStudy: {
        type: String,
        trim: true
    },
    faculty: {
        type: String,
        trim: true
    },
    studentId: {
        type: String,
        trim: true
    },
    bio: {
        type: String,
        trim: true
    },
    
    // Profile
    profilePicture: {
        type: String,
        trim: true
    },
    
    // Store Profile
    storeName: {
        type: String,
        trim: true
    },
    storeDescription: {
        type: String,
        trim: true
    },
    storeSlug: {
        type: String,
        unique: true,
        sparse: true
    },
    
    // Ratings
    buyerRating: {
        type: Number,
        default: 5.0,
        min: 1,
        max: 5
    },
    sellerRating: {
        type: Number,
        default: 5.0,
        min: 1,
        max: 5
    },
    totalBuyerReviews: {
        type: Number,
        default: 0
    },
    totalSellerReviews: {
        type: Number,
        default: 0
    },
    
    // Transaction Stats
    successfulTransactions: {
        type: Number,
        default: 0
    },
    totalTransactions: {
        type: Number,
        default: 0
    },
    
    // Roles and Permissions
    role: {
        type: String,
        enum: ['user', 'seller', 'admin', 'CEO', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead'],
        default: 'user'
    },
    isAdmin: {
        type: mongoose.Schema.Types.Mixed,
        default: false
    },
    isBuyer: {
        type: Boolean,
        default: true
    },
    isSeller: {
        type: Boolean,
        default: false
    },
    
    // Seller Application and Verification
    sellerApplicationStatus: {
        type: String,
        enum: ['None', 'Pending', 'Approved', 'Rejected'],
        default: 'None'
    },
    sellerVerified: {
        type: Boolean,
        default: false
    },
    sellerVerificationPaid: {
        type: Boolean,
        default: false
    },
    sellerVerificationDate: Date,
    
    // Virtuosa Pro
    isProSeller: {
        type: Boolean,
        default: false
    },
    proSubscriptionStart: Date,
    proSubscriptionEnd: Date,
    
    // Verification Status
    isEmailVerified: {
        type: Boolean,
        default: false
    },
    isStudentVerified: {
        type: Boolean,
        default: false
    },
    
    // Email Verification
    emailVerificationToken: String,
    emailVerificationExpires: Date,
    
    // Student Verification
    studentVerificationToken: String,
    studentVerificationExpires: Date,
    
    // Password Reset
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    
    // Terms and Conditions
    agreedToTerms: {
        type: Boolean,
        required: true
    },
    
    // Seller Application
    sellerApplicationStatus: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: null
    },
    
    // Seller specific fields
    sellerRating: {
        type: Number,
        default: 5.0,
        min: 0,
        max: 5
    },
    totalSales: {
        type: Number,
        default: 0
    },
    
    // Token System
    tokenBalance: {
        type: Number,
        default: 0
    },
    totalTokensEarned: {
        type: Number,
        default: 0
    },
    totalTokensRedeemed: {
        type: Number,
        default: 0
    },
    
    // Notification preferences
    pushSubscription: {
        endpoint: String,
        keys: {
            p256dh: String,
            auth: String
        }
    },
    pushSubscriptionEnabled: {
        type: Boolean,
        default: false
    }
}, {
    timestamps: true
});

// Hash password before saving
userSchema.pre('save', async function(next) {
    if (!this.isModified('password')) return next();
    
    try {
        const salt = await bcrypt.genSalt(12);
        this.password = await bcrypt.hash(this.password, salt);
        next();
    } catch (error) {
        next(error);
    }
});

// Compare password method
userSchema.methods.comparePassword = async function(candidatePassword) {
    return bcrypt.compare(candidatePassword, this.password);
};

// Get public user data
userSchema.methods.toPublicJSON = function() {
    return {
        id: this._id,
        fullName: this.fullName,
        email: this.email,
        phoneNumber: this.phoneNumber,
        gender: this.gender,
        university: this.university,
        studentEmail: this.studentEmail,
        campusLocation: this.campusLocation,
        yearOfStudy: this.yearOfStudy,
        faculty: this.faculty,
        studentId: this.studentId,
        bio: this.bio,
        profilePicture: this.profilePicture,
        role: this.role,
        isAdmin: this.isAdmin,
        isBuyer: this.isBuyer,
        isSeller: this.isSeller,
        isEmailVerified: this.isEmailVerified,
        isStudentVerified: this.isStudentVerified,
        agreedToTerms: this.agreedToTerms,
        sellerApplicationStatus: this.sellerApplicationStatus,
        sellerVerified: this.sellerVerified,
        sellerVerificationPaid: this.sellerVerificationPaid,
        sellerVerificationDate: this.sellerVerificationDate,
        isProSeller: this.isProSeller,
        proSubscriptionStart: this.proSubscriptionStart,
        proSubscriptionEnd: this.proSubscriptionEnd,
        storeName: this.storeName,
        storeDescription: this.storeDescription,
        storeSlug: this.storeSlug,
        buyerRating: this.buyerRating,
        sellerRating: this.sellerRating,
        totalBuyerReviews: this.totalBuyerReviews,
        totalSellerReviews: this.totalSellerReviews,
        successfulTransactions: this.successfulTransactions,
        totalTransactions: this.totalTransactions,
        tokenBalance: this.tokenBalance,
        totalTokensEarned: this.totalTokensEarned,
        totalTokensRedeemed: this.totalTokensRedeemed,
        pushSubscriptionEnabled: this.pushSubscriptionEnabled,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model('User', userSchema);
