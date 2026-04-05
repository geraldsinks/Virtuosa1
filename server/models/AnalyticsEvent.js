const mongoose = require('mongoose');

const analyticsEventSchema = new mongoose.Schema({
  sessionId: {
    type: String,
    required: true,
    index: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
    index: true
  },
  eventType: {
    type: String,
    enum: ['pageview', 'product_click', 'category_view', 'search', 'consent_update'],
    required: true,
    index: true
  },
  category: {
    type: String,
    enum: ['analytics', 'marketing', 'essential'],
    required: true
  },
  metadata: {
    url: String,
    path: String,
    referrer: String,
    productId: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    categoryId: mongoose.Schema.Types.Mixed,
    durationMs: Number,
    searchQuery: String,
    device: String,
    screenResolution: String,
    consentState: mongoose.Schema.Types.Mixed
  },
  ipAddress: {
    type: String,
    select: false // Only retrieved if explicitly requested for legal/security, avoid sending back loosely
  },
  userAgent: String,
  createdAt: {
    type: Date,
    default: Date.now,
    expires: 31536000 // Automatically delete event documents after 1 year (365 days)
  }
});

// Create compound index to help with aggregation queries
analyticsEventSchema.index({ eventType: 1, createdAt: -1 });
analyticsEventSchema.index({ category: 1, createdAt: -1 });

module.exports = mongoose.model('AnalyticsEvent', analyticsEventSchema);
