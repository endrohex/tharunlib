# 📚 Production-Ready Library Management & QR Book Rental Web App

A modern, SaaS-grade **Library Management and QR-Based Book Rental & Purchase System** built with pure **HTML5, CSS3, Vanilla JavaScript**, **Node.js Vercel Serverless Functions**, **MongoDB Atlas**, **Firebase Authentication**, and **Cloudinary**.

---

## 🌟 Key Features

1. **Dual-Sided Architecture**:
   - **Librarian / Admin Portal**: Complete catalog management, stock tracking, member profiles, active & overdue lending tracker, transaction ledger, customizable UPI payments, and QR generation.
   - **Customer / Member Mobile Flow**: Lightweight, mobile-first registration page (max-width 500px). No apps to download, no accounts to create — customers simply scan the QR with their standard phone camera, fill their details, optionally pay with UPI deep links, and receive an instant printable receipt.

2. **Live Synchronization**:
   - Polling-based real-time sync (5-second interval) designed specifically for Vercel Serverless functions.
   - Automatically detects new transactions and updates metric cards, inventory levels, and transaction tables with subtle audio/visual alerts and zero full-page reloads.

3. **Atomic Stock & Session Security**:
   - Atomic inventory decrements (`availableCopies -= 1`) prevent over-lending or negative stock even during simultaneous checkouts.
   - Single-use cryptographically strong QR session tokens with configurable expiration timers (default 15 minutes).
   - Atomic stock replenishment on return.

4. **Integrated UPI Payments**:
   - Dynamic UPI deep links (`upi://pay?pa=...&pn=...&am=...&cu=INR`) for seamless one-tap payment on mobile (Google Pay, PhonePe, Paytm).
   - Optional UPI QR code display and customer UTR reference submission.
   - Admin verification workflow.

5. **Cloudinary Image Storage**:
   - Secure server-side image uploads for book covers and library UPI QR codes with fallback to data URLs.

---

## 📁 Project Structure

```
├── public/                     # Static Frontend (Hosted on Vercel)
│   ├── index.html              # Library landing portal
│   ├── login.html              # Admin Firebase Authentication login
│   ├── dashboard.html          # Overview dashboard with live polling & 7 metrics
│   ├── books.html              # Books catalog (Add/Edit/Delete, cover upload)
│   ├── members.html            # Members directory & profile lending matrix
│   ├── transactions.html       # Full transactions ledger & printable receipt
│   ├── rentals.html            # Active & overdue rentals with "Mark Returned"
│   ├── qr.html                 # Dedicated QR generator & live completion monitor
│   ├── register.html           # Customer mobile QR registration page (max 500px)
│   ├── success.html            # Confirmation receipt with print layout
│   ├── settings.html           # Library info, UPI payment, rental rules & QR expiry
│   │
│   ├── css/
│   │   ├── global.css          # Design system, CSS variables, typography, modals, toasts
│   │   ├── auth.css            # Sleek login card & password toggle
│   │   ├── dashboard.css       # Sidebar layout, topbar, metric cards, widgets
│   │   ├── forms.css           # Modern inputs, toggles, file upload dropzone
│   │   ├── tables.css          # Responsive data tables, badges, pagination
│   │   └── responsive.css      # Off-canvas mobile drawer & @media print styles
│   │
│   ├── js/
│   │   ├── firebase-config.js  # Firebase Web SDK initialization
│   │   ├── api.js              # Fetch wrapper with auto Bearer token injection
│   │   ├── utils.js            # Formatters (₹ INR, dates), toasts, modals, debounce
│   │   ├── guards.js           # Admin route guards & mobile sidebar controller
│   │   ├── auth.js             # Staff login handler
│   │   ├── dashboard.js        # Live 5s polling & metric cards controller
│   │   ├── books.js            # Books CRUD & Cloudinary cover upload
│   │   ├── members.js          # Member search & profile viewer
│   │   ├── transactions.js     # Transaction ledger & payment verification
│   │   ├── rentals.js          # Rental status tracking & atomic return action
│   │   ├── qr.js               # QR generation, countdown, live completion listener
│   │   ├── register.js         # Mobile customer registration & UPI deep links
│   │   └── settings.js         # Library & UPI payment settings
│   │
│   └── assets/
│       └── vendor/
│           └── qrcode.min.js   # Bundled client-side QRCode generator
│
├── api/                        # Vercel Serverless Functions
│   ├── auth/
│   │   ├── verify.js           # Verify Firebase ID token
│   │   └── setup-admin.js      # Bootstrap administrator role
│   ├── books/
│   │   ├── index.js            # GET (search/filter/list) / POST (create)
│   │   └── [id].js             # GET / PUT / DELETE book
│   ├── members/
│   │   ├── index.js            # GET members list with aggregate rental counts
│   │   └── [id].js             # GET member profile & transaction history
│   ├── transactions/
│   │   ├── index.js            # GET ledger / POST new transaction (atomic stock decrement)
│   │   └── [id].js             # GET single receipt / PATCH payment verification
│   ├── rentals/
│   │   ├── index.js            # GET active/overdue rentals
│   │   └── [id]/return.js      # POST atomic return & stock replenishment
│   ├── qr/
│   │   ├── create.js           # POST create secure QR session token
│   │   └── [token].js          # GET customer session info / POST cancel
│   ├── dashboard/
│   │   └── summary.js          # GET lightweight metrics for 5s live polling
│   ├── settings/
│   │   └── index.js            # GET / PUT library and UPI settings
│   └── uploads/
│       ├── book-cover.js       # Cloudinary book cover uploader
│       └── upi-qr.js           # Cloudinary UPI QR image uploader
│
├── lib/                        # Server Utilities & Adapters
│   ├── mongodb.js              # Cached Mongoose connection for Vercel Serverless
│   ├── dataAccess.js           # High-availability database adapter with local fallback
│   ├── mockStore.js            # Fast development fallback store
│   ├── auth.js                 # Firebase token verifier (Admin SDK + Google JWKS)
│   ├── cloudinary.js           # Cloudinary image uploader with fallback
│   └── validation.js           # Input sanitization, XSS defense & ID generators
│
├── models/                     # Mongoose Schemas & Indexes
│   ├── Book.js                 # Book schema (title, author, copies, prices, status)
│   ├── Member.js               # Member schema (memberId, name, phone, email, address)
│   ├── Transaction.js          # Transaction schema (type, dates, amount, payment)
│   ├── QRSession.js            # QR Session schema (token, bookId, status, TTL)
│   ├── Admin.js                # Administrator schema
│   └── Settings.js             # Library and UPI settings schema
│
├── server.js                   # Local Express server emulating Vercel Serverless routes
├── seed.js                     # Demo data seeder (10 books, 5 members, 10 txns)
├── vercel.json                 # Vercel serverless routing configuration
├── .env.example                # Environment variables template
├── .env                        # Local environment variables
├── package.json
└── README.md
```

