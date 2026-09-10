const mongoose = require('mongoose');

const qrSessionSchema = new mongoose.Schema(
  {
    sessionToken: {
      type: String,
      unique: true,
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
    },
    bookName: {
      type: String,
      required: true,
    },
    bookCover: {
      type: String,
      default: '',
    },
    author: {
      type: String,
      default: '',
    },
    amount: {
      type: Number,
      default: 0,
    },
    transactionType: {
      type: String,
      enum: ['BUY', 'RENT'],
      required: true,
    },
    rentalDuration: {
      type: Number,
      default: 7,
    },
    status: {
      type: String,
      enum: ['PENDING', 'COMPLETED', 'EXPIRED', 'CANCELLED'],
      default: 'PENDING',
      index: true,
    },
    completedTransactionId: {
      type: String,
      default: null,
    },
    completedCustomerName: {
      type: String,
      default: null,
    },
    expiresAt: {
      type: Date,
      required: true,
    },
    completedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

// TTL index to automatically remove old sessions after 24 hours
qrSessionSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.models.QRSession || mongoose.model('QRSession', qrSessionSchema);
