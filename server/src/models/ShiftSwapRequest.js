// src/models/ShiftSwapRequest.js
const mongoose = require('mongoose');

const shiftSwapRequestSchema = new mongoose.Schema(
  {
    requester: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    requesterAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    targetEmployee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    targetAssignment: { type: mongoose.Schema.Types.ObjectId, ref: 'Assignment', required: true },
    reason: { type: String, trim: true },
    status: {
      type: String,
      enum: ['pending_target', 'pending_manager', 'approved', 'rejected', 'cancelled', 'expired'],
      default: 'pending_target',
    },
    targetResponse: { type: String, enum: ['accepted', 'rejected'] },
    targetRespondedAt: { type: Date },
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    reviewedAt: { type: Date },
    reviewComment: { type: String },
    // Pre-validation result stored for audit
    validationResult: {
      isValid: Boolean,
      violations: [String],
      checkedAt: Date,
    },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

shiftSwapRequestSchema.index({ requester: 1, status: 1 });
shiftSwapRequestSchema.index({ targetEmployee: 1, status: 1 });
shiftSwapRequestSchema.index({ status: 1 });

module.exports = mongoose.model('ShiftSwapRequest', shiftSwapRequestSchema);
