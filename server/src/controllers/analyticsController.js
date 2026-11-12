// src/controllers/analyticsController.js
const Assignment = require('../models/Assignment');
const Roster = require('../models/Roster');
const EmployeeProfile = require('../models/EmployeeProfile');
const Department = require('../models/Department');
const LeaveRequest = require('../models/LeaveRequest');
const OptimizationJob = require('../models/OptimizationJob');
const { sendSuccess } = require('../utils/apiResponse');

const getDashboardStats = async (req, res, next) => {
  try {
    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - now.getDay());

    const [
      totalEmployees,
      activeEmployees,
      totalDepartments,
      pendingLeave,
      upcomingShifts,
      recentJobs,
      publishedRosters,
    ] = await Promise.all([
      EmployeeProfile.countDocuments({}),
      EmployeeProfile.countDocuments({ employmentStatus: 'active' }),
      Department.countDocuments({ isActive: true }),
      LeaveRequest.countDocuments({ status: 'pending' }),
      Assignment.countDocuments({ startDatetime: { $gte: now }, status: 'scheduled' }),
      OptimizationJob.find({ status: { $in: ['completed', 'failed'] } })
        .sort({ createdAt: -1 }).limit(5)
        .populate('department', 'name')
        .populate('initiatedBy', 'firstName lastName'),
      Roster.find({ status: 'published', startDate: { $lte: now }, endDate: { $gte: now } })
        .populate('department', 'name code color').limit(5),
    ]);

    return sendSuccess(res, {
      totalEmployees,
      activeEmployees,
      totalDepartments,
      pendingLeave,
      upcomingShifts,
      recentJobs,
      publishedRosters,
    });
  } catch (error) {
    next(error);
  }
};

const getWorkloadReport = async (req, res, next) => {
  try {
    const { rosterId, departmentId, startDate, endDate } = req.query;
    const filter = {};
    if (rosterId) filter.roster = rosterId;
    if (departmentId) filter.department = departmentId;
    if (startDate) filter.startDatetime = { $gte: new Date(startDate) };
    if (endDate) filter.endDatetime = { $lte: new Date(endDate) };

    // Only employees see their own
    if (req.user.role === 'employee') filter.employee = req.user._id;

    const assignments = await Assignment.find(filter)
      .populate('employee', 'firstName lastName email')
      .populate('department', 'name code')
      .populate('shiftTemplate', 'name shiftType');

    // Aggregate per employee
    const empMap = {};
    assignments.forEach((a) => {
      const id = a.employee._id.toString();
      if (!empMap[id]) {
        empMap[id] = {
          employee: { _id: id, firstName: a.employee.firstName, lastName: a.employee.lastName, email: a.employee.email },
          totalHours: 0, overtimeHours: 0, nightShifts: 0, weekendShifts: 0, totalShifts: 0,
        };
      }
      empMap[id].totalHours   += a.durationHours || 0;
      empMap[id].overtimeHours += a.overtimeHours || 0;
      if (a.isNightShift)   empMap[id].nightShifts++;
      if (a.isWeekendShift) empMap[id].weekendShifts++;
      empMap[id].totalShifts++;
    });

    const report = Object.values(empMap).sort((a, b) => b.totalHours - a.totalHours);

    // Compute fairness metrics
    const hours = report.map((r) => r.totalHours);
    const mean = hours.reduce((s, h) => s + h, 0) / (hours.length || 1);
    const variance = hours.reduce((s, h) => s + Math.pow(h - mean, 2), 0) / (hours.length || 1);
    const nightCounts = report.map((r) => r.nightShifts);
    const nightMean = nightCounts.reduce((s, n) => s + n, 0) / (nightCounts.length || 1);
    const nightVariance = nightCounts.reduce((s, n) => s + Math.pow(n - nightMean, 2), 0) / (nightCounts.length || 1);

    return sendSuccess(res, {
      report,
      summary: {
        totalAssignments: assignments.length,
        employeeCount: report.length,
        avgHoursPerEmployee: mean.toFixed(2),
        workloadVariance: variance.toFixed(2),
        nightShiftVariance: nightVariance.toFixed(2),
      },
    });
  } catch (error) {
    next(error);
  }
};

const exportCSV = async (req, res, next) => {
  try {
    const { rosterId } = req.params;
    const assignments = await Assignment.find({ roster: rosterId })
      .populate('employee', 'firstName lastName email')
      .populate('department', 'name code')
      .populate('shiftTemplate', 'name shiftType startTime endTime')
      .sort({ startDatetime: 1 });

    const headers = ['Employee', 'Email', 'Department', 'Shift', 'Type', 'Date', 'Start', 'End', 'Hours', 'Night', 'Weekend', 'Overtime'];
    const rows = assignments.map((a) => [
      `${a.employee.firstName} ${a.employee.lastName}`,
      a.employee.email,
      a.department.name,
      a.shiftTemplate.name,
      a.shiftType,
      a.date.toISOString().split('T')[0],
      a.startDatetime.toISOString(),
      a.endDatetime.toISOString(),
      (a.durationHours || 0).toFixed(1),
      a.isNightShift ? 'Y' : 'N',
      a.isWeekendShift ? 'Y' : 'N',
      (a.overtimeHours || 0).toFixed(1),
    ]);

    const csv = [headers, ...rows].map((r) => r.map((c) => `"${c}"`).join(',')).join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="roster_${rosterId}.csv"`);
    return res.send(csv);
  } catch (error) {
    next(error);
  }
};

module.exports = { getDashboardStats, getWorkloadReport, exportCSV };
