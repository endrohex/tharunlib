const { authenticateAdmin } = require('../../lib/auth');
const { uploadImage } = require('../../lib/cloudinary');

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
    await authenticateAdmin(req);

    const { image } = req.body || {};
    if (!image) {
      return res.status(400).json({ success: false, error: 'No image data provided' });
    }

    const secureUrl = await uploadImage(image, 'library/payments');

    return res.status(200).json({
      success: true,
      url: secureUrl,
    });
  } catch (err) {
    console.error('UPI QR upload error:', err);
    return res.status(err.statusCode || 500).json({ success: false, error: err.message });
  }
};
