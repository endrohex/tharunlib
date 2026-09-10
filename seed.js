require('dotenv').config();
const connectToDatabase = require('./lib/mongodb');
const Book = require('./models/Book');
const Member = require('./models/Member');
const Transaction = require('./models/Transaction');
const Settings = require('./models/Settings');
const { generateTransactionId, generateMemberId } = require('./lib/validation');

const sampleBooks = [
  {
    title: 'Atomic Habits',
    author: 'James Clear',
    isbn: '978-0735211292',
    category: 'Self-Help',
    description: 'An easy and proven way to build good habits and break bad ones.',
    coverImage: 'https://images.unsplash.com/photo-1544947950-fa07a98d237f?auto=format&fit=crop&q=80&w=300',
    totalCopies: 6,
    availableCopies: 5,
    purchasePrice: 499,
    rentalPrice: 49,
    status: 'available',
  },
  {
    title: 'Clean Code: A Handbook of Agile Software Craftsmanship',
    author: 'Robert C. Martin',
    isbn: '978-0132350884',
    category: 'Technology',
    description: 'Even bad code can function. But if code isn\'t clean, it can bring a development organization to its knees.',
    coverImage: 'https://images.unsplash.com/photo-1532012164546-f432f2e3777a?auto=format&fit=crop&q=80&w=300',
    totalCopies: 4,
    availableCopies: 3,
    purchasePrice: 850,
    rentalPrice: 85,
    status: 'available',
  },
  {
    title: 'The Psychology of Money',
    author: 'Morgan Housel',
    isbn: '978-9390166268',
    category: 'Business',
    description: 'Timeless lessons on wealth, greed, and happiness.',
    coverImage: 'https://images.unsplash.com/photo-1592496431122-2349e0fbc666?auto=format&fit=crop&q=80&w=300',
    totalCopies: 5,
    availableCopies: 4,
    purchasePrice: 399,
    rentalPrice: 39,
    status: 'available',
  },
  {
    title: 'Sapiens: A Brief History of Humankind',
    author: 'Yuval Noah Harari',
    isbn: '978-0062316097',
    category: 'History',
    description: 'Explore how biology and history have defined us and enhanced our understanding of what it means to be human.',
    coverImage: 'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&q=80&w=300',
    totalCopies: 5,
    availableCopies: 4,
    purchasePrice: 599,
    rentalPrice: 59,
    status: 'available',
  },
  {
    title: 'Deep Work: Rules for Focused Success in a Distracted World',
    author: 'Cal Newport',
    isbn: '978-1455586691',
    category: 'Self-Help',
    description: 'Master the ability to focus without distraction on a cognitively demanding task.',
    coverImage: 'https://images.unsplash.com/photo-1495446815901-a7297e633e8d?auto=format&fit=crop&q=80&w=300',
    totalCopies: 4,
    availableCopies: 3,
    purchasePrice: 450,
    rentalPrice: 45,
    status: 'available',
  },
  {
    title: 'Designing Data-Intensive Applications',
    author: 'Martin Kleppmann',
    isbn: '978-1449373320',
    category: 'Technology',
    description: 'The big ideas behind reliable, scalable, and maintainable systems.',
    coverImage: 'https://images.unsplash.com/photo-1512820790803-83ca734da794?auto=format&fit=crop&q=80&w=300',
    totalCopies: 3,
    availableCopies: 2,
    purchasePrice: 1200,
    rentalPrice: 120,
    status: 'available',
  },
  {
    title: 'Thinking, Fast and Slow',
    author: 'Daniel Kahneman',
    isbn: '978-0374533557',
    category: 'Non-Fiction',
    description: 'The systems of how our minds make choices: the fast, intuitive system and the slower, more deliberate system.',
    coverImage: 'https://images.unsplash.com/photo-1524995997946-a1c2e315a42f?auto=format&fit=crop&q=80&w=300',
    totalCopies: 4,
    availableCopies: 3,
    purchasePrice: 499,
    rentalPrice: 49,
    status: 'available',
  },
  {
    title: 'Zero to One: Notes on Startups, or How to Build the Future',
    author: 'Peter Thiel',
    isbn: '978-0804139298',
    category: 'Business',
    description: 'The great secret of our time is that there are still uncharted frontiers to explore and new inventions to create.',
    coverImage: 'https://images.unsplash.com/photo-1476275466078-4007374efbbe?auto=format&fit=crop&q=80&w=300',
    totalCopies: 5,
    availableCopies: 5,
    purchasePrice: 399,
    rentalPrice: 39,
    status: 'available',
  },
  {
    title: 'To Kill a Mockingbird',
    author: 'Harper Lee',
    isbn: '978-0060935467',
    category: 'Fiction',
    description: 'A classic of modern American literature, exploring themes of empathy and justice.',
    coverImage: 'https://images.unsplash.com/photo-1457369804613-52c61a468e7d?auto=format&fit=crop&q=80&w=300',
    totalCopies: 3,
    availableCopies: 1,
    purchasePrice: 299,
    rentalPrice: 29,
    status: 'available',
  },
  {
    title: 'The Great Gatsby',
    author: 'F. Scott Fitzgerald',
    isbn: '978-0743273565',
    category: 'Fiction',
    description: 'A portrait of the Jazz Age in all its decadence and excess.',
    coverImage: 'https://images.unsplash.com/photo-1543002588-bfa74002ed7e?auto=format&fit=crop&q=80&w=300',
    totalCopies: 4,
    availableCopies: 3,
    purchasePrice: 250,
    rentalPrice: 25,
    status: 'available',
  },
];

