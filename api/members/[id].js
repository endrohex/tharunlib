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

  const { id } = req.query;
  if (!id) {
    return res.status(400).json({ success: false, error: 'Valid Member ID required' });
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    await initDB();
    const Member = getModel('Member');
    const Transaction = getModel('Transaction');

    const member = await Member.findById(id);
    if (!member) {
      return res.status(404).json({ success: false, error: 'Member not found' });
    }

    const transactions = await Transaction.find({ memberId: id })
      .sort({ createdAt: -1 })
      .lean();

    const now = new Date();

    let booksBought = 0;
    let booksRented = 0;
    let activeRentals = 0;
    let returnedBooks = 0;
    let overdueBooks = 0;
    let totalAmountSpent = 0;

    transactions.forEach((tx) => {
      totalAmountSpent += tx.amount || 0;
      if (tx.type === 'BUY') {
        booksBought++;
      } else if (tx.type === 'RENT') {
        booksRented++;
        if (tx.returned) {
          returnedBooks++;
        } else {
          activeRentals++;
          if (tx.rentalDueDate && new Date(tx.rentalDueDate) < now) {
            overdueBooks++;
          }
        }
      }
    });

    const stats = {
      totalTransactions: transactions.length,
      booksBought,
      booksRented,
      activeRentals,
      returnedBooks,
      overdueBooks,
      totalAmountSpent,
    };

    return res.status(200).json({
      success: true,
      member,
      stats,
      transactions,
    });
  } catch (err) {
    console.error('Fetch member profile error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
