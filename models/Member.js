const mongoose = require('mongoose');

const memberSchema = new mongoose.Schema(
  {
    memberId: {
      type: String,
      unique: true,
      required: true,
    },
    name: {
      type: String,
      required: [true, 'Member name is required'],
      trim: true,
      maxlength: 120,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true,
      index: true,
    },
    email: {
      type: String,
      trim: true,
      lowercase: true,
      index: true,
      default: '',
    },
    address: {
      type: String,
      trim: true,
      default: '',
      maxlength: 500,
    },
  },
  {
    timestamps: true,
  }
);

memberSchema.index({ name: 'text', phone: 1, email: 1 });

module.exports = mongoose.models.Member || mongoose.model('Member', memberSchema);
