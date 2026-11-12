// src/models/EmployeeProfile.js
const mongoose = require('mongoose');

const employeeProfileSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    // Job category (separate from app access role)
    jobCategory: {
      type: String,
      enum: ['Doctor', 'Nurse', 'Technician', 'Pharmacist', 'Admin Staff', 'Other'],
      required: true,
    },
    jobTitle: { type: String, trim: true },
    employeeNumber: { type: String, unique: true, sparse: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    // Additional departments the employee can work in
    eligibleDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    skills: [{ type: String, trim: true }],
    qualifications: [{ type: String, trim: true }],
    employmentType: {
      type: String,
      enum: ['full-time', 'part-time', 'contract', 'agency'],
      default: 'full-time',
    },
    employmentStatus: {
      type: String,
      enum: ['active', 'inactive', 'suspended', 'on-leave'],
      default: 'active',
    },
    contractedHoursPerWeek: { type: Number, default: 40, min: 0, max: 168 },
    maxHoursPerWeek: { type: Number, default: 48, min: 0, max: 168 },
    maxHoursPerDay: { type: Number, default: 12, min: 0, max: 24 },
    minRestHoursBetweenShifts: { type: Number, default: 11, min: 0 },
    preferredShifts: [{ type: String, enum: ['morning', 'evening', 'night'] }],
    joinDate: { type: Date },
    endDate: { type: Date },
    // Historical fairness tracking
    historicalStats: {
      nightShifts: { type: Number, default: 0 },
      weekendShifts: { type: Number, default: 0 },
      overtimeHours: { type: Number, default: 0 },
      totalHoursWorked: { type: Number, default: 0 },
      lastUpdated: { type: Date, default: Date.now },
    },
    notes: { type: String, trim: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

employeeProfileSchema.index({ department: 1 });
employeeProfileSchema.index({ jobCategory: 1 });
employeeProfileSchema.index({ employmentStatus: 1 });
employeeProfileSchema.index({ skills: 1 });

module.exports = mongoose.model('EmployeeProfile', employeeProfileSchema);
