// src/routes/leave.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/leaveController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', ctrl.getLeaveRequests);

router.post('/',
  [
    body('leaveType').notEmpty().withMessage('Leave type required'),
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
  ],
  validate,
  ctrl.createLeaveRequest
);

router.patch('/:id/review',
  authorize('admin', 'manager'),
  [
    body('status').isIn(['approved', 'rejected']).withMessage('Status must be approved or rejected'),
  ],
  validate,
  ctrl.reviewLeaveRequest
);

router.patch('/:id/cancel', ctrl.cancelLeaveRequest);

module.exports = router;
