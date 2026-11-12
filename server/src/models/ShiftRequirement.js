// src/models/ShiftRequirement.js
// Specific staffing requirements for a department + date + shift type
const mongoose = require('mongoose');

const roleRequirementSchema = new mongoose.Schema({
  role: { type: String, required: true },
  count: { type: Number, required: true, min: 0 },
  requiredSkills: [String],
  minimumExperience: { type: String }, // e.g. "senior", "junior"
  isMandatory: { type: Boolean, default: true },
}, { _id: false });

const shiftRequirementSchema = new mongoose.Schema(
  {
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    shiftTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate', required: true },
    // Day of week (0=Sun..6=Sat) or specific date override
    dayOfWeek: { type: Number, min: 0, max: 6 },
    specificDate: { type: Date },
    roleRequirements: [roleRequirementSchema],
    totalRequired: { type: Number, default: 0 },
    notes: { type: String },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Prevent duplicate department+template+day combos
shiftRequirementSchema.index(
  { department: 1, shiftTemplate: 1, dayOfWeek: 1 },
  { unique: true, sparse: true }
);
shiftRequirementSchema.index({ department: 1 });

// Auto-calculate total
shiftRequirementSchema.pre('save', function (next) {
  this.totalRequired = this.roleRequirements.reduce((sum, r) => sum + r.count, 0);
  next();
});

module.exports = mongoose.model('ShiftRequirement', shiftRequirementSchema);
