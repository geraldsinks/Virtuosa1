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
        trim: true
    },
    gender: {
        type: String,
        enum: ['male', 'female', 'other'],
        trim: true
    },
    
    // University Information
    university: {
        type: String,
        trim: true
    },
    studentEmail: {
        type: String,
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
    
    // Roles and Permissions
    role: {
        type: String,
        enum: ['user', 'seller', 'admin', 'marketing_lead', 'support_lead', 'products_lead', 'transaction_safety_lead', 'strategy_growth_lead'],
        default: 'user'
    },
    isAdmin: {
        type: Boolean,
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
        sellerRating: this.sellerRating,
        totalSales: this.totalSales,
        tokenBalance: this.tokenBalance,
        totalTokensEarned: this.totalTokensEarned,
        pushSubscriptionEnabled: this.pushSubscriptionEnabled,
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

module.exports = mongoose.model('User', userSchema);
