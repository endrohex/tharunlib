const cloudinary = require('cloudinary').v2;

const isConfigured = Boolean(
  process.env.CLOUDINARY_CLOUD_NAME &&
  process.env.CLOUDINARY_API_KEY &&
  process.env.CLOUDINARY_API_SECRET
);

if (isConfigured) {
  cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
    secure: true,
  });
}

/**
 * Uploads an image buffer or base64 string to Cloudinary with fallback
 * @param {string|Buffer} fileData Base64 string or file buffer
 * @param {string} folder Target Cloudinary folder (e.g. 'library/books', 'library/payments')
 * @returns {Promise<string>} Uploaded secure image URL
 */
async function uploadImage(fileData, folder = 'library/general') {
  if (!fileData) return '';

  if (isConfigured) {
    try {
      const uploadRes = await cloudinary.uploader.upload(fileData, {
        folder: folder,
        resource_type: 'image',
        transformation: [{ quality: 'auto', fetch_format: 'auto' }],
      });
      return uploadRes.secure_url;
    } catch (err) {
      console.warn('Cloudinary upload failed, falling back to data URL:', err.message);
    }
  }

  // Fallback: If Cloudinary is not configured, preserve base64 data URL
  if (typeof fileData === 'string' && fileData.startsWith('data:image/')) {
    return fileData;
  }

  return fileData;
}

module.exports = {
  uploadImage,
  isCloudinaryConfigured: () => isConfigured,
};
