// src/routes/notifications.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

router.use(authenticate);
router.get('/', ctrl.getNotifications);
router.patch('/:id/read', ctrl.markAsRead);
router.patch('/mark-all-read', ctrl.markAllAsRead);

module.exports = router;
