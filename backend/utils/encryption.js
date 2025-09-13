// utils/encryption.js
import crypto from "crypto";

const ALGORITHM = "aes-256-cbc";
const IV_LENGTH = 16;

// ✅ Use same secret key on frontend & backend
// On frontend, hardcode or derive from user password (better for E2EE)
// On backend, just keep in .env (for now, to sync with frontend)
const SECRET_KEY = crypto
  .createHash("sha256")
  .update(String(process.env.ENCRYPTION_SECRET || "default_secret"))
  .digest()
  .subarray(0, 32);

export function encryptMessage(text) {
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGORITHM, SECRET_KEY, iv);
  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");
  return iv.toString("hex") + ":" + encrypted;
}

export function decryptMessage(encryptedText) {
  try {
    const [ivHex, encrypted] = encryptedText.split(":");
    const iv = Buffer.from(ivHex, "hex");
    const decipher = crypto.createDecipheriv(ALGORITHM, SECRET_KEY, iv);
    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch (error) {
    console.error("❌ Decryption failed:", error);
    return null;
  }
}
