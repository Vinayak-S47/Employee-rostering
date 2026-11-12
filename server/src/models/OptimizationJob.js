// src/models/OptimizationJob.js
const mongoose = require('mongoose');

const optimizationJobSchema = new mongoose.Schema(
  {
    roster: { type: mongoose.Schema.Types.ObjectId, ref: 'Roster' },
    initiatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    status: {
      type: String,
      enum: ['pending', 'running', 'completed', 'failed', 'cancelled'],
      default: 'pending',
    },
    // Solver result
    solverStatus: {
      type: String,
      enum: ['OPTIMAL', 'FEASIBLE', 'INFEASIBLE', 'UNKNOWN', 'ERROR'],
    },
    solverInput: { type: mongoose.Schema.Types.Mixed },  // stored for debugging
    solverOutput: { type: mongoose.Schema.Types.Mixed }, // full solver response
    executionTimeMs: { type: Number },
    objectiveValue: { type: Number },
    // Diagnostics for infeasible/shortages
    diagnostics: {
      infeasibleReasons: [String],
      departmentShortages: [{ department: String, shift: String, role: String, required: Number, available: Number }],
      suggestions: [String],
    },
    errorMessage: { type: String },
    startedAt: { type: Date },
    completedAt: { type: Date },
    // Solver configuration used
    config: {
      timeLimitSeconds: { type: Number, default: 60 },
      workers: { type: Number, default: 4 },
    },
  },
  { timestamps: true }
);

optimizationJobSchema.index({ roster: 1 });
optimizationJobSchema.index({ status: 1 });
optimizationJobSchema.index({ initiatedBy: 1 });

module.exports = mongoose.model('OptimizationJob', optimizationJobSchema);
