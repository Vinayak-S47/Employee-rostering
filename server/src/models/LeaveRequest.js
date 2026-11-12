// src/models/LeaveRequest.js
const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    leaveType: {
      type: String,
      enum: ['annual', 'sick', 'emergency', 'maternity', 'paternity', 'study', 'unpaid', 'other'],
      required: true,
    },
    startDate: { type: Date, required: true },
    endDate:   { type: Date, required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'cancelled'],
      default: 'pending',
    },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: { type: String, trim: true },
    // Audit: which shifts this leave conflicts with
    affectedShifts: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Assignment' }],
  },
  { timestamps: true }
);

leaveRequestSchema.index({ employee: 1, status: 1 });
leaveRequestSchema.index({ startDate: 1, endDate: 1 });
leaveRequestSchema.index({ status: 1 });

// Validate end >= start
leaveRequestSchema.pre('save', function (next) {
  if (this.endDate < this.startDate) {
    return next(new Error('End date must be on or after start date'));
  }
  next();
});

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
