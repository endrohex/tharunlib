const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  const { token } = req.query;
  if (!token) {
    return res.status(400).json({ success: false, error: 'Session token required' });
  }

  await initDB();
  const QRSession = getModel('QRSession');
  const Book = getModel('Book');
  const Settings = getModel('Settings');

  const qrSession = await QRSession.findOne({ sessionToken: token });
  if (!qrSession) {
    return res.status(404).json({
      success: false,
      code: 'NOT_FOUND',
      error: 'Registration QR session not found or invalid.',
    });
  }

  if (req.method === 'POST') {
    try {
      await authenticateAdmin(req);
      qrSession.status = 'CANCELLED';
      await qrSession.save();
      return res.status(200).json({
        success: true,
        message: 'QR session cancelled successfully',
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'GET') {
    try {
      const now = new Date();

      if (qrSession.status === 'PENDING' && new Date(qrSession.expiresAt) < now) {
        qrSession.status = 'EXPIRED';
        await qrSession.save();
      }

      if (qrSession.status === 'EXPIRED') {
        return res.status(410).json({
          success: false,
          code: 'EXPIRED',
          error: 'This registration QR has expired. Please ask the library staff for a new QR code.',
        });
      }

      if (qrSession.status === 'CANCELLED') {
        return res.status(410).json({
          success: false,
          code: 'CANCELLED',
          error: 'This registration session was cancelled.',
        });
      }

      if (qrSession.status === 'COMPLETED') {
        return res.status(200).json({
          success: true,
          status: 'COMPLETED',
          completedAt: qrSession.completedAt,
          transactionId: qrSession.completedTransactionId,
          customerName: qrSession.completedCustomerName,
          bookName: qrSession.bookName,
        });
      }

      const [book, settings] = await Promise.all([
        Book.findById(qrSession.bookId),
        Settings.getSettings(),
      ]);

      if (!book) {
        return res.status(404).json({ success: false, error: 'Associated book not found' });
      }

      return res.status(200).json({
        success: true,
        status: 'PENDING',
        session: {
          sessionToken: qrSession.sessionToken,
          transactionType: qrSession.transactionType,
          rentalDuration: qrSession.rentalDuration,
          amount: qrSession.amount,
          expiresAt: qrSession.expiresAt,
          book: {
            id: book._id,
            title: book.title,
            author: book.author,
            isbn: book.isbn,
            category: book.category,
            description: book.description,
            coverImage: book.coverImage,
            availableCopies: book.availableCopies,
            rentalPrice: book.rentalPrice,
            purchasePrice: book.purchasePrice,
          },
          library: {
            name: settings.libraryName,
            address: settings.libraryAddress,
            phone: settings.libraryPhone,
            email: settings.libraryEmail,
            upiEnabled: settings.upiEnabled,
            upiId: settings.upiId,
            upiName: settings.upiName,
            upiQrImage: settings.upiQrImage,
          },
        },
      });
    } catch (err) {
      console.error('Fetch QR session error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
