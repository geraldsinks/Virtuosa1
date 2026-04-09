const Transaction = require('../models/Transaction');
const Notification = require('../models/Notification');
const Dispute = require('../models/Dispute');

class TransactionController {
    // Get all transactions for admin
    static async getTransactions(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;
            const filters = {
                status: req.query.status || 'all',
                riskLevel: req.query.riskLevel || 'all',
                paymentMethod: req.query.paymentMethod || 'all',
                search: req.query.search || ''
            };

            const result = await Transaction.getForAdmin(page, limit, filters);
            
            res.json({
                success: true,
                data: result.transactions,
                pagination: {
                    total: result.total,
                    pages: result.pages,
                    currentPage: result.currentPage,
                    limit
                }
            });
        } catch (error) {
            console.error('Error fetching transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transactions',
                error: error.message
            });
        }
    }

    // Get transaction by ID
    static async getTransaction(req, res) {
        try {
            const { id } = req.params;
            
            const transaction = await Transaction.findById(id)
                .populate('product', 'title images description price')
                .populate('buyer', 'fullName email phone')
                .populate('seller', 'fullName email phone')
                .populate('timeline.actor', 'fullName email')
                .populate('messages.sender', 'fullName email')
                .populate('adminNotes.admin', 'fullName email');

            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            res.json({
                success: true,
                data: transaction
            });
        } catch (error) {
            console.error('Error fetching transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transaction',
                error: error.message
            });
        }
    }

    // Create new transaction
    static async createTransaction(req, res) {
        try {
            const transactionData = {
                order: req.body.orderId,
                product: req.body.productId,
                buyer: req.body.buyerId,
                seller: req.body.sellerId,
                amount: req.body.amount,
                currency: req.body.currency || 'ZMW',
                platformFee: 0, // No commission for now as per user request
                sellerAmount: req.body.amount, // Full amount to seller for now
                paymentMethod: req.body.paymentMethod,
                paymentGateway: req.body.paymentGateway,
                delivery: req.body.delivery || {},
                metadata: {
                    source: req.body.source || 'admin',
                    ipAddress: req.ip,
                    userAgent: req.get('User-Agent')
                }
            };

            const transaction = new Transaction(transactionData);
            await transaction.save();

            // Add initial timeline entry
            await transaction.addTimelineEntry(
                'transaction_created',
                req.user.id,
                'admin',
                'Transaction created by administrator',
                { source: 'admin_panel' }
            );

            // Send notifications to buyer and seller
            await Notification.create({
                recipient: req.body.buyerId,
                type: 'payment_received',
                title: 'Transaction Initiated',
                message: `A new transaction of ${req.body.amount} ${req.body.currency || 'USD'} has been initiated.`,
                data: {
                    orderId: req.body.orderId,
                    productId: req.body.productId,
                    amount: req.body.amount,
                    actionUrl: `/transactions/${transaction._id}`,
                    actionText: 'View Transaction'
                },
                priority: 'high'
            });

            await Notification.create({
                recipient: req.body.sellerId,
                type: 'new_order',
                title: 'New Transaction',
                message: `You have a new transaction of ${req.body.amount} ZMW`,
                data: {
                    orderId: req.body.orderId,
                    productId: req.body.productId,
                    amount: req.body.amount,
                    actionUrl: `/transactions/${transaction._id}`,
                    actionText: 'View Transaction'
                },
                priority: 'high'
            });

            res.status(201).json({
                success: true,
                message: 'Transaction created successfully',
                data: transaction
            });
        } catch (error) {
            console.error('Error creating transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to create transaction',
                error: error.message
            });
        }
    }

    // Update transaction status
    static async updateTransactionStatus(req, res) {
        try {
            const { id } = req.params;
            const { status, reason } = req.body;

            const transaction = await Transaction.findById(id);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            const oldStatus = transaction.status;
            transaction.status = status;

            // Add timeline entry
            await transaction.addTimelineEntry(
                'status_updated',
                req.user.id,
                'admin',
                reason || `Status changed from ${oldStatus} to ${status}`,
                { oldStatus, newStatus: status }
            );

            // Handle specific status changes
            if (status === 'completed') {
                await transaction.releaseEscrow(req.user.id, reason);
            } else if (status === 'disputed') {
                // Create dispute if not exists
                if (!transaction.dispute.filed) {
                    const dispute = await Dispute.create({
                        order: transaction.order,
                        product: transaction.product,
                        buyer: transaction.buyer,
                        seller: transaction.seller,
                        title: `Dispute for Transaction ${transaction.transactionId}`,
                        description: reason || 'Transaction disputed by administrator',
                        type: 'other',
                        severity: 'medium'
                    });

                    transaction.dispute.filed = true;
                    transaction.dispute.disputeId = dispute._id;
                    transaction.dispute.reason = reason;
                    transaction.dispute.filedAt = new Date();
                    transaction.dispute.filedBy = req.user.id;
                }
            }

            await transaction.save();

            // Send notifications based on status change
            const notificationType = this.getNotificationTypeForStatus(status);
            if (notificationType) {
                await Notification.create({
                    recipient: transaction.buyer,
                    type: notificationType,
                    title: `Transaction ${status}`,
                    message: `Your transaction ${transaction.transactionId} status has been updated to ${status}.`,
                    data: {
                        orderId: transaction.order,
                        transactionId: transaction._id,
                        actionUrl: `/transactions/${transaction._id}`,
                        actionText: 'View Transaction'
                    },
                    priority: status === 'disputed' ? 'high' : 'normal'
                });

                await Notification.create({
                    recipient: transaction.seller,
                    type: notificationType,
                    title: `Transaction ${status}`,
                    message: `Transaction ${transaction.transactionId} status has been updated to ${status}.`,
                    data: {
                        orderId: transaction.order,
                        transactionId: transaction._id,
                        actionUrl: `/transactions/${transaction._id}`,
                        actionText: 'View Transaction'
                    },
                    priority: status === 'disputed' ? 'high' : 'normal'
                });
            }

            res.json({
                success: true,
                message: 'Transaction status updated successfully',
                data: transaction
            });
        } catch (error) {
            console.error('Error updating transaction status:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to update transaction status',
                error: error.message
            });
        }
    }

    // Confirm transaction (buyer/seller confirmation)
    static async confirmTransaction(req, res) {
        try {
            const { id } = req.params;
            const { userType } = req.body; // 'buyer' or 'seller'

            const transaction = await Transaction.findById(id);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            await transaction.confirmTransaction(
                req.user.id,
                userType,
                req.ip,
                req.get('User-Agent')
            );

            res.json({
                success: true,
                message: `Transaction confirmed by ${userType}`,
                data: transaction
            });
        } catch (error) {
            console.error('Error confirming transaction:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to confirm transaction',
                error: error.message
            });
        }
    }

    // Release escrow
    static async releaseEscrow(req, res) {
        try {
            const { id } = req.params;
            const { reason } = req.body;

            const transaction = await Transaction.findById(id);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            await transaction.releaseEscrow(req.user.id, reason);

            res.json({
                success: true,
                message: 'Escrow released successfully',
                data: transaction
            });
        } catch (error) {
            console.error('Error releasing escrow:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to release escrow',
                error: error.message
            });
        }
    }

    // Add message to transaction
    static async addMessage(req, res) {
        try {
            const { id } = req.params;
            const { content, isInternal = false } = req.body;

            const transaction = await Transaction.findById(id);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            await transaction.addMessage(
                req.user.id,
                'admin',
                content,
                isInternal,
                req.body.attachments || []
            );

            res.json({
                success: true,
                message: 'Message added successfully',
                data: transaction
            });
        } catch (error) {
            console.error('Error adding message:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add message',
                error: error.message
            });
        }
    }

    // Add admin note
    static async addAdminNote(req, res) {
        try {
            const { id } = req.params;
            const { note, isInternal = true } = req.body;

            const transaction = await Transaction.findById(id);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            await transaction.addAdminNote(req.user.id, note, isInternal);

            res.json({
                success: true,
                message: 'Admin note added successfully',
                data: transaction
            });
        } catch (error) {
            console.error('Error adding admin note:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add admin note',
                error: error.message
            });
        }
    }

    // Add risk flag
    static async addRiskFlag(req, res) {
        try {
            const { id } = req.params;
            const { type, severity = 'medium', description } = req.body;

            const transaction = await Transaction.findById(id);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            await transaction.addRiskFlag(type, severity, description);

            res.json({
                success: true,
                message: 'Risk flag added successfully',
                data: transaction
            });
        } catch (error) {
            console.error('Error adding risk flag:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to add risk flag',
                error: error.message
            });
        }
    }

    // Process refund
    static async processRefund(req, res) {
        try {
            const { id } = req.params;
            const { amount, reason, processor } = req.body;

            const transaction = await Transaction.findById(id);
            if (!transaction) {
                return res.status(404).json({
                    success: false,
                    message: 'Transaction not found'
                });
            }

            transaction.refund.requested = true;
            transaction.refund.amount = amount || transaction.amount;
            transaction.refund.reason = reason;
            transaction.refund.status = 'processed';
            transaction.refund.processedAt = new Date();
            transaction.refund.processor = processor || req.user.id;
            transaction.status = 'refunded';

            await transaction.addTimelineEntry(
                'refund_processed',
                req.user.id,
                'admin',
                `Refund of ${transaction.refund.amount} processed: ${reason}`,
                { amount: transaction.refund.amount, reason }
            );

            await transaction.save();

            // Send notifications
            await Notification.create({
                recipient: transaction.buyer,
                type: 'payment_failed',
                title: 'Refund Processed',
                message: `A refund of ${transaction.refund.amount} has been processed for transaction ${transaction.transactionId}.`,
                data: {
                    orderId: transaction.order,
                    transactionId: transaction._id,
                    amount: transaction.refund.amount,
                    actionUrl: `/transactions/${transaction._id}`,
                    actionText: 'View Transaction'
                },
                priority: 'high'
            });

            await Notification.create({
                recipient: transaction.seller,
                type: 'payment_failed',
                title: 'Refund Processed',
                message: `A refund of ${transaction.refund.amount} has been processed for transaction ${transaction.transactionId}.`,
                data: {
                    orderId: transaction.order,
                    transactionId: transaction._id,
                    amount: transaction.refund.amount,
                    actionUrl: `/transactions/${transaction._id}`,
                    actionText: 'View Transaction'
                },
                priority: 'high'
            });

            res.json({
                success: true,
                message: 'Refund processed successfully',
                data: transaction
            });
        } catch (error) {
            console.error('Error processing refund:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to process refund',
                error: error.message
            });
        }
    }

    // Get transaction statistics
    static async getTransactionStats(req, res) {
        try {
            const timeframe = req.query.timeframe || '30d';
            const stats = await Transaction.getStats(timeframe);

            res.json({
                success: true,
                data: stats
            });
        } catch (error) {
            console.error('Error fetching transaction stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch transaction statistics',
                error: error.message
            });
        }
    }

    // Get high-risk transactions
    static async getHighRiskTransactions(req, res) {
        try {
            const page = parseInt(req.query.page) || 1;
            const limit = parseInt(req.query.limit) || 20;

            const query = {
                'protection.riskLevel': { $in: ['high', 'critical'] }
            };

            const transactions = await Transaction.find(query)
                .populate('buyer', 'fullName email')
                .populate('seller', 'fullName email')
                .populate('product', 'title images')
                .sort({ 'protection.riskScore': -1, createdAt: -1 })
                .skip((page - 1) * limit)
                .limit(limit);

            const total = await Transaction.countDocuments(query);

            res.json({
                success: true,
                data: transactions,
                pagination: {
                    total,
                    pages: Math.ceil(total / limit),
                    currentPage: page,
                    limit
                }
            });
        } catch (error) {
            console.error('Error fetching high-risk transactions:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch high-risk transactions',
                error: error.message
            });
        }
    }

    // Helper method to get notification type for status
    static getNotificationTypeForStatus(status) {
        const statusMap = {
            'completed': 'delivery_confirmed',
            'declined': 'payment_failed',
            'cancelled': 'payment_failed',
            'refunded': 'payment_failed',
            'disputed': 'dispute_filed',
            'shipped': 'order_shipped',
            'delivered': 'order_delivered'
        };
        return statusMap[status] || null;
    }
}

module.exports = TransactionController;
