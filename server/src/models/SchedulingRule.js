// src/models/SchedulingRule.js
// Configurable scheduling rules/constraints
const mongoose = require('mongoose');

const schedulingRuleSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    description: { type: String },
    category: {
      type: String,
      enum: ['rest', 'hours', 'consecutive', 'fairness', 'coverage'],
      required: true,
    },
    // The rule key used by the optimizer
    ruleKey: { type: String, required: true, unique: true },
    value: { type: mongoose.Schema.Types.Mixed, required: true },
    unit: { type: String }, // e.g. 'hours', 'days', 'shifts'
    isHardConstraint: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true },
    appliesTo: {
      type: String,
      enum: ['all', 'department', 'role'],
      default: 'all',
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    role: { type: String },
    // Audit
    lastModifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

schedulingRuleSchema.index({ isActive: 1 });

module.exports = mongoose.model('SchedulingRule', schedulingRuleSchema);
