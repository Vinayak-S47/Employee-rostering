// src/controllers/leaveController.js
const LeaveRequest = require('../models/LeaveRequest');
const Assignment = require('../models/Assignment');
const Notification = require('../models/Notification');
const User = require('../models/User');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendForbidden, sendPaginated } = require('../utils/apiResponse');
const { paginate, buildPaginationMeta } = require('../utils/pagination');

const getLeaveRequests = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, employee, startDate, endDate } = req.query;
    const { skip, limit: lim, page: pg } = paginate(page, limit);

    const filter = {};
    // Employees see only their own leaves
    if (req.user.role === 'employee') {
      filter.employee = req.user._id;
    } else if (employee) {
      filter.employee = employee;
    }
    if (status) filter.status = status;
    if (startDate || endDate) {
      filter.startDate = {};
      if (startDate) filter.startDate.$gte = new Date(startDate);
      if (endDate)   filter.endDate   = { $lte: new Date(endDate) };
    }

    const [requests, total] = await Promise.all([
      LeaveRequest.find(filter)
        .populate('employee', 'firstName lastName email')
        .populate('reviewedBy', 'firstName lastName')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(lim),
      LeaveRequest.countDocuments(filter),
    ]);
    return sendPaginated(res, requests, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    next(error);
  }
};

const createLeaveRequest = async (req, res, next) => {
  try {
    const { leaveType, startDate, endDate, reason } = req.body;
    const employeeId = req.user._id;

    // Check for overlapping approved/pending leaves
    const overlap = await LeaveRequest.findOne({
      employee: employeeId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: new Date(endDate) }, endDate: { $gte: new Date(startDate) } },
      ],
    });
    if (overlap) {
      return sendError(res, 'You already have a leave request overlapping these dates.', 409);
    }

    const leave = await LeaveRequest.create({
      employee: employeeId, leaveType, startDate, endDate, reason,
    });

    // Notify managers
    const managers = await User.find({ role: { $in: ['admin', 'manager'] }, isActive: true });
    await Notification.insertMany(managers.map((m) => ({
      recipient: m._id,
      type: 'leave_request_received',
      title: 'New Leave Request',
      message: `${req.user.firstName} ${req.user.lastName} submitted a ${leaveType} leave request.`,
      relatedEntity: { entityType: 'LeaveRequest', entityId: leave._id },
      priority: 'medium',
    })));

    return sendCreated(res, leave, 'Leave request submitted');
  } catch (error) {
    next(error);
  }
};

const reviewLeaveRequest = async (req, res, next) => {
  try {
    const { status, reviewComment } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      return sendError(res, 'Status must be approved or rejected.', 400);
    }

    const leave = await LeaveRequest.findById(req.params.id).populate('employee', 'firstName lastName');
    if (!leave) return sendNotFound(res, 'Leave request');
    if (leave.status !== 'pending') {
      return sendError(res, `Leave request is already ${leave.status}.`, 409);
    }

    leave.status = status;
    leave.reviewedBy = req.user._id;
    leave.reviewedAt = new Date();
    leave.reviewComment = reviewComment;
    await leave.save();

    // Notify employee
    await Notification.create({
      recipient: leave.employee._id,
      type: status === 'approved' ? 'leave_approved' : 'leave_rejected',
      title: `Leave Request ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      message: `Your ${leave.leaveType} leave from ${leave.startDate.toDateString()} to ${leave.endDate.toDateString()} has been ${status}.${reviewComment ? ' Comment: ' + reviewComment : ''}`,
      relatedEntity: { entityType: 'LeaveRequest', entityId: leave._id },
      priority: 'high',
    });

    return sendSuccess(res, leave, `Leave request ${status}`);
  } catch (error) {
    next(error);
  }
};

const cancelLeaveRequest = async (req, res, next) => {
  try {
    const leave = await LeaveRequest.findById(req.params.id);
    if (!leave) return sendNotFound(res, 'Leave request');
    if (leave.employee.toString() !== req.user._id.toString() && req.user.role === 'employee') {
      return sendForbidden(res);
    }
    if (!['pending'].includes(leave.status)) {
      return sendError(res, 'Only pending requests can be cancelled.', 409);
    }
    leave.status = 'cancelled';
    await leave.save();
    return sendSuccess(res, leave, 'Leave request cancelled');
  } catch (error) {
    next(error);
  }
};

module.exports = { getLeaveRequests, createLeaveRequest, reviewLeaveRequest, cancelLeaveRequest };
