// src/models/Availability.js
const mongoose = require('mongoose');

const availabilitySchema = new mongoose.Schema(
  {
    employee: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    weekStartDate: { type: Date, required: true },
    // Array of availability slots
    slots: [{
      date: { type: Date, required: true },
      available: { type: Boolean, default: true },
      preferredShifts: [{ type: String, enum: ['morning', 'evening', 'night'] }],
      notes: { type: String },
    }],
    // Specific unavailable dates/times
    unavailableDates: [{ type: Date }],
    submittedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['draft', 'submitted'], default: 'submitted' },
  },
  { timestamps: true }
);

availabilitySchema.index({ employee: 1, weekStartDate: 1 }, { unique: true });
availabilitySchema.index({ weekStartDate: 1 });

module.exports = mongoose.model('Availability', availabilitySchema);
