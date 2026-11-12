// src/controllers/employeeController.js
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { paginate, buildPaginationMeta } = require('../utils/pagination');
const mongoose = require('mongoose');

const getAllEmployees = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, department, role, status, search, jobCategory } = req.query;
    const { skip, limit: lim, page: pg } = paginate(page, limit);

    // Build user filter
    const userFilter = {};
    if (search) {
      userFilter.$or = [
        { firstName: { $regex: search, $options: 'i' } },
        { lastName:  { $regex: search, $options: 'i' } },
        { email:     { $regex: search, $options: 'i' } },
        { employeeId: { $regex: search, $options: 'i' } },
      ];
    }

    // Build profile filter
    const profileFilter = {};
    if (department) profileFilter.department = new mongoose.Types.ObjectId(department);
    if (jobCategory) profileFilter.jobCategory = jobCategory;
    if (status) profileFilter.employmentStatus = status;

    // Find matching profiles first, then join users
    const profileQuery = EmployeeProfile.find(profileFilter)
      .populate({
        path: 'user',
        match: userFilter,
        select: '-password -refreshToken',
        populate: { path: 'department', select: 'name code' },
      })
      .populate('department', 'name code color')
      .populate('eligibleDepartments', 'name code');

    const allProfiles = await profileQuery;
    const filtered = allProfiles.filter((p) => p.user !== null);

    const total = filtered.length;
    const paginated = filtered.slice(skip, skip + lim);

    return sendPaginated(res, paginated, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    next(error);
  }
};

const getEmployeeById = async (req, res, next) => {
  try {
    const profile = await EmployeeProfile.findOne({ user: req.params.id })
      .populate('user', '-password -refreshToken')
      .populate('department', 'name code color')
      .populate('eligibleDepartments', 'name code');
    if (!profile) {
      // Try by profile _id
      const byId = await EmployeeProfile.findById(req.params.id)
        .populate('user', '-password -refreshToken')
        .populate('department', 'name code color')
        .populate('eligibleDepartments', 'name code');
      if (!byId) return sendNotFound(res, 'Employee');
      return sendSuccess(res, byId);
    }
    return sendSuccess(res, profile);
  } catch (error) {
    next(error);
  }
};

