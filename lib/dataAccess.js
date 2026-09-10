const connectToDatabase = require('./mongodb');
const MongooseBook = require('../models/Book');
const MongooseMember = require('../models/Member');
const MongooseTransaction = require('../models/Transaction');
const MongooseQRSession = require('../models/QRSession');
const MongooseAdmin = require('../models/Admin');
const MongooseSettings = require('../models/Settings');
const mockStore = require('./mockStore');
const crypto = require('crypto');

let useFallback = false;
let lastAttempt = 0;

async function initDB() {
  const now = Date.now();
  if (useFallback && now - lastAttempt < 60000) {
    return;
  }
  lastAttempt = now;

  try {
    await connectToDatabase();
    useFallback = false;
  } catch (err) {
    if (!useFallback) {
      console.log('⚡ Operating in local store mode until MongoDB Atlas IP access (0.0.0.0/0) is configured.');
    }
    useFallback = true;
  }
}

// Chainable query builder helper for fallback
function createQueryBuilder(items) {
  let result = [...items];
  let skipCount = 0;
  let limitCount = result.length;

  const builder = {
    sort(sortObj = {}) {
      const field = Object.keys(sortObj)[0];
      if (field) {
        const order = sortObj[field] === -1 ? -1 : 1;
        result.sort((a, b) => {
          if (a[field] < b[field]) return -1 * order;
          if (a[field] > b[field]) return 1 * order;
          return 0;
        });
      }
      return builder;
    },
    skip(n = 0) {
      skipCount = Math.max(0, parseInt(n, 10) || 0);
      return builder;
    },
    limit(n = 50) {
      limitCount = Math.max(1, parseInt(n, 10) || 50);
      return builder;
    },
    lean: async () => {
      return result.slice(skipCount, skipCount + limitCount);
    },
    then: (resolve, reject) => {
      return Promise.resolve(result.slice(skipCount, skipCount + limitCount)).then(resolve, reject);
    },
  };
  return builder;
}

