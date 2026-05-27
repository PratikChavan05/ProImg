import customAxios from "../config/axios";

// Helper utilities for Base64 and ArrayBuffer conversion
const arrayBufferToBase64 = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
};

/**
 * Retrieves the user's RSA-OAEP key pair from localStorage.
 * If not present, generates a new one, saves it, and flags that it needs to be uploaded.
 */
export const getOrGenerateKeys = async (userId) => {
  if (!userId) return null;

  const pubKeyName = `proimg-e2ee-pub-${userId}`;
  const privKeyName = `proimg-e2ee-priv-${userId}`;

  const storedPub = localStorage.getItem(pubKeyName);
  const storedPriv = localStorage.getItem(privKeyName);

  if (storedPub && storedPriv) {
    return {
      publicKey: JSON.parse(storedPub),
      privateKey: JSON.parse(storedPriv)
    };
  }

  console.log("[E2EE] Generating new RSA-OAEP key pair...");

  // Generate 2048-bit RSA-OAEP key pair
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: "RSA-OAEP",
      modulusLength: 2048,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: "SHA-256"
    },
    true, // extractable
    ["encrypt", "decrypt"]
  );

  // Export keys to JWK format
  const jwkPublic = await window.crypto.subtle.exportKey("jwk", keyPair.publicKey);
  const jwkPrivate = await window.crypto.subtle.exportKey("jwk", keyPair.privateKey);

  // Save in localStorage
  localStorage.setItem(pubKeyName, JSON.stringify(jwkPublic));
  localStorage.setItem(privKeyName, JSON.stringify(jwkPrivate));
  localStorage.setItem(`proimg-e2ee-synced-${userId}`, "false");

  return {
    publicKey: jwkPublic,
    privateKey: jwkPrivate
  };
};

/**
 * Uploads the public key to the server if not already synced.
 */
export const syncPublicKeyWithServer = async (userId, localKeys, force = false) => {
  if (!userId || !localKeys?.publicKey) return;

  const syncFlagName = `proimg-e2ee-synced-${userId}`;
  const isSynced = localStorage.getItem(syncFlagName) === "true";

  if (isSynced && !force) return;

  try {
    console.log("[E2EE] Uploading E2EE public key to server...");
    await customAxios.post("/api/user/keys", {
      publicKey: localKeys.publicKey
    });
    localStorage.setItem(syncFlagName, "true");
    console.log("[E2EE] Public key synced successfully!");
  } catch (err) {
    console.error("[E2EE] Failed to upload public key to server", err);
  }
};

/**
 * Hybrid Encryption:
 * 1. Generates a random symmetric key (AES-GCM 256-bit).
 * 2. Encrypts the message content using AES-GCM.
 * 3. Encrypts the AES key using the peer's RSA public key (for the receiver).
 * 4. Encrypts the AES key using the sender's RSA public key (so the sender can decrypt it).
 */
export const encryptMessage = async (messageText, peerPublicKeyJwk, myPublicKeyJwk) => {
  if (!messageText || !peerPublicKeyJwk || !myPublicKeyJwk) {
    return messageText;
  }

  try {
    // 1. Generate AES-GCM key and IV
    const aesKey = await window.crypto.subtle.generateKey(
      { name: "AES-GCM", length: 256 },
      true,
      ["encrypt", "decrypt"]
    );
    const iv = window.crypto.getRandomValues(new Uint8Array(12));

    // 2. Encrypt message content with AES key
    const encoder = new TextEncoder();
    const encodedMessage = encoder.encode(messageText);
    const encryptedContentBuffer = await window.crypto.subtle.encrypt(
      { name: "AES-GCM", iv },
      aesKey,
      encodedMessage
    );

    // 3. Export raw AES key to encrypt with RSA
    const rawAesKey = await window.crypto.subtle.exportKey("raw", aesKey);

    // 4. Import RSA public keys
    const rsaPeerKey = await window.crypto.subtle.importKey(
      "jwk",
      peerPublicKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );

    const rsaMyKey = await window.crypto.subtle.importKey(
      "jwk",
      myPublicKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["encrypt"]
    );

    // 5. Encrypt AES key using RSA public keys
    const encryptedKeyForReceiverBuffer = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      rsaPeerKey,
      rawAesKey
    );

    const encryptedKeyForSenderBuffer = await window.crypto.subtle.encrypt(
      { name: "RSA-OAEP" },
      rsaMyKey,
      rawAesKey
    );

    // 6. Format final secure payload
    const payload = {
      encryptedContent: arrayBufferToBase64(encryptedContentBuffer),
      iv: arrayBufferToBase64(iv),
      keyForReceiver: arrayBufferToBase64(encryptedKeyForReceiverBuffer),
      keyForSender: arrayBufferToBase64(encryptedKeyForSenderBuffer),
      isEncrypted: true
    };

    return JSON.stringify(payload);
  } catch (err) {
    console.error("[E2EE] Encryption failed", err);
    return messageText; // Fall back to plaintext in case of catastrophic error
  }
};

/**
 * Hybrid Decryption:
 * 1. Decrypts the symmetric AES key using the local private RSA key.
 * 2. Decrypts the message ciphertext using the decrypted AES key.
 */
export const decryptMessage = async (encryptedPayloadString, myPrivateKeyJwk, isMine) => {
  if (!encryptedPayloadString || !myPrivateKeyJwk) return encryptedPayloadString;

  try {
    // Attempt to parse JSON; if it is not JSON, treat it as plaintext (backward compatibility)
    const payload = JSON.parse(encryptedPayloadString);
    if (!payload || !payload.isEncrypted || !payload.encryptedContent) {
      return encryptedPayloadString;
    }

    // 1. Choose the correct encrypted AES key (mine if I sent it, peer's if I received it)
    const encryptedAesKeyBase64 = isMine ? payload.keyForSender : payload.keyForReceiver;
    if (!encryptedAesKeyBase64) {
      return "🔒 Decryption failed: Missing encrypted key payload.";
    }

    const encryptedAesKeyBuffer = base64ToArrayBuffer(encryptedAesKeyBase64);
    const encryptedContentBuffer = base64ToArrayBuffer(payload.encryptedContent);
    const ivBuffer = base64ToArrayBuffer(payload.iv);

    // 2. Import RSA private key
    const rsaPrivateKey = await window.crypto.subtle.importKey(
      "jwk",
      myPrivateKeyJwk,
      { name: "RSA-OAEP", hash: "SHA-256" },
      true,
      ["decrypt"]
    );

    // 3. Decrypt raw AES key
    const rawAesKey = await window.crypto.subtle.decrypt(
      { name: "RSA-OAEP" },
      rsaPrivateKey,
      encryptedAesKeyBuffer
    );

    // 4. Import raw AES key as AES-GCM
    const aesKey = await window.crypto.subtle.importKey(
      "raw",
      rawAesKey,
      { name: "AES-GCM" },
      true,
      ["decrypt"]
    );

    // 5. Decrypt message content
    const decryptedContentBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(ivBuffer) },
      aesKey,
      encryptedContentBuffer
    );

    const decoder = new TextDecoder();
    return decoder.decode(decryptedContentBuffer);
  } catch (err) {
    if (err instanceof SyntaxError) {
      // Plaintext fallback (not a JSON string)
      return encryptedPayloadString;
    }
    console.error("[E2EE] Decryption failed", err);
    return "🔒 Decryption failed: Private key missing or invalid.";
  }
};
