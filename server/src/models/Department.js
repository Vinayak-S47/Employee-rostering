// src/models/Department.js
const mongoose = require('mongoose');

const staffingRequirementSchema = new mongoose.Schema({
  shiftType: { type: String, enum: ['morning', 'evening', 'night', 'custom'] },
  role: { type: String, required: true },
  count: { type: Number, required: true, min: 0 },
  requiredSkills: [String],
}, { _id: false });

const departmentSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true, trim: true },
    code: { type: String, required: true, unique: true, uppercase: true, trim: true },
    description: { type: String, trim: true },
    location: { type: String, trim: true },
    // Permitted job roles in this department
    permittedRoles: [{
      type: String,
      enum: ['Doctor', 'Nurse', 'Technician', 'Pharmacist', 'Admin Staff', 'Other'],
    }],
    // Default staffing requirements per shift type
    defaultStaffingRequirements: [staffingRequirementSchema],
    // Required qualifications/skills for entry to this department
    requiredQualifications: [String],
    isActive: { type: Boolean, default: true },
    color: { type: String, default: '#0891b2' }, // display color for calendar
    headOfDepartment: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  },
  { timestamps: true }
);

departmentSchema.index({ isActive: 1 });

module.exports = mongoose.model('Department', departmentSchema);
