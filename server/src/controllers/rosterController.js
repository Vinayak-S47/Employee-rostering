// src/controllers/rosterController.js
const Roster = require('../models/Roster');
const Assignment = require('../models/Assignment');
const OptimizationJob = require('../models/OptimizationJob');
const Notification = require('../models/Notification');
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const Department = require('../models/Department');
const ShiftTemplate = require('../models/ShiftTemplate');
const ShiftRequirement = require('../models/ShiftRequirement');
const LeaveRequest = require('../models/LeaveRequest');
const Availability = require('../models/Availability');
const SchedulingRule = require('../models/SchedulingRule');
const axios = require('axios');
const mongoose = require('mongoose');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { paginate, buildPaginationMeta } = require('../utils/pagination');
const logger = require('../utils/logger');

const getRosters = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, department, status, startDate, endDate } = req.query;
    const { skip, limit: lim, page: pg } = paginate(page, limit);
    const filter = {};
    if (department) filter.department = department;
    if (status) filter.status = status;
    if (startDate) filter.startDate = { $gte: new Date(startDate) };
    if (endDate) filter.endDate = { $lte: new Date(endDate) };

    const [rosters, total] = await Promise.all([
      Roster.find(filter)
        .populate('department', 'name code color')
        .populate('generatedBy', 'firstName lastName')
        .populate('publishedBy', 'firstName lastName')
        .sort({ startDate: -1 })
        .skip(skip)
        .limit(lim),
      Roster.countDocuments(filter),
    ]);
    return sendPaginated(res, rosters, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    next(error);
  }
};

const getRosterById = async (req, res, next) => {
  try {
    const roster = await Roster.findById(req.params.id)
      .populate('department', 'name code color')
      .populate('generatedBy', 'firstName lastName')
      .populate('publishedBy', 'firstName lastName')
      .populate('optimizationJob');
    if (!roster) return sendNotFound(res, 'Roster');

    const assignments = await Assignment.find({ roster: roster._id })
      .populate('employee', 'firstName lastName email')
      .populate('department', 'name code color')
      .populate('shiftTemplate', 'name code shiftType startTime endTime color')
      .sort({ startDatetime: 1 });

    return sendSuccess(res, { roster, assignments });
  } catch (error) {
    next(error);
  }
};

