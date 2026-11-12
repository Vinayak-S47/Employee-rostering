// src/routes/analytics.js
const express = require('express');
const router = express.Router();
const ctrl = require('../controllers/analyticsController');
const { authenticate, authorize } = require('../middleware/auth');

router.use(authenticate);
router.get('/dashboard', ctrl.getDashboardStats);
router.get('/workload', ctrl.getWorkloadReport);
router.get('/rosters/:rosterId/export.csv', authorize('admin', 'manager'), ctrl.exportCSV);

module.exports = router;
