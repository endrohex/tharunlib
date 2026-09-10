const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');

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
    const Book = getModel('Book');
    const Member = getModel('Member');
    const Transaction = getModel('Transaction');

    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    const [
      totalBooks,
      availableCopiesAgg,
      totalMembers,
      activeRentals,
      overdueRentals,
      todayTransactions,
      revenueAgg,
      recentTransactions,
      lowStockBooks,
      overdueList,
    ] = await Promise.all([
      Book.countDocuments(),
      Book.aggregate([{ $group: { _id: null, total: { $sum: '$availableCopies' } } }]),
      Member.countDocuments(),
      Transaction.countDocuments({ type: 'RENT', returned: false }),
      Transaction.countDocuments({
        type: 'RENT',
        returned: false,
        rentalDueDate: { $lt: now },
      }),
      Transaction.countDocuments({ createdAt: { $gte: startOfToday } }),
      Transaction.aggregate([{ $group: { _id: null, total: { $sum: '$amount' } } }]),
      Transaction.find().sort({ createdAt: -1 }).limit(8).lean(),
      Book.find({ availableCopies: { $lte: 2 } }).limit(6).lean(),
      Transaction.find({ type: 'RENT', returned: false, rentalDueDate: { $lt: now } })
        .sort({ rentalDueDate: 1 })
        .limit(6)
        .lean(),
    ]);

    const availableCopies = availableCopiesAgg[0]?.total || 0;
    const totalRevenue = revenueAgg[0]?.total || 0;
    const latestTransactionTimestamp = recentTransactions[0]?.createdAt || null;

    return res.status(200).json({
      success: true,
      stats: {
        totalBooks,
        availableCopies,
        totalMembers,
        activeRentals,
        overdueRentals,
        todayTransactions,
        totalRevenue,
      },
      latestTransactionTimestamp,
      recentTransactions,
      lowStockBooks,
      overdueList,
    });
  } catch (err) {
    console.error('Dashboard summary error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
