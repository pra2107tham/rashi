import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const VERSION = "v1";

function loadKey(base64Key: string): Buffer {
  const key = Buffer.from(base64Key, "base64");
  if (key.length !== 32) throw new Error("PII_ENC_KEY must be 32 bytes, base64-encoded");
  return key;
}

/** AES-256-GCM. Output: "v1:<iv>:<tag>:<ciphertext>" (base64 parts). */
export function encrypt(plaintext: string, base64Key: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", loadKey(base64Key), iv);
  const ct = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  return [VERSION, iv.toString("base64"), cipher.getAuthTag().toString("base64"), ct.toString("base64")].join(":");
}

export function decrypt(payload: string, base64Key: string): string {
  const [version, iv, tag, ct] = payload.split(":");
  if (version !== VERSION || !iv || !tag || ct === undefined) throw new Error("Unrecognised ciphertext format");
  const decipher = createDecipheriv("aes-256-gcm", loadKey(base64Key), Buffer.from(iv, "base64"));
  decipher.setAuthTag(Buffer.from(tag, "base64"));
  return Buffer.concat([decipher.update(Buffer.from(ct, "base64")), decipher.final()]).toString("utf8");
}

export function encryptJson(value: unknown, base64Key: string): string {
  return encrypt(JSON.stringify(value), base64Key);
}

export function decryptJson<T>(payload: string, base64Key: string): T {
  return JSON.parse(decrypt(payload, base64Key)) as T;
}

/** Stable, non-reversible id for cache keys built from personal data. */
export function sha256(...parts: string[]): string {
  return createHash("sha256").update(parts.join("\u0000")).digest("hex");
}
