// src/middleware/auth.js
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendUnauthorized, sendForbidden } = require('../utils/apiResponse');
const logger = require('../utils/logger');

/**
 * Verify JWT token and attach user to request
 */
const authenticate = async (req, res, next) => {
  try {
    let token;
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }
    if (!token) {
      return sendUnauthorized(res, 'No token provided. Please log in.');
    }

    let decoded;
    try {
      decoded = jwt.verify(token, process.env.JWT_SECRET);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return sendUnauthorized(res, 'Token expired. Please log in again.');
      }
      return sendUnauthorized(res, 'Invalid token. Please log in.');
    }

    const user = await User.findById(decoded.id).select('-password -refreshToken');
    if (!user) {
      return sendUnauthorized(res, 'User no longer exists.');
    }
    if (!user.isActive) {
      return sendUnauthorized(res, 'Account is deactivated.');
    }
    if (user.changedPasswordAfter(decoded.iat)) {
      return sendUnauthorized(res, 'Password changed recently. Please log in again.');
    }

    req.user = user;
    next();
  } catch (error) {
    logger.error('Auth middleware error:', error);
    return sendUnauthorized(res, 'Authentication failed.');
  }
};

/**
 * Restrict to specific roles
 */
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) return sendUnauthorized(res);
    if (!roles.includes(req.user.role)) {
      return sendForbidden(res, `Access denied. Required role: ${roles.join(' or ')}`);
    }
    next();
  };
};

/**
 * Allow manager to access only their managed departments
 * or admin to access everything
 */
const authorizeForDepartment = (getDeptIdFn) => {
  return async (req, res, next) => {
    if (!req.user) return sendUnauthorized(res);
    if (req.user.role === 'admin') return next();
    if (req.user.role !== 'manager') return sendForbidden(res);

    const deptId = getDeptIdFn(req);
    if (!deptId) return sendForbidden(res, 'Department not specified.');

    const managedIds = (req.user.managedDepartments || []).map((id) => id.toString());
    if (!managedIds.includes(deptId.toString())) {
      return sendForbidden(res, 'You do not manage this department.');
    }
    next();
  };
};

/**
 * Allow employee to access only their own resources, or managers/admins to access all
 */
const authorizeOwnerOrManager = (getEmployeeIdFn) => {
  return (req, res, next) => {
    if (!req.user) return sendUnauthorized(res);
    if (req.user.role === 'admin' || req.user.role === 'manager') return next();
    const employeeId = getEmployeeIdFn(req);
    if (req.user._id.toString() !== employeeId.toString()) {
      return sendForbidden(res, 'Access denied. You can only access your own data.');
    }
    next();
  };
};

// Attach socket user from handshake token
const authenticateSocket = async (socket, next) => {
  try {
    const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.substring(7);
    if (!token) return next(new Error('Authentication required'));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('_id role firstName lastName');
    if (!user || !user.isActive) return next(new Error('User not found or inactive'));
    socket.user = user;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
};

module.exports = { authenticate, authorize, authorizeForDepartment, authorizeOwnerOrManager, authenticateSocket };
