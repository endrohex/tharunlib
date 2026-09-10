const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');
const { sanitizeString } = require('../../lib/validation');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    await authenticateAdmin(req);
  } catch (authErr) {
    return res.status(authErr.statusCode || 401).json({ success: false, error: authErr.message });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await initDB();
    const Transaction = getModel('Transaction');

    const { status, search, page = 1, limit = 50 } = req.query;
    const query = { type: 'RENT' };

    const now = new Date();
    const twoDaysAhead = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);

    if (status === 'ACTIVE') {
      query.returned = false;
      query.rentalDueDate = { $gt: twoDaysAhead };
    } else if (status === 'DUE_SOON') {
      query.returned = false;
      query.rentalDueDate = { $gte: now, $lte: twoDaysAhead };
    } else if (status === 'OVERDUE') {
      query.returned = false;
      query.rentalDueDate = { $lt: now };
    } else if (status === 'RETURNED') {
      query.returned = true;
    }

    if (search) {
      const cleanSearch = sanitizeString(search);
      query.$or = [
        { memberName: { $regex: cleanSearch, $options: 'i' } },
        { memberPhone: { $regex: cleanSearch, $options: 'i' } },
        { bookName: { $regex: cleanSearch, $options: 'i' } },
        { transactionId: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [rentals, total] = await Promise.all([
      Transaction.find(query).sort({ rentalDueDate: 1 }).skip(skip).limit(limitNum).lean(),
      Transaction.countDocuments(query),
    ]);

    const enriched = rentals.map((r) => {
      let rentalStatus = 'ACTIVE';
      let daysRemaining = 0;

      if (r.returned) {
        rentalStatus = 'RETURNED';
      } else if (r.rentalDueDate) {
        const dueDate = new Date(r.rentalDueDate);
        const diffMs = dueDate - now;
        daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        if (diffMs < 0) {
          rentalStatus = 'OVERDUE';
        } else if (diffMs <= 2 * 24 * 60 * 60 * 1000) {
          rentalStatus = 'DUE_SOON';
        } else {
          rentalStatus = 'ACTIVE';
        }
      }

      return {
        ...r,
        rentalStatus,
        daysRemaining,
      };
    });

    return res.status(200).json({
      success: true,
      rentals: enriched,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error('Fetch rentals error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
