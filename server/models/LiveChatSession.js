const mongoose = require('mongoose');

const liveChatSessionSchema = new mongoose.Schema({
    customer: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    customerName: String,
    customerEmail: String,
    agent: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
    },
    agentName: String,
    priority: {
        type: String,
        enum: ['low', 'medium', 'high', 'urgent'],
        default: 'medium'
    },
    status: {
        type: String,
        enum: ['queued', 'active', 'transferred', 'ended'],
        default: 'queued'
    },
    startedAt: {
        type: Date,
        default: Date.now
    },
    endedAt: Date,
    waitTime: Number, // in seconds, from queued to active
    duration: Number, // in minutes, active session duration
    messages: [{
        senderType: {
            type: String,
            enum: ['customer', 'agent', 'system'],
            required: true
        },
        senderId: mongoose.Schema.Types.ObjectId,
        message: {
            type: String,
            required: true
        },
        timestamp: {
            type: Date,
            default: Date.now
        }
    }]
}, { timestamps: true });

liveChatSessionSchema.virtual('lastMessage').get(function() {
    if (this.messages && this.messages.length > 0) {
        return this.messages[this.messages.length - 1].message;
    }
    return '';
});

// Calculate wait time
liveChatSessionSchema.pre('save', function(next) {
    if (this.isModified('status')) {
        if (this.status === 'active' && !this.waitTime) {
            this.waitTime = Math.floor((Date.now() - this.createdAt) / 1000);
        }
    }
    next();
});

// Configure toObject to include virtuals
liveChatSessionSchema.set('toObject', { virtuals: true });
liveChatSessionSchema.set('toJSON', { virtuals: true });

module.exports = mongoose.model('LiveChatSession', liveChatSessionSchema);
