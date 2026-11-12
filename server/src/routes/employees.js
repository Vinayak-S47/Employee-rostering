// src/routes/employees.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/employeeController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', authorize('admin', 'manager'), ctrl.getAllEmployees);
router.get('/:id', ctrl.getEmployeeById);

router.post('/',
  authorize('admin'),
  [
    body('firstName').notEmpty().trim().withMessage('First name required'),
    body('lastName').notEmpty().trim().withMessage('Last name required'),
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('jobCategory').notEmpty().withMessage('Job category required'),
    body('department').notEmpty().withMessage('Department required'),
  ],
  validate,
  ctrl.createEmployee
);

router.put('/:id', authorize('admin', 'manager'), ctrl.updateEmployee);
router.patch('/:id/deactivate', authorize('admin'), ctrl.deactivateEmployee);

module.exports = router;
