const mongoose = require('mongoose');

const bookSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Book title is required'],
      trim: true,
      maxlength: 200,
    },
    author: {
      type: String,
      required: [true, 'Author is required'],
      trim: true,
      maxlength: 120,
    },
    isbn: {
      type: String,
      trim: true,
      default: '',
    },
    category: {
      type: String,
      trim: true,
      default: 'General',
    },
    description: {
      type: String,
      trim: true,
      default: '',
      maxlength: 2000,
    },
    coverImage: {
      type: String,
      trim: true,
      default: '',
    },
    totalCopies: {
      type: Number,
      required: true,
      min: [0, 'Total copies cannot be negative'],
      default: 1,
    },
    availableCopies: {
      type: Number,
      required: true,
      min: [0, 'Available copies cannot be negative'],
      default: 1,
    },
    purchasePrice: {
      type: Number,
      min: [0, 'Purchase price cannot be negative'],
      default: 0,
    },
    rentalPrice: {
      type: Number,
      min: [0, 'Rental price cannot be negative'],
      default: 0,
    },
    status: {
      type: String,
      enum: ['available', 'out_of_stock', 'disabled'],
      default: 'available',
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for high-performance searching
bookSchema.index({ title: 'text', author: 'text', category: 'text' });
bookSchema.index({ status: 1 });
bookSchema.index({ isbn: 1 });

// Helper to auto-sync status based on available copies
bookSchema.pre('save', function (next) {
  if (this.status !== 'disabled') {
    if (this.availableCopies <= 0) {
      this.status = 'out_of_stock';
    } else {
      this.status = 'available';
    }
  }
  if (this.availableCopies > this.totalCopies) {
    this.availableCopies = this.totalCopies;
  }
  next();
});

module.exports = mongoose.models.Book || mongoose.model('Book', bookSchema);
