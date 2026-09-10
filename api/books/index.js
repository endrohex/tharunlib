const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');
const { sanitizeString } = require('../../lib/validation');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await initDB();
  const Book = getModel('Book');

  if (req.method === 'GET') {
    try {
      const { search, category, status, page = 1, limit = 50 } = req.query;
      const query = {};

      if (search) {
        const cleanSearch = sanitizeString(search);
        query.$or = [
          { title: { $regex: cleanSearch, $options: 'i' } },
          { author: { $regex: cleanSearch, $options: 'i' } },
          { isbn: { $regex: cleanSearch, $options: 'i' } },
        ];
      }

      if (category && category !== 'All') {
        query.category = sanitizeString(category);
      }

      if (status && status !== 'All') {
        query.status = sanitizeString(status);
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [books, total] = await Promise.all([
        Book.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Book.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        books,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    } catch (err) {
      console.error('Fetch books error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'POST') {
    try {
      await authenticateAdmin(req);

      const {
        title,
        author,
        isbn,
        category,
        description,
        coverImage,
        totalCopies,
        purchasePrice,
        rentalPrice,
      } = req.body || {};

      if (!title || !author) {
        return res.status(400).json({
          success: false,
          error: 'Title and Author are required fields.',
        });
      }

      const cleanTotal = Math.max(0, parseInt(totalCopies, 10) || 1);
      const cleanPurchase = Math.max(0, parseFloat(purchasePrice) || 0);
      const cleanRental = Math.max(0, parseFloat(rentalPrice) || 0);

      const newBook = await Book.create({
        title: sanitizeString(title),
        author: sanitizeString(author),
        isbn: sanitizeString(isbn || ''),
        category: sanitizeString(category || 'General'),
        description: sanitizeString(description || ''),
        coverImage: coverImage || '',
        totalCopies: cleanTotal,
        availableCopies: cleanTotal,
        purchasePrice: cleanPurchase,
        rentalPrice: cleanRental,
        status: cleanTotal > 0 ? 'available' : 'out_of_stock',
      });

      return res.status(201).json({
        success: true,
        message: 'Book added successfully',
        book: newBook,
      });
    } catch (err) {
      console.error('Create book error:', err);
      return res.status(err.statusCode || 500).json({
        success: false,
        error: err.message || 'Failed to create book',
      });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