const generateRoster = async (req, res, next) => {
  try {
    const { departmentId, startDate, endDate, timeLimitSeconds = 60, name } = req.body;

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (end <= start) return sendError(res, 'End date must be after start date.', 400);

    // Load all needed data
    const deptFilter = departmentId ? { _id: departmentId } : { isActive: true };
    const departments = await Department.find(deptFilter);
    if (departments.length === 0) return sendNotFound(res, 'Department');

    const deptIds = departments.map((d) => d._id);

    // Load active employees in these departments
    const profiles = await EmployeeProfile.find({
      $or: [
        { department: { $in: deptIds } },
        { eligibleDepartments: { $in: deptIds } },
      ],
      employmentStatus: 'active',
    }).populate('user', 'firstName lastName email isActive');

    const activeProfiles = profiles.filter((p) => p.user && p.user.isActive);

    // Load approved leave for the period
    const leaveList = await LeaveRequest.find({
      employee: { $in: activeProfiles.map((p) => p.user._id) },
      status: 'approved',
      startDate: { $lte: end },
      endDate: { $gte: start },
    });

    // Load shift templates for departments
    const shiftTemplates = await ShiftTemplate.find({
      $or: [{ department: { $in: deptIds } }, { department: null }],
      isActive: true,
    });

    // Load shift requirements
    const requirements = await ShiftRequirement.find({
      department: { $in: deptIds },
      isActive: true,
    }).populate('shiftTemplate');

    // Load scheduling rules
    const rules = await SchedulingRule.find({ isActive: true });
    const rulesMap = {};
    rules.forEach((r) => { rulesMap[r.ruleKey] = r.value; });

    // Load historical stats for fairness
    const historicalStats = {};
    activeProfiles.forEach((p) => {
      historicalStats[p.user._id.toString()] = p.historicalStats || {};
    });

    // Build solver input
    const solverInput = {
      employees: activeProfiles.map((p) => ({
        id: p.user._id.toString(),
        name: `${p.user.firstName} ${p.user.lastName}`,
        jobCategory: p.jobCategory,
        department: p.department.toString(),
        eligibleDepartments: [p.department.toString(), ...(p.eligibleDepartments || []).map((d) => d.toString())],
        skills: p.skills || [],
        qualifications: p.qualifications || [],
        contractedHoursPerWeek: p.contractedHoursPerWeek || 40,
        maxHoursPerWeek: p.maxHoursPerWeek || 48,
        maxHoursPerDay: p.maxHoursPerDay || 12,
        minRestHoursBetweenShifts: p.minRestHoursBetweenShifts || 11,
        preferredShifts: p.preferredShifts || [],
        historicalNightShifts: historicalStats[p.user._id.toString()]?.nightShifts || 0,
        historicalWeekendShifts: historicalStats[p.user._id.toString()]?.weekendShifts || 0,
        historicalOvertimeHours: historicalStats[p.user._id.toString()]?.overtimeHours || 0,
      })),
      departments: departments.map((d) => ({
        id: d._id.toString(),
        name: d.name,
        code: d.code,
      })),
      shiftTemplates: shiftTemplates.map((t) => ({
        id: t._id.toString(),
        name: t.name,
        shiftType: t.shiftType,
        startTime: t.startTime,
        endTime: t.endTime,
        durationHours: t.durationHours,
        crossesMidnight: t.crossesMidnight,
        department: t.department?.toString() || null,
        requirements: t.requirements || [],
      })),
      shiftRequirements: requirements.map((r) => ({
        id: r._id.toString(),
        department: r.department.toString(),
        shiftTemplate: r.shiftTemplate._id.toString(),
        dayOfWeek: r.dayOfWeek,
        roleRequirements: r.roleRequirements,
      })),
      approvedLeave: leaveList.map((l) => ({
        employee: l.employee.toString(),
        startDate: l.startDate.toISOString().split('T')[0],
        endDate: l.endDate.toISOString().split('T')[0],
      })),
      schedulingRules: {
        minRestHours: rulesMap['min_rest_hours'] || 11,
        maxHoursPerWeek: rulesMap['max_hours_per_week'] || 48,
        maxConsecutiveDays: rulesMap['max_consecutive_days'] || 6,
        maxNightShiftsPerWeek: rulesMap['max_night_shifts_per_week'] || 3,
      },
      horizon: {
        startDate: start.toISOString().split('T')[0],
        endDate: end.toISOString().split('T')[0],
      },
      solverConfig: {
        timeLimitSeconds,
        workers: 4,
      },
    };

    // Create roster and job records
    const rosterName = name || `Roster ${start.toDateString()} – ${end.toDateString()}`;
    const roster = await Roster.create({
      name: rosterName,
      department: departmentId || null,
      startDate: start,
      endDate: end,
      generatedBy: req.user._id,
      status: 'draft',
      solverStatus: 'NOT_RUN',
    });

    const job = await OptimizationJob.create({
      roster: roster._id,
      initiatedBy: req.user._id,
      department: departmentId || null,
      startDate: start,
      endDate: end,
      status: 'running',
      startedAt: new Date(),
      solverInput,
      config: { timeLimitSeconds, workers: 4 },
    });

    await Roster.findByIdAndUpdate(roster._id, { optimizationJob: job._id });

    // Call FastAPI optimizer
    let solverResponse;
    try {
      const optimizerUrl = process.env.OPTIMIZER_URL || 'http://localhost:8000';
      const resp = await axios.post(`${optimizerUrl}/solve`, solverInput, {
        timeout: (timeLimitSeconds + 30) * 1000,
        headers: { 'Content-Type': 'application/json' },
      });
      solverResponse = resp.data;
    } catch (axiosError) {
      const errMsg = axiosError.response?.data?.detail || axiosError.message;
      await OptimizationJob.findByIdAndUpdate(job._id, {
        status: 'failed',
        solverStatus: 'ERROR',
        errorMessage: errMsg,
        completedAt: new Date(),
      });
      await Roster.findByIdAndDelete(roster._id);
      return sendError(res, `Optimizer service error: ${errMsg}`, 502);
    }

    // Handle solver result
    const { status: solverStatus, assignments: solverAssignments = [], metrics = {}, diagnostics = {} } = solverResponse;

    if (solverStatus === 'INFEASIBLE') {
      await OptimizationJob.findByIdAndUpdate(job._id, {
        status: 'completed',
        solverStatus: 'INFEASIBLE',
        solverOutput: solverResponse,
        executionTimeMs: metrics.executionTimeMs,
        diagnostics,
        completedAt: new Date(),
      });
      await Roster.findByIdAndUpdate(roster._id, {
        solverStatus: 'INFEASIBLE',
        optimizationJob: job._id,
        'solverMetrics.executionTimeMs': metrics.executionTimeMs,
      });
      return sendError(res, 'Schedule is INFEASIBLE under current constraints.', 422, {
        solverStatus: 'INFEASIBLE',
        rosterId: roster._id,
        jobId: job._id,
        diagnostics,
      });
    }

    // Persist assignments
    if (solverAssignments.length > 0) {
      const assignmentDocs = solverAssignments.map((a) => {
        const startDt = new Date(a.startDatetime);
        const endDt   = new Date(a.endDatetime);
        const day = startDt.getDay();
        return {
          roster: roster._id,
          employee: new mongoose.Types.ObjectId(a.employeeId),
          department: new mongoose.Types.ObjectId(a.departmentId),
          shiftTemplate: new mongoose.Types.ObjectId(a.shiftTemplateId),
          date: new Date(a.date),
          startDatetime: startDt,
          endDatetime: endDt,
          shiftType: a.shiftType,
          isNightShift: a.shiftType === 'night',
          isWeekendShift: day === 0 || day === 6,
          durationHours: (endDt - startDt) / 3600000,
          overtimeHours: a.overtimeHours || 0,
        };
      });
      await Assignment.insertMany(assignmentDocs, { ordered: false });
    }

    // Update job and roster
    await OptimizationJob.findByIdAndUpdate(job._id, {
      status: 'completed',
      solverStatus,
      solverOutput: solverResponse,
      executionTimeMs: metrics.executionTimeMs,
      objectiveValue: metrics.objectiveValue,
      completedAt: new Date(),
    });

    const fairnessMetrics = metrics.fairness || {};
    await Roster.findByIdAndUpdate(roster._id, {
      solverStatus,
      optimizationJob: job._id,
      'solverMetrics.executionTimeMs': metrics.executionTimeMs,
      'solverMetrics.objectiveValue': metrics.objectiveValue,
      'solverMetrics.totalAssigned': solverAssignments.length,
      'solverMetrics.totalUnfilled': metrics.totalUnfilled || 0,
      'fairnessMetrics.nightShiftVariance': fairnessMetrics.nightShiftVariance,
      'fairnessMetrics.weekendShiftVariance': fairnessMetrics.weekendShiftVariance,
      'fairnessMetrics.overtimeVariance': fairnessMetrics.overtimeVariance,
      'fairnessMetrics.workloadImbalanceScore': fairnessMetrics.workloadImbalanceScore,
    });

    const finalRoster = await Roster.findById(roster._id)
      .populate('department', 'name code color')
      .populate('generatedBy', 'firstName lastName');

    logger.info(`Roster generated: ${roster._id} status=${solverStatus} assignments=${solverAssignments.length}`);

    return sendCreated(res, {
      roster: finalRoster,
      solverStatus,
      metrics,
      diagnostics,
      assignmentCount: solverAssignments.length,
    }, `Roster generated with status: ${solverStatus}`);
  } catch (error) {
    next(error);
  }
};

