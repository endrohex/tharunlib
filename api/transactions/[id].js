const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PATCH,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Transaction ID required' });
  }

  await initDB();
  const Transaction = getModel('Transaction');
  const Book = getModel('Book');
  const Settings = getModel('Settings');

  if (req.method === 'GET') {
    try {
      let transaction = await Transaction.findById(id);
      if (!transaction) {
        transaction = await Transaction.findOne({ transactionId: id });
      }

      if (!transaction) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      const [book, settings] = await Promise.all([
        Book.findById(transaction.bookId),
        Settings.getSettings(),
      ]);

      return res.status(200).json({
        success: true,
        transaction,
        book,
        library: {
          name: settings.libraryName,
          address: settings.libraryAddress,
          phone: settings.libraryPhone,
          email: settings.libraryEmail,
        },
      });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'PATCH') {
    try {
      await authenticateAdmin(req);
      const { paymentStatus } = req.body || {};

      if (!paymentStatus) {
        return res.status(400).json({ success: false, error: 'Valid paymentStatus required' });
      }

      let tx = await Transaction.findById(id);
      if (!tx) {
        tx = await Transaction.findOne({ transactionId: id });
      }

      if (!tx) {
        return res.status(404).json({ success: false, error: 'Transaction not found' });
      }

      tx.paymentStatus = paymentStatus;
      await tx.save();

      return res.status(200).json({
        success: true,
        message: 'Payment status updated',
        transaction: tx,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
