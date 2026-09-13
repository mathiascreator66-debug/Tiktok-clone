import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer | null {
  const raw = process.env.MESSAGES_ENCRYPTION_KEY;
  if (!raw || raw.length < 16) return null;
  // Derive 32-byte key from env string
  return createHash("sha256").update(raw).digest();
}

/** Encrypt message body at rest when MESSAGES_ENCRYPTION_KEY is set. */
export function encryptMessageBody(plaintext: string): string {
  const key = getKey();
  if (!key) return plaintext;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  const enc = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return (
    PREFIX +
    Buffer.concat([iv, tag, enc]).toString("base64url")
  );
}

/** Decrypt if prefixed; otherwise return as-is (legacy plaintext). */
export function decryptMessageBody(stored: string): string {
  if (!stored.startsWith(PREFIX)) return stored;
  const key = getKey();
  if (!key) return stored; // key missing — cannot decrypt; return opaque
  try {
    const buf = Buffer.from(stored.slice(PREFIX.length), "base64url");
    const iv = buf.subarray(0, 12);
    const tag = buf.subarray(12, 28);
    const data = buf.subarray(28);
    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag);
    return Buffer.concat([decipher.update(data), decipher.final()]).toString(
      "utf8"
    );
  } catch {
    return stored;
  }
}

export function messagesEncryptionEnabled() {
  return Boolean(getKey());
}