const sampleMembers = [
  { name: 'Rahul Sharma', phone: '9876543210', email: 'rahul.sharma@example.com', address: '12 Green Park, Sector 4' },
  { name: 'Priya Patel', phone: '9811223344', email: 'priya.patel@example.com', address: '45 Lake View Residency' },
  { name: 'Arjun Mehta', phone: '9899001122', email: 'arjun.mehta@example.com', address: '88 Cyber Hub Apartments' },
  { name: 'Ananya Verma', phone: '9711556677', email: 'ananya.verma@example.com', address: '101 Rosewood Lane' },
  { name: 'Karthik Nair', phone: '9655443322', email: 'karthik.nair@example.com', address: '22 Marine Drive, Apt 5B' },
];

async function seed() {
  console.log('🌱 Starting Library Demo Data Seeder...');
  try {
    await connectToDatabase();

    // 1. Settings
    console.log('Configuring default library settings...');
    await Settings.deleteMany({});
    await Settings.create({
      libraryName: 'Central City Public Library',
      libraryAddress: '124 Readers Avenue, Knowledge City',
      libraryPhone: '+91 98765 43210',
      libraryEmail: 'admin@library.org',
      defaultRentalDuration: 7,
      maximumRentalDuration: 30,
      gracePeriod: 2,
      upiEnabled: true,
      upiId: 'library@upi',
      upiName: 'Central City Library',
      qrExpirationMinutes: 15,
    });

    // 2. Books
    console.log('Seeding 10 sample books...');
    await Book.deleteMany({});
    const createdBooks = await Book.insertMany(sampleBooks);
    console.log(`✅ Created ${createdBooks.length} books`);

    // 3. Members
    console.log('Seeding 5 sample members...');
    await Member.deleteMany({});
    const membersWithIds = sampleMembers.map((m) => ({
      ...m,
      memberId: generateMemberId(),
    }));
    const createdMembers = await Member.insertMany(membersWithIds);
    console.log(`✅ Created ${createdMembers.length} members`);

    // 4. Sample Transactions
    console.log('Seeding 10 sample transactions...');
    await Transaction.deleteMany({});

    const now = new Date();
    const dayMs = 24 * 60 * 60 * 1000;

    const sampleTransactions = [
      // 1. Active Rental (normal)
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[0]._id,
        bookId: createdBooks[0]._id,
        memberName: createdMembers[0].name,
        memberPhone: createdMembers[0].phone,
        memberEmail: createdMembers[0].email,
        bookName: createdBooks[0].title,
        type: 'RENT',
        rentalDuration: 7,
        rentalStartDate: new Date(now.getTime() - 2 * dayMs),
        rentalDueDate: new Date(now.getTime() + 5 * dayMs),
        returned: false,
        amount: createdBooks[0].rentalPrice,
        paymentStatus: 'VERIFIED',
      },
      // 2. Overdue Rental
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[1]._id,
        bookId: createdBooks[1]._id,
        memberName: createdMembers[1].name,
        memberPhone: createdMembers[1].phone,
        memberEmail: createdMembers[1].email,
        bookName: createdBooks[1].title,
        type: 'RENT',
        rentalDuration: 7,
        rentalStartDate: new Date(now.getTime() - 10 * dayMs),
        rentalDueDate: new Date(now.getTime() - 3 * dayMs),
        returned: false,
        amount: createdBooks[1].rentalPrice,
        paymentStatus: 'VERIFIED',
      },
      // 3. Returned Rental
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[2]._id,
        bookId: createdBooks[2]._id,
        memberName: createdMembers[2].name,
        memberPhone: createdMembers[2].phone,
        memberEmail: createdMembers[2].email,
        bookName: createdBooks[2].title,
        type: 'RENT',
        rentalDuration: 7,
        rentalStartDate: new Date(now.getTime() - 14 * dayMs),
        rentalDueDate: new Date(now.getTime() - 7 * dayMs),
        returned: true,
        returnedAt: new Date(now.getTime() - 6 * dayMs),
        amount: createdBooks[2].rentalPrice,
        paymentStatus: 'VERIFIED',
      },
      // 4. BUY Purchase
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[3]._id,
        bookId: createdBooks[3]._id,
        memberName: createdMembers[3].name,
        memberPhone: createdMembers[3].phone,
        memberEmail: createdMembers[3].email,
        bookName: createdBooks[3].title,
        type: 'BUY',
        amount: createdBooks[3].purchasePrice,
        paymentStatus: 'VERIFIED',
      },
      // 5. Customer marked paid with UPI UTR
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[4]._id,
        bookId: createdBooks[4]._id,
        memberName: createdMembers[4].name,
        memberPhone: createdMembers[4].phone,
        memberEmail: createdMembers[4].email,
        bookName: createdBooks[4].title,
        type: 'RENT',
        rentalDuration: 14,
        rentalStartDate: new Date(now.getTime() - 1 * dayMs),
        rentalDueDate: new Date(now.getTime() + 13 * dayMs),
        returned: false,
        amount: createdBooks[4].rentalPrice,
        paymentStatus: 'CUSTOMER_MARKED_PAID',
        paymentReference: 'UPI/428901849102',
      },
      // 6. Active rental
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[0]._id,
        bookId: createdBooks[5]._id,
        memberName: createdMembers[0].name,
        memberPhone: createdMembers[0].phone,
        memberEmail: createdMembers[0].email,
        bookName: createdBooks[5].title,
        type: 'RENT',
        rentalDuration: 7,
        rentalStartDate: new Date(),
        rentalDueDate: new Date(now.getTime() + 7 * dayMs),
        returned: false,
        amount: createdBooks[5].rentalPrice,
        paymentStatus: 'PENDING',
      },
      // 7. Another purchase
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[1]._id,
        bookId: createdBooks[6]._id,
        memberName: createdMembers[1].name,
        memberPhone: createdMembers[1].phone,
        memberEmail: createdMembers[1].email,
        bookName: createdBooks[6].title,
        type: 'BUY',
        amount: createdBooks[6].purchasePrice,
        paymentStatus: 'VERIFIED',
      },
      // 8. Due soon rental (in 1 day)
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[2]._id,
        bookId: createdBooks[7]._id,
        memberName: createdMembers[2].name,
        memberPhone: createdMembers[2].phone,
        memberEmail: createdMembers[2].email,
        bookName: createdBooks[7].title,
        type: 'RENT',
        rentalDuration: 7,
        rentalStartDate: new Date(now.getTime() - 6 * dayMs),
        rentalDueDate: new Date(now.getTime() + 1 * dayMs),
        returned: false,
        amount: createdBooks[7].rentalPrice,
        paymentStatus: 'VERIFIED',
      },
      // 9. Returned rental
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[3]._id,
        bookId: createdBooks[8]._id,
        memberName: createdMembers[3].name,
        memberPhone: createdMembers[3].phone,
        memberEmail: createdMembers[3].email,
        bookName: createdBooks[8].title,
        type: 'RENT',
        rentalDuration: 3,
        rentalStartDate: new Date(now.getTime() - 5 * dayMs),
        rentalDueDate: new Date(now.getTime() - 2 * dayMs),
        returned: true,
        returnedAt: new Date(now.getTime() - 2 * dayMs),
        amount: createdBooks[8].rentalPrice,
        paymentStatus: 'VERIFIED',
      },
      // 10. Active rental
      {
        transactionId: generateTransactionId(),
        memberId: createdMembers[4]._id,
        bookId: createdBooks[9]._id,
        memberName: createdMembers[4].name,
        memberPhone: createdMembers[4].phone,
        memberEmail: createdMembers[4].email,
        bookName: createdBooks[9].title,
        type: 'RENT',
        rentalDuration: 7,
        rentalStartDate: new Date(),
        rentalDueDate: new Date(now.getTime() + 7 * dayMs),
        returned: false,
        amount: createdBooks[9].rentalPrice,
        paymentStatus: 'VERIFIED',
      },
    ];

    await Transaction.insertMany(sampleTransactions);
    console.log('✅ Created 10 sample transactions!');
    console.log('🎉 Seeding successfully finished!');
    process.exit(0);
  } catch (err) {
    console.error('❌ Seeding error:', err.message);
    process.exit(1);
  }
}

seed();
