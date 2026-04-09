const mongoose = require('mongoose');

const sellerApplicationSchema = new mongoose.Schema({
    user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    sellerType: {
        type: String,
        enum: ['Student', 'CampusBusiness', 'ExternalVendor', 'Cooperative'],
        required: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected'],
        default: 'Pending'
    },
    personalInfo: {
        fullName: { type: String, required: true },
        studentId: String,
        university: { type: String, required: true },
        nrcNumber: String,
        phoneNumber: { type: String, required: true },
        email: { type: String, required: true },
        yearOfStudy: String,
        program: String
    },
    campusLocation: {
        campus: { type: String, required: true },
        building: String,
        roomNumber: String,
        physicalAccess: { type: Boolean, default: false },
        pickupLocation: String,
        canDeliver: { type: Boolean, default: false },
        deliveryRadius: Number
    },
    sellingInfo: {
        categories: [String],
        otherCategory: String,
        sellingExperience: {
            type: String,
            enum: ['first_time', 'sold_casually', 'existing_business'],
            required: true
        },
        currentSaleChannels: [String],
        storeName: { type: String, required: true },
        storeDescription: String
    },
    inventorySource: {
        sources: [String],
        otherSource: String,
        plannedItemCount: String
    },
    paymentPreferences: {
        methods: [String],
        understandsCommission: { type: Boolean, default: false }
    },
    deliveryArrangements: {
        methods: [String],
        meetupLocation: String
    },
    verification: {
        documents: [String],
        willingToOrient: { type: Boolean, default: false }
    },
    agreements: {
        enrolledConfirm: { type: Boolean, required: true },
        noProhibitedItems: { type: Boolean, required: true },
        noScamming: { type: Boolean, required: true },
        respectCommitment: { type: Boolean, required: true },
        accurateDescriptions: { type: Boolean, required: true }
    },
    additionalContext: {
        challenges: String,
        trustFactors: String,
        referralName: String
    },
    submittedAt: {
        type: Date,
        default: Date.now
    },
    reviewedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    reviewedAt: Date,
    adminReviewNotes: String,
    rejectionReason: String
}, {
    timestamps: true
});

// Indexes for common queries
sellerApplicationSchema.index({ user: 1, status: 1 });
sellerApplicationSchema.index({ status: 1, submittedAt: -1 });
sellerApplicationSchema.index({ 'personalInfo.university': 1 });

const SellerApplication = mongoose.model('SellerApplication', sellerApplicationSchema);

module.exports = SellerApplication;
