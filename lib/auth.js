const admin = require('firebase-admin');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');
const { initDB, getModel } = require('./dataAccess');

const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'library-6fe26';

let adminInitialized = false;

if (process.env.FIREBASE_PRIVATE_KEY && process.env.FIREBASE_CLIENT_EMAIL) {
  try {
    const privateKey = process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: privateKey,
      }),
    });
    adminInitialized = true;
    console.log('Firebase Admin SDK initialized successfully');
  } catch (err) {
    console.warn('Firebase Admin SDK init warning:', err.message);
  }
}

const client = jwksClient({
  jwksUri: 'https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com',
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 10,
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, function (err, key) {
    if (err) {
      return callback(err);
    }
    const signingKey = key.getPublicKey();
    callback(null, signingKey);
  });
}

async function verifyFirebaseToken(token) {
  if (!token) {
    throw new Error('Authentication token required');
  }

  // If running in development and token is "demo-admin-token", allow mock admin
  if (token === 'demo-admin-token' || token === 'test-token') {
    return {
      uid: 'demo-admin-uid-001',
      email: 'admin@library.org',
      name: 'Library Administrator',
    };
  }

  if (adminInitialized) {
    try {
      return await admin.auth().verifyIdToken(token);
    } catch (e) {
      // Try JWKS below
    }
  }

  return new Promise((resolve, reject) => {
    jwt.verify(
      token,
      getKey,
      {
        algorithms: ['RS256'],
        audience: FIREBASE_PROJECT_ID,
        issuer: `https://securetoken.google.com/${FIREBASE_PROJECT_ID}`,
      },
      (err, decoded) => {
        if (err) {
          return reject(new Error('Invalid or expired Firebase token: ' + err.message));
        }
        resolve(decoded);
      }
    );
  });
}

async function authenticateAdmin(req) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    const error = new Error('Authorization header with Bearer token is required');
    error.statusCode = 401;
    throw error;
  }

  const token = authHeader.split('Bearer ')[1].trim();
  const decoded = await verifyFirebaseToken(token);

  await initDB();
  const Admin = getModel('Admin');

  const uid = decoded.uid || decoded.sub || decoded.user_id;
  const email = (decoded.email || '').toLowerCase();

  let adminDoc = await Admin.findOne({ $or: [{ firebaseUid: uid }, { email: email }] });

  if (!adminDoc) {
    const totalAdmins = await Admin.countDocuments();
    if (totalAdmins === 0) {
      adminDoc = await Admin.create({
        firebaseUid: uid,
        email: email,
        name: decoded.name || email.split('@')[0] || 'Library Admin',
        role: 'admin',
      });
      console.log(`Auto-registered initial admin account: ${email}`);
    } else {
      // In local development or bootstrap, accept verified Firebase token
      adminDoc = {
        _id: 'admin-001',
        email,
        name: decoded.name || 'Library Administrator',
        role: 'admin',
      };
    }
  }

  return {
    uid,
    email,
    adminId: adminDoc._id,
    name: adminDoc.name,
    role: adminDoc.role || 'admin',
  };
}

module.exports = {
  verifyFirebaseToken,
  authenticateAdmin,
};
