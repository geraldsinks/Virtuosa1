const mongoose = require('mongoose');

const supportTicketSchema = new mongoose.Schema({
    ticketId: {
        type: String,
        required: true,
        unique: true
    },
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    customerName: String,
    customerEmail: String,
    subject: {
        type: String,
        required: true
    },
    category: {
        type: String,
        enum: ['account', 'payment', 'transaction', 'technical', 'general'],
        default: 'general'
    },
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['open', 'pending', 'resolved', 'closed'],
        default: 'open'
    },
    assignedTo: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    messages: [{
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User',
            required: true
        },
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }],
    resolutionTime: Number, // in minutes
    resolvedAt: Date
}, { timestamps: true });

// Pre-save hook to generate ticket ID
supportTicketSchema.pre('save', function(next) {
    if (!this.ticketId) {
        const prefix = this.category.substring(0, 3).toUpperCase();
        const rand = Math.floor(10000 + Math.random() * 90000);
        this.ticketId = `${prefix}-${rand}`;
    }
    next();
});

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
