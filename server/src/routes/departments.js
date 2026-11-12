// src/routes/departments.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ctrl = require('../controllers/departmentController');
const { authenticate, authorize } = require('../middleware/auth');
const validate = require('../middleware/validate');

router.use(authenticate);

router.get('/', ctrl.getAllDepartments);
router.get('/:id', ctrl.getDepartmentById);
router.get('/:id/staff', ctrl.getDepartmentStaff);

router.post('/',
  authorize('admin'),
  [
    body('name').notEmpty().trim().withMessage('Name required'),
    body('code').notEmpty().trim().withMessage('Code required'),
  ],
  validate,
  ctrl.createDepartment
);

router.put('/:id', authorize('admin', 'manager'), ctrl.updateDepartment);
router.patch('/:id/deactivate', authorize('admin'), ctrl.deactivateDepartment);

module.exports = router;
