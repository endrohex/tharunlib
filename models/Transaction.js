const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema(
  {
    transactionId: {
      type: String,
      unique: true,
      required: true,
    },
    memberId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Member',
      required: true,
      index: true,
    },
    bookId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Book',
      required: true,
      index: true,
    },
    memberName: {
      type: String,
      required: true,
    },
    memberPhone: {
      type: String,
      required: true,
    },
    memberEmail: {
      type: String,
      default: '',
    },
    bookName: {
      type: String,
      required: true,
    },
    type: {
      type: String,
      enum: ['BUY', 'RENT'],
      required: true,
      index: true,
    },
    rentalDuration: {
      type: Number, // duration in days
      default: null,
    },
    rentalStartDate: {
      type: Date,
      default: null,
    },
    rentalDueDate: {
      type: Date,
      default: null,
    },
    returned: {
      type: Boolean,
      default: false,
      index: true,
    },
    returnedAt: {
      type: Date,
      default: null,
    },
    amount: {
      type: Number,
      min: 0,
      default: 0,
    },
    paymentMethod: {
      type: String,
      default: 'UPI',
    },
    paymentStatus: {
      type: String,
      enum: ['NOT_REQUIRED', 'PENDING', 'CUSTOMER_MARKED_PAID', 'VERIFIED', 'FAILED'],
      default: 'NOT_REQUIRED',
      index: true,
    },
    paymentReference: {
      type: String,
      trim: true,
      default: '',
    },
    qrSessionId: {
      type: String,
      default: null,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

transactionSchema.index({ createdAt: -1 });
transactionSchema.index({ rentalDueDate: 1, returned: 1 });

module.exports = mongoose.models.Transaction || mongoose.model('Transaction', transactionSchema);
