const SupportTicket = require('../models/SupportTicket');
const cloudinary = require('cloudinary').v2;
const cloudinaryStorage = require('multer-storage-cloudinary');
const multer = require('multer');

// Configure Cloudinary storage for support attachments
const storage = cloudinaryStorage({
    cloudinary: cloudinary,
    params: {
        folder: 'support-attachments',
        allowed_formats: ['jpg', 'jpeg', 'png', 'pdf', 'doc', 'docx'],
        public_id: (req, file) => `support-${Date.now()}-${file.originalname}`
    }
});
const upload = multer({ storage });

const createTicket = async (req, res) => {
    try {
        const { subject, category, priority, message, firstName, lastName, email } = req.body;
        const userId = req.user ? req.user.userId : null;
        
        let customerId = userId;
        // If not logged in, we must require login or map to a guest user ID. Let's just enforce auth for support in e-commerce, 
        // or for Virtuosa, if not logged in, we reject.
        if (!customerId) {
            return res.status(401).json({ message: 'Must be logged in to create a support ticket' });
        }

        const newTicket = new SupportTicket({
            customer: customerId,
            customerName: `${firstName} ${lastName}`,
            customerEmail: email,
            subject,
            category: category || 'general',
            priority: priority || 'medium',
            status: 'open',
            messages: [{ sender: customerId, message }]
        });

        await newTicket.save();

        res.status(201).json({ success: true, ticket: newTicket, message: "Ticket created successfully" });
    } catch (error) {
        console.error('Create support ticket error:', error);
        res.status(500).json({ message: 'Failed to create support ticket', error: error.message });
    }
};

const uploadAttachments = async (req, res) => {
    try {
        const { ticketId } = req.params;
        const ticket = await SupportTicket.findById(ticketId);
        
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
        
        if (!req.files || req.files.length === 0) {
            return res.status(400).json({ message: 'No files uploaded' });
        }
        
        const attachUrls = req.files.map(f => f.path).join('\\n');
        ticket.messages.push({
            sender: req.user.userId,
            message: `Attached files:\\n${attachUrls}`
        });
        
        await ticket.save();
        res.json({ success: true, message: 'Attachments uploaded successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const getAdminTickets = async (req, res) => {
    try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 20;
        const query = {};
        if (req.query.status) query.status = req.query.status;
        if (req.query.priority) query.priority = req.query.priority;
        if (req.query.category) query.category = req.query.category;
        
        const tickets = await SupportTicket.find(query)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit);
            
        const total = await SupportTicket.countDocuments(query);
            
        res.json({ tickets, pagination: { totalPages: Math.ceil(total / limit) || 1, currentPage: page } });
    } catch (error) {
        res.status(500).json({ message: 'Server error', error: error.message });
    }
};

const updateTicketStatus = async (req, res) => {
    try {
        const { status, resolutionMessage } = req.body;
        const ticket = await SupportTicket.findById(req.params.id);
        
        if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
        
        ticket.status = status;
        if (status === 'resolved' || status === 'closed') {
            ticket.resolvedAt = new Date();
            const start = ticket.createdAt.getTime();
            const end = ticket.resolvedAt.getTime();
            ticket.resolutionTime = Math.round((end - start) / 60000); // minutes
        }
        
        if (resolutionMessage) {
            ticket.messages.push({
                sender: req.user.userId,
                message: resolutionMessage
            });
        }
        
        await ticket.save();
        res.json({ success: true, ticket });
    } catch (error) {
        res.status(500).json({ message: 'Server error' });
    }
};

const getStats = async (req, res) => {
    try {
        const totalTickets = await SupportTicket.countDocuments();
        const startOfDay = new Date();
        startOfDay.setHours(0,0,0,0);
        const newTickets = await SupportTicket.countDocuments({ createdAt: { $gte: startOfDay } });
        const openTickets = await SupportTicket.countDocuments({ status: { $in: ['open', 'pending'] } });
        const openPercentage = totalTickets > 0 ? Math.round((openTickets / totalTickets) * 100) : 0;
        
        const resolvedToday = await SupportTicket.countDocuments({ 
            status: 'resolved', 
            resolvedAt: { $gte: startOfDay } 
        });
        
        const resolvedPercentage = totalTickets > 0 ? Math.round(((totalTickets - openTickets) / totalTickets) * 100) : 0;
        
        const ticketsWithRes = await SupportTicket.find({ resolutionTime: { $exists: true } });
        const avgResponseTime = ticketsWithRes.length > 0 
            ? Math.round(ticketsWithRes.reduce((acc, t) => acc + t.resolutionTime, 0) / ticketsWithRes.length) 
            : 0;
            
        res.json({ totalTickets, newTickets, openTickets, openPercentage, resolvedToday, resolvedPercentage, avgResponseTime });
    } catch (error) {
        res.status(500).json({ message: 'Generate stats error', error: error.message });
    }
}

module.exports = {
    createTicket,
    uploadAttachments,
    getAdminTickets,
    updateTicketStatus,
    getStats,
    upload
};
