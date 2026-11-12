// src/models/Roster.js
const mongoose = require('mongoose');

const rosterSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, // null = hospital-wide
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
    },
    generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedBy:  { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    publishedAt:  { type: Date },
    // Optimization result metadata
    optimizationJob: { type: mongoose.Schema.Types.ObjectId, ref: 'OptimizationJob' },
    solverStatus: {
      type: String,
      enum: ['OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'UNKNOWN', 'MANUAL', 'NOT_RUN'],
      default: 'NOT_RUN',
    },
    solverMetrics: {
      executionTimeMs: Number,
      objectiveValue: Number,
      totalAssigned: Number,
      totalUnfilled: Number,
      feasibilityScore: Number,
    },
    fairnessMetrics: {
      nightShiftVariance: Number,
      weekendShiftVariance: Number,
      overtimeVariance: Number,
      workloadImbalanceScore: Number,
    },
    notes: { type: String },
    // Audit trail of significant changes
    changeLog: [{
      action: String,
      performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      performedAt: { type: Date, default: Date.now },
      description: String,
    }],
  },
  { timestamps: true }
);

rosterSchema.index({ department: 1, startDate: 1, endDate: 1 });
rosterSchema.index({ status: 1 });
rosterSchema.index({ startDate: 1 });

module.exports = mongoose.model('Roster', rosterSchema);
