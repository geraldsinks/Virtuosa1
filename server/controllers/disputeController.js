const Dispute = require('../models/Dispute');
const DisputeResolution = require('../models/DisputeResolution');
const Transaction = require('../models/Transaction');
const Product = require('../models/Product');
const Notification = require('../models/Notification');
const User = require('../models/User');
const multer = require('multer');
const cloudinary = require('cloudinary').v2;
const cloudinaryStorage = require('multer-storage-cloudinary');

// Configure Cloudinary storage for dispute evidence
const storage = cloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'dispute-evidence',
        allowed_formats: ['jpg', 'jpeg', 'png', 'gif', 'pdf', 'doc', 'docx'],
        public_id: (req, file) => `dispute-${Date.now()}-${file.originalname}`
    }
});

const upload = multer({ storage });

// Buyer files a new dispute
const fileDispute = async (req, res) => {
    try {
        const { orderId, type, severity, title, description, buyerResolution, buyerRefundAmount, buyerExplanation } = req.body;
        const userId = req.user.userId;
        
        // Validate order exists and user is the buyer
        const order = await Transaction.findById(orderId).populate('product buyer seller');
        if (!order) {
            return res.status(404).json({ message: 'Order not found' });
        }
        
        if (order.buyer._id.toString() !== userId) {
            return res.status(403).json({ message: 'You can only file disputes for your own orders' });
        }
        
        // Check if dispute already exists for this order
        const existingDispute = await Dispute.findOne({ order: orderId, status: { $nin: ['closed', 'withdrawn', 'resolved'] } });
        if (existingDispute) {
            return res.status(400).json({ message: 'A dispute is already open for this order' });
        }
        
        // Create dispute
        const dispute = new Dispute({
            order: orderId,
            product: order.product._id,
            buyer: userId,
            seller: order.seller._id,
            type,
            severity,
            title,
            description,
            buyerResolution,
            buyerRefundAmount,
            buyerExplanation
        });
        
        // Add initial timeline entry
        dispute.timeline.push({
            action: 'dispute_filed',
            actor: userId,
            actorType: 'buyer',
            message: `Dispute filed: ${title}`
        });
        
        await dispute.save();
        
        // Populate for response
        await dispute.populate([
            { path: 'order', select: 'transactionId totalAmount' },
            { path: 'product', select: 'title images' },
            { path: 'buyer', select: 'fullName email' },
            { path: 'seller', select: 'fullName email' }
        ]);
        
        // Send notifications
        await Notification.create({
            recipient: order.seller._id,
            type: 'dispute_filed',
            title: 'New Dispute Filed',
            message: `A dispute has been filed for transaction #${order.transactionId}`,
            data: {
                orderId: orderId,
                disputeId: dispute._id,
                actionUrl: `/disputes/${dispute._id}`,
                actionText: 'View Dispute'
            },
            priority: 'high'
        });
        
        // Notify admins if high severity
        if (severity === 'high' || severity === 'critical') {
            // Find admin users (you'd need to implement this logic)
            const adminUsers = await User.find({ role: 'admin' });
            for (const admin of adminUsers) {
                await Notification.create({
                    recipient: admin._id,
                    type: 'dispute_escalated',
                    title: 'High Priority Dispute',
                    message: `High severity dispute filed: ${title}`,
                    data: {
                        disputeId: dispute._id,
                        actionUrl: `/admin/disputes/${dispute._id}`,
                        actionText: 'Review Dispute'
                    },
                    priority: 'critical'
                });
            }
        }
        
        res.status(201).json({
            message: 'Dispute filed successfully',
            dispute
        });
        
    } catch (error) {
        console.error('File dispute error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Upload evidence for dispute
const uploadEvidence = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const userId = req.user.userId;
        const { description } = req.body;
        
        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found' });
        }
        
        // Check if user can participate
        const userRole = req.user.role || (dispute.buyer.toString() === userId ? 'buyer' : 'seller');
        if (!dispute.canParticipate(userId, userRole)) {
            return res.status(403).json({ message: 'You cannot participate in this dispute' });
        }
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        // Add evidence to dispute
        const evidenceFiles = req.files.map(file => ({
            type: file.mimetype.startsWith('image/') ? 'image' : 'document',
            url: file.path,
            filename: file.originalname,
            uploadedBy: userId,
            description: description || `Evidence uploaded by ${userRole}`
        }));
        
        dispute.evidence.push(...evidenceFiles);
        
        // Add timeline entry
        await dispute.addTimelineEntry(
            'evidence_uploaded',
            userId,
            userRole,
            `Uploaded ${evidenceFiles.length} evidence file(s)`
        );
        
        await dispute.save();
        
        res.json({
            message: 'Evidence uploaded successfully',
            evidence: evidenceFiles
        });
        
    } catch (error) {
        console.error('Upload evidence error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get dispute details
const getDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const userId = req.user.userId;
        
        const dispute = await Dispute.findById(disputeId)
            .populate('order', 'transactionId totalAmount status')
            .populate('product', 'title images description')
            .populate('buyer', 'fullName email')
            .populate('seller', 'fullName email')
            .populate('assignedAdmin', 'fullName email')
            .populate('timeline.actor', 'fullName email')
            .populate('messages.sender', 'fullName email');
            
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found' });
        }
        
        // Check if user can participate
        const userRole = req.user.role || (dispute.buyer._id.toString() === userId ? 'buyer' : 'seller');
        if (!dispute.canParticipate(userId, userRole)) {
            return res.status(403).json({ message: 'You cannot view this dispute' });
        }
        
        // Filter private messages for non-admin users
        if (userRole !== 'admin') {
            dispute.messages = dispute.messages.filter(msg => !msg.isPrivate);
        }
        
        res.json(dispute);
        
    } catch (error) {
        console.error('Get dispute error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get user's disputes
const getUserDisputes = async (req, res) => {
    try {
        const userId = req.user.userId;
        const { role = 'all', page = 1, limit = 20, status = 'all' } = req.query;
        
        const result = await Dispute.getByUser(userId, role, parseInt(page), parseInt(limit), status);
        
        res.json(result);
        
    } catch (error) {
        console.error('Get user disputes error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Add message to dispute
const addMessage = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { content, isPrivate = false } = req.body;
        const userId = req.user.userId;
        
        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found' });
        }
        
        // Check if user can participate
        const userRole = req.user.role || (dispute.buyer.toString() === userId ? 'buyer' : 'seller');
        if (!dispute.canParticipate(userId, userRole)) {
            return res.status(403).json({ message: 'You cannot participate in this dispute' });
        }
        
        // Add message
        await dispute.addMessage(userId, userRole, content, isPrivate);
        
        // Notify other party (for non-private messages)
        if (!isPrivate) {
            const otherPartyId = userRole === 'buyer' ? dispute.seller : dispute.buyer;
            await Notification.create({
                recipient: otherPartyId,
                type: 'dispute_message',
                title: 'New Dispute Message',
                message: `New message in dispute: ${dispute.title}`,
                data: {
                    disputeId: dispute._id,
                    actionUrl: `/disputes/${dispute._id}`,
                    actionText: 'View Message'
                },
                priority: 'normal'
            });
        }
        
        res.json({ message: 'Message added successfully' });
        
    } catch (error) {
        console.error('Add message error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Seller responds to dispute
const sellerRespond = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { response, offerType, offerAmount, offerExplanation } = req.body;
        const userId = req.user.userId;
        
        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found' });
        }
        
        if (dispute.seller.toString() !== userId) {
            return res.status(403).json({ message: 'Only the seller can respond' });
        }
        
        if (dispute.status !== 'pending') {
            return res.status(400).json({ message: 'Dispute is not in pending status' });
        }
        
        // Update dispute status
        await dispute.updateStatus('seller_response', userId, 'seller', response);
        
        // Add seller response to timeline
        dispute.timeline.push({
            action: 'seller_response',
            actor: userId,
            actorType: 'seller',
            message: response,
            timestamp: new Date()
        });
        
        // Store seller's offer
        if (offerType && offerAmount) {
            dispute.sellerOffer = {
                type: offerType,
                amount: offerAmount,
                explanation: offerExplanation
            };
        }
        
        await dispute.save();
        
        // Notify buyer
        await Notification.create({
            recipient: dispute.buyer,
            type: 'dispute_response',
            title: 'Seller Responded to Dispute',
            message: `The seller has responded to your dispute: ${dispute.title}`,
            data: {
                disputeId: dispute._id,
                actionUrl: `/disputes/${dispute._id}`,
                actionText: 'View Response'
            },
            priority: 'high'
        });
        
        res.json({ message: 'Response submitted successfully' });
        
    } catch (error) {
        console.error('Seller respond error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Admin functions
const getAdminDisputes = async (req, res) => {
    try {
        const { page = 1, limit = 20, status = 'all', priority = 'all', severity = 'all', type = 'all' } = req.query;
        
        const filters = { status, priority, severity, type };
        const result = await Dispute.getForAdmin(null, parseInt(page), parseInt(limit), filters);
        
        res.json(result);
        
    } catch (error) {
        console.error('Get admin disputes error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Assign dispute to admin
const assignDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { adminId } = req.body;
        const userId = req.user.userId;
        
        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found' });
        }
        
        await dispute.assignToAdmin(adminId);
        
        res.json({ message: 'Dispute assigned successfully' });
        
    } catch (error) {
        console.error('Assign dispute error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Resolve dispute
const resolveDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { 
            resolutionType, 
            refundAmount, 
            refundMethod,
            compensationAmount,
            compensationType,
            summary, 
            reasoning,
            actions,
            returnRequired,
            returnInstructions
        } = req.body;
        const userId = req.user.userId;
        
        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found' });
        }
        
        // Create resolution
        const resolution = new DisputeResolution({
            dispute: disputeId,
            resolutionType,
            refundAmount,
            refundMethod,
            compensationAmount,
            compensationType,
            summary,
            reasoning,
            actions,
            returnRequired,
            returnInstructions,
            resolvedBy: userId,
            resolvedByRole: 'admin'
        });
        
        // Add implementation steps based on actions
        if (actions.includes('refund_buyer')) {
            resolution.implementation.steps.push({
                action: 'Process refund to buyer'
            });
        }
        if (actions.includes('charge_seller')) {
            resolution.implementation.steps.push({
                action: 'Charge seller account'
            });
        }
        if (actions.includes('issue_store_credit')) {
            resolution.implementation.steps.push({
                action: 'Issue store credit'
            });
        }
        
        await resolution.save();
        
        // Update dispute
        dispute.resolution = resolution._id;
        await dispute.updateStatus('resolved', userId, 'admin', summary);
        
        // Notify both parties
        await Notification.create([
            {
                recipient: dispute.buyer,
                type: 'dispute_resolved',
                title: 'Dispute Resolved',
                message: `Your dispute has been resolved: ${dispute.title}`,
                data: {
                    disputeId: dispute._id,
                    resolutionId: resolution._id,
                    actionUrl: `/disputes/${dispute._id}`,
                    actionText: 'View Resolution'
                },
                priority: 'high'
            },
            {
                recipient: dispute.seller,
                type: 'dispute_resolved',
                title: 'Dispute Resolved',
                message: `A dispute has been resolved: ${dispute.title}`,
                data: {
                    disputeId: dispute._id,
                    resolutionId: resolution._id,
                    actionUrl: `/disputes/${dispute._id}`,
                    actionText: 'View Resolution'
                },
                priority: 'high'
            }
        ]);
        
        res.json({
            message: 'Dispute resolved successfully',
            resolution
        });
        
    } catch (error) {
        console.error('Resolve dispute error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Get dispute statistics
const getDisputeStats = async (req, res) => {
    try {
        const { timeframe = '30d' } = req.query;
        
        const stats = await Dispute.getStats(timeframe);
        const appealStats = await DisputeResolution.getAppealStats(timeframe);
        
        res.json({
            disputeStats: stats,
            appealStats
        });
        
    } catch (error) {
        console.error('Get dispute stats error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

// Withdraw dispute
const withdrawDispute = async (req, res) => {
    try {
        const { disputeId } = req.params;
        const { reason } = req.body;
        const userId = req.user.id;
        
        const dispute = await Dispute.findById(disputeId);
        if (!dispute) {
            return res.status(404).json({ message: 'Dispute not found' });
        }
        
        if (dispute.buyer.toString() !== userId) {
            return res.status(403).json({ message: 'Only the buyer can withdraw the dispute' });
        }
        
        if (['resolved', 'closed', 'withdrawn'].includes(dispute.status)) {
            return res.status(400).json({ message: 'Cannot withdraw dispute in current status' });
        }
        
        await dispute.updateStatus('withdrawn', userId, 'buyer', reason);
        
        // Notify seller
        await Notification.create({
            recipient: dispute.seller,
            type: 'dispute_withdrawn',
            title: 'Dispute Withdrawn',
            message: `The buyer has withdrawn the dispute: ${dispute.title}`,
            data: {
                disputeId: dispute._id
            },
            priority: 'normal'
        });
        
        res.json({ message: 'Dispute withdrawn successfully' });
        
    } catch (error) {
        console.error('Withdraw dispute error:', error);
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

module.exports = {
    fileDispute,
    uploadEvidence,
    getDispute,
    getUserDisputes,
    addMessage,
    sellerRespond,
    getAdminDisputes,
    assignDispute,
    resolveDispute,
    getDisputeStats,
    withdrawDispute,
    upload
};
