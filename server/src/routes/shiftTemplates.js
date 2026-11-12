// src/routes/shiftTemplates.js
const express = require('express');
const { body } = require('express-validator');
const router = express.Router();
const ShiftTemplate = require('../models/ShiftTemplate');
const ShiftRequirement = require('../models/ShiftRequirement');
const SchedulingRule = require('../models/SchedulingRule');
const { authenticate, authorize } = require('../middleware/auth');
const { sendSuccess, sendCreated, sendNotFound, sendPaginated } = require('../utils/apiResponse');
const validate = require('../middleware/validate');

router.use(authenticate);

// Shift Templates
router.get('/templates', async (req, res, next) => {
  try {
    const { department, active = 'true' } = req.query;
    const filter = {};
    if (active !== 'all') filter.isActive = active === 'true';
    if (department) filter.$or = [{ department }, { department: null }];
    const templates = await ShiftTemplate.find(filter).populate('department', 'name code').sort({ shiftType: 1 });
    return sendSuccess(res, templates);
  } catch (e) { next(e); }
});

router.post('/templates',
  authorize('admin', 'manager'),
  [
    body('name').notEmpty().trim().withMessage('Name required'),
    body('code').notEmpty().trim().withMessage('Code required'),
    body('shiftType').isIn(['morning', 'evening', 'night', 'custom']).withMessage('Invalid shift type'),
    body('startTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('Start time HH:MM required'),
    body('endTime').matches(/^([01]\d|2[0-3]):([0-5]\d)$/).withMessage('End time HH:MM required'),
  ],
  validate,
  async (req, res, next) => {
    try {
      const t = await ShiftTemplate.create(req.body);
      return sendCreated(res, t, 'Shift template created');
    } catch (e) { next(e); }
  }
);

router.put('/templates/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const t = await ShiftTemplate.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!t) return sendNotFound(res, 'Shift template');
    return sendSuccess(res, t, 'Updated');
  } catch (e) { next(e); }
});

// Shift Requirements
router.get('/requirements', async (req, res, next) => {
  try {
    const { department } = req.query;
    const filter = department ? { department } : {};
    const reqs = await ShiftRequirement.find(filter)
      .populate('department', 'name code')
      .populate('shiftTemplate', 'name shiftType startTime endTime');
    return sendSuccess(res, reqs);
  } catch (e) { next(e); }
});

router.post('/requirements', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const r = await ShiftRequirement.create(req.body);
    return sendCreated(res, r, 'Requirement created');
  } catch (e) { next(e); }
});

router.put('/requirements/:id', authorize('admin', 'manager'), async (req, res, next) => {
  try {
    const r = await ShiftRequirement.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
    if (!r) return sendNotFound(res, 'Requirement');
    return sendSuccess(res, r, 'Updated');
  } catch (e) { next(e); }
});

// Scheduling Rules
router.get('/rules', async (req, res, next) => {
  try {
    const rules = await SchedulingRule.find({}).sort({ category: 1, name: 1 });
    return sendSuccess(res, rules);
  } catch (e) { next(e); }
});

router.put('/rules/:id', authorize('admin'), async (req, res, next) => {
  try {
    const rule = await SchedulingRule.findByIdAndUpdate(
      req.params.id,
      { $set: { value: req.body.value, isActive: req.body.isActive, lastModifiedBy: req.user._id } },
      { new: true }
    );
    if (!rule) return sendNotFound(res, 'Rule');
    return sendSuccess(res, rule, 'Rule updated');
  } catch (e) { next(e); }
});

module.exports = router;
