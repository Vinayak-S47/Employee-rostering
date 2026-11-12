// src/controllers/authController.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const Notification = require('../models/Notification');
const { sendSuccess, sendError, sendUnauthorized } = require('../utils/apiResponse');
const logger = require('../utils/logger');

const signToken = (id) =>
  jwt.sign({ id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  });

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return sendError(res, 'Email and password are required.', 400);
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() })
      .select('+password')
      .populate('department', 'name code');

    if (!user || !(await user.comparePassword(password))) {
      return sendUnauthorized(res, 'Invalid email or password.');
    }
    if (!user.isActive) {
      return sendUnauthorized(res, 'Your account has been deactivated. Contact an administrator.');
    }

    user.lastLogin = new Date();
    await user.save({ validateBeforeSave: false });

    const token = signToken(user._id);

    // Load employee profile
    const profile = await EmployeeProfile.findOne({ user: user._id })
      .populate('department', 'name code color')
      .populate('eligibleDepartments', 'name code');

    const userObj = user.toObject();
    delete userObj.password;

    logger.info(`User logged in: ${user.email} (${user.role})`);

    return sendSuccess(res, {
      token,
      user: { ...userObj, profile: profile || null },
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('department', 'name code color')
      .populate('managedDepartments', 'name code color');

    const profile = await EmployeeProfile.findOne({ user: req.user._id })
      .populate('department', 'name code color')
      .populate('eligibleDepartments', 'name code');

    const unreadCount = await Notification.countDocuments({
      recipient: req.user._id,
      isRead: false,
    });

    return sendSuccess(res, {
      user: { ...user.toObject(), profile: profile || null, unreadNotifications: unreadCount },
    });
  } catch (error) {
    next(error);
  }
};

const logout = async (req, res, next) => {
  try {
    // Stateless JWT — client discards the token. Log the event.
    logger.info(`User logged out: ${req.user.email}`);
    return sendSuccess(res, null, 'Logged out successfully.');
  } catch (error) {
    next(error);
  }
};

const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user._id).select('+password');
    if (!(await user.comparePassword(currentPassword))) {
      return sendError(res, 'Current password is incorrect.', 400);
    }
    if (newPassword.length < 6) {
      return sendError(res, 'New password must be at least 6 characters.', 400);
    }
    user.password = newPassword;
    await user.save();
    return sendSuccess(res, null, 'Password changed successfully.');
  } catch (error) {
    next(error);
  }
};

module.exports = { login, getMe, logout, changePassword };