// Fallback Book operations
const MockBook = {
  find(query = {}) {
    let items = [...mockStore.books];
    if (query.category && query.category !== 'All') items = items.filter(b => b.category === query.category);
    if (query.status && query.status !== 'All') items = items.filter(b => b.status === query.status);
    if (query.$or) {
      items = items.filter(b => {
        return query.$or.some(cond => {
          const key = Object.keys(cond)[0];
          const regex = cond[key].$regex;
          return b[key] && new RegExp(regex, 'i').test(b[key]);
        });
      });
    }
    if (query.availableCopies && query.availableCopies.$lte !== undefined) {
      items = items.filter(b => (b.availableCopies || 0) <= query.availableCopies.$lte);
    }
    return createQueryBuilder(items);
  },
  async findById(id) {
    const item = mockStore.books.find(b => String(b._id) === String(id));
    if (!item) return null;
    return {
      ...item,
      save: async function () {
        const idx = mockStore.books.findIndex(b => String(b._id) === String(id));
        if (idx !== -1) mockStore.books[idx] = { ...mockStore.books[idx], ...this };
        return this;
      },
    };
  },
  async findOneAndUpdate(filter, update, options = {}) {
    const book = mockStore.books.find(b => String(b._id) === String(filter._id) && b.availableCopies > 0);
    if (!book) return null;
    if (update.$inc && update.$inc.availableCopies) {
      book.availableCopies += update.$inc.availableCopies;
      if (book.availableCopies <= 0) book.status = 'out_of_stock';
      else book.status = 'available';
    }
    return {
      ...book,
      save: async () => book,
    };
  },
  async findByIdAndUpdate(id, update, options = {}) {
    const book = mockStore.books.find(b => String(b._id) === String(id));
    if (!book) return null;
    if (update.$inc && update.$inc.availableCopies) {
      book.availableCopies += update.$inc.availableCopies;
      if (book.availableCopies > 0 && book.status === 'out_of_stock') book.status = 'available';
    }
    return {
      ...book,
      save: async () => book,
    };
  },
  async findByIdAndDelete(id) {
    const idx = mockStore.books.findIndex(b => String(b._id) === String(id));
    if (idx !== -1) mockStore.books.splice(idx, 1);
    return true;
  },
  async create(data) {
    const newBook = {
      _id: crypto.randomBytes(12).toString('hex'),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStore.books.unshift(newBook);
    return newBook;
  },
  async countDocuments(query = {}) {
    let items = [...mockStore.books];
    if (query.category) items = items.filter(b => b.category === query.category);
    if (query.status) items = items.filter(b => b.status === query.status);
    return items.length;
  },
  async aggregate(pipeline) {
    const total = mockStore.books.reduce((acc, b) => acc + (b.availableCopies || 0), 0);
    return [{ _id: null, total }];
  },
};

// Fallback Member operations
const MockMember = {
  find(query = {}) {
    let items = [...mockStore.members];
    if (query.$or) {
      items = items.filter(m => {
        return query.$or.some(cond => {
          const key = Object.keys(cond)[0];
          const regex = cond[key].$regex;
          return m[key] && new RegExp(regex, 'i').test(m[key]);
        });
      });
    }
    return createQueryBuilder(items);
  },
  async findById(id) {
    const m = mockStore.members.find(x => String(x._id) === String(id));
    return m ? { ...m } : null;
  },
  async findOne(query) {
    if (query.$or) {
      return mockStore.members.find(m => {
        return query.$or.some(c => {
          if (c.phone && m.phone === c.phone) return true;
          if (c.email && m.email === c.email) return true;
          return false;
        });
      }) || null;
    }
    return null;
  },
  async create(data) {
    const newMember = {
      _id: crypto.randomBytes(12).toString('hex'),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStore.members.unshift(newMember);
    return newMember;
  },
  async countDocuments() {
    return mockStore.members.length;
  },
};

// Fallback Transaction operations
const MockTransaction = {
  find(query = {}) {
    let items = [...mockStore.transactions];
    if (query.memberId) items = items.filter(t => String(t.memberId) === String(query.memberId));
    if (query.type) items = items.filter(t => t.type === query.type);
    if (query.returned !== undefined) items = items.filter(t => t.returned === query.returned);
    if (query.paymentStatus && query.paymentStatus !== 'All') items = items.filter(t => t.paymentStatus === query.paymentStatus);
    if (query.$or) {
      items = items.filter(t => {
        return query.$or.some(cond => {
          const key = Object.keys(cond)[0];
          const regex = cond[key].$regex;
          return t[key] && new RegExp(regex, 'i').test(t[key]);
        });
      });
    }
    if (query.rentalDueDate && query.rentalDueDate.$lt) {
      items = items.filter(t => t.rentalDueDate && new Date(t.rentalDueDate) < query.rentalDueDate.$lt);
    }
    return createQueryBuilder(items);
  },
  async findById(id) {
    const tx = mockStore.transactions.find(t => String(t._id) === String(id) || t.transactionId === id);
    if (!tx) return null;
    return {
      ...tx,
      save: async function () {
        const idx = mockStore.transactions.findIndex(t => String(t._id) === String(tx._id));
        if (idx !== -1) mockStore.transactions[idx] = { ...mockStore.transactions[idx], ...this };
        return this;
      },
    };
  },
  async findOne(query) {
    const tx = mockStore.transactions.find(t => t.transactionId === query.transactionId);
    if (!tx) return null;
    return {
      ...tx,
      save: async function () {
        const idx = mockStore.transactions.findIndex(t => String(t._id) === String(tx._id));
        if (idx !== -1) mockStore.transactions[idx] = { ...mockStore.transactions[idx], ...this };
        return this;
      },
    };
  },
  async create(data) {
    const newTx = {
      _id: crypto.randomBytes(12).toString('hex'),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStore.transactions.unshift(newTx);
    return newTx;
  },
  async countDocuments(query = {}) {
    let items = [...mockStore.transactions];
    if (query.type) items = items.filter(t => t.type === query.type);
    if (query.returned !== undefined) items = items.filter(t => t.returned === query.returned);
    if (query.bookId) items = items.filter(t => String(t.bookId) === String(query.bookId));
    if (query.rentalDueDate && query.rentalDueDate.$lt) {
      items = items.filter(t => t.rentalDueDate && new Date(t.rentalDueDate) < query.rentalDueDate.$lt);
    }
    if (query.createdAt && query.createdAt.$gte) {
      items = items.filter(t => new Date(t.createdAt) >= query.createdAt.$gte);
    }
    return items.length;
  },
  async aggregate(pipeline) {
    if (pipeline[0]?.$match?.memberId) {
      const ids = pipeline[0].$match.memberId.$in.map(String);
      const counts = {};
      mockStore.transactions.forEach(t => {
        if (ids.includes(String(t.memberId))) {
          if (pipeline[0].$match.returned === false && t.returned !== false) return;
          counts[String(t.memberId)] = (counts[String(t.memberId)] || 0) + 1;
        }
      });
      return Object.keys(counts).map(k => ({ _id: k, count: counts[k] }));
    }
    const total = mockStore.transactions.reduce((acc, t) => acc + (t.amount || 0), 0);
    return [{ _id: null, total }];
  },
};

// Fallback QRSession operations
const MockQRSession = {
  async create(data) {
    const session = {
      _id: crypto.randomBytes(12).toString('hex'),
      ...data,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    mockStore.qrSessions.push(session);
    return session;
  },
  async findOne(query) {
    const s = mockStore.qrSessions.find(x => x.sessionToken === query.sessionToken);
    if (!s) return null;
    return {
      ...s,
      save: async function () {
        const idx = mockStore.qrSessions.findIndex(x => x.sessionToken === s.sessionToken);
        if (idx !== -1) mockStore.qrSessions[idx] = { ...mockStore.qrSessions[idx], ...this };
        return this;
      },
    };
  },
};

// Fallback Settings
const MockSettings = {
  async getSettings() {
    return {
      ...mockStore.settings,
      save: async function () {
        mockStore.settings = { ...mockStore.settings, ...this };
        return this;
      },
    };
  },
};

// Fallback Admin
const MockAdmin = {
  async findOne() {
    return { email: 'admin@library.org', role: 'admin', name: 'Library Administrator' };
  },
  async countDocuments() {
    return 1;
  },
  async create(data) {
    return data;
  },
};

module.exports = {
  initDB,
  isFallback: () => useFallback,
  getModel: (modelName) => {
    if (!useFallback) {
      switch (modelName) {
        case 'Book': return MongooseBook;
        case 'Member': return MongooseMember;
        case 'Transaction': return MongooseTransaction;
        case 'QRSession': return MongooseQRSession;
        case 'Settings': return MongooseSettings;
        case 'Admin': return MongooseAdmin;
      }
    }
    switch (modelName) {
      case 'Book': return MockBook;
      case 'Member': return MockMember;
      case 'Transaction': return MockTransaction;
      case 'QRSession': return MockQRSession;
      case 'Settings': return MockSettings;
      case 'Admin': return MockAdmin;
    }
  },
};
