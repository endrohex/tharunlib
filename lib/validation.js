const crypto = require('crypto');
const mongoose = require('mongoose');

/**
 * Escapes HTML characters to prevent XSS attacks
 */
function sanitizeString(str) {
  if (typeof str !== 'string') return '';
  return str
    .trim()
    .replace(/[&<>"']/g, (match) => {
      const escape = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#x27;',
      };
      return escape[match];
    });
}

/**
 * Validates 10-digit or E.164 phone number
 */
function isValidPhone(phone) {
  if (!phone || typeof phone !== 'string') return false;
  const cleaned = phone.replace(/[\s\-\(\)\+]/g, '');
  return cleaned.length >= 10 && cleaned.length <= 15 && /^\d+$/.test(cleaned);
}

/**
 * Validates email format
 */
function isValidEmail(email) {
  if (!email || typeof email !== 'string') return false;
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(email.trim());
}

/**
 * Checks if a string is a valid MongoDB ObjectId
 */
function isValidObjectId(id) {
  return mongoose.Types.ObjectId.isValid(id);
}

/**
 * Generates a cryptographically strong random token for QR sessions
 */
function generateSessionToken() {
  return crypto.randomBytes(24).toString('hex');
}

/**
 * Generates human-friendly Transaction ID: LIB-YYYYMM-XXXX
 */
function generateTransactionId() {
  const dateStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `LIB-${dateStr}-${rand}`;
}

/**
 * Generates human-friendly Member ID: MEM-XXXXX
 */
function generateMemberId() {
  const rand = Math.floor(10000 + Math.random() * 90000);
  return `MEM-${rand}`;
}

module.exports = {
  sanitizeString,
  isValidPhone,
  isValidEmail,
  isValidObjectId,
  generateSessionToken,
  generateTransactionId,
  generateMemberId,
};