const publishRoster = async (req, res, next) => {
  try {
    const roster = await Roster.findById(req.params.id);
    if (!roster) return sendNotFound(res, 'Roster');
    if (roster.status === 'published') return sendError(res, 'Roster is already published.', 409);
    if (roster.solverStatus === 'INFEASIBLE') {
      return sendError(res, 'Cannot publish an infeasible roster.', 422);
    }

    roster.status = 'published';
    roster.publishedBy = req.user._id;
    roster.publishedAt = new Date();
    roster.changeLog.push({
      action: 'published',
      performedBy: req.user._id,
      description: 'Roster published',
    });
    await roster.save();

    // Notify all affected employees
    const assignments = await Assignment.find({ roster: roster._id }).distinct('employee');
    await Notification.insertMany(assignments.map((empId) => ({
      recipient: empId,
      type: 'roster_published',
      title: 'New Roster Published',
      message: `A new roster "${roster.name}" (${roster.startDate.toDateString()} – ${roster.endDate.toDateString()}) has been published.`,
      relatedEntity: { entityType: 'Roster', entityId: roster._id },
      priority: 'high',
    })));

    // Emit socket event (if io available on req.app)
    const io = req.app.get('io');
    if (io) {
      assignments.forEach((empId) => {
        io.to(`user:${empId}`).emit('notification', {
          type: 'roster_published',
          title: 'New Roster Published',
          rosterId: roster._id,
        });
      });
    }

    return sendSuccess(res, roster, 'Roster published');
  } catch (error) {
    next(error);
  }
};

const archiveRoster = async (req, res, next) => {
  try {
    const roster = await Roster.findByIdAndUpdate(
      req.params.id, { status: 'archived' }, { new: true }
    );
    if (!roster) return sendNotFound(res, 'Roster');
    return sendSuccess(res, roster, 'Roster archived');
  } catch (error) {
    next(error);
  }
};

const getRosterAssignments = async (req, res, next) => {
  try {
    const { department, employee, date } = req.query;
    const filter = { roster: req.params.id };
    if (department) filter.department = department;
    if (employee) filter.employee = employee;
    if (date) {
      const d = new Date(date);
      const nextDay = new Date(d);
      nextDay.setDate(nextDay.getDate() + 1);
      filter.date = { $gte: d, $lt: nextDay };
    }

    // Employees see only their own assignments
    if (req.user.role === 'employee') filter.employee = req.user._id;

    const assignments = await Assignment.find(filter)
      .populate('employee', 'firstName lastName email')
      .populate('department', 'name code color')
      .populate('shiftTemplate', 'name code shiftType startTime endTime color')
      .sort({ startDatetime: 1 });

    return sendSuccess(res, assignments);
  } catch (error) {
    next(error);
  }
};

module.exports = { getRosters, getRosterById, generateRoster, publishRoster, archiveRoster, getRosterAssignments };
