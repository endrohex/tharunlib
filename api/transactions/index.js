const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');
const {
  sanitizeString,
  isValidPhone,
  isValidEmail,
  generateTransactionId,
  generateMemberId,
} = require('../../lib/validation');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await initDB();
  const Transaction = getModel('Transaction');
  const Book = getModel('Book');
  const Member = getModel('Member');
  const QRSession = getModel('QRSession');

  // GET: Admin transaction ledger
  if (req.method === 'GET') {
    try {
      await authenticateAdmin(req);

      const {
        search,
        type,
        status,
        paymentStatus,
        page = 1,
        limit = 50,
      } = req.query;

      const query = {};

      if (search) {
        const cleanSearch = sanitizeString(search);
        query.$or = [
          { transactionId: { $regex: cleanSearch, $options: 'i' } },
          { memberName: { $regex: cleanSearch, $options: 'i' } },
          { memberPhone: { $regex: cleanSearch, $options: 'i' } },
          { bookName: { $regex: cleanSearch, $options: 'i' } },
        ];
      }

      if (type && ['BUY', 'RENT'].includes(type)) {
        query.type = type;
      }

      if (paymentStatus && paymentStatus !== 'All') {
        query.paymentStatus = paymentStatus;
      }

      const now = new Date();
      if (status === 'Active') {
        query.type = 'RENT';
        query.returned = false;
        query.rentalDueDate = { $gte: now };
      } else if (status === 'Overdue') {
        query.type = 'RENT';
        query.returned = false;
        query.rentalDueDate = { $lt: now };
      } else if (status === 'Returned') {
        query.returned = true;
      }

      const pageNum = Math.max(1, parseInt(page, 10) || 1);
      const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 50));
      const skip = (pageNum - 1) * limitNum;

      const [transactions, total] = await Promise.all([
        Transaction.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
        Transaction.countDocuments(query),
      ]);

      return res.status(200).json({
        success: true,
        transactions,
        total,
        page: pageNum,
        totalPages: Math.ceil(total / limitNum) || 1,
      });
    } catch (err) {
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  // POST: Create transaction (Customer QR registration or Admin checkout)
  if (req.method === 'POST') {
    try {
      const {
        sessionToken,
        bookId,
        customerName,
        customerPhone,
        customerEmail,
        customerAddress,
        type,
        rentalDuration,
        paymentReference,
        paymentStatus,
      } = req.body || {};

      if (!customerName || !customerName.trim()) {
        return res.status(400).json({ success: false, error: 'Full name is required.' });
      }

      if (!customerPhone || !isValidPhone(customerPhone)) {
        return res
          .status(400)
          .json({ success: false, error: 'A valid phone number (at least 10 digits) is required.' });
      }

      if (customerEmail && !isValidEmail(customerEmail)) {
        return res.status(400).json({ success: false, error: 'Invalid email address format.' });
      }

      let qrSession = null;
      if (sessionToken) {
        qrSession = await QRSession.findOne({ sessionToken });
        if (!qrSession) {
          return res.status(400).json({ success: false, error: 'Invalid registration QR session.' });
        }
        if (qrSession.status === 'COMPLETED') {
          return res
            .status(400)
            .json({ success: false, error: 'This QR session has already been completed.' });
        }
        if (qrSession.status === 'CANCELLED') {
          return res.status(400).json({ success: false, error: 'This QR session was cancelled.' });
        }
        if (new Date(qrSession.expiresAt) < new Date()) {
          qrSession.status = 'EXPIRED';
          await qrSession.save();
          return res.status(400).json({
            success: false,
            error: 'This registration QR has expired. Please ask library staff for a new QR code.',
          });
        }
      }

      const resolvedBookId = qrSession ? qrSession.bookId : bookId;
      const resolvedType = qrSession ? qrSession.transactionType : type;
      let resolvedDuration = qrSession ? qrSession.rentalDuration : rentalDuration;

      if (!resolvedBookId) {
        return res.status(400).json({ success: false, error: 'Book ID is required.' });
      }

      if (!['BUY', 'RENT'].includes(resolvedType)) {
        return res.status(400).json({ success: false, error: 'Invalid transaction type.' });
      }

      if (resolvedType === 'RENT') {
        resolvedDuration = Math.max(1, parseInt(resolvedDuration, 10) || 7);
      } else {
        resolvedDuration = null;
      }

      const updatedBook = await Book.findOneAndUpdate(
        {
          _id: resolvedBookId,
          availableCopies: { $gt: 0 },
        },
        {
          $inc: { availableCopies: -1 },
        },
        { new: true }
      );

      if (!updatedBook) {
        return res.status(400).json({
          success: false,
          error: 'No copies of this book are currently available.',
        });
      }

      const cleanPhone = customerPhone.replace(/[\s\-\(\)]/g, '').trim();
      const cleanEmail = customerEmail ? customerEmail.trim().toLowerCase() : '';

      const memberQuery = [{ phone: cleanPhone }];
      if (cleanEmail) memberQuery.push({ email: cleanEmail });

      let member = await Member.findOne({ $or: memberQuery });

      if (!member) {
        member = await Member.create({
          memberId: generateMemberId(),
          name: sanitizeString(customerName),
          phone: cleanPhone,
          email: cleanEmail,
          address: sanitizeString(customerAddress || ''),
        });
      } else {
        let memberUpdated = false;
        if (customerAddress && !member.address) {
          member.address = sanitizeString(customerAddress);
          memberUpdated = true;
        }
        if (cleanEmail && !member.email) {
          member.email = cleanEmail;
          memberUpdated = true;
        }
        if (memberUpdated && member.save) await member.save();
      }

      const startDate = new Date();
      let dueDate = null;
      if (resolvedType === 'RENT') {
        dueDate = new Date(startDate.getTime() + resolvedDuration * 24 * 60 * 60 * 1000);
      }

      const amount = resolvedType === 'BUY' ? updatedBook.purchasePrice : updatedBook.rentalPrice;

      let determinedPaymentStatus = 'NOT_REQUIRED';
      if (amount > 0) {
        if (paymentReference && paymentReference.trim()) {
          determinedPaymentStatus = 'CUSTOMER_MARKED_PAID';
        } else if (paymentStatus) {
          determinedPaymentStatus = paymentStatus;
        } else {
          determinedPaymentStatus = 'PENDING';
        }
      }

      const transactionId = generateTransactionId();
      const transaction = await Transaction.create({
        transactionId,
        memberId: member._id,
        bookId: updatedBook._id,
        memberName: member.name,
        memberPhone: member.phone,
        memberEmail: member.email,
        bookName: updatedBook.title,
        type: resolvedType,
        rentalDuration: resolvedDuration,
        rentalStartDate: startDate,
        rentalDueDate: dueDate,
        returned: false,
        amount,
        paymentMethod: 'UPI',
        paymentStatus: determinedPaymentStatus,
        paymentReference: sanitizeString(paymentReference || ''),
        qrSessionId: qrSession ? qrSession.sessionToken : null,
      });

      if (qrSession) {
        qrSession.status = 'COMPLETED';
        qrSession.completedAt = new Date();
        qrSession.completedTransactionId = transactionId;
        qrSession.completedCustomerName = member.name;
        await qrSession.save();
      }

      return res.status(201).json({
        success: true,
        message: 'Registration completed successfully',
        transactionId: transaction.transactionId,
        transaction,
        member,
        book: {
          id: updatedBook._id,
          title: updatedBook.title,
          author: updatedBook.author,
          availableCopies: updatedBook.availableCopies,
        },
      });
    } catch (err) {
      console.error('Transaction creation error:', err);
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
