const { verifyFirebaseToken } = require('../../lib/auth');
const connectToDatabase = require('../../lib/mongodb');
const Admin = require('../../models/Admin');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  try {
    const authHeader = req.headers.authorization || req.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, error: 'Bearer token required' });
    }

    const token = authHeader.split('Bearer ')[1].trim();
    const decoded = await verifyFirebaseToken(token);
    const uid = decoded.uid || decoded.sub || decoded.user_id;
    const email = (decoded.email || '').toLowerCase();
    const name = req.body?.name || decoded.name || email.split('@')[0] || 'Library Admin';

    await connectToDatabase();

    const existingAdmin = await Admin.findOne({ firebaseUid: uid });
    if (existingAdmin) {
      return res.status(200).json({
        success: true,
        message: 'Admin already registered',
        admin: existingAdmin,
      });
    }

    const count = await Admin.countDocuments();
    // Allow bootstrap if no admin exists, or if created by another admin
    if (count > 0) {
      // Check if caller is existing admin
      const caller = await Admin.findOne({ email });
      if (!caller) {
        return res.status(403).json({
          success: false,
          error: 'An administrator already exists. Please contact the administrator to grant access.',
        });
      }
    }

    const newAdmin = await Admin.create({
      firebaseUid: uid,
      email: email,
      name: name,
      role: 'admin',
    });

    return res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      admin: newAdmin,
    });
  } catch (error) {
    console.error('Setup admin error:', error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
