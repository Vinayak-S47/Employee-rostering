// src/models/Assignment.js
// An individual employee↔shift assignment within a roster
const mongoose = require('mongoose');

const assignmentSchema = new mongoose.Schema(
  {
    roster: { type: mongoose.Schema.Types.ObjectId, ref: 'Roster', required: true },
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department', required: true },
    shiftTemplate: { type: mongoose.Schema.Types.ObjectId, ref: 'ShiftTemplate', required: true },
    date: { type: Date, required: true },       // calendar date of shift start
    startDatetime: { type: Date, required: true },
    endDatetime:   { type: Date, required: true },
    shiftType: { type: String, enum: ['morning', 'evening', 'night', 'custom'] },
    isNightShift:    { type: Boolean, default: false },
    isWeekendShift:  { type: Boolean, default: false },
    durationHours:   { type: Number },
    overtimeHours:   { type: Number, default: 0 },
    status: {
      type: String,
      enum: ['scheduled', 'confirmed', 'completed', 'cancelled', 'swapped'],
      default: 'scheduled',
    },
    isManuallyEdited: { type: Boolean, default: false },
    editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    editedAt: { type: Date },
    notes: { type: String },
  },
  { timestamps: true }
);

// Prevent duplicate assignment of same employee to same shift slot
assignmentSchema.index(
  { employee: 1, startDatetime: 1 },
  { unique: true }
);
assignmentSchema.index({ roster: 1 });
assignmentSchema.index({ employee: 1, date: 1 });
assignmentSchema.index({ department: 1, date: 1 });
assignmentSchema.index({ date: 1, shiftType: 1 });

// Auto-calculate fields
assignmentSchema.pre('save', function (next) {
  if (this.startDatetime && this.endDatetime) {
    this.durationHours = (this.endDatetime - this.startDatetime) / 3600000;
  }
  // Weekend: Saturday(6) or Sunday(0)
  if (this.startDatetime) {
    const day = this.startDatetime.getDay();
    this.isWeekendShift = day === 0 || day === 6;
  }
  next();
});

module.exports = mongoose.model('Assignment', assignmentSchema);
