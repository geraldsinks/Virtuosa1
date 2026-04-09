const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');

// We use lenient authentication for chat since customers might be guests
// But if they have token, frontend should send it.
const authenticateOptional = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (authHeader) {
        const token = authHeader.split(' ')[1];
        if (token) {
            try {
                const jwt = require('jsonwebtoken');
                req.user = jwt.verify(token, process.env.JWT_SECRET);
            } catch (err) {}
        }
    }
    next();
};

router.post('/start', authenticateOptional, chatController.startSession);
router.get('/:id/messages', chatController.getSessionMessages);
router.post('/:id/messages', authenticateOptional, chatController.sendMessage);
router.post('/:id/status', authenticateOptional, chatController.updateSessionStatus);

module.exports = router;
