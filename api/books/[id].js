const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');
const { sanitizeString } = require('../../lib/validation');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,DELETE,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Valid Book ID required' });
  }

  await initDB();
  const Book = getModel('Book');
  const Transaction = getModel('Transaction');

  if (req.method === 'GET') {
    try {
      const book = await Book.findById(id);
      if (!book) {
        return res.status(404).json({ success: false, error: 'Book not found' });
      }
      return res.status(200).json({ success: true, book });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  try {
    await authenticateAdmin(req);
  } catch (authErr) {
    return res.status(authErr.statusCode || 401).json({ success: false, error: authErr.message });
  }

  if (req.method === 'PUT') {
    try {
      const {
        title,
        author,
        isbn,
        category,
        description,
        coverImage,
        totalCopies,
        availableCopies,
        purchasePrice,
        rentalPrice,
        status,
      } = req.body || {};

      const book = await Book.findById(id);
      if (!book) {
        return res.status(404).json({ success: false, error: 'Book not found' });
      }

      if (title) book.title = sanitizeString(title);
      if (author) book.author = sanitizeString(author);
      if (isbn !== undefined) book.isbn = sanitizeString(isbn);
      if (category) book.category = sanitizeString(category);
      if (description !== undefined) book.description = sanitizeString(description);
      if (coverImage !== undefined) book.coverImage = coverImage;

      if (totalCopies !== undefined) {
        const newTotal = Math.max(0, parseInt(totalCopies, 10));
        const diff = newTotal - book.totalCopies;
        book.totalCopies = newTotal;
        book.availableCopies = Math.max(0, Math.min(newTotal, (book.availableCopies || 0) + diff));
      }

      if (availableCopies !== undefined) {
        const newAvail = Math.max(0, parseInt(availableCopies, 10));
        book.availableCopies = Math.min(book.totalCopies, newAvail);
      }

      if (purchasePrice !== undefined) {
        book.purchasePrice = Math.max(0, parseFloat(purchasePrice) || 0);
      }
      if (rentalPrice !== undefined) {
        book.rentalPrice = Math.max(0, parseFloat(rentalPrice) || 0);
      }

      if (status && ['available', 'out_of_stock', 'disabled'].includes(status)) {
        book.status = status;
      } else {
        book.status = book.availableCopies > 0 ? 'available' : 'out_of_stock';
      }

      await book.save();

      return res.status(200).json({
        success: true,
        message: 'Book updated successfully',
        book,
      });
    } catch (err) {
      console.error('Update book error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'DELETE') {
    try {
      const activeRentals = await Transaction.countDocuments({
        bookId: id,
        type: 'RENT',
        returned: false,
      });

      if (activeRentals > 0) {
        return res.status(400).json({
          success: false,
          error: `Cannot delete book. There are currently ${activeRentals} active rental(s) for this book.`,
        });
      }

      await Book.findByIdAndDelete(id);
      return res.status(200).json({
        success: true,
        message: 'Book deleted successfully',
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