---

## 🚀 Getting Started Locally

### 1. Prerequisites
- **Node.js** v18 or higher (tested on Node v24)
- **npm** v9 or higher

### 2. Installation
Clone the repository and install dependencies:
```bash
npm install
```

### 3. Environment Configuration
Create a `.env` file from `.env.example`:
```env
# MongoDB Atlas Connection URI
MONGODB_URI=mongodb+srv://warriorbey12_db_user:l0KqR3sncjtFXswi@cluster0.ccwby7a.mongodb.net/library?retryWrites=true&w=majority&appName=Cluster0

# Firebase Project Configuration
FIREBASE_PROJECT_ID=library-6fe26
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

# Cloudinary Image Storage (Optional - Fallbacks to data URL if empty)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Public Base URL (Used to generate QR scan links)
PUBLIC_BASE_URL=http://localhost:3000

# Port
PORT=3000
```

### 4. Run the Application
Start the local server:
```bash
npm run dev
```
Open your browser at:
- **Admin Dashboard**: `http://localhost:3000/dashboard.html`
- **Staff Login**: `http://localhost:3000/login.html`
- **Library Portal**: `http://localhost:3000/index.html`

---

## 🗄️ MongoDB Atlas Setup Guide

1. Log into your [MongoDB Atlas Console](https://cloud.mongodb.com/).
2. Navigate to **Security &rarr; Network Access**.
3. Click **Add IP Address** and select **Allow Access from Anywhere (`0.0.0.0/0`)**.
   > *Note: Vercel serverless functions and dynamic mobile connections require `0.0.0.0/0` access.*
4. Navigate to **Security &rarr; Database Access** to verify your user (e.g. `warriorbey12_db_user`).
5. Copy the connection string and add it to your `.env` or Vercel Environment Variables:
   ```
   MONGODB_URI=mongodb+srv://<username>:<password>@cluster0.xxxxx.mongodb.net/library?retryWrites=true&w=majority
   ```
6. Optionally seed 10 sample books, 5 members, and 10 transactions:
   ```bash
   npm run seed
   ```

---

## 🔥 Firebase Authentication Setup Guide

1. Go to the [Firebase Console](https://console.firebase.google.com/) and open project `library-6fe26`.
2. Under **Build &rarr; Authentication**, click **Get Started**.
3. Under **Sign-in method**, enable **Email/Password**.
4. Click the **Users** tab and click **Add user**:
   - Email: `admin@library.org` (or your chosen email)
   - Password: `your-secure-password`
5. The first user who signs in through `/login.html` is automatically registered as the Library Administrator in the system database.

---

## ☁️ Cloudinary Setup Guide (Optional)

1. Sign up for a free account at [Cloudinary](https://cloudinary.com/).
2. From your Cloudinary Dashboard, copy:
   - **Cloud Name**
   - **API Key**
   - **API Secret**
3. Set them in your `.env` and Vercel Environment Variables:
   ```
   CLOUDINARY_CLOUD_NAME=your_cloud_name
   CLOUDINARY_API_KEY=your_api_key
   CLOUDINARY_API_SECRET=your_api_secret
   ```
   *Note: If Cloudinary is not configured, the app automatically preserves base64 image data URLs so book covers and UPI QR uploads work without interruption.*

---

## 🌐 Deploying to Vercel

1. Push your repository to **GitHub**:
   ```bash
   git init
   git add .
   git commit -m "Initial commit: Library Management & QR Rental System"
   git branch -M main
   git remote add origin https://github.com/<your-username>/<your-repo-name>.git
   git push -u origin main
   ```

2. Open [Vercel Dashboard](https://vercel.com/) and click **Add New &rarr; Project**.
3. Import your GitHub repository.
4. In the **Environment Variables** section, add:
   - `MONGODB_URI` = `mongodb+srv://warriorbey12_db_user:l0KqR3sncjtFXswi@cluster0.ccwby7a.mongodb.net/library?retryWrites=true&w=majority&appName=Cluster0`
   - `FIREBASE_PROJECT_ID` = `library-6fe26`
   - `CLOUDINARY_CLOUD_NAME` = `...` (optional)
   - `CLOUDINARY_API_KEY` = `...` (optional)
   - `CLOUDINARY_API_SECRET` = `...` (optional)
   - `PUBLIC_BASE_URL` = `https://your-app-name.vercel.app`
5. Click **Deploy**.
6. Once deployed, QR codes will automatically encode your live production URL:
   `https://your-app-name.vercel.app/register.html?session=...`

---

## 🔄 End-to-End Lending Flow

```mermaid
sequenceDiagram
    autonumber
    actor Admin as Library Staff
    actor Customer as Patron (Mobile Phone)
    participant Vercel as Vercel Serverless API
    participant DB as MongoDB Atlas

    Admin->>Vercel: POST /api/qr/create (Book, Type: RENT, Duration: 7d)
    Vercel->>DB: Create QRSession (sessionToken, expiresAt: +15m)
    Vercel-->>Admin: Returns QR code (URL: /register.html?session=TOKEN)
    Admin->>Admin: Screen displays large QR + live countdown timer

    Customer->>Customer: Scans QR code using phone camera
    Customer->>Vercel: GET /api/qr/TOKEN
    Vercel->>DB: Validate sessionToken & fetch book details
    Vercel-->>Customer: Renders mobile registration form

    Customer->>Customer: Fills details (Name, Phone, Address)
    opt UPI Payment
        Customer->>Customer: Clicks "Pay via UPI" (upi://pay?...) & enters UTR
    end
    Customer->>Vercel: POST /api/transactions (sessionToken, details)
    Vercel->>DB: Atomic stock decrement (availableCopies - 1)
    Vercel->>DB: Find/create Member & record Transaction
    Vercel->>DB: Mark QRSession COMPLETED
    Vercel-->>Customer: Redirects to /success.html (Printable Receipt)

    Admin->>Vercel: Polling GET /api/qr/TOKEN (every 2s)
    Vercel-->>Admin: Status: COMPLETED by Customer
    Admin->>Admin: QR screen transitions to "✓ Registration Completed!"
    Admin->>Admin: Dashboard receives live toast notification & stock updates
```

---

## 🛡️ Security Best Practices

- **XSS Sanitization**: All user inputs (names, addresses, queries) are sanitized server-side and rendered safely using `textContent` and HTML entity escaping.
- **Serverless-Safe ID Tokens**: Frontend acquires Firebase ID tokens; backend cryptographically verifies each token against Google public certs or Firebase Admin SDK.
- **Single-Use Cryptographic QR Sessions**: Random 48-character hex tokens with automatic 24-hour TTL expiration. Completed or expired sessions cannot be re-used.
- **Atomic Concurrency Protection**: High-concurrency operations use atomic `$inc` updates (`availableCopies: { $gt: 0 }`) preventing negative stock levels.
