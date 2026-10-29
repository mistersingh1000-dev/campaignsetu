import { createCipheriv, createHash, createPublicKey, publicEncrypt, randomBytes, constants } from "node:crypto";
import { gzipSync } from "node:zlib";
import { Timestamp, GeoPoint, DocumentReference } from "firebase-admin/firestore";

export function encodeBackupValue(value: any): any {
  if (value === null) return { kind: "null" };
  if (value instanceof Timestamp) return { kind: "timestamp", seconds: value.seconds, nanoseconds: value.nanoseconds };
  if (value instanceof GeoPoint) return { kind: "geopoint", latitude: value.latitude, longitude: value.longitude };
  if (value instanceof DocumentReference) return { kind: "reference", path: value.path };
  if (Buffer.isBuffer(value) || value instanceof Uint8Array) return { kind: "bytes", value: Buffer.from(value).toString("base64") };
  if (Array.isArray(value)) return { kind: "array", value: value.map(encodeBackupValue) };
  if (typeof value === "object") return { kind: "map", value: Object.fromEntries(Object.entries(value).map(([k, v]) => [k, encodeBackupValue(v)])) };
  if (typeof value === "number") return { kind: "number", value: String(value) };
  if (typeof value === "string" || typeof value === "boolean") return { kind: typeof value, value };
  throw new Error("Unsupported backup value type");
}
export function encryptBackup(payload: unknown, pem: string) {
  const publicKey = createPublicKey(pem);
  if (publicKey.asymmetricKeyType !== "rsa" || (publicKey.asymmetricKeyDetails?.modulusLength || 0) < 3072) throw new Error("RSA key of at least 3072 bits required");
  const compressed = gzipSync(Buffer.from(JSON.stringify(payload), "utf8"));
  const key = randomBytes(32), iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key, iv);
  cipher.setAAD(Buffer.from("campaignsetu-backup-v1"));
  const ciphertext = Buffer.concat([cipher.update(compressed), cipher.final()]);
  return { format: "campaignsetu-backup-v1", algorithm: "RSA-OAEP-SHA256+AES-256-GCM+gzip", encryptedKey: publicEncrypt({ key: publicKey, oaepHash: "sha256", padding: constants.RSA_PKCS1_OAEP_PADDING }, key).toString("base64"), iv: iv.toString("base64"), tag: cipher.getAuthTag().toString("base64"), ciphertext: ciphertext.toString("base64"), plaintextSha256: createHash("sha256").update(compressed).digest("hex") };
}
