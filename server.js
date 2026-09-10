require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Serve static frontend files from /public
app.use(express.static(path.join(__dirname, 'public')));

// Helper to adapt Vercel serverless function to Express route
function adaptVercel(handlerPath) {
  const handler = require(handlerPath);
  return async (req, res, next) => {
    try {
      await handler(req, res);
    } catch (err) {
      next(err);
    }
  };
}

// API Routes
app.all('/api/auth/verify', adaptVercel('./api/auth/verify.js'));
app.all('/api/auth/setup-admin', adaptVercel('./api/auth/setup-admin.js'));

app.all('/api/books', adaptVercel('./api/books/index.js'));
app.all('/api/books/:id', (req, res, next) => {
  req.query.id = req.params.id;
  adaptVercel('./api/books/[id].js')(req, res, next);
});

app.all('/api/members', adaptVercel('./api/members/index.js'));
app.all('/api/members/:id', (req, res, next) => {
  req.query.id = req.params.id;
  adaptVercel('./api/members/[id].js')(req, res, next);
});

app.all('/api/transactions', adaptVercel('./api/transactions/index.js'));
app.all('/api/transactions/:id', (req, res, next) => {
  req.query.id = req.params.id;
  adaptVercel('./api/transactions/[id].js')(req, res, next);
});

app.all('/api/rentals', adaptVercel('./api/rentals/index.js'));
app.all('/api/rentals/:id/return', (req, res, next) => {
  req.query.id = req.params.id;
  adaptVercel('./api/rentals/[id]/return.js')(req, res, next);
});

app.all('/api/qr/create', adaptVercel('./api/qr/create.js'));
app.all('/api/qr/:token', (req, res, next) => {
  req.query.token = req.params.token;
  adaptVercel('./api/qr/[token].js')(req, res, next);
});

app.all('/api/dashboard/summary', adaptVercel('./api/dashboard/summary.js'));
app.all('/api/settings', adaptVercel('./api/settings/index.js'));
app.all('/api/uploads/book-cover', adaptVercel('./api/uploads/book-cover.js'));
app.all('/api/uploads/upi-qr', adaptVercel('./api/uploads/upi-qr.js'));

// Global error handler
app.use((err, req, res, next) => {
  console.error('Server error:', err);
  if (!res.headersSent) {
    res.status(err.statusCode || 500).json({
      success: false,
      error: err.message || 'Internal Server Error',
    });
  }
});

// Start server with automatic port fallback if port is in use
function startServer(portToUse) {
  const server = app.listen(portToUse, () => {
    console.log(`====================================================`);
    console.log(`🚀 Library Management System running locally!`);
    console.log(`🌐 URL: http://localhost:${portToUse}`);
    console.log(`📚 Admin Dashboard: http://localhost:${portToUse}/dashboard.html`);
    console.log(`🔑 Login Page: http://localhost:${portToUse}/login.html`);
    console.log(`====================================================`);
  });

  server.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${portToUse} is in use, trying port ${portToUse + 1}...`);
      startServer(portToUse + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(Number(PORT) || 3000);
