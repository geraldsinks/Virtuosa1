const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const AnalyticsEvent = require('../models/AnalyticsEvent');
const { protect, admin } = require('../middleware/auth');

console.log('📊 Analytics routes loaded');

/**
 * @route   GET /api/analytics/track
 * @desc    Handle incorrect GET requests to track endpoint
 * @access  Public
 */
router.get('/track', (req, res) => {
  console.log('📊 Analytics GET /track called');
  res.status(405).json({ 
    success: false, 
    message: 'Method not allowed. Use POST for analytics tracking.',
    method: 'POST',
    endpoint: '/api/analytics/track'
  });
});

/**
 * @route   POST /api/analytics/track
 * @desc    Receive batched analytics events from the client
 * @access  Public (Optional User ID)
 */
router.post('/track', async (req, res) => {
  console.log('📊 Analytics POST /track called');
  try {
    const { events } = req.body;

    if (!events || !Array.isArray(events) || events.length === 0) {
      return res.status(400).json({ success: false, message: 'No events provided' });
    }

    const ipAddress = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const userAgent = req.headers['user-agent'];

    // Map events to the schema
    const bulkOps = events.map(event => {
      // Basic validation
      if (!event.sessionId || !event.eventType || !event.category) {
        return null;
      }

      return {
        sessionId: event.sessionId,
        userId: event.userId ? new mongoose.Types.ObjectId(event.userId) : null,
        eventType: event.eventType,
        category: event.category,
        metadata: event.metadata || {},
        ipAddress,
        userAgent,
        createdAt: event.timestamp ? new Date(event.timestamp) : new Date()
      };
    }).filter(evt => evt !== null);

    if (bulkOps.length === 0) {
      return res.status(400).json({ success: false, message: 'No valid events to process' });
    }

    // Insert all events
    await AnalyticsEvent.insertMany(bulkOps);

    res.status(200).json({ success: true, count: bulkOps.length });
  } catch (error) {
    console.error('Analytics tracking error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

/**
 * @route   GET /api/analytics/admin/cookie-data
 * @desc    Get aggregated cookie harvesting data for the admin dashboard
 * @access  Private/Admin
 */
router.get('/admin/cookie-data', protect, admin, async (req, res) => {
  try {
    const timeframe = req.query.timeframe || '30d'; // 24h, 7d, 30d, all
    
    let dateFilter = {};
    if (timeframe !== 'all') {
      const now = new Date();
      let pastDate = new Date();
      if (timeframe === '24h') pastDate.setHours(now.getHours() - 24);
      else if (timeframe === '7d') pastDate.setDate(now.getDate() - 7);
      else if (timeframe === '30d') pastDate.setDate(now.getDate() - 30);
      
      dateFilter.createdAt = { $gte: pastDate };
    }

    // 1. Total Events vs Unique Sessions
    const totalEvents = await AnalyticsEvent.countDocuments(dateFilter);
    const uniqueSessionsRaw = await AnalyticsEvent.distinct('sessionId', dateFilter);
    const uniqueSessions = uniqueSessionsRaw.length;

    // 2. Events by Category (Analytics vs Marketing)
    const categoryStats = await AnalyticsEvent.aggregate([
      { $match: dateFilter },
      { $group: { _id: '$category', count: { $sum: 1 } } }
    ]);

    // 3. Top Pages (Pageviews)
    const topPages = await AnalyticsEvent.aggregate([
      { $match: { ...dateFilter, eventType: 'pageview' } },
      { $group: { _id: '$metadata.path', views: { $sum: 1 }, uniqueSessions: { $addToSet: '$sessionId' } } },
      { $project: { _id: 1, views: 1, uniqueVisitors: { $size: '$uniqueSessions' } } },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);

    // 4. Marketing Events (Product/Category Clicks)
    const topProducts = await AnalyticsEvent.aggregate([
      { $match: { ...dateFilter, eventType: 'product_click', 'metadata.productId': { $ne: null } } },
      { $group: { _id: '$metadata.productId', clicks: { $sum: 1 } } },
      { $sort: { clicks: -1 } },
      { $limit: 10 }
    ]);

    // Populate product details for top products
    await AnalyticsEvent.populate(topProducts, { path: '_id', model: 'Product', select: 'title price mainImage' });

    // 5. Consent Updates (Optional insight into user actions)
    const consentUpdates = await AnalyticsEvent.aggregate([
      { $match: { ...dateFilter, eventType: 'consent_update' } },
      { $group: { _id: '$metadata.consentState', count: { $sum: 1 } } }
    ]);
    
    // 6. Pageviews Over Time (for charts)
    // Grouping by day (simplified approach)
    const viewsOverTime = await AnalyticsEvent.aggregate([
      { $match: { ...dateFilter, eventType: 'pageview' } },
      { 
        $group: { 
          _id: { 
            year: { $year: "$createdAt" }, 
            month: { $month: "$createdAt" }, 
            day: { $dayOfMonth: "$createdAt" } 
          }, 
          views: { $sum: 1 } 
        } 
      },
      { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
    ]);

    res.status(200).json({
      success: true,
      data: {
        overview: {
          totalEvents,
          uniqueSessions
        },
        categoryStats,
        topPages,
        topProducts,
        consentUpdates,
        viewsOverTime: viewsOverTime.map(item => ({
          date: `${item._id.year}-${String(item._id.month).padStart(2, '0')}-${String(item._id.day).padStart(2, '0')}`,
          views: item.views
        }))
      }
    });

  } catch (error) {
    console.error('Admin cookie data error:', error);
    res.status(500).json({ success: false, message: 'Server Error' });
  }
});

module.exports = router;
