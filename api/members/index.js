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
    const Member = getModel('Member');
    const Transaction = getModel('Transaction');

    const { search, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      const cleanSearch = sanitizeString(search);
      query.$or = [
        { name: { $regex: cleanSearch, $options: 'i' } },
        { phone: { $regex: cleanSearch, $options: 'i' } },
        { email: { $regex: cleanSearch, $options: 'i' } },
        { memberId: { $regex: cleanSearch, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
    const skip = (pageNum - 1) * limitNum;

    const [members, total] = await Promise.all([
      Member.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      Member.countDocuments(query),
    ]);

    const memberIds = members.map((m) => m._id);
    const activeRentalsCounts = await Transaction.aggregate([
      {
        $match: {
          memberId: { $in: memberIds },
          type: 'RENT',
          returned: false,
        },
      },
    ]);

    const totalTxCounts = await Transaction.aggregate([
      {
        $match: {
          memberId: { $in: memberIds },
        },
      },
    ]);

    const activeMap = {};
    activeRentalsCounts.forEach((c) => {
      activeMap[c._id.toString()] = c.count;
    });

    const txMap = {};
    totalTxCounts.forEach((c) => {
      txMap[c._id.toString()] = c.count;
    });

    const enrichedMembers = members.map((m) => {
      const idStr = m._id.toString();
      return {
        ...m,
        activeRentals: activeMap[idStr] || 0,
        totalTransactions: txMap[idStr] || 0,
      };
    });

    return res.status(200).json({
      success: true,
      members: enrichedMembers,
      total,
      page: pageNum,
      totalPages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error('Fetch members error:', err);
    return res.status(500).json({ success: false, error: err.message });
  }
};