const createEmployee = async (req, res, next) => {
  let createdUser = null;
  let session = null;
  const isReplicaSet = mongoose.connection.client?.topology?.description?.type === 'ReplicaSetWithPrimary';

  if (isReplicaSet) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }
  }

  try {
    const {
      firstName, lastName, email, password, role = 'employee',
      employeeId, department, managedDepartments,
      jobCategory, jobTitle, employeeNumber, skills, qualifications,
      eligibleDepartments, employmentType, contractedHoursPerWeek,
      maxHoursPerWeek, maxHoursPerDay, minRestHoursBetweenShifts,
      preferredShifts, joinDate,
    } = req.body;

    const sessionOption = session ? { session } : {};

    // Create user
    const users = await User.create([{
      firstName, lastName, email,
      password: password || 'Hospital@2024',
      role, employeeId, department, managedDepartments: managedDepartments || [],
    }], sessionOption);
    createdUser = users[0];

    // Create profile
    const profile = await EmployeeProfile.create([{
      user: createdUser._id,
      jobCategory, jobTitle, employeeNumber,
      department,
      eligibleDepartments: eligibleDepartments || [],
      skills: skills || [], qualifications: qualifications || [],
      employmentType, contractedHoursPerWeek, maxHoursPerWeek,
      maxHoursPerDay, minRestHoursBetweenShifts,
      preferredShifts: preferredShifts || [], joinDate,
    }], sessionOption);

    if (session) {
      await session.commitTransaction();
    }

    const result = await EmployeeProfile.findById(profile[0]._id)
      .populate('user', '-password -refreshToken')
      .populate('department', 'name code color')
      .populate('eligibleDepartments', 'name code');

    return sendCreated(res, result, 'Employee created successfully');
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    } else if (createdUser) {
      await User.findByIdAndDelete(createdUser._id).catch(() => {});
    }
    next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const updateEmployee = async (req, res, next) => {
  let session = null;
  const isReplicaSet = mongoose.connection.client?.topology?.description?.type === 'ReplicaSetWithPrimary';

  if (isReplicaSet) {
    try {
      session = await mongoose.startSession();
      session.startTransaction();
    } catch {
      session = null;
    }
  }

  try {
    const {
      firstName, lastName, email, role, employeeId, managedDepartments,
      department: userDept,
      jobCategory, jobTitle, skills, qualifications, eligibleDepartments,
      employmentType, contractedHoursPerWeek, maxHoursPerWeek,
      maxHoursPerDay, minRestHoursBetweenShifts, preferredShifts,
      employmentStatus, joinDate, endDate, notes,
    } = req.body;

    const profileId = req.params.id;
    const profile = await EmployeeProfile.findById(profileId);
    if (!profile) return sendNotFound(res, 'Employee');

    const sessionOption = session ? { session } : {};

    // Only admin can change role and system fields
    const userUpdate = {};
    if (firstName) userUpdate.firstName = firstName;
    if (lastName)  userUpdate.lastName  = lastName;
    if (email)     userUpdate.email     = email;
    if (userDept)  userUpdate.department = userDept;
    if (req.user.role === 'admin') {
      if (role) userUpdate.role = role;
      if (employeeId) userUpdate.employeeId = employeeId;
      if (managedDepartments) userUpdate.managedDepartments = managedDepartments;
    }

    await User.findByIdAndUpdate(profile.user, { $set: userUpdate }, { ...sessionOption, runValidators: true });

    const profileUpdate = {};
    if (userDept)      profileUpdate.department    = userDept;
    if (jobCategory)   profileUpdate.jobCategory   = jobCategory;
    if (jobTitle)      profileUpdate.jobTitle      = jobTitle;
    if (skills)        profileUpdate.skills        = skills;
    if (qualifications) profileUpdate.qualifications = qualifications;
    if (eligibleDepartments) profileUpdate.eligibleDepartments = eligibleDepartments;
    if (employmentType)           profileUpdate.employmentType           = employmentType;
    if (contractedHoursPerWeek !== undefined) profileUpdate.contractedHoursPerWeek = contractedHoursPerWeek;
    if (maxHoursPerWeek !== undefined)        profileUpdate.maxHoursPerWeek        = maxHoursPerWeek;
    if (maxHoursPerDay !== undefined)         profileUpdate.maxHoursPerDay         = maxHoursPerDay;
    if (minRestHoursBetweenShifts !== undefined) profileUpdate.minRestHoursBetweenShifts = minRestHoursBetweenShifts;
    if (preferredShifts) profileUpdate.preferredShifts = preferredShifts;
    if (employmentStatus) profileUpdate.employmentStatus = employmentStatus;
    if (joinDate) profileUpdate.joinDate = joinDate;
    if (endDate)  profileUpdate.endDate  = endDate;
    if (notes !== undefined) profileUpdate.notes = notes;

    const updated = await EmployeeProfile.findByIdAndUpdate(
      profileId, { $set: profileUpdate }, { new: true, ...sessionOption, runValidators: true }
    )
      .populate('user', '-password -refreshToken')
      .populate('department', 'name code color')
      .populate('eligibleDepartments', 'name code');

    if (session) {
      await session.commitTransaction();
    }
    return sendSuccess(res, updated, 'Employee updated');
  } catch (error) {
    if (session) {
      await session.abortTransaction();
    }
    next(error);
  } finally {
    if (session) {
      session.endSession();
    }
  }
};

const deactivateEmployee = async (req, res, next) => {
  try {
    const profile = await EmployeeProfile.findById(req.params.id);
    if (!profile) return sendNotFound(res, 'Employee');
    await Promise.all([
      User.findByIdAndUpdate(profile.user, { isActive: false }),
      EmployeeProfile.findByIdAndUpdate(req.params.id, { employmentStatus: 'inactive' }),
    ]);
    return sendSuccess(res, null, 'Employee deactivated');
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllEmployees, getEmployeeById, createEmployee, updateEmployee, deactivateEmployee };
