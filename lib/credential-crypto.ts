import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

const LEGACY_PREFIX = "enc:v1:";
const DEDICATED_PREFIX = "enc:v2:";

function key(secret: string): Buffer {
  return createHash("sha256").update(secret, "utf8").digest();
}

export function encryptCredential(value: string): string {
  if (!value || value.startsWith(LEGACY_PREFIX) || value.startsWith(DEDICATED_PREFIX)) return value;
  const dedicated = process.env.CREDENTIAL_ENCRYPTION_KEY;
  const secret = dedicated || process.env.AUTH_SECRET;
  if (!secret) throw new Error("CREDENTIAL_ENCRYPTION_KEY or AUTH_SECRET must be configured");
  const prefix = dedicated ? DEDICATED_PREFIX : LEGACY_PREFIX;
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(secret), iv);
  const encrypted = Buffer.concat([cipher.update(value, "utf8"), cipher.final()]);
  return `${prefix}${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptCredential(value: string | null | undefined): string | null {
  if (!value) return null;
  const dedicatedFormat = value.startsWith(DEDICATED_PREFIX);
  if (!dedicatedFormat && !value.startsWith(LEGACY_PREFIX)) return value;
  const prefix = dedicatedFormat ? DEDICATED_PREFIX : LEGACY_PREFIX;
  const [ivB64, tagB64, encryptedB64] = value.slice(prefix.length).split(".");
  if (!ivB64 || !tagB64 || !encryptedB64) throw new Error("Stored credential is malformed");

  // Legacy records may have used either the former dedicated key or AUTH_SECRET.
  // Never try AUTH_SECRET for the new, explicitly dedicated-key format.
  const secrets = dedicatedFormat
    ? [process.env.CREDENTIAL_ENCRYPTION_KEY]
    : [process.env.CREDENTIAL_ENCRYPTION_KEY, process.env.AUTH_SECRET];
  for (const secret of [...new Set(secrets.filter((s): s is string => Boolean(s)))]) {
    try {
      const decipher = createDecipheriv("aes-256-gcm", key(secret), Buffer.from(ivB64, "base64url"));
      decipher.setAuthTag(Buffer.from(tagB64, "base64url"));
      return Buffer.concat([decipher.update(Buffer.from(encryptedB64, "base64url")), decipher.final()]).toString("utf8");
    } catch {
      // Authentication failure: try the other legacy key, if configured.
    }
  }
  throw new Error("Stored credential could not be decrypted with the configured key");
}
