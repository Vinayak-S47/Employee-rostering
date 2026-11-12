// src/models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    type: {
      type: String,
      enum: [
        'roster_published', 'roster_changed', 'roster_generation_complete',
        'leave_approved', 'leave_rejected', 'leave_request_received',
        'swap_requested', 'swap_accepted', 'swap_rejected', 'swap_approved', 'swap_cancelled',
        'shift_assigned', 'shift_cancelled', 'shift_changed',
        'staffing_shortage', 'constraint_violation', 'system',
      ],
      required: true,
    },
    title: { type: String, required: true },
    message: { type: String, required: true },
    isRead: { type: Boolean, default: false },
    readAt: { type: Date },
    // Reference to related entity
    relatedEntity: {
      entityType: { type: String, enum: ['Roster', 'Assignment', 'LeaveRequest', 'ShiftSwapRequest', 'OptimizationJob'] },
      entityId: { type: mongoose.Schema.Types.ObjectId },
    },
    priority: { type: String, enum: ['low', 'medium', 'high'], default: 'medium' },
  },
  { timestamps: true }
);

notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });
notificationSchema.index({ createdAt: 1 }, { expireAfterSeconds: 7776000 }); // 90-day TTL

module.exports = mongoose.model('Notification', notificationSchema);
