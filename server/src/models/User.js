// src/models/User.js
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema(
  {
    employeeId: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
    },
    firstName: { type: String, required: true, trim: true },
    lastName:  { type: String, required: true, trim: true },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Invalid email address'],
    },
    password: { type: String, required: true, minlength: 6, select: false },
    // Application access role (separate from job category)
    role: {
      type: String,
      enum: ['admin', 'manager', 'employee'],
      default: 'employee',
    },
    // Department this user manages (for manager role)
    managedDepartments: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Department' }],
    department: { type: mongoose.Schema.Types.ObjectId, ref: 'Department' },
    isActive: { type: Boolean, default: true },
    lastLogin: { type: Date },
    passwordChangedAt: { type: Date },
    refreshToken: { type: String, select: false },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: full name
userSchema.virtual('fullName').get(function () {
  return `${this.firstName} ${this.lastName}`;
});

// Hash password before save
userSchema.pre('save', async function (next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  this.passwordChangedAt = Date.now() - 1000;
  next();
});

// Compare passwords
userSchema.methods.comparePassword = async function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Check if password changed after JWT was issued
userSchema.methods.changedPasswordAfter = function (jwtIat) {
  if (this.passwordChangedAt) {
    const changedTimestamp = parseInt(this.passwordChangedAt.getTime() / 1000, 10);
    return jwtIat < changedTimestamp;
  }
  return false;
};

userSchema.index({ department: 1 });
userSchema.index({ role: 1 });
userSchema.index({ isActive: 1 });

module.exports = mongoose.model('User', userSchema);
