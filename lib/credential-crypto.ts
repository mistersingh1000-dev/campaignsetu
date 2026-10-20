import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "node:crypto";

const PREFIX = "enc:v1:";

function getKey(): Buffer {
  const secret = process.env.CREDENTIAL_ENCRYPTION_KEY || process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("CREDENTIAL_ENCRYPTION_KEY or AUTH_SECRET must be configured");
  }
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptCredential(value: string): string {
  if (!value || value.startsWith(PREFIX)) return value;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getKey(), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${PREFIX}${iv.toString("base64url")}.${tag.toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptCredential(value: string | null | undefined): string | null {
  if (!value) return null;
  // Backward compatibility for credentials saved before encryption was added.
  if (!value.startsWith(PREFIX)) return value;

  const [ivB64, tagB64, encryptedB64] = value.slice(PREFIX.length).split(".");
  if (!ivB64 || !tagB64 || !encryptedB64) {
    throw new Error("Stored credential is malformed");
  }

  const decipher = createDecipheriv(
    "aes-256-gcm",
    getKey(),
    Buffer.from(ivB64, "base64url")
  );
  decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
  return Buffer.concat([
    decipher.update(Buffer.from(encryptedB64, "base64url")),
    decipher.final(),
  ]).toString("utf8");
}
