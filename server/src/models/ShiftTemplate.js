// src/models/ShiftTemplate.js
const mongoose = require('mongoose');

const shiftTemplateSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    code: { type: String, required: true, trim: true },
    shiftType: {
      type: String,
      enum: ['morning', 'evening', 'night', 'custom'],
      required: true,
    },
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' }, // null = hospital-wide
    // Times stored as HH:MM strings for display; actual assignment uses full datetime
    startTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    endTime: { type: String, required: true, match: /^([01]\d|2[0-3]):([0-5]\d)$/ },
    // Duration in hours (calculated, may cross midnight)
    durationHours: { type: Number, required: true },
    crossesMidnight: { type: Boolean, default: false },
    color: { type: String, default: '#0891b2' },
    isActive: { type: Boolean, default: true },
    description: { type: String },
    // Default staffing requirements for this template
    requirements: [{
      role: { type: String, required: true },
      count: { type: Number, required: true, min: 1 },
      requiredSkills: [String],
      isMandatory: { type: Boolean, default: true },
    }],
  },
  { timestamps: true }
);

// Calculate duration and crossesMidnight on save
shiftTemplateSchema.pre('save', function (next) {
  const [sh, sm] = this.startTime.split(':').map(Number);
  const [eh, em] = this.endTime.split(':').map(Number);
  let startMins = sh * 60 + sm;
  let endMins = eh * 60 + em;
  if (endMins <= startMins) {
    endMins += 24 * 60;
    this.crossesMidnight = true;
  } else {
    this.crossesMidnight = false;
  }
  this.durationHours = (endMins - startMins) / 60;
  next();
});

shiftTemplateSchema.index({ department: 1, shiftType: 1 });
shiftTemplateSchema.index({ isActive: 1 });

module.exports = mongoose.model('ShiftTemplate', shiftTemplateSchema);
