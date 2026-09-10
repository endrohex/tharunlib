const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema(
  {
    libraryName: {
      type: String,
      default: 'Central City Library',
      trim: true,
    },
    libraryAddress: {
      type: String,
      default: '124 Readers Avenue, Knowledge City',
      trim: true,
    },
    libraryPhone: {
      type: String,
      default: '+91 98765 43210',
      trim: true,
    },
    libraryEmail: {
      type: String,
      default: 'admin@library.org',
      trim: true,
    },
    defaultRentalDuration: {
      type: Number,
      default: 7,
      min: 1,
    },
    maximumRentalDuration: {
      type: Number,
      default: 60,
      min: 1,
    },
    gracePeriod: {
      type: Number,
      default: 2,
      min: 0,
    },
    upiEnabled: {
      type: Boolean,
      default: true,
    },
    upiId: {
      type: String,
      default: 'library@upi',
      trim: true,
    },
    upiName: {
      type: String,
      default: 'Central City Library',
      trim: true,
    },
    upiQrImage: {
      type: String,
      default: '',
    },
    currency: {
      type: String,
      default: 'INR',
    },
    qrExpirationMinutes: {
      type: Number,
      default: 15,
      min: 1,
    },
  },
  {
    timestamps: true,
  }
);

// Helper to get or create the singleton settings document
settingsSchema.statics.getSettings = async function () {
  let doc = await this.findOne();
  if (!doc) {
    doc = await this.create({});
  }
  return doc;
};

module.exports = mongoose.models.Settings || mongoose.model('Settings', settingsSchema);
