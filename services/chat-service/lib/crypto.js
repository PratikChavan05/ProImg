import crypto from "crypto";

// 32-byte key for AES-256
const ENCRYPTION_KEY = process.env.CHAT_ENCRYPTION_KEY || "a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6"; 
const IV_LENGTH = 16; // AES block size is 16 bytes

/**
 * Encrypts a plaintext string using AES-256-CBC.
 * Returns the format `iv_hex:ciphertext_hex`.
 */
export function encrypt(text) {
  if (!text) return text;
  try {
    const iv = crypto.randomBytes(IV_LENGTH);
    const cipher = crypto.createCipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let encrypted = cipher.update(text, "utf8");
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    // Prefix the IV so we can decrypt later
    return iv.toString("hex") + ":" + encrypted.toString("hex");
  } catch (err) {
    console.error("[Crypto] Encryption failed", err);
    return text;
  }
}

/**
 * Decrypts a ciphertext string formatted as `iv_hex:ciphertext_hex`.
 * If it's not encrypted or decryption fails, it returns the raw input text.
 */
export function decrypt(text) {
  if (!text) return text;
  try {
    const textParts = text.split(":");
    if (textParts.length < 2) {
      // Not encrypted with this system, return as-is (e.g. legacy E2EE or unencrypted text)
      return text;
    }
    const iv = Buffer.from(textParts.shift(), "hex");
    const encryptedText = Buffer.from(textParts.join(":"), "hex");
    const decipher = crypto.createDecipheriv("aes-256-cbc", Buffer.from(ENCRYPTION_KEY), iv);
    let decrypted = decipher.update(encryptedText);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    return decrypted.toString("utf8");
  } catch (err) {
    // If decryption fails, return as-is (graceful fallback)
    return text;
  }
}
