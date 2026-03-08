const crypto = require('crypto');
require('dotenv').config();

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef'; // Must be 256 bits (32 characters)
const IV_LENGTH = 16; // For AES, this is always 16
const ENCRYPTION_IV = process.env.ENCRYPTION_IV || '0123456789abcdef';

/**
 * Encrypt a plain text string 
 * Useful for securely storing API keys in DB
 */
const encrypt = (text) => {
    if (!text) return null;
    const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(ENCRYPTION_IV));
    let encrypted = cipher.update(text);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    return encrypted.toString('hex');
};

/**
 * Decrypt an encrypted string
 */
const decrypt = (text) => {
    if (!text) return null;
    try {
        const encryptedText = Buffer.from(text, 'hex');
        const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(ENCRYPTION_KEY), Buffer.from(ENCRYPTION_IV));
        let decrypted = decipher.update(encryptedText);
        decrypted = Buffer.concat([decrypted, decipher.final()]);
        return decrypted.toString();
    } catch (err) {
        console.error('Decryption error:', err.message);
        return null;
    }
};

module.exports = {
    encrypt,
    decrypt
};
