const { initDB, getModel } = require('../../../lib/dataAccess');
const { authenticateAdmin } = require('../../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await authenticateAdmin(req);

    const { id } = req.query;
    if (!id) {
      return res.status(400).json({ success: false, error: 'Rental/Transaction ID required' });
    }

    await initDB();
    const Transaction = getModel('Transaction');
    const Book = getModel('Book');

    let transaction = await Transaction.findById(id);
    if (!transaction) {
      transaction = await Transaction.findOne({ transactionId: id });
    }

    if (!transaction) {
      return res.status(404).json({ success: false, error: 'Rental transaction not found' });
    }

    if (transaction.type !== 'RENT') {
      return res.status(400).json({ success: false, error: 'Transaction is not a rental' });
    }

    if (transaction.returned) {
      return res.status(400).json({
        success: false,
        error: 'Book is already marked as returned',
        returnedAt: transaction.returnedAt,
      });
    }

    transaction.returned = true;
    transaction.returnedAt = new Date();
    await transaction.save();

    const updatedBook = await Book.findByIdAndUpdate(
      transaction.bookId,
      {
        $inc: { availableCopies: 1 },
      },
      { new: true }
    );

    return res.status(200).json({
      success: true,
      message: 'Book marked as returned successfully',
      transaction,
      book: {
        id: updatedBook?._id,
        title: updatedBook?.title,
        availableCopies: updatedBook?.availableCopies,
      },
    });
  } catch (err) {
    console.error('Rental return error:', err);
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};
