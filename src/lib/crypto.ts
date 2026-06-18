import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto";

// Derive a 32-byte key from SESSION_SECRET so we don't need an extra env var.
// Rotating SESSION_SECRET invalidates stored secrets (re-connect required).
function key(): Buffer {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("SESSION_SECRET ontbreekt of is te kort voor versleuteling.");
  }
  return scryptSync(secret, "urenlijst-caldav-v1", 32);
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const enc = Buffer.concat([cipher.update(plain, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv.toString("base64"), tag.toString("base64"), enc.toString("base64")].join(":");
}

export function decryptSecret(token: string): string {
  const [ivB64, tagB64, dataB64] = token.split(":");
  if (!ivB64 || !tagB64 || !dataB64) throw new Error("Ongeldige versleutelde waarde.");
  const decipher = createDecipheriv("aes-256-gcm", key(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(dataB64, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
