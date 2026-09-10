const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');
const { generateSessionToken } = require('../../lib/validation');

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

    const { bookId, transactionType = 'RENT', rentalDuration = 7 } = req.body || {};

    if (!bookId) {
      return res.status(400).json({ success: false, error: 'Book ID is required' });
    }

    if (!['BUY', 'RENT'].includes(transactionType)) {
      return res.status(400).json({ success: false, error: 'Transaction type must be BUY or RENT' });
    }

    await initDB();
    const Book = getModel('Book');
    const QRSession = getModel('QRSession');
    const Settings = getModel('Settings');

    const book = await Book.findById(bookId);
    if (!book) {
      return res.status(404).json({ success: false, error: 'Book not found' });
    }

    if (book.availableCopies <= 0) {
      return res.status(400).json({
        success: false,
        error: 'No copies of this book are currently available for purchase or rental.',
      });
    }

    const settings = await Settings.getSettings();
    const expiryMinutes = settings.qrExpirationMinutes || 15;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000);

    const sessionToken = generateSessionToken();

    const duration = transactionType === 'RENT' ? Math.max(1, parseInt(rentalDuration, 10) || 7) : null;
    const amount = transactionType === 'BUY' ? book.purchasePrice : book.rentalPrice;

    const qrSession = await QRSession.create({
      sessionToken,
      bookId: book._id,
      bookName: book.title,
      bookCover: book.coverImage || '',
      author: book.author,
      amount,
      transactionType,
      rentalDuration: duration,
      status: 'PENDING',
      expiresAt,
    });

    const protocol = req.headers['x-forwarded-proto'] || 'http';
    const host = req.headers['x-forwarded-host'] || req.headers.host;
    const origin = process.env.PUBLIC_BASE_URL || (host ? `${protocol}://${host}` : 'http://localhost:3000');
    const registrationUrl = `${origin}/register.html?session=${sessionToken}`;

    return res.status(201).json({
      success: true,
      sessionToken,
      registrationUrl,
      expiresAt,
      session: {
        id: qrSession._id,
        sessionToken,
        bookId: book._id,
        bookName: book.title,
        bookCover: book.coverImage,
        author: book.author,
        transactionType,
        rentalDuration: duration,
        amount,
        status: qrSession.status,
        expiresAt: qrSession.expiresAt,
      },
    });
  } catch (err) {
    console.error('Create QR session error:', err);
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};
