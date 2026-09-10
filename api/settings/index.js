const { initDB, getModel } = require('../../lib/dataAccess');
const { authenticateAdmin } = require('../../lib/auth');
const { sanitizeString } = require('../../lib/validation');

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,PUT,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Authorization, Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  await initDB();
  const Settings = getModel('Settings');

  if (req.method === 'GET') {
    try {
      const settings = await Settings.getSettings();
      return res.status(200).json({ success: true, settings });
    } catch (err) {
      return res.status(500).json({ success: false, error: err.message });
    }
  }

  if (req.method === 'PUT') {
    try {
      await authenticateAdmin(req);

      const settings = await Settings.getSettings();
      const {
        libraryName,
        libraryAddress,
        libraryPhone,
        libraryEmail,
        defaultRentalDuration,
        maximumRentalDuration,
        gracePeriod,
        upiEnabled,
        upiId,
        upiName,
        upiQrImage,
        qrExpirationMinutes,
      } = req.body || {};

      if (libraryName) settings.libraryName = sanitizeString(libraryName);
      if (libraryAddress !== undefined) settings.libraryAddress = sanitizeString(libraryAddress);
      if (libraryPhone !== undefined) settings.libraryPhone = sanitizeString(libraryPhone);
      if (libraryEmail !== undefined) settings.libraryEmail = sanitizeString(libraryEmail);

      if (defaultRentalDuration !== undefined) {
        settings.defaultRentalDuration = Math.max(1, parseInt(defaultRentalDuration, 10) || 7);
      }
      if (maximumRentalDuration !== undefined) {
        settings.maximumRentalDuration = Math.max(1, parseInt(maximumRentalDuration, 10) || 30);
      }
      if (gracePeriod !== undefined) {
        settings.gracePeriod = Math.max(0, parseInt(gracePeriod, 10) || 0);
      }

      if (upiEnabled !== undefined) {
        settings.upiEnabled = Boolean(upiEnabled);
      }
      if (upiId !== undefined) settings.upiId = sanitizeString(upiId);
      if (upiName !== undefined) settings.upiName = sanitizeString(upiName);
      if (upiQrImage !== undefined) settings.upiQrImage = upiQrImage;

      if (qrExpirationMinutes !== undefined) {
        settings.qrExpirationMinutes = Math.max(1, parseInt(qrExpirationMinutes, 10) || 15);
      }

      await settings.save();

      return res.status(200).json({
        success: true,
        message: 'Settings updated successfully',
        settings,
      });
    } catch (err) {
      console.error('Update settings error:', err);
      return res.status(err.statusCode || 500).json({ success: false, error: err.message });
    }
  }

  return res.status(405).json({ success: false, error: 'Method not allowed' });
};
