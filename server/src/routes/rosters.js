// src/routes/rosters.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/rosterController');
const { authenticate, authorize } = require('../middleware/auth');
const { optimizerLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', ctrl.getRosters);
router.get('/:id', ctrl.getRosterById);
router.get('/:id/assignments', ctrl.getRosterAssignments);

router.post('/generate',
  authorize('admin', 'manager'),
  optimizerLimiter,
  [
    body('startDate').isISO8601().withMessage('Valid start date required'),
    body('endDate').isISO8601().withMessage('Valid end date required'),
  ],
  validate,
  ctrl.generateRoster
);

router.patch('/:id/publish', authorize('admin', 'manager'), ctrl.publishRoster);
router.patch('/:id/archive', authorize('admin', 'manager'), ctrl.archiveRoster);

module.exports = router;
