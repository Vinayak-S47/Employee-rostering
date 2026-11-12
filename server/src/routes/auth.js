// src/routes/auth.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const { login, getMe, logout, changePassword } = require('../controllers/authController');
const { authenticate } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const validate = require('../middleware/validate');

router.post('/login',
  authLimiter,
  [
    body('email').isEmail().normalizeEmail().withMessage('Valid email required'),
    body('password').notEmpty().withMessage('Password required'),
  ],
  validate,
  login
);

router.get('/me', authenticate, getMe);
router.post('/logout', authenticate, logout);
router.patch('/change-password',
  authenticate,
  [
    body('currentPassword').notEmpty().withMessage('Current password required'),
    body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters'),
  ],
  validate,
  changePassword
);

module.exports = router;
