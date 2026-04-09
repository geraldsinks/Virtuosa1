const LiveChatSession = require('../models/LiveChatSession');

const startSession = async (req, res) => {
    try {
        const { message, firstName, email } = req.body;
        const userId = req.user ? req.user.userId : null;
        
        const newSession = new LiveChatSession({
            customer: userId,
            customerName: firstName || 'Guest',
            customerEmail: email || '',
            status: 'queued',
            messages: [{
                senderType: 'customer',
                senderId: userId,
                message: message
            }]
        });

        await newSession.save();
        res.status(201).json({ success: true, session: newSession });
    } catch (error) {
        console.error('Start chat session error:', error);
        res.status(500).json({ message: 'Failed to start session', error: error.message });
    }
};

const getSessionMessages = async (req, res) => {
    try {
        const session = await LiveChatSession.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        
        // For long polling, you'd check last message ID, but for short interval we just return all messages
        res.json({ success: true, messages: session.messages, status: session.status });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching messages', error: error.message });
    }
};

const sendMessage = async (req, res) => {
    try {
        const { message, senderType } = req.body;
        const session = await LiveChatSession.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        
        session.messages.push({
            senderType, // 'customer' or 'agent'
            senderId: req.user ? req.user.userId : null,
            message
        });
        
        await session.save();
        res.json({ success: true, message: 'Sent' });
    } catch (error) {
        res.status(500).json({ message: 'Error sending message', error: error.message });
    }
};

const updateSessionStatus = async (req, res) => {
    try {
        const { status } = req.body;
        const session = await LiveChatSession.findById(req.params.id);
        if (!session) return res.status(404).json({ message: 'Session not found' });
        
        session.status = status;
        if (status === 'active' && !session.agent && req.user) {
            session.agent = req.user.userId;
            session.agentName = req.user.fullName || 'Agent';
        }
        if (status === 'ended') {
            session.endedAt = new Date();
            const start = session.startedAt.getTime();
            session.duration = Math.round((session.endedAt.getTime() - start) / 60000);
        }
        
        await session.save();
        res.json({ success: true, session });
    } catch (error) {
        res.status(500).json({ message: 'Error updating session' });
    }
};

const getStats = async (req, res) => {
    try {
        const activeChats = await LiveChatSession.countDocuments({ status: 'active' });
        const queuedChats = await LiveChatSession.countDocuments({ status: 'queued' });
        
        const oneHourAgo = new Date(Date.now() - 3600000);
        const activeChatsPrev = await LiveChatSession.countDocuments({ 
            status: 'active', createdAt: { $lte: oneHourAgo } 
        });
        const activeChatsChange = activeChatsPrev === 0 ? `+${activeChats}` : (activeChats > activeChatsPrev ? `+${activeChats - activeChatsPrev}` : `${activeChats - activeChatsPrev}`);
        
        const stats = await LiveChatSession.aggregate([
            { $match: { waitTime: { $exists: true } } },
            { $group: { _id: null, avgWait: { $avg: "$waitTime" } } }
        ]);
        const avgWaitTime = stats.length > 0 ? Math.round(stats[0].avgWait) : 0;
        
        res.json({ activeChats, activeChatsChange, queuedChats, avgWaitTime, availableAgents: 0, busyAgents: 0, avgResponseTime: 0 });
    } catch (error) {
        res.status(500).json({ message: 'Error fetching stats' });
    }
};

const getActiveSessions = async (req, res) => {
    try {
        const activeSessions = await LiveChatSession.find({ status: 'active' }).sort({ startedAt: -1 }).limit(50);
        res.json(activeSessions);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

const getSessionDetails = async (req, res) => {
    if (req.params.id === 'stats' || req.params.id === 'active' || req.params.id === 'agents') return res.status(404).end();
    try {
        const chat = await LiveChatSession.findById(req.params.id);
        if (!chat) return res.status(404).json({ error: 'Not found' });
        res.json(chat);
    } catch (err) {
        res.status(500).json({ error: 'Failed' });
    }
};

module.exports = {
    startSession,
    getSessionMessages,
    sendMessage,
    updateSessionStatus,
    getStats,
    getActiveSessions,
    getSessionDetails
};
