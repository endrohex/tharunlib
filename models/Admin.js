const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema(
  {
    firebaseUid: {
      type: String,
      unique: true,
      required: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    name: {
      type: String,
      default: 'Library Administrator',
    },
    role: {
      type: String,
      default: 'admin',
      enum: ['admin', 'superadmin'],
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.models.Admin || mongoose.model('Admin', adminSchema);
