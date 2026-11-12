// src/controllers/departmentController.js
const Department = require('../models/Department');
const User = require('../models/User');
const EmployeeProfile = require('../models/EmployeeProfile');
const { sendSuccess, sendCreated, sendError, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const { paginate, buildPaginationMeta } = require('../utils/pagination');

const getAllDepartments = async (req, res, next) => {
  try {
    const { active, page = 1, limit = 50, search } = req.query;
    const filter = {};
    if (active === 'true') filter.isActive = true;
    if (active === 'false') filter.isActive = false;
    if (search) filter.name = { $regex: search, $options: 'i' };

    const { skip, limit: lim, page: pg } = paginate(page, limit);
    const [departments, total] = await Promise.all([
      Department.find(filter)
        .populate('headOfDepartment', 'firstName lastName email')
        .sort({ name: 1 })
        .skip(skip)
        .limit(lim),
      Department.countDocuments(filter),
    ]);
    return sendPaginated(res, departments, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    next(error);
  }
};

const getDepartmentById = async (req, res, next) => {
  try {
    const dept = await Department.findById(req.params.id)
      .populate('headOfDepartment', 'firstName lastName email');
    if (!dept) return sendNotFound(res, 'Department');

    const staffCount = await EmployeeProfile.countDocuments({
      department: dept._id,
      employmentStatus: 'active',
    });
    return sendSuccess(res, { ...dept.toObject(), staffCount });
  } catch (error) {
    next(error);
  }
};

const createDepartment = async (req, res, next) => {
  try {
    const dept = await Department.create(req.body);
    return sendCreated(res, dept, 'Department created');
  } catch (error) {
    next(error);
  }
};

const updateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByIdAndUpdate(
      req.params.id,
      { $set: req.body },
      { new: true, runValidators: true }
    );
    if (!dept) return sendNotFound(res, 'Department');
    return sendSuccess(res, dept, 'Department updated');
  } catch (error) {
    next(error);
  }
};

const deactivateDepartment = async (req, res, next) => {
  try {
    const dept = await Department.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    if (!dept) return sendNotFound(res, 'Department');
    return sendSuccess(res, dept, 'Department deactivated');
  } catch (error) {
    next(error);
  }
};

const getDepartmentStaff = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    const { skip, limit: lim, page: pg } = paginate(page, limit);
    const [staff, total] = await Promise.all([
      EmployeeProfile.find({ department: req.params.id })
        .populate('user', 'firstName lastName email role isActive')
        .sort({ 'user.firstName': 1 })
        .skip(skip)
        .limit(lim),
      EmployeeProfile.countDocuments({ department: req.params.id }),
    ]);
    return sendPaginated(res, staff, buildPaginationMeta(total, pg, lim));
  } catch (error) {
    next(error);
  }
};

module.exports = { getAllDepartments, getDepartmentById, createDepartment, updateDepartment, deactivateDepartment, getDepartmentStaff };
