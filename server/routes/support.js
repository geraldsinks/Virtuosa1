const express = require('express');
const router = express.Router();
const supportController = require('../controllers/supportController');
const { authenticateToken } = require('../middleware/auth');

// Customer endpoints — authenticateToken ensures req.user is populated
router.post('/tickets', authenticateToken, supportController.upload.array('files', 5), supportController.createTicket);
router.post('/tickets/:ticketId/attachments', authenticateToken, supportController.upload.array('files', 5), supportController.uploadAttachments);

module.exports = router;
