const mongoose = require('mongoose');

const MONGODB_URI = process.env.MONGODB_URI;

let cached = global.mongoose;

if (!cached) {
  cached = global.mongoose = { conn: null, promise: null, isFallback: false };
}

async function connectToDatabase() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!cached.promise) {
    const opts = {
      bufferCommands: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
      socketTimeoutMS: 45000,
    };

    cached.promise = mongoose
      .connect(MONGODB_URI, opts)
      .then((mongooseInstance) => {
        console.log('✅ Connected to MongoDB Atlas successfully');
        cached.isFallback = false;
        return mongooseInstance;
      })
      .catch((err) => {
        console.warn(
          '⚠️ MongoDB Atlas connection warning:',
          err.message,
          '\n(Note: If this is an SSL alert 80, ensure "0.0.0.0/0" is added to MongoDB Atlas > Network Access).'
        );
        cached.promise = null;
        throw err;
      });
  }

  try {
    cached.conn = await cached.promise;
    return cached.conn;
  } catch (e) {
    cached.promise = null;
    throw e;
  }
}

module.exports = connectToDatabase;
